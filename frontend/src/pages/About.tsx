import { lazy, Suspense } from 'react'
import {
  ArrowRight,
  CalendarDays,
  Code2,
  CodeXml,
  Cloud,
  Cpu,
  Database,
  Frame,
  Gauge,
  GitBranch,
  Layers3,
  Mail,
  Palette,
  PenTool,
  Rocket,
  ScanSearch,
  SearchCheck,
  Server,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTheme } from '@/components/theme/ThemeProvider'

const GLSLHills = lazy(() => import('@/components/ui/glsl-hills').then((module) => ({ default: module.GLSLHills })))

const highlights = [
  { label: 'Years building digital products', value: '7+' },
  { label: 'Website and app projects delivered', value: '200+' },
  { label: 'Positive client feedback', value: '98%' },
]

const principles = [
  {
    icon: SearchCheck,
    title: 'Clarity Before Code',
    text: 'We start by understanding your offer, audience, goals, and sales process so the website supports real business outcomes.',
  },
  {
    icon: Layers3,
    title: 'Design With Structure',
    text: 'Every layout, section, page, and interaction is planned to help visitors scan, trust, compare, and take action quickly.',
  },
  {
    icon: Gauge,
    title: 'Performance Matters',
    text: 'We build fast, responsive, SEO-ready experiences with clean frontend implementation and practical backend control.',
  },
]

const capabilities = [
  'Business websites',
  'Ecommerce stores',
  'Booking systems',
  'Admin dashboards',
  'Client portals',
  'SEO foundations',
  'CMS workflows',
  'Performance optimization',
  'API integrations',
  'Landing pages',
]

const capabilityRows = [capabilities, [...capabilities].reverse()]

const process = [
  {
    icon: ScanSearch,
    title: 'Discover',
    text: 'We map your brand, offer, audience, competitors, content needs, and technical requirements.',
  },
  {
    icon: PenTool,
    title: 'Design',
    text: 'We shape the visual direction, page structure, conversion flow, and user experience around your goals.',
  },
  {
    icon: CodeXml,
    title: 'Build',
    text: 'We develop the frontend and backend, connect content controls, test responsiveness, and polish interactions.',
  },
  {
    icon: Rocket,
    title: 'Launch',
    text: 'We prepare deployment, SEO essentials, performance checks, handover, and ongoing improvement paths.',
  },
]

const ctaOrbitItems = [
  { icon: Code2, color: '#1261ff' },
  { icon: ShoppingCart, color: '#12c8a0' },
  { icon: CalendarDays, color: '#8350e8' },
  { icon: Database, color: '#f59e0b' },
  { icon: SearchCheck, color: '#ef4444' },
  { icon: Server, color: '#0ea5e9' },
  { icon: Cloud, color: '#38bdf8' },
  { icon: GitBranch, color: '#181717' },
  { icon: Frame, color: '#a855f7' },
  { icon: Smartphone, color: '#22c55e' },
  { icon: ShieldCheck, color: '#2563eb' },
  { icon: Rocket, color: '#f97316' },
  { icon: Mail, color: '#64748b' },
  { icon: Palette, color: '#ec4899' },
  { icon: Cpu, color: '#14b8a6' },
]

const ctaOrbitRows = [
  ctaOrbitItems.slice(0, 5),
  ctaOrbitItems.slice(5, 10),
  ctaOrbitItems.slice(10, 15),
]

