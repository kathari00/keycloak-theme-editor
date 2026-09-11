import type { FrameworkBinding } from '../../editor/lib/framework-bindings/types'
import type { LayoutId } from '../../editor/lib/layouts/types'
import type { ThemeDocument } from '../../theme-document'
import { Bullseye, Spinner } from '@patternfly/react-core'
import { useEffect, useMemo, useState } from 'react'
import { useDarkModeState, usePreviewState } from '../../editor/hooks/use-editor'
import { frameworkCustomCssPath } from '../../editor/lib/css-files'
import { useFrameworkBinding } from '../../editor/lib/framework-bindings/use-framework-binding'
import { getCachedLayoutBinding, useLayoutBindingsReady } from '../../editor/lib/layouts/registry'
import { getThemePreviewStylesPath } from '../../presets/theme-paths'
import { themeDocumentToPreviewCss, useThemeDocument } from '../../theme-document'
import patternflyV5PreviewStylesheetUrl from '../assets/patternfly-v5-preview.css?url'
import { usePreviewRuntime } from '../hooks/use-preview-context'
import { usePreviewLocalePages } from '../hooks/usePreviewLocalePages'
import { usePreviewMessages } from '../hooks/usePreviewMessages'
import { syncPreviewDarkModeClasses } from '../lib/dark-mode-classes'
import { getEventElement } from '../lib/event-target-utils'
import { applyFrameworkClassOverlay, setThemeDesignStylesheetDisabled } from '../lib/framework-class-overlay'
import { applyPreviewMessageOverrides } from '../lib/preview-message-catalog'
import { applyQuickStartTemplateContent } from '../lib/quickstart-template-content'
import { sanitizePreviewHtml } from '../lib/sanitize-preview-html'
import { createElementSelector } from '../lib/selector-utils'
import { getVariantPages, resolveStateHtml } from '../load-generated'

const deviceWidthMap = { desktop: '100%', tablet: '900px', mobile: '430px' } as const
interface PreviewStyleParams {
  doc: Document
  themeStylesPath: string
  stylesCss: string
  frameworkOverridesCss: string
  quickStartBaseCss: string
  googleFontUrls: string[]
  quickStartOverridesCss: string
  uploadedFontsCss: string
  uploadedImagesCss: string
  appliedAssetsCss: string
  darkModeClasses?: readonly string[]
  isDarkMode: boolean
  frameworkBinding: FrameworkBinding
  layoutId: LayoutId
}

interface PreviewShellProps {
  onHorizontalSwipe?: () => void
}

function ensureStyle(doc: Document, id: string, css: string): void {
  let style = doc.getElementById(id) as HTMLStyleElement | null
  if (!style) {
    style = doc.createElement('style')
    style.id = id
    doc.head.appendChild(style)
  }

  style.textContent = css
}

function ensureBaseHref(doc: Document, id: string, href: string): void {
  let base = doc.getElementById(id) as HTMLBaseElement | null
  if (!base) {
    base = doc.createElement('base')
    base.id = id
    doc.head.prepend(base)
  }

  base.href = href
}

function ensureStylesheetLink(doc: Document, id: string, href: string): void {
  let link = doc.getElementById(id) as HTMLLinkElement | null
  if (!link) {
    link = doc.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    doc.head.appendChild(link)
  }

  link.href = href
}

/**
 * Ensures <link> elements exist for each Google Font URL.
 */
function syncGoogleFontLinks(doc: Document, urls: string[]): void {
  const activeIds = new Set<string>()

  for (const url of urls) {
    const linkId = `preview-google-font-${hashUrl(url)}`
    activeIds.add(linkId)
    if (doc.getElementById(linkId))
      continue

    const link = doc.createElement('link')
    link.id = linkId
    link.rel = 'stylesheet'
    link.setAttribute('data-google-font', '')
    link.href = url
    doc.head.appendChild(link)
  }

  doc.querySelectorAll('link[data-google-font]').forEach((el) => {
    if (!activeIds.has(el.id))
      el.remove()
  })
}

