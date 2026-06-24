import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import {
  ArrowRight,
  Check,
  Code2,
  Globe2,
  Layers3,
  MessageCircle,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type AgencyHomeTemplateProps = {
  preview?: boolean
}

const companyLogos = ['NOVA', 'KREST', 'LUMO', 'ARCA', 'VANTA', 'PRISM', 'ORBIT', 'FLUX']

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
  return (
    <main className="min-h-screen overflow-hidden bg-[#06070b] text-white">
      {preview ? (
        <div className="fixed inset-x-0 top-0 z-[180] border-b border-amber-300/20 bg-amber-300 px-4 py-2 text-center text-xs font-black uppercase tracking-[0.18em] text-[#111827]">
          Admin preview only
        </div>
      ) : null}
      {children}
    </main>
  )
}

function ChatPill({ label = 'Chat with us' }: { label?: string }) {
  return (
    <Link to="/contact" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 pr-4 text-sm font-bold text-white shadow-[0_20px_70px_rgba(0,0,0,0.25)] backdrop-blur-xl transition hover:bg-white/12">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-[#ef4444]">
        <MessageCircle className="h-4 w-4" />
      </span>
      {label}
    </Link>
  )
}

export function AgencyHomeTemplate({ preview = false }: AgencyHomeTemplateProps) {
  return (
    <TemplateShell preview={preview}>
      <section className={cn('relative min-h-screen px-4 pb-20', preview ? 'pt-24' : 'pt-6')}>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[36rem] w-[58rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(18,97,255,0.24),transparent_62%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_72%)]" />
        </div>

        <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between rounded-full border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-2xl">
          <Link to="/" className="flex items-center gap-3">
            <img src="/bakhtech-logo-dark.png" alt="Bakhtech" className="h-9 w-auto" />
          </Link>
          <div className="hidden items-center gap-6 text-sm font-bold text-white/70 md:flex">
            <a href="#work" className="hover:text-white">Work</a>
            <a href="#services" className="hover:text-white">Services</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <a href="#faq" className="hover:text-white">FAQ</a>
          </div>
          <ChatPill label="Start a project" />
        </nav>

        <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center pt-20 text-center md:pt-28">
          <a href="#services" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-4 py-2 text-sm font-black text-white/82">
            <Sparkles className="h-4 w-4 text-[#facc15]" />
            Productized web design and development
          </a>
          <h1 className="mt-8 max-w-5xl text-5xl font-black leading-[0.94] tracking-normal text-white md:text-7xl lg:text-8xl">
            Make your website a sales machine.
          </h1>
          <p className="mt-7 max-w-2xl text-lg font-semibold leading-8 text-white/68 md:text-xl">
            Bakhtech designs and builds websites, booking flows, stores, dashboards, and portals that help customers understand, trust, and choose your business.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/booking" className="inline-flex min-h-13 items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-[#06070b] transition hover:bg-[#f4f4f5]">
              Book a discovery call
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/portfolio" className="inline-flex min-h-13 items-center gap-2 rounded-full border border-white/12 bg-white/7 px-6 py-3 text-sm font-black text-white transition hover:bg-white/12">
              View work
            </Link>
          </div>
          <div className="mt-16 w-full rounded-[2rem] border border-white/10 bg-white/[0.06] p-3 shadow-[0_40px_140px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <div className="grid min-h-[22rem] gap-3 rounded-[1.45rem] border border-white/8 bg-[#0b0d13] p-4 md:grid-cols-[1.2fr_0.8fr]">
              <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#111827,#0f172a_42%,#1d4ed8)] p-6 text-left">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-white/50">Live project pipeline</p>
                <h2 className="mt-4 max-w-lg text-3xl font-black tracking-normal md:text-5xl">Strategy, design, build, launch.</h2>
                <div className="mt-10 grid gap-3">
                  {['Website strategy approved', 'Homepage wireframe reviewed', 'Booking workflow integrated'].map((item) => (
                    <div key={item} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                      <span className="font-bold text-white/82">{item}</span>
                      <Check className="h-5 w-5 text-emerald-300" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-3">
                {[
                  ['Launch-ready', 'Modern stack, clean UI, conversion-focused copy.'],
                  ['SEO-aware', 'Metadata, page structure, and performance handled early.'],
                  ['Built to scale', 'Admin tools and workflows that can grow with the business.'],
                ].map(([title, text], index) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.07] p-5 text-left">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[#06070b] text-sm font-black">0{index + 1}</span>
                    <h3 className="mt-5 text-xl font-black">{title}</h3>
                    <p className="mt-2 text-sm font-semibold leading-6 text-white/58">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.03] px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <p className="text-center text-sm font-black uppercase tracking-[0.18em] text-white/42">Trusted by growing teams and practical business owners</p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {companyLogos.map((logo) => (
              <div key={logo} className="grid min-h-16 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] text-sm font-black text-white/50">
                {logo}
              </div>
            ))}
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
            <p className="text-lg font-semibold leading-8 text-white/60">From first impression to payment, booking, onboarding, and operations, the goal is a business system that looks polished and works cleanly.</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {services.map((service) => {
              const Icon = service.icon
              return (
                <article key={service.title} className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-6">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#06070b]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-8 text-2xl font-black">{service.title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-7 text-white/58">{service.text}</p>
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
            <Link to="/portfolio" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/12 px-5 text-sm font-black text-white hover:bg-white/10">
              See portfolio <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projectCards.map(([title, text, tags]) => (
              <article key={title} className="group rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-5 transition hover:-translate-y-1 hover:bg-white/[0.085]">
                <div className="grid aspect-[1.45] place-items-center rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgba(239,68,68,0.3),transparent_34%),linear-gradient(135deg,#111827,#0f172a)]">
                  <Globe2 className="h-12 w-12 text-white/42" />
                </div>
                <h3 className="mt-5 text-xl font-black">{title}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-white/58">{text}</p>
                <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-white/38">{tags}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-24">
        <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <article className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-8">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#facc15]">Scaling successful companies</p>
            <h2 className="mt-4 text-5xl font-black tracking-normal">50+</h2>
            <p className="mt-4 text-lg font-semibold leading-8 text-white/62">Projects, workflows, and digital experiences delivered across websites, ecommerce, bookings, portals, and custom software.</p>
            <div className="mt-8 flex -space-x-3">
              {[1, 2, 3, 4].map((item) => (
                <span key={item} className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#06070b] bg-white text-sm font-black text-[#06070b]">B{item}</span>
              ))}
            </div>
          </article>
          <div className="grid gap-4 md:grid-cols-3">
            {testimonials.map(([quote, name, role]) => (
              <article key={name} className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
                <div className="flex gap-1 text-[#facc15]">{[1, 2, 3, 4, 5].map((star) => <Star key={star} className="h-4 w-4 fill-current" />)}</div>
                <p className="mt-5 text-sm font-semibold leading-7 text-white/68">"{quote}"</p>
                <p className="mt-6 font-black">{name}</p>
                <p className="text-sm font-semibold text-white/42">{role}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-24">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 md:p-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#60a5fa]">Bakhtech vs traditional providers</p>
              <h2 className="mt-4 text-4xl font-black tracking-normal">A cleaner way to ship digital work.</h2>
            </div>
            <ShieldCheck className="h-10 w-10 text-emerald-300" />
          </div>
          <div className="grid gap-3">
            {comparisonRows.map(([label, bakhtech, traditional]) => (
              <div key={label} className="grid gap-3 rounded-2xl border border-white/10 bg-[#0b0d13] p-4 md:grid-cols-[0.6fr_1fr_1fr]">
                <p className="font-black text-white/55">{label}</p>
                <p className="font-semibold text-white">{bakhtech}</p>
                <p className="font-semibold text-white/42">{traditional}</p>
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
            <p className="mx-auto mt-4 max-w-2xl text-lg font-semibold leading-8 text-white/58">Every project is scoped around outcomes, not generic pages. Start lean or build a full operating system for your business.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {pricingCards.map(({ title, text, price, features }) => {
              return (
                <article key={title} className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
                  <h3 className="text-2xl font-black">{title}</h3>
                  <p className="mt-3 min-h-14 text-sm font-semibold leading-7 text-white/58">{text}</p>
                  <p className="mt-7 text-3xl font-black">{price}</p>
                  <Link to="/booking" className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-white text-sm font-black text-[#06070b] hover:bg-[#f4f4f5]">Start here</Link>
                  <div className="mt-6 grid gap-3">
                    {features.map((feature) => (
                      <p key={feature} className="flex items-center gap-3 text-sm font-semibold text-white/68"><Check className="h-4 w-4 text-emerald-300" />{feature}</p>
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
              <article key={question} className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
                <h3 className="text-lg font-black">{question}</h3>
                <p className="mt-2 text-sm font-semibold leading-7 text-white/58">{answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-4 py-10">
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
