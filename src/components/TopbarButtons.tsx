import {
  Button,
  Flex,
  Modal,
  ModalBody,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core'
import {
  HistoryIcon,
  RedoIcon,
  UndoIcon,
} from '@patternfly/react-icons'
import * as React from 'react'
import { useState } from 'react'
import { editorActions } from '../features/editor/actions'
import {
  useUndoRedoState,
} from '../features/editor/use-editor'
import DownloadView from './DownloadView'
import ThemeImportHelper from './ThemeImportHelper'

const TopbarButtons = React.memo(({
  className,
}: React.HTMLAttributes<HTMLDivElement>) => {
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isResetOpen, setIsResetOpen] = useState(false)
  const { canUndo, canRedo } = useUndoRedoState()

  const handleResetAll = () => {
    void editorActions.resetAll()
    setIsResetOpen(false)
  }

  return (
    <Flex
      className={className}
      gap={{ default: 'gapSm' }}
      alignItems={{ default: 'alignItemsCenter' }}
      flexWrap={{ default: 'wrap' }}
      justifyContent={{ default: 'justifyContentFlexEnd' }}
    >
      {/* Undo/Redo buttons */}
      <Button
        variant="secondary"
        onClick={editorActions.undo}
        aria-label="Undo"
        icon={<UndoIcon />}
        isDisabled={!canUndo}
      />

      <Button
        variant="secondary"
        onClick={editorActions.redo}
        aria-label="Redo"
        icon={<RedoIcon />}
        isDisabled={!canRedo}
      />

      <Button
        variant="secondary"
        onClick={() => setIsImportOpen(true)}
      >
        Import theme
      </Button>

      <Button
        variant="secondary"
        onClick={() => setIsExportOpen(true)}
      >
        Export theme
      </Button>

      <Button
        variant="secondary"
        onClick={() => setIsResetOpen(true)}
        aria-label="Reset everything"
        icon={<HistoryIcon />}
      />

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
          <p style={{ marginBottom: '1rem' }}>
            Do you really want to reset everything? This will remove all custom styles, quick settings, uploaded assets, and undo history.
          </p>
          <Flex
            gap={{ default: 'gapSm' }}
            justifyContent={{ default: 'justifyContentFlexEnd' }}
          >
            <Button variant="link" onClick={() => setIsResetOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleResetAll}>
              Reset everything
            </Button>
          </Flex>
        </ModalBody>
      </Modal>
    </Flex>
  )
})

export default TopbarButtons
