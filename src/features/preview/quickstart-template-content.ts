import { normalizeExternalLegalLinkUrl } from './legal-link-url'

export interface QuickStartTemplateContentOptions {
  showClientName: boolean
  showRealmName: boolean
  infoMessage: string
  imprintUrl: string
  dataProtectionUrl: string
  noAccountMessage?: string
  doRegisterLabel?: string
}

function normalizeUrl(url: string): string {
  return normalizeExternalLegalLinkUrl(url)
}

function ensureRealmAndClientNodes(
  doc: Document,
) {
  const headerWrapper = doc.getElementById('kc-header-wrapper')
  if (!headerWrapper)
    return

  const hasMeaningfulChildren = Array.from(headerWrapper.childNodes).some((node) => {
    if (node.nodeType === Node.ELEMENT_NODE)
      return true
    if (node.nodeType === Node.TEXT_NODE)
      return Boolean(node.textContent?.trim())
    return false
  })

  const wrapperText = headerWrapper.textContent?.trim() || ''
  const realmEl = headerWrapper.querySelector('#kc-realm-name') as HTMLElement | null
  const clientEl = headerWrapper.querySelector('#kc-client-name') as HTMLElement | null

  if (!realmEl && wrapperText && (!hasMeaningfulChildren || headerWrapper.childElementCount === 0)) {
    headerWrapper.textContent = ''
  }

  const resolvedRealmEl = realmEl ?? (() => {
    const el = doc.createElement('span')
    el.id = 'kc-realm-name'
    el.className = 'kc-realm-name'
    el.setAttribute('data-kc-state', 'realm-name')
    headerWrapper.appendChild(el)
    return el
  })()

  if (!resolvedRealmEl.textContent?.trim()) {
    resolvedRealmEl.textContent = wrapperText || 'My Realm'
  }

  const resolvedClientEl = clientEl ?? (() => {
    const el = doc.createElement('span')
    el.id = 'kc-client-name'
    el.className = 'kc-client-name'
    el.setAttribute('data-kc-state', 'client-name')
    el.setAttribute('data-kc-client', 'name')
    headerWrapper.appendChild(el)
    return el
  })()

  if (!resolvedClientEl.textContent?.trim()) {
    resolvedClientEl.textContent = 'Client name'
  }

  // Visibility is controlled solely by CSS rules generated in buildQuickStartCss().
  // No inline style.display manipulation here — single source of truth for visibility.
}

function ensureInfoMessageNode(doc: Document, infoMessage: string) {
  const normalizedMessage = (infoMessage || '').trim()
  const hasInfoMessage = Boolean(normalizedMessage)

  const container = doc.getElementById('kc-info-message') as HTMLDivElement | null
  const insertRoot = doc.querySelector('#kc-content-wrapper')
    ?? doc.querySelector('.pf-v5-c-login__main-body')
    ?? doc.querySelector('.kcLoginMainBody')
    ?? doc.querySelector('#kc-content')
    ?? doc.body
  if (!insertRoot) {
    return
  }

  const messageEl = container ?? (() => {
    const el = doc.createElement('div')
    el.id = 'kc-info-message'
    el.className = 'kcAlertClass pf-m-info kc-info-message'
    el.setAttribute('data-kc-state', 'info-message')
    return el
  })()

  const existingTextTarget = (messageEl.querySelector('[data-kc-state="info-message-text"]')
    ?? messageEl.querySelector('.kcAlertTitleClass')
    ?? messageEl.querySelector('.pf-v5-c-alert__title')
    ?? messageEl.querySelector('.instruction')) as HTMLElement | null

  const textTarget = existingTextTarget ?? (() => {
    const span = doc.createElement('span')
    span.className = 'kcAlertTitleClass kc-feedback-text'
    messageEl.appendChild(span)
    return span
  })()

  textTarget.setAttribute('data-kc-state', 'info-message-text')
  textTarget.textContent = normalizedMessage
  // Always use user-provided content and never keep the i18n key placeholder.
  messageEl.removeAttribute('data-kc-i18n-key')
  messageEl.style.display = hasInfoMessage ? '' : 'none'
  messageEl.setAttribute('aria-hidden', hasInfoMessage ? 'false' : 'true')

  const isHorizontalCard = Boolean(doc.querySelector('.kc-horizontal-card-footer-under-card'))
  if (!container) {
    if (isHorizontalCard) {
      insertRoot.appendChild(messageEl)
    } else {
      insertRoot.prepend(messageEl)
    }
  } else if (isHorizontalCard && messageEl.parentElement === insertRoot) {
    insertRoot.appendChild(messageEl)
  }
}

