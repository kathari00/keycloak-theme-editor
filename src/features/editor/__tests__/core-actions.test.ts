import { beforeEach, describe, expect, it } from 'vitest'
import { coreActions } from '../actions/core-actions'
import { DARK_MODE_STORAGE_KEY } from '../lib/storage-keys'
import { coreStore } from '../stores/core-store'
import { presetStore } from '../stores/preset-store'
import { themeStore } from '../stores/theme-store'

function resetStores() {
  localStorage.removeItem(DARK_MODE_STORAGE_KEY)
  coreStore.setState(() => ({
    isDarkMode: false,
    activePageId: 'login.html',
    activeStateId: 'default',
    selectedNodeId: null,
    previewReady: false,
    deviceId: 'desktop',
  }))
  themeStore.setState(() => ({
    baseCss: '',
    stylesCss: '',
    stylesCssByTheme: {},
    stylesCssFiles: {},
    stylesCssFilesByTheme: {},
    activeCssFilePath: '',
    themeQuickStartDefaults: '',
    pages: [],
  }))
  presetStore.setState(state => ({ ...state, selectedThemeId: 'v2' }))
}

describe('coreActions', () => {
  beforeEach(resetStores)

  it('setActivePage updates activePageId', () => {
    coreActions.setActivePage('register.html')
    expect(coreStore.getState().activePageId).toBe('register.html')
  })

  it('setActiveStateId updates activeStateId', () => {
    coreActions.setActiveStateId('error')
    expect(coreStore.getState().activeStateId).toBe('error')
  })

  describe('setSelectedNodeId', () => {
    it('sets a node id', () => {
      coreActions.setSelectedNodeId('node-123')
      expect(coreStore.getState().selectedNodeId).toBe('node-123')
    })

    it('accepts null to clear selection', () => {
      coreStore.setState({ selectedNodeId: 'node-123' })
      coreActions.setSelectedNodeId(null)
      expect(coreStore.getState().selectedNodeId).toBeNull()
    })
  })

  describe('setPreviewReady', () => {
    it('marks preview as ready', () => {
      coreActions.setPreviewReady(true)
      expect(coreStore.getState().previewReady).toBe(true)
    })

    it('marks preview as not ready', () => {
      coreStore.setState({ previewReady: true })
      coreActions.setPreviewReady(false)
      expect(coreStore.getState().previewReady).toBe(false)
    })
  })

  describe('setDeviceId', () => {
    it.each(['desktop', 'tablet', 'mobile'] as const)('sets deviceId to %s', (device) => {
      coreActions.setDeviceId(device)
      expect(coreStore.getState().deviceId).toBe(device)
    })
  })

  describe('toggleDarkMode', () => {
    it('switches isDarkMode from false to true', () => {
      coreActions.toggleDarkMode()
      expect(coreStore.getState().isDarkMode).toBe(true)
    })

    it('switches isDarkMode from true to false', () => {
      localStorage.setItem(DARK_MODE_STORAGE_KEY, 'dark')
      coreStore.setState({ isDarkMode: true })
      coreActions.toggleDarkMode()
      expect(coreStore.getState().isDarkMode).toBe(false)
    })

    it('persists dark to localStorage', () => {
      coreActions.toggleDarkMode()
      expect(localStorage.getItem(DARK_MODE_STORAGE_KEY)).toBe('dark')
    })

    it('persists light to localStorage after toggling back', () => {
      localStorage.setItem(DARK_MODE_STORAGE_KEY, 'dark')
      coreActions.toggleDarkMode()
      expect(localStorage.getItem(DARK_MODE_STORAGE_KEY)).toBe('light')
    })
  })
})
