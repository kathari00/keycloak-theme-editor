import {
  Button,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core'
import { useEffect } from 'react'
import { usePreviewContext } from '../features/preview/hooks/use-preview-context'
import { getVariantStateOptions } from '../features/preview/load-generated'
import { cx } from '../lib/cx'

interface ContextBarProps {
  className?: string
}

export default function ContextBar({ className }: ContextBarProps) {
  const preview = usePreviewContext()
  const {
    activeVariantId,
    activePageId,
    activeStateId,
    setActiveState,
  } = preview

  const states = getVariantStateOptions({
    variantId: activeVariantId,
    pageId: activePageId,
  })

  useEffect(() => {
    if (states.length === 0) {
      return
    }
    const hasCurrentState = states.some(state => state.id === activeStateId)
    if (hasCurrentState) {
      return
    }
    const initialState = states.find(state => state.id === 'default') ?? states[0]
    if (initialState) {
      setActiveState(initialState.id)
    }
  }, [activeStateId, setActiveState, states])

  if (states.length === 0) {
    return null
  }

  return (
    <Toolbar
      className={cx(className)}
      colorVariant="secondary"
      id="editor-context-bar"
      inset={{ default: 'insetSm' }}
      style={{
        borderBottom: '1px solid var(--pf-t--global--border--color--subtle)',
      }}
    >
      <ToolbarContent style={{ rowGap: '0.5rem' }}>
        <ToolbarGroup
          style={{
            alignItems: 'center',
            columnGap: '0.5rem',
            rowGap: '0.5rem',
            flexWrap: 'wrap',
          }}
        >
          <ToolbarItem style={{ marginInlineEnd: 0, color: 'var(--pf-v6-global--Color--200)', fontSize: 'var(--pf-t--global--font--size--body--sm)' }}>
            States
          </ToolbarItem>
          {states.map(state => (
            <ToolbarItem key={state.id} style={{ marginInlineEnd: 0 }}>
              <Button
                variant={activeStateId === state.id ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setActiveState(state.id)}
              >
                {state.name}
              </Button>
            </ToolbarItem>
          ))}
        </ToolbarGroup>
      </ToolbarContent>
    </Toolbar>
  )
}
