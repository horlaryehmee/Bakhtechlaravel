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

  function detectSourceHint() {
    const params = new URLSearchParams(window.location.search)
    const campaign = (params.get('utm_source') || params.get('source') || '').toLowerCase()
    const campaigns: Record<string, string> = {
      ig: 'Instagram', instagram: 'Instagram', fb: 'Facebook', facebook: 'Facebook',
      google: 'Google', tiktok: 'TikTok', linkedin: 'LinkedIn', whatsapp: 'WhatsApp',
      youtube: 'YouTube', twitter: 'X / Twitter', x: 'X / Twitter', bing: 'Bing',
    }
    if (campaign) return campaigns[campaign] || campaign
    if (params.has('gclid') || params.has('gbraid') || params.has('wbraid')) return 'Google Ads'
    if (params.has('fbclid')) return 'Meta Ads'
    if (params.has('ttclid')) return 'TikTok'
    if (params.has('msclkid')) return 'Bing'
    if (params.has('li_fat_id')) return 'LinkedIn'

    const referrerHost = (() => { try { return new URL(document.referrer).hostname.toLowerCase() } catch { return '' } })()
    const knownHosts: Array<[string, string]> = [
      ['instagram.com', 'Instagram'], ['facebook.com', 'Facebook'], ['google.', 'Google'],
      ['bing.com', 'Bing'], ['tiktok.com', 'TikTok'], ['linkedin.com', 'LinkedIn'],
      ['youtube.com', 'YouTube'], ['whatsapp.com', 'WhatsApp'], ['twitter.com', 'X / Twitter'], ['x.com', 'X / Twitter'],
    ]
    const hostMatch = knownHosts.find(([host]) => referrerHost.includes(host))
    if (hostMatch) return hostMatch[1]

    const userAgent = navigator.userAgent
    if (/Instagram/i.test(userAgent)) return 'Instagram'
    if (/FBAN|FBAV|\[FB/i.test(userAgent)) return 'Facebook'
    if (/TikTok/i.test(userAgent)) return 'TikTok'
    if (/WhatsApp/i.test(userAgent)) return 'WhatsApp'
    if (/GSA\//i.test(userAgent)) return 'Google'
    return ''
  }

  function sessionSourceHint() {
    const detected = detectSourceHint()
    try {
      const existing = sessionStorage.getItem('bakhtech-analytics-source')
      if (existing) return existing
      if (detected) sessionStorage.setItem('bakhtech-analytics-source', detected)
    } catch {
      // Restricted in-app browsers may block session storage.
    }
    return detected
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
      sourceHint: sessionSourceHint(),
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
