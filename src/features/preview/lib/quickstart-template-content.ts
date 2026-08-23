import { normalizeExternalLegalLinkUrl } from './legal-link-url'

export interface QuickStartTemplateContentOptions {
  showClientName: boolean
  showRealmName: boolean
  infoMessage: string
  imprintUrl: string
  dataProtectionUrl: string
  imprintLabel?: string
  dataProtectionLabel?: string
  noAccountMessage?: string
  doRegisterLabel?: string
}

function ensureText(node: HTMLElement | null, fallback: string) {
  if (node && !node.textContent?.trim())
    node.textContent = fallback
}

export function applyQuickStartTemplateContent(doc: Document, options: QuickStartTemplateContentOptions) {
  if (!doc.body)
    return

  ensureText(doc.querySelector<HTMLElement>('#kc-realm-name[data-kc-state="realm-name"]'), 'myrealm')
  ensureText(doc.querySelector<HTMLElement>('#kc-client-name[data-kc-state="client-name"]'), 'Client name')

  const message = (options.infoMessage || '').trim()
  const messageNode = doc.querySelector<HTMLElement>('[data-kc-state="info-message"]')
  if (messageNode) {
    const textNode = messageNode.querySelector<HTMLElement>('[data-kc-state="info-message-text"]') ?? messageNode
    textNode.textContent = message
    textNode.setAttribute('data-kc-i18n-key', 'infoMessage')
    textNode.setAttribute('data-kc-i18n-attribute', 'text')
    messageNode.style.display = message ? '' : 'none'
    messageNode.setAttribute('aria-hidden', message ? 'false' : 'true')
  }

  const legalNodes = [
    ['imprint-link', 'imprintUrl', 'imprintLabel', 'Imprint'],
    ['data-protection-link', 'dataProtectionUrl', 'dataProtectionLabel', 'Data Protection'],
  ] as const

  const footerContainer = doc.querySelector<HTMLElement>('[data-kc-state="legal-footer"]')
  const linksContainer = doc.querySelector<HTMLElement>('[data-kc-state="footer-legal-links"]')
  let anyLinkVisible = false

  if (footerContainer && linksContainer && !footerContainer.contains(linksContainer)) {
    footerContainer.appendChild(linksContainer)
  }

  for (const [id, hrefKey, labelKey, fallback] of legalNodes) {
    const href = options[hrefKey]
    const link = doc.querySelector<HTMLAnchorElement>(`a[data-kc-state="${id}"]`)
    if (!link)
      continue
    const normalizedHref = normalizeExternalLegalLinkUrl(href)
    link.id = `kc-${id}`
    // Set rather than fill in: the label is editable and translatable, so it
    // has to follow the current value instead of sticking at the first one.
    link.textContent = (options[labelKey] || '').trim() || fallback
    link.setAttribute('data-kc-i18n-key', labelKey)
    link.setAttribute('data-kc-i18n-attribute', 'text')
    link.href = normalizedHref || '#'
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    const visible = Boolean(normalizedHref)
    link.style.display = visible ? '' : 'none'
    if (visible)
      anyLinkVisible = true
  }

  // Toggle visibility on the link containers to match link visibility
  if (linksContainer)
    linksContainer.style.display = anyLinkVisible ? '' : 'none'

  if (footerContainer) {
    if (anyLinkVisible)
      footerContainer.removeAttribute('hidden')
    else
      footerContainer.setAttribute('hidden', '')
  }

  const anchor = doc.querySelector<HTMLAnchorElement>('#kc-registration a[href]')
  if (anchor) {
    if (options.doRegisterLabel !== undefined)
      anchor.textContent = options.doRegisterLabel
    if (options.noAccountMessage !== undefined) {
      const textNode = [...(anchor.parentElement?.childNodes ?? [])].find(node => node.nodeType === Node.TEXT_NODE) as Text | undefined
      if (textNode)
        textNode.textContent = `${options.noAccountMessage} `
    }
  }
}
