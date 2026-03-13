import type { MenuToggleElement } from '@patternfly/react-core'
import {
  Alert,
  Button,
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FormSelect,
  FormSelectOption,
  MenuToggle,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core'
import { BarsIcon, MoonIcon, SunIcon } from '@patternfly/react-icons'
import { useEffect, useState } from 'react'
import { editorActions } from '../features/editor/actions'
import { useDarkModeState, usePreviewState } from '../features/editor/hooks/use-editor'
import DownloadView from '../features/theme-export/components/DownloadView'
import ThemeImportHelper from '../features/theme-export/components/ThemeImportHelper'
import { cx } from '../lib/cx'
import TopbarButtons from './TopbarButtons'

interface TopbarProps extends React.HTMLAttributes<HTMLDivElement> {
}

export default function Topbar({
  className,
}: TopbarProps) {
  const { isDarkMode } = useDarkModeState()
  const { deviceId } = usePreviewState()
  const [isMobileLayout, setIsMobileLayout] = useState(() => window.matchMedia('(max-width: 768px)').matches)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isResetOpen, setIsResetOpen] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)')
    const handleLayoutChange = (event: MediaQueryListEvent) => {
      setIsMobileLayout(event.matches)
      if (!event.matches) {
        setIsMobileMenuOpen(false)
      }
    }

    mediaQuery.addEventListener('change', handleLayoutChange)
    return () => {
      mediaQuery.removeEventListener('change', handleLayoutChange)
    }
  }, [])

  const setPreviewDevice = (nextDeviceId: 'desktop' | 'tablet' | 'mobile') => {
    editorActions.setDeviceId(nextDeviceId)
    setIsMobileMenuOpen(false)
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

  return (
    <Toolbar
      className={cx('gjs-top-sidebar', className)}
      colorVariant="secondary"
      id="editor-topbar"
      inset={{ default: 'insetSm' }}
      style={{
        borderBottom: '1px solid var(--pf-t--global--border--color--subtle)',
      }}
    >
      <ToolbarContent
        style={isMobileLayout
          ? {
              width: '100%',
              justifyContent: 'space-between',
              flexWrap: 'nowrap',
            }
          : undefined}
      >
        {isMobileLayout
          ? (
              <>
                <ToolbarGroup variant="filter-group">
                  <ToolbarItem>
                    <Title headingLevel="h1" size="md" style={{ margin: 0, lineHeight: 0, flexShrink: 0 }}>
                      <img
                        src={logoSrc}
                        alt="Keycloak theme editor"
                        style={{ height: '2rem', width: 'auto', display: 'inline-block', verticalAlign: 'middle' }}
                      />
                    </Title>
                  </ToolbarItem>
                </ToolbarGroup>
                <ToolbarGroup variant="action-group" style={{ marginInlineStart: 'auto', flexWrap: 'nowrap' }}>
                  <ToolbarItem>
                    <Dropdown
                      onSelect={() => setIsMobileMenuOpen(false)}
                      isOpen={isMobileMenuOpen}
                      onOpenChange={(isOpen: boolean) => setIsMobileMenuOpen(isOpen)}
                      toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                        <MenuToggle
                          ref={toggleRef}
                          variant="plain"
                          aria-label="Open editor menu"
                          icon={<BarsIcon />}
                          isExpanded={isMobileMenuOpen}
                          onClick={() => setIsMobileMenuOpen(prev => !prev)}
                        />
                      )}
                    >
                      <DropdownList>
                        <DropdownItem
                          isDisabled={deviceId === 'desktop'}
                          onClick={() => setPreviewDevice('desktop')}
                        >
                          Desktop
                        </DropdownItem>
                        <DropdownItem
                          isDisabled={deviceId === 'tablet'}
                          onClick={() => setPreviewDevice('tablet')}
                        >
                          Tablet
                        </DropdownItem>
                        <DropdownItem
                          isDisabled={deviceId === 'mobile'}
                          onClick={() => setPreviewDevice('mobile')}
                        >
                          Mobile
                        </DropdownItem>
                        <TopbarButtons
                          mode="menu"
                          onOpenImport={() => openDialogFromMobileMenu(() => setIsImportOpen(true))}
                          onOpenExport={() => openDialogFromMobileMenu(() => setIsExportOpen(true))}
                          onOpenReset={() => openDialogFromMobileMenu(() => setIsResetOpen(true))}
                        />
                      </DropdownList>
                    </Dropdown>
                  </ToolbarItem>
                  <ToolbarItem>
                    <TopbarButtons mode="history" />
                  </ToolbarItem>
                  <ToolbarItem>
                    <Button
                      variant="secondary"
                      onClick={editorActions.toggleDarkMode}
                      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                      icon={isDarkMode ? <SunIcon /> : <MoonIcon />}
                    />
                  </ToolbarItem>
                </ToolbarGroup>
              </>
            )
          : (
              <>
                <ToolbarGroup variant="filter-group">
                  <ToolbarItem>
                    <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }} flexWrap={{ default: 'nowrap' }}>
                      <Title headingLevel="h1" size="lg" style={{ margin: 0, lineHeight: 0, flexShrink: 0 }}>
                        <img
                          src={logoSrc}
                          alt="Keycloak theme editor"
                          style={{ height: '3.25rem', width: 'auto', display: 'inline-block', verticalAlign: 'middle' }}
                        />
                        <span
                          style={{
                            marginInlineStart: '0.75rem',
                            display: 'inline-block',
                            verticalAlign: 'middle',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Keycloak Theme Editor
                        </span>
                      </Title>
                      <FormSelect
                        value={deviceId}
                        onChange={(_event, value) => editorActions.setDeviceId(value as 'desktop' | 'tablet' | 'mobile')}
                        aria-label="Select preview device"
                        style={{ width: '7rem', minWidth: '7rem' }}
                      >
                        <FormSelectOption value="desktop" label="Desktop" />
                        <FormSelectOption value="tablet" label="Tablet" />
                        <FormSelectOption value="mobile" label="Mobile" />
                      </FormSelect>
                      <Button
                        variant="secondary"
                        onClick={editorActions.toggleDarkMode}
                        aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                        icon={isDarkMode ? <SunIcon /> : <MoonIcon />}
                      />
                    </Flex>
                  </ToolbarItem>
                </ToolbarGroup>
                <ToolbarGroup variant="action-group" style={{ marginInlineStart: 'auto' }}>
                  <ToolbarItem>
                    <TopbarButtons
                      mode="desktop"
                      onOpenImport={() => setIsImportOpen(true)}
                      onOpenExport={() => setIsExportOpen(true)}
                      onOpenReset={() => setIsResetOpen(true)}
                    />
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
  )
}
