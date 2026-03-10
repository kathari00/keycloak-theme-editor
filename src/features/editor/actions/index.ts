import { assetActions } from './asset-actions'
import { coreActions } from './core-actions'
import { historyActions } from './history-actions'
import { importActions } from './import-actions'
import { quickStartExtrasActions } from './quick-start-extras-actions'
import { resetActions } from './reset-actions'
import { themeActions } from './theme-actions'
import { themeSelectionActions } from './theme-selection-actions'

/**
 * Assembled preset actions from split modules
 */
export const presetActions = {
  ...quickStartExtrasActions,
  ...themeSelectionActions,
  ...importActions,
}

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

export { assetActions, coreActions, historyActions, resetActions, themeActions }
export { buildQuickSettingsStorageKey } from '../lib/quick-settings'
export type { QuickSettingsMode } from './preset-state'
