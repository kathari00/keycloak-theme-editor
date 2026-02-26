import type { StoreApi } from 'zustand/vanilla'
import { createStore } from 'zustand/vanilla'
import { createJSONStorage, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

export interface PersistedEditorStoreOptions<T extends object> {
  name: string
  partialize?: (state: T) => Partial<T>
  version?: number
  migrate?: (persistedState: unknown, version: number) => T | Partial<T> | Promise<T | Partial<T>>
}

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  }
  catch {
    return null
  }
}

export function createEditorStore<T extends object>(initialState: T): StoreApi<T> {
  return createStore<T>()(immer(() => initialState))
}

export function createPersistedEditorStore<T extends object>(
  initialState: T,
  options: PersistedEditorStoreOptions<T>,
): StoreApi<T> {
  const localStorage = getLocalStorage()
  if (!localStorage) {
    return createEditorStore(initialState)
  }

  return createStore<T>()(
    persist(
      immer(() => initialState),
      {
        name: options.name,
        version: options.version,
        migrate: options.migrate,
        storage: createJSONStorage(() => localStorage),
        partialize: options.partialize,
      },
    ),
  )
}
