import { assetActions } from './asset-actions'
import { coreActions } from './core-actions'
import { historyActions } from './history-actions'
import { presetActions } from './preset-actions'
import { resetActions } from './reset-actions'
import { themeActions } from './theme-actions'

/**
 * Unified editor actions namespace
 * Combines all domain-specific actions
 */
export const editorActions = {
  ...assetActions,
  ...presetActions,
  ...themeActions,
  ...coreActions,
  ...historyActions,
  ...resetActions,
}

// Re-export for direct imports
export { assetActions, coreActions, historyActions, presetActions, resetActions, themeActions }
export { buildQuickSettingsStorageKey } from './preset-actions'