function isV2InfoBand(element: Element | null): boolean {
  if (!element)
    return false
  return element.classList.contains('pf-v5-c-login__main-footer-band')
}

type LegalLinkConfig = {
  state: 'imprint-link' | 'data-protection-link'
  id: string
  placeholderHref: 'imprintUrl' | 'dataProtectionUrl'
  placeholderLabel: 'imprintLabel' | 'dataProtectionLabel'
  fallbackLabel: 'Imprint' | 'Data Protection'
}

const LEGAL_LINK_CONFIGS: LegalLinkConfig[] = [
  {
    state: 'imprint-link',
    id: 'kc-imprint-link',
    placeholderHref: 'imprintUrl',
    placeholderLabel: 'imprintLabel',
    fallbackLabel: 'Imprint',
  },
  {
    state: 'data-protection-link',
    id: 'kc-data-protection-link',
    placeholderHref: 'dataProtectionUrl',
    placeholderLabel: 'dataProtectionLabel',
    fallbackLabel: 'Data Protection',
  },
]

function normalizeToken(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase()
}

function isLegalLinkContainer(element: Element): boolean {
  return Boolean(
    element.closest(
      '.kc-footer-legal-links, #kc-info, .kc-horizontal-card-footer-row, .pf-v5-c-login__main-footer-band, .kcLoginMainFooterBand, .kcLoginMainFooter, [class*="footer"], [id*="footer"]',
    ),
  )
}

function matchesLegalLink(anchor: HTMLAnchorElement, config: LegalLinkConfig): boolean {
  const state = anchor.getAttribute('data-kc-state')
  if (state === config.state || anchor.id === config.id) {
    return true
  }

  const rawHref = normalizeToken(anchor.getAttribute('href'))
  if (rawHref === normalizeToken(config.placeholderHref)) {
    return true
  }

  const text = normalizeToken(anchor.textContent)
  if (text === normalizeToken(config.placeholderLabel)) {
    return true
  }

  if (isLegalLinkContainer(anchor) && text === normalizeToken(config.fallbackLabel)) {
    return true
  }

  return false
}

function findLegalLink(
  doc: Document,
  linkParent: Element,
  config: LegalLinkConfig,
): HTMLAnchorElement | null {
  const parentAnchors = Array.from(linkParent.querySelectorAll('a')) as HTMLAnchorElement[]
  const scopedMatch = parentAnchors.find(anchor => matchesLegalLink(anchor, config))
  if (scopedMatch) {
    return scopedMatch
  }

  const explicitMatch = doc.querySelector(
    `a[data-kc-state="${config.state}"], a#${config.id}`,
  ) as HTMLAnchorElement | null
  if (explicitMatch) {
    return explicitMatch
  }

  const globalPlaceholderMatch = (Array.from(doc.querySelectorAll('a')) as HTMLAnchorElement[])
    .find(anchor => matchesLegalLink(anchor, config))
  if (globalPlaceholderMatch) {
    return globalPlaceholderMatch
  }

  const fallbackMatch = (Array.from(doc.querySelectorAll('a')) as HTMLAnchorElement[])
    .find(anchor => isLegalLinkContainer(anchor) && matchesLegalLink(anchor, config))
  return fallbackMatch ?? null
}

function removeDuplicateLegalLinks(
  doc: Document,
  keep: HTMLAnchorElement,
  config: LegalLinkConfig,
) {
  const anchors = Array.from(doc.querySelectorAll('a')) as HTMLAnchorElement[]
  anchors.forEach((anchor) => {
    if (anchor === keep) {
      return
    }
    const hasStrongIdentity
      = anchor.getAttribute('data-kc-state') === config.state
        || anchor.id === config.id
        || normalizeToken(anchor.getAttribute('href')) === normalizeToken(config.placeholderHref)
        || normalizeToken(anchor.textContent) === normalizeToken(config.placeholderLabel)
    if (!hasStrongIdentity && !isLegalLinkContainer(anchor)) {
      return
    }
    if (matchesLegalLink(anchor, config)) {
      anchor.remove()
    }
  })
}

