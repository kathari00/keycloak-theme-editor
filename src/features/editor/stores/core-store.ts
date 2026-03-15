import type { CoreState } from './types'
import { getInitialDarkMode } from '../lib/dark-mode'
import { CORE_STORE_STORAGE_KEY } from '../lib/storage-keys'
import { createPersistedEditorStore } from './create-editor-store'

export const coreStore = createPersistedEditorStore<CoreState>({
  isDarkMode: getInitialDarkMode(),
  activePageId: 'login.html',
  activeStateId: 'default',
  selectedNodeId: null,
  previewReady: false,
  deviceId: 'desktop',
}, {
  name: CORE_STORE_STORAGE_KEY,
  partialize: state => ({
    activePageId: state.activePageId,
    activeStateId: state.activeStateId,
    deviceId: state.deviceId,
  }),
})
