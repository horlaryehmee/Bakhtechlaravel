import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Globe2, Layers3, Menu, Moon, SearchCheck, ShoppingCart, Sun, X } from 'lucide-react'
import { type Variants } from 'framer-motion'
import { FluidParticles } from '@/components/ui/fluid-particle'
import { AnimatedGroup } from '@/components/ui/animated-group'
import { ButtonLink } from '@/components/ui/button'
import { useTheme } from '@/components/theme/ThemeProvider'
import { cn } from '@/lib/utils'

const services = [
  { icon: Globe2, title: 'Business Websites', text: 'Clear, credible websites that explain your offer and guide visitors to contact you.' },
  { icon: ShoppingCart, title: 'E-commerce Platforms', text: 'Online stores with product pages, checkout flows, payments, and customer-ready layouts.' },
  { icon: Layers3, title: 'Web Apps & Portals', text: 'Dashboards, booking systems, client portals, admin tools, and custom business workflows.' },
  { icon: SearchCheck, title: 'SEO & Performance', text: 'Fast, responsive pages with clean structure, strong messaging, and search-ready foundations.' },
]

const process = [
  'We clarify your offer, audience, and the actions your website must drive.',
  'We design a polished interface that makes your business look trustworthy.',
  'We build the system, connect the features, test it, and prepare it for launch.',
  'We help you go live with a website or app that is easy to use and ready to grow.',
]

const proof = [
  { value: '7+', label: 'Years Experience' },
  { value: '200+', label: 'Websites Designed' },
  { value: '98%', label: 'Positive Feedback' },
]

const transitionVariants: { item: Variants } = {
  item: {
    hidden: {
      opacity: 0,
      filter: 'blur(8px)',
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      transition: {
        type: 'spring',
        bounce: 0.3,
        duration: 1.2,
      },
    },
  },
}

const menuItems = [
  { name: 'Services', href: '#services' },
  { name: 'Process', href: '#process' },
  { name: 'Proof', href: '#proof' },
  { name: 'Contact', href: '/contact' },
]

