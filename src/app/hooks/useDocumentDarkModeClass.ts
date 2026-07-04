import { useEffect } from 'react'

export function useDocumentDarkModeClass(isDarkMode: boolean): void {
  useEffect(() => {
    const method = isDarkMode ? 'add' : 'remove'
    document.documentElement.classList[method]('pf-v6-theme-dark')
    document.body.classList[method]('pf-v6-theme-dark')
  }, [isDarkMode])
}
