import { useEffect, useState } from 'react'
import { usePresetState } from '../../editor/hooks/use-editor'
import { THEME_MESSAGES_EN_PATH, themeLoginPath } from '../../keycloak-theme/paths'
import { resolveThemeIdFromConfig, useThemeConfig } from '../../presets/queries'
import { readMessageProperty } from '../lib/message-properties'

interface PreviewMessageOverrides {
  noAccount?: string
  doRegister?: string
}

interface UsePreviewMessagesParams {
  reloadVersion?: number
}

export function usePreviewMessages(params: UsePreviewMessagesParams = {}): PreviewMessageOverrides {
  const { reloadVersion = 0 } = params
  const { selectedThemeId } = usePresetState()
  const themeConfig = useThemeConfig()
  const resolvedThemeId = resolveThemeIdFromConfig(themeConfig, selectedThemeId)

  const [messageOverrides, setMessageOverrides] = useState<PreviewMessageOverrides>({})

  useEffect(() => {
    let disposed = false
    const messagesPath = themeLoginPath(resolvedThemeId, THEME_MESSAGES_EN_PATH)

    fetch(messagesPath)
      .then(response => response.ok ? response.text() : '')
      .then((text) => {
        if (disposed) {
          return
        }
        setMessageOverrides({
          noAccount: readMessageProperty(text, 'noAccount'),
          doRegister: readMessageProperty(text, 'doRegister'),
        })
      })
      .catch(() => {
        if (!disposed) {
          setMessageOverrides({})
        }
      })

    return () => {
      disposed = true
    }
  }, [resolvedThemeId, reloadVersion])

  return messageOverrides
}
