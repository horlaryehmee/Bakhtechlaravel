import { CheckCircle2, FileText, Lock, Scale, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

type LegalPageKind = 'privacy-policy' | 'terms-of-service' | 'cookie-policy' | 'security'

type LegalSection = {
  title: string
  text: string
}

const legalPages: Record<LegalPageKind, { eyebrow: string; title: string; summary: string; icon: typeof FileText; sections: LegalSection[] }> = {
  'privacy-policy': {
    eyebrow: 'Privacy Policy',
    title: 'How Bakhtech Solutions handles personal information',
    summary: 'We collect only the information needed to deliver projects, manage enquiries, process bookings, support clients, and improve the quality of our services.',
    icon: ShieldCheck,
    sections: [
      { title: 'Information we collect', text: 'We may collect your name, email address, phone number, company details, project requirements, booking details, messages, invoice details, and files you choose to share with us.' },
      { title: 'How we use information', text: 'We use this information to respond to enquiries, plan and deliver services, provide support, manage billing, improve our website, protect our systems, and meet legal or operational obligations.' },
      { title: 'Sharing and protection', text: 'We do not sell your personal information. We may share limited information with trusted service providers where it is necessary for hosting, communication, analytics, payment, scheduling, or project delivery.' },
      { title: 'Your choices', text: 'You can contact us to request correction, access, or deletion of personal information where applicable. Some records may be retained where required for business, security, accounting, or legal reasons.' },
    ],
  },
  'terms-of-service': {
    eyebrow: 'Terms of Service',
    title: 'The standard terms for working with Bakhtech Solutions',
    summary: 'These terms explain how our website, bookings, proposals, projects, support, payments, and digital services are handled.',
    icon: Scale,
    sections: [
      { title: 'Using our website', text: 'You agree to use this website responsibly and not attempt to disrupt, copy, attack, misuse, or interfere with the platform, forms, booking system, or any connected service.' },
      { title: 'Project engagements', text: 'Project scope, timelines, pricing, revisions, deliverables, and support terms are defined by the proposal, invoice, agreement, or written confirmation shared for that specific engagement.' },
      { title: 'Payments and delivery', text: 'Work may require a deposit or full payment before delivery begins. Delays in feedback, assets, approvals, or payment can affect timelines and delivery dates.' },
      { title: 'Ownership and responsibility', text: 'Final ownership terms depend on the project agreement. Clients are responsible for providing accurate content, legal rights to supplied assets, and timely approvals.' },
    ],
  },
  'cookie-policy': {
    eyebrow: 'Cookie Policy',
    title: 'How cookies and similar technologies are used',
    summary: 'Cookies help us keep the website functional, understand visitor activity, improve performance, and support features like forms, analytics, and booking flows.',
    icon: FileText,
    sections: [
      { title: 'Essential cookies', text: 'Some cookies or local storage items are required for core website behavior, security, preferences, session handling, and reliable form or booking experiences.' },
      { title: 'Analytics and improvement', text: 'We may use analytics tools to understand how visitors use the website, which pages are useful, and where performance or content should be improved.' },
      { title: 'Third-party services', text: 'Embedded or connected services such as chat, scheduling, payment, video, analytics, or social platforms may set their own cookies according to their policies.' },
      { title: 'Managing cookies', text: 'You can control cookies through your browser settings. Blocking some cookies may affect forms, bookings, preferences, or other interactive parts of the website.' },
    ],
  },
  security: {
    eyebrow: 'Security',
    title: 'How we protect websites, systems, and client data',
    summary: 'Bakhtech Solutions treats security as part of delivery, not an afterthought. We use practical controls to reduce risk and keep digital products reliable.',
    icon: Lock,
    sections: [
      { title: 'Secure development', text: 'We build with structured access control, validation, careful handling of credentials, secure deployment practices, and protection against common web application risks.' },
      { title: 'Hosting and maintenance', text: 'Where we manage hosting or maintenance, we focus on uptime, backups, updates, monitoring, SSL, performance, and practical protection against avoidable failures.' },
      { title: 'Access and credentials', text: 'Client and admin access should be limited to the right users. We recommend strong passwords, two-factor authentication where available, and prompt removal of unused accounts.' },
      { title: 'Reporting issues', text: 'If you notice a security issue or suspicious activity connected to Bakhtech Solutions, contact us immediately at solutions@bakhtech.com.ng with clear details.' },
    ],
  },
}

export function LegalPage({ kind }: { kind: LegalPageKind }) {
  const page = legalPages[kind]
  const Icon = page.icon

  return (
    <main className="min-h-screen bg-[#efeee8] px-4 pb-24 pt-28 text-[#111111] md:pt-36">
      <section className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-[1.8rem] bg-[#030303] px-6 py-12 text-white shadow-[0_28px_90px_rgba(0,0,0,0.28)] md:px-10 md:py-16">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:54px_54px] opacity-50" />
          <div className="pointer-events-none absolute right-[-8rem] top-[-8rem] h-72 w-72 rounded-full bg-[#ffd21f]/18 blur-3xl" />
          <div className="relative max-w-4xl">
            <span className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/8 px-3 text-sm font-black text-white/72">
              <Icon className="h-4 w-4" />
              {page.eyebrow}
            </span>
            <h1 className="mt-8 text-[clamp(2.5rem,8vw,5.8rem)] font-black leading-[0.95] tracking-normal">
              {page.title}
            </h1>
            <p className="mt-6 max-w-2xl text-base font-semibold leading-8 text-white/62 md:text-lg">
              {page.summary}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[0.82fr_1.18fr]">
          <aside className="h-fit rounded-[1.35rem] bg-white p-6 shadow-sm lg:sticky lg:top-28">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-black/36">Bakhtech Solutions</p>
            <h2 className="mt-4 text-2xl font-semibold leading-tight text-black">Clear, practical, business-ready policies.</h2>
            <p className="mt-4 text-sm font-semibold leading-7 text-black/48">
              These pages are written to be clear for clients and visitors. For project-specific legal terms, your signed agreement or invoice terms will apply.
            </p>
            <Link to="/contact" className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-black px-5 text-sm font-black text-white transition hover:bg-black/82 active:scale-[0.98]">
              Contact Us
            </Link>
          </aside>

          <section className="grid gap-4">
            {page.sections.map((section, index) => (
              <article key={section.title} className="rounded-[1.35rem] bg-white p-6 shadow-sm md:p-8">
                <div className="flex items-start gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ffd21f] text-black">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-black/28">0{index + 1}</p>
                    <h2 className="mt-2 text-2xl font-semibold text-black">{section.title}</h2>
                    <p className="mt-4 text-base font-semibold leading-8 text-black/52">{section.text}</p>
                  </div>
                </div>
              </article>
            ))}
          </section>
        </div>
      </section>
    </main>
  )
}
