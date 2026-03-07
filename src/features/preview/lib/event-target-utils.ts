/** Resolve an EventTarget to an Element, working across iframe realms where `instanceof Element` fails. */
export function getEventElement(target: EventTarget | null): Element | null {
  if (!target || !('nodeType' in target)) {
    return null
  }

  const node = target as Node
  if (node.nodeType === Node.ELEMENT_NODE) {
    return node as Element
  }

  return node.parentElement
}
