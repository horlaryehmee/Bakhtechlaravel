import { Link } from 'react-router-dom'
import { useState, type ReactNode } from 'react'
import {
  ArrowRight,
  Check,
  Code2,
  Globe2,
  Layers3,
  Menu,
  MessageCircle,
  Rocket,
  ShieldCheck,
  Star,
  X,
  Zap,
} from 'lucide-react'
import { navigation } from '@/data/site'

type AgencyHomeTemplateProps = {
  preview?: boolean
}

const clientLogos = [
  { name: 'Think Canada Education Fair', src: '/assets/client-logos-original/tcf.png', width: 'w-[18rem]' },
  { name: 'Maple Education Canada', src: '/assets/client-logos-original/mec.png', width: 'w-[14rem]' },
  { name: '5th Perfumery', src: '/assets/client-logos-original/5th-perfumery.png', width: 'w-[8rem]' },
  { name: 'Bayara Nigeria', src: '/assets/client-logos-original/bayara.png', width: 'w-[7.5rem]' },
  { name: 'Celeb Beauty Clinic', src: '/assets/client-logos-original/celeb.png', width: 'w-[8.5rem]' },
  { name: 'Spazio', src: '/assets/client-logos-original/spazio.png', width: 'w-[7.5rem]' },
  { name: 'Island Supermarket', src: '/assets/client-logos-original/island.png', width: 'w-[9.5rem]' },
  { name: 'Sanctuary Aesthetics and Spa', src: '/assets/client-logos-original/sanctuary.png', width: 'w-[15.5rem]' },
  { name: "Kiehl's", src: '/assets/client-logos-original/kiehls.png', width: 'w-[13.5rem]' },
]

const services = [
  {
    title: 'Websites that explain fast',
    text: 'Clear positioning, sharp sections, and responsive pages built for visitors who scan before they decide.',
    icon: Layers3,
  },
  {
    title: 'Ecommerce and booking flows',
    text: 'Product pages, checkout journeys, appointment systems, payments, confirmations, and reminders.',
    icon: Rocket,
  },
  {
    title: 'Custom portals and dashboards',
    text: 'Internal tools, admin panels, client portals, automations, and reporting screens that support daily work.',
    icon: Code2,
  },
]

const projectCards = [
  ['AI service landing page', 'A conversion-focused page that makes a technical offer easy to understand.', 'Strategy, UI, React'],
  ['Booking platform build', 'A calendar-led workflow with payment options and client notifications.', 'Laravel, Payments'],
  ['Business website refresh', 'A clearer homepage structure for a service company with stronger calls to action.', 'Copy, Design'],
  ['Client portal dashboard', 'A secure workspace for managing requests, files, status, and messages.', 'Portal, Admin'],
  ['Ecommerce storefront', 'A polished product journey with faster browsing and payment-ready checkout.', 'Shop, Checkout'],
  ['SEO content system', 'CMS pages with metadata, structured content, and admin publishing controls.', 'CMS, SEO'],
]

const testimonials = [
  ['Excellent communication and a polished delivery. The site finally explains what we do without needing a call first.', 'Amina Yusuf', 'Founder, Retail Brand'],
  ['Bakhtech turned our booking process into a clean online flow. Clients understand the offer and our team saves time.', 'Daniel Okafor', 'Operations Lead'],
  ['The dashboard was practical from day one. It matched how our team works and removed a lot of manual tracking.', 'Maya Johnson', 'Product Manager'],
]

const comparisonRows = [
  ['Approach', 'Design and engineering planned together', 'Disconnected vendors and handoffs'],
  ['Process', 'Clear milestones and async updates', 'Endless meetings and vague timelines'],
  ['Output', 'Production-ready pages and workflows', 'Static mockups that still need rebuilding'],
  ['Support', 'Launch, maintenance, and iteration', 'One-off delivery with no system thinking'],
]

const pricingCards: Array<{ title: string; text: string; price: string; features: string[] }> = [
  { title: 'Starter Website', text: 'For small teams that need a sharp online presence.', price: 'From NGN 450k', features: ['Strategy session', 'Up to 5 pages', 'Responsive design', 'Basic SEO setup'] },
  { title: 'Growth Platform', text: 'For businesses that need bookings, payments, or content workflows.', price: 'From NGN 950k', features: ['UX planning', 'CMS/admin setup', 'Payment or booking flow', 'Launch support'] },
  { title: 'Custom System', text: 'For portals, dashboards, ecommerce, and complex business tools.', price: 'Custom quote', features: ['Workflow mapping', 'Laravel + React build', 'Integrations', 'Ongoing improvements'] },
]

