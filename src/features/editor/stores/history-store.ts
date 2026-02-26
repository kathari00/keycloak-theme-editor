import type { HistoryState } from './types'
import { buildQuickSettingsStorageKey, DEFAULT_THEME_ID } from '../quick-settings'
import { HISTORY_SCOPE_STORAGE_KEY } from '../storage-keys'
import { createEditorStore } from './create-editor-store'

const DEFAULT_HISTORY_SCOPE_KEY = buildQuickSettingsStorageKey(DEFAULT_THEME_ID, 'light')

function getInitialHistoryScopeKey(): string {
  if (typeof window === 'undefined') {
    return DEFAULT_HISTORY_SCOPE_KEY
  }

  try {
    const storedScopeKey = window.localStorage.getItem(HISTORY_SCOPE_STORAGE_KEY)?.trim()
    return storedScopeKey || DEFAULT_HISTORY_SCOPE_KEY
  }
  catch {
    return DEFAULT_HISTORY_SCOPE_KEY
  }
}

/**
 * History Store - Cross-store undo/redo coordinator
 * Manages undo/redo stacks that coordinate changes across all domain stores
 *
 * Not persisted: stack entries contain function references.
 * Only the active scope key is restored from localStorage.
 */
export const historyStore = createEditorStore<HistoryState>({
  activeScopeKey: getInitialHistoryScopeKey(),
  stacksByScope: {},
  undoStack: [],
  redoStack: [],
  canUndo: false,
  canRedo: false,
})
