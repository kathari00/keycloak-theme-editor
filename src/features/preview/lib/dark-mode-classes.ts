export function syncPreviewDarkModeClasses(
  doc: Document,
  darkModeClasses: readonly string[] | undefined,
  isDarkMode: boolean,
): void {
  const targets = [doc.documentElement, doc.body].filter(Boolean)
  const classes = darkModeClasses?.length ? darkModeClasses : ['kcDarkModeClass']

  for (const target of targets) {
    for (const className of classes) {
      target.classList.toggle(className, isDarkMode)
    }
  }
}
