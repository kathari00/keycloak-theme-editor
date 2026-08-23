import { useEffect, useState } from 'react'
import { DEFAULT_LOCALE_TAG } from '../../i18n/locale-catalog'
import { ensureLocalePreviewPagesLoaded } from '../load-generated'

/**
 * Loads the pre-rendered pages for a language on demand and reports which
 * language the preview can actually show. Until the requested one is in memory
 * - or if it was never generated - callers fall back to the base language
 * rather than rendering an empty frame.
 */
export function usePreviewLocalePages(localeTag: string): string {
  const [loadedLocaleTag, setLoadedLocaleTag] = useState(DEFAULT_LOCALE_TAG)

  useEffect(() => {
    let cancelled = false

    void ensureLocalePreviewPagesLoaded(localeTag).then(() => {
      if (!cancelled) {
        setLoadedLocaleTag(localeTag)
      }
    })

    return () => {
      cancelled = true
    }
  }, [localeTag])

  return loadedLocaleTag === localeTag ? localeTag : DEFAULT_LOCALE_TAG
}
