import { Button } from '@patternfly/react-core'
import { useEffect } from 'react'
import { useDarkModeState } from '../features/editor/use-editor'
import { getVariantScenarioOptions } from '../features/preview/load-generated'
import { usePreviewContext } from '../features/preview/use-preview-context'
import { cx } from '../styles/cx'

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
    <div
      className={cx(
        'context-bar flex items-center gap-2 px-3 py-2',
        'bg-[var(--pf-v6-global--BackgroundColor--200)]',
        !isDarkMode && 'border-[var(--pf-v6-global--BorderColor--100)]',
        className,
      )}
      style={{ overflowX: 'auto' }}
    >
      <span
        className="text-sm flex-shrink-0"
        style={{ color: 'var(--pf-v6-global--Color--200)' }}
      >
        States
      </span>
      <div className="flex items-center gap-1 flex-wrap">
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
      </div>
    </div>
  )
}
