import { useEffect, useState } from 'react'
import { usePresetState } from '../../editor/hooks/use-editor'
import { DEFAULT_LOCALE_TAG } from '../../i18n/locale-catalog'
import { THEME_MESSAGES_EN_PATH, themeLoginPath, themeMessagesLocalePath } from '../../keycloak-theme/paths'
import { resolveThemeIdFromConfig, useThemeConfig } from '../../presets/queries'
import { readMessageProperty } from '../lib/message-properties'

interface PreviewMessageOverrides {
  noAccount?: string
  doRegister?: string
}

interface UsePreviewMessagesParams {
  reloadVersion?: number
  localeTag?: string
}

async function fetchMessagesText(path: string): Promise<string> {
  const response = await fetch(path)
  return response.ok ? await response.text() : ''
}

export function usePreviewMessages(params: UsePreviewMessagesParams = {}): PreviewMessageOverrides {
  const { reloadVersion = 0, localeTag = DEFAULT_LOCALE_TAG } = params
  const { selectedThemeId } = usePresetState()
  const themeConfig = useThemeConfig()
  const resolvedThemeId = resolveThemeIdFromConfig(themeConfig, selectedThemeId)

  const [messageOverrides, setMessageOverrides] = useState<PreviewMessageOverrides>({})

  useEffect(() => {
    let disposed = false

    // A theme only ships a bundle for a language it actually customises, so an
    // absent one falls back to the base language rather than clearing the text.
    const load = async () => {
      const localeText = localeTag === DEFAULT_LOCALE_TAG
        ? ''
        : await fetchMessagesText(themeLoginPath(resolvedThemeId, themeMessagesLocalePath(localeTag)))
      const text = localeText
        || await fetchMessagesText(themeLoginPath(resolvedThemeId, THEME_MESSAGES_EN_PATH))

      if (!disposed) {
        setMessageOverrides({
          noAccount: readMessageProperty(text, 'noAccount'),
          doRegister: readMessageProperty(text, 'doRegister'),
        })
      }
    }

    load().catch(() => {
      if (!disposed) {
        setMessageOverrides({})
      }
    })

    return () => {
      disposed = true
    }
  }, [resolvedThemeId, reloadVersion, localeTag])

  return messageOverrides
}