function normalizeLegalPlaceholderAnchors(
  doc: Document,
  params: { normalizedImprint: string, normalizedDataProtection: string },
) {
  const hrefByPlaceholder: Record<LegalLinkConfig['placeholderHref'], string> = {
    imprintUrl: params.normalizedImprint,
    dataProtectionUrl: params.normalizedDataProtection,
  }

  const anchors = Array.from(doc.querySelectorAll('a')) as HTMLAnchorElement[]
  anchors.forEach((anchor) => {
    LEGAL_LINK_CONFIGS.forEach((config) => {
      if (!matchesLegalLink(anchor, config)) {
        return
      }

      const desiredHref = hrefByPlaceholder[config.placeholderHref] || '#'
      const currentHref = normalizeToken(anchor.getAttribute('href'))
      if (currentHref === normalizeToken(config.placeholderHref) || !anchor.getAttribute('href')) {
        anchor.href = desiredHref
      }

      if (normalizeToken(anchor.textContent) === normalizeToken(config.placeholderLabel)) {
        anchor.textContent = config.fallbackLabel
      }

      anchor.setAttribute('data-kc-state', config.state)
      anchor.id = config.id
      anchor.target = '_blank'
      anchor.rel = 'noopener noreferrer'
    })
  })
}


function ensureLegalLinks(doc: Document, imprintUrl: string, dataProtectionUrl: string) {
  const normalizedImprint = normalizeUrl(imprintUrl)
  const normalizedDataProtection = normalizeUrl(dataProtectionUrl)
  const hasLinks = Boolean(normalizedImprint || normalizedDataProtection)

  normalizeLegalPlaceholderAnchors(doc, { normalizedImprint, normalizedDataProtection })

  const existingWrapper = doc.querySelector<HTMLElement>('[data-kc-state="footer-legal-links"]')
    ?? doc.querySelector<HTMLElement>('.kc-footer-legal-links')
  const kcInfo = doc.getElementById('kc-info')
  const v2Band = Boolean(existingWrapper?.classList.contains('pf-v5-c-login__main-footer-band')) || isV2InfoBand(kcInfo)
  const v2MainBody = v2Band
    ? (doc.querySelector<HTMLElement>('.pf-v5-c-login__main-body') ?? doc.querySelector<HTMLElement>('.kcLoginMainBody'))
    : null
  const v2Main = v2Band
    ? (doc.querySelector<HTMLElement>('.pf-v5-c-login__main') ?? doc.querySelector<HTMLElement>('.kcLoginMain'))
    : null
  let v2LegalFooter = v2Band
    ? (doc.querySelector<HTMLElement>('[data-kc-state="legal-footer"]')
      ?? doc.querySelector<HTMLElement>('.kc-legal-footer')
      ?? (existingWrapper?.closest('.pf-v5-c-login__main-footer') as HTMLElement | null))
    : null

  if (v2Band && !v2LegalFooter) {
    const footer = doc.createElement('div')
    footer.className = 'pf-v5-c-login__main-footer kc-legal-footer'
    footer.setAttribute('data-kc-state', 'legal-footer')
    const host = v2Main ?? v2MainBody ?? doc.body
    host.appendChild(footer)
    v2LegalFooter = footer
  }

  if (v2Band && v2LegalFooter) {
    v2LegalFooter.classList.add('kc-legal-footer')
    v2LegalFooter.classList.add('pf-v5-c-login__main-footer')
    if (v2Main && v2LegalFooter.parentElement !== v2Main) {
      v2Main.appendChild(v2LegalFooter)
    } else if (!v2Main && v2MainBody && v2LegalFooter.parentElement !== v2MainBody) {
      v2MainBody.appendChild(v2LegalFooter)
    }
    if (v2Main && v2Main.lastElementChild !== v2LegalFooter) {
      v2Main.appendChild(v2LegalFooter)
    }
  }

  const parent: Element = (() => {
    if (v2LegalFooter) {
      return v2LegalFooter
    }
    if (existingWrapper) {
      return existingWrapper.parentElement ?? existingWrapper
    }
    if (v2Band && kcInfo)
      return kcInfo
    const footerRow = doc.querySelector('.kc-horizontal-card-footer-row')
    if (footerRow)
      return footerRow
    const formCard = doc.querySelector('.kcFormCardClass')
    if (formCard)
      return formCard
    return doc.body
  })()

  let wrapper: HTMLElement | null = existingWrapper
  if (!wrapper && !v2Band) {
    const el = doc.createElement('div')
    el.className = 'kc-footer-legal-links'
    el.setAttribute('data-kc-state', 'footer-legal-links')
    wrapper = el
  } else if (!wrapper && v2Band) {
    const el = doc.createElement('div')
    el.className = 'kc-footer-legal-links'
    el.setAttribute('data-kc-state', 'footer-legal-links')
    wrapper = el
  }

  if (wrapper && !wrapper.isConnected) {
    parent.appendChild(wrapper)
  }

  if (v2LegalFooter && wrapper) {
    if (wrapper.parentElement !== v2LegalFooter) {
      v2LegalFooter.appendChild(wrapper)
    }
    wrapper.classList.remove('pf-v5-c-login__main-footer-band')
  }

  const linkParent = wrapper ?? parent

  const ensureLink = (params: {
    config: LegalLinkConfig
    href: string
  }) => {
    const { config, href } = params
    const link = findLegalLink(doc, linkParent, config)
      ?? doc.createElement('a')

    link.id = config.id
    link.setAttribute('data-kc-state', config.state)
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.textContent = config.fallbackLabel
    link.href = href || '#'
    if (v2Band) {
      link.classList.add('pf-v5-c-login__main-footer-band-item')
    }
    link.style.display = href ? '' : 'none'

    if (!link.isConnected) {
      linkParent.appendChild(link)
    }

    removeDuplicateLegalLinks(doc, link, config)
  }

  ensureLink({ config: LEGAL_LINK_CONFIGS[0], href: normalizedImprint })
  ensureLink({ config: LEGAL_LINK_CONFIGS[1], href: normalizedDataProtection })

  if (wrapper) {
    wrapper.setAttribute('aria-hidden', hasLinks ? 'false' : 'true')
    wrapper.style.display = hasLinks ? '' : 'none'
  }
}

