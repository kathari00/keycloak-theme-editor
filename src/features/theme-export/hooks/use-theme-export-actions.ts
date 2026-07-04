import type { ThemeDefaultAsset, ThemeId } from '../../presets/types'
import type { ThemeDocument } from '../../theme-document'
import type { JarBuildParams } from '../types'
import { useState } from 'react'
import { fetchDefaultAssetBlobs } from '../default-asset-blobs'
import { buildFolderZipBlob, buildJarBlob, downloadBlob, saveWithFilePicker, writeToDirectory } from '../jar-export-service'
import { prepareThemeExportFiles } from '../prepare-theme-export-files'

export type ThemeExportTask = 'jar' | 'quick' | 'save' | null

interface DirectoryPickerWindow extends Window {
  showDirectoryPicker?: (options: { mode: 'readwrite' }) => Promise<FileSystemDirectoryHandle>
}

export interface UseThemeExportActionsParams {
  themeDocument: ThemeDocument
  themeName: string
  themeNameError: string | null
  exportVariantId: ThemeId
  defaultAssets: readonly ThemeDefaultAsset[]
  onExportComplete?: () => void
}

export function useThemeExportActions(params: UseThemeExportActionsParams) {
  const {
    themeDocument,
    themeName,
    themeNameError,
    exportVariantId,
    defaultAssets,
    onExportComplete,
  } = params
  const [statusMessage, setStatusMessage] = useState('')
  const [activeTask, setActiveTask] = useState<ThemeExportTask>(null)
  const isDownloadingJar = activeTask === 'jar'
  const isQuickExporting = activeTask === 'quick'
  const isSavingToProject = activeTask === 'save'
  const isExportBusy = activeTask !== null
  const clearStatusMessage = () => setStatusMessage('')

  const runDownloadJar = async () => {
    if (isExportBusy) {
      return
    }

    setActiveTask('jar')
    let closeOnSuccess = false
    try {
      const writeParams = await prepareThemeExportFiles({ themeDocument, themeName })
      const extraBlobs = await fetchDefaultAssetBlobs(exportVariantId, defaultAssets)
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
      setStatusMessage('JAR export finished.')
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
      const writeParams = await prepareThemeExportFiles({ themeDocument, themeName })

      const directoryPicker = (window as DirectoryPickerWindow).showDirectoryPicker
      if (directoryPicker) {
        try {
          const dirHandle = await directoryPicker({ mode: 'readwrite' })
          await writeToDirectory(dirHandle, writeParams)
          setStatusMessage('Quick export finished.')
          closeOnSuccess = true
          return
        }
        catch (error: unknown) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            return
          }
          console.error('File System Access API error:', error)
        }
      }

      const zipBlob = await buildFolderZipBlob(writeParams)
      downloadBlob(zipBlob, `${themeName}-theme.zip`)
      setStatusMessage('Theme exported as ZIP.')
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

  const runSaveToProject = async () => {
    if (isExportBusy)
      return
    setActiveTask('save')
    let closeOnSuccess = false
    try {
      const writeParams = await prepareThemeExportFiles({ themeDocument, themeName })
      const response = await fetch('/api/save-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId: exportVariantId, ...writeParams }),
      })
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to save theme to project')
      }
      const savedPath = typeof result.path === 'string' ? result.path : null
      setStatusMessage(savedPath ? `Saved to ${savedPath}` : 'Saved to project.')
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

  const runIfThemeNameIsValid = (task: () => Promise<void>) => {
    if (themeNameError)
      return
    clearStatusMessage()
    void task()
  }

  return {
    activeTask,
    clearStatusMessage,
    handleDownloadJar: () => runIfThemeNameIsValid(runDownloadJar),
    handleDownloadQuickExport: () => runIfThemeNameIsValid(runQuickExport),
    handleSaveToProject: () => runIfThemeNameIsValid(runSaveToProject),
    isDownloadingJar,
    isExportBusy,
    isQuickExporting,
    isSavingToProject,
    statusMessage,
  }
}
