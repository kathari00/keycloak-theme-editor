import type { ThemeDocument } from '../theme-document'
import type { DirectoryWriteParams, EditorCssContext, ThemeEditorMetadata } from './types'
import { isQuickStartCssFile } from '../editor/lib/css-files'
import { sanitizeThemeCssSourceForEditor } from '../editor/lib/css-source-sanitizer'
import { THEME_MESSAGES_EN_PATH, THEME_PROPERTIES_PATH, themeLoginPath } from '../keycloak-theme/paths'
import { getThemeCssStructuredCached } from '../presets/queries'
import { getThemeQuickStartCssPath } from '../presets/theme-paths'
import { normalizeExternalLegalLinkUrl } from '../preview/lib/legal-link-url'
import { themeDocumentToExportQuickSettingsByMode } from '../theme-document'
import {
  assembleExportPayload,
  buildModeAwareQuickStartCssParts,
  extractCssImports,
  fetchCustomFtlFiles,
  fetchFooterFtl,
  fetchTemplateFtl,
  filterLocalCssFiles,
  mergeCssImports,
  stripDataKcStateAttributes,
} from './css-export-utils'

export interface PrepareThemeExportFilesParams {
  themeDocument: ThemeDocument
  themeName: string
}

/**
 * Build export CSS files from the editor's individual file map.
 */
export function buildExportCssFiles(
  editorFiles: Record<string, string>,
  topLevelImportsCss: string,
  payloadCssWithoutImports: string,
): Record<string, string> {
  const paths = Object.keys(editorFiles).filter(path => !isQuickStartCssFile(path))
  if (paths.length === 0) {
    return {}
  }
  const targetPath = paths[0]

  const result: Record<string, string> = {}
  for (let i = 0; i < paths.length; i++) {
    if (paths[i] === targetPath) {
      // The first user CSS file gets the generated CSS; quick-start.css is exported separately.
      result[paths[i]] = [
        topLevelImportsCss,
        payloadCssWithoutImports,
      ].filter(Boolean).join('\n\n')
    }
    else {
      result[paths[i]] = editorFiles[paths[i]]
    }
  }
  return result
}

function escapeJavaPropertiesValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n/g, '\\n')
}

function withInfoMessage(messagesContent: string, infoMessage: string): string {
  const normalized = infoMessage.trim()
  if (!normalized) {
    return messagesContent
  }

  const escaped = escapeJavaPropertiesValue(normalized)
  const infoLine = `infoMessage=${escaped}`
  if (/^\s*infoMessage\s*=.*$/m.test(messagesContent)) {
    return messagesContent.replace(/^\s*infoMessage\s*=.*$/m, infoLine)
  }

  const suffix = messagesContent.endsWith('\n') ? '' : '\n'
  return `${messagesContent}${suffix}${infoLine}\n`
}

function withMessageProperty(messagesContent: string, key: 'imprintUrl' | 'dataProtectionUrl', value: string): string {
  return withMessageLine(messagesContent, key, value)
}

function withLegalLinkMessages(messagesContent: string, imprintUrl: string, dataProtectionUrl: string): string {
  const withImprint = withMessageProperty(messagesContent, 'imprintUrl', imprintUrl)
  return withMessageProperty(withImprint, 'dataProtectionUrl', dataProtectionUrl)
}

function withLegalLinkLabels(messagesContent: string): string {
  let result = messagesContent
  result = withMessageLine(result, 'imprintLabel', 'Imprint')
  result = withMessageLine(result, 'dataProtectionLabel', 'Data Protection')
  return result
}

function withMessageLine(messagesContent: string, key: string, value: string): string {
  const escaped = escapeJavaPropertiesValue(value.trim())
  const propertyLine = `${key}=${escaped}`
  const propertyPattern = new RegExp(`^\\s*${key}\\s*=.*$`, 'm')

  if (propertyPattern.test(messagesContent)) {
    return messagesContent.replace(propertyPattern, propertyLine)
  }

  const suffix = messagesContent.endsWith('\n') ? '' : '\n'
  return `${messagesContent}${suffix}${propertyLine}\n`
}

export function buildOverriddenMessages(params: {
  baseMessagesContent: string
  infoMessage: string
  imprintUrl: string
  dataProtectionUrl: string
}): string {
  const withInfo = withInfoMessage(params.baseMessagesContent, params.infoMessage)
  const withLegalLinks = withLegalLinkMessages(withInfo, params.imprintUrl, params.dataProtectionUrl)
  return withLegalLinkLabels(withLegalLinks)
}

async function extractEditorCssContext(themeDocument: ThemeDocument, quickStartSharedCss: string): Promise<EditorCssContext> {
  let presetCss = sanitizeThemeCssSourceForEditor(themeDocument.stylesCss)

  if (themeDocument.themeId && !presetCss.trim()) {
    const baselineThemeCss = (await getThemeCssStructuredCached(themeDocument.themeId).catch(() => ({ stylesCss: '' }))).stylesCss
    presetCss = sanitizeThemeCssSourceForEditor((baselineThemeCss || '').trim())
  }

  return {
    presetCss,
    colorPresetCss: quickStartSharedCss,
  }
}

