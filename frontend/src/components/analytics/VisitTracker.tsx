import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '@/lib/api'

export function VisitTracker() {
  const location = useLocation()
  const pathRef = useRef('')
  const visibleSecondsRef = useRef(0)

  function anonymousId(storage: Storage, key: string) {
    const existing = storage.getItem(key)
    if (existing) return existing
    const value = crypto.randomUUID()
    storage.setItem(key, value)
    return value
  }

  const sendHeartbeat = () => {
    if (!pathRef.current) return
    void api.trackVisit(pathRef.current, {
      eventType: 'heartbeat',
      sessionId: anonymousId(sessionStorage, 'bakhtech-analytics-session'),
      durationSeconds: visibleSecondsRef.current,
    })
  }

  useEffect(() => {
    if (location.pathname.startsWith('/admin')) return

    const path = `${location.pathname}${location.search}`
    pathRef.current = path
    visibleSecondsRef.current = 0
    const track = () => void api.trackVisit(path, {
      eventType: 'pageview',
      visitorId: anonymousId(localStorage, 'bakhtech-analytics-visitor'),
      sessionId: anonymousId(sessionStorage, 'bakhtech-analytics-session'),
      referrer: document.referrer,
      language: navigator.language,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
    })

    track()

    return () => {
      sendHeartbeat()
    }
  }, [location.pathname, location.search])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || pathRef.current.startsWith('/admin')) return
      visibleSecondsRef.current += 15
      sendHeartbeat()
    }, 15000)
    const onPageHide = () => sendHeartbeat()
    window.addEventListener('pagehide', onPageHide)

    return () => {
      window.clearInterval(timer)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [])

  return null
}
