import type { AssetCategory, ThemeAssetTarget, UploadedAsset } from '../features/assets/types'
import {
  Alert,
  Button,
  ExpandableSection,
  Flex,
  FlexItem,
  Panel,
  PanelMain,
  PanelMainBody,
} from '@patternfly/react-core'
import { useRef, useState } from 'react'
import { getAssetDataUrl } from '../features/assets/font-css-generator'
import { REMOVED_ASSET_ID } from '../features/assets/types'
import {
  processUploadedFile,
  validateAssetFile,
} from '../features/assets/upload-service'
import { editorActions } from '../features/editor/actions'
import { usePresetState, useUploadedAssetsState } from '../features/editor/use-editor'
import { resolveThemeBaseIdFromConfig, useThemeConfig } from '../features/presets/queries'

const CATEGORY_CONFIG: Record<
  AssetCategory,
  { label: string, accept: string }
> = {
  font: {
    label: 'Fonts',
    accept: '.woff,.woff2,.ttf,.otf',
  },
  background: {
    label: 'Backgrounds',
    accept: '.png,.jpg,.jpeg,.svg,.webp,.gif',
  },
  logo: {
    label: 'Logos',
    accept: '.png,.jpg,.jpeg,.svg,.webp,.gif',
  },
  favicon: {
    label: 'Favicon',
    accept: '.ico,.png,.svg',
  },
  image: {
    label: 'Images',
    accept: '.png,.jpg,.jpeg,.svg,.webp,.gif',
  },
}

