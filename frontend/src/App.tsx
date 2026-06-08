import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { SiteLayout } from '@/components/layout/SiteLayout'

const VisitTracker = lazy(() => import('@/components/analytics/VisitTracker').then((module) => ({ default: module.VisitTracker })))
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard').then((module) => ({ default: module.AdminDashboard })))
const AdminLogin = lazy(() => import('@/pages/admin/AdminLogin').then((module) => ({ default: module.AdminLogin })))
const About = lazy(() => import('@/pages/About').then((module) => ({ default: module.About })))
const Booking = lazy(() => import('@/pages/Booking').then((module) => ({ default: module.Booking })))
const Contact = lazy(() => import('@/pages/Contact').then((module) => ({ default: module.Contact })))
const Home2 = lazy(() => import('@/pages/Home2').then((module) => ({ default: module.Home2 })))
const Portfolio = lazy(() => import('@/pages/Portfolio').then((module) => ({ default: module.Portfolio })))
const Pricing = lazy(() => import('@/pages/Pricing').then((module) => ({ default: module.Pricing })))
const PublicInvoice = lazy(() => import('@/pages/PublicInvoice').then((module) => ({ default: module.PublicInvoice })))

function App() {
  const [enableVisitTracking, setEnableVisitTracking] = useState(false)

  useEffect(() => {
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }

    if (idleWindow.requestIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(() => {
        setEnableVisitTracking(true)
      }, { timeout: 2500 })

      return () => idleWindow.cancelIdleCallback?.(idleId)
    }

    const timeoutId = window.setTimeout(() => {
      setEnableVisitTracking(true)
    }, 1800)

    return () => window.clearTimeout(timeoutId)
  }, [])

  return (
    <>
      {enableVisitTracking ? (
        <Suspense fallback={null}>
          <VisitTracker />
        </Suspense>
      ) : null}
      <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
        <Routes>
          <Route path="admin" element={<Navigate to="/admin/login" replace />} />
          <Route path="admin/login" element={<AdminLogin />} />
          <Route path="admin/dashboard" element={<AdminDashboard />} />
          <Route path="admin/pricing-preview" element={<Pricing />} />
          <Route path="admin/pricing-preview/:categorySlug" element={<Pricing />} />
          <Route path="invoice/:token" element={<PublicInvoice />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="pricing/:categorySlug" element={<Pricing />} />
          <Route element={<SiteLayout />}>
            <Route index element={<Home2 />} />
            <Route path="about" element={<About />} />
            <Route path="portfolio" element={<Portfolio />} />
            <Route path="booking" element={<Booking />} />
            <Route path="book/:slug" element={<Booking />} />
            <Route path="contact" element={<Contact />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  )
}

export default App
