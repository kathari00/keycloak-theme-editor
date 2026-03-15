import { Bullseye, Spinner } from '@patternfly/react-core'
import { useEffect, useState } from 'react'
import { useLoadingIndicatorVisibility } from '../../../app/LoadingScreen'
import { useDarkModeState, usePresetState, usePreviewState, useQuickStartColorsState, useQuickStartContentState, useStylesCssState, useUploadedAssetsState } from '../../editor/hooks/use-editor'
import { resolveThemeIdFromConfig, useThemeConfig } from '../../presets/queries'
import { getThemePreviewStylesPath } from '../../presets/theme-paths'
import { usePreviewRuntime } from '../hooks/use-preview-context'
import { usePreviewMessages } from '../hooks/usePreviewMessages'
import { computePreviewCss } from '../lib/compute-preview-css'
import { syncPreviewDarkModeClasses } from '../lib/dark-mode-classes'
import { getEventElement } from '../lib/event-target-utils'
import { applyQuickStartTemplateContent } from '../lib/quickstart-template-content'
import { sanitizePreviewHtml } from '../lib/sanitize-preview-html'
import { createElementSelector } from '../lib/selector-utils'
import { getVariantPages, resolveStateHtml } from '../load-generated'

const deviceWidthMap = { desktop: '100%', tablet: '900px', mobile: '430px' } as const
interface PreviewStyleParams {
  doc: Document
  themeStylesPath: string
  stylesCss: string
  quickStartBaseCss: string
  quickStartOverridesCss: string
  uploadedFontsCss: string
  uploadedImagesCss: string
  appliedAssetsCss: string
  darkModeClasses?: readonly string[]
  isDarkMode: boolean
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

function syncPreviewDocumentStyles(params: PreviewStyleParams): void {
  const {
    doc,
    themeStylesPath,
    stylesCss,
    quickStartBaseCss,
    quickStartOverridesCss,
    uploadedFontsCss,
    uploadedImagesCss,
    appliedAssetsCss,
    darkModeClasses,
    isDarkMode,
  } = params

  if (!doc.head || !doc.body)
    return

  ensureBaseHref(doc, 'preview-theme-base', new URL(themeStylesPath, window.location.href).toString())
  const styles = [
    ['preview-quick-start-base', quickStartBaseCss],
    ['preview-theme-styles-inline', stylesCss],
    ['preview-quick-start-overrides', quickStartOverridesCss],
    ['preview-uploaded-fonts', uploadedFontsCss],
    ['preview-uploaded-images', uploadedImagesCss],
    ['preview-applied-assets', appliedAssetsCss],
    ['preview-selection-outline', '[data-preview-selected="true"] { outline: 2px solid #0b57d0 !important; outline-offset: 2px !important; }'],
  ] as const

  for (const [id, css] of styles) {
    ensureStyle(doc, id, css)
  }

  syncPreviewDarkModeClasses(doc, darkModeClasses, isDarkMode)
}

function isLegalInfoLink(anchor: HTMLAnchorElement): boolean {
  return anchor.matches('[data-kc-state="imprint-link"], [data-kc-state="data-protection-link"], #kc-imprint-link, #kc-data-protection-link')
}

export function PreviewShell() {
  const { activeVariantId, activePageId, activeStateId, selectedNodeId, previewReady, iframeRef, setPreviewReady, selectNode } = usePreviewRuntime()
  const { selectedThemeId } = usePresetState()
  const { stylesCss, themeQuickStartDefaults } = useStylesCssState()
  const colors = useQuickStartColorsState()
  const content = useQuickStartContentState()
  const assets = useUploadedAssetsState()
  const { isDarkMode } = useDarkModeState()
  const { deviceId } = usePreviewState()
  const themeConfig = useThemeConfig()
  const [frameLoadVersion, setFrameLoadVersion] = useState(0)

  const variantPages = getVariantPages(activeVariantId)
  const fallbackPageId = variantPages['login.html']
    ? 'login.html'
    : Object.keys(variantPages).find(pageId => pageId.endsWith('.html') && pageId !== 'cli_splash.html') || 'login.html'
  const effectivePageId = variantPages[activePageId] ? activePageId : fallbackPageId
  const pageHtml = resolveStateHtml({
    variantId: activeVariantId,
    pageId: effectivePageId,
    stateId: activeStateId,
  }) || variantPages[effectivePageId] || '<!doctype html><html><body></body></html>'
  const resolvedThemeId = resolveThemeIdFromConfig(themeConfig, selectedThemeId)
  const resolvedTheme = themeConfig.themes.find(theme => theme.id === resolvedThemeId)
  const themeStylesPath = getThemePreviewStylesPath(resolvedThemeId)
  const messageOverrides = usePreviewMessages({ reloadVersion: frameLoadVersion })
  const { quickStartCss, uploadedFontsCss, uploadedImagesCss, appliedAssetsCss } = computePreviewCss({
    primaryColor: colors.colorPresetPrimaryColor,
    secondaryColor: colors.colorPresetSecondaryColor,
    fontFamily: colors.colorPresetFontFamily,
    bgColor: colors.colorPresetBgColor,
    borderRadius: colors.colorPresetBorderRadius,
    cardShadow: colors.colorPresetCardShadow,
    headingFontFamily: colors.colorPresetHeadingFontFamily,
    showClientName: content.showClientName,
    showRealmName: content.showRealmName,
    infoMessage: content.infoMessage,
    imprintUrl: content.imprintUrl,
    dataProtectionUrl: content.dataProtectionUrl,
    uploadedAssets: assets.uploadedAssets,
    appliedAssets: assets.appliedAssets,
  })
  const srcDoc = sanitizePreviewHtml(pageHtml)

  useEffect(() => {
    setPreviewReady(false)
  }, [srcDoc, setPreviewReady])
  const showLoadingIndicator = useLoadingIndicatorVisibility(!previewReady)

  const onFrameLoad = () => {
    const doc = iframeRef.current?.contentDocument
    if (!doc)
      return

    syncPreviewDocumentStyles({
      doc,
      themeStylesPath,
      stylesCss,
      quickStartBaseCss: themeQuickStartDefaults,
      quickStartOverridesCss: quickStartCss,
      uploadedFontsCss,
      uploadedImagesCss,
      appliedAssetsCss,
      darkModeClasses: resolvedTheme?.darkModeClasses,
      isDarkMode,
    })

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
      stylesCss,
      quickStartBaseCss: themeQuickStartDefaults,
      quickStartOverridesCss: quickStartCss,
      uploadedFontsCss,
      uploadedImagesCss,
      appliedAssetsCss,
      darkModeClasses: resolvedTheme?.darkModeClasses,
      isDarkMode,
    })
    applyQuickStartTemplateContent(doc, {
      showClientName: content.showClientName,
      showRealmName: content.showRealmName,
      infoMessage: content.infoMessage,
      imprintUrl: content.imprintUrl,
      dataProtectionUrl: content.dataProtectionUrl,
      noAccountMessage: messageOverrides.noAccount,
      doRegisterLabel: messageOverrides.doRegister,
    })
  }, [appliedAssetsCss, content.dataProtectionUrl, content.imprintUrl, content.infoMessage, content.showClientName, content.showRealmName, frameLoadVersion, iframeRef, isDarkMode, messageOverrides.doRegister, messageOverrides.noAccount, quickStartCss, resolvedTheme?.darkModeClasses, stylesCss, themeQuickStartDefaults, themeStylesPath, uploadedFontsCss, uploadedImagesCss])

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument
    if (!doc)
      return

    const onClick = (event: MouseEvent) => {
      const target = getEventElement(event.target)
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null
      if (anchor) {
        const href = anchor.getAttribute('href')?.trim() || ''
        if (isLegalInfoLink(anchor) && (href.startsWith('http://') || href.startsWith('https://')))
          window.open(href, '_blank', 'noopener,noreferrer')
        event.preventDefault()
      }
      const hit = target?.closest('body *') as Element | null
      selectNode(hit ? createElementSelector(hit) : null)
    }

    const onSubmit = (event: Event) => event.preventDefault()
    doc.addEventListener('click', onClick, true)
    doc.addEventListener('submit', onSubmit, true)

    return () => {
      doc.removeEventListener('click', onClick, true)
      doc.removeEventListener('submit', onSubmit, true)
    }
  }, [frameLoadVersion, iframeRef, selectNode])

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
            visibility: previewReady ? 'visible' : 'hidden',
          }}
          sandbox="allow-forms allow-same-origin"
        />
      </div>
    </div>
  )
}
