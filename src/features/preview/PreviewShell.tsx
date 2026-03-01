import patternflyAddonsCssUrl from '@patternfly-v5/patternfly/patternfly-addons.css?url'
import patternflyCssUrl from '@patternfly-v5/patternfly/patternfly.min.css?url'
import { useEffect, useState } from 'react'
import {
  generateAppliedAssetsCSS,
  generateFontFaceCSS,
  generateImageCSSVars,
} from '../assets/font-css-generator'
import { buildQuickStartCss } from '../editor/quick-start-css'
import { useDarkModeState, usePresetState, usePreviewState, useQuickStartColorsState, useQuickStartContentState, useStylesCssState, useUploadedAssetsState } from '../editor/use-editor'
import { resolveThemeBaseIdFromConfig, resolveThemeIdFromConfig, useThemeConfig } from '../presets/queries'
import { getThemePreviewCssPath, getThemePreviewStylesPath, getThemeQuickStartCssPath } from '../presets/theme-paths'
import { themeResourcePath } from '../presets/types'
import { resolveOpenableLegalLinkUrl } from './legal-link-url'
import { getVariantPages, resolveScenarioHtml } from './load-generated'
import { readMessageProperty } from './message-properties'
import { applyQuickStartTemplateContent } from './quickstart-template-content'
import { sanitizePreviewHtml } from './sanitize-preview-html'
import { createElementSelector } from './selector-utils'
import { usePreviewRuntime } from './use-preview-context'

const deviceWidthMap: Record<'desktop' | 'tablet' | 'mobile', string> = {
  desktop: '100%',
  tablet: '900px',
  mobile: '430px',
}

function toEventElement(node: Node | null): Element | null {
  if (!node)
    return null
  if (node.nodeType === 1) {
    return node as Element
  }
  return node.parentElement
}

function isLegalInfoLink(anchor: HTMLAnchorElement): boolean {
  return anchor.matches('[data-kc-state="imprint-link"], [data-kc-state="data-protection-link"], #kc-imprint-link, #kc-data-protection-link')
}

function ensureStyle(doc: Document, id: string, css: string, insertBeforeId?: string) {
  const head = doc.head
  if (!head) {
    return
  }
  let styleEl = doc.getElementById(id) as HTMLStyleElement | null
  const insertBeforeElement = insertBeforeId ? doc.getElementById(insertBeforeId) : null
  if (!styleEl) {
    styleEl = doc.createElement('style')
    styleEl.id = id
    if (insertBeforeElement?.parentElement === head) {
      insertBeforeElement.before(styleEl)
    }
    else {
      head.appendChild(styleEl)
    }
  }
  else if (insertBeforeElement?.parentElement === head && styleEl !== insertBeforeElement) {
    insertBeforeElement.before(styleEl)
  }
  styleEl.textContent = css
}

function ensureBaseHref(doc: Document, id: string, href: string) {
  const head = doc.head
  if (!head) {
    return
  }
  let base = doc.getElementById(id) as HTMLBaseElement | null
  if (!base) {
    base = doc.createElement('base')
    base.id = id
    const firstStyleNode = head.querySelector('link[rel="stylesheet"], style')
    if (firstStyleNode?.parentElement === head) {
      firstStyleNode.before(base)
    }
    else {
      head.prepend(base)
    }
  }
  if (base.getAttribute('href') !== href) {
    base.setAttribute('href', href)
  }
}

function ensureLink(doc: Document, id: string, href: string) {
  const head = doc.head
  if (!head) {
    return
  }
  let link = doc.getElementById(id) as HTMLLinkElement | null
  if (!link) {
    link = doc.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    head.appendChild(link)
  }
  if (link.getAttribute('href') !== href) {
    link.setAttribute('href', href)
  }
}

function removeElementById(doc: Document, id: string) {
  doc.getElementById(id)?.remove()
}

