import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { VisitTracker } from '@/components/analytics/VisitTracker'
import { SiteLayout } from '@/components/layout/SiteLayout'

const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard').then((module) => ({ default: module.AdminDashboard })))
const AdminForgotPassword = lazy(() => import('@/pages/admin/AdminForgotPassword').then((module) => ({ default: module.AdminForgotPassword })))
const AdminLogin = lazy(() => import('@/pages/admin/AdminLogin').then((module) => ({ default: module.AdminLogin })))
const AdminResetPassword = lazy(() => import('@/pages/admin/AdminResetPassword').then((module) => ({ default: module.AdminResetPassword })))
const About = lazy(() => import('@/pages/About').then((module) => ({ default: module.About })))
const Booking = lazy(() => import('@/pages/Booking').then((module) => ({ default: module.Booking })))
const Contact = lazy(() => import('@/pages/Contact').then((module) => ({ default: module.Contact })))
const CmsPage = lazy(() => import('@/pages/CmsPage').then((module) => ({ default: module.CmsPage })))
const Home2 = lazy(() => import('@/pages/Home2').then((module) => ({ default: module.Home2 })))
const Portfolio = lazy(() => import('@/pages/Portfolio').then((module) => ({ default: module.Portfolio })))
const Pricing = lazy(() => import('@/pages/Pricing').then((module) => ({ default: module.Pricing })))
const PublicInvoice = lazy(() => import('@/pages/PublicInvoice').then((module) => ({ default: module.PublicInvoice })))
const PublicReceipt = lazy(() => import('@/pages/PublicReceipt').then((module) => ({ default: module.PublicReceipt })))

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://bakhtech.com.ng</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>https://bakhtech.com.ng/about</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
  <url><loc>https://bakhtech.com.ng/portfolio</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
  <url><loc>https://bakhtech.com.ng/pricing</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
  <url><loc>https://bakhtech.com.ng/booking</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
  <url><loc>https://bakhtech.com.ng/contact</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
  <url><loc>https://bakhtech.com.ng/llms.txt</loc><changefreq>monthly</changefreq><priority>0.4</priority></url>
  <url><loc>https://bakhtech.com.ng/markdown-mirrors.txt</loc><changefreq>monthly</changefreq><priority>0.4</priority></url>
  <url><loc>https://bakhtech.com.ng/markdown/home.md</loc><changefreq>monthly</changefreq><priority>0.4</priority></url>
  <url><loc>https://bakhtech.com.ng/markdown/about.md</loc><changefreq>monthly</changefreq><priority>0.4</priority></url>
  <url><loc>https://bakhtech.com.ng/markdown/portfolio.md</loc><changefreq>monthly</changefreq><priority>0.4</priority></url>
  <url><loc>https://bakhtech.com.ng/markdown/pricing.md</loc><changefreq>monthly</changefreq><priority>0.4</priority></url>
  <url><loc>https://bakhtech.com.ng/markdown/booking.md</loc><changefreq>monthly</changefreq><priority>0.4</priority></url>
  <url><loc>https://bakhtech.com.ng/markdown/contact.md</loc><changefreq>monthly</changefreq><priority>0.4</priority></url>
</urlset>`

function SitemapFallback() {
  return (
    <pre style={{ margin: 0, minHeight: '100vh', whiteSpace: 'pre-wrap', background: '#ffffff', color: '#111827', padding: 16, font: '14px/1.5 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>
      {sitemapXml}
    </pre>
  )
}

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
      {enableVisitTracking ? <VisitTracker /> : null}
      <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
        <Routes>
          <Route path="admin" element={<Navigate to="/admin/login" replace />} />
          <Route path="admin/login" element={<AdminLogin />} />
          <Route path="admin/forgot-password" element={<AdminForgotPassword />} />
          <Route path="admin/reset-password" element={<AdminResetPassword />} />
          <Route path="admin/dashboard" element={<AdminDashboard />} />
          <Route path="admin/pricing-preview" element={<Pricing />} />
          <Route path="admin/pricing-preview/:categorySlug" element={<Pricing />} />
          <Route path="sitemap.xml" element={<SitemapFallback />} />
          <Route path="sitemaps.xml" element={<SitemapFallback />} />
          <Route path="invoice/:token" element={<PublicInvoice />} />
          <Route path="receipt/:token" element={<PublicReceipt />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="pricing/:categorySlug" element={<Pricing />} />
          <Route element={<SiteLayout />}>
            <Route index element={<Home2 />} />
            <Route path="about" element={<About />} />
            <Route path="portfolio" element={<Portfolio />} />
            <Route path="booking" element={<Booking />} />
            <Route path="book/:slug" element={<Booking />} />
            <Route path="contact" element={<Contact />} />
            <Route path=":pageSlug" element={<CmsPage />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  )
}

export default App
