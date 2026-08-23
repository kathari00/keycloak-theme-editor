import type { LocalizedContentOverrides } from '../../editor/stores/types'
import { DEFAULT_LOCALE_TAG, propertiesSuffixForLocale } from '../../i18n/locale-catalog'
import { parseMessageProperties } from './message-properties'

const catalogPromises = new Map<string, Promise<Record<string, string>>>()

function normalizeMessageText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

async function loadCatalog(localeTag: string): Promise<Record<string, string>> {
  const suffix = propertiesSuffixForLocale(localeTag)
  const path = `/keycloak-dev-resources/i18n/messages_${suffix}.properties`
  let promise = catalogPromises.get(localeTag)
  if (!promise) {
    promise = fetch(path)
      .then(response => response.ok ? response.text() : '')
      .then(parseMessageProperties)
      .catch(() => ({}))
    catalogPromises.set(localeTag, promise)
  }
  return promise
}

async function effectiveCatalog(localeTag: string): Promise<Record<string, string>> {
  const english = await loadCatalog(DEFAULT_LOCALE_TAG)
  return localeTag === DEFAULT_LOCALE_TAG
    ? english
    : { ...english, ...await loadCatalog(localeTag) }
}

function addCatalogValues(result: Map<string, string[]>, catalog: Record<string, string>): void {
  for (const [key, value] of Object.entries(catalog)) {
    const normalized = normalizeMessageText(value.replace(/''/g, '\''))
    if (!normalized || /\{\d+(?:,[^}]*)?\}/.test(normalized)) {
      continue
    }
    const keys = result.get(normalized) ?? []
    if (!keys.includes(key)) {
      keys.push(key)
      result.set(normalized, keys)
    }
  }
}

function elementHint(element: Element): string {
  return normalizeMessageText([
    element.id,
    element.getAttribute('name'),
    element.getAttribute('for'),
  ].filter(Boolean).join(' ')).replace(/[^a-z0-9]/gi, '').toLowerCase()
}

function chooseKey(element: Element, keys: string[] | undefined): string | undefined {
  if (!keys?.length)
    return undefined
  const errorContainerId = element.closest<HTMLElement>('[id^="input-error"]')?.id ?? ''
  if (errorContainerId.startsWith('input-error') && keys.includes('invalidUserMessage'))
    return 'invalidUserMessage'
  const hint = elementHint(element)
  return keys.find(key => key.replace(/[^a-z0-9]/gi, '').toLowerCase() === hint)
    ?? keys.find(key => hint && key.toLowerCase().includes(hint))
    // Keycloak contains a few different keys with the exact same wording.
    // Their declaration order puts the general UI key before specialized
    // variants, which is the useful choice for a rendered form/message.
    ?? keys[0]
}

function directText(element: Element): string {
  return normalizeMessageText(
    [...element.childNodes]
      .filter(node => node.nodeType === node.TEXT_NODE)
      .map(node => node.textContent ?? '')
      .join(' '),
  )
}

const TRANSLATABLE_ATTRIBUTES = ['value', 'placeholder', 'title', 'aria-label'] as const

export async function annotatePreviewMessageKeys(doc: Document, localeTag: string): Promise<void> {
  const valueToKeys = new Map<string, string[]>()
  const english = await loadCatalog(DEFAULT_LOCALE_TAG)
  addCatalogValues(valueToKeys, await effectiveCatalog(localeTag))
  // Some generated error states contain Keycloak's English fallback even in a
  // localized document. Recognize both the rendered locale and that fallback.
  if (localeTag !== DEFAULT_LOCALE_TAG)
    addCatalogValues(valueToKeys, english)

  for (const element of doc.body?.querySelectorAll<HTMLElement>('*') ?? []) {
    if (element.hasAttribute('data-kc-i18n-key')) {
      continue
    }
    for (const attribute of TRANSLATABLE_ATTRIBUTES) {
      const normalized = normalizeMessageText(element.getAttribute(attribute))
      const key = normalized ? chooseKey(element, valueToKeys.get(normalized)) : undefined
      if (key) {
        element.setAttribute('data-kc-i18n-key', key)
        element.setAttribute('data-kc-i18n-attribute', attribute)
        break
      }
    }
    if (!element.hasAttribute('data-kc-i18n-key')) {
      const normalized = directText(element)
      const key = normalized ? chooseKey(element, valueToKeys.get(normalized)) : undefined
      if (key) {
        element.setAttribute('data-kc-i18n-key', key)
        element.setAttribute('data-kc-i18n-attribute', 'text')
      }
    }
  }
}

/**
 * Resolve the message represented by a clicked element. A container represents
 * its only translated descendant when there is exactly one distinct message
 * in its complete subtree.
 */
export function findPreviewMessageElement(selected: Element | null): HTMLElement | null {
  const direct = selected?.closest<HTMLElement>('[data-kc-i18n-key]') ?? null
  if (direct)
    return direct

  if (!selected)
    return null

  const descendants = [...selected.querySelectorAll<HTMLElement>('[data-kc-i18n-key]')]
  const keys = new Set(descendants.map(element => element.dataset.kcI18nKey).filter(Boolean))
  return keys.size === 1 ? descendants[0] ?? null : null
}

export async function applyPreviewMessageOverrides(
  doc: Document,
  localeTag: string,
  overrides: LocalizedContentOverrides,
): Promise<void> {
  await annotatePreviewMessageKeys(doc, localeTag)
  const catalog = await effectiveCatalog(localeTag)
  for (const element of doc.querySelectorAll<HTMLElement>('[data-kc-i18n-key]')) {
    const key = element.dataset.kcI18nKey
    const value = key ? overrides[key]?.trim() || catalog[key] : ''
    if (!value) {
      continue
    }
    writeElementMessage(element, value)
  }
}

function writeElementMessage(element: HTMLElement, value: string): void {
  const attribute = element.dataset.kcI18nAttribute
  if (attribute === 'text') {
    const textNode = [...element.childNodes].find(node => node.nodeType === node.TEXT_NODE)
    if (textNode) {
      textNode.textContent = value
    }
    else {
      element.textContent = value
    }
  }
  else if (attribute) {
    element.setAttribute(attribute, value)
  }
}

export function applyPreviewMessageValue(doc: Document, key: string, value: string): void {
  for (const element of doc.querySelectorAll<HTMLElement>('[data-kc-i18n-key]')) {
    if (element.dataset.kcI18nKey === key) {
      writeElementMessage(element, value)
    }
  }
}

export async function getCatalogMessage(localeTag: string, key: string): Promise<string> {
  return (await effectiveCatalog(localeTag))[key] ?? ''
}
