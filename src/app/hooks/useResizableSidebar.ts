import type { RefObject } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseResizableSidebarOptions {
  defaultWidth?: number
  minWidth?: number
  mainMinWidth?: number
  layoutRef: RefObject<HTMLDivElement | null>
}

export interface UseResizableSidebarResult {
  sidebarRef: RefObject<HTMLDivElement | null>
  isDesktopLayout: boolean
  handleResizeStart: (event: React.PointerEvent<HTMLDivElement>) => void
}

const DEFAULT_SIDEBAR_WIDTH = 450
const DEFAULT_MIN_WIDTH = 320
const DEFAULT_MAIN_MIN_WIDTH = 420

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function useResizableSidebar(options: UseResizableSidebarOptions): UseResizableSidebarResult {
  const {
    defaultWidth = DEFAULT_SIDEBAR_WIDTH,
    minWidth = DEFAULT_MIN_WIDTH,
    mainMinWidth = DEFAULT_MAIN_MIN_WIDTH,
    layoutRef,
  } = options

  const [isDesktopLayout, setIsDesktopLayout] = useState(false)
  const sidebarRef = useRef<HTMLDivElement | null>(null)
  const sidebarWidthRef = useRef(defaultWidth)
  const resizeStateRef = useRef<{ startX: number, startWidth: number, maxWidth: number } | null>(null)
  const resizeControllerRef = useRef<AbortController | null>(null)
  const rafRef = useRef<number | null>(null)
  const pendingPointerXRef = useRef<number | null>(null)

  const getMaxWidth = useCallback(() => {
    const layoutWidth = layoutRef.current?.getBoundingClientRect().width ?? window.innerWidth
    return Math.max(minWidth, layoutWidth - mainMinWidth)
  }, [layoutRef, minWidth, mainMinWidth])

  const removeResizeListeners = useCallback(() => {
    resizeControllerRef.current?.abort()
    resizeControllerRef.current = null
  }, [])

  const applySidebarWidth = useCallback((nextWidth: number) => {
    sidebarWidthRef.current = nextWidth
    if (sidebarRef.current) {
      sidebarRef.current.style.width = `${nextWidth}px`
    }
  }, [])

  const stopResize = useCallback(() => {
    removeResizeListeners()
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    pendingPointerXRef.current = null
    resizeStateRef.current = null
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [removeResizeListeners])

  const applyWidthFromPointerX = useCallback((clientX: number) => {
    const resizeState = resizeStateRef.current
    if (!resizeState) {
      return
    }

    const deltaX = resizeState.startX - clientX
    const nextWidth = clamp(
      resizeState.startWidth + deltaX,
      minWidth,
      resizeState.maxWidth,
    )
    applySidebarWidth(nextWidth)
  }, [applySidebarWidth, minWidth])

  const handleResizeMove = useCallback((event: PointerEvent) => {
    if (!resizeStateRef.current) {
      return
    }

    pendingPointerXRef.current = event.clientX
    if (rafRef.current !== null) {
      return
    }

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const pointerX = pendingPointerXRef.current
      if (pointerX !== null) {
        applyWidthFromPointerX(pointerX)
      }
    })
  }, [applyWidthFromPointerX])

  const handleResizeEnd = useCallback(() => {
    const pointerX = pendingPointerXRef.current
    if (pointerX !== null) {
      applyWidthFromPointerX(pointerX)
    }
    stopResize()
    applySidebarWidth(sidebarWidthRef.current)
  }, [applySidebarWidth, applyWidthFromPointerX, stopResize])

  const handleResizeStart = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDesktopLayout || event.button !== 0) {
      return
    }

    event.preventDefault()
    removeResizeListeners()
    const maxWidth = getMaxWidth()
    resizeStateRef.current = {
      startX: event.clientX,
      startWidth: sidebarWidthRef.current,
      maxWidth,
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    const controller = new AbortController()
    resizeControllerRef.current = controller
    window.addEventListener('pointermove', handleResizeMove, { signal: controller.signal })
    window.addEventListener('pointerup', handleResizeEnd, { signal: controller.signal })
    window.addEventListener('pointercancel', handleResizeEnd, { signal: controller.signal })
  }, [getMaxWidth, handleResizeEnd, handleResizeMove, isDesktopLayout, removeResizeListeners])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const applyLayoutMode = () => {
      // Synchronizing with external browser state (media query)
      setIsDesktopLayout(mediaQuery.matches)
    }
    applyLayoutMode()
    mediaQuery.addEventListener('change', applyLayoutMode)
    return () => {
      mediaQuery.removeEventListener('change', applyLayoutMode)
    }
  }, [])

  useEffect(() => {
    if (!isDesktopLayout) {
      stopResize()
      if (sidebarRef.current) {
        sidebarRef.current.style.width = ''
      }
      return
    }

    const clampWidth = () => {
      const maxWidth = getMaxWidth()
      applySidebarWidth(clamp(sidebarWidthRef.current, minWidth, maxWidth))
    }

    clampWidth()
    window.addEventListener('resize', clampWidth)
    return () => {
      window.removeEventListener('resize', clampWidth)
    }
  }, [applySidebarWidth, getMaxWidth, isDesktopLayout, minWidth, stopResize])

  useEffect(() => {
    return () => {
      stopResize()
    }
  }, [stopResize])

  return {
    sidebarRef,
    isDesktopLayout,
    handleResizeStart,
  }
}
