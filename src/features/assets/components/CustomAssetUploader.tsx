import type { AssetCategory, ThemeAssetTarget, UploadedAsset } from '../types'
import {
  Alert,
  Button,
  Card,
  CardBody,
  Divider,
  EmptyState,
  EmptyStateBody,
  ExpandableSection,
  Flex,
  FlexItem,
  Stack,
  StackItem,
} from '@patternfly/react-core'
import { useRef, useState } from 'react'
import SidebarPanel from '../../../components/SidebarPanel'
import { editorActions } from '../../editor/actions'
import { useUploadedAssetsState } from '../../editor/hooks/use-editor'
import { getAssetDataUrl } from '../font-css-generator'
import {
  processUploadedFile,
  validateAssetFile,
} from '../upload-service'

const CATEGORY_CONFIG: Record<
  AssetCategory,
  { label: string, accept: string }
> = {
  font: {
    label: 'Fonts',
    accept: '.woff,.woff2,.ttf,.otf',
  },
  background: {
    label: 'Background',
    accept: '.png,.jpg,.jpeg,.svg,.webp,.gif',
  },
  logo: {
    label: 'Logo',
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

export default function CustomAssetUploader({
  withCard = true,
  title = 'Uploads',
}: {
  withCard?: boolean
  title?: string
}) {
  const { uploadedAssets, appliedAssets } = useUploadedAssetsState()
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
    editorActions.unapplyAsset(target)
  }

  const isAssetApplied = (asset: UploadedAsset): boolean => {
    if (asset.category === 'font')
      return appliedAssets.bodyFont === asset.id
    if (asset.category === 'background') {
      return Boolean(
        appliedAssets.background === asset.id
        || (asset.isDefault && !appliedAssets.background),
      )
    }
    if (asset.category === 'logo') {
      return Boolean(
        appliedAssets.logo === asset.id
        || (asset.isDefault && !appliedAssets.logo),
      )
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
    withCard
      ? (
          <Card key={asset.id} isCompact variant="secondary">
            <CardBody>
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
            </CardBody>
          </Card>
        )
      : (
          <Flex
            justifyContent={{ default: 'justifyContentSpaceBetween' }}
            alignItems={{ default: 'alignItemsCenter' }}
            flexWrap={{ default: 'wrap' }}
            gap={{ default: 'gapMd' }}
            style={{ paddingBlock: 'var(--pf-t--global--spacer--sm)' }}
          >
            <FlexItem style={{ flexGrow: 1, minWidth: '12rem' }}>
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
        )
  )

  const renderImageCard = (asset: UploadedAsset) => {
    const isApplied = isAssetApplied(asset)
    const canApply = asset.category !== 'image'
    return (
      withCard
        ? (
            <Card key={asset.id} isCompact variant="secondary">
              <CardBody>
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
                        backgroundColor: 'var(--pf-t--global--background--color--secondary--default)',
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
                          variant={isApplied ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() =>
                            isApplied ? handleUnapply(asset) : handleApply(asset)}
                        >
                          {isApplied ? 'Applied' : 'Apply'}
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
              </CardBody>
            </Card>
          )
        : (
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              justifyContent={{ default: 'justifyContentSpaceBetween' }}
              flexWrap={{ default: 'wrap' }}
              gap={{ default: 'gapMd' }}
              style={{ paddingBlock: 'var(--pf-t--global--spacer--sm)' }}
            >
              <FlexItem style={{ minWidth: 0, flexGrow: 1 }}>
                <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                  <FlexItem>
                    <img
                      src={getAssetDataUrl(asset)}
                      alt={asset.name}
                      style={{
                        maxWidth: '44px',
                        maxHeight: '44px',
                        borderRadius: '4px',
                        objectFit: 'contain',
                        backgroundColor: 'var(--pf-t--global--background--color--secondary--default)',
                      }}
                    />
                  </FlexItem>
                  <FlexItem style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem' }}>{asset.name}</div>
                  </FlexItem>
                </Flex>
              </FlexItem>
              <FlexItem>
                <Flex gap={{ default: 'gapSm' }}>
                  {canApply && (
                    <Button
                      variant={isApplied ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() =>
                        isApplied ? handleUnapply(asset) : handleApply(asset)}
                    >
                      {isApplied ? 'Applied' : 'Apply'}
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
          )
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
        <Stack hasGutter style={{ paddingTop: 'var(--pf-t--global--spacer--sm)' }}>
          <StackItem>
            {withCard
              ? (
                  <Card isCompact variant="secondary">
                    <CardBody>
                      <input
                        ref={(el) => {
                          fileInputRefs.current[category] = el
                        }}
                        type="file"
                        accept={config.accept}
                        onChange={handleFileSelect(category)}
                        style={{ display: 'none' }}
                        multiple={category !== 'background' && category !== 'logo' && category !== 'favicon'}
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
                    </CardBody>
                  </Card>
                )
              : (
                  <>
                    <input
                      ref={(el) => {
                        fileInputRefs.current[category] = el
                      }}
                      type="file"
                      accept={config.accept}
                      onChange={handleFileSelect(category)}
                      style={{ display: 'none' }}
                      multiple={category !== 'background' && category !== 'logo' && category !== 'favicon'}
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
                  </>
                )}
          </StackItem>
          {assets.map((asset, index) => (
            <StackItem key={asset.id}>
              {category === 'font'
                ? renderFontCard(asset)
                : renderImageCard(asset)}
              {!withCard && index < assets.length - 1 && <Divider />}
            </StackItem>
          ))}
          {assets.length === 0 && (
            <StackItem>
              <EmptyState headingLevel="h4" titleText={`No ${config.label.toLowerCase()} uploaded`} variant="xs">
                <EmptyStateBody>Upload files here to make them available for this theme.</EmptyStateBody>
              </EmptyState>
            </StackItem>
          )}
        </Stack>
      </ExpandableSection>
    )
  }

  const content = (
    <Stack hasGutter>
      <StackItem>
        {renderAssetSection('background')}
      </StackItem>
      <StackItem>
        {renderAssetSection('logo')}
      </StackItem>
      <StackItem>
        {renderAssetSection('image')}
      </StackItem>
      <StackItem>
        {renderAssetSection('favicon')}
      </StackItem>
      <StackItem>
        {renderAssetSection('font')}
      </StackItem>
    </Stack>
  )

  if (!withCard) {
    return content
  }

  return (
    <SidebarPanel title={title} fullHeight bodyStyle={{ minHeight: 0, overflowY: 'auto' }}>
      <div style={{ minHeight: 0, overflowY: 'auto', height: '100%' }}>
        {content}
      </div>
    </SidebarPanel>
  )
}