function TemplateShell({ children, preview = false }: { children: ReactNode; preview?: boolean }) {
  const [showPreviewBanner, setShowPreviewBanner] = useState(preview)

  return (
    <main className="agency-template min-h-screen overflow-hidden bg-[#efeee8] text-[#111111] antialiased">
      {showPreviewBanner ? (
        <div className="fixed inset-x-0 top-0 z-[180] flex min-h-8 items-center justify-center border-b border-amber-300/20 bg-amber-300 px-12 py-2 text-center text-xs font-black uppercase tracking-[0.18em] text-[#111827]">
          <span>Admin preview only</span>
          <button
            type="button"
            className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-[#111827] transition hover:bg-black/10"
            aria-label="Close admin preview notice"
            onClick={() => setShowPreviewBanner(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      {children}
    </main>
  )
}

function ChatPill({ label = 'Chat with us' }: { label?: string }) {
  return (
    <Link to="/contact" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/15 bg-black/42 px-1.5 pr-4 text-sm font-bold text-white shadow-[0_20px_70px_rgba(0,0,0,0.25)] backdrop-blur-xl transition hover:bg-white/10">
      <span className="grid h-8 w-8 place-items-center rounded-md bg-[#ffc400] text-[#0b0b08]">
        <MessageCircle className="h-4 w-4" />
      </span>
      {label}
    </Link>
  )
}

function HeroOrbitArc() {
  return (
    <div className="absolute -bottom-[25rem] left-1/2 flex h-full w-full -translate-x-1/2 justify-center md:-bottom-[20.15rem]">
      <svg
        className="h-[62rem] w-[68rem] max-w-none md:h-[112.875rem] md:w-[121.9375rem]"
        width="1951"
        height="1806"
        viewBox="0 0 1951 1806"
        fill="none"
        overflow="visible"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="bakhtech-orbit-stroke" x1="259" y1="845" x2="1687" y2="846" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6f3f1c" stopOpacity="0" />
            <stop offset="0.21" stopColor="#8f5428" stopOpacity="0.12" />
            <stop offset="0.35" stopColor="#d78343" stopOpacity="0.52" />
            <stop offset="0.48" stopColor="#ffad67" />
            <stop offset="0.58" stopColor="#f6a05d" stopOpacity="0.86" />
            <stop offset="0.72" stopColor="#a66331" stopOpacity="0.18" />
            <stop offset="1" stopColor="#6f3f1c" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="bakhtech-orbit-fill" cx="0" cy="0" r="1" gradientTransform="matrix(0 -384 761 0 975 265)" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffb265" stopOpacity="0.34" />
            <stop offset="0.36" stopColor="#a7632f" stopOpacity="0.12" />
            <stop offset="1" stopColor="#030302" stopOpacity="0" />
          </radialGradient>
          <filter id="bakhtech-orbit-glow" x="94" y="147" width="1763" height="1618" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="-9" stdDeviation="24" floodColor="#e58a42" floodOpacity="0.58" />
            <feDropShadow dx="0" dy="-2" stdDeviation="8" floodColor="#ffbd75" floodOpacity="0.5" />
          </filter>
        </defs>
        <path
          d="M975.5 255C1402.88 255 1749 569.029 1749 956C1749 1342.97 1402.88 1657 975.5 1657C548.119 1657 202 1342.97 202 956C202 569.029 548.119 255 975.5 255Z"
          fill="url(#bakhtech-orbit-fill)"
          opacity="0.84"
        />
        <path
          d="M975.5 255C1402.88 255 1749 569.029 1749 956C1749 1342.97 1402.88 1657 975.5 1657C548.119 1657 202 1342.97 202 956C202 569.029 548.119 255 975.5 255Z"
          stroke="url(#bakhtech-orbit-stroke)"
          strokeWidth="2.4"
          strokeLinecap="round"
          filter="url(#bakhtech-orbit-glow)"
        />
      </svg>
    </div>
  )
}

export function AgencyHomeTemplate({ preview = false }: AgencyHomeTemplateProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <TemplateShell preview={preview}>
      <section className="relative mx-auto my-2 min-h-[min(41rem,calc(100svh-1rem))] w-[calc(100%-1rem)] max-w-[calc(100vw-1rem)] overflow-hidden rounded-[1.45rem] bg-[#020302] px-5 pb-0 pt-0 text-white md:my-3 md:min-h-[min(56rem,calc(100svh-1.5rem))] md:w-[calc(100%-1.5rem)] md:max-w-none md:px-8">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px)] bg-[size:70px_70px] opacity-60" />
          <div className="absolute inset-x-0 top-0 h-[24rem] bg-[linear-gradient(rgba(255,255,255,0.075)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.075)_1px,transparent_1px)] bg-[size:70px_70px] opacity-70" />
          <div className="absolute left-1/2 top-0 h-[38rem] w-[54rem] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(190,132,57,0.34),rgba(82,52,25,0.22)_38%,transparent_74%)]" />
          <div className="absolute inset-x-0 top-0 h-[18rem] bg-[radial-gradient(circle_at_3%_24%,rgba(255,255,255,0.72)_0_1px,transparent_1.5px),radial-gradient(circle_at_7%_14%,rgba(255,255,255,0.92)_0_1px,transparent_1.5px),radial-gradient(circle_at_13%_8%,rgba(255,255,255,0.42)_0_1px,transparent_1.5px),radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.38)_0_1px,transparent_1.5px),radial-gradient(circle_at_31%_5%,rgba(255,255,255,0.56)_0_1px,transparent_1.5px),radial-gradient(circle_at_43%_27%,rgba(255,255,255,0.76)_0_1px,transparent_1.5px),radial-gradient(circle_at_56%_14%,rgba(255,255,255,0.34)_0_1px,transparent_1.5px),radial-gradient(circle_at_69%_28%,rgba(255,255,255,0.82)_0_1px,transparent_1.5px),radial-gradient(circle_at_81%_15%,rgba(255,255,255,0.44)_0_1px,transparent_1.5px),radial-gradient(circle_at_91%_7%,rgba(255,255,255,0.96)_0_1px,transparent_1.5px),radial-gradient(circle_at_98%_2%,rgba(255,255,255,0.74)_0_1px,transparent_1.5px)] opacity-95" />
          <div className="absolute left-[62%] top-[16.5%] h-[4.35rem] w-[4.35rem] bg-[#9d7422]/16" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#020302_0%,rgba(2,3,2,0.18)_28%,rgba(2,3,2,0.12)_64%,#020302_100%)]" />
          <HeroOrbitArc />
          <div className="absolute bottom-[-1.9rem] left-1/2 -translate-x-1/2 select-none text-[clamp(5.8rem,27vw,8rem)] font-black leading-none tracking-normal text-white/[0.055] md:bottom-[-5.8rem] md:text-[clamp(8rem,22vw,20rem)]">
            Bakhtech
          </div>
        </div>

        <nav className="relative z-20 mx-auto flex max-w-[86rem] items-center justify-between py-6 md:py-7">
          <Link to="/" className="flex items-center" aria-label="Bakhtech home" onClick={() => setMobileMenuOpen(false)}>
            <img src="/bakhtech-logo-dark.png" alt="Bakhtech" className="h-8 w-auto object-contain md:h-10" width="160" height="40" decoding="async" />
          </Link>
          <div className="hidden items-center gap-14 text-sm font-bold text-white/82 md:flex">
            {navigation.map((item) => (
              <Link key={`${item.label}-${item.href}`} to={item.href} className="hover:text-white">
                {item.label}
              </Link>
            ))}
          </div>
          <Link to="/booking" className="hidden min-h-10 items-center justify-center rounded-xl bg-white px-4 text-sm font-black text-[#06070b] transition hover:bg-white/88 md:inline-flex">
            Book now
          </Link>
          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            className="grid h-10 w-10 place-items-center rounded-xl text-white transition hover:bg-white/10 md:hidden"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          {mobileMenuOpen ? (
            <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl border border-white/10 bg-black/82 p-2 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-2xl md:hidden">
              {navigation.map((item) => (
                <Link
                  key={`${item.label}-${item.href}`}
                  to={item.href}
                  className="flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-white/86 transition hover:bg-white/10 hover:text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                to="/booking"
                className="mt-2 flex min-h-11 items-center justify-center rounded-xl bg-white px-3 text-sm font-black text-[#06070b]"
                onClick={() => setMobileMenuOpen(false)}
              >
                Book now
              </Link>
            </div>
          ) : null}
        </nav>

        <div className="relative z-10 mx-auto grid max-w-[86rem] gap-6 pb-20 pt-14 md:gap-12 md:pb-36 md:pt-[12.5rem] md:grid-cols-[minmax(0,1.65fr)_minmax(20rem,0.9fr)] md:items-start">
          <div>
            <Link to="/pricing" className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.075] p-1 pr-3 text-[0.7rem] font-black text-white shadow-[0_20px_70px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:text-xs">
              <span className="rounded-full bg-black px-2.5 py-1.5 text-white">Bakhtech</span>
              <span className="truncate">New digital products every month</span>
            </Link>
            <h1 className="mt-8 max-w-[46rem] text-[clamp(2.45rem,9vw,3.45rem)] font-semibold leading-[0.98] tracking-normal text-white md:mt-10 md:text-[clamp(3.2rem,3.9vw,4.9rem)]">
              The best design and development agency in the world.
            </h1>
          </div>

          <div className="pt-0 md:pt-20">
            <p className="max-w-[24rem] text-base font-semibold leading-7 text-white md:text-xl md:leading-8">
              We design and build websites that drive results and help your business grow. No Calls. No BS. Just Results.
            </p>
            <div className="mt-6 md:mt-9">
              <ChatPill label="Chat with us" />
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-black/5 bg-[#efeee8] px-4 py-10">
        <div className="mx-auto max-w-6xl overflow-hidden">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-black/40">Trusted by fast-growing brands</p>
          <div className="relative mt-8 overflow-hidden">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#efeee8] to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#efeee8] to-transparent" />
            <div className="marquee-track flex w-max items-center gap-12 [--marquee-duration:44s]">
              {[...clientLogos, ...clientLogos].map((logo, index) => (
                <div key={`${logo.name}-${index}`} className={`${logo.width} flex h-20 shrink-0 items-center justify-center overflow-visible`}>
                  <img
                    src={logo.src}
                    alt={logo.name}
                    className="block h-auto max-h-16 w-full object-contain grayscale opacity-55 contrast-125 transition hover:grayscale-0 hover:opacity-90"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#60a5fa]">What we build</p>
              <h2 className="mt-4 text-4xl font-black tracking-normal md:text-6xl">Replace scattered vendors with one digital build team.</h2>
            </div>
            <p className="text-lg font-semibold leading-8 text-black/58">From first impression to payment, booking, onboarding, and operations, the goal is a business system that looks polished and works cleanly.</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {services.map((service) => {
              const Icon = service.icon
              return (
                <article key={service.title} className="rounded-[1.5rem] border border-black/5 bg-white p-6 shadow-sm">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#111111] text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-8 text-2xl font-black">{service.title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-7 text-black/58">{service.text}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section id="work" className="px-4 pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#34d399]">Projects</p>
              <h2 className="mt-4 text-4xl font-black tracking-normal md:text-6xl">Built around outcomes.</h2>
            </div>
            <Link to="/portfolio" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-black/10 px-5 text-sm font-black text-black hover:bg-white">
              See portfolio <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projectCards.map(([title, text, tags]) => (
              <article key={title} className="group rounded-[1.5rem] border border-black/5 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                <div className="grid aspect-[1.45] place-items-center rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgba(239,68,68,0.3),transparent_34%),linear-gradient(135deg,#111827,#0f172a)]">
                  <Globe2 className="h-12 w-12 text-white/42" />
                </div>
                <h3 className="mt-5 text-xl font-black">{title}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-black/58">{text}</p>
                <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-black/36">{tags}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-24">
        <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <article className="rounded-[2rem] border border-black/5 bg-white p-8 shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#facc15]">Scaling successful companies</p>
            <h2 className="mt-4 text-5xl font-black tracking-normal">50+</h2>
            <p className="mt-4 text-lg font-semibold leading-8 text-black/58">Projects, workflows, and digital experiences delivered across websites, ecommerce, bookings, portals, and custom software.</p>
            <div className="mt-8 flex -space-x-3">
              {[1, 2, 3, 4].map((item) => (
                <span key={item} className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#06070b] bg-white text-sm font-black text-[#06070b]">B{item}</span>
              ))}
            </div>
          </article>
          <div className="grid gap-4 md:grid-cols-3">
            {testimonials.map(([quote, name, role]) => (
              <article key={name} className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm">
                <div className="flex gap-1 text-[#facc15]">{[1, 2, 3, 4, 5].map((star) => <Star key={star} className="h-4 w-4 fill-current" />)}</div>
                <p className="mt-5 text-sm font-semibold leading-7 text-black/62">"{quote}"</p>
                <p className="mt-6 font-black">{name}</p>
                <p className="text-sm font-semibold text-black/42">{role}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-24">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-black/5 bg-white p-5 shadow-sm md:p-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#60a5fa]">Bakhtech vs traditional providers</p>
              <h2 className="mt-4 text-4xl font-black tracking-normal">A cleaner way to ship digital work.</h2>
            </div>
            <ShieldCheck className="h-10 w-10 text-emerald-300" />
          </div>
          <div className="grid gap-3">
            {comparisonRows.map(([label, bakhtech, traditional]) => (
              <div key={label} className="grid gap-3 rounded-2xl border border-black/5 bg-[#f6f5f0] p-4 md:grid-cols-[0.6fr_1fr_1fr]">
                <p className="font-black text-black/50">{label}</p>
                <p className="font-semibold text-black">{bakhtech}</p>
                <p className="font-semibold text-black/42">{traditional}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="px-4 pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#34d399]">Pricing paths</p>
            <h2 className="mt-4 text-4xl font-black tracking-normal md:text-6xl">Choose the right starting point.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg font-semibold leading-8 text-black/58">Every project is scoped around outcomes, not generic pages. Start lean or build a full operating system for your business.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {pricingCards.map(({ title, text, price, features }) => {
              return (
                <article key={title} className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm">
                  <h3 className="text-2xl font-black">{title}</h3>
                  <p className="mt-3 min-h-14 text-sm font-semibold leading-7 text-black/58">{text}</p>
                  <p className="mt-7 text-3xl font-black">{price}</p>
                  <Link to="/booking" className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#111111] text-sm font-black text-white hover:bg-black">Start here</Link>
                  <div className="mt-6 grid gap-3">
                    {features.map((feature) => (
                      <p key={feature} className="flex items-center gap-3 text-sm font-semibold text-black/62"><Check className="h-4 w-4 text-emerald-600" />{feature}</p>
                    ))}
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section id="faq" className="px-4 pb-24">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#facc15]">FAQ</p>
            <h2 className="mt-4 text-4xl font-black tracking-normal md:text-6xl">Clear answers before we start.</h2>
            <ChatPill />
          </div>
          <div className="grid gap-3">
            {[
              ['How fast can we launch?', 'Simple websites can move quickly once content and direction are clear. Larger systems are scoped in phases.'],
              ['Can you work with existing branding?', 'Yes. We can refine what you have or create a fresh digital direction that fits your business.'],
              ['Do you build the backend too?', 'Yes. Laravel, React, payments, bookings, dashboards, portals, and admin tools are all within scope.'],
              ['Can I manage content myself?', 'Yes. CMS and admin controls can be included so you can update pages without touching code.'],
            ].map(([question, answer]) => (
              <article key={question} className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-black">{question}</h3>
                <p className="mt-2 text-sm font-semibold leading-7 text-black/58">{answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-black/5 bg-[#080807] px-4 py-10 text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <img src="/bakhtech-logo-dark.png" alt="Bakhtech" className="h-9 w-auto" />
            <p className="mt-3 text-sm font-semibold text-white/42">Websites, stores, booking systems, dashboards, portals, and custom tools.</p>
          </div>
          <Link to="/booking" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-5 text-sm font-black text-[#06070b]">
            Get started <Zap className="h-4 w-4" />
          </Link>
        </div>
      </footer>
    </TemplateShell>
  )
}
