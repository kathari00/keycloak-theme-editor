export function normalizeCss(cssText: string): string {
  return cssText.replace(/\r\n/g, '\n').trim()
}
