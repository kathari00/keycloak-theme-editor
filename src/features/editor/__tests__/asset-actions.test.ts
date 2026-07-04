import type { UploadedAsset } from '../../assets/types'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { assetActions } from '../actions/asset-actions'
import { historyActions, subscribeToScopeChanges } from '../actions/history-actions'
import { assetStore } from '../stores/asset-store'
import { historyStore } from '../stores/history-store'
import { presetStore } from '../stores/preset-store'

function makeAsset(overrides: Partial<UploadedAsset> = {}): UploadedAsset {
  return {
    id: 'asset-1',
    name: 'test.png',
    category: 'image',
    mimeType: 'image/png',
    base64Data: 'abc123',
    size: 100,
    createdAt: 0,
    ...overrides,
  }
}

function resetStores() {
  assetStore.setState(() => ({
    uploadedAssets: [],
    appliedAssets: {},
    appliedAssetsByTheme: {},
  }))
  historyStore.setState(() => ({
    activeScopeKey: 'v2::light',
    stacksByScope: {},
    undoStack: [],
    redoStack: [],
    canUndo: false,
    canRedo: false,
    revision: 0,
  }))
  presetStore.setState(state => ({ ...state, selectedThemeId: 'v2' }))
}

describe('assetActions', () => {
  let unsubscribe: () => void

  beforeEach(() => {
    unsubscribe = subscribeToScopeChanges()
    resetStores()
  })

  afterEach(() => {
    unsubscribe?.()
  })

  describe('addUploadedAsset', () => {
    it('appends to uploadedAssets for multi-asset category (image)', () => {
      assetActions.addUploadedAsset(makeAsset({ id: 'a', category: 'image' }))
      assetActions.addUploadedAsset(makeAsset({ id: 'b', category: 'image' }))
      expect(assetStore.getState().uploadedAssets).toHaveLength(2)
    })

    it('appends to uploadedAssets for multi-asset category (font)', () => {
      assetActions.addUploadedAsset(makeAsset({ id: 'a', category: 'font' }))
      assetActions.addUploadedAsset(makeAsset({ id: 'b', category: 'font' }))
      expect(assetStore.getState().uploadedAssets).toHaveLength(2)
    })

    it('replaces non-default asset for single-asset category (background)', () => {
      assetActions.addUploadedAsset(makeAsset({ id: 'old', category: 'background' }))
      assetActions.addUploadedAsset(makeAsset({ id: 'new', category: 'background' }))
      const ids = assetStore.getState().uploadedAssets.map(a => a.id)
      expect(ids).toEqual(['new'])
    })

    it('keeps default asset when uploading replacement for single-asset category', () => {
      assetStore.setState(s => ({
        ...s,
        uploadedAssets: [makeAsset({ id: 'default-bg', category: 'background', isDefault: true })],
      }))
      assetActions.addUploadedAsset(makeAsset({ id: 'custom', category: 'background' }))
      const ids = assetStore.getState().uploadedAssets.map(a => a.id)
      expect(ids).toContain('default-bg')
      expect(ids).toContain('custom')
    })

    it('auto-applies background asset', () => {
      assetActions.addUploadedAsset(makeAsset({ id: 'bg1', category: 'background' }))
      expect(assetStore.getState().appliedAssets.background).toBe('bg1')
    })

    it('auto-applies logo asset', () => {
      assetActions.addUploadedAsset(makeAsset({ id: 'logo1', category: 'logo' }))
      expect(assetStore.getState().appliedAssets.logo).toBe('logo1')
    })

    it('auto-applies favicon asset', () => {
      assetActions.addUploadedAsset(makeAsset({ id: 'fav1', category: 'favicon' }))
      expect(assetStore.getState().appliedAssets.favicon).toBe('fav1')
    })

    it('does not auto-apply font or image category', () => {
      assetActions.addUploadedAsset(makeAsset({ id: 'f1', category: 'font' }))
      assetActions.addUploadedAsset(makeAsset({ id: 'i1', category: 'image' }))
      expect(assetStore.getState().appliedAssets.bodyFont).toBeUndefined()
    })

    it('stores applied asset scoped to active theme', () => {
      assetActions.addUploadedAsset(makeAsset({ id: 'bg1', category: 'background' }))
      expect(assetStore.getState().appliedAssetsByTheme.v2?.background).toBe('bg1')
    })

    it('registers undo action', () => {
      assetActions.addUploadedAsset(makeAsset())
      expect(historyStore.getState().undoStack).toHaveLength(1)
    })

    it('undo removes added asset', () => {
      assetActions.addUploadedAsset(makeAsset({ id: 'a' }))
      historyActions.undo()
      expect(assetStore.getState().uploadedAssets).toHaveLength(0)
    })

    it('undo restores previous appliedAssets', () => {
      assetStore.setState(s => ({ ...s, appliedAssets: { logo: 'existing' } }))
      assetActions.addUploadedAsset(makeAsset({ id: 'bg1', category: 'background' }))
      historyActions.undo()
      expect(assetStore.getState().appliedAssets.background).toBeUndefined()
      expect(assetStore.getState().appliedAssets.logo).toBe('existing')
    })
  })

  describe('removeUploadedAsset', () => {
    it('removes asset by id', () => {
      assetStore.setState(s => ({ ...s, uploadedAssets: [makeAsset({ id: 'a' })] }))
      assetActions.removeUploadedAsset('a')
      expect(assetStore.getState().uploadedAssets).toHaveLength(0)
    })

    it('does nothing for unknown id', () => {
      assetStore.setState(s => ({ ...s, uploadedAssets: [makeAsset({ id: 'a' })] }))
      assetActions.removeUploadedAsset('nonexistent')
      expect(assetStore.getState().uploadedAssets).toHaveLength(1)
      expect(historyStore.getState().undoStack).toHaveLength(0)
    })

    it('clears applied background when removing the applied background asset', () => {
      assetStore.setState(s => ({
        ...s,
        uploadedAssets: [makeAsset({ id: 'bg', category: 'background' })],
        appliedAssets: { background: 'bg' },
      }))
      assetActions.removeUploadedAsset('bg')
      expect(assetStore.getState().appliedAssets.background).toBeUndefined()
    })

    it('does not clear background when removing a non-applied background asset', () => {
      assetStore.setState(s => ({
        ...s,
        uploadedAssets: [
          makeAsset({ id: 'bg1', category: 'background' }),
          makeAsset({ id: 'bg2', category: 'background' }),
        ],
        appliedAssets: { background: 'bg1' },
      }))
      assetActions.removeUploadedAsset('bg2')
      expect(assetStore.getState().appliedAssets.background).toBe('bg1')
    })

    it('clears applied bodyFont when removing the applied font', () => {
      assetStore.setState(s => ({
        ...s,
        uploadedAssets: [makeAsset({ id: 'f1', category: 'font' })],
        appliedAssets: { bodyFont: 'f1' },
      }))
      assetActions.removeUploadedAsset('f1')
      expect(assetStore.getState().appliedAssets.bodyFont).toBeUndefined()
    })

    it('clears applied favicon when removing the applied favicon', () => {
      assetStore.setState(s => ({
        ...s,
        uploadedAssets: [makeAsset({ id: 'fav', category: 'favicon' })],
        appliedAssets: { favicon: 'fav' },
      }))
      assetActions.removeUploadedAsset('fav')
      expect(assetStore.getState().appliedAssets.favicon).toBeUndefined()
    })

    it('registers undo action', () => {
      assetStore.setState(s => ({ ...s, uploadedAssets: [makeAsset({ id: 'a' })] }))
      assetActions.removeUploadedAsset('a')
      expect(historyStore.getState().undoStack).toHaveLength(1)
    })

    it('undo restores removed asset', () => {
      const asset = makeAsset({ id: 'a' })
      assetStore.setState(s => ({ ...s, uploadedAssets: [asset] }))
      assetActions.removeUploadedAsset('a')
      historyActions.undo()
      expect(assetStore.getState().uploadedAssets[0].id).toBe('a')
    })

    it('undo restores cleared appliedAssets', () => {
      assetStore.setState(s => ({
        ...s,
        uploadedAssets: [makeAsset({ id: 'bg', category: 'background' })],
        appliedAssets: { background: 'bg' },
      }))
      assetActions.removeUploadedAsset('bg')
      historyActions.undo()
      expect(assetStore.getState().appliedAssets.background).toBe('bg')
    })
  })

  describe('applyAsset', () => {
    it('sets target in appliedAssets', () => {
      assetActions.applyAsset('logo', 'logo1')
      expect(assetStore.getState().appliedAssets.logo).toBe('logo1')
    })

    it('scopes applied asset to active theme', () => {
      assetActions.applyAsset('background', 'bg1')
      expect(assetStore.getState().appliedAssetsByTheme.v2?.background).toBe('bg1')
    })

    it('does nothing and skips history if asset already applied to target', () => {
      assetStore.setState(s => ({ ...s, appliedAssets: { logo: 'logo1' } }))
      assetActions.applyAsset('logo', 'logo1')
      expect(historyStore.getState().undoStack).toHaveLength(0)
    })

    it('registers undo action', () => {
      assetActions.applyAsset('logo', 'logo1')
      expect(historyStore.getState().undoStack).toHaveLength(1)
    })

    it('undo restores previous applied state', () => {
      assetStore.setState(s => ({ ...s, appliedAssets: { logo: 'old-logo' } }))
      assetActions.applyAsset('logo', 'new-logo')
      historyActions.undo()
      expect(assetStore.getState().appliedAssets.logo).toBe('old-logo')
    })

    it('redo re-applies after undo', () => {
      assetActions.applyAsset('logo', 'logo1')
      historyActions.undo()
      historyActions.redo()
      expect(assetStore.getState().appliedAssets.logo).toBe('logo1')
    })
  })

  describe('unapplyAsset', () => {
    it('removes target from appliedAssets', () => {
      assetStore.setState(s => ({ ...s, appliedAssets: { logo: 'logo1' } }))
      assetActions.unapplyAsset('logo')
      expect(assetStore.getState().appliedAssets.logo).toBeUndefined()
    })

    it('does nothing and skips history if target not applied', () => {
      assetActions.unapplyAsset('logo')
      expect(historyStore.getState().undoStack).toHaveLength(0)
    })

    it('registers undo action', () => {
      assetStore.setState(s => ({ ...s, appliedAssets: { logo: 'logo1' } }))
      assetActions.unapplyAsset('logo')
      expect(historyStore.getState().undoStack).toHaveLength(1)
    })

    it('undo restores unapplied asset', () => {
      assetStore.setState(s => ({ ...s, appliedAssets: { logo: 'logo1' } }))
      assetActions.unapplyAsset('logo')
      historyActions.undo()
      expect(assetStore.getState().appliedAssets.logo).toBe('logo1')
    })
  })
})
