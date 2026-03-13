import {
  Button,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core'
import { useEffect } from 'react'
import { usePreviewContext } from '../features/preview/hooks/use-preview-context'
import { getVariantScenarioOptions } from '../features/preview/load-generated'
import { cx } from '../lib/cx'

interface ContextBarProps {
  className?: string
}

export default function ContextBar({ className }: ContextBarProps) {
  const preview = usePreviewContext()
  const {
    activeVariantId,
    activePageId,
    activeStoryId,
    setActiveStory,
  } = preview

  const stories = getVariantScenarioOptions({
    variantId: activeVariantId,
    pageId: activePageId,
  })

  useEffect(() => {
    if (stories.length === 0) {
      return
    }
    const hasCurrentStory = stories.some(story => story.id === activeStoryId)
    if (hasCurrentStory) {
      return
    }
    const initialStory = stories.find(story => story.id === 'default') ?? stories[0]
    if (initialStory) {
      setActiveStory(initialStory.id)
    }
  }, [activeStoryId, setActiveStory, stories])

  if (stories.length === 0) {
    return null
  }

  return (
    <Toolbar
      className={cx(className)}
      colorVariant="secondary"
      id="editor-context-bar"
      inset={{ default: 'insetMd' }}
      style={{
        borderBottom: '1px solid var(--pf-t--global--border--color--subtle)',
      }}
    >
      <ToolbarContent>
        <ToolbarGroup>
          <ToolbarItem style={{ color: 'var(--pf-v6-global--Color--200)', fontSize: 'var(--pf-t--global--font--size--body--sm)' }}>
            States
          </ToolbarItem>
          {stories.map(story => (
            <ToolbarItem key={story.id}>
              <Button
                variant={activeStoryId === story.id ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setActiveStory(story.id)}
              >
                {story.name}
              </Button>
            </ToolbarItem>
          ))}
        </ToolbarGroup>
      </ToolbarContent>
    </Toolbar>
  )
}
