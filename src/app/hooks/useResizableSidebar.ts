import type { RefObject } from 'react'
import { useEffect, useRef, useState } from 'react'

export interface UseResizableSidebarOptions {
  layoutRef: RefObject<HTMLDivElement | null>
  defaultWidth?: number
  minWidth?: number
  mainMinWidth?: number
}

export interface UseResizableSidebarResult {
  isDesktopLayout: boolean
  sidebarWidth: number
  handleResizeStart: (event: React.PointerEvent<HTMLDivElement>) => void
}

const DEFAULT_SIDEBAR_WIDTH = 450
const DEFAULT_SIDEBAR_MIN_WIDTH = 320
const DEFAULT_MAIN_MIN_WIDTH = 420

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function useResizableSidebar(options: UseResizableSidebarOptions): UseResizableSidebarResult {
  const {
    layoutRef,
    defaultWidth = DEFAULT_SIDEBAR_WIDTH,
    minWidth = DEFAULT_SIDEBAR_MIN_WIDTH,
    mainMinWidth = DEFAULT_MAIN_MIN_WIDTH,
  } = options

  const [isDesktopLayout, setIsDesktopLayout] = useState(() => window.matchMedia('(min-width: 1024px)').matches)
  const [sidebarWidth, setSidebarWidth] = useState(defaultWidth)
  const sidebarWidthRef = useRef(defaultWidth)

  const getMaxSidebarWidth = () => {
    const layoutWidth = layoutRef.current?.getBoundingClientRect().width ?? window.innerWidth
    return Math.max(minWidth, layoutWidth - mainMinWidth)
  }

  const setWidth = (width: number) => {
    sidebarWidthRef.current = width
    setSidebarWidth(width)
  }

  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDesktopLayout || event.button !== 0) {
      return
    }

    event.preventDefault()

    const handle = event.currentTarget
    handle.setPointerCapture(event.pointerId)

    const startX = event.clientX
    const startWidth = sidebarWidthRef.current
    const maxWidth = getMaxSidebarWidth()

    const overlay = document.createElement('div')
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;cursor:col-resize'
    document.body.appendChild(overlay)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    let rafId: number | null = null
    let lastX = startX
    let done = false

    const commitWidth = () => {
      rafId = null
      setWidth(clamp(startWidth + (startX - lastX), minWidth, maxWidth))
    }

    const onMove = (e: PointerEvent) => {
      lastX = e.clientX
      rafId ??= requestAnimationFrame(commitWidth)
    }

    const cleanup = () => {
      if (done) {
        return
      }
      done = true
      handle.removeEventListener('pointermove', onMove)
      handle.removeEventListener('pointerup', cleanup)
      handle.removeEventListener('lostpointercapture', cleanup)
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
      setWidth(clamp(startWidth + (startX - lastX), minWidth, maxWidth))
      overlay.remove()
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    handle.addEventListener('pointermove', onMove)
    handle.addEventListener('pointerup', cleanup)
    handle.addEventListener('lostpointercapture', cleanup)
  }

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const handleLayoutModeChange = (event: MediaQueryListEvent) => setIsDesktopLayout(event.matches)
    mediaQuery.addEventListener('change', handleLayoutModeChange)
    return () => {
      mediaQuery.removeEventListener('change', handleLayoutModeChange)
    }
  }, [])

  useEffect(() => {
    if (!isDesktopLayout) {
      return
    }

    const clampWidth = () => {
      const maxWidth = getMaxSidebarWidth()
      setWidth(clamp(sidebarWidthRef.current, minWidth, maxWidth))
    }

    clampWidth()
    window.addEventListener('resize', clampWidth)
    return () => window.removeEventListener('resize', clampWidth)
  }, [getMaxSidebarWidth, isDesktopLayout, minWidth, setWidth])

  return {
    isDesktopLayout,
    sidebarWidth,
    handleResizeStart,
  }
}
