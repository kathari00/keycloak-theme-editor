import type { AssetCategory, UploadedAsset } from './types'

// File type validation
const ALLOWED_FONT_TYPES = [
  'font/woff',
  'font/woff2',
  'font/ttf',
  'font/otf',
  'application/x-font-woff',
  'application/font-woff',
  'application/font-woff2',
  'application/x-font-ttf',
  'application/x-font-otf',
]

const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/svg+xml',
  'image/webp',
  'image/gif',
  'image/x-icon',
  'image/vnd.microsoft.icon',
]

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

function generateAssetId(): string {
  return `asset-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

export function validateAssetFile(file: File, category: AssetCategory): string | null {
  // Size validation
  if (file.size > MAX_FILE_SIZE) {
    return `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`
  }

  // Type validation
  if (category === 'font') {
    const isValidFont
      = ALLOWED_FONT_TYPES.includes(file.type)
        || /\.(?:woff2?|ttf|otf)$/i.test(file.name)
    if (!isValidFont) {
      return 'Invalid font file type. Allowed: WOFF, WOFF2, TTF, OTF'
    }
  }
  else {
    const isValidImage
      = ALLOWED_IMAGE_TYPES.includes(file.type)
        || /\.(?:png|jpe?g|svg|webp|gif|ico)$/i.test(file.name)
    if (!isValidImage) {
      return 'Invalid image file type. Allowed: PNG, JPG, SVG, WebP, GIF, ICO'
    }
  }

  return null
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove data URL prefix to store just the base64
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function getImageDimensions(
  file: File,
): Promise<{ width: number, height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.width, height: img.height })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

function deriveFontFamilyFromFilename(filename: string): string {
  // Remove extension and clean up
  const name = filename.replace(/\.(woff2?|ttf|otf)$/i, '')
  // Convert to title case and replace separators
  return name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export async function processUploadedFile(
  file: File,
  category: AssetCategory,
): Promise<UploadedAsset> {
  const base64Data = await fileToBase64(file)

  const asset: UploadedAsset = {
    id: generateAssetId(),
    name: file.name,
    category,
    mimeType: file.type || getMimeTypeFromExtension(file.name),
    base64Data,
    size: file.size,
    createdAt: Date.now(),
  }

  // Add font-specific metadata
  if (category === 'font') {
    asset.fontFamily = deriveFontFamilyFromFilename(file.name)
    asset.fontWeight = '400'
    asset.fontStyle = 'normal'
  }

  // Add image dimensions
  if (category === 'background' || category === 'logo' || category === 'favicon' || category === 'image') {
    try {
      const dimensions = await getImageDimensions(file)
      asset.width = dimensions.width
      asset.height = dimensions.height
    }
    catch {
      // Dimensions optional, continue without them
    }
  }

  return asset
}

function getMimeTypeFromExtension(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop()
  const mimeTypes: Record<string, string> = {
    woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
    otf: 'font/otf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    gif: 'image/gif',
    ico: 'image/x-icon',
  }
  return mimeTypes[ext || ''] || 'application/octet-stream'
}