export function About() {
  const { theme } = useTheme()

  return (
    <main className="about-page home-page overflow-hidden bg-[var(--background)]">
      <section className="relative grid min-h-screen place-items-center overflow-hidden bg-[radial-gradient(circle_at_50%_20%,rgba(88,125,159,0.16),transparent_34%),var(--background)] pt-24 text-[var(--foreground)] md:pt-28">
        <Suspense fallback={null}>
          <GLSLHills className="pointer-events-none absolute inset-0" cameraZ={118} speed={0.42} />
        </Suspense>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,var(--background)_78%)] opacity-70" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,var(--background)_0%,transparent_22%,transparent_70%,var(--background)_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-[linear-gradient(180deg,transparent,var(--background))]" />

        <div className="container-x relative z-10 py-20">
          <div className="mx-auto max-w-5xl text-center">
            <p className="mb-5 text-xs font-extrabold uppercase tracking-[0.28em] text-[#587d9f]">About Bakhtech Solutions</p>
            <h1 className="about-hero-title text-balance text-5xl font-black leading-[0.96] tracking-tight md:text-7xl">
              <span className="block font-medium italic text-[var(--muted)] md:text-6xl">Websites built</span>
              to grow brands.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[var(--muted)] md:text-lg">
              Bakhtech Solutions creates fast websites, ecommerce stores, and digital systems for growing businesses.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/contact" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#ef4444] px-5 text-sm font-black text-white transition hover:opacity-90">
                Start a project
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/portfolio" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)]/70 px-5 text-sm font-black text-[var(--foreground)] backdrop-blur-md transition hover:bg-[var(--surface)]">
                See our work
              </Link>
            </div>
            <div className="about-stats-marquee mt-10 sm:hidden" aria-label="Bakhtech Solutions highlights">
              <div className="about-stats-track">
                {[...highlights, ...highlights].map((item, index) => (
                  <div key={`${item.label}-${index}`} className="about-stats-pill" aria-hidden={index >= highlights.length}>
                    <span className="about-stats-value">{item.value}</span>
                    <span className="about-stats-label">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mx-auto mt-12 hidden max-w-3xl gap-3 sm:grid sm:grid-cols-3">
              {highlights.map((item) => (
                <div key={item.label} className="surface-card rounded-2xl p-5 backdrop-blur-md">
                  <p className="text-3xl font-black text-[var(--foreground)]">{item.value}</p>
                  <p className="text-soft mt-2 text-xs font-semibold leading-5">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="about-section-deferred bg-[var(--background)] py-14 md:py-20">
        <div className="container-x">
          <div className="mx-auto max-w-3xl text-center">
            <p className="home-eyebrow mb-3 text-sm uppercase text-[#587d9f]">What Drives Us</p>
            <h2 className="text-main text-balance text-3xl font-bold tracking-tight md:text-5xl">Strategy, design, and engineering in one clear process.</h2>
            <p className="text-soft mt-4 leading-8">
              We are not only trying to make a website look good. We are building the digital layer your customers use to
              understand your business, trust your offer, and take the next step.
            </p>
          </div>

          <div className="mt-10 grid divide-y divide-dashed border border-dashed border-[var(--line)] md:grid-cols-3 md:divide-x md:divide-y-0">
            {principles.map((item) => (
              <article key={item.title} className="group p-6 md:p-8">
                <span className="feature-icon-ring grid h-12 w-12 place-items-center rounded-xl border-2 border-transparent">
                  <item.icon className="h-5 w-5 text-[#ef4444]" />
                </span>
                <h3 className="text-main mt-6 text-xl font-black">{item.title}</h3>
                <p className="text-soft mt-3 leading-7">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="about-section-deferred how-help-dark py-14 md:py-20">
        <div className="container-x">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="home-eyebrow mb-3 text-sm uppercase text-[#d6e0ed]">How We Help</p>
              <h2 className="text-main text-balance text-3xl font-bold tracking-tight md:text-5xl">Built for brands that need more than a basic page online.</h2>
              <p className="text-soft mt-5 leading-8">
                From the first conversation to launch day, we focus on practical outcomes: clearer messaging, better user
                journeys, faster pages, easier content management, and stronger calls to action.
              </p>
            </div>

            <div className="about-tags-panel">
              {capabilityRows.map((row, rowIndex) => (
                <div key={rowIndex} className="about-tags-row">
                  <div className={rowIndex % 2 === 0 ? 'about-tags-track' : 'about-tags-track about-tags-track-reverse'}>
                    {[...row, ...row].map((item, index) => (
                      <span key={`${rowIndex}-${item}-${index}`} className="about-tag-pill">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="gradient-grid-bg relative overflow-hidden">
        <div className="gradient-grid-bg-layer" aria-hidden="true" />
        <div className="container-x relative z-10 py-14 md:py-20">
          <div className="mx-auto mb-10 max-w-3xl text-center">
            <p className="home-eyebrow mb-3 text-sm uppercase text-[#587d9f]">Our Process</p>
            <h2 className="text-main text-balance text-3xl font-bold tracking-tight md:text-5xl">A focused path from idea to launch.</h2>
            <p className="text-soft mt-4 leading-8">
              We keep every project clear, practical, and easy to follow from the first conversation to launch day.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {process.map((step, index) => (
              <article key={step.title} className="surface-card rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-lg bg-[var(--surface-2)] text-[#ef4444]">
                    <step.icon className="h-5 w-5" />
                  </span>
                  <span className="text-soft text-xs font-black uppercase tracking-[0.2em]">0{index + 1}</span>
                </div>
                <h3 className="text-main mt-7 text-lg font-black">{step.title}</h3>
                <p className="text-soft mt-3 text-sm leading-6">{step.text}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="container-x relative z-10 pb-14 md:pb-20">
          <div className="about-cta-card">
            <div className="relative z-10 max-w-2xl p-6 md:p-10 lg:w-1/2">
              <p className="home-eyebrow mb-3 text-sm uppercase text-[#587d9f]">Your Digital Partner</p>
              <h2 className="text-main text-balance text-4xl font-bold tracking-tight md:text-6xl">Build your next digital advantage.</h2>
              <p className="text-soft mt-4 max-w-2xl leading-8">
                Let us turn your business goals into a fast, modern, trustworthy website or platform that is easy to manage and built to grow.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/contact" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#ef4444] px-5 text-sm font-black text-white transition hover:opacity-90">
                  Start a project
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/portfolio" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)]/70 px-5 text-sm font-black text-[var(--foreground)] backdrop-blur-md transition hover:bg-[var(--surface)]">
                  Learn more
                </Link>
              </div>
            </div>

            <div className="about-cta-orbit-wrap" aria-hidden="true">
              <div className="about-cta-orbit-stage">
                <div className="about-cta-orbit-core">
                  <img src={theme === 'light' ? '/bakhtech-logo-light.png' : '/bakhtech-logo-dark.png'} alt="" className="about-cta-orbit-logo" />
                </div>
                {ctaOrbitRows.map((orbitItems, orbitIndex) => (
                  <div key={orbitIndex} className={`about-cta-orbit about-cta-orbit-${orbitIndex + 1}`}>
                    {orbitItems.map((item, itemIndex) => {
                      const angle = (2 * Math.PI * itemIndex) / orbitItems.length
                      const x = 50 + 50 * Math.cos(angle)
                      const y = 50 + 50 * Math.sin(angle)

                      return (
                        <span
                          key={`${orbitIndex}-${itemIndex}`}
                          className="about-cta-orbit-icon"
                          style={{ left: `${x}%`, top: `${y}%` }}
                        >
                          <item.icon className="h-7 w-7" style={{ color: item.color }} />
                        </span>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
