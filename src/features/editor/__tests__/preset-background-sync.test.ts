import { beforeEach, describe, expect, it, vi } from 'vitest'
import { presetActions } from '../actions'
import { buildQuickSettingsStorageKey } from '../lib/quick-settings'
import { assetStore } from '../stores/asset-store'
import { coreStore } from '../stores/core-store'
import { historyStore } from '../stores/history-store'
import { createDefaultPresetState, presetStore } from '../stores/preset-store'

vi.mock('../../presets/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../presets/queries')>()

  return {
    ...actual,
    getThemeConfigCached: vi.fn(async () => ({
      themes: [
        { id: 'base', defaultAssets: [] },
        {
          id: 'v2',
          defaultAssets: [
            {
              category: 'background',
              name: 'default-bg.png',
              path: 'img/default-bg.png',
            },
            {
              category: 'logo',
              name: 'default-logo.svg',
              path: 'img/default-logo.svg',
            },
          ],
        },
        { id: 'modern-card', defaultAssets: [] },
        { id: 'horizontal-card', defaultAssets: [] },
      ],
    })),
    getThemeCssStructuredCached: vi.fn(async (themeId: string) => {
      if (themeId === 'horizontal-card') {
        return {
          quickStartDefaults: `
:root {
  --quickstart-primary-color: #0b57d0;
  --quickstart-primary-color-dark: #a8c7fa;
  --quickstart-secondary-color: #9aa0a6;
  --quickstart-font-family: custom;
  --quickstart-bg-color: #f0f4f9;
  --quickstart-bg-color-dark: #1e1f20;
  --quickstart-card-shadow-default: none;
}
          `.trim(),
          stylesCss: '.kcFormCardClass { display: grid; }',
        }
      }

      return {
        quickStartDefaults: `
:root {
  --quickstart-primary-color: #0066cc;
  --quickstart-primary-color-dark: #0066cc;
  --quickstart-secondary-color: #c0c0c0;
  --quickstart-font-family: custom;
}
        `.trim(),
        stylesCss: '.pf-v5-c-login__main-header { border-top-color: var(--quickstart-primary-color); }',
      }
    }),
  }
})

function getModePrimaryColor(themeId: string, mode: 'light' | 'dark'): string | undefined {
  return presetStore.getState().presetQuickSettings[buildQuickSettingsStorageKey(themeId, mode)]?.colorPresetPrimaryColor
}

