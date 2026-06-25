import { useEffect, useState } from 'react'
import { Home2 } from '@/pages/Home2'
import { AgencyHomeTemplate } from '@/pages/templates/AgencyHomeTemplate'
import { api, type CmsPage } from '@/lib/api'

export function HomeRouter() {
  const [homePage, setHomePage] = useState<CmsPage | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    api.publicSettings()
      .then((settingsResult) => {
        const activeHome = settingsResult.settings.activeHome?.trim() || 'home'
        return api.publicPage(activeHome)
      })
      .then((pageResult) => {
        if (!cancelled) setHomePage(pageResult.page)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (!loaded) {
    return <main className="min-h-screen bg-[var(--background)]" />
  }

  if (homePage?.template === 'agency-v2') {
    return <AgencyHomeTemplate />
  }

  return <Home2 />
}
