import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetActions } from '../actions/reset-actions'
import { assetStore } from '../stores/asset-store'
import { coreStore } from '../stores/core-store'
import { historyStore } from '../stores/history-store'
import { presetStore } from '../stores/preset-store'
import { themeStore } from '../stores/theme-store'
import { getThemeCssStructuredCached } from '../../presets/queries'

const MOCK_V2_THEME_CSS = ':root { --quickstart-primary-color: #0066cc; }'

vi.mock('../../presets/queries', () => ({
  getThemeCssStructuredCached: vi.fn(async () => ({
    quickStartDefaults: MOCK_V2_THEME_CSS,
    stylesCss: MOCK_V2_THEME_CSS,
  })),
}))

describe('reset actions', () => {
  beforeEach(() => {
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
          id: 'custom-bg',
          name: 'custom-bg.png',
          category: 'background',
          mimeType: 'image/png',
          base64Data: '',
          size: 0,
          createdAt: 0,
          isDefault: false,
        },
      ],
      appliedAssets: {
        background: 'custom-bg',
      },
    }))

    presetStore.setState(() => ({
      selectedThemeId: 'v2',
      presetCss: '.old-theme { color: red; }',
      colorPresetId: 'custom',
      colorPresetPrimaryColor: '#123456',
      colorPresetSecondaryColor: '#abcdef',
      colorPresetFontFamily: 'custom',
      colorPresetBgColor: '#f5f5f5',
      colorPresetBorderRadius: 'rounded',
      colorPresetCardShadow: 'strong',
      colorPresetHeadingFontFamily: 'custom',
      showClientName: true,
      showRealmName: false,
      infoMessage: 'old',
      imprintUrl: 'https://example.com/imprint',
      dataProtectionUrl: 'https://example.com/privacy',
      presetQuickSettings: {},
    }))

    themeStore.setState(() => ({
      baseCss: '',
      stylesCss: '.old-theme { color: red; }',
      stylesCssByTheme: {
        v2: '.old-theme { color: red; }',
      },
      themeQuickStartDefaults: '',
      pages: [],
    }))

    coreStore.setState(() => ({
      isDarkMode: true,
      activePageId: 'register.html',
      activeStoryId: 'error',
      selectedNodeId: 'body',
      previewReady: true,
      deviceId: 'mobile',
    }))

    historyStore.setState(() => ({
      activeScopeKey: 'v2::dark',
      stacksByScope: {},
      undoStack: [],
      redoStack: [],
      canUndo: false,
      canRedo: false,
    }))

    vi.clearAllMocks()
  })

  it('reloads v2 css when resetting while v2 is already selected', async () => {
    await resetActions.resetAll()

    expect(vi.mocked(getThemeCssStructuredCached)).toHaveBeenCalledWith('v2')
    expect(presetStore.state.selectedThemeId).toBe('v2')
    expect(presetStore.state.presetCss).toBe(MOCK_V2_THEME_CSS)
    expect(themeStore.state.stylesCss).toBe(MOCK_V2_THEME_CSS)
    expect(themeStore.state.stylesCssByTheme.v2).toBe(MOCK_V2_THEME_CSS)
    expect(assetStore.state.appliedAssets.background).toBe('default-bg')
  })
})
