import type { ThemeDefaultAsset, ThemeId } from '../presets/types'
import { themeLoginResourcePath } from '../keycloak-theme/paths'

export async function fetchDefaultAssetBlobs(
  themeId: ThemeId,
  defaultAssets: readonly ThemeDefaultAsset[],
): Promise<Record<string, Blob> | undefined> {
  if (defaultAssets.length === 0) {
    return undefined
  }

  const entries = await Promise.all(
    defaultAssets.map(async (asset) => {
      const response = await fetch(themeLoginResourcePath(themeId, asset.path))
      return [asset.path, await response.blob()] as const
    }),
  )

  return Object.fromEntries(entries)
}
