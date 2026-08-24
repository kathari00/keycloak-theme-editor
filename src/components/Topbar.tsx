import { mdiGithub } from '@mdi/js'
import { Icon as MdiIcon } from '@mdi/react'
import {
  Alert,
  Button,
  Divider,
  Flex,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Popover,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core'
import { BarsIcon, ChevronLeftIcon, ChevronRightIcon, HistoryIcon, InfoCircleIcon, MoonIcon, SunIcon } from '@patternfly/react-icons'
import { useEffect, useRef, useState } from 'react'
import { editorActions } from '../features/editor/actions'
import { useDarkModeState, useLocalizationState, usePreviewState } from '../features/editor/hooks/use-editor'
import { DEFAULT_LOCALE_TAG, localeNativeName } from '../features/i18n/locale-catalog'
import { getAvailablePreviewLocaleTags } from '../features/preview/load-generated'
import DownloadView from '../features/theme-export/components/DownloadView'
import ThemeImportHelper from '../features/theme-export/components/ThemeImportHelper'
import { cx } from '../lib/cx'
import TopbarButtons from './TopbarButtons'

interface TopbarProps extends React.HTMLAttributes<HTMLDivElement> {
  mobilePane?: 'preview' | 'tools'
  onToggleMobilePane?: () => void
}

const MOBILE_TOPBAR_MAX_WIDTH = 980
const GITHUB_REPOSITORY_URL = 'https://github.com/kathari00/keycloak-theme-editor'
const TOPBAR_ICON_BUTTON_STYLE: React.CSSProperties = {
  alignItems: 'center',
  display: 'inline-flex',
  flex: '0 0 3.25rem',
  height: '2.5rem',
  justifyContent: 'center',
  padding: 0,
  width: '3.25rem',
}

function GitHubRepositoryLink() {
  return (
    <Button
      component="a"
      variant="secondary"
      href={GITHUB_REPOSITORY_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="View source on GitHub"
      icon={<MdiIcon path={mdiGithub} size={1} style={{ display: 'block' }} />}
      style={TOPBAR_ICON_BUTTON_STYLE}
    />
  )
}

export default function Topbar({
  className,
  mobilePane = 'preview',
  onToggleMobilePane,
}: TopbarProps) {
  const { isDarkMode } = useDarkModeState()
  const { deviceId, previewLocaleTag } = usePreviewState()
  const { enabledLocales } = useLocalizationState()
  const previewLocaleOptions = [DEFAULT_LOCALE_TAG, ...enabledLocales]
  const activePreviewLocale = previewLocaleOptions.includes(previewLocaleTag)
    ? previewLocaleTag
    : DEFAULT_LOCALE_TAG
  const isPreviewChromeLocalized = getAvailablePreviewLocaleTags().includes(activePreviewLocale)
  const toolbarRef = useRef<HTMLDivElement | null>(null)
  const [isMobileLayout, setIsMobileLayout] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isResetOpen, setIsResetOpen] = useState(false)

  useEffect(() => {
    const toolbar = toolbarRef.current
    if (!toolbar) {
      return
    }

    const updateLayout = (width: number) => {
      const nextIsMobileLayout = width <= MOBILE_TOPBAR_MAX_WIDTH
      setIsMobileLayout(nextIsMobileLayout)
      if (!nextIsMobileLayout) {
        setIsMobileMenuOpen(false)
      }
    }

    updateLayout(toolbar.getBoundingClientRect().width)

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) {
        return
      }

      updateLayout(entry.contentRect.width)
    })

    resizeObserver.observe(toolbar)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  const setPreviewDevice = (nextDeviceId: 'desktop' | 'tablet' | 'mobile') => {
    editorActions.setDeviceId(nextDeviceId)
  }

  const openDialogFromMobileMenu = (openDialog: () => void) => {
    const activeElement = document.activeElement
    if (activeElement instanceof HTMLElement) {
      activeElement.blur()
    }

    setIsMobileMenuOpen(false)
    window.setTimeout(openDialog, 0)
  }

  const handleResetAll = () => {
    void editorActions.resetAll()
    setIsResetOpen(false)
  }

  const logoSrc = isDarkMode ? '/logo-dark.svg' : '/logo-light.svg'
  const shouldUseMobileLayout = isMobileLayout || Boolean(onToggleMobilePane)
  const editorMenu = (
    <Popover
      id="editor-options"
      aria-label="Editor options"
      headerContent="Editor options"
      position="bottom-end"
      maxWidth="20rem"
      withFocusTrap
      elementToFocus="#topbar-preview-device"
      isVisible={isMobileMenuOpen}
      shouldOpen={() => setIsMobileMenuOpen(true)}
      shouldClose={() => setIsMobileMenuOpen(false)}
      closeBtnAriaLabel="Close editor options"
      bodyContent={(
        <div style={{ display: 'grid', gap: 'var(--pf-t--global--spacer--md)', minWidth: '16rem' }}>
          <FormGroup label="Device" fieldId="topbar-preview-device" style={{ margin: 0 }}>
            <FormSelect
              id="topbar-preview-device"
              value={deviceId}
              onChange={(_event, value) => setPreviewDevice(value as 'desktop' | 'tablet' | 'mobile')}
              aria-label="Select preview device"
            >
              <FormSelectOption value="desktop" label="Desktop" />
              <FormSelectOption value="tablet" label="Tablet" />
              <FormSelectOption value="mobile" label="Mobile" />
            </FormSelect>
          </FormGroup>
          {enabledLocales.length > 0 && (
            <FormGroup label="Language" fieldId="topbar-preview-language" style={{ margin: 0 }}>
              <FormSelect
                id="topbar-preview-language"
                value={activePreviewLocale}
                onChange={(_event, value) => editorActions.setPreviewLocaleTag(value)}
                aria-label="Select preview language"
              >
                {previewLocaleOptions.map(tag => (
                  <FormSelectOption key={tag} value={tag} label={localeNativeName(tag)} />
                ))}
              </FormSelect>
              {!isPreviewChromeLocalized && (
                <Flex
                  alignItems={{ default: 'alignItemsCenter' }}
                  spaceItems={{ default: 'spaceItemsXs' }}
                  style={{ marginTop: 'var(--pf-t--global--spacer--xs)' }}
                >
                  <InfoCircleIcon style={{ color: 'var(--pf-v5-global--info-color--100)' }} />
                  <small style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>
                    Standard Keycloak text isn't pre-rendered for this language, showing English. Your own texts still translate.
                  </small>
                </Flex>
              )}
            </FormGroup>
          )}
          {shouldUseMobileLayout && (
            <>
              <Divider />
              <div
                role="group"
                aria-labelledby="editor-options-actions"
                style={{ display: 'grid', gap: 'var(--pf-t--global--spacer--sm)' }}
              >
                <strong id="editor-options-actions">Actions</strong>
                <TopbarButtons mode="history" />
                <Button variant="secondary" isBlock onClick={() => openDialogFromMobileMenu(() => setIsImportOpen(true))}>
                  Import theme
                </Button>
                <Button variant="secondary" isBlock onClick={() => openDialogFromMobileMenu(() => setIsExportOpen(true))}>
                  Export theme
                </Button>
              </div>
            </>
          )}
          <Divider />
          <Button
            variant="danger"
            isBlock
            icon={<HistoryIcon />}
            onClick={() => openDialogFromMobileMenu(() => setIsResetOpen(true))}
          >
            Reset everything
          </Button>
        </div>
      )}
    >
      <Button
        variant="secondary"
        aria-label={isMobileMenuOpen ? 'Close editor menu' : 'Open editor menu'}
        aria-expanded={isMobileMenuOpen}
        aria-haspopup="dialog"
        icon={<BarsIcon />}
        style={TOPBAR_ICON_BUTTON_STYLE}
      />
    </Popover>
  )

  return (
    <div ref={toolbarRef}>
      <Toolbar
        className={cx('gjs-top-sidebar', shouldUseMobileLayout && 'gjs-top-sidebar--mobile', className)}
        colorVariant="secondary"
        id="editor-topbar"
        inset={{ default: 'insetSm' }}
        style={{
          borderBottom: '1px solid var(--pf-t--global--border--color--subtle)',
        }}
      >
        <ToolbarContent
          style={shouldUseMobileLayout
            ? {
                alignItems: 'center',
                width: '100%',
                justifyContent: 'space-between',
                flexWrap: 'nowrap',
              }
            : {
                alignItems: 'center',
              }}
        >
          {shouldUseMobileLayout
            ? (
                <>
                  <ToolbarGroup variant="filter-group" style={{ alignItems: 'center' }}>
                    <ToolbarItem>
                      <Flex gap={{ default: 'gapXs' }} alignItems={{ default: 'alignItemsCenter' }} flexWrap={{ default: 'nowrap' }}>
                        <Title headingLevel="h1" size="md" style={{ margin: 0, flexShrink: 0 }}>
                          <img
                            src={logoSrc}
                            alt="Keycloak theme editor"
                            style={{ height: '2rem', width: 'auto', display: 'inline-block', verticalAlign: 'middle' }}
                          />
                        </Title>
                        <GitHubRepositoryLink />
                      </Flex>
                    </ToolbarItem>
                  </ToolbarGroup>
                  <ToolbarGroup variant="action-group" style={{ marginInlineStart: 'auto', alignItems: 'center', flexWrap: 'nowrap' }}>
                    <ToolbarItem>
                      {editorMenu}
                    </ToolbarItem>
                    <ToolbarItem>
                      <Button
                        variant="secondary"
                        onClick={editorActions.toggleDarkMode}
                        aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                        icon={isDarkMode ? <SunIcon /> : <MoonIcon />}
                        style={TOPBAR_ICON_BUTTON_STYLE}
                      />
                    </ToolbarItem>
                    {onToggleMobilePane && (
                      <ToolbarItem>
                        <Button
                          variant="secondary"
                          onClick={onToggleMobilePane}
                          aria-label={mobilePane === 'preview' ? 'Open editor tools' : 'Show preview'}
                          aria-controls={mobilePane === 'preview' ? 'mobile-tools-pane' : 'mobile-preview-pane'}
                          icon={mobilePane === 'preview' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                          style={TOPBAR_ICON_BUTTON_STYLE}
                        />
                      </ToolbarItem>
                    )}
                  </ToolbarGroup>
                </>
              )
            : (
                <>
                  <ToolbarGroup variant="filter-group" style={{ alignItems: 'center' }}>
                    <ToolbarItem>
                      <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }} flexWrap={{ default: 'nowrap' }}>
                        <Title headingLevel="h1" size="lg" style={{ margin: 0, flexShrink: 0 }}>
                          <Flex
                            gap={{ default: 'gapMd' }}
                            alignItems={{ default: 'alignItemsCenter' }}
                            flexWrap={{ default: 'nowrap' }}
                          >
                            <img
                              src={logoSrc}
                              alt="Keycloak theme editor"
                              style={{ height: '3.25rem', width: 'auto', display: 'block' }}
                            />
                            <span style={{ whiteSpace: 'nowrap' }}>
                              Keycloak Theme Editor
                            </span>
                          </Flex>
                        </Title>
                        <GitHubRepositoryLink />
                        <Button
                          variant="secondary"
                          onClick={editorActions.toggleDarkMode}
                          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                          icon={isDarkMode ? <SunIcon /> : <MoonIcon />}
                          style={TOPBAR_ICON_BUTTON_STYLE}
                        />
                      </Flex>
                    </ToolbarItem>
                  </ToolbarGroup>
                  <ToolbarGroup variant="action-group" style={{ marginInlineStart: 'auto', alignItems: 'center' }}>
                    <ToolbarItem>
                      <TopbarButtons
                        mode="desktop"
                        onOpenImport={() => setIsImportOpen(true)}
                        onOpenExport={() => setIsExportOpen(true)}
                      />
                    </ToolbarItem>
                    <ToolbarItem>
                      {editorMenu}
                    </ToolbarItem>
                  </ToolbarGroup>
                </>
              )}
        </ToolbarContent>
        <Modal
          variant={ModalVariant.medium}
          title="Import Theme"
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          aria-labelledby="import-modal-title"
          aria-describedby="import-modal-body"
        >
          <ModalHeader title="Import Theme" labelId="import-modal-title" />
          <ModalBody id="import-modal-body">
            <ThemeImportHelper />
          </ModalBody>
        </Modal>

        <Modal
          variant={ModalVariant.medium}
          title="Export Theme"
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          aria-labelledby="export-modal-title"
          aria-describedby="export-modal-body"
        >
          <ModalHeader title="Export Theme" labelId="export-modal-title" />
          <ModalBody id="export-modal-body">
            <DownloadView onExportComplete={() => setIsExportOpen(false)} />
          </ModalBody>
        </Modal>

        <Modal
          variant={ModalVariant.small}
          title="Reset Everything?"
          isOpen={isResetOpen}
          onClose={() => setIsResetOpen(false)}
          aria-labelledby="reset-modal-title"
          aria-describedby="reset-modal-body"
        >
          <ModalHeader title="Reset Everything?" labelId="reset-modal-title" />
          <ModalBody id="reset-modal-body">
            <Alert
              isInline
              variant="danger"
              title="This removes all editor changes"
            >
              Resetting clears custom styles, quick settings, uploaded assets, and undo history.
            </Alert>
          </ModalBody>
          <ModalFooter>
            <Button variant="link" onClick={() => setIsResetOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleResetAll}>
              Reset everything
            </Button>
          </ModalFooter>
        </Modal>
      </Toolbar>
    </div>
  )
}
