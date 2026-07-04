import type { UploadedAsset } from '../../features/assets/types'
import type { ThemeConfig } from '../../features/presets/types'
import { useEffect, useRef, useState } from 'react'
import { editorActions } from '../../features/editor/actions'
import { assetStore } from '../../features/editor/stores/asset-store'
import { coreStore } from '../../features/editor/stores/core-store'
import { themeLoginResourcePath } from '../../features/keycloak-theme/paths'
import { getThemeCssStructuredCached } from '../../features/presets/queries'

async function blobToBase64(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read blob'))
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      const commaIndex = result.indexOf(',')
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result)
    }
    reader.readAsDataURL(blob)
  })
}

export function useInitialThemeBootstrap(params: {
  resolvedThemeId: string
  themeConfig: ThemeConfig
}): boolean {
  const { resolvedThemeId, themeConfig } = params
  const [initialBootstrapReady, setInitialBootstrapReady] = useState(false)
  const bootstrapRequestIdRef = useRef(0)

  useEffect(() => {
    let cancelled = false
    const requestId = bootstrapRequestIdRef.current + 1
    bootstrapRequestIdRef.current = requestId

    const isCurrentRequest = () => !cancelled && bootstrapRequestIdRef.current === requestId

    const initializeThemeData = async () => {
      try {
        const { quickStartDefaults, stylesCss, stylesCssFiles } = await getThemeCssStructuredCached(resolvedThemeId)
        if (!isCurrentRequest()) {
          return
        }

        editorActions.applyThemeCssData({
          themeId: resolvedThemeId,
          stylesCss,
          stylesCssFiles,
          quickStartDefaults,
          baseCss: stylesCss,
          quickSettingsMode: coreStore.getState().isDarkMode ? 'dark' : 'light',
        })
        editorActions.applyThemeContentDefaults(themeConfig, resolvedThemeId)
      }
      catch {
        if (!isCurrentRequest()) {
          return
        }

        editorActions.applyThemeCssData({
          themeId: resolvedThemeId,
          stylesCss: '',
          quickStartDefaults: '',
          baseCss: '',
        })
        editorActions.applyThemeContentDefaults(themeConfig, resolvedThemeId)
      }

      if (!isCurrentRequest()) {
        return
      }

      try {
        const selectedTheme = themeConfig.themes.find(theme => theme.id === resolvedThemeId)
        const defaults = selectedTheme?.defaultAssets || []

        const managedDefaultPrefix = '__default__:'
        const preservedAssets = assetStore.getState().uploadedAssets.filter(
          asset => !asset.id.startsWith(managedDefaultPrefix),
        )
        if (defaults.length === 0) {
          if (!isCurrentRequest()) {
            return
          }

          editorActions.setUploadedAssets(preservedAssets)
        }
        else {
          const hasExistingDefaultAsset = (category: UploadedAsset['category'], name: string) =>
            preservedAssets.some(asset =>
              asset.category === category && asset.name.toLowerCase() === name.toLowerCase(),
            )
          const rebuiltDefaultAssets: UploadedAsset[] = []
          const now = Date.now()

          for (const item of defaults) {
            if (!isCurrentRequest()) {
              return
            }

            if (hasExistingDefaultAsset(item.category, item.name)) {
              continue
            }

            const res = await fetch(themeLoginResourcePath(resolvedThemeId, item.path))
            if (!isCurrentRequest()) {
              return
            }
            if (!res.ok) {
              continue
            }

            const blob = await res.blob()
            if (!isCurrentRequest()) {
              return
            }

            const base64Data = await blobToBase64(blob)
            if (!isCurrentRequest()) {
              return
            }

            rebuiltDefaultAssets.push({
              id: `${managedDefaultPrefix}${resolvedThemeId}:${item.category}:${item.name}`,
              name: item.name,
              category: item.category,
              mimeType: blob.type || 'image/svg+xml',
              base64Data,
              size: blob.size,
              createdAt: now,
              isDefault: true,
            })
          }

          if (!isCurrentRequest()) {
            return
          }

          editorActions.setUploadedAssets([
            ...preservedAssets,
            ...rebuiltDefaultAssets,
          ])
        }
      }
      catch {
        if (!isCurrentRequest()) {
          return
        }
      }

      if (!isCurrentRequest()) {
        return
      }

      await editorActions.syncBackgroundForCurrentTheme().catch(() => {})
      if (!isCurrentRequest()) {
        return
      }

      setInitialBootstrapReady(true)
    }

    void initializeThemeData()

    return () => {
      cancelled = true
    }
  }, [resolvedThemeId, themeConfig])

  return initialBootstrapReady
}
