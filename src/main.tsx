import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { subscribeToScopeChanges } from './features/editor/actions/history-actions'
import App from './app/App.tsx'
import './index.css'

subscribeToScopeChanges()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
