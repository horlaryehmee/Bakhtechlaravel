import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarCheck, Globe2, Layers3, Megaphone, Menu, Moon, Plus, SearchCheck, ShoppingCart, Sun, X } from 'lucide-react'
import { type Variants } from 'framer-motion'
import { FluidParticles } from '@/components/ui/fluid-particle'
import { AnimatedGroup } from '@/components/ui/animated-group'
import { ShineBorder, TypeWriter } from '@/components/ui/hero-designali'
import { AnimatedImageMarquee } from '@/components/ui/hero-3'
import { InfiniteSlider } from '@/components/ui/infinite-slider'
import { ProgressiveBlur } from '@/components/ui/progressive-blur'
import { Sparkles } from '@/components/ui/sparkles'
import { FeatureCard } from '@/components/ui/grid-feature-cards'
import { ButtonLink } from '@/components/ui/button'
import { useTheme } from '@/components/theme/ThemeProvider'
import { cn } from '@/lib/utils'

const services = [
  { icon: Globe2, title: 'Business Websites', description: 'Clear, credible websites that explain your offer and guide visitors to contact you.' },
  { icon: ShoppingCart, title: 'E-commerce Platforms', description: 'Online stores with product pages, checkout flows, payments, and customer-ready layouts.' },
  { icon: Layers3, title: 'Web Apps & Portals', description: 'Dashboards, booking systems, client portals, admin tools, and custom business workflows.' },
  { icon: CalendarCheck, title: 'Booking Systems', description: 'Appointment flows, service selection, reminders, and lead capture built around your operations.' },
  { icon: SearchCheck, title: 'SEO, UI/UX & Performance', description: 'Search-ready structure, modern interfaces, fast pages, and content flows built to convert.' },
  { icon: Megaphone, title: 'Social Media Management', description: 'Content planning, creative direction, post design, and brand consistency across social channels.' },
]

const process = [
  'We clarify your offer, audience, and the actions your website must drive.',
  'We design a polished interface that makes your business look trustworthy.',
  'We build the system, connect the features, test it, and prepare it for launch.',
  'We help you go live with a website or app that is easy to use and ready to grow.',
]

const talkAbout = ['Websites', 'Web Apps', 'Ecommerce', 'Booking Systems', 'Dashboards', 'Client Portals', 'UI/UX']

const showcaseImages = [
  '/showcase/showcase-01.jpg',
  '/showcase/showcase-02.jpg',
  '/showcase/showcase-03.jpg',
  '/showcase/showcase-04.jpg',
  '/showcase/showcase-05.jpg',
  '/showcase/showcase-06.jpg',
  '/showcase/showcase-07.jpg',
  '/showcase/showcase-08.jpg',
]

const serviceItems = [
  'Business Websites',
  'Ecommerce Stores',
  'Web Apps',
  'Booking Systems',
  'Dashboards',
  'Client Portals',
  'Landing Pages',
  'SEO',
  'UI/UX Design',
  'API Integrations',
  'CMS Websites',
  'Performance Optimization',
]

