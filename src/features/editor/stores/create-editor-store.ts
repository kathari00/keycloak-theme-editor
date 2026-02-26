import type { StoreApi } from 'zustand/vanilla'
import { createJSONStorage, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { createStore } from 'zustand/vanilla'

export interface EditorStore<T extends object> extends StoreApi<T> {
  readonly state: T
}

export interface PersistedEditorStoreOptions<T extends object> {
  name: string
  partialize?: (state: T) => Partial<T>
  version?: number
  migrate?: (persistedState: unknown, version: number) => T | Partial<T> | Promise<T | Partial<T>>
}

function withStateGetter<T extends object>(store: StoreApi<T>): EditorStore<T> {
  const enhancedStore = store as EditorStore<T>
  Object.defineProperty(enhancedStore, 'state', {
    configurable: false,
    enumerable: false,
    get: () => store.getState(),
  })
  return enhancedStore
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

export function createEditorStore<T extends object>(initialState: T): EditorStore<T> {
  return withStateGetter(createStore<T>()(immer(() => initialState)) as unknown as StoreApi<T>)
}

export function createPersistedEditorStore<T extends object>(
  initialState: T,
  options: PersistedEditorStoreOptions<T>,
): EditorStore<T> {
  const localStorage = getLocalStorage()
  if (!localStorage) {
    return createEditorStore(initialState)
  }

  return withStateGetter(
    createStore<T>()(
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
    ) as unknown as StoreApi<T>,
  )
}
