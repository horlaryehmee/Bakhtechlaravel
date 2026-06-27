import { Component, lazy, Suspense, useEffect, useState, type ErrorInfo, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { SmartsuppLiveChat } from '@/components/analytics/SmartsuppLiveChat'
import { VisitTracker } from '@/components/analytics/VisitTracker'
import { SiteLayout } from '@/components/layout/SiteLayout'
import { SVGFollower } from '@/components/ui/svg-follower'
import { api } from '@/lib/api'
import { Booking } from '@/pages/Booking'
import { HomeRouter } from '@/pages/HomeRouter'

const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard').then((module) => ({ default: module.AdminDashboard })))
const AdminForgotPassword = lazy(() => import('@/pages/admin/AdminForgotPassword').then((module) => ({ default: module.AdminForgotPassword })))
const AdminLogin = lazy(() => import('@/pages/admin/AdminLogin').then((module) => ({ default: module.AdminLogin })))
const AdminResetPassword = lazy(() => import('@/pages/admin/AdminResetPassword').then((module) => ({ default: module.AdminResetPassword })))
const AdminTemplatePreview = lazy(() => import('@/pages/admin/AdminTemplatePreview').then((module) => ({ default: module.AdminTemplatePreview })))
const About = lazy(() => import('@/pages/About').then((module) => ({ default: module.About })))
const Contact = lazy(() => import('@/pages/Contact').then((module) => ({ default: module.Contact })))
const CmsPage = lazy(() => import('@/pages/CmsPage').then((module) => ({ default: module.CmsPage })))
const LegalPage = lazy(() => import('@/pages/LegalPage').then((module) => ({ default: module.LegalPage })))
const Portfolio = lazy(() => import('@/pages/Portfolio').then((module) => ({ default: module.Portfolio })))
const Pricing = lazy(() => import('@/pages/Pricing').then((module) => ({ default: module.Pricing })))
const PublicInvoice = lazy(() => import('@/pages/PublicInvoice').then((module) => ({ default: module.PublicInvoice })))
const PublicReceipt = lazy(() => import('@/pages/PublicReceipt').then((module) => ({ default: module.PublicReceipt })))

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application render failed', error, info)

    if (/Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk/i.test(error.message)) {
      const reloadKey = 'bakhtech-chunk-reload-attempted'
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, 'true')
        window.location.reload()
      }
    }
  }

  private recover = () => {
    localStorage.removeItem('bakhtech-admin-data-cache-v1')
    localStorage.removeItem('bakhtech-admin-data-cache-v2')
    localStorage.removeItem('bakhtech-read-notifications')
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-slate-900">
        <section className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-6 shadow-xl">
          <h1 className="text-xl font-bold">Website failed to load</h1>
          <p className="mt-2 text-sm text-slate-600">The app could not load the latest page files. Reload to recover.</p>
          <pre className="mt-4 max-h-32 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-red-300">{this.state.error.message}</pre>
          <button type="button" onClick={this.recover} className="mt-5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">Clear local cache and reload</button>
        </section>
      </main>
    )
  }
}

const cursorEffectColors = ['#ff4d6d', '#ffd60a', '#38bdf8', '#34d399', '#ffffff']

function PublicCursorEffect() {
  const location = useLocation()
  const [enabled, setEnabled] = useState(false)
  const isPrivateSurface = location.pathname.startsWith('/admin')
    || location.pathname.startsWith('/invoice/')
    || location.pathname.startsWith('/receipt/')

  useEffect(() => {
    let cancelled = false

    api.publicSettings()
      .then((result) => {
        if (!cancelled) setEnabled(result.settings.cursorEffectEnabled === 'true')
      })
      .catch(() => {
        if (!cancelled) setEnabled(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (!enabled || isPrivateSurface) return null

  return <SVGFollower colors={cursorEffectColors} />
}

function ScrollRestoration() {
  const { pathname, search, hash } = useLocation()

  useEffect(() => {
    if (pathname.startsWith('/admin')) return

    if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      return
    }

    const targetId = decodeURIComponent(hash.slice(1))
    let attempts = 0
    let timeoutId = 0

    const scrollToTarget = () => {
      const target = document.getElementById(targetId)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }

      attempts += 1
      if (attempts < 20) {
        timeoutId = window.setTimeout(scrollToTarget, 80)
      } else {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      }
    }

    timeoutId = window.setTimeout(scrollToTarget, 0)
    return () => window.clearTimeout(timeoutId)
  }, [pathname, search, hash])

  return null
}

function App() {
  const location = useLocation()

  return (
    <>
      <SmartsuppLiveChat />
      {!location.pathname.startsWith('/admin') ? <VisitTracker /> : null}
      <ScrollRestoration />
      <PublicCursorEffect />
      <AppErrorBoundary>
        <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
          <Routes>
          <Route path="admin" element={<Navigate to="/admin/login" replace />} />
          <Route path="admin/login" element={<AdminLogin />} />
          <Route path="admin/forgot-password" element={<AdminForgotPassword />} />
          <Route path="admin/reset-password" element={<AdminResetPassword />} />
          <Route path="admin/home-template-preview/:template" element={<AdminTemplatePreview />} />
          <Route path="admin/dashboard" element={<AdminDashboard />} />
          <Route path="admin/pricing-preview" element={<Pricing />} />
          <Route path="admin/pricing-preview/:categorySlug" element={<Pricing />} />
          <Route path="invoice/:token" element={<PublicInvoice />} />
          <Route path="receipt/:token" element={<PublicReceipt />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="pricing/:categorySlug" element={<Pricing />} />
          <Route element={<SiteLayout />}>
            <Route index element={<HomeRouter />} />
            <Route path="about" element={<About />} />
            <Route path="portfolio" element={<Portfolio />} />
            <Route path="booking" element={<Booking />} />
            <Route path="book/:slug" element={<Booking />} />
            <Route path="contact" element={<Contact />} />
            <Route path="privacy-policy" element={<LegalPage kind="privacy-policy" />} />
            <Route path="terms-of-service" element={<LegalPage kind="terms-of-service" />} />
            <Route path="cookie-policy" element={<LegalPage kind="cookie-policy" />} />
            <Route path="security" element={<LegalPage kind="security" />} />
            <Route path=":pageSlug" element={<CmsPage />} />
          </Route>
          </Routes>
        </Suspense>
      </AppErrorBoundary>
    </>
  )
}

export default App
