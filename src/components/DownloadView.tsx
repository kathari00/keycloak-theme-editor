import type { DirectoryWriteParams, EditorCssContext, ImportedQuickSettingsByMode, JarBuildParams } from '../features/theme-export/types'
import { Button, Card, CardBody, CardTitle, FormGroup, Grid, GridItem, TextInput } from '@patternfly/react-core'
import { useEffect, useState } from 'react'
import { buildModeDefaultsSnapshot } from '../features/editor/actions/preset-actions'
import { sanitizeThemeCssSourceForEditor } from '../features/editor/css-source-sanitizer'
import { presetStore } from '../features/editor/stores/preset-store'
import { useDarkModeState, usePresetState, useQuickSettingsByThemeModeState, useQuickStartColorsState, useQuickStartContentState, useStylesCssState, useUploadedAssetsState } from '../features/editor/use-editor'
import { getThemeCssStructuredCached, resolveThemeBaseIdFromConfig, resolveThemeIdFromConfig, useThemeConfig } from '../features/presets/queries'
import { getThemeQuickStartCssPath } from '../features/presets/theme-paths'
import { themeResourcePath } from '../features/presets/types'
import { normalizeExternalLegalLinkUrl } from '../features/preview/legal-link-url'
import {
  assembleExportPayload,
  buildModeAwareQuickStartCssParts,
  extractCssImports,
  fetchFooterFtl,
  fetchTemplateFtl,
  mergeCssImports,
  stripDataKcStateAttributes,
} from '../features/theme-export/css-export-utils'
import { buildFolderZipBlob, buildJarBlob, downloadBlob, saveWithFilePicker, writeToDirectory } from '../features/theme-export/jar-export-service'
import { getThemeNameError } from '../features/theme-export/theme-validation'

interface DownloadViewProps {
  onExportComplete?: () => void
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
  const { stylesCss } = useStylesCssState()
  const { isDarkMode } = useDarkModeState()
  const { quickSettingsByThemeMode } = useQuickSettingsByThemeModeState()
  const themeConfig = useThemeConfig()
  const resolvedThemeId = resolveThemeIdFromConfig(themeConfig, selectedThemeId)
  const exportVariantId = resolvedThemeId
  const baseIdForExport: 'base' | 'v2' = resolveThemeBaseIdFromConfig(themeConfig, selectedThemeId)
  const isV2Base = baseIdForExport === 'v2'
  const {
    colorPresetId,
    colorPresetPrimaryColor,
    colorPresetSecondaryColor,
    colorPresetFontFamily,
    colorPresetBgColor,
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
  const bgImagePath = '/keycloak-dev-resources/themes/v2/login/resources/img/keycloak-bg-darken.svg'
  const logoImagePath = '/keycloak-dev-resources/themes/v2/login/resources/img/keycloak-logo-text.svg'

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
    const currentSnapshot = {
      colorPresetId,
      colorPresetPrimaryColor,
      colorPresetSecondaryColor,
      colorPresetFontFamily,
      colorPresetBgColor,
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
    const themeQuickStartDefaultsCss = themeQuickStartCssResponse.ok
      ? (await themeQuickStartCssResponse.text()).trim()
      : ''
    const lightStorageKey = `${resolvedThemeId}::light`
    const darkStorageKey = `${resolvedThemeId}::dark`
    const lightFallback = quickSettingsByThemeMode[lightStorageKey]
      ?? buildModeDefaultsSnapshot(presetStore.getState(), 'light')
    const darkFallback = quickSettingsByThemeMode[darkStorageKey]
      ?? buildModeDefaultsSnapshot(presetStore.getState(), 'dark')
    const toExportSnapshot = (settings: typeof lightFallback) => ({
      ...settings,
      showClientName,
      showRealmName,
      infoMessage,
      imprintUrl: exportImprintUrl,
      dataProtectionUrl: exportDataProtectionUrl,
    })
    const rawLightExportSnapshot = isDarkMode ? toExportSnapshot(lightFallback) : currentSnapshot
    const rawDarkExportSnapshot = isDarkMode ? currentSnapshot : toExportSnapshot(darkFallback)
    const lightBgColor = (rawLightExportSnapshot.colorPresetBgColor || '').trim()
    const darkBgColor = (rawDarkExportSnapshot.colorPresetBgColor || '').trim()

    const exportQuickSettingsByMode: ImportedQuickSettingsByMode = {
      // If only one mode has a background color, mirror it so exported themes
      // don't keep the default gradient in the opposite mode unexpectedly.
      light: darkBgColor && !lightBgColor
        ? { ...rawLightExportSnapshot, colorPresetBgColor: darkBgColor }
        : rawLightExportSnapshot,
      dark: lightBgColor && !darkBgColor
        ? { ...rawDarkExportSnapshot, colorPresetBgColor: lightBgColor }
        : rawDarkExportSnapshot,
    }
    const quickStartCssParts = buildModeAwareQuickStartCssParts(exportQuickSettingsByMode)
    const editorCss = await extractEditorCssContext(quickStartCssParts.sharedCss)
    const payload = assembleExportPayload({
      sourceCss: editorCss.presetCss,
      appliedAssets,
      uploadedAssets,
      editorCssContext: editorCss,
      baseId: baseIdForExport,
    })
    const payloadCssParts = extractCssImports(payload.generatedCss)
    const topLevelImportsCss = mergeCssImports(payloadCssParts.imports)

    return {
      properties,
      templateFtl: stripDataKcStateAttributes(templateFtl),
      footerFtl: footerFtl ? stripDataKcStateAttributes(footerFtl) : footerFtl,
      quickStartCss: [themeQuickStartDefaultsCss, quickStartCssParts.variablesCss].filter(Boolean).join('\n\n'),
      // Keep export CSS loading deterministic: template links quick-start.css and styles.css
      // via theme.properties, so styles.css must not re-import quick-start.css.
      stylesCss: [
        topLevelImportsCss,
        payloadCssParts.cssWithoutImports,
      ].filter(Boolean).join('\n\n'),
      messagesContent,
      payload,
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
        themeName,
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
      let bgImageBlob: Blob | undefined
      let logoImageBlob: Blob | undefined

      if (isV2Base) {
        const [bgImageResponse, logoImageResponse] = await Promise.all([
          fetch(bgImagePath),
          fetch(logoImagePath),
        ])
        bgImageBlob = await bgImageResponse.blob()
        logoImageBlob = await logoImageResponse.blob()
      }

      const params: JarBuildParams = {
        themeName,
        properties: writeParams.properties,
        payload: writeParams.payload,
        templateFtl: writeParams.templateFtl,
        footerFtl: writeParams.footerFtl,
        quickStartCss: writeParams.quickStartCss,
        stylesCss: writeParams.stylesCss,
        bgImageBlob,
        logoImageBlob,
        messagesContent: writeParams.messagesContent,
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
          // eslint-disable-next-line no-alert
          alert(projectPath ? `Theme exported to login/ and saved to ${projectPath}` : 'Theme exported to login/')
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