describe('preset background sync on preset selection', () => {
  beforeEach(() => {
    presetStore.setState(() => createDefaultPresetState())

    coreStore.setState(() => ({
      isDarkMode: false,
      activePageId: 'login.html',
      activeStoryId: 'default',
      selectedNodeId: null,
      previewReady: false,
      deviceId: 'desktop',
    }))

    historyStore.setState(() => ({
      activeScopeKey: 'v2::light',
      stacksByScope: {},
      undoStack: [],
      redoStack: [],
      canUndo: false,
      canRedo: false,
    }))

    assetStore.setState(() => ({
      uploadedAssets: [
        {
          id: 'default-bg',
          name: 'default-bg.png',
          category: 'background',
          mimeType: 'image/png',
          base64Data: '',
          size: 0,
          createdAt: 0,
          isDefault: true,
        },
        {
          id: 'default-logo',
          name: 'default-logo.svg',
          category: 'logo',
          mimeType: 'image/svg+xml',
          base64Data: '',
          size: 0,
          createdAt: 0,
          isDefault: true,
        },
      ],
      appliedAssets: {
        background: 'default-bg',
        logo: 'default-logo',
      },
      appliedAssetsByTheme: {
        v2: {
          background: 'default-bg',
          logo: 'default-logo',
        },
      },
    }))
  })

  it('defaults the root preset state to v2 with realm name hidden', () => {
    expect(createDefaultPresetState().selectedThemeId).toBe('v2')
    expect(createDefaultPresetState().showRealmName).toBe(false)
  })

  it('disables default background when selecting a non-v2 theme', async () => {
    await presetActions.applyThemeSelection('horizontal-card')

    expect(presetStore.getState().selectedThemeId).toBe('horizontal-card')
    expect(assetStore.getState().appliedAssets.background).toBeUndefined()
    expect(assetStore.getState().appliedAssets.logo).toBeUndefined()
  })

  it('uses horizontal-card dark defaults when no saved dark settings exist', async () => {
    coreStore.setState(state => ({ ...state, isDarkMode: true }))
    presetStore.setState(state => ({
      ...state,
      presetQuickSettings: {},
    }))

    await presetActions.applyThemeSelection('horizontal-card')

    expect(getModePrimaryColor('horizontal-card', 'dark')).toBe('#a8c7fa')
    expect(assetStore.getState().appliedAssets.background).toBeUndefined()
  })

  it('restores shared quick-start settings from the selected theme snapshot', async () => {
    presetStore.setState(state => ({
      ...state,
      colorPresetFontFamily: 'current-font',
      colorPresetBorderRadius: 'sharp',
      colorPresetCardShadow: 'subtle',
      infoMessage: 'current-info',
      presetQuickSettings: {
        ...state.presetQuickSettings,
        [buildQuickSettingsStorageKey('horizontal-card', 'light')]: {
          colorPresetId: 'custom',
          colorPresetPrimaryColor: '#123456',
          colorPresetSecondaryColor: '#abcdef',
          colorPresetFontFamily: 'restored-font',
          colorPresetBgColor: '#f0f4f9',
          colorPresetBorderRadius: 'pill',
          colorPresetCardShadow: 'strong',
          colorPresetHeadingFontFamily: 'restored-heading',
          showClientName: true,
          showRealmName: false,
          infoMessage: 'restored-info',
          imprintUrl: 'https://example.com/imprint',
          dataProtectionUrl: 'https://example.com/privacy',
        },
      },
    }))

    await presetActions.applyThemeSelection('horizontal-card')

    expect(presetStore.getState().colorPresetFontFamily).toBe('restored-font')
    expect(presetStore.getState().colorPresetBorderRadius).toBe('pill')
    expect(presetStore.getState().colorPresetCardShadow).toBe('strong')
    expect(presetStore.getState().infoMessage).toBe('restored-info')
    expect(presetStore.getState().showClientName).toBe(true)
    expect(presetStore.getState().showRealmName).toBe(false)
  })

  it('keeps default background active when selecting v2', async () => {
    assetStore.setState(state => ({ ...state, appliedAssets: {} }))

    await presetActions.applyThemeSelection('v2')

    expect(presetStore.getState().selectedThemeId).toBe('v2')
    expect(assetStore.getState().appliedAssets.background).toBe('default-bg')
    expect(assetStore.getState().appliedAssets.logo).toBe('default-logo')
  })

  it('uses v2 defaults with realm name hidden when no snapshot exists', async () => {
    presetStore.setState(state => ({
      ...state,
      selectedThemeId: 'horizontal-card',
      showRealmName: true,
      presetQuickSettings: {},
    }))

    await presetActions.applyThemeSelection('v2')

    expect(presetStore.getState().showRealmName).toBe(false)
  })

  it('restores applied logos per theme instead of leaking them globally', async () => {
    assetStore.setState(() => ({
      uploadedAssets: [
        {
          id: 'imported-logo',
          name: 'imported-logo.svg',
          category: 'logo',
          mimeType: 'image/svg+xml',
          base64Data: '',
          size: 0,
          createdAt: 0,
          isDefault: false,
        },
      ],
      appliedAssets: {
        logo: 'imported-logo',
      },
      appliedAssetsByTheme: {
        v2: {
          logo: 'imported-logo',
        },
      },
    }))

    await presetActions.applyThemeSelection('horizontal-card')

    expect(assetStore.getState().appliedAssets.logo).toBeUndefined()

    await presetActions.applyThemeSelection('v2')

    expect(assetStore.getState().appliedAssets.logo).toBe('imported-logo')
  })

  it('clears persisted default background when current theme base is non-v2', async () => {
    presetStore.setState(state => ({ ...state, selectedThemeId: 'modern-card' }))

    await presetActions.syncBackgroundForCurrentTheme()

    expect(assetStore.getState().appliedAssets.background).toBeUndefined()
  })
})
