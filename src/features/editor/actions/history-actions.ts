import type { UndoRedoAction } from '../stores/types'
import { buildQuickSettingsStorageKey, DEFAULT_THEME_ID, getThemeStorageKey } from '../lib/quick-settings'
import { coreStore } from '../stores/core-store'
import { historyStore } from '../stores/history-store'
import { presetStore } from '../stores/preset-store'

const MAX_UNDO_STACK_SIZE = 50
const DEFAULT_COALESCE_WINDOW_MS = 1000
const DEFAULT_HISTORY_SCOPE_KEY = buildQuickSettingsStorageKey(DEFAULT_THEME_ID, 'light')

interface HistoryScopeStacks {
  undoStack: UndoRedoAction[]
  redoStack: UndoRedoAction[]
}

function buildThemeHistoryScopeKey(themeId?: string | null): string {
  return `${getThemeStorageKey(themeId)}::shared`
}

function buildHistoryScopeKey(params?: {
  themeId?: string | null
  isDarkMode?: boolean
}): string {
  return buildQuickSettingsStorageKey(getThemeStorageKey(params?.themeId), params?.isDarkMode)
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

function getThemeScopeKeyForModeScope(scopeKey: string): string {
  const themeId = scopeKey.split('::')[0] || DEFAULT_THEME_ID
  return buildThemeHistoryScopeKey(themeId)
}

function getPreferredScopeKey(params: {
  primaryScopeKey: string
  primaryStack: UndoRedoAction[]
  secondaryScopeKey: string
  secondaryStack: UndoRedoAction[]
}): string | null {
  const {
    primaryScopeKey,
    primaryStack,
    secondaryScopeKey,
    secondaryStack,
  } = params
  if (primaryStack.length > 0) {
    return primaryScopeKey
  }
  if (secondaryStack.length > 0) {
    return secondaryScopeKey
  }
  return null
}

function getVisibleHistoryState(state: typeof historyStore.state, modeScopeKey: string) {
  const themeScopeKey = getThemeScopeKeyForModeScope(modeScopeKey)
  const modeStacks = getScopeStacks(state, modeScopeKey)
  const themeStacks = getScopeStacks(state, themeScopeKey)

  const undoScopeKey = getPreferredScopeKey({
    primaryScopeKey: modeScopeKey,
    primaryStack: modeStacks.undoStack,
    secondaryScopeKey: themeScopeKey,
    secondaryStack: themeStacks.undoStack,
  })
  const redoScopeKey = getPreferredScopeKey({
    primaryScopeKey: modeScopeKey,
    primaryStack: modeStacks.redoStack,
    secondaryScopeKey: themeScopeKey,
    secondaryStack: themeStacks.redoStack,
  })

  return {
    undoStack: undoScopeKey ? getScopeStacks(state, undoScopeKey).undoStack : [],
    redoStack: redoScopeKey ? getScopeStacks(state, redoScopeKey).redoStack : [],
    canUndo: modeStacks.undoStack.length > 0 || themeStacks.undoStack.length > 0,
    canRedo: modeStacks.redoStack.length > 0 || themeStacks.redoStack.length > 0,
  }
}

function setActiveScopeInternal(scopeKey: string) {
  const normalizedScopeKey = scopeKey.trim() || DEFAULT_HISTORY_SCOPE_KEY
  const currentScopeKey = historyStore.getState().activeScopeKey
  if (currentScopeKey === normalizedScopeKey) {
    return
  }

  historyStore.setState((state) => {
    const visibleHistory = getVisibleHistoryState(state, normalizedScopeKey)
    return {
      ...state,
      activeScopeKey: normalizedScopeKey,
      undoStack: visibleHistory.undoStack,
      redoStack: visibleHistory.redoStack,
      canUndo: visibleHistory.canUndo,
      canRedo: visibleHistory.canRedo,
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

/**
 * Call once at startup to automatically sync the history scope whenever
 * the active theme or dark-mode changes. Returns an unsubscribe function.
 */
export function subscribeToScopeChanges(): () => void {
  const unsubPreset = presetStore.subscribe((state, prevState) => {
    if (state.selectedThemeId !== prevState.selectedThemeId) {
      setActiveScopeInternal(resolveEditorScopeKey())
    }
  })
  const unsubCore = coreStore.subscribe((state, prevState) => {
    if (state.isDarkMode !== prevState.isDarkMode) {
      setActiveScopeInternal(resolveEditorScopeKey())
    }
  })
  return () => {
    unsubPreset()
    unsubCore()
  }
}

export const historyActions = {
  undo: (): boolean => {
    ensureActiveScopeInSync()
    const state = historyStore.getState()
    const modeScopeKey = state.activeScopeKey
    const themeScopeKey = getThemeScopeKeyForModeScope(modeScopeKey)
    const scopeKey = getPreferredScopeKey({
      primaryScopeKey: modeScopeKey,
      primaryStack: getScopeStacks(state, modeScopeKey).undoStack,
      secondaryScopeKey: themeScopeKey,
      secondaryStack: getScopeStacks(state, themeScopeKey).undoStack,
    })
    if (!scopeKey) {
      return false
    }
    const scopeStacks = getScopeStacks(state, scopeKey)

    if (scopeStacks.undoStack.length > 0) {
      const action = scopeStacks.undoStack[scopeStacks.undoStack.length - 1]
      const newUndoStack = scopeStacks.undoStack.slice(0, -1)
      const newRedoStack = [...scopeStacks.redoStack, action]
      const stacksByScope = {
        ...state.stacksByScope,
        [scopeKey]: { undoStack: newUndoStack, redoStack: newRedoStack },
      }

      historyStore.setState(s => ({
        ...s,
        stacksByScope,
        ...getVisibleHistoryState({ ...s, stacksByScope }, modeScopeKey),
      }))

      action.undo()
      return true
    }
    return false
  },

  redo: (): boolean => {
    ensureActiveScopeInSync()
    const state = historyStore.getState()
    const modeScopeKey = state.activeScopeKey
    const themeScopeKey = getThemeScopeKeyForModeScope(modeScopeKey)
    const scopeKey = getPreferredScopeKey({
      primaryScopeKey: modeScopeKey,
      primaryStack: getScopeStacks(state, modeScopeKey).redoStack,
      secondaryScopeKey: themeScopeKey,
      secondaryStack: getScopeStacks(state, themeScopeKey).redoStack,
    })
    if (!scopeKey) {
      return false
    }
    const scopeStacks = getScopeStacks(state, scopeKey)

    if (scopeStacks.redoStack.length > 0) {
      const action = scopeStacks.redoStack[scopeStacks.redoStack.length - 1]
      const newRedoStack = scopeStacks.redoStack.slice(0, -1)
      const newUndoStack = [...scopeStacks.undoStack, action]
      const stacksByScope = {
        ...state.stacksByScope,
        [scopeKey]: { undoStack: newUndoStack, redoStack: newRedoStack },
      }

      historyStore.setState(s => ({
        ...s,
        stacksByScope,
        ...getVisibleHistoryState({ ...s, stacksByScope }, modeScopeKey),
      }))

      action.redo()
      return true
    }
    return false
  },

  addUndoRedoAction: (action: UndoRedoAction) => {
    ensureActiveScopeInSync()
    const state = historyStore.getState()
    const modeScopeKey = state.activeScopeKey
    const scopeKey = action.scope === 'theme'
      ? getThemeScopeKeyForModeScope(modeScopeKey)
      : modeScopeKey
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

    historyStore.setState(s => ({
      ...s,
      stacksByScope,
      ...getVisibleHistoryState({ ...s, stacksByScope }, modeScopeKey),
    }))
  },
}
