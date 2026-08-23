import {
  Button,
  DropdownItem,
  Flex,
} from '@patternfly/react-core'
import {
  RedoIcon,
  UndoIcon,
} from '@patternfly/react-icons'
import * as React from 'react'
import { editorActions } from '../features/editor/actions'
import {
  useUndoRedoState,
} from '../features/editor/hooks/use-editor'

interface TopbarButtonsProps {
  className?: string
  mode?: 'desktop' | 'history' | 'menu'
  onOpenImport?: () => void
  onOpenExport?: () => void
}

const TopbarButtons = React.memo(({
  className,
  mode = 'desktop',
  onOpenImport,
  onOpenExport,
}: TopbarButtonsProps) => {
  const { canUndo, canRedo } = useUndoRedoState()

  if (mode === 'menu') {
    return (
      <>
        <DropdownItem isDisabled={!canUndo} onClick={editorActions.undo}>
          Undo
        </DropdownItem>
        <DropdownItem isDisabled={!canRedo} onClick={editorActions.redo}>
          Redo
        </DropdownItem>
        <DropdownItem onClick={onOpenImport}>
          Import theme
        </DropdownItem>
        <DropdownItem onClick={onOpenExport}>
          Export theme
        </DropdownItem>
      </>
    )
  }

  return (
    <>
      <Flex
        className={className}
        gap={{ default: 'gapSm' }}
        alignItems={{ default: 'alignItemsCenter' }}
        flexWrap={{ default: mode === 'desktop' ? 'wrap' : 'nowrap' }}
        justifyContent={{ default: 'justifyContentFlexEnd' }}
      >
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

        {mode === 'desktop' && (
          <>
            <Button
              variant="secondary"
              onClick={onOpenImport}
            >
              Import theme
            </Button>

            <Button
              variant="secondary"
              onClick={onOpenExport}
            >
              Export theme
            </Button>

          </>
        )}
      </Flex>
    </>
  )
})

export default TopbarButtons
