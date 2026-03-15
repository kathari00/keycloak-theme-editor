import type { TreeViewDataItem } from '@patternfly/react-core'
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  SearchInput,
  Spinner,
  Stack,
  StackItem,
  TreeView,
} from '@patternfly/react-core'
import { SearchIcon } from '@patternfly/react-icons'
import { useEffect, useState } from 'react'
import SidebarPanel from '../../../components/SidebarPanel'
import { usePreviewContext } from '../../preview/hooks/use-preview-context'
import { createElementSelector } from '../../preview/lib/selector-utils'

interface SelectionTreeNode {
  selector: string
  label: string
  searchText: string
  children: SelectionTreeNode[]
}

const SKIPPED_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'META', 'LINK', 'TITLE'])
const MAX_TREE_NODES = 800

function shouldSkipElement(element: Element): boolean {
  return SKIPPED_TAGS.has(element.tagName)
}

function createNodeLabel(element: Element): string {
  const tag = element.tagName.toLowerCase()
  const id = element.id ? `#${element.id}` : ''
  const classTokens = (element.getAttribute('class') || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
  const classSuffix = classTokens.length ? `.${classTokens.join('.')}` : ''
  return `${tag}${id}${classSuffix}`
}

function buildNode(
  element: Element,
  state: { count: number, truncated: boolean },
): SelectionTreeNode | null {
  if (shouldSkipElement(element)) {
    return null
  }

  if (state.count >= MAX_TREE_NODES) {
    state.truncated = true
    return null
  }

  state.count += 1
  const children = Array.from(element.children)
    .map(child => buildNode(child, state))
    .filter((child): child is SelectionTreeNode => child !== null)
  const selector = createElementSelector(element)
  const label = createNodeLabel(element)

  return {
    selector,
    label,
    searchText: `${label} ${selector}`.toLowerCase(),
    children,
  }
}

function buildTree(doc: Document): SelectionTreeNode[] {
  const state = { count: 0, truncated: false }
  return Array.from(doc.body.children)
    .map(child => buildNode(child, state))
    .filter((child): child is SelectionTreeNode => child !== null)
}

function filterNodes(nodes: SelectionTreeNode[], query: string): SelectionTreeNode[] {
  const visit = (node: SelectionTreeNode): SelectionTreeNode | null => {
    const filteredChildren = node.children
      .map(visit)
      .filter((child): child is SelectionTreeNode => child !== null)

    if (node.searchText.includes(query) || filteredChildren.length > 0) {
      return {
        ...node,
        children: filteredChildren,
      }
    }

    return null
  }

  return nodes
    .map(visit)
    .filter((child): child is SelectionTreeNode => child !== null)
}

function mapToTreeViewData(nodes: SelectionTreeNode[]): TreeViewDataItem[] {
  return nodes.map(node => ({
    id: node.selector,
    name: node.label,
    children: mapToTreeViewData(node.children),
    defaultExpanded: true,
  }))
}

function findItemPath(data: TreeViewDataItem[], targetId: string): TreeViewDataItem[] {
  const visit = (item: TreeViewDataItem): TreeViewDataItem[] | null => {
    if (item.id === targetId) {
      return [item]
    }

    if (!item.children?.length) {
      return null
    }

    for (const child of item.children) {
      const result = visit(child)
      if (result) {
        return [item, ...result]
      }
    }

    return null
  }

  for (const item of data) {
    const result = visit(item)
    if (result) {
      return result
    }
  }

  return []
}

export default function SelectionTree() {
  const {
    getDocument,
    previewReady,
    selectedNodeId,
    selectNode,
    activeVariantId,
    activePageId,
    activeStateId,
  } = usePreviewContext()
  const [nodes, setNodes] = useState<SelectionTreeNode[]>([])
  const [query, setQuery] = useState('')

  const visibleNodes = previewReady ? nodes : []
  const normalizedQuery = query.trim().toLowerCase()
  const filteredNodes = normalizedQuery ? filterNodes(visibleNodes, normalizedQuery) : visibleNodes
  const treeData = mapToTreeViewData(filteredNodes)
  const activeItems = selectedNodeId
    ? (findItemPath(treeData, selectedNodeId) || undefined)
    : undefined

  useEffect(() => {
    if (!previewReady) {
      return
    }

    const doc = getDocument()
    if (!doc?.body) {
      return
    }

    let frameId = 0
    const rebuild = () => {
      setNodes(buildTree(doc))
    }
    const scheduleRebuild = () => {
      if (frameId) {
        return
      }
      frameId = window.requestAnimationFrame(() => {
        frameId = 0
        rebuild()
      })
    }

    scheduleRebuild()

    const observer = new MutationObserver(scheduleRebuild)
    observer.observe(doc.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['id', 'class'],
    })

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }
      observer.disconnect()
    }
  }, [previewReady, getDocument, activeVariantId, activePageId, activeStateId])

  const handleTreeSelect = (_event: React.MouseEvent, item: TreeViewDataItem) => {
    if (typeof item.id === 'string') {
      selectNode(item.id)
    }
  }

  return (
    <SidebarPanel title="Selection tree" fullHeight className="selection-tree-panel" bodyStyle={{ height: '100%' }}>
      <div style={{ height: '100%', minHeight: 0 }}>
        {!previewReady && (
          <Bullseye style={{ height: '100%', minHeight: '240px' }}>
            <Spinner size="md" />
          </Bullseye>
        )}

        {previewReady && (
          <Stack hasGutter style={{ height: '100%', minHeight: 0 }}>
            <StackItem>
              <SearchInput
                id="selection-tree-search"
                aria-label="Search selectable elements"
                placeholder="Search selectors"
                value={query}
                onChange={(_event, value) => setQuery(value)}
                onClear={() => setQuery('')}
              />
            </StackItem>

            <StackItem isFilled style={{ minHeight: 0, overflow: 'auto', paddingInlineEnd: 'var(--pf-t--global--spacer--xs)' }}>
              {treeData.length > 0
                ? (
                    <TreeView
                      aria-label="Selectable elements"
                      data={treeData}
                      activeItems={activeItems}
                      allExpanded
                      hasSelectableNodes
                      className="selection-tree-view"
                      onSelect={handleTreeSelect}
                    />
                  )
                : (
                    <Bullseye style={{ height: '100%', minHeight: '200px' }}>
                      <EmptyState
                        headingLevel="h4"
                        icon={SearchIcon}
                        titleText="No selectable elements found"
                        variant="sm"
                      >
                        <EmptyStateBody>Try a different selector search or reload the preview content.</EmptyStateBody>
                      </EmptyState>
                    </Bullseye>
                  )}
            </StackItem>
          </Stack>
        )}
      </div>
    </SidebarPanel>
  )
}
