import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '@/lib/api'

export function VisitTracker() {
  const location = useLocation()
  const pathRef = useRef('')
  const visibleSecondsRef = useRef(0)
  const visitorIdRef = useRef('')
  const sessionIdRef = useRef('')

  function createId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const bytes = crypto.getRandomValues(new Uint8Array(16))
      return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  }

  function anonymousId(type: 'local' | 'session', key: string, fallback: { current: string }) {
    try {
      const storage = type === 'local' ? window.localStorage : window.sessionStorage
      const existing = storage.getItem(key)
      if (existing) return existing
      const value = createId()
      storage.setItem(key, value)
      return value
    } catch {
      if (!fallback.current) fallback.current = createId()
      return fallback.current
    }
  }

  const sendHeartbeat = () => {
    if (!pathRef.current) return
    void api.trackVisit(pathRef.current, {
      eventType: 'heartbeat',
      sessionId: anonymousId('session', 'bakhtech-analytics-session', sessionIdRef),
      durationSeconds: visibleSecondsRef.current,
    })
  }

  useEffect(() => {
    if (location.pathname.startsWith('/admin')) {
      pathRef.current = ''
      return
    }

    const path = `${location.pathname}${location.search}`
    pathRef.current = path
    visibleSecondsRef.current = 0
    const track = () => void api.trackVisit(path, {
      eventType: 'pageview',
      visitorId: anonymousId('local', 'bakhtech-analytics-visitor', visitorIdRef),
      sessionId: anonymousId('session', 'bakhtech-analytics-session', sessionIdRef),
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