export async function prepareThemeExportFiles(
  params: PrepareThemeExportFilesParams,
): Promise<DirectoryWriteParams> {
  const { themeDocument, themeName } = params
  const resolvedThemeId = themeDocument.themeId
  const { isPresetTheme } = themeDocument
  const { infoMessage, imprintUrl, dataProtectionUrl } = themeDocument.quickSettings
  const exportImprintUrl = normalizeExternalLegalLinkUrl(imprintUrl)
  const exportDataProtectionUrl = normalizeExternalLegalLinkUrl(dataProtectionUrl)
  const themeQuickStartCssPath = getThemeQuickStartCssPath(resolvedThemeId)

  const [templateFtl, footerFtl, themeQuickStartCssResponse, propertiesResponse, messagesResponse] = await Promise.all([
    isPresetTheme ? fetchTemplateFtl(resolvedThemeId) : Promise.resolve(''),
    isPresetTheme ? fetchFooterFtl(resolvedThemeId) : Promise.resolve(null),
    fetch(themeQuickStartCssPath),
    fetch(themeLoginPath(resolvedThemeId, THEME_PROPERTIES_PATH)),
    isPresetTheme ? fetch(themeLoginPath(resolvedThemeId, THEME_MESSAGES_EN_PATH)) : Promise.resolve(null),
  ])
  if (!propertiesResponse.ok) {
    throw new Error(`Failed to load theme.properties for "${resolvedThemeId}" (${propertiesResponse.status})`)
  }

  const properties = await propertiesResponse.text()
  const baseMessagesContent = messagesResponse?.ok
    ? await messagesResponse.text()
    : ''

  const messagesContent = buildOverriddenMessages({
    baseMessagesContent,
    infoMessage,
    imprintUrl: exportImprintUrl,
    dataProtectionUrl: exportDataProtectionUrl,
  })

  const editorMetadata: ThemeEditorMetadata = {
    sourceThemeId: resolvedThemeId,
  }

  if (!isPresetTheme) {
    const [localFiles, customFtlFiles] = await Promise.all([
      filterLocalCssFiles(resolvedThemeId, themeDocument.stylesCssFiles),
      fetchCustomFtlFiles(resolvedThemeId),
    ])
    const localStylesCss = Object.values(localFiles).filter(Boolean).join('\n\n')
    const sanitizedCustomFtls = Object.fromEntries(
      Object.entries(customFtlFiles).map(([name, content]) => [name, stripDataKcStateAttributes(content)]),
    )
    return {
      themeName,
      properties,
      templateFtl: '',
      footerFtl: null,
      customFtlFiles: Object.keys(sanitizedCustomFtls).length > 0 ? sanitizedCustomFtls : undefined,
      quickStartCss: '',
      stylesCss: sanitizeThemeCssSourceForEditor(localStylesCss),
      stylesCssFiles: Object.keys(localFiles).length > 1 ? localFiles : undefined,
      messagesContent,
      payload: assembleExportPayload({
        sourceCss: sanitizeThemeCssSourceForEditor(localStylesCss),
        appliedAssets: {},
        uploadedAssets: [],
        editorCssContext: { presetCss: '', colorPresetCss: '' },
      }),
      editorMetadata,
    }
  }

  const sourceThemeQuickStartCss = themeDocument.quickStartCss.trim() || (themeQuickStartCssResponse.ok
    ? (await themeQuickStartCssResponse.text()).trim()
    : '')
  const exportQuickSettingsByMode = themeDocumentToExportQuickSettingsByMode(themeDocument, sourceThemeQuickStartCss, {
    imprintUrl: exportImprintUrl,
    dataProtectionUrl: exportDataProtectionUrl,
  })
  const quickStartCssParts = buildModeAwareQuickStartCssParts(exportQuickSettingsByMode)
  const editorCss = await extractEditorCssContext(themeDocument, quickStartCssParts.sharedCss)
  const payload = assembleExportPayload({
    sourceCss: editorCss.presetCss,
    appliedAssets: themeDocument.assets.appliedAssets,
    uploadedAssets: themeDocument.assets.uploadedAssets,
    editorCssContext: editorCss,
    assetResolutionCss: quickStartCssParts.variablesCss,
  })
  const payloadCssParts = extractCssImports(payload.generatedCss)
  const topLevelImportsCss = mergeCssImports(payloadCssParts.imports)

  const combinedStylesCss = [
    topLevelImportsCss,
    payloadCssParts.cssWithoutImports,
  ].filter(Boolean).join('\n\n')

  const hasMultipleFiles = Object.keys(themeDocument.stylesCssFiles).length > 1
  const exportStylesCssFiles = hasMultipleFiles
    ? buildExportCssFiles(themeDocument.stylesCssFiles, topLevelImportsCss, payloadCssParts.cssWithoutImports)
    : undefined

  return {
    themeName,
    properties,
    templateFtl: stripDataKcStateAttributes(templateFtl),
    footerFtl: footerFtl ? stripDataKcStateAttributes(footerFtl) : footerFtl,
    quickStartCss: [sourceThemeQuickStartCss, quickStartCssParts.variablesCss].filter(Boolean).join('\n\n'),
    stylesCss: combinedStylesCss,
    stylesCssFiles: exportStylesCssFiles,
    messagesContent,
    payload,
    editorMetadata,
  }
}
