import type { CoreState } from './types'
import { getInitialDarkMode } from '../dark-mode'
import { createPersistedEditorStore } from './create-editor-store'

export const coreStore = createPersistedEditorStore<CoreState>({
  isDarkMode: getInitialDarkMode(),
  activePageId: 'login.html',
  activeStoryId: 'default',
  selectedNodeId: null,
  previewReady: false,
  deviceId: 'desktop',
}, {
  name: 'keycloak-editor-core',
  partialize: state => ({
    activePageId: state.activePageId,
    activeStoryId: state.activeStoryId,
    deviceId: state.deviceId,
  }),
})
