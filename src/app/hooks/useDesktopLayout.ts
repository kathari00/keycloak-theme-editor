import { useEffect, useState } from 'react'

export function useDesktopLayout(): boolean {
  const [isDesktopLayout, setIsDesktopLayout] = useState(() => window.matchMedia('(min-width: 1024px)').matches)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const handleLayoutModeChange = (event: MediaQueryListEvent) => {
      setIsDesktopLayout(event.matches)
    }
    mediaQuery.addEventListener('change', handleLayoutModeChange)
    return () => {
      mediaQuery.removeEventListener('change', handleLayoutModeChange)
    }
  }, [])

  return isDesktopLayout
}
