import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '@/lib/api'
import { ThemeContext, type Theme } from '@/components/theme/theme-context'

type ThemeColorKey = 'primary' | 'secondary' | 'active'
type ThemeColorSettings = Partial<Record<`theme_${Theme}_${ThemeColorKey}`, string>>

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme: Theme = 'light'
  const [colorSettings, setColorSettings] = useState<ThemeColorSettings>({})

  const setTheme = useCallback((_nextTheme: Theme) => undefined, [])
  const toggleTheme = useCallback(() => undefined, [])

  useEffect(() => {
    document.documentElement.classList.remove('dark')
    document.documentElement.style.colorScheme = 'light'
    window.localStorage.removeItem('bakhtech-theme')
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

  const value = useMemo(() => ({ theme, toggleTheme, setTheme }), [setTheme, theme, toggleTheme])

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