function hashUrl(url: string): string {
  let hash = 0
  for (let i = 0; i < url.length; i++) {
    hash = ((hash << 5) - hash + url.charCodeAt(i)) | 0
  }
  return (hash >>> 0).toString(36)
}

function preparePreviewSrcDoc(pageHtml: string, themeStylesPath: string): { html: string, version: string } {
  const doc = new DOMParser().parseFromString(sanitizePreviewHtml(pageHtml), 'text/html')
  const version = hashUrl(`${themeStylesPath}\0${pageHtml}`)

  // These resources must be present while srcDoc is parsed. The iframe load
  // event then waits for them instead of briefly painting the bare document
  // before PreviewShell injects them.
  ensureBaseHref(doc, 'preview-theme-base', new URL(themeStylesPath, window.location.href).toString())
  ensureStylesheetLink(doc, 'preview-patternfly-v5', new URL(patternflyV5PreviewStylesheetUrl, window.location.href).toString())
  doc.documentElement.dataset.previewDocumentVersion = version

  return { html: `<!doctype html>${doc.documentElement.outerHTML}`, version }
}

function applyPreviewStyles(params: PreviewStyleParams): void {
  const {
    doc,
    quickStartBaseCss,
    stylesCss,
    frameworkOverridesCss,
    quickStartOverridesCss,
    uploadedFontsCss,
    uploadedImagesCss,
    appliedAssetsCss,
    darkModeClasses,
    isDarkMode,
    frameworkBinding,
    layoutId,
  } = params

  const layoutBinding = getCachedLayoutBinding(layoutId)

  const styles = [
    ['preview-quick-start-base', quickStartBaseCss],
    ['preview-theme-styles-inline', stylesCss],
    ['preview-quick-start-overrides', quickStartOverridesCss],
    ['preview-uploaded-fonts', uploadedFontsCss],
    ['preview-uploaded-images', uploadedImagesCss],
    ['preview-applied-assets', appliedAssetsCss],
    ['preview-framework-css', frameworkBinding.frameworkCss],
    ['preview-framework-binding', frameworkBinding.bindingCss],
    ['preview-layout-css', layoutBinding.css],
    ['preview-framework-overrides', frameworkOverridesCss],
    ['preview-selection-outline', '[data-preview-selected="true"] { outline: 2px solid #0b57d0 !important; outline-offset: 2px !important; }'],
  ] as const

  for (const [id, css] of styles) {
    ensureStyle(doc, id, css)
  }

  applyFrameworkClassOverlay(doc, frameworkBinding)
  setThemeDesignStylesheetDisabled(doc, frameworkBinding.id !== 'native')
  syncPreviewDarkModeClasses(doc, darkModeClasses, isDarkMode)
}

function syncPreviewDocumentStyles(params: PreviewStyleParams): void {
  const { doc, themeStylesPath, googleFontUrls } = params

  if (!doc.head || !doc.body)
    return

  ensureBaseHref(doc, 'preview-theme-base', new URL(themeStylesPath, window.location.href).toString())
  ensureStylesheetLink(doc, 'preview-patternfly-v5', new URL(patternflyV5PreviewStylesheetUrl, window.location.href).toString())
  syncGoogleFontLinks(doc, googleFontUrls)
  applyPreviewStyles(params)
}

/**
 * The text the preview should show for the language being previewed. A blank
 * translation means "not translated yet", so it falls back to the base value -
 * the same rule the exported bundles follow.
 */
function resolveLocalizedContent(themeDocument: ThemeDocument, localeTag: string) {
  const { quickSettings } = themeDocument
  const overrides = themeDocument.quickStartContentByLocale[localeTag] ?? {}

  return {
    infoMessage: overrides.infoMessage?.trim() || quickSettings.infoMessage,
    imprintLabel: overrides.imprintLabel?.trim() || quickSettings.imprintLabel,
    dataProtectionLabel: overrides.dataProtectionLabel?.trim() || quickSettings.dataProtectionLabel,
  }
}

