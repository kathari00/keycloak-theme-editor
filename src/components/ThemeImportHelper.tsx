import { Button, Form, FormGroup } from '@patternfly/react-core'
import { useState } from 'react'
import { importJarFile, THEME_JAR_IMPORTED_EVENT } from '../features/theme-export/jar-import-service'

interface ImportStatus {
  tone: 'idle' | 'loading' | 'success' | 'error'
  message: string
}

export default function ThemeImportHelper() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [status, setStatus] = useState<ImportStatus>({ tone: 'idle', message: '' })
  const [isImporting, setIsImporting] = useState(false)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    setSelectedFile(file)
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

  const statusColor = status.tone === 'error'
    ? 'text-red-600'
    : status.tone === 'success'
      ? 'text-green-600'
      : 'text-gray-600'

  return (
    <Form className="space-y-4">
      <FormGroup label="Select JAR file" fieldId="jar-file-input">
        <input
          type="file"
          id="jar-file-input"
          accept=".jar"
          onChange={handleFileSelect}
        />
      </FormGroup>

      {selectedFile && (
        <div className="text-sm text-gray-600">
          Selected:
          {' '}
          {selectedFile.name}
        </div>
      )}

      {status.message && (
        <div className={`text-sm ${statusColor}`}>
          {status.message}
        </div>
      )}

      <Button
        variant="primary"
        onClick={handleImport}
        isDisabled={!selectedFile || isImporting}
      >
        {isImporting ? 'Importing...' : 'Import JAR Theme'}
      </Button>
    </Form>
  )
}
