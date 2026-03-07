import { Button, Flex, FlexItem } from '@patternfly/react-core'
import { useEffect } from 'react'
import { useDarkModeState } from '../features/editor/hooks/use-editor'
import { usePreviewContext } from '../features/preview/hooks/use-preview-context'
import { getVariantScenarioOptions } from '../features/preview/load-generated'
import { cx } from '../lib/cx'

interface ContextBarProps {
  className?: string
}

export default function ContextBar({ className }: ContextBarProps) {
  const { isDarkMode } = useDarkModeState()
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
    <Flex
      className={cx(className)}
      alignItems={{ default: 'alignItemsCenter' }}
      spaceItems={{ default: 'spaceItemsSm' }}
      style={{
        overflowX: 'auto',
        padding: 'var(--pf-t--global--spacer--sm) var(--pf-t--global--spacer--md)',
        backgroundColor: 'var(--pf-v6-global--BackgroundColor--200)',
        borderBottom: !isDarkMode ? '1px solid var(--pf-v6-global--BorderColor--100)' : undefined,
      }}
    >
      <FlexItem style={{ color: 'var(--pf-v6-global--Color--200)', fontSize: 'var(--pf-t--global--font--size--body--sm)' }}>
        States
      </FlexItem>
      <Flex flexWrap={{ default: 'wrap' }} spaceItems={{ default: 'spaceItemsXs' }}>
        {stories.map(story => (
          <Button
            key={story.id}
            variant={activeStoryId === story.id ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setActiveStory(story.id)}
          >
            {story.name}
          </Button>
        ))}
      </Flex>
    </Flex>
  )
}
