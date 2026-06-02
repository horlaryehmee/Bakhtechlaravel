import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { SiteLayout } from '@/components/layout/SiteLayout'

const VisitTracker = lazy(() => import('@/components/analytics/VisitTracker').then((module) => ({ default: module.VisitTracker })))
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard').then((module) => ({ default: module.AdminDashboard })))
const AdminLogin = lazy(() => import('@/pages/admin/AdminLogin').then((module) => ({ default: module.AdminLogin })))
const About = lazy(() => import('@/pages/About').then((module) => ({ default: module.About })))
const Career = lazy(() => import('@/pages/Career').then((module) => ({ default: module.Career })))
const Contact = lazy(() => import('@/pages/Contact').then((module) => ({ default: module.Contact })))
const Ebook = lazy(() => import('@/pages/Ebook').then((module) => ({ default: module.Ebook })))
const Home2 = lazy(() => import('@/pages/Home2').then((module) => ({ default: module.Home2 })))
const Portfolio = lazy(() => import('@/pages/Portfolio').then((module) => ({ default: module.Portfolio })))

function App() {
  return (
    <>
      <Suspense fallback={null}>
        <VisitTracker />
      </Suspense>
      <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
        <Routes>
          <Route path="admin" element={<Navigate to="/admin/login" replace />} />
          <Route path="admin/login" element={<AdminLogin />} />
          <Route path="admin/dashboard" element={<AdminDashboard />} />
          <Route element={<SiteLayout />}>
            <Route index element={<Home2 />} />
            <Route path="about" element={<About />} />
            <Route path="portfolio" element={<Portfolio />} />
            <Route path="ebook" element={<Ebook />} />
            <Route path="career" element={<Career />} />
            <Route path="contact" element={<Contact />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  )
}

export default App
