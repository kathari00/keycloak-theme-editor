import type { AssetState } from './types'
import { createPersistedEditorStore } from './create-editor-store'
import { ASSET_STORE_STORAGE_KEY } from '../storage-keys'

/**
 * Asset Store - Manages uploaded and applied theme assets
 *
 * This store handles:
 * - User-uploaded assets (backgrounds, logos, fonts, favicons)
 * - Applied asset assignments to theme targets
 *
 * Persist only applied asset ids. Uploaded assets are intentionally not
 * persisted because they may contain large base64 payloads.
 */
export const assetStore = createPersistedEditorStore<AssetState>({
  uploadedAssets: [],
  appliedAssets: {},
}, {
  name: ASSET_STORE_STORAGE_KEY,
  version: 1,
  partialize: state => ({
    appliedAssets: state.appliedAssets,
  }),
})
