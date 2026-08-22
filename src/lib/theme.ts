export type ThemePreference = 'light' | 'dark' | 'system'

const THEME_KEY = 'securo_theme'
const media = window.matchMedia('(prefers-color-scheme: dark)')

export function loadThemePreference(): ThemePreference {
  const stored = localStorage.getItem(THEME_KEY)
  return stored === 'light' || stored === 'dark' ? stored : 'system'
}

export function applyTheme(preference: ThemePreference): void {
  const dark = preference === 'dark' || (preference === 'system' && media.matches)
  document.documentElement.classList.toggle('dark', dark)
}

export function setThemePreference(preference: ThemePreference): void {
  localStorage.setItem(THEME_KEY, preference)
  applyTheme(preference)
}

/** Apply the stored preference and track OS changes while it is "system". */
export function initTheme(): void {
  applyTheme(loadThemePreference())
  media.addEventListener('change', () => {
    if (loadThemePreference() === 'system') applyTheme('system')
  })
}
