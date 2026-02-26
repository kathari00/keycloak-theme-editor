import { beforeEach, describe, expect, it } from 'vitest'
import { historyActions } from '../actions/history-actions'
import { coreStore } from '../stores/core-store'
import { historyStore } from '../stores/history-store'
import { presetStore } from '../stores/preset-store'

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
  historyActions.syncActiveScopeFromEditor()
}

describe('historyActions coalescing', () => {
  beforeEach(() => {
    resetHistoryStore()
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
    historyActions.syncActiveScopeFromEditor()
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
    historyActions.syncActiveScopeFromEditor()
    expect(historyActions.undo()).toBe(true)
    expect(marker.value).toBe('light-undo')
  })
})

