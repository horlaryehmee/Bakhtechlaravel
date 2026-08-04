import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Menu, X } from 'lucide-react'

const navItems = [
  { label: 'About', href: '/about' },
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Booking', href: '/booking' },
  { label: 'Contact', href: '/contact' },
]

const videoUrl = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260713_234424_b1332b69-2e69-4302-8dbc-40f86846afbd.mp4'

function BakhtechLogo() {
  return (
    <a href="/" className="inline-flex items-center" aria-label="Bakhtech home">
      <img
        src="/bakhtech-logo-white.png"
        alt="Bakhtech"
        className="h-9 w-auto sm:h-10"
        width="160"
        height="40"
        decoding="async"
      />
    </a>
  )
}

export function NotFound() {
  const textRef = useRef<HTMLDivElement | null>(null)
  const [scaleY, setScaleY] = useState(1)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const updateScale = () => {
      const height = textRef.current?.offsetHeight || window.innerHeight
      setScaleY(window.innerHeight / Math.max(height, 1))
    }

    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  useEffect(() => {
    document.title = '404 - Page Not Found'
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  return (
    <main className="fixed inset-0 z-[500] flex h-screen w-full flex-col overflow-hidden bg-[linear-gradient(to_bottom,#FF8233,#FDAC55)] font-['Inter',sans-serif]">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 95%)',
          maskImage: 'linear-gradient(to bottom, black 40%, transparent 95%)',
        }}
        aria-hidden="true"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            ref={textRef}
            className="whitespace-nowrap text-[clamp(200px,48vw,800px)] font-black leading-none tracking-tighter text-white"
            style={{ transform: `scale(1.15, ${scaleY * 1.4})` }}
          >
            404
          </div>
          <div
            className="absolute h-[22vh] w-[clamp(120px,20vw,400px)] rounded-full bg-white sm:h-[26vh] md:h-[50vh]"
            style={{ transform: `scaleY(${scaleY})`, transformOrigin: 'center' }}
          />
        </div>
      </div>

      <nav className="relative z-20 flex items-center justify-between px-4 py-4 sm:px-6 sm:py-5 md:px-12">
        <BakhtechLogo />

        <div className="hidden gap-1 md:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-[#F16524] transition-colors hover:opacity-90"
            >
              {item.label}
            </a>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-[#F16524] px-4 py-2 text-white transition-colors hover:opacity-90 sm:px-5 sm:py-2.5"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
          <span className="hidden text-sm font-medium sm:inline">Menu</span>
        </button>
      </nav>

      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        style={{ marginTop: 'calc(-6vh - 40px)' }}
        aria-hidden="true"
      >
        <div className="h-[85vh] w-[120vw] sm:h-[70vh] sm:w-[70vw] md:h-[78vh] md:w-[62vw]">
          <video
            src={videoUrl}
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-contain mix-blend-darken"
          />
        </div>
      </div>

      <section className="relative z-30 mt-auto flex flex-col items-center px-4 pb-8 text-center sm:pb-16">
        <h1 className="mb-3 text-lg font-medium text-white sm:mb-4 sm:text-xl md:text-2xl">Oops, something went wrong!</h1>
        <a
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-[#F16524] px-6 py-3 text-sm font-semibold text-white transition-all hover:scale-105 hover:shadow-lg sm:px-8 sm:py-4 sm:text-base"
        >
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          Back to Home
        </a>
      </section>

      <div
        className={`fixed inset-0 z-50 transition duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${menuOpen ? 'visible' : 'invisible'}`}
        aria-hidden={!menuOpen}
      >
        <button
          type="button"
          className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-500 ${menuOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMenuOpen(false)}
          aria-label="Close menu"
        />

        <aside
          className={`absolute right-0 top-0 h-full w-full bg-[linear-gradient(135deg,#FF6B1A_0%,#FF9642_100%)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] sm:w-[380px] ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="flex items-center justify-between px-6 py-5">
            <BakhtechLogo />
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid gap-3 px-6 pt-8">
            {navItems.map((item, index) => (
              <a
                key={item.href}
                href={item.href}
                className={`rounded-2xl bg-white/10 px-6 py-4 text-lg font-semibold text-white transition-all duration-300 hover:bg-white/20 ${menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
                style={{ transitionDelay: menuOpen ? `${150 + index * 60}ms` : '0ms' }}
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-6">
            <a
              href="/"
              className={`flex w-full items-center justify-center gap-2 rounded-full bg-white py-4 text-base font-semibold text-[#F16524] transition-all duration-300 hover:scale-[1.02] ${menuOpen ? 'opacity-100' : 'opacity-0'}`}
              style={{ transitionDelay: menuOpen ? '450ms' : '0ms' }}
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Home
            </a>
          </div>
        </aside>
      </div>
    </main>
  )
}
