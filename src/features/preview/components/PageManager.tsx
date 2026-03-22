import type { KeyboardEvent } from 'react'
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
import { useRef, useState } from 'react'
import SidebarPanel from '../../../components/SidebarPanel'
import { usePreviewContext } from '../hooks/use-preview-context'
import { usePreviewPages } from '../hooks/usePreviewEditorState'

export default function PageManager() {
  const { pages } = usePreviewPages()
  const { activePageId, setActivePage } = usePreviewContext()
  const [query, setQuery] = useState('')
  const pageButtonsRef = useRef(new Map<string, HTMLButtonElement>())

  const normalizedQuery = query.trim().toLowerCase()
  const filteredPages = normalizedQuery
    ? pages.filter((page) => {
        const searchableText = `${page.name || ''} ${page.id}`.toLowerCase()
        return searchableText.includes(normalizedQuery)
      })
    : pages

  const focusPageAtIndex = (index: number) => {
    const nextPage = filteredPages[index]
    if (!nextPage) {
      return
    }

    pageButtonsRef.current.get(nextPage.id)?.focus()
  }

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && filteredPages.length > 0) {
      event.preventDefault()
      focusPageAtIndex(0)
    }
  }

  const handlePageKeyDown = (event: KeyboardEvent<HTMLButtonElement>, pageIndex: number) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        focusPageAtIndex(Math.min(pageIndex + 1, filteredPages.length - 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        if (pageIndex === 0) {
          const searchInput = document.getElementById('page-manager-search') as HTMLInputElement | null
          searchInput?.focus()
          break
        }
        focusPageAtIndex(pageIndex - 1)
        break
      case 'Home':
        event.preventDefault()
        focusPageAtIndex(0)
        break
      case 'End':
        event.preventDefault()
        focusPageAtIndex(filteredPages.length - 1)
        break
    }
  }

  const content = filteredPages.length > 0
    ? (
        <Nav
          aria-label="Page navigation"
          className="page-manager-nav"
          style={{ minHeight: 0, height: '100%', overflowY: 'auto' }}
        >
          <NavList>
            {filteredPages.map((page, pageIndex) => {
              const isActive = activePageId === page.id
              return (
                <NavItem
                  key={page.id}
                  itemId={page.id}
                  isActive={isActive}
                  onClick={() => setActivePage(page.id)}
                  className="page-manager-nav__item"
                >
                  <button
                    ref={(element) => {
                      if (element) {
                        pageButtonsRef.current.set(page.id, element)
                      }
                      else {
                        pageButtonsRef.current.delete(page.id)
                      }
                    }}
                    type="button"
                    className="page-manager-nav__label"
                    onKeyDown={event => handlePageKeyDown(event, pageIndex)}
                  >
                    {page.name || page.id}
                  </button>
                </NavItem>
              )
            })}
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
              onKeyDown={handleSearchKeyDown}
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
