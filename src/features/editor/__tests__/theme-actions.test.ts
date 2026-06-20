import type { KeycloakPage } from '../../assets/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { themeActions } from '../actions/theme-actions'
import { themeSelectionActions } from '../actions/theme-selection-actions'
import { coreStore } from '../stores/core-store'
import { presetStore } from '../stores/preset-store'
import { themeStore } from '../stores/theme-store'

vi.mock('../../presets/queries', () => ({
  getThemeConfigCached: vi.fn(async () => ({ themes: [] })),
  getThemeCssStructuredCached: vi.fn(async () => ({
    quickStartDefaults: '',
    stylesCss: '',
    stylesCssFiles: {},
  })),
  resolveThemeIdFromConfig: vi.fn((_config: unknown, id: string) => id),
}))

function resetStores() {
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
  presetStore.setState(state => ({
    ...state,
    selectedThemeId: 'v2',
    colorPresetPrimaryColor: '',
    colorPresetSecondaryColor: '',
    colorPresetBgColor: '',
    colorPresetFontFamily: 'custom',
    colorPresetHeadingFontFamily: 'custom',
  }))
}

describe('themeActions', () => {
  beforeEach(resetStores)

  it('setBaseCss updates baseCss', () => {
    themeActions.setBaseCss(':root {}')
    expect(themeStore.getState().baseCss).toBe(':root {}')
  })

  it('setActiveCssFilePath updates activeCssFilePath', () => {
    themeActions.setActiveCssFilePath('css/styles.css')
    expect(themeStore.getState().activeCssFilePath).toBe('css/styles.css')
  })

  it('setThemeQuickStartDefaults updates themeQuickStartDefaults', () => {
    themeActions.setThemeQuickStartDefaults(':root { --quickstart-primary-color-light: #000; }')
    expect(themeStore.getState().themeQuickStartDefaults).toBe(':root { --quickstart-primary-color-light: #000; }')
  })

  it('setPages updates pages', () => {
    const pages: KeycloakPage[] = [
      { id: 'login', name: 'Login', component: 'login.ftl' },
      { id: 'register', name: 'Register', component: 'register.ftl' },
    ]
    themeActions.setPages(pages)
    expect(themeStore.getState().pages).toEqual(pages)
  })

  describe('setActiveFileCss (regular file)', () => {
    beforeEach(() => {
      themeStore.setState(s => ({
        ...s,
        activeCssFilePath: 'css/styles.css',
        stylesCssFiles: { 'css/styles.css': '.old {}' },
        stylesCss: '.old {}',
      }))
    })

    it('updates the file content', () => {
      themeActions.setActiveFileCss('.new {}')
      expect(themeStore.getState().stylesCssFiles['css/styles.css']).toBe('.new {}')
    })

    it('updates combined stylesCss', () => {
      themeActions.setActiveFileCss('.new {}')
      expect(themeStore.getState().stylesCss).toBe('.new {}')
    })

    it('saves combined CSS under the active theme key', () => {
      themeActions.setActiveFileCss('.new {}')
      expect(themeStore.getState().stylesCssByTheme.v2).toBe('.new {}')
    })

    it('saves file map under the active theme key', () => {
      themeActions.setActiveFileCss('.new {}')
      expect(themeStore.getState().stylesCssFilesByTheme.v2?.['css/styles.css']).toBe('.new {}')
    })

    it('does not update state when CSS is unchanged', () => {
      themeStore.setState(s => ({ ...s, stylesCss: '.old {}' }))
      const before = themeStore.getState()
      themeActions.setActiveFileCss('.old {}')
      expect(themeStore.getState()).toBe(before)
    })
  })

  describe('setActiveFileCss (quick-start.css)', () => {
    const initialCss = ':root {}'
    const updatedCss = ':root { --quickstart-primary-color-light: #ff0000; }'

    beforeEach(() => {
      themeStore.setState(s => ({
        ...s,
        activeCssFilePath: 'css/quick-start.css',
        stylesCssFiles: { 'css/quick-start.css': initialCss },
        themeQuickStartDefaults: initialCss,
      }))
      coreStore.setState(s => ({ ...s, isDarkMode: false }))
    })

    it('updates themeQuickStartDefaults', () => {
      themeActions.setActiveFileCss(updatedCss)
      expect(themeStore.getState().themeQuickStartDefaults).toBe(updatedCss)
    })

    it('syncs CSS variables back to presetStore', () => {
      themeActions.setActiveFileCss(updatedCss)
      expect(presetStore.getState().colorPresetPrimaryColor).toBe('#ff0000')
    })

    it('saves updated file under active theme key', () => {
      themeActions.setActiveFileCss(updatedCss)
      expect(themeStore.getState().stylesCssFilesByTheme.v2?.['css/quick-start.css']).toBe(updatedCss)
    })

    it('does not set stylesCss for quick-start.css (it is excluded from combined output)', () => {
      themeActions.setActiveFileCss(updatedCss)
      expect(themeStore.getState().stylesCss).toBe('')
    })
  })
})

describe('themeSelectionActions.setThemeData', () => {
  beforeEach(resetStores)

  it('sets selectedThemeId in presetStore', () => {
    themeSelectionActions.setThemeData('v3', '.v3 {}')
    expect(presetStore.getState().selectedThemeId).toBe('v3')
  })

  it('sets presetCss in presetStore', () => {
    themeSelectionActions.setThemeData('v3', '.v3 {}')
    expect(presetStore.getState().presetCss).toBe('.v3 {}')
  })

  it('loads the new theme CSS into stylesCss', () => {
    themeSelectionActions.setThemeData('v3', '.v3 {}')
    expect(themeStore.getState().stylesCss).toBe('.v3 {}')
  })

  it('saves the previous theme CSS before switching', () => {
    themeStore.setState(s => ({
      ...s,
      stylesCss: '.v2 {}',
      stylesCssFiles: { 'css/styles.css': '.v2 {}' },
    }))
    themeSelectionActions.setThemeData('v3', '.v3 {}')
    expect(themeStore.getState().stylesCssByTheme.v2).toBe('.v2 {}')
  })

  it('restores previously saved CSS when switching back', () => {
    themeStore.setState(s => ({
      ...s,
      stylesCss: '.v2 {}',
      stylesCssFiles: { 'css/styles.css': '.v2 {}' },
    }))
    themeSelectionActions.setThemeData('v3', '.v3 {}')
    themeSelectionActions.setThemeData('v2', '.v2-fresh {}')
    // Restored v2 edits take priority over fresh CSS
    expect(themeStore.getState().stylesCss).toBe('.v2 {}')
  })

  it('uses provided themeFiles when given', () => {
    themeSelectionActions.setThemeData('v3', '.v3 {}', {
      'css/styles.css': '.v3-file {}',
    })
    expect(themeStore.getState().stylesCssFiles['css/styles.css']).toBe('.v3-file {}')
  })
})
