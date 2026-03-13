import { Flex, Stack, StackItem } from '@patternfly/react-core'
import CodeMirror from '@uiw/react-codemirror'
import { useState } from 'react'
import SidebarPanel from '../../../components/SidebarPanel'
import { getAssetDataUrl, getUploadedImageCssVarName } from '../../assets/font-css-generator'
import { usePreviewContext } from '../../preview/hooks/use-preview-context'
import { escapeCssIdentifier } from '../../preview/lib/selector-utils'
import { editorActions } from '../actions'
import { useCssFilesState, useDarkModeState, useHistoryRevisionState, useUploadedAssetsState } from '../hooks/use-editor'
import { useStyleWorkspace } from '../hooks/use-style-workspace'
import { createCssEditorExtensions } from '../lib/codemirror-config'
import { cssFileDisplayName, QUICK_START_CSS_PATH } from '../lib/css-files'

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
  const { stylesCssFiles, activeCssFilePath } = useCssFilesState()
  const { uploadedAssets } = useUploadedAssetsState()
  const {
    getDocument,
    selectedNodeId,
    previewReady: isPreviewReady,
  } = usePreviewContext()

  const [showAllStylesByFile, setShowAllStylesByFile] = useState<Record<string, boolean>>({ [QUICK_START_CSS_PATH]: true })
  const showAllStyles = showAllStylesByFile[activeCssFilePath] ?? false
  const setShowAllStyles = (value: boolean) => setShowAllStylesByFile(prev => ({ ...prev, [activeCssFilePath]: value }))

  const filePaths = Object.keys(stylesCssFiles)
  const hasFileTabs = filePaths.length > 0
  const activeFileCss = stylesCssFiles[activeCssFilePath] ?? ''

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
    stylesCss: activeFileCss,
    selectedElement,
    hasActiveSelection: Boolean(selectedElement),
    showAllStyles,
    addUndoRedoAction: editorActions.addUndoRedoAction,
    setStylesCss: editorActions.setActiveFileCss,
  })

  const labelTextColor = isDarkMode ? '#f3f4f6' : '#111827'
  const kbdStyle = {
    color: isDarkMode ? '#f9fafb' : '#111827',
    backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
    borderColor: isDarkMode ? '#6b7280' : '#d1d5db',
  }

  const tabBarBg = isDarkMode ? '#1f2937' : '#f9fafb'
  const tabBorderColor = 'var(--pf-t--global--border--color--default)'
  const activeTabBg = isDarkMode ? '#111827' : '#ffffff'
  const inactiveTabColor = isDarkMode ? '#9ca3af' : '#6b7280'

  return (
    <SidebarPanel title="Styling" fullHeight bodyStyle={{ height: '100%' }}>
      <div style={{ height: '100%', minHeight: 0 }}>
        <Stack style={{ height: '100%' }}>
          <StackItem style={{ paddingBottom: 'var(--pf-t--global--spacer--sm)' }}>
            <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
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
            <div style={{ overflow: 'hidden', minHeight: 0, height: '100%', border: `1px solid ${tabBorderColor}`, borderRadius: 'var(--pf-t--global--border--radius--medium)', display: 'flex', flexDirection: 'column' }}>
              {hasFileTabs && (
                <div
                  role="tablist"
                  aria-label="CSS files"
                  style={{
                    display: 'flex',
                    gap: 0,
                    backgroundColor: tabBarBg,
                    borderBottom: `1px solid ${tabBorderColor}`,
                    flexShrink: 0,
                    overflowX: 'auto',
                  }}
                >
                  {filePaths.map(filePath => (
                    <button
                      key={filePath}
                      role="tab"
                      type="button"
                      aria-selected={filePath === activeCssFilePath}
                      onClick={() => {
                        commitEditorCss()
                        editorActions.setActiveCssFilePath(filePath)
                      }}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        border: 'none',
                        borderRight: `1px solid ${tabBorderColor}`,
                        borderBottom: filePath === activeCssFilePath ? `2px solid var(--pf-t--global--color--brand--default)` : '2px solid transparent',
                        background: filePath === activeCssFilePath ? activeTabBg : 'transparent',
                        color: filePath === activeCssFilePath ? labelTextColor : inactiveTabColor,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        lineHeight: '1.4',
                      }}
                    >
                      {cssFileDisplayName(filePath)}
                    </button>
                  ))}
                </div>
              )}
              <div style={{ flex: 1, minHeight: 0 }}>
                <CodeMirror
                  key={`${revision}-${activeCssFilePath}`}
                  value={editorCss}
                  onChange={setEditorCss}
                  onBlur={commitEditorCss}
                  basicSetup={{ autocompletion: false, indentOnInput: false }}
                  extensions={extensions}
                  height="100%"
                  style={{ height: '100%' }}
                />
              </div>
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
      </div>
    </SidebarPanel>
  )
}