function isLegalInfoLink(anchor: HTMLAnchorElement): boolean {
  return anchor.matches('[data-kc-state="imprint-link"], [data-kc-state="data-protection-link"], #kc-imprint-link, #kc-data-protection-link')
}

export function PreviewShell({ onHorizontalSwipe }: PreviewShellProps = {}) {
  useLayoutBindingsReady()
  const { activeVariantId, activePageId, activeStateId, selectedNodeId, previewReady, iframeRef, setPreviewReady, selectNode } = usePreviewRuntime()
  const { themeDocument, resolvedThemeId, resolvedTheme, isPresetTheme } = useThemeDocument()
  const { isDarkMode } = useDarkModeState()
  const { deviceId, previewLocaleTag } = usePreviewState()
  const frameworkBinding = useFrameworkBinding(themeDocument.frameworkId, themeDocument.bootstrapVariantId)
  const [frameLoadVersion, setFrameLoadVersion] = useState(0)
  const [loadedDocumentVersion, setLoadedDocumentVersion] = useState<string | null>(null)
  const activeLocaleTag = usePreviewLocalePages(previewLocaleTag)

  const variantPages = getVariantPages(activeVariantId, activeLocaleTag)
  const fallbackPageId = variantPages['login.html']
    ? 'login.html'
    : Object.keys(variantPages).find(pageId => pageId.endsWith('.html') && pageId !== 'cli_splash.html') || 'login.html'
  const effectivePageId = variantPages[activePageId] ? activePageId : fallbackPageId
  const pageHtml = resolveStateHtml({
    variantId: activeVariantId,
    pageId: effectivePageId,
    stateId: activeStateId,
    localeTag: activeLocaleTag,
  }) || variantPages[effectivePageId] || '<!doctype html><html><body></body></html>'
  const themeStylesPath = getThemePreviewStylesPath(resolvedThemeId)
  const messageOverrides = usePreviewMessages({
    reloadVersion: frameLoadVersion,
    localeTag: activeLocaleTag,
  })
  const editorCss = themeDocumentToPreviewCss(themeDocument)
  const quickSettings = themeDocument.quickSettings
  const localizedContent = useMemo(
    () => resolveLocalizedContent(themeDocument, activeLocaleTag),
    [themeDocument, activeLocaleTag],
  )
  // A framework binding replaces the preset's own hand-authored design with the framework's
  // own look rather than layering under it, so skip the theme's own stylesheet once active.
  const effectiveStylesCss = themeDocument.frameworkId === 'native' ? themeDocument.stylesCss : ''
  const customCssPath = frameworkCustomCssPath(themeDocument.frameworkId)
  const frameworkOverridesCss = customCssPath
    ? themeDocument.stylesCssFiles[customCssPath] ?? ''
    : ''

  const editorStyleParams = useMemo(() => ({
    quickStartBaseCss: themeDocument.isPresetTheme ? themeDocument.quickStartCss : '',
    googleFontUrls: editorCss.googleFontUrls,
    quickStartOverridesCss: editorCss.quickStartCss,
    uploadedFontsCss: editorCss.uploadedFontsCss,
    uploadedImagesCss: editorCss.uploadedImagesCss,
    appliedAssetsCss: editorCss.appliedAssetsCss,
    frameworkBinding,
    frameworkOverridesCss,
    layoutId: themeDocument.layoutId,
  }), [themeDocument.isPresetTheme, themeDocument.quickStartCss, frameworkBinding, frameworkOverridesCss, themeDocument.layoutId, editorCss.googleFontUrls, editorCss.quickStartCss, editorCss.uploadedFontsCss, editorCss.uploadedImagesCss, editorCss.appliedAssetsCss])

  const preparedSrcDoc = useMemo(
    () => preparePreviewSrcDoc(pageHtml, themeStylesPath),
    [pageHtml, themeStylesPath],
  )
  const srcDoc = preparedSrcDoc.html
  const srcDocVersion = preparedSrcDoc.version

  useEffect(() => {
    setPreviewReady(false)
  }, [srcDoc, setPreviewReady])
  // Page changes are already local iframe loads. Do not apply the app-start
  // indicator's one-second delay and two-second minimum visibility here.
  const isCurrentDocumentReady = previewReady && loadedDocumentVersion === srcDocVersion
  const showLoadingIndicator = !isCurrentDocumentReady

  const onFrameLoad = () => {
    const doc = iframeRef.current?.contentDocument
    if (!doc)
      return

    syncPreviewDocumentStyles({
      doc,
      themeStylesPath,
      stylesCss: effectiveStylesCss,
      ...editorStyleParams,
      darkModeClasses: resolvedTheme?.darkModeClasses,
      isDarkMode,
    })

    // Ignore a late load event from a document that has already been replaced.
    if (doc.documentElement.dataset.previewDocumentVersion !== srcDocVersion)
      return

    setLoadedDocumentVersion(srcDocVersion)
    setPreviewReady(true)
    setFrameLoadVersion(version => version + 1)
  }

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument
    if (!doc)
      return

    syncPreviewDocumentStyles({
      doc,
      themeStylesPath,
      stylesCss: effectiveStylesCss,
      ...editorStyleParams,
      darkModeClasses: resolvedTheme?.darkModeClasses,
      isDarkMode,
    })
    if (isPresetTheme) {
      applyQuickStartTemplateContent(doc, {
        showClientName: quickSettings.showClientName,
        showRealmName: quickSettings.showRealmName,
        infoMessage: localizedContent.infoMessage,
        imprintUrl: quickSettings.imprintUrl,
        dataProtectionUrl: quickSettings.dataProtectionUrl,
        imprintLabel: localizedContent.imprintLabel,
        dataProtectionLabel: localizedContent.dataProtectionLabel,
        noAccountMessage: messageOverrides.noAccount,
        doRegisterLabel: messageOverrides.doRegister,
      })
    }
  }, [editorStyleParams, effectiveStylesCss, frameLoadVersion, iframeRef, isDarkMode, isPresetTheme, localizedContent.dataProtectionLabel, localizedContent.imprintLabel, localizedContent.infoMessage, messageOverrides.doRegister, messageOverrides.noAccount, quickSettings.dataProtectionUrl, quickSettings.imprintUrl, quickSettings.showClientName, quickSettings.showRealmName, resolvedTheme?.darkModeClasses, themeStylesPath])

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument
    if (!doc)
      return

    void applyPreviewMessageOverrides(
      doc,
      activeLocaleTag,
      themeDocument.quickStartContentByLocale[activeLocaleTag] ?? {},
    )
  }, [activeLocaleTag, frameLoadVersion, iframeRef, themeDocument.quickStartContentByLocale])

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument
    if (!doc)
      return

    let touchStart: { x: number, y: number } | null = null
    const onClick = (event: MouseEvent) => {
      const target = getEventElement(event.target)
      const localeTrigger = target?.closest<HTMLButtonElement>('#kc-current-locale-link[aria-expanded]')
      const expandedLocaleTrigger = doc.querySelector<HTMLButtonElement>('#kc-current-locale-link[aria-expanded="true"]')
      if (localeTrigger) {
        localeTrigger.setAttribute('aria-expanded', String(localeTrigger.getAttribute('aria-expanded') !== 'true'))
        event.preventDefault()
      }
      else if (expandedLocaleTrigger && !target?.closest('.kcLocaleDropDownClass')) {
        expandedLocaleTrigger.setAttribute('aria-expanded', 'false')
      }
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null
      if (anchor) {
        const href = anchor.getAttribute('href')?.trim() || ''
        if (isLegalInfoLink(anchor) && (href.startsWith('http://') || href.startsWith('https://')))
          window.open(href, '_blank', 'noopener,noreferrer')
        event.preventDefault()
      }
      // In an editor, selecting a label must not dispatch the browser's
      // follow-up click to its associated input and replace the selection.
      if (target?.closest('label'))
        event.preventDefault()
      const hit = target?.closest('body *') as Element | null
      selectNode(hit ? createElementSelector(hit) : null)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape')
        return
      const localeTrigger = doc.querySelector<HTMLButtonElement>('#kc-current-locale-link[aria-expanded="true"]')
      if (!localeTrigger)
        return
      localeTrigger.setAttribute('aria-expanded', 'false')
      localeTrigger.focus()
      event.preventDefault()
    }

    const onSubmit = (event: Event) => event.preventDefault()
    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0]
      touchStart = touch ? { x: touch.clientX, y: touch.clientY } : null
    }
    const onTouchEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0]
      if (!touchStart || !touch)
        return

      const deltaX = touch.clientX - touchStart.x
      const deltaY = touch.clientY - touchStart.y
      touchStart = null
      if (Math.abs(deltaX) >= 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25)
        onHorizontalSwipe?.()
    }
    const onTouchCancel = () => {
      touchStart = null
    }

    doc.addEventListener('click', onClick, true)
    doc.addEventListener('keydown', onKeyDown, true)
    doc.addEventListener('submit', onSubmit, true)
    if (onHorizontalSwipe) {
      doc.addEventListener('touchstart', onTouchStart, { passive: true })
      doc.addEventListener('touchend', onTouchEnd, { passive: true })
      doc.addEventListener('touchcancel', onTouchCancel, { passive: true })
    }

    return () => {
      doc.removeEventListener('click', onClick, true)
      doc.removeEventListener('keydown', onKeyDown, true)
      doc.removeEventListener('submit', onSubmit, true)
      if (onHorizontalSwipe) {
        doc.removeEventListener('touchstart', onTouchStart)
        doc.removeEventListener('touchend', onTouchEnd)
        doc.removeEventListener('touchcancel', onTouchCancel)
      }
    }
  }, [frameLoadVersion, iframeRef, onHorizontalSwipe, selectNode])

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument
    if (!doc)
      return

    doc.querySelectorAll('[data-preview-selected=\"true\"]').forEach(el => el.removeAttribute('data-preview-selected'))
    const element = selectedNodeId ? doc.querySelector(selectedNodeId) : null
    if (element)
      element.setAttribute('data-preview-selected', 'true')
  }, [frameLoadVersion, iframeRef, selectedNodeId])

  return (
    <div style={{ height: '100%' }}>
      {showLoadingIndicator && (
        <Bullseye style={{ height: '100%' }}>
          <Spinner size="lg" aria-label="Loading preview" />
        </Bullseye>
      )}
      <div
        className="preview-shell__viewport"
        style={{
          width: deviceWidthMap[(deviceId as keyof typeof deviceWidthMap) || 'desktop'],
          maxWidth: '100%',
          height: showLoadingIndicator ? 0 : '100%',
          overflow: 'hidden',
          marginInline: 'auto',
          transition: 'width 200ms ease',
        }}
      >
        <iframe
          ref={iframeRef}
          onLoad={onFrameLoad}
          srcDoc={srcDoc}
          title="Keycloak Preview"
          className="preview-shell__frame"
          style={{
            width: '100%',
            height: '100%',
            minHeight: 0,
            border: 0,
            background: 'transparent',
            visibility: isCurrentDocumentReady ? 'visible' : 'hidden',
          }}
          sandbox="allow-forms allow-same-origin"
        />
      </div>
    </div>
  )
}
