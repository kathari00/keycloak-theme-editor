import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  Nav,
  NavItem,
  NavList,
  SearchInput,
  Stack,
  StackItem,
} from '@patternfly/react-core'
import { SearchIcon } from '@patternfly/react-icons'
import { useState } from 'react'
import SidebarPanel from '../../../components/SidebarPanel'
import { usePreviewContext } from '../hooks/use-preview-context'
import { usePreviewPages } from '../hooks/usePreviewEditorState'

export default function PageManager() {
  const { pages } = usePreviewPages()
  const { activePageId, setActivePage } = usePreviewContext()
  const [query, setQuery] = useState('')

  const normalizedQuery = query.trim().toLowerCase()
  const filteredPages = normalizedQuery
    ? pages.filter((page) => {
        const searchableText = `${page.name || ''} ${page.id}`.toLowerCase()
        return searchableText.includes(normalizedQuery)
      })
    : pages
  const content = filteredPages.length > 0
    ? (
        <Nav aria-label="Page navigation" style={{ minHeight: 0, height: '100%', overflowY: 'auto' }}>
          <NavList>
            {filteredPages.map(page => (
              <NavItem
                key={page.id}
                itemId={page.id}
                isActive={activePageId === page.id}
                preventDefault
                to={`#${page.id}`}
                onClick={() => setActivePage(page.id)}
              >
                {page.name || page.id}
              </NavItem>
            ))}
          </NavList>
        </Nav>
      )
    : (
        <Bullseye style={{ height: '100%', minHeight: '200px' }}>
          <EmptyState
            headingLevel="h4"
            icon={SearchIcon}
            titleText="No pages match this search"
            variant="sm"
          >
            <EmptyStateBody>Adjust the page search and try again.</EmptyStateBody>
            <EmptyStateFooter>{query.trim()}</EmptyStateFooter>
          </EmptyState>
        </Bullseye>
      )

  if (!pages.length) {
    return (
      <SidebarPanel title="Pages" fullHeight bodyStyle={{ height: '100%' }}>
        <div style={{ height: '100%' }}>
          <Bullseye style={{ height: '100%', minHeight: '240px' }}>
            <EmptyState headingLevel="h4" titleText="No preview pages available" variant="sm">
              <EmptyStateBody>Generated preview pages will appear here when the selected theme is ready.</EmptyStateBody>
            </EmptyState>
          </Bullseye>
        </div>
      </SidebarPanel>
    )
  }

  return (
    <SidebarPanel title="Pages" fullHeight bodyStyle={{ height: '100%', minHeight: 0 }}>
      <div style={{ height: '100%', minHeight: 0 }}>
        <Stack hasGutter style={{ height: '100%', minHeight: 0 }}>
          <StackItem>
            <SearchInput
              id="page-manager-search"
              aria-label="Search pages"
              placeholder="Search pages"
              value={query}
              onChange={(_event, value) => setQuery(value)}
              onClear={() => setQuery('')}
            />
          </StackItem>
          <StackItem isFilled style={{ minHeight: 0 }}>
            {content}
          </StackItem>
        </Stack>
      </div>
    </SidebarPanel>
  )
}
