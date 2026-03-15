import type { CSSProperties } from 'react'
import { Bullseye, Spinner, Stack, StackItem } from '@patternfly/react-core'
import { useEffect, useRef, useState } from 'react'

interface LoadingScreenProps {
  ariaLabel?: string
  message?: string
  showIndicator?: boolean
  size?: 'md' | 'lg' | 'xl'
  style?: CSSProperties
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLoadingIndicatorVisibility(isLoading: boolean): boolean {
  const [isVisible, setIsVisible] = useState(false)
  const shownAtRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isLoading) {
      if (!isVisible) {
        return
      }

      const elapsed = shownAtRef.current === null ? 0 : Date.now() - shownAtRef.current
      const hideTimer = window.setTimeout(() => {
        shownAtRef.current = null
        setIsVisible(false)
      }, Math.max(0, 2000 - elapsed))

      return () => {
        window.clearTimeout(hideTimer)
      }
    }

    if (isVisible) {
      return
    }

    const showTimer = window.setTimeout(() => {
      shownAtRef.current = Date.now()
      setIsVisible(true)
    }, 1000)

    return () => {
      window.clearTimeout(showTimer)
    }
  }, [isLoading, isVisible])

  return isVisible
}

export default function LoadingScreen({
  ariaLabel = 'Loading editor',
  message = 'Loading editor...',
  showIndicator = true,
  size = 'xl',
  style,
}: LoadingScreenProps) {
  return (
    <Bullseye
      style={{
        height: '100%',
        flex: 1,
        backgroundColor: 'var(--pf-t--global--background--color--primary--default)',
        ...style,
      }}
    >
      {showIndicator && (
        <Stack hasGutter style={{ alignItems: 'center' }}>
          <StackItem>
            <Spinner size={size} aria-label={ariaLabel} />
          </StackItem>
          <StackItem>
            <span>{message}</span>
          </StackItem>
        </Stack>
      )}
    </Bullseye>
  )
}
