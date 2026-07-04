import {
  Alert,
  Button,
  Card,
  CardBody,
  CardTitle,
  FormGroup,
  Grid,
  GridItem,
  HelperText,
  HelperTextItem,
  TextInput,
} from '@patternfly/react-core'
import { useEffect, useState } from 'react'
import { useThemeDocument } from '../../theme-document'
import { useThemeExportActions } from '../hooks/use-theme-export-actions'
import { getThemeNameError } from '../theme-validation'

interface DownloadViewProps {
  onExportComplete?: () => void
}

function DownloadStatusAlert({
  themeNameError,
  statusMessage,
}: {
  statusMessage: string
  themeNameError: string | null
}) {
  const hasStatusError = /^Error\b/i.test(statusMessage)
  const statusAlert = themeNameError
    ? { title: 'Theme name is invalid', variant: 'danger' as const, message: themeNameError }
    : statusMessage
      ? { title: hasStatusError ? 'Export failed' : 'Export status', variant: hasStatusError ? 'danger' as const : 'success' as const, message: statusMessage }
      : null

  if (!statusAlert) {
    return null
  }

  return (
    <Alert isInline variant={statusAlert.variant} title={statusAlert.title} style={{ marginBottom: '1rem' }}>
      {statusAlert.message}
    </Alert>
  )
}

export default function DownloadView({ onExportComplete }: DownloadViewProps) {
  const [themeName, setThemeName] = useState('mytheme')
  const [cliMode, setCliMode] = useState<{ available: boolean, cwd: string } | null>(null)
  const themeNameError = getThemeNameError(themeName)

  useEffect(() => {
    fetch('/api/save-theme')
      .then(r => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.available)
          setCliMode(data)
      })
      .catch(() => {})
  }, [])
  const { themeDocument, resolvedThemeId, resolvedTheme } = useThemeDocument()
  const exportVariantId = resolvedThemeId
  const {
    clearStatusMessage,
    handleDownloadJar,
    handleDownloadQuickExport,
    handleSaveToProject,
    isDownloadingJar,
    isExportBusy,
    isQuickExporting,
    isSavingToProject,
    statusMessage,
  } = useThemeExportActions({
    defaultAssets: resolvedTheme?.defaultAssets ?? [],
    exportVariantId,
    onExportComplete,
    themeDocument,
    themeName,
    themeNameError,
  })

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
        <HelperText>
          <HelperTextItem>Use the Keycloak theme id you want to deploy or save into your project.</HelperTextItem>
        </HelperText>
      </FormGroup>

      <DownloadStatusAlert themeNameError={themeNameError} statusMessage={statusMessage} />

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
