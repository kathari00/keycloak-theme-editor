import { Flex, Stack, StackItem } from '@patternfly/react-core'
import CodeMirror from '@uiw/react-codemirror'
import { useState } from 'react'
import { getAssetDataUrl, getUploadedImageCssVarName } from '../../assets/font-css-generator'
import { usePreviewContext } from '../../preview/hooks/use-preview-context'
import { escapeCssIdentifier } from '../../preview/lib/selector-utils'
import { editorActions } from '../actions'
import { useDarkModeState, useHistoryRevisionState, useStylesCssState, useUploadedAssetsState } from '../hooks/use-editor'
import { useStyleWorkspace } from '../hooks/use-style-workspace'
import { createCssEditorExtensions } from '../lib/codemirror-config'

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

function escapeCssAttributeValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function buildPageScopedUniqueSelector(doc: Document | null, selectedNodeId: string | null): string | null {
  const normalizedSelector = (selectedNodeId || '').trim()
  if (!normalizedSelector || !doc?.body) {
    return normalizedSelector || null
  }

  const pageId = (doc.body.getAttribute('data-page-id') || '').trim()
  if (!pageId) {
    return normalizedSelector
  }

  const pageScopedBodySelector = `body[data-page-id="${escapeCssAttributeValue(pageId)}"]`
  if (normalizedSelector === 'body') {
    return pageScopedBodySelector
  }

  if (normalizedSelector.startsWith('body[') || normalizedSelector.startsWith('body#') || normalizedSelector.startsWith('body.')) {
    return normalizedSelector
  }

  return `${pageScopedBodySelector} ${normalizedSelector}`
}

export default function StylingPanel() {
  const { isDarkMode } = useDarkModeState()
  const { revision } = useHistoryRevisionState()
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

  const customFontFamilies = uploadedAssets.flatMap(asset =>
    asset.category === 'font' && asset.fontFamily ? [asset.fontFamily] : [],
  )

  const uploadedImages: CssEditorImageAsset[] = uploadedAssets
    .filter(asset => asset.category === 'background' || asset.category === 'logo' || asset.category === 'image')
    .map(asset => ({
      name: asset.name,
      category: asset.category,
      dataUrl: getAssetDataUrl(asset),
      cssVar: getUploadedImageCssVarName(asset) ?? undefined,
    }))

  const availableIdentifiers = collectIdentifiersForSelectedElement(previewDocument, selectedNodeId)
  const pageScopedUniqueSelector = buildPageScopedUniqueSelector(previewDocument, selectedNodeId)

  const extensions = createCssEditorExtensions(
    isDarkMode,
    customFontFamilies,
    uploadedImages,
    availableIdentifiers,
    pageScopedUniqueSelector,
    {
      undo: editorActions.undo,
      redo: editorActions.redo,
    },
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
    <Stack style={{ height: '100%', padding: 'var(--pf-t--global--spacer--sm)' }}>
      <StackItem>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <h4 style={{ color: labelTextColor, margin: 0 }}>Styling</h4>
          <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsXs' }} style={{ color: labelTextColor, fontSize: '0.75rem' }} component="label">
            <input
              type="checkbox"
              checked={showAllStyles}
              onChange={e => setShowAllStyles(e.target.checked)}
            />
            <span>Show all styles</span>
          </Flex>
        </Flex>
      </StackItem>
      <StackItem isFilled style={{ minHeight: 0 }}>
        <div style={{ overflow: 'hidden', minHeight: 0, height: '100%', border: '1px solid var(--pf-t--global--border--color--default)', borderRadius: 'var(--pf-t--global--border--radius--medium)' }}>
          <CodeMirror
            key={revision}
            value={editorCss}
            onChange={setEditorCss}
            onBlur={commitEditorCss}
            basicSetup={{ autocompletion: false, indentOnInput: false }}
            extensions={extensions}
            height="100%"
            style={{ height: '100%' }}
          />
        </div>
      </StackItem>

      <StackItem>
        <span style={{ color: labelTextColor, userSelect: 'none', fontSize: '12px' }}>
          Press
          {' '}
          <kbd style={{ ...kbdStyle, padding: '0.125rem 0.25rem', border: '1px solid', borderRadius: 'var(--pf-t--global--border--radius--small)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: '10px' }}>Ctrl</kbd>
          +
          <kbd style={{ ...kbdStyle, padding: '0.125rem 0.25rem', border: '1px solid', borderRadius: 'var(--pf-t--global--border--radius--small)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: '10px' }}>Space</kbd>
          {' '}
          for suggestions
        </span>
      </StackItem>
    </Stack>
  )
}
