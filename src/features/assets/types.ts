// Asset management types
export interface KeycloakPage {
  id: string
  name: string
  component: string
}

// Uploaded asset types
export type AssetCategory = 'font' | 'background' | 'logo' | 'favicon' | 'image'

export const REMOVED_ASSET_ID = '__removed__'

export interface UploadedAsset {
  id: string
  name: string
  category: AssetCategory
  mimeType: string
  base64Data: string
  size: number
  createdAt: number
  isDefault?: boolean
  // Font metadata
  fontFamily?: string
  fontWeight?: string
  fontStyle?: string
  // Image metadata
  width?: number
  height?: number
}

// Theme variable targets for applying assets
export type ThemeAssetTarget
  = | 'background' // --keycloak-bg-logo-url
    | 'logo' // --keycloak-logo-url
    | 'bodyFont' // body font-family
    | 'favicon' // <link rel="icon">

// Mapping of which asset is applied to which theme target
export interface AppliedAssets {
  background?: string // asset ID
  logo?: string // asset ID
  bodyFont?: string // asset ID or google:{family}
  favicon?: string // asset ID
}
