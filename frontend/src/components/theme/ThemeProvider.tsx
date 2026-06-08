import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '@/lib/api'

type Theme = 'light' | 'dark'

type ThemeContextValue = {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const storageKey = 'bakhtech-theme'
const colorKeys = ['primary', 'secondary', 'active'] as const

type ThemeColorKey = (typeof colorKeys)[number]
type ThemeColorSettings = Partial<Record<`theme_${Theme}_${ThemeColorKey}`, string>>

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'

  const stored = window.localStorage.getItem(storageKey)
  if (stored === 'light' || stored === 'dark') return stored

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)
  const [colorSettings, setColorSettings] = useState<ThemeColorSettings>({})

  const setTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme)
    window.localStorage.setItem(storageKey, nextTheme)
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
    applyThemeColors(theme, colorSettings)
  }, [theme, colorSettings])

  useEffect(() => {
    let cancelled = false

    api.publicSettings()
      .then((result) => {
        if (cancelled) return
        setColorSettings(result.settings as ThemeColorSettings)
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo(() => ({ theme, toggleTheme, setTheme }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

function isHexColor(value: string | undefined): value is string {
  return Boolean(value && /^#[0-9a-fA-F]{6}$/.test(value))
}

function applyThemeColors(theme: Theme, settings: ThemeColorSettings) {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  const primary = settings[`theme_${theme}_primary`]
  const secondary = settings[`theme_${theme}_secondary`]
  const active = settings[`theme_${theme}_active`]

  if (isHexColor(primary)) root.style.setProperty('--primary', primary)
  if (isHexColor(secondary)) {
    root.style.setProperty('--accent', secondary)
    root.style.setProperty('--brand-2', secondary)
  }
  if (isHexColor(active)) {
    root.style.setProperty('--active', active)
    root.style.setProperty('--brand', active)
    root.style.setProperty('--gradient-color', active)
  }
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider')
  }
  return context
}