function ensureRegistrationCopy(
  doc: Document,
  options: Pick<QuickStartTemplateContentOptions, 'noAccountMessage' | 'doRegisterLabel'>,
) {
  const hasNoAccountMessage = options.noAccountMessage !== undefined
  const hasDoRegisterLabel = options.doRegisterLabel !== undefined
  if (!hasNoAccountMessage && !hasDoRegisterLabel) {
    return
  }

  const registration = doc.getElementById('kc-registration')
  if (!registration) {
    return
  }

  const directChildren = Array.from(registration.children) as HTMLElement[]
  const inlineContainer = directChildren.find(child => child.tagName === 'SPAN') ?? null
  const directAnchor = directChildren.find(child => child.tagName === 'A') as HTMLAnchorElement | undefined
  const anchor = (inlineContainer?.querySelector('a[href]') as HTMLAnchorElement | null)
    ?? directAnchor
    ?? (registration.querySelector('a[href]') as HTMLAnchorElement | null)
  if (!anchor) {
    return
  }

  if (hasDoRegisterLabel) {
    anchor.textContent = options.doRegisterLabel ?? ''
  }

  if (!hasNoAccountMessage) {
    return
  }

  const prompt = options.noAccountMessage ?? ''
  if (inlineContainer) {
    Array.from(inlineContainer.childNodes).forEach((node) => {
      if (node !== anchor) {
        node.remove()
      }
    })
    if (prompt) {
      inlineContainer.insertBefore(doc.createTextNode(`${prompt} `), anchor)
    }
    return
  }

  if (directAnchor && prompt) {
    const wrapper = doc.createElement('span')
    wrapper.appendChild(doc.createTextNode(`${prompt} `))
    directAnchor.replaceWith(wrapper)
    wrapper.appendChild(directAnchor)
  }
}

export function applyQuickStartTemplateContent(
  doc: Document,
  options: QuickStartTemplateContentOptions,
) {
  if (!doc.body) {
    return
  }
  ensureRealmAndClientNodes(doc)
  ensureInfoMessageNode(doc, options.infoMessage)
  ensureLegalLinks(doc, options.imprintUrl, options.dataProtectionUrl)
  ensureRegistrationCopy(doc, options)
}
