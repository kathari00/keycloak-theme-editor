import type { LocalizedContentOverrides, QuickStartContentByLocale } from '../stores/types'
import { DEFAULT_LOCALE_TAG, isCuratedLocale } from '../../i18n/locale-catalog'
import { coreStore } from '../stores/core-store'
import { presetStore } from '../stores/preset-store'
import { historyActions } from './history-actions'

function normalizeEnabledLocales(tags: string[]): string[] {
  return [...new Set(tags.filter(tag => isCuratedLocale(tag) && tag !== DEFAULT_LOCALE_TAG))]
}

function sameLocaleList(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((tag, index) => tag === b[index])
}

function applyLocalizationState(next: {
  enabledLocales: string[]
  quickStartContentByLocale: QuickStartContentByLocale
}): void {
  presetStore.setState(next)

  const { previewLocaleTag } = coreStore.getState()
  if (previewLocaleTag !== DEFAULT_LOCALE_TAG && !next.enabledLocales.includes(previewLocaleTag)) {
    coreStore.setState({ previewLocaleTag: DEFAULT_LOCALE_TAG })
  }
}

export const localizationActions = {
  setEnabledLocales: (tags: string[], options?: { recordHistory?: boolean }) => {
    const previous = presetStore.getState()
    const enabledLocales = normalizeEnabledLocales(tags)
    if (sameLocaleList(previous.enabledLocales, enabledLocales)) {
      return
    }

    const nextState = {
      enabledLocales,
      quickStartContentByLocale: previous.quickStartContentByLocale,
    }
    const previousState = {
      enabledLocales: previous.enabledLocales,
      quickStartContentByLocale: previous.quickStartContentByLocale,
    }

    if (options?.recordHistory !== false) {
      historyActions.addUndoRedoAction({
        undo: () => applyLocalizationState(previousState),
        redo: () => applyLocalizationState(nextState),
        scope: 'theme',
      })
    }

    applyLocalizationState(nextState)
  },

  setLocalizedContent: (
    localeTag: string,
    update: LocalizedContentOverrides,
    options?: { recordHistory?: boolean },
  ) => {
    if (localeTag !== DEFAULT_LOCALE_TAG && !isCuratedLocale(localeTag)) {
      return
    }

    const previous = presetStore.getState()
    const previousOverrides = previous.quickStartContentByLocale[localeTag] ?? {}
    const nextOverrides: LocalizedContentOverrides = { ...previousOverrides, ...update }

    if (JSON.stringify(previousOverrides) === JSON.stringify(nextOverrides)) {
      return
    }

    const previousState = {
      enabledLocales: previous.enabledLocales,
      quickStartContentByLocale: previous.quickStartContentByLocale,
    }
    const nextState = {
      enabledLocales: previous.enabledLocales,
      quickStartContentByLocale: {
        ...previous.quickStartContentByLocale,
        [localeTag]: nextOverrides,
      },
    }

    if (options?.recordHistory !== false) {
      historyActions.addUndoRedoAction({
        undo: () => applyLocalizationState(previousState),
        redo: () => applyLocalizationState(nextState),
        scope: 'theme',
        coalesceKey: `localized-content:${localeTag}:${Object.keys(update).join(',')}`,
      })
    }

    applyLocalizationState(nextState)
  },

  applyImportedLocalization: (
    enabledLocales?: string[],
    quickStartContentByLocale?: QuickStartContentByLocale,
  ) => {
    if (!enabledLocales && !quickStartContentByLocale) {
      return
    }

    applyLocalizationState({
      enabledLocales: normalizeEnabledLocales(enabledLocales ?? []),
      quickStartContentByLocale: quickStartContentByLocale ?? {},
    })
  },
}
