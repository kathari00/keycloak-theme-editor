import type { LocalizedContentOverrides } from '../editor/stores/types'
import type { ThemeDocument } from '../theme-document'
import type { DirectoryWriteParams, EditorCssContext, ThemeEditorMetadata } from './types'
import { isQuickStartCssFile } from '../editor/lib/css-files'
import { sanitizeThemeCssSourceForEditor } from '../editor/lib/css-source-sanitizer'
import {
  DEFAULT_DATA_PROTECTION_LABEL,
  DEFAULT_IMPRINT_LABEL,
} from '../editor/stores/preset-store'
import { DEFAULT_LOCALE_TAG } from '../i18n/locale-catalog'
import {
  THEME_MESSAGES_EN_PATH,
  THEME_PROPERTIES_PATH,
  themeLoginPath,
  themeMessagesLocalePath,
} from '../keycloak-theme/paths'
import { getThemeCssStructuredCached } from '../presets/queries'
import { getThemeQuickStartCssPath } from '../presets/theme-paths'
import { normalizeExternalLegalLinkUrl } from '../preview/lib/legal-link-url'
// Imported from the concrete module, not the `theme-document` barrel index:
// that barrel also re-exports `useThemeDocument`, whose module graph reaches
// React store hooks - pulling that in here would be needless coupling for a
// module that's otherwise environment-agnostic (see tools/build-theme-fixture.ts).
import {
  themeDocumentToExportLocaleMessages,
  themeDocumentToExportLocales,
  themeDocumentToExportQuickSettingsByMode,
} from '../theme-document/export-projection'
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

/** Upsert a `key=value` line, replacing an existing entry in place. */
export function upsertPropertiesLine(content: string, key: string, value: string): string {
  const escaped = escapeJavaPropertiesValue(value.trim())
  const propertyLine = `${key}=${escaped}`
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // Match a single logical line: whitespace before the key must not span newlines.
  const propertyPattern = new RegExp(`^[^\\S\\r\\n]*${escapedKey}[^\\S\\r\\n]*=.*$`, 'm')

  if (propertyPattern.test(content)) {
    return content.replace(propertyPattern, propertyLine)
  }

  const suffix = !content || content.endsWith('\n') ? '' : '\n'
  return `${content}${suffix}${propertyLine}\n`
}

function withMessageLine(messagesContent: string, key: string, value: string): string {
  return upsertPropertiesLine(messagesContent, key, value)
}

/** Writes the key only when the value is non-blank, so blank stays "not translated". */
function withOptionalMessageLine(messagesContent: string, key: string, value: string | undefined): string {
  const normalized = (value ?? '').trim()
  return normalized ? withMessageLine(messagesContent, key, normalized) : messagesContent
}

function withLegalLinkMessages(messagesContent: string, imprintUrl: string, dataProtectionUrl: string): string {
  const withImprint = withMessageLine(messagesContent, 'imprintUrl', imprintUrl)
  return withMessageLine(withImprint, 'dataProtectionUrl', dataProtectionUrl)
}

function withLegalLinkLabels(messagesContent: string, imprintLabel: string, dataProtectionLabel: string): string {
  let result = messagesContent
  result = withMessageLine(result, 'imprintLabel', imprintLabel.trim() || DEFAULT_IMPRINT_LABEL)
  result = withMessageLine(result, 'dataProtectionLabel', dataProtectionLabel.trim() || DEFAULT_DATA_PROTECTION_LABEL)
  return result
}

export function buildOverriddenMessages(params: {
  baseMessagesContent: string
  infoMessage: string
  imprintUrl: string
  dataProtectionUrl: string
  imprintLabel?: string
  dataProtectionLabel?: string
}): string {
  const withInfo = withOptionalMessageLine(params.baseMessagesContent, 'infoMessage', params.infoMessage)
  const withLegalLinks = withLegalLinkMessages(withInfo, params.imprintUrl, params.dataProtectionUrl)
  return withLegalLinkLabels(
    withLegalLinks,
    params.imprintLabel ?? DEFAULT_IMPRINT_LABEL,
    params.dataProtectionLabel ?? DEFAULT_DATA_PROTECTION_LABEL,
  )
}

