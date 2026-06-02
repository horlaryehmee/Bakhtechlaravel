import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '@/lib/api'

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
  cancelIdleCallback?: (id: number) => void
}

export function VisitTracker() {
  const location = useLocation()

  useEffect(() => {
    if (location.pathname.startsWith('/admin')) return

    const path = `${location.pathname}${location.search}`
    const idleWindow = window as IdleWindow

    if (idleWindow.requestIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(() => {
        void api.trackVisit(path)
      }, { timeout: 3000 })

      return () => idleWindow.cancelIdleCallback?.(idleId)
    }

    const timeoutId = window.setTimeout(() => {
      void api.trackVisit(path)
    }, 1200)

    return () => window.clearTimeout(timeoutId)
  }, [location.pathname, location.search])

  return null
}
