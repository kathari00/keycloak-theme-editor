import type { DirectoryWriteParams, EditorCssContext, ImportedQuickSettingsByMode, JarBuildParams, ThemeEditorMetadata } from '../types'
import { Button, Card, CardBody, CardTitle, FormGroup, Grid, GridItem, TextInput } from '@patternfly/react-core'
import { useEffect, useState } from 'react'
import { buildThemeQuickStartDefaults } from '../../editor/actions/css-variable-reader'
import {
  useCssFilesState,
  usePresetState,
  useQuickStartColorsState,
  useQuickStartContentState,
  useStylesCssState,
  useUploadedAssetsState,
} from '../../editor/hooks/use-editor'
import { isQuickStartCssFile } from '../../editor/lib/css-files'
import { sanitizeThemeCssSourceForEditor } from '../../editor/lib/css-source-sanitizer'
import { getThemeCssStructuredCached, resolveThemeIdFromConfig, useThemeConfig } from '../../presets/queries'
import { getThemeQuickStartCssPath } from '../../presets/theme-paths'
import { themeResourcePath } from '../../presets/types'
import { normalizeExternalLegalLinkUrl } from '../../preview/lib/legal-link-url'
import {
  assembleExportPayload,
  buildModeAwareQuickStartCssParts,
  extractCssImports,
  fetchFooterFtl,
  fetchTemplateFtl,
  mergeCssImports,
  stripDataKcStateAttributes,
} from '../css-export-utils'
import { buildFolderZipBlob, buildJarBlob, downloadBlob, saveWithFilePicker, writeToDirectory } from '../jar-export-service'
import { getThemeNameError } from '../theme-validation'

interface DownloadViewProps {
  onExportComplete?: () => void
}

/**
 * Build export CSS files from the editor's individual file map.
 */