function removeUpstreamThemeStylesheets(doc: Document) {
  const links = doc.querySelectorAll('link[rel="stylesheet"]')
  links.forEach((node) => {
    const link = node as HTMLLinkElement
    if (link.id.startsWith('preview-')) {
      return
    }
    if (link.href.includes('/keycloak-dev-resources/themes/')) {
      link.remove()
    }
  })
}

function syncPreviewDocumentStyles(params: {
  doc: Document
  isV2Theme: boolean
  themeQuickStartCssPath: string
  themeStylesPath: string
  themePreviewCssPath: string
  stylesCss: string
  quickStartOverridesCss: string
  uploadedFontsCss: string
  uploadedImagesCss: string
  appliedAssetsCss: string
  isDarkMode: boolean
}) {
  const {
    doc,
    isV2Theme,
    themeQuickStartCssPath,
    themeStylesPath,
    themePreviewCssPath,
    stylesCss,
    quickStartOverridesCss,
    uploadedFontsCss,
    uploadedImagesCss,
    appliedAssetsCss,
    isDarkMode,
  } = params

  if (!doc.head || !doc.body)
    return

  removeUpstreamThemeStylesheets(doc)

  if (isV2Theme) {
    // Scenario HTML can be a body fragment (no <html class="login-pf"> / no body id).
    // Normalize these markers so upstream v2 selectors apply consistently.
    doc.documentElement.classList.add('login-pf')
    if (!doc.body.id) {
      doc.body.id = 'keycloak-bg'
    }
  }
  else {
    doc.documentElement.classList.remove('login-pf')
    if (doc.body.id === 'keycloak-bg') {
      doc.body.removeAttribute('id')
    }
  }

  ensureLink(doc, 'preview-patternfly', patternflyCssUrl)
  if (isV2Theme) {
    ensureLink(doc, 'preview-patternfly-addons', patternflyAddonsCssUrl)
  }
  else {
    removeElementById(doc, 'preview-patternfly-addons')
  }
  removeElementById(doc, 'preview-theme-styles')
  const themeHref = new URL(themeStylesPath, window.location.href).toString()
  ensureBaseHref(doc, 'preview-theme-base', themeHref)
  ensureLink(doc, 'preview-theme-quick-start', themeQuickStartCssPath)
  ensureStyle(doc, 'preview-theme-styles-inline', stylesCss)
  // Legacy style nodes from earlier preview implementations can override v2 background vars.
  // Remove them on every sync so applied assets become source of truth immediately.
  removeElementById(doc, 'preview-theme-image-vars')
  removeElementById(doc, 'preview-v2-background')
  removeElementById(doc, 'preview-quick-start')
  ensureStyle(doc, 'preview-quick-start-overrides', quickStartOverridesCss)
  ensureLink(doc, 'preview-theme-preview-css', themePreviewCssPath)
  removeElementById(doc, 'preview-common-preview-css')
  ensureStyle(doc, 'preview-uploaded-fonts', uploadedFontsCss)
  ensureStyle(doc, 'preview-uploaded-images', uploadedImagesCss)
  ensureStyle(doc, 'preview-applied-assets', appliedAssetsCss)

  doc.documentElement.classList.toggle('pf-v5-theme-dark', isDarkMode)
  doc.body.classList.toggle('pf-v5-theme-dark', isDarkMode)
}

function removePreviewInteractionHandlers(frame: HTMLIFrameElement, doc: Document | null) {
  const clickHandler = (frame as any).__previewClickHandler as ((event: MouseEvent) => void) | undefined
  const submitHandler = (frame as any).__previewSubmitHandler as ((event: Event) => void) | undefined

  if (doc) {
    if (clickHandler) {
      doc.removeEventListener('click', clickHandler, true)
    }
    if (submitHandler) {
      doc.removeEventListener('submit', submitHandler, true)
    }
  }

  delete (frame as any).__previewClickHandler
  delete (frame as any).__previewSubmitHandler
}

