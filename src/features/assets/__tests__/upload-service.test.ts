import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { processUploadedFile, validateAssetFile } from '../upload-service'

function makeFile(name: string, type: string, sizeBytes = 100): File {
  return new File(['x'.repeat(sizeBytes)], name, { type })
}

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:mock')
  URL.revokeObjectURL = vi.fn()

  vi.stubGlobal('Image', class {
    width = 100
    height = 50
    private _onload: (() => void) | null = null
    private _src = ''

    get onload() { return this._onload }
    set onload(fn: (() => void) | null) { this._onload = fn }

    get src() { return this._src }
    set src(value: string) {
      this._src = value
      setTimeout(() => this._onload?.(), 0)
    }
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('validateAssetFile', () => {
  describe('size limit', () => {
    it('rejects files over 5 MB', () => {
      const file = makeFile('big.png', 'image/png', 5 * 1024 * 1024 + 1)
      expect(validateAssetFile(file, 'background')).toMatch(/5MB/)
    })

    it('accepts files at exactly 5 MB', () => {
      const file = makeFile('exact.png', 'image/png', 5 * 1024 * 1024)
      expect(validateAssetFile(file, 'background')).toBeNull()
    })
  })

  describe('image categories', () => {
    it.each(['background', 'logo', 'favicon', 'image'] as const)(
      'accepts PNG for %s',
      (category) => {
        expect(validateAssetFile(makeFile('img.png', 'image/png'), category)).toBeNull()
      },
    )

    it('accepts JPEG by MIME type', () => {
      expect(validateAssetFile(makeFile('img.jpg', 'image/jpeg'), 'logo')).toBeNull()
    })

    it('accepts SVG by MIME type', () => {
      expect(validateAssetFile(makeFile('img.svg', 'image/svg+xml'), 'logo')).toBeNull()
    })

    it('accepts WebP by MIME type', () => {
      expect(validateAssetFile(makeFile('img.webp', 'image/webp'), 'image')).toBeNull()
    })

    it('accepts ICO by MIME type', () => {
      expect(validateAssetFile(makeFile('img.ico', 'image/x-icon'), 'favicon')).toBeNull()
    })

    it('falls back to extension when MIME type is empty', () => {
      expect(validateAssetFile(makeFile('photo.png', ''), 'background')).toBeNull()
    })

    it('rejects unsupported image type', () => {
      expect(validateAssetFile(makeFile('img.bmp', 'image/bmp'), 'background')).toMatch(/Invalid image/)
    })

    it('rejects font file uploaded to image category', () => {
      expect(validateAssetFile(makeFile('font.woff2', 'font/woff2'), 'logo')).toMatch(/Invalid image/)
    })
  })

  describe('font category', () => {
    it('accepts WOFF2 by MIME type', () => {
      expect(validateAssetFile(makeFile('font.woff2', 'font/woff2'), 'font')).toBeNull()
    })

    it('accepts TTF by MIME type', () => {
      expect(validateAssetFile(makeFile('font.ttf', 'font/ttf'), 'font')).toBeNull()
    })

    it('accepts OTF by MIME type', () => {
      expect(validateAssetFile(makeFile('font.otf', 'font/otf'), 'font')).toBeNull()
    })

    it('falls back to extension when MIME type is empty', () => {
      expect(validateAssetFile(makeFile('font.woff2', ''), 'font')).toBeNull()
    })

    it('rejects unsupported font type', () => {
      expect(validateAssetFile(makeFile('font.mp3', 'audio/mpeg'), 'font')).toMatch(/Invalid font/)
    })

    it('rejects image file uploaded to font category', () => {
      expect(validateAssetFile(makeFile('img.png', 'image/png'), 'font')).toMatch(/Invalid font/)
    })
  })
})

describe('processUploadedFile', () => {
  it('returns the correct base structure', async () => {
    const file = makeFile('img.png', 'image/png')
    const asset = await processUploadedFile(file, 'image')

    expect(asset.id).toMatch(/^asset-/)
    expect(asset.name).toBe('img.png')
    expect(asset.category).toBe('image')
    expect(asset.mimeType).toBe('image/png')
    expect(asset.size).toBe(file.size)
    expect(asset.base64Data).toBeTruthy()
    expect(typeof asset.createdAt).toBe('number')
  })

  it('falls back to extension-based MIME type when file.type is empty', async () => {
    const asset = await processUploadedFile(makeFile('img.png', ''), 'background')
    expect(asset.mimeType).toBe('image/png')
  })

  describe('font metadata', () => {
    it('adds fontFamily, fontWeight, fontStyle for font category', async () => {
      const asset = await processUploadedFile(makeFile('MyFont.woff2', 'font/woff2'), 'font')
      expect(asset.fontFamily).toBe('MyFont')
      expect(asset.fontWeight).toBe('400')
      expect(asset.fontStyle).toBe('normal')
    })

    it('derives font family from hyphenated filename', async () => {
      const asset = await processUploadedFile(makeFile('open-sans-regular.ttf', 'font/ttf'), 'font')
      expect(asset.fontFamily).toBe('Open Sans Regular')
    })

    it('does not add font metadata for image category', async () => {
      const asset = await processUploadedFile(makeFile('img.png', 'image/png'), 'image')
      expect(asset.fontFamily).toBeUndefined()
      expect(asset.fontWeight).toBeUndefined()
    })
  })

  describe('image dimensions', () => {
    it('reads dimensions for background', async () => {
      const asset = await processUploadedFile(makeFile('bg.png', 'image/png'), 'background')
      expect(asset.width).toBe(100)
      expect(asset.height).toBe(50)
    })

    it('reads dimensions for logo', async () => {
      const asset = await processUploadedFile(makeFile('logo.svg', 'image/svg+xml'), 'logo')
      expect(asset.width).toBe(100)
      expect(asset.height).toBe(50)
    })

    it('does not add dimensions for font category', async () => {
      const asset = await processUploadedFile(makeFile('font.woff2', 'font/woff2'), 'font')
      expect(asset.width).toBeUndefined()
      expect(asset.height).toBeUndefined()
    })

    it('continues without dimensions if image load fails', async () => {
      vi.stubGlobal('Image', class {
        private _onerror: (() => void) | null = null
        private _src = ''

        get onerror() { return this._onerror }
        set onerror(fn: (() => void) | null) { this._onerror = fn }

        get src() { return this._src }
        set src(value: string) {
          this._src = value
          if (this._onerror)
            setTimeout(this._onerror, 0)
        }
      })

      const asset = await processUploadedFile(makeFile('broken.png', 'image/png'), 'background')
      expect(asset.width).toBeUndefined()
      expect(asset.height).toBeUndefined()
      expect(asset.base64Data).toBeTruthy()
    })
  })
})
