import type { CoreState } from './types'
import { getInitialDarkMode } from '../dark-mode'
import { createPersistedEditorStore } from './create-editor-store'
import { CORE_STORE_STORAGE_KEY } from '../storage-keys'

export const coreStore = createPersistedEditorStore<CoreState>({
  isDarkMode: getInitialDarkMode(),
  activePageId: 'login.html',
  activeStoryId: 'default',
  selectedNodeId: null,
  previewReady: false,
  deviceId: 'desktop',
}, {
  name: CORE_STORE_STORAGE_KEY,
  partialize: state => ({
    activePageId: state.activePageId,
    activeStoryId: state.activeStoryId,
    deviceId: state.deviceId,
  }),
})
