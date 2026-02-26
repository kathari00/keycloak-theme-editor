import CodeMirror from '@uiw/react-codemirror'
import { useMemo, useState } from 'react'
import { getAssetDataUrl, getUploadedImageCssVarName } from '../features/assets/font-css-generator'
import { editorActions } from '../features/editor/actions'
import { createCssEditorExtensions } from '../features/editor/codemirror-config'
import { useStyleWorkspace } from '../features/editor/hooks/use-style-workspace'
import { useDarkModeState, useStylesCssState, useUploadedAssetsState } from '../features/editor/use-editor'
import { escapeCssIdentifier } from '../features/preview/selector-utils'
import { usePreviewContext } from '../features/preview/use-preview-context'

interface CssEditorImageAsset {
  name: string
  dataUrl: string
  category: string
  cssVar?: string
}

function resolveSelectedElement(doc: Document, selectedNodeId: string | null): Element | null {
  if (selectedNodeId) {
      const selected = doc.querySelector(selectedNodeId)
      if (selected) {
        return selected
      }
    
  }
  return doc.querySelector('[data-preview-selected="true"]')
}

function collectIdentifiersForSelectedElement(doc: Document | null, selectedNodeId: string | null): string[] {
  const identifiers: string[] = []
  const seen = new Set<string>()

  const addIdentifier = (value: string | null | undefined) => {
    const normalized = (value || '').trim()
    if (!normalized || seen.has(normalized)) {
      return
    }
    seen.add(normalized)
    identifiers.push(normalized)
  }

  addIdentifier(selectedNodeId)

  if (!doc?.body) {
    return identifiers
  }

  const selectedElement = resolveSelectedElement(doc, selectedNodeId)
  if (!selectedElement) {
    return identifiers
  }

  if (selectedElement.id) {
    addIdentifier(`#${escapeCssIdentifier(selectedElement.id, doc)}`)
  }

  selectedElement.classList.forEach((className) => {
    if (!className) {
      return
    }
    addIdentifier(`.${escapeCssIdentifier(className, doc)}`)
  })

  return identifiers
}

export default function StylingPanel() {
  const { isDarkMode } = useDarkModeState()
  const { stylesCss } = useStylesCssState()
  const { uploadedAssets } = useUploadedAssetsState()
  const {
    getDocument,
    selectedNodeId,
    previewReady: isPreviewReady,
  } = usePreviewContext()

  const [showAllStyles, setShowAllStyles] = useState(false)

  const previewDocument = isPreviewReady ? getDocument() : null

  const selectedElement = previewDocument
    ? resolveSelectedElement(previewDocument, selectedNodeId)
    : null

  const customFontFamilies = useMemo(
    () =>
      uploadedAssets.flatMap(asset =>
        asset.category === 'font' && asset.fontFamily ? [asset.fontFamily] : [],
      ),
    [uploadedAssets],
  )

  const uploadedImages = useMemo<CssEditorImageAsset[]>(
    () =>
      uploadedAssets
        .filter(asset => asset.category === 'background' || asset.category === 'logo' || asset.category === 'image')
        .map(asset => ({
          name: asset.name,
          category: asset.category,
          dataUrl: getAssetDataUrl(asset),
          cssVar: getUploadedImageCssVarName(asset) ?? undefined,
        })),
    [uploadedAssets],
  )

  const availableIdentifiers = useMemo(() => {
    return collectIdentifiersForSelectedElement(previewDocument, selectedNodeId)
  }, [previewDocument, selectedNodeId])

  const extensions = useMemo(
    () =>
      createCssEditorExtensions(
        isDarkMode,
        customFontFamilies,
        uploadedImages,
        availableIdentifiers,
        selectedNodeId,
        {
          undo: editorActions.undo,
          redo: editorActions.redo,
        },
      ),
    [isDarkMode, customFontFamilies, uploadedImages, availableIdentifiers, selectedNodeId],
  )

  const {
    editorCss,
    setEditorCss,
    commitEditorCss,
  } = useStyleWorkspace({
    stylesCss,
    selectedElement,
    hasActiveSelection: Boolean(selectedElement),
    showAllStyles,
    addUndoRedoAction: editorActions.addUndoRedoAction,
    setStylesCss: editorActions.setStylesCss,
  })

  const labelTextColor = isDarkMode ? '#f3f4f6' : '#111827'
  const kbdStyle = {
    color: isDarkMode ? '#f9fafb' : '#111827',
    backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
    borderColor: isDarkMode ? '#6b7280' : '#d1d5db',
  }

  return (
    <div className="h-full flex flex-col p-2">
      <div className="flex items-center justify-between mb-2">
        <h4 style={{ color: labelTextColor }}>Styling</h4>
        <label className="flex items-center gap-1 text-xs cursor-pointer select-none" style={{ color: labelTextColor }}>
          <input
            type="checkbox"
            checked={showAllStyles}
            onChange={e => setShowAllStyles(e.target.checked)}
          />
          Show all styles
        </label>
      </div>
      <div className="flex-1 min-h-0 border border-gray-300 rounded-md overflow-hidden">
        <CodeMirror
          value={editorCss}
          onChange={setEditorCss}
          onBlur={commitEditorCss}
          basicSetup={{ autocompletion: false, indentOnInput: false }}
          extensions={extensions}
          height="100%"
          style={{ height: '100%' }}
        />
      </div>

      <span className="mt-1 text-[12px] select-none" style={{ color: labelTextColor }}>
        Press
        {' '}
        <kbd className="px-1 py-0.5 border rounded text-[10px] font-mono" style={kbdStyle}>Ctrl</kbd>
        +
        <kbd className="px-1 py-0.5 border rounded text-[10px] font-mono" style={kbdStyle}>Space</kbd>
        {' '}
        for suggestions
      </span>
    </div>
  )
}