/**
 * A translation bundle carrying only the keys this theme actually translates.
 * Everything the user left blank is omitted so Keycloak falls back to English.
 */
export function buildLocaleOverrideMessages(params: {
  baseMessagesContent: string
  overrides: LocalizedContentOverrides
}): string {
  let result = params.baseMessagesContent
  for (const [messageKey, value] of Object.entries(params.overrides)) {
    result = withOptionalMessageLine(result, messageKey, value)
  }
  return result
}

/**
 * Declares the theme's supported languages. Keycloak resolves `locales=` through
 * the parent chain, so writing it narrows the theme to exactly this list - only
 * do so once the user has opted into managing languages.
 */
export function withDeclaredLocales(properties: string, locales: string[]): string {
  if (locales.length <= 1) {
    return properties
  }
  return upsertPropertiesLine(properties, 'locales', locales.join(','))
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

/**
 * One bundle per enabled locale, layered onto whatever the source theme already
 * ships for that locale. Missing source bundles are expected: standard Keycloak
 * text is inherited from the parent theme, so an override-only file is enough.
 */
async function buildLocaleMessageFiles(params: {
  themeId: string
  isPresetTheme: boolean
  localeOverrides: Record<string, LocalizedContentOverrides>
}): Promise<Record<string, string>> {
  const entries = Object.entries(params.localeOverrides)
  if (entries.length === 0) {
    return {}
  }

  const files = await Promise.all(entries.map(async ([tag, overrides]) => {
    const baseMessagesContent = params.isPresetTheme
      ? await fetchOptionalThemeText(themeLoginPath(params.themeId, themeMessagesLocalePath(tag)))
      : ''
    return [tag, buildLocaleOverrideMessages({ baseMessagesContent, overrides })] as const
  }))

  return Object.fromEntries(files)
}

export async function fetchOptionalThemeText(path: string): Promise<string> {
  try {
    const response = await fetch(path)
    return response.ok ? await response.text() : ''
  }
  catch {
    return ''
  }
}

export async function prepareThemeExportFiles(
  params: PrepareThemeExportFilesParams,
): Promise<DirectoryWriteParams> {
  const { themeDocument, themeName } = params
  const resolvedThemeId = themeDocument.themeId
  const { isPresetTheme } = themeDocument
  const {
    infoMessage,
    imprintUrl,
    dataProtectionUrl,
    imprintLabel,
    dataProtectionLabel,
  } = themeDocument.quickSettings
  const exportImprintUrl = normalizeExternalLegalLinkUrl(imprintUrl)
  const exportDataProtectionUrl = normalizeExternalLegalLinkUrl(dataProtectionUrl)
  const themeQuickStartCssPath = getThemeQuickStartCssPath(resolvedThemeId)
  const exportLocales = themeDocumentToExportLocales(themeDocument)
  const localeOverrides = themeDocumentToExportLocaleMessages(themeDocument)

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

  const properties = withDeclaredLocales(await propertiesResponse.text(), exportLocales)
  const baseMessagesContent = messagesResponse?.ok
    ? await messagesResponse.text()
    : ''

  const messagesContentWithoutEnglishOverrides = buildOverriddenMessages({
    baseMessagesContent,
    infoMessage,
    imprintUrl: exportImprintUrl,
    dataProtectionUrl: exportDataProtectionUrl,
    imprintLabel,
    dataProtectionLabel,
  })
  const englishOverrides = themeDocument.quickStartContentByLocale[DEFAULT_LOCALE_TAG]
  const messagesContent = englishOverrides
    ? buildLocaleOverrideMessages({ baseMessagesContent: messagesContentWithoutEnglishOverrides, overrides: englishOverrides })
    : messagesContentWithoutEnglishOverrides

  const localeMessages = await buildLocaleMessageFiles({
    themeId: resolvedThemeId,
    isPresetTheme,
    localeOverrides,
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
      localeMessages,
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
    localeMessages,
    payload,
    editorMetadata,
  }
}
