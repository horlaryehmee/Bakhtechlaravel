import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { SmartsuppLiveChat } from '@/components/analytics/SmartsuppLiveChat'
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

function App() {
  return (
    <>
      <SmartsuppLiveChat />
      <VisitTracker />
      <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
        <Routes>
          <Route path="admin" element={<Navigate to="/admin/login" replace />} />
          <Route path="admin/login" element={<AdminLogin />} />
          <Route path="admin/forgot-password" element={<AdminForgotPassword />} />
          <Route path="admin/reset-password" element={<AdminResetPassword />} />
          <Route path="admin/dashboard" element={<AdminDashboard />} />
          <Route path="admin/pricing-preview" element={<Pricing />} />
          <Route path="admin/pricing-preview/:categorySlug" element={<Pricing />} />
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
