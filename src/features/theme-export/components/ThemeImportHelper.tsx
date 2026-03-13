import { Alert, Button, FileUpload, Form, FormGroup, HelperText, HelperTextItem } from '@patternfly/react-core'
import { useState } from 'react'
import { importJarFile, THEME_JAR_IMPORTED_EVENT } from '../jar-import-service'

interface ImportStatus {
  tone: 'idle' | 'loading' | 'success' | 'error'
  message: string
}

function ImportStatusAlert({ status }: { status: ImportStatus }) {
  if (!status.message) {
    return null
  }

  const statusVariant = status.tone === 'error'
    ? 'danger'
    : status.tone === 'success'
      ? 'success'
      : 'info'
  const statusTitle = status.tone === 'error'
    ? 'Import failed'
    : status.tone === 'success'
      ? 'Theme imported'
      : 'Importing theme'

  return (
    <Alert isInline variant={statusVariant} title={statusTitle}>
      {status.message}
    </Alert>
  )
}

export default function ThemeImportHelper() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filename, setFilename] = useState('')
  const [status, setStatus] = useState<ImportStatus>({ tone: 'idle', message: '' })
  const [isImporting, setIsImporting] = useState(false)

  const handleFileInputChange = (_event: unknown, file: File) => {
    setSelectedFile(file)
    setFilename(file.name)
    setStatus({ tone: 'idle', message: '' })
  }

  const handleClear = () => {
    setSelectedFile(null)
    setFilename('')
    setStatus({ tone: 'idle', message: '' })
  }

  const handleImport = async () => {
    if (!selectedFile || isImporting)
      return

    setStatus({ tone: 'loading', message: 'Importing theme...' })
    setIsImporting(true)
    try {
      const result = await importJarFile(selectedFile)
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent(THEME_JAR_IMPORTED_EVENT, { detail: result }))
      }
      const label = result.themeName ? `Imported theme: ${result.themeName}` : 'Theme imported'
      setStatus({ tone: 'success', message: label })
    }
    catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Error importing JAR file. Please check the file and try again.'
      setStatus({ tone: 'error', message })
    }
    finally {
      setIsImporting(false)
    }
  }

  return (
    <Form>
      <FormGroup label="Select JAR file" fieldId="jar-file-input">
        <FileUpload
          id="jar-file-input"
          filename={filename}
          filenamePlaceholder="Drag and drop a .jar file or browse to upload"
          browseButtonText="Browse"
          clearButtonText="Clear"
          onFileInputChange={handleFileInputChange}
          onClearClick={handleClear}
          dropzoneProps={{ accept: { 'application/java-archive': ['.jar'] }, maxSize: undefined }}
        />
        <HelperText>
          <HelperTextItem>Upload a previously exported Keycloak theme JAR to restore styles, quick settings, and assets.</HelperTextItem>
        </HelperText>
      </FormGroup>

      <ImportStatusAlert status={status} />

      <Button
        variant="primary"
        onClick={handleImport}
        isDisabled={isImporting || !selectedFile}
      >
        {isImporting ? 'Importing...' : 'Import JAR Theme'}
      </Button>
    </Form>
  )
}
