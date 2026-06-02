import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '@/lib/api'

export function VisitTracker() {
  const location = useLocation()

  useEffect(() => {
    if (location.pathname.startsWith('/admin')) return
    void api.trackVisit(`${location.pathname}${location.search}`)
  }, [location.pathname, location.search])

  return null
}
