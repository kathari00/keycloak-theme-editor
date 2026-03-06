import type { HistoryState } from './types'
import { buildQuickSettingsStorageKey, DEFAULT_THEME_ID } from '../lib/quick-settings'
import { HISTORY_STORE_STORAGE_KEY } from '../lib/storage-keys'
import { createPersistedEditorStore } from './create-editor-store'

const DEFAULT_HISTORY_SCOPE_KEY = buildQuickSettingsStorageKey(DEFAULT_THEME_ID, 'light')

/**
 * History Store - Cross-store undo/redo coordinator
 * Manages undo/redo stacks that coordinate changes across all domain stores
 *
 * Undo/redo stacks are NOT persisted (contain function references).
 * Only activeScopeKey is persisted via Zustand partialize.
 */
export const historyStore = createPersistedEditorStore<HistoryState>({
  activeScopeKey: DEFAULT_HISTORY_SCOPE_KEY,
  stacksByScope: {},
  undoStack: [],
  redoStack: [],
  canUndo: false,
  canRedo: false,
}, {
  name: HISTORY_STORE_STORAGE_KEY,
  partialize: state => ({ activeScopeKey: state.activeScopeKey }),
})