export function PreviewShell() {
  const {
    activeVariantId,
    activePageId,
    activeStoryId,
    selectedNodeId,
    iframeRef,
    setPreviewReady,
    selectNode,
  } = usePreviewRuntime()
  const { selectedThemeId } = usePresetState()
  const { stylesCss } = useStylesCssState()
  const {
    colorPresetPrimaryColor,
    colorPresetSecondaryColor,
    colorPresetFontFamily,
    colorPresetBgColor,
    colorPresetBorderRadius,
    colorPresetCardShadow,
    colorPresetHeadingFontFamily,
  } = useQuickStartColorsState()
  const {
    showClientName,
    showRealmName,
    infoMessage,
    imprintUrl,
    dataProtectionUrl,
  } = useQuickStartContentState()
  const { uploadedAssets, appliedAssets } = useUploadedAssetsState()
  const { isDarkMode } = useDarkModeState()
  const { deviceId } = usePreviewState()
  const themeConfig = useThemeConfig()

  const variantPages = getVariantPages(activeVariantId)
  const pageIds = Object.keys(variantPages)
  const fallbackPageId = (() => {
    if (variantPages['login.html']) {
      return 'login.html'
    }
    return pageIds.find(pageId => pageId.endsWith('.html') && pageId !== 'cli_splash.html') || pageIds[0] || 'login.html'
  })()
  const effectivePageId = variantPages[activePageId] ? activePageId : fallbackPageId
  const scenarioHtml = resolveScenarioHtml({
    variantId: activeVariantId,
    pageId: effectivePageId,
    storyId: activeStoryId,
  })
  const pageHtml = scenarioHtml || variantPages[effectivePageId] || '<!doctype html><html><body></body></html>'
  const resolvedThemeId = resolveThemeIdFromConfig(themeConfig, selectedThemeId)
  const themeBaseId = resolveThemeBaseIdFromConfig(themeConfig, selectedThemeId)
  const isV2Theme = themeBaseId === 'v2'
  const themeQuickStartCssPath = getThemeQuickStartCssPath(resolvedThemeId)
  const themeStylesPath = getThemePreviewStylesPath(resolvedThemeId)
  const themePreviewCssPath = getThemePreviewCssPath(resolvedThemeId)
  const quickStartOverridesCss = buildQuickStartCss({
    primaryColor: colorPresetPrimaryColor,
    secondaryColor: colorPresetSecondaryColor,
    fontFamily: colorPresetFontFamily,
    bgColor: colorPresetBgColor,
    borderRadius: colorPresetBorderRadius,
    cardShadow: colorPresetCardShadow,
    headingFontFamily: colorPresetHeadingFontFamily,
    showClientName,
    showRealmName,
    infoMessage,
    imprintUrl,
    dataProtectionUrl,
  })
  const uploadedFontsCss = generateFontFaceCSS(uploadedAssets)
  const uploadedImagesCss = generateImageCSSVars(uploadedAssets)
  const appliedAssetsCss = generateAppliedAssetsCSS(appliedAssets, uploadedAssets)
  const [frameLoadVersion, setFrameLoadVersion] = useState(0)
  const [messageOverrides, setMessageOverrides] = useState<{ noAccount?: string, doRegister?: string }>({})

  const srcDoc = sanitizePreviewHtml(pageHtml)

  useEffect(() => {
    let isDisposed = false
    const messagesPath = themeResourcePath(resolvedThemeId, 'messages/messages_en.properties')
    fetch(messagesPath)
      .then(response => response.ok ? response.text() : '')
      .then((text) => {
        if (isDisposed) {
          return
        }
        setMessageOverrides({
          noAccount: readMessageProperty(text, 'noAccount'),
          doRegister: readMessageProperty(text, 'doRegister'),
        })
      })
      .catch(() => {
        if (!isDisposed) {
          setMessageOverrides({})
        }
      })

    return () => {
      isDisposed = true
    }
  }, [resolvedThemeId, frameLoadVersion])

  const handleFrameLoad = () => {
    const frame = iframeRef.current
    if (!frame)
      return

    const doc = frame.contentDocument
    if (!doc)
      return

    removePreviewInteractionHandlers(frame, doc)

    const selectFromEventTarget = (rawTarget: Node | null) => {
      const target = toEventElement(rawTarget)
      if (!target) {
        return
      }
      const hit = target.closest('body *') as Element | null
      selectNode(hit ? createElementSelector(hit) : null)
    }

    const clickHandler = (event: MouseEvent) => {
      const target = toEventElement(event.target as Node | null)
      if (!target) {
        return
      }
      const anchor = target.closest('a[href]') as HTMLAnchorElement | null
      if (anchor) {
        if (isLegalInfoLink(anchor)) {
          const rawHref = (anchor.getAttribute('href') || '').trim()
          const externalHref = resolveOpenableLegalLinkUrl(rawHref)
          if (externalHref) {
            window.open(externalHref, '_blank', 'noopener,noreferrer')
          }
        }
        event.preventDefault()
      }
      selectFromEventTarget(target)
    }
    const submitHandler = (event: Event) => {
      event.preventDefault()
    }

    doc.addEventListener('click', clickHandler, true)
    doc.addEventListener('submit', submitHandler, true)
    ;(frame as any).__previewClickHandler = clickHandler
    ;(frame as any).__previewSubmitHandler = submitHandler
    setPreviewReady(true)
    setFrameLoadVersion(version => version + 1)
  }

  useEffect(() => {
    const frame = iframeRef.current
    if (!frame)
      return
    return () => {
      removePreviewInteractionHandlers(frame, frame.contentDocument)
    }
  }, [iframeRef])

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument
    if (!doc || !doc.head || !doc.body)
      return

    syncPreviewDocumentStyles({
      doc,
      isV2Theme,
      themeQuickStartCssPath,
      themeStylesPath,
      themePreviewCssPath,
      stylesCss,
      quickStartOverridesCss,
      uploadedFontsCss,
      uploadedImagesCss,
      appliedAssetsCss,
      isDarkMode,
    })

    applyQuickStartTemplateContent(doc, {
      showClientName,
      showRealmName: Boolean(showRealmName),
      infoMessage,
      imprintUrl,
      dataProtectionUrl,
      noAccountMessage: messageOverrides.noAccount,
      doRegisterLabel: messageOverrides.doRegister,
    })
  }, [
    iframeRef,
    frameLoadVersion,
    isV2Theme,
    resolvedThemeId,
    themeQuickStartCssPath,
    themeStylesPath,
    themePreviewCssPath,
    stylesCss,
    quickStartOverridesCss,
    uploadedFontsCss,
    uploadedImagesCss,
    appliedAssetsCss,
    isDarkMode,
    showClientName,
    showRealmName,
    infoMessage,
    imprintUrl,
    dataProtectionUrl,
    messageOverrides,
  ])

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument
    if (!doc)
      return

    doc.querySelectorAll('[data-preview-selected="true"]').forEach((element) => {
      element.removeAttribute('data-preview-selected')
    })

    if (!selectedNodeId)
      return
    const element = doc.querySelector(selectedNodeId)
    if (element) {
      element.setAttribute('data-preview-selected', 'true')
    }
  }, [iframeRef, selectedNodeId, frameLoadVersion])

  const deviceWidth = deviceWidthMap[(deviceId as 'desktop' | 'tablet' | 'mobile') || 'desktop']

  return (
    <div className="flex-grow overflow-auto">
      <div className="mx-auto transition-all duration-200" style={{ width: deviceWidth, maxWidth: '100%' }}>
        <iframe
          ref={iframeRef}
          onLoad={handleFrameLoad}
          srcDoc={srcDoc}
          title="Keycloak Preview"
          className="w-full min-h-[45vh] bg-transparent sm:min-h-[52vh] md:min-h-[90vh]"
          sandbox="allow-forms allow-same-origin"
        />
      </div>
    </div>
  )
}