export default function CustomAssetUploader() {
  const { uploadedAssets, appliedAssets } = useUploadedAssetsState()
  const { selectedThemeId } = usePresetState()
  const themeConfig = useThemeConfig()
  const selectedBaseId = resolveThemeBaseIdFromConfig(themeConfig, selectedThemeId)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadErrorCategory, setUploadErrorCategory] = useState<AssetCategory | null>(null)
  const [expandedSections, setExpandedSections] = useState<
    Record<AssetCategory, boolean>
  >({
    font: false,
    background: false,
    logo: false,
    favicon: false,
    image: false,
  })

  // eslint-disable-next-line react-naming-convention/ref-name
  const fileInputRefs = useRef<Record<AssetCategory, HTMLInputElement | null>>({
    font: null,
    background: null,
    logo: null,
    favicon: null,
    image: null,
  })

  const getTargetForAsset = (asset: UploadedAsset): ThemeAssetTarget | null => {
    if (asset.category === 'font')
      return 'bodyFont'
    if (asset.category === 'background')
      return 'background'
    if (asset.category === 'logo')
      return 'logo'
    if (asset.category === 'favicon')
      return 'favicon'
    return null
  }

  const handleApply = (asset: UploadedAsset) => {
    const target = getTargetForAsset(asset)
    if (!target)
      return
    editorActions.applyAsset(target, asset.id)
  }

  const handleUnapply = (asset: UploadedAsset) => {
    const target = getTargetForAsset(asset)
    if (!target)
      return
    if ((asset.category === 'background' || asset.category === 'logo') && asset.isDefault) {
      editorActions.setAppliedAssets({
        ...appliedAssets,
        [target]: REMOVED_ASSET_ID,
      })
      return
    }
    editorActions.unapplyAsset(target)
  }

  const isAssetApplied = (asset: UploadedAsset): boolean => {
    if (asset.category === 'font')
      return appliedAssets.bodyFont === asset.id
    if (asset.category === 'background') {
      return Boolean(
        appliedAssets.background === asset.id
        || (selectedBaseId === 'v2' && asset.isDefault && !appliedAssets.background),
      )
    }
    if (asset.category === 'logo') {
      return appliedAssets.logo === asset.id
    }
    if (asset.category === 'favicon')
      return appliedAssets.favicon === asset.id
    return false
  }

  const handleFileSelect = (category: AssetCategory) => async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files
    if (!files?.length)
      return

    setIsUploading(true)
    setUploadError(null)
    setUploadErrorCategory(null)

    try {
      const newlyUploaded: UploadedAsset[] = []
      for (const file of Array.from(files)) {
        const error = validateAssetFile(file, category)
        if (error) {
          setUploadError(error)
          setUploadErrorCategory(category)
          setIsUploading(false)
          return
        }

        const asset = await processUploadedFile(file, category)
        editorActions.addUploadedAsset(asset)
        newlyUploaded.push(asset)
      }

      const latestAsset = newlyUploaded[newlyUploaded.length - 1]
      if (latestAsset) {
        if (latestAsset.category === 'background') {
          editorActions.applyAsset('background', latestAsset.id)
        }
        else if (latestAsset.category === 'logo') {
          editorActions.applyAsset('logo', latestAsset.id)
        }
        else if (latestAsset.category === 'favicon') {
          editorActions.applyAsset('favicon', latestAsset.id)
        }
      }
    }
    catch {
      setUploadError('Failed to process file')
      setUploadErrorCategory(category)
    }

    setIsUploading(false)

    // Reset input
    const inputEl = fileInputRefs.current[category]
    if (inputEl) {
      inputEl.value = ''
    }
  }

  const handleDelete = (assetId: string) => {
    editorActions.removeUploadedAsset(assetId)
  }

  const toggleSection = (category: AssetCategory) => {
    setExpandedSections(prev => ({
      ...prev,
      [category]: !prev[category],
    }))
  }

  const fonts = uploadedAssets.filter(a => a.category === 'font')
  const backgrounds = uploadedAssets.filter(a => a.category === 'background')
  const logos = uploadedAssets.filter(a => a.category === 'logo')
  const favicons = uploadedAssets.filter(a => a.category === 'favicon')
  const images = uploadedAssets.filter(a => a.category === 'image')

  const assetsByCategory: Record<AssetCategory, UploadedAsset[]> = {
    font: fonts,
    background: backgrounds,
    logo: logos,
    favicon: favicons,
    image: images,
  }

  const renderFontCard = (asset: UploadedAsset) => (
    <Panel key={asset.id} variant="bordered" style={{ marginBottom: '6px' }}>
      <PanelMain>
        <PanelMainBody style={{ padding: '8px' }}>
          <Flex
            justifyContent={{ default: 'justifyContentSpaceBetween' }}
            alignItems={{ default: 'alignItemsCenter' }}
          >
            <FlexItem style={{ flexGrow: 1 }}>
              <div style={{ fontSize: '0.8rem' }}>{asset.name}</div>
            </FlexItem>
            <FlexItem>
              <Flex gap={{ default: 'gapSm' }}>
                <Button
                  variant={isAssetApplied(asset) ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() =>
                    isAssetApplied(asset) ? handleUnapply(asset) : handleApply(asset)}
                >
                  {isAssetApplied(asset) ? 'Applied' : 'Apply'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDelete(asset.id)}
                  aria-label="Delete font"
                >
                  Delete
                </Button>
              </Flex>
            </FlexItem>
          </Flex>
        </PanelMainBody>
      </PanelMain>
    </Panel>
  )

  const renderImageCard = (asset: UploadedAsset) => {
    const isApplied = isAssetApplied(asset)
    const isDefaultApplied = Boolean(
      isApplied
      && asset.isDefault
      && (asset.category === 'background' || asset.category === 'logo'),
    )
    const canApply = asset.category !== 'image'
    return (
      <Panel key={asset.id} variant="bordered" style={{ marginBottom: '6px' }}>
        <PanelMain>
          <PanelMainBody style={{ padding: '8px' }}>
            <Flex alignItems={{ default: 'alignItemsCenter' }}>
              <FlexItem>
                <img
                  src={getAssetDataUrl(asset)}
                  alt={asset.name}
                  style={{
                    maxWidth: '44px',
                    maxHeight: '44px',
                    marginRight: '10px',
                    borderRadius: '4px',
                    objectFit: 'contain',
                    backgroundColor: 'var(--pf-v6-global--BackgroundColor--200)',
                  }}
                />
              </FlexItem>
              <FlexItem style={{ flexGrow: 1 }}>
                <div style={{ fontSize: '0.8rem' }}>{asset.name}</div>
              </FlexItem>
              <FlexItem>
                <Flex gap={{ default: 'gapSm' }}>
                  {canApply && (
                    <Button
                      variant={isDefaultApplied ? 'secondary' : isApplied ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() =>
                        isApplied ? handleUnapply(asset) : handleApply(asset)}
                    >
                      {isDefaultApplied ? 'Disable' : isApplied ? 'Applied' : 'Apply'}
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDelete(asset.id)}
                    aria-label="Delete image"
                  >
                    Delete
                  </Button>
                </Flex>
              </FlexItem>
            </Flex>
          </PanelMainBody>
        </PanelMain>
      </Panel>
    )
  }

  const renderAssetSection = (category: AssetCategory) => {
    const config = CATEGORY_CONFIG[category]
    const assets = assetsByCategory[category]
    const isExpanded = expandedSections[category]
    const uploadLabel
      = category === 'font'
        ? 'Font'
        : category === 'favicon'
          ? 'Favicon'
          : category === 'image'
            ? 'Image'
            : 'Image'

    return (
      <ExpandableSection
        key={category}
        toggleContent={(
          <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
            <span>{config.label}</span>
          </Flex>
        )}
        isExpanded={isExpanded}
        onToggle={() => toggleSection(category)}
        style={{ marginBottom: '8px' }}
      >
        <div style={{ paddingLeft: '8px', paddingTop: '8px' }}>
          <Panel variant="bordered" style={{ marginBottom: '12px' }}>
            <PanelMain>
              <PanelMainBody>
                <input
                  ref={(el) => {
                    fileInputRefs.current[category] = el
                  }}
                  type="file"
                  accept={config.accept}
                  onChange={handleFileSelect(category)}
                  style={{ display: 'none' }}
                  multiple
                />
                <Button
                  variant="secondary"
                  onClick={() => fileInputRefs.current[category]?.click()}
                  isLoading={isUploading}
                  isBlock
                >
                  Upload
                  {' '}
                  {uploadLabel}
                </Button>
                {uploadError && uploadErrorCategory === category && (
                  <Alert
                    variant="danger"
                    isInline
                    title="Upload Error"
                    style={{ marginTop: '8px' }}
                  >
                    {uploadError}
                  </Alert>
                )}
              </PanelMainBody>
            </PanelMain>
          </Panel>
          {assets.map(asset =>
            category === 'font'
              ? renderFontCard(asset)
              : renderImageCard(asset),
          )}
        </div>
      </ExpandableSection>
    )
  }

  return (
    <>
      {renderAssetSection('background')}
      {renderAssetSection('logo')}
      {renderAssetSection('image')}
      {renderAssetSection('favicon')}
      {renderAssetSection('font')}
    </>
  )
}
