import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { historyActions, subscribeToScopeChanges } from '../actions/history-actions'
import { coreStore } from '../stores/core-store'
import { historyStore } from '../stores/history-store'
import { presetStore } from '../stores/preset-store'

let unsubscribeScopeChanges: () => void

function resetHistoryStore() {
  historyStore.setState(() => ({
    activeScopeKey: 'v2::light',
    stacksByScope: {},
    undoStack: [],
    redoStack: [],
    canUndo: false,
    canRedo: false,
  }))
  coreStore.setState(state => ({ ...state, isDarkMode: false }))
  presetStore.setState(state => ({ ...state, selectedThemeId: 'v2' }))
  // Scope is automatically synced by subscribeToScopeChanges() subscriber.
}

describe('historyActions coalescing', () => {
  beforeEach(() => {
    unsubscribeScopeChanges = subscribeToScopeChanges()
    resetHistoryStore()
  })

  afterEach(() => {
    unsubscribeScopeChanges?.()
  })

  it('coalesces actions with same key inside window', () => {
    const marker = { value: '' }

    historyActions.addUndoRedoAction({
      undo: () => {
        marker.value = 'undo-1'
      },
      redo: () => {
        marker.value = 'redo-1'
      },
      coalesceKey: 'css-editor-user',
      coalesceWindowMs: 5000,
      createdAt: 1000,
    })

    historyActions.addUndoRedoAction({
      undo: () => {
        marker.value = 'undo-2'
      },
      redo: () => {
        marker.value = 'redo-2'
      },
      coalesceKey: 'css-editor-user',
      coalesceWindowMs: 5000,
      createdAt: 2500,
    })

    expect(historyStore.getState().undoStack).toHaveLength(1)
    historyActions.undo()
    expect(marker.value).toBe('undo-1')
    historyActions.redo()
    expect(marker.value).toBe('redo-2')
  })

  it('does not coalesce actions outside window', () => {
    historyActions.addUndoRedoAction({
      undo: () => {},
      redo: () => {},
      coalesceKey: 'css-editor-user',
      coalesceWindowMs: 5000,
      createdAt: 1000,
    })

    historyActions.addUndoRedoAction({
      undo: () => {},
      redo: () => {},
      coalesceKey: 'css-editor-user',
      coalesceWindowMs: 5000,
      createdAt: 7001,
    })

    expect(historyStore.getState().undoStack).toHaveLength(2)
  })

  it('keeps undo stacks isolated per preset and mode scope', () => {
    const marker = { value: '' }

    historyActions.addUndoRedoAction({
      undo: () => {
        marker.value = 'light-undo'
      },
      redo: () => {
        marker.value = 'light-redo'
      },
    })

    coreStore.setState(state => ({ ...state, isDarkMode: true }))
    // Subscriber automatically syncs scope to 'v2::dark'.
    expect(historyStore.getState().canUndo).toBe(false)

    historyActions.addUndoRedoAction({
      undo: () => {
        marker.value = 'dark-undo'
      },
      redo: () => {
        marker.value = 'dark-redo'
      },
    })

    expect(historyActions.undo()).toBe(true)
    expect(marker.value).toBe('dark-undo')

    coreStore.setState(state => ({ ...state, isDarkMode: false }))
    // Subscriber automatically syncs scope back to 'v2::light'.
    expect(historyActions.undo()).toBe(true)
    expect(marker.value).toBe('light-undo')
  })

  it('makes theme-scoped actions undoable from either light or dark mode', () => {
    const marker = { value: '' }

    historyActions.addUndoRedoAction({
      undo: () => {
        marker.value = 'shared-undo'
      },
      redo: () => {
        marker.value = 'shared-redo'
      },
      scope: 'theme',
    })

    coreStore.setState(state => ({ ...state, isDarkMode: true }))

    expect(historyStore.getState().canUndo).toBe(true)
    expect(historyActions.undo()).toBe(true)
    expect(marker.value).toBe('shared-undo')
    expect(historyActions.redo()).toBe(true)
    expect(marker.value).toBe('shared-redo')
  })
})