function Home2Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    handleScroll()
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header>
      <nav data-state={menuOpen ? 'active' : undefined} className="group fixed inset-x-0 top-0 z-[120] px-2">
        <div
          className={cn(
            'mx-auto mt-2 max-w-6xl px-4 transition-all duration-300 lg:px-8',
            isScrolled && 'max-w-4xl rounded-2xl border border-[var(--line)] bg-[var(--surface)]/78 shadow-[var(--shadow-soft)] backdrop-blur-xl lg:px-5',
          )}
        >
          <div className="relative flex flex-wrap items-center justify-between gap-5 py-3 lg:gap-0 lg:py-4">
            <div className="flex w-full justify-between lg:w-auto">
              <Link to="/home-2" aria-label="Bakhtech home 2" className="flex items-center gap-3 text-[var(--foreground)]">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-sm font-black text-[#07101f] shadow-[inset_0_-8px_18px_rgba(17,24,39,0.12)]">
                  BT
                </span>
                <span className="text-sm font-black uppercase tracking-[0.2em]">Bakhtech</span>
              </Link>

              <button
                type="button"
                onClick={() => setMenuOpen((value) => !value)}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                className="relative z-20 -m-2 grid h-11 w-11 cursor-pointer place-items-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] lg:hidden"
              >
                <Menu className="h-5 w-5 transition duration-200 group-data-[state=active]:rotate-180 group-data-[state=active]:scale-0 group-data-[state=active]:opacity-0" />
                <X className="absolute h-5 w-5 -rotate-180 scale-0 opacity-0 transition duration-200 group-data-[state=active]:rotate-0 group-data-[state=active]:scale-100 group-data-[state=active]:opacity-100" />
              </button>
            </div>

            <div className="absolute inset-0 m-auto hidden size-fit lg:block">
              <ul className="flex gap-8 text-sm">
                {menuItems.map((item) => (
                  <li key={item.name}>
                    {item.href.startsWith('/') ? (
                      <Link to={item.href} className="text-soft block transition hover:text-[var(--foreground)]">
                        {item.name}
                      </Link>
                    ) : (
                      <a href={item.href} className="text-soft block transition hover:text-[var(--foreground)]">
                        {item.name}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="hidden w-full flex-wrap items-center justify-end rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-2xl shadow-black/20 group-data-[state=active]:block lg:m-0 lg:flex lg:w-fit lg:gap-4 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none">
              <div className="lg:hidden">
                <ul className="space-y-5 text-base">
                  {menuItems.map((item) => (
                    <li key={item.name}>
                      {item.href.startsWith('/') ? (
                        <Link to={item.href} onClick={() => setMenuOpen(false)} className="text-soft block transition hover:text-[var(--foreground)]">
                          {item.name}
                        </Link>
                      ) : (
                        <a href={item.href} onClick={() => setMenuOpen(false)} className="text-soft block transition hover:text-[var(--foreground)]">
                          {item.name}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row lg:mt-0 lg:w-fit">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--line)] px-4 text-sm font-bold text-[var(--foreground)] transition hover:bg-[var(--surface-2)]"
                  aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  <span className="lg:hidden">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
                </button>
                <Link
                  to="/"
                  className={cn('inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--line)] px-4 text-sm font-bold text-[var(--foreground)] transition hover:bg-[var(--surface-2)]', isScrolled && 'lg:hidden')}
                >
                  Home 1
                </Link>
                <Link
                  to="/contact"
                  className={cn('inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--foreground)] px-4 text-sm font-black text-[var(--background)] transition hover:opacity-90', isScrolled && 'lg:hidden')}
                >
                  Get Started
                </Link>
                <Link
                  to="/contact"
                  className={cn('hidden min-h-10 items-center justify-center rounded-xl bg-[var(--foreground)] px-4 text-sm font-black text-[var(--background)] transition hover:opacity-90', isScrolled && 'lg:inline-flex')}
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  )
}

export function Home2() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <>
      <Home2Header />
      <main className="overflow-hidden">
      <section className="relative min-h-[100svh] overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
        <FluidParticles
          className="absolute inset-0 h-full w-full"
          particleDensity={130}
          particleSize={1.15}
          particleColor={isDark ? 'rgba(148,163,184,0.48)' : 'rgba(71,85,105,0.34)'}
          activeColor={isDark ? '#ffffff' : '#0b1220'}
          interactionDistance={95}
          hoverDelay={80}
          maxBlastRadius={260}
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 z-[2] hidden opacity-50 contain-strict lg:block">
          <div className="absolute left-0 top-0 h-[80rem] w-[35rem] -translate-y-[350px] -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.12)_0,hsla(0,0%,55%,.04)_50%,hsla(0,0%,45%,0)_80%)]" />
          <div className="absolute left-0 top-0 h-[80rem] w-56 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.08)_0,hsla(0,0%,45%,.03)_80%,transparent_100%)] [translate:5%_-50%]" />
          <div className="absolute left-0 top-0 h-[80rem] w-56 -translate-y-[350px] -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.03)_80%,transparent_100%)]" />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,color-mix(in_srgb,var(--brand)_20%,transparent),transparent_34%),radial-gradient(circle_at_85%_16%,color-mix(in_srgb,var(--brand-2)_16%,transparent),transparent_28%),linear-gradient(180deg,color-mix(in_srgb,var(--background)_72%,transparent),var(--background)_88%)]" />

        <div className="container-x relative z-10 flex min-h-[100svh] flex-col justify-center pb-16 pt-28 text-center md:pt-36">
          <AnimatedGroup variants={transitionVariants} className="mx-auto max-w-5xl">
            <Link
              to="/contact"
              className="mx-auto flex w-fit items-center gap-4 rounded-full border border-[var(--line)] bg-[var(--surface)]/78 p-1 pl-4 shadow-md shadow-black/10 transition-all duration-300 hover:bg-[var(--surface)]"
            >
              <span className="text-soft text-sm">Full-stack web development for growing businesses</span>
              <span className="block h-4 w-0.5 border-l border-[var(--line)]" />
              <span className="grid h-6 w-6 overflow-hidden rounded-full bg-[var(--foreground)] text-[var(--background)]">
                <ArrowRight className="m-auto h-3 w-3" />
              </span>
            </Link>

            <h1 className="mx-auto mt-8 max-w-5xl text-balance text-5xl font-black leading-[0.95] tracking-tight md:text-7xl lg:mt-14 xl:text-[5.6rem]">
              <span className="block">Need a website</span>
              <span className="hero-ink-title block md:whitespace-nowrap">
                that stands out?
                <span className="hero-ink-stroke" aria-hidden="true">
                  <svg className="hero-ink-line" viewBox="0 0 520 52" preserveAspectRatio="none" focusable="false">
                    <path d="M14 31C142 17 311 15 470 31" />
                  </svg>
                  <svg className="hero-ink-pencil" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
                    <path d="M15.2 4.2L19.8 8.8" />
                    <path d="M4.4 19.6L6 14.2L16.3 3.9C17.2 3 18.7 3 19.6 3.9L20.1 4.4C21 5.3 21 6.8 20.1 7.7L9.8 18L4.4 19.6Z" />
                    <path d="M6 14.2L9.8 18" />
                  </svg>
                </span>
              </span>
            </h1>
            <p className="text-soft mx-auto mt-8 max-w-2xl text-balance text-lg font-normal leading-8 md:text-xl">
              Look no further. Bakhtech Solutions specializes in creating visually striking, user-friendly websites.
            </p>
          </AnimatedGroup>

          <AnimatedGroup
            variants={{
              container: {
                visible: {
                  transition: {
                    staggerChildren: 0.05,
                    delayChildren: 0.35,
                  },
                },
              },
              ...transitionVariants,
            }}
            className="mt-10 flex flex-col items-center justify-center gap-3 md:flex-row"
          >
            <div className="rounded-[14px] border border-[var(--line)] bg-[var(--surface-2)] p-0.5">
              <Link to="/contact" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--foreground)] px-6 text-base font-black text-[var(--background)]">
                <span className="text-nowrap">Start Building</span>
              </Link>
            </div>
            <Link to="/portfolio" className="inline-flex min-h-12 items-center justify-center rounded-xl px-6 text-base font-bold text-[var(--foreground)] transition hover:bg-[var(--surface-2)]">
              <span className="text-nowrap">View Portfolio</span>
            </Link>
          </AnimatedGroup>

          <AnimatedGroup
            preset="slide"
            className="relative mx-auto mt-12 w-full max-w-6xl overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]/74 p-4 shadow-lg shadow-black/10 ring-1 ring-[var(--line)] md:mt-16"
          >
            <div className="grid gap-4 md:grid-cols-3">
              {proof.map((item) => (
                <div key={item.label} className="surface-card rounded-xl p-5">
                  <div className="text-4xl font-black tracking-tight">{item.value}</div>
                  <div className="text-soft mt-2 text-sm font-semibold">{item.label}</div>
                </div>
              ))}
            </div>
          </AnimatedGroup>
        </div>
      </section>

      <section id="services" className="section-bg py-20 md:py-28">
        <div className="container-x">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="mb-3 text-sm font-black uppercase tracking-[0.22em] text-[#1261ff]">What We Build</p>
              <h2 className="text-main text-3xl font-black tracking-tight md:text-5xl">
                Complete web development for businesses that need more than a pretty page.
              </h2>
            </div>
            <p className="text-soft text-lg leading-8">
              From your first landing page to a full web app, Bakhtech handles strategy, UI/UX, development, integrations, deployment, and post-launch support.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <article key={service.title} className="surface-card rounded-lg p-6">
                <service.icon className="mb-5 h-7 w-7 text-[#1261ff]" />
                <h3 className="text-main text-xl font-black">{service.title}</h3>
                <p className="text-soft mt-3 leading-7">{service.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="process" className="section-strong py-20 md:py-28">
        <div className="container-x grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="mb-3 text-sm font-black uppercase tracking-[0.22em] text-[#1261ff]">Our Approach</p>
            <h2 className="text-main text-3xl font-black tracking-tight md:text-5xl">
              A smooth path from idea to launch.
            </h2>
            <p className="text-soft mt-5 text-lg leading-8">
              We keep the process clear so you always know what is being built, why it matters, and how it helps your business grow.
            </p>
            <div className="mt-8">
              <ButtonLink href="/contact">Start Your Project</ButtonLink>
            </div>
          </div>

          <div className="grid gap-4">
            {process.map((step, index) => (
              <div key={step} className="surface-card flex gap-4 rounded-lg p-5">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#1261ff] text-sm font-black text-white">
                  {index + 1}
                </div>
                <p className="text-main leading-7">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="proof" className="bg-[#30373f] py-20 text-white md:py-24">
        <div className="container-x grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="mb-3 text-sm font-black uppercase tracking-[0.22em] text-[#67e8cf]">Ready To Build?</p>
            <h2 className="max-w-3xl text-3xl font-black tracking-tight md:text-5xl">
              Tell us what you want your website or web app to do.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-200">
              We will help you shape the pages, features, content, and launch plan needed to turn visitors into customers.
            </p>
          </div>
          <a
            href="/contact"
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-white px-7 text-sm font-black text-[#07101f] transition hover:-translate-y-0.5"
          >
            Get a Quote <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>
      </main>
    </>
  )
}