function buildExportCssFiles(
  editorFiles: Record<string, string>,
  topLevelImportsCss: string,
  payloadCssWithoutImports: string,
): Record<string, string> {
  const paths = Object.keys(editorFiles)
  if (paths.length === 0) {
    return {}
  }
  const targetPath = paths.find(path => !isQuickStartCssFile(path)) ?? paths[0]

  const result: Record<string, string> = {}
  for (let i = 0; i < paths.length; i++) {
    if (paths[i] === targetPath) {
      // The first user CSS file gets the generated CSS; quick-start.css stays separate.
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

function buildOverriddenMessages(params: {
  infoMessage: string
  imprintUrl: string
  dataProtectionUrl: string
}): string {
  const withInfo = withInfoMessage('', params.infoMessage)
  const withLegalLinks = withLegalLinkMessages(withInfo, params.imprintUrl, params.dataProtectionUrl)
  return withLegalLinkLabels(withLegalLinks)
}

function buildExportQuickSettingsByMode(
  quickStartCss: string,
  sharedSettings: Omit<NonNullable<ImportedQuickSettingsByMode['light']>, 'colorPresetId' | 'colorPresetPrimaryColor' | 'colorPresetSecondaryColor' | 'colorPresetBgColor'>,
): ImportedQuickSettingsByMode {
  const buildModeSettings = (mode: 'light' | 'dark') => {
    const defaults = buildThemeQuickStartDefaults(quickStartCss, mode)
    return {
      ...sharedSettings,
      colorPresetId: defaults.colorPresetId,
      colorPresetPrimaryColor: defaults.colorPresetPrimaryColor,
      colorPresetSecondaryColor: defaults.colorPresetSecondaryColor,
      colorPresetBgColor: defaults.colorPresetBgColor || '',
    }
  }

  return {
    light: buildModeSettings('light'),
    dark: buildModeSettings('dark'),
  }
}

export default function DownloadView({ onExportComplete }: DownloadViewProps) {
  const [themeName, setThemeName] = useState('mytheme')
  const [statusMessage, setStatusMessage] = useState('')
  const [activeTask, setActiveTask] = useState<'jar' | 'quick' | 'save' | null>(null)
  const [cliMode, setCliMode] = useState<{ available: boolean, cwd: string } | null>(null)
  const clearStatusMessage = () => setStatusMessage('')
  const themeNameError = getThemeNameError(themeName)
  const isDownloadingJar = activeTask === 'jar'
  const isQuickExporting = activeTask === 'quick'
  const isSavingToProject = activeTask === 'save'
  const isExportBusy = activeTask !== null

  useEffect(() => {
    fetch('/api/save-theme')
      .then(r => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.available)
          setCliMode(data)
      })
      .catch(() => {})
  }, [])
  const { uploadedAssets, appliedAssets } = useUploadedAssetsState()
  const { selectedThemeId } = usePresetState()
  const { stylesCss, themeQuickStartDefaults } = useStylesCssState()
  const { stylesCssFiles } = useCssFilesState()
  const themeConfig = useThemeConfig()
  const resolvedThemeId = resolveThemeIdFromConfig(themeConfig, selectedThemeId)
  const exportVariantId = resolvedThemeId
  const resolvedTheme = themeConfig.themes.find(t => t.id === resolvedThemeId)
  const {
    colorPresetFontFamily,
    colorPresetBorderRadius,
    colorPresetCardShadow,
    colorPresetHeadingFontFamily,
  } = useQuickStartColorsState()
  const {
    showClientName,
    showRealmName,
    infoMessage,
    imprintUrl,
    dataProtectionUrl,
  } = useQuickStartContentState()
  const exportImprintUrl = normalizeExternalLegalLinkUrl(imprintUrl)
  const exportDataProtectionUrl = normalizeExternalLegalLinkUrl(dataProtectionUrl)

  const extractEditorCssContext = async (quickStartSharedCss: string): Promise<EditorCssContext> => {
    let presetCss = sanitizeThemeCssSourceForEditor(stylesCss)

    if (resolvedThemeId && !presetCss.trim()) {
      const baselineThemeCss = (await getThemeCssStructuredCached(resolvedThemeId).catch(() => ({ stylesCss: '' }))).stylesCss
      presetCss = sanitizeThemeCssSourceForEditor((baselineThemeCss || '').trim())
    }

    return {
      presetCss,
      colorPresetCss: quickStartSharedCss,
    }
  }

  const prepareExportFiles = async (): Promise<DirectoryWriteParams> => {
    const themeQuickStartCssPath = getThemeQuickStartCssPath(resolvedThemeId)
    const sharedSnapshot = {
      colorPresetFontFamily,
      colorPresetBorderRadius,
      colorPresetCardShadow,
      colorPresetHeadingFontFamily,
      showClientName,
      showRealmName,
      infoMessage,
      imprintUrl: exportImprintUrl,
      dataProtectionUrl: exportDataProtectionUrl,
    }

    const [templateFtl, footerFtl, themeQuickStartCssResponse, propertiesResponse] = await Promise.all([
      fetchTemplateFtl(resolvedThemeId),
      fetchFooterFtl(resolvedThemeId),
      fetch(themeQuickStartCssPath),
      fetch(themeResourcePath(resolvedThemeId, 'theme.properties')),
    ])
    if (!propertiesResponse.ok) {
      throw new Error(`Failed to load theme.properties for "${resolvedThemeId}" (${propertiesResponse.status})`)
    }

    const properties = await propertiesResponse.text()

    const messagesContent = buildOverriddenMessages({
      infoMessage,
      imprintUrl: exportImprintUrl,
      dataProtectionUrl: exportDataProtectionUrl,
    })
    const sourceThemeQuickStartCss = themeQuickStartDefaults.trim() || (themeQuickStartCssResponse.ok
      ? (await themeQuickStartCssResponse.text()).trim()
      : '')
    const exportQuickSettingsByMode = buildExportQuickSettingsByMode(sourceThemeQuickStartCss, sharedSnapshot)
    const quickStartCssParts = buildModeAwareQuickStartCssParts(exportQuickSettingsByMode)
    const editorCss = await extractEditorCssContext(quickStartCssParts.sharedCss)
    const payload = assembleExportPayload({
      sourceCss: editorCss.presetCss,
      appliedAssets,
      uploadedAssets,
      editorCssContext: editorCss,
    })
    const payloadCssParts = extractCssImports(payload.generatedCss)
    const topLevelImportsCss = mergeCssImports(payloadCssParts.imports)

    const editorMetadata: ThemeEditorMetadata = {
      sourceThemeId: resolvedThemeId,
    }

    const combinedStylesCss = [
      topLevelImportsCss,
      payloadCssParts.cssWithoutImports,
    ].filter(Boolean).join('\n\n')

    // When multiple CSS files exist, distribute the generated CSS into the first user CSS file
    // and preserve the rest as-is.
    const hasMultipleFiles = Object.keys(stylesCssFiles).length > 1
    const exportStylesCssFiles = hasMultipleFiles
      ? buildExportCssFiles(stylesCssFiles, topLevelImportsCss, payloadCssParts.cssWithoutImports)
      : undefined

    return {
      themeName,
      properties,
      templateFtl: stripDataKcStateAttributes(templateFtl),
      footerFtl: footerFtl ? stripDataKcStateAttributes(footerFtl) : footerFtl,
      quickStartCss: [sourceThemeQuickStartCss, quickStartCssParts.variablesCss].filter(Boolean).join('\n\n'),
      // Keep export CSS loading deterministic: template links quick-start.css and styles.css
      // via theme.properties, so styles.css must not re-import quick-start.css.
      stylesCss: combinedStylesCss,
      stylesCssFiles: exportStylesCssFiles,
      messagesContent,
      payload,
      editorMetadata,
    }
  }

  const saveExportToProject = async (writeParams: DirectoryWriteParams): Promise<string | null> => {
    if (!cliMode?.available) {
      return null
    }

    const response = await fetch('/api/save-theme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        variantId: exportVariantId,
        ...writeParams,
      }),
    })
    const result = await response.json()
    if (!result.success) {
      throw new Error(result.error || 'Failed to save theme to project')
    }
    return typeof result.path === 'string' ? result.path : null
  }

  const runDownloadJar = async () => {
    if (isExportBusy) {
      return
    }

    setActiveTask('jar')
    let closeOnSuccess = false
    try {
      const writeParams = await prepareExportFiles()
      let extraBlobs: Record<string, Blob> | undefined

      const defaultAssets = resolvedTheme?.defaultAssets ?? []
      if (defaultAssets.length > 0) {
        const entries = await Promise.all(
          defaultAssets.map(async (asset) => {
            const response = await fetch(themeResourcePath(resolvedThemeId, `resources/${asset.path}`))
            return [asset.path, await response.blob()] as const
          }),
        )
        extraBlobs = Object.fromEntries(entries)
      }

      const params: JarBuildParams = {
        ...writeParams,
        extraBlobs,
      }

      const blob = await buildJarBlob(params)
      const saveResult = await saveWithFilePicker(blob, `${themeName}.jar`, [{
        description: 'Keycloak Theme JAR',
        accept: { 'application/java-archive': ['.jar'] },
      }])
      if (saveResult === 'cancelled') {
        return
      }
      if (saveResult === 'unavailable') {
        downloadBlob(blob, `${themeName}.jar`)
      }
      const projectPath = await saveExportToProject(writeParams).catch(() => null)
      setStatusMessage(projectPath
        ? `JAR export finished. Saved to ${projectPath}`
        : 'JAR export finished.')
      closeOnSuccess = true
    }
    catch (error) {
      console.error('Error creating JAR file:', error)
      setStatusMessage('Error creating JAR file.')
    }
    finally {
      setActiveTask(null)
      if (closeOnSuccess) {
        onExportComplete?.()
      }
    }
  }

  const runQuickExport = async () => {
    if (isExportBusy) {
      return
    }

    setActiveTask('quick')
    let closeOnSuccess = false
    try {
      const writeParams = await prepareExportFiles()

      // Try File System Access API first
      if ('showDirectoryPicker' in window) {
        try {
          const dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' })
          await writeToDirectory(dirHandle, writeParams)
          const projectPath = await saveExportToProject(writeParams).catch(() => null)
          setStatusMessage(projectPath
            ? `Quick export finished. Saved to ${projectPath}`
            : 'Quick export finished.')
          closeOnSuccess = true
          return
        }
        catch (err: any) {
          if (err.name === 'AbortError') {
            return
          }
          console.error('File System Access API error:', err)
          // Fall through to download fallback
        }
      }

      // Fallback: download as ZIP for browsers without File System Access API
      const zipBlob = await buildFolderZipBlob(writeParams)
      downloadBlob(zipBlob, `${themeName}-theme.zip`)
      const projectPath = await saveExportToProject(writeParams).catch(() => null)
      setStatusMessage(projectPath
        ? `Theme exported as ZIP. Saved to ${projectPath}`
        : 'Theme exported as ZIP.')
      closeOnSuccess = true
    }
    catch (error) {
      console.error('Error exporting theme:', error)
      setStatusMessage('Error exporting theme.')
    }
    finally {
      setActiveTask(null)
      if (closeOnSuccess) {
        onExportComplete?.()
      }
    }
  }

  const handleDownloadJar = () => {
    if (themeNameError)
      return
    clearStatusMessage()
    void runDownloadJar()
  }

  const handleDownloadQuickExport = () => {
    if (themeNameError)
      return
    clearStatusMessage()
    void runQuickExport()
  }

  const runSaveToProject = async () => {
    if (isExportBusy)
      return
    setActiveTask('save')
    let closeOnSuccess = false
    try {
      const writeParams = await prepareExportFiles()
      const path = await saveExportToProject(writeParams)
      setStatusMessage(path ? `Saved to ${path}` : 'Saved to project.')
      closeOnSuccess = true
    }
    catch (error) {
      console.error('Error saving to project:', error)
      setStatusMessage('Error saving to project.')
    }
    finally {
      setActiveTask(null)
      if (closeOnSuccess) {
        onExportComplete?.()
      }
    }
  }

  const handleSaveToProject = () => {
    if (themeNameError)
      return
    clearStatusMessage()
    void runSaveToProject()
  }

  return (
    <div>
      <FormGroup
        label="Theme Name"
        fieldId="theme-name-input"
        style={{ marginBottom: '1.5rem' }}
      >
        <TextInput
          id="theme-name-input"
          value={themeName}
          onChange={(_, value) => {
            setThemeName(value)
            clearStatusMessage()
          }}
          placeholder="mytheme"
          validated={themeNameError ? 'error' : 'default'}
          aria-invalid={!!themeNameError}
        />
        {themeNameError && (
          <div style={{ marginTop: '0.5rem', color: 'var(--pf-t--global--color--status--danger--default)' }}>
            {themeNameError}
          </div>
        )}
        {!themeNameError && statusMessage && (
          <div style={{ marginTop: '0.5rem' }}>
            {statusMessage}
          </div>
        )}
      </FormGroup>

      <Grid hasGutter>
        {cliMode?.available && (
          <GridItem span={12}>
            <Card isCompact>
              <CardTitle>Save to project</CardTitle>
              <CardBody>
                <p style={{ marginBottom: '1rem', fontSize: '0.9rem', fontFamily: 'var(--pf-t--global--font--family--sans-serif)' }}>
                  Write theme files directly to your project directory.
                </p>
                <Button
                  variant="primary"
                  onClick={handleSaveToProject}
                  isDisabled={!themeName.trim() || !!themeNameError || isExportBusy}
                  isBlock
                >
                  {isSavingToProject ? 'Saving...' : `Save to ${exportVariantId}/`}
                </Button>
              </CardBody>
            </Card>
          </GridItem>
        )}
        <GridItem span={6}>
          <Card isCompact>
            <CardTitle>Download .jar</CardTitle>
            <CardBody>
              <p style={{ marginBottom: '1rem', fontSize: '0.9rem', fontFamily: 'var(--pf-t--global--font--family--sans-serif)' }}>
                Save as a deployable JAR file for your Keycloak server.
              </p>
              <Button
                variant="secondary"
                onClick={handleDownloadJar}
                isDisabled={!themeName.trim() || !!themeNameError || isExportBusy}
                isBlock
              >
                {isDownloadingJar
                  ? 'Exporting...'
                  : (
                      <>
                        Download
                        {' '}
                        {themeName || 'theme'}
                        .jar
                      </>
                    )}
              </Button>
            </CardBody>
          </Card>
        </GridItem>
        <GridItem span={6}>
          <Card isCompact>
            <CardTitle>Quick export</CardTitle>
            <CardBody>
              <p style={{ marginBottom: '1rem', fontSize: '0.9rem', fontFamily: 'var(--pf-t--global--font--family--sans-serif)' }}>
                Save to your themes folder for live testing. Downloads as ZIP on Firefox.
              </p>
              <Button
                variant="secondary"
                onClick={handleDownloadQuickExport}
                isDisabled={!themeName.trim() || !!themeNameError || isExportBusy}
                isBlock
              >
                {isQuickExporting ? 'Exporting...' : 'Download files'}
              </Button>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>
    </div>
  )
}
