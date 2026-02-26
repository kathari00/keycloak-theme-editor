import { beforeEach, describe, expect, it, vi } from 'vitest'
import { REMOVED_ASSET_ID } from '../../assets/types'
import { presetActions } from '../actions/preset-actions'
import { buildQuickSettingsStorageKey } from '../quick-settings'
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
        { id: 'base', baseId: 'base' },
        { id: 'v2', baseId: 'v2' },
        { id: 'modern-gradient', baseId: 'base' },
        { id: 'horizontal-card', baseId: 'base' },
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
  return presetStore.getState().quickSettingsByThemeMode[buildQuickSettingsStorageKey(themeId, mode)]?.colorPresetPrimaryColor
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
      ],
      appliedAssets: {
        background: 'default-bg',
      },
    }))
  })

  it('disables default background when selecting a non-v2 theme', async () => {
    await presetActions.applyThemeSelection('horizontal-card')

    expect(presetStore.getState().selectedThemeId).toBe('horizontal-card')
    expect(assetStore.getState().appliedAssets.background).toBe(REMOVED_ASSET_ID)
  })

  it('uses horizontal-card dark defaults when no saved dark settings exist', async () => {
    coreStore.setState(state => ({ ...state, isDarkMode: true }))
    presetStore.setState(state => ({
      ...state,
      quickSettingsByThemeMode: {},
    }))

    await presetActions.applyThemeSelection('horizontal-card')

    expect(getModePrimaryColor('horizontal-card', 'dark')).toBe('#a8c7fa')
    expect(assetStore.getState().appliedAssets.background).toBe(REMOVED_ASSET_ID)
  })

  it('keeps default background active when selecting v2', async () => {
    assetStore.setState(state => ({ ...state, appliedAssets: {} }))

    await presetActions.applyThemeSelection('v2')

    expect(presetStore.getState().selectedThemeId).toBe('v2')
    expect(assetStore.getState().appliedAssets.background).toBe('default-bg')
  })

  it('clears persisted default background when current theme base is non-v2', async () => {
    presetStore.setState(state => ({ ...state, selectedThemeId: 'modern-gradient' }))

    await presetActions.syncBackgroundForCurrentTheme()

    expect(assetStore.getState().appliedAssets.background).toBe(REMOVED_ASSET_ID)
  })
})

