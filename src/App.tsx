import { Route, Routes } from 'react-router-dom'
import { SiteLayout } from '@/components/layout/SiteLayout'
import { About } from '@/pages/About'
import { Career } from '@/pages/Career'
import { Contact } from '@/pages/Contact'
import { Ebook } from '@/pages/Ebook'
import { Home } from '@/pages/Home'
import { Home2 } from '@/pages/Home2'
import { Portfolio } from '@/pages/Portfolio'

function App() {
  return (
    <Routes>
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
  )
}

export default App
