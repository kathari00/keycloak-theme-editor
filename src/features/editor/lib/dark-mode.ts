import { DARK_MODE_STORAGE_KEY } from './storage-keys'

/**
 * Toggle dark mode and persist to localStorage
 */
export function toggleDarkMode(): boolean {
  const current = localStorage.getItem(DARK_MODE_STORAGE_KEY)
  const newMode = current === 'dark' ? 'light' : 'dark'
  localStorage.setItem(DARK_MODE_STORAGE_KEY, newMode)
  return newMode === 'dark'
}

/**
 * Get initial dark mode from localStorage
 */
export function getInitialDarkMode(): boolean {
  const stored = localStorage.getItem(DARK_MODE_STORAGE_KEY)
  return stored ? stored === 'dark' : false
}
