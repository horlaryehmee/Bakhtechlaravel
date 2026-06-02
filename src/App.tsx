import { Navigate, Route, Routes } from 'react-router-dom'
import { VisitTracker } from '@/components/analytics/VisitTracker'
import { SiteLayout } from '@/components/layout/SiteLayout'
import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { AdminLogin } from '@/pages/admin/AdminLogin'
import { About } from '@/pages/About'
import { Career } from '@/pages/Career'
import { Contact } from '@/pages/Contact'
import { Ebook } from '@/pages/Ebook'
import { Home } from '@/pages/Home'
import { Home2 } from '@/pages/Home2'
import { Portfolio } from '@/pages/Portfolio'

function App() {
  return (
    <>
      <VisitTracker />
      <Routes>
        <Route path="admin" element={<Navigate to="/admin/login" replace />} />
        <Route path="admin/login" element={<AdminLogin />} />
        <Route path="admin/dashboard" element={<AdminDashboard />} />
        <Route element={<SiteLayout />}>
          <Route index element={<Home />} />
          <Route path="home-2" element={<Home2 />} />
          <Route path="about" element={<About />} />
          <Route path="portfolio" element={<Portfolio />} />
          <Route path="ebook" element={<Ebook />} />
          <Route path="career" element={<Career />} />
          <Route path="contact" element={<Contact />} />
        </Route>
      </Routes>
    </>
  )
}

export default App
