import { Suspense, lazy } from 'react'

const EditorContent = lazy(() => import('./app/EditorContent'))

const loadingFallback = (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Arial, sans-serif',
  }}
  >
    Loading editor...
  </div>
)

function App() {
  return (
    <Suspense fallback={loadingFallback}>
      <EditorContent />
    </Suspense>
  )
}

export default App