const industryItems = [
  'Beauty & Aesthetics',
  'Ecommerce',
  'Real Estate',
  'Healthcare',
  'Education',
  'Restaurants',
  'Fashion',
  'Automotive',
  'Consulting',
  'Events',
  'Travel & Tours',
  'Nonprofits',
  'Professional Services',
  'Startups',
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
            'mx-auto mt-2 max-w-6xl rounded-2xl border border-[var(--line)] bg-[var(--surface)]/58 px-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl transition-all duration-300 lg:px-8',
            isScrolled && 'max-w-4xl bg-[var(--surface)]/72 shadow-[var(--shadow-soft)] lg:px-5',
          )}
        >
          <div className="relative flex flex-wrap items-center justify-between gap-5 py-3 lg:gap-0 lg:py-4">
            <div className="flex w-full justify-between lg:w-auto">
              <Link to="/home-2" aria-label="Bakhtech home 2" className="flex items-center gap-3 text-[var(--foreground)]">
                <img
                  src={theme === 'light' ? '/bakhtech-logo-light.png' : '/bakhtech-logo-dark.png'}
                  alt="Bakhtech"
                  className="h-10 w-auto"
                />
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
          particleDensity={220}
          particleSize={1}
          particleColor={isDark ? '#555555' : '#555555'}
          activeColor={isDark ? '#ffffff' : '#000000'}
          maxBlastRadius={300}
          hoverDelay={1}
          interactionDistance={100}
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 z-[2] hidden opacity-50 contain-strict lg:block">
          <div className="absolute left-0 top-0 h-[80rem] w-[35rem] -translate-y-[350px] -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.12)_0,hsla(0,0%,55%,.04)_50%,hsla(0,0%,45%,0)_80%)]" />
          <div className="absolute left-0 top-0 h-[80rem] w-56 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.08)_0,hsla(0,0%,45%,.03)_80%,transparent_100%)] [translate:5%_-50%]" />
          <div className="absolute left-0 top-0 h-[80rem] w-56 -translate-y-[350px] -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.03)_80%,transparent_100%)]" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,color-mix(in_srgb,var(--brand)_10%,transparent),transparent_34%),linear-gradient(180deg,color-mix(in_srgb,var(--background)_42%,transparent),var(--background)_94%)]" />

        <div className="container-x relative z-10 flex min-h-[100svh] flex-col justify-center pb-10 pt-28 text-center md:pb-16 md:pt-36">
          <AnimatedGroup variants={transitionVariants} className="mx-auto max-w-5xl">
            <div className="relative mx-auto h-full border border-[var(--line)] bg-[var(--background)]/72 p-6 py-10 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm [mask-image:radial-gradient(800rem_96rem_at_center,white,transparent)] md:px-10 md:py-12">
              <Plus strokeWidth={4} className="absolute -left-5 -top-5 h-10 w-10 text-[#ef4444]" />
              <Plus strokeWidth={4} className="absolute -bottom-5 -left-5 h-10 w-10 text-[#ef4444]" />
              <Plus strokeWidth={4} className="absolute -right-5 -top-5 h-10 w-10 text-[#ef4444]" />
              <Plus strokeWidth={4} className="absolute -bottom-5 -right-5 h-10 w-10 text-[#ef4444]" />
              <h1 className="mx-auto flex max-w-5xl flex-col text-center text-5xl font-semibold leading-none tracking-tight md:text-7xl lg:text-8xl">
                <span>
                  Need a website{' '}
                  <span className="text-[#ef4444]">that stands out?</span>
                </span>
              </h1>
            </div>

            <h2 className="text-main mt-8 text-2xl font-semibold md:text-3xl">
              Welcome to Bakhtech Solutions.
            </h2>

            <p className="text-soft mx-auto max-w-2xl py-4 text-base leading-7 md:text-lg">
              We craft high-converting digital products for businesses, including{' '}
              <span className="font-bold text-[#1261ff]">
                <TypeWriter strings={talkAbout} />
              </span>
              .
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
            className="mt-3 flex items-center justify-center gap-2 sm:gap-3"
          >
            <Link to="/contact" className="w-[min(46vw,11rem)] sm:w-auto sm:max-w-[18rem]">
              <ShineBorder
                borderWidth={3}
                className="h-auto w-full cursor-pointer border bg-white/5 p-2 backdrop-blur-md dark:bg-black/5"
                color={['#FF007F', '#39FF14', '#00FFFF']}
              >
                <span className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--foreground)] px-3 text-xs font-bold text-[var(--background)] sm:px-5 sm:text-sm">
                  Start Building
                </span>
              </ShineBorder>
            </Link>
            <Link to="/contact" className="inline-flex min-h-12 w-[min(46vw,11rem)] items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)]/60 px-3 text-xs font-bold text-[var(--foreground)] transition hover:bg-[var(--surface-2)] sm:w-auto sm:max-w-[18rem] sm:px-6 sm:text-base">
              <span className="text-nowrap">Book a call</span>
            </Link>
          </AnimatedGroup>

          <AnimatedGroup preset="slide" className="relative mt-7 h-[7.6rem] w-full overflow-hidden sm:h-[9.2rem] md:mt-10 md:h-[11.25rem]">
            <AnimatedImageMarquee
              images={showcaseImages}
              className="h-full [mask-image:linear-gradient(to_right,transparent,black_9%,black_91%,transparent)]"
              duration={68}
              straight
              trackClassName="gap-4 px-4 sm:gap-5 md:gap-10 md:px-10"
              cardClassName="h-[7.6rem] w-[13.5rem] rounded-md border border-[var(--line)] bg-[var(--surface)] shadow-[0_18px_48px_rgba(15,23,42,0.12)] sm:h-[9.2rem] sm:w-[16.35rem] md:h-[11.25rem] md:w-[20rem]"
            />
          </AnimatedGroup>

        </div>
      </section>

      <section className="relative overflow-hidden bg-[var(--background)] pt-16 pb-6 md:pt-20 md:pb-8">
        <div className="container-x relative z-10">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-main text-3xl font-black tracking-tight md:text-5xl">
              Built for businesses that need more than a website.
            </h2>
            <p className="text-soft mt-5 text-lg leading-8">
              Bakhtech combines design, development, and launch strategy to create digital products people can trust and use.
            </p>
          </div>

          <div className="relative mx-auto mt-9 grid w-full max-w-5xl gap-4">
            <InfiniteSlider className="flex h-14 w-full items-center" duration={48} gap={18}>
              {serviceItems.map((item) => (
                <div key={item} className="surface-card flex h-12 min-w-max items-center justify-center rounded-full px-5 text-sm font-black text-[var(--foreground)]">
                  {item}
                </div>
              ))}
            </InfiniteSlider>

            <InfiniteSlider className="flex h-14 w-full items-center" duration={52} gap={18} reverse>
              {industryItems.map((item) => (
                <div key={item} className="surface-card flex h-12 min-w-max items-center justify-center rounded-full px-5 text-sm font-black text-[var(--foreground)]">
                  {item}
                </div>
              ))}
            </InfiniteSlider>

            <ProgressiveBlur className="pointer-events-none absolute left-0 top-0 h-full w-28 md:w-48" direction="left" blurIntensity={1} />
            <ProgressiveBlur className="pointer-events-none absolute right-0 top-0 h-full w-28 md:w-48" direction="right" blurIntensity={1} />
          </div>
        </div>

        <div className="relative -mt-16 h-40 w-full overflow-hidden [mask-image:radial-gradient(50%_50%,white,transparent)] md:h-52">
          <div className="absolute inset-0 before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_bottom_center,#8350e8,transparent_70%)] before:opacity-40" />
          <div className="absolute -left-1/2 top-1/2 z-10 aspect-[1/0.7] w-[200%] rounded-[100%] border-t border-zinc-900/20 bg-[var(--background)] dark:border-white/20" />
          <Sparkles
            density={520}
            className="absolute inset-x-0 bottom-0 h-full w-full [mask-image:radial-gradient(50%_50%,white,transparent_85%)]"
            color={isDark ? '#ffffff' : '#000000'}
          />
        </div>
      </section>

      <section id="services" className="section-bg pt-10 pb-20 md:pt-14 md:pb-28">
        <div className="mx-auto w-full max-w-5xl space-y-8 px-4">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-3 text-sm font-black uppercase tracking-[0.22em] text-[#1261ff]">What We Build</p>
            <h2 className="text-main text-balance text-3xl font-bold tracking-wide md:text-4xl lg:text-5xl xl:font-extrabold">
              Strategy. Design. Development. Launch.
            </h2>
            <p className="text-soft mt-4 text-balance text-sm tracking-wide md:text-base">
              Complete web development services for brands that need fast, secure, scalable digital products.
            </p>
          </div>

          <div className="grid grid-cols-1 divide-y divide-dashed border border-dashed border-[var(--line)] sm:grid-cols-2 sm:divide-x md:grid-cols-3">
            {services.map((service) => (
              <FeatureCard key={service.title} feature={service} />
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
