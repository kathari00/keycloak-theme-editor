export function escapeCssIdentifier(value: string, doc?: Document): string {
  const cssApi = doc?.defaultView?.CSS ?? (typeof CSS !== 'undefined' ? CSS : undefined)
  if (cssApi && typeof cssApi.escape === 'function') {
    return cssApi.escape(value)
  }
  return value.replace(/([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1')
}

export function createElementSelector(element: Element): string {
  const tag = element.tagName.toLowerCase()
  if (tag === 'html' || tag === 'body') {
    return tag
  }

  const doc = element.ownerDocument

  if (element.id) {
    const idSelector = `#${escapeCssIdentifier(element.id, doc)}`
    if (doc.querySelectorAll(idSelector).length === 1) {
      return idSelector
    }
  }

  const segments: string[] = []
  let current: Element | null = element

  while (current && current.tagName.toLowerCase() !== 'html') {
    if (current.tagName.toLowerCase() === 'body') {
      current = current.parentElement
      continue
    }

    let segment = current.tagName.toLowerCase()

    if (current.id) {
      segment += `#${escapeCssIdentifier(current.id, doc)}`
      segments.unshift(segment)
      const candidate = segments.join(' > ')
      if (doc.querySelectorAll(candidate).length === 1) {
        return candidate
      }
      current = current.parentElement
      continue
    }

    let index = 1
    let sibling = current.previousElementSibling
    while (sibling) {
      if (sibling.tagName === current.tagName) {
        index++
      }
      sibling = sibling.previousElementSibling
    }
    segment += `:nth-of-type(${index})`
    segments.unshift(segment)
    const candidate = segments.join(' > ')
    if (doc.querySelectorAll(candidate).length === 1) {
      return candidate
    }
    current = current.parentElement
  }

  return segments.join(' > ')
}
