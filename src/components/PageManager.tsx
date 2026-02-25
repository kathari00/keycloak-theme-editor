import { useEditorStore } from '../features/editor/use-editor'
import { usePreviewContext } from '../features/preview/PreviewProvider'

export default function PageManager() {
  const { pages } = useEditorStore()
  const { activePageId, setActivePage } = usePreviewContext()

  if (!pages.length) {
    return (
      <div className="p-4 text-center text-gray-500">
        No preview pages available
      </div>
    )
  }

  return (
    <nav className="pf-v6-c-nav pf-m-tertiary" aria-label="Page navigation">
      <ul className="pf-v6-c-nav__list" role="menubar">
        {pages.map(page => (
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
}
