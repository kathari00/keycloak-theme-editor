import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App.tsx'
import { subscribeToScopeChanges } from './features/editor/actions/history-actions'
import { subscribeToQuickStartSync } from './features/editor/actions/theme-actions'
import '@patternfly/react-core/dist/styles/base.css'
import './index.css'

subscribeToScopeChanges()
subscribeToQuickStartSync()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
