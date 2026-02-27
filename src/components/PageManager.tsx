import { TreeViewSearch } from '@patternfly/react-core'
import { useState } from 'react'
import { useEditorStore } from '../features/editor/use-editor'
import { usePreviewContext } from '../features/preview/use-preview-context'

export default function PageManager() {
  const { pages } = useEditorStore()
  const { activePageId, setActivePage } = usePreviewContext()
  const [query, setQuery] = useState('')

  const normalizedQuery = query.trim().toLowerCase()
  const filteredPages = normalizedQuery
    ? pages.filter((page) => {
        const searchableText = `${page.name || ''} ${page.id}`.toLowerCase()
        return searchableText.includes(normalizedQuery)
      })
    : pages

  if (!pages.length) {
    return (
      <div className="p-4 text-center text-gray-500">
        No preview pages available
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-2">
      <TreeViewSearch
        id="page-manager-search"
        name="page-manager-search"
        aria-label="Search pages"
        placeholder="Search pages"
        onSearch={event => setQuery(event.target.value)}
        value={query}
      />
      {filteredPages.length > 0
        ? (
            <nav className="pf-v6-c-nav pf-m-tertiary overflow-y-auto min-h-0" aria-label="Page navigation">
              <ul className="pf-v6-c-nav__list" role="menubar">
                {filteredPages.map(page => (
                  <li key={page.id} className="pf-v6-c-nav__item" role="none">
                    <button
                      className={`pf-v6-c-nav__link pl-4 ${activePageId === page.id ? 'pf-m-current' : ''}`}
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
            <div className="px-2 py-3 text-sm text-gray-500">
              No pages match &quot;
              {query}
              &quot;
            </div>
          )}
    </div>
  )
}
