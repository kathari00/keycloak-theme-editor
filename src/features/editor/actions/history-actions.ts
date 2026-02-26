import type { UndoRedoAction } from '../stores/types'
import { coreStore } from '../stores/core-store'
import { historyStore } from '../stores/history-store'
import { presetStore } from '../stores/preset-store'

const MAX_UNDO_STACK_SIZE = 50
const DEFAULT_COALESCE_WINDOW_MS = 1000
const DEFAULT_THEME_ID = 'v2'
const LIGHT_MODE = 'light'
const DARK_MODE = 'dark'
const DEFAULT_HISTORY_SCOPE_KEY = `${DEFAULT_THEME_ID}::${LIGHT_MODE}`
const HISTORY_SCOPE_STORAGE_KEY = 'keycloak-editor-history-scope'

type HistoryScopeStacks = {
  undoStack: UndoRedoAction[]
  redoStack: UndoRedoAction[]
}

function normalizeThemeId(value: string | null | undefined): string {
  const normalized = (value || '').trim()
  return normalized || DEFAULT_THEME_ID
}

function normalizeMode(isDarkMode: boolean | undefined): 'light' | 'dark' {
  return isDarkMode ? DARK_MODE : LIGHT_MODE
}

function buildHistoryScopeKey(params?: {
  themeId?: string | null
  isDarkMode?: boolean
}): string {
  return `${normalizeThemeId(params?.themeId)}::${normalizeMode(params?.isDarkMode)}`
}

function resolveEditorScopeKey(): string {
  return buildHistoryScopeKey({
    themeId: presetStore.getState().selectedThemeId,
    isDarkMode: coreStore.getState().isDarkMode,
  })
}

function getScopeStacks(state = historyStore.getState(), scopeKey = state.activeScopeKey): HistoryScopeStacks {
  return state.stacksByScope[scopeKey] ?? { undoStack: [], redoStack: [] }
}

function persistActiveScopeKey(scopeKey: string) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(HISTORY_SCOPE_STORAGE_KEY, scopeKey)
  }
  catch {
    // Ignore storage write failures.
  }
}

function setActiveScopeInternal(scopeKey: string) {
  const normalizedScopeKey = scopeKey.trim() || DEFAULT_HISTORY_SCOPE_KEY
  const currentScopeKey = historyStore.getState().activeScopeKey
  if (currentScopeKey !== normalizedScopeKey) {
    persistActiveScopeKey(normalizedScopeKey)
  }

  historyStore.setState((state) => {
    const scopeStacks = getScopeStacks(state, normalizedScopeKey)
    return {
      activeScopeKey: normalizedScopeKey,
      stacksByScope: state.stacksByScope,
      undoStack: scopeStacks.undoStack,
      redoStack: scopeStacks.redoStack,
      canUndo: scopeStacks.undoStack.length > 0,
      canRedo: scopeStacks.redoStack.length > 0,
    }
  })
}

function ensureActiveScopeInSync(): string {
  const scopeKey = resolveEditorScopeKey()
  if (scopeKey !== historyStore.getState().activeScopeKey) {
    setActiveScopeInternal(scopeKey)
  }
  return scopeKey
}

export const historyActions = {
  syncActiveScopeFromEditor: () => {
    setActiveScopeInternal(resolveEditorScopeKey())
  },

  undo: (): boolean => {
    ensureActiveScopeInSync()
    const state = historyStore.getState()
    const scopeKey = state.activeScopeKey
    const scopeStacks = getScopeStacks(state, scopeKey)

    if (scopeStacks.undoStack.length > 0) {
      const action = scopeStacks.undoStack[scopeStacks.undoStack.length - 1]
      const newUndoStack = scopeStacks.undoStack.slice(0, -1)
      const newRedoStack = [...scopeStacks.redoStack, action]
      const stacksByScope = {
        ...state.stacksByScope,
        [scopeKey]: { undoStack: newUndoStack, redoStack: newRedoStack },
      }

      historyStore.setState({
        stacksByScope,
        undoStack: newUndoStack,
        redoStack: newRedoStack,
        canUndo: newUndoStack.length > 0,
        canRedo: newRedoStack.length > 0,
      })

      action.undo()
      return true
    }
    return false
  },

  redo: (): boolean => {
    ensureActiveScopeInSync()
    const state = historyStore.getState()
    const scopeKey = state.activeScopeKey
    const scopeStacks = getScopeStacks(state, scopeKey)

    if (scopeStacks.redoStack.length > 0) {
      const action = scopeStacks.redoStack[scopeStacks.redoStack.length - 1]
      const newRedoStack = scopeStacks.redoStack.slice(0, -1)
      const newUndoStack = [...scopeStacks.undoStack, action]
      const stacksByScope = {
        ...state.stacksByScope,
        [scopeKey]: { undoStack: newUndoStack, redoStack: newRedoStack },
      }

      historyStore.setState({
        stacksByScope,
        undoStack: newUndoStack,
        redoStack: newRedoStack,
        canUndo: newUndoStack.length > 0,
        canRedo: newRedoStack.length > 0,
      })

      action.redo()
      return true
    }
    return false
  },

  addUndoRedoAction: (action: UndoRedoAction) => {
    ensureActiveScopeInSync()
    const state = historyStore.getState()
    const scopeKey = state.activeScopeKey
    const scopeStacks = getScopeStacks(state, scopeKey)
    const nextAction: UndoRedoAction = {
      ...action,
      createdAt: action.createdAt ?? Date.now(),
    }
    const lastAction = scopeStacks.undoStack[scopeStacks.undoStack.length - 1]
    const coalesceWindowMs = nextAction.coalesceWindowMs ?? DEFAULT_COALESCE_WINDOW_MS
    const elapsedMs = (nextAction.createdAt ?? 0) - (lastAction?.createdAt ?? 0)
    const coalesceKey = nextAction.coalesceKey
    const canCoalesce
      = Boolean(coalesceKey)
      && coalesceKey === lastAction?.coalesceKey
      && elapsedMs <= coalesceWindowMs

    const actionToStore: UndoRedoAction = canCoalesce && lastAction
      ? {
          ...nextAction,
          undo: lastAction.undo,
        }
      : nextAction

    let newUndoStack = canCoalesce
      ? [...scopeStacks.undoStack.slice(0, -1), actionToStore]
      : [...scopeStacks.undoStack, actionToStore]

    if (newUndoStack.length > MAX_UNDO_STACK_SIZE) {
      newUndoStack = newUndoStack.slice(newUndoStack.length - MAX_UNDO_STACK_SIZE)
    }
    const stacksByScope = {
      ...state.stacksByScope,
      [scopeKey]: { undoStack: newUndoStack, redoStack: [] },
    }

    historyStore.setState({
      stacksByScope,
      undoStack: newUndoStack,
      redoStack: [],
      canUndo: true,
      canRedo: false,
    })
  },
}
