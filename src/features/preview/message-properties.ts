function decodeJavaPropertiesValue(value: string): string {
  return value
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\f/g, '\f')
    .replace(/\\:/g, ':')
    .replace(/\\=/g, '=')
    .replace(/\\\\/g, '\\')
}

export function readMessageProperty(text: string, key: string): string | undefined {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // Match one logical line only. Do not allow newline consumption after separators.
  const match = text.match(new RegExp(`^[^\\S\\r\\n]*${escapedKey}[^\\S\\r\\n]*[:=][^\\S\\r\\n]*(.*)$`, 'm'))
  if (!match) {
    return undefined
  }
  return decodeJavaPropertiesValue(match[1].trim())
}
