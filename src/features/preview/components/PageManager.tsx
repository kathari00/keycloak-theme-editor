import { Bullseye, Stack, StackItem, TreeViewSearch } from '@patternfly/react-core'
import { useState } from 'react'
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
        <nav className="pf-v6-c-nav pf-m-tertiary" aria-label="Page navigation" style={{ minHeight: 0, height: '100%', overflowY: 'auto' }}>
          <ul className="pf-v6-c-nav__list" role="menubar">
            {filteredPages.map(page => (
              <li key={page.id} className="pf-v6-c-nav__item" role="none">
                <button
                  className={`pf-v6-c-nav__link ${activePageId === page.id ? 'pf-m-current' : ''}`}
                  style={{ paddingInlineStart: '1rem' }}
                  onClick={() => setActivePage(page.id)}
                  role="menuitem"
                >
                  {page.name || page.id}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )
    : (
        <div style={{ padding: '0.75rem 0.5rem', color: 'var(--pf-t--global--text--color--subtle)', fontSize: 'var(--pf-t--global--font--size--body--sm)' }}>
          No pages match &quot;
          {query}
          &quot;
        </div>
      )

  if (!pages.length) {
    return (
      <Bullseye style={{ padding: 'var(--pf-t--global--spacer--lg)', color: 'var(--pf-t--global--text--color--subtle)', fontSize: 'var(--pf-t--global--font--size--body--sm)' }}>
        No preview pages available
      </Bullseye>
    )
  }

  return (
    <Stack hasGutter style={{ height: '100%', minHeight: 0, padding: 'var(--pf-t--global--spacer--sm)' }}>
      <StackItem>
        <TreeViewSearch
          id="page-manager-search"
          name="page-manager-search"
          aria-label="Search pages"
          placeholder="Search pages"
          onSearch={event => setQuery(event.target.value)}
          value={query}
        />
      </StackItem>
      <StackItem isFilled style={{ minHeight: 0 }}>
        {content}
      </StackItem>
    </Stack>
  )
}
