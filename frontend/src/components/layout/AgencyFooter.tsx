import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { siInstagram } from 'simple-icons'
import { api } from '@/lib/api'

export type AgencyFooterSettings = {
  footerCtaTitle: string
  footerWatermark: string
  footerDescription: string
  footerCtaLabel: string
  footerCopyright: string
}

export const defaultAgencyFooterSettings: AgencyFooterSettings = {
  footerCtaTitle: 'Make Your Website a Sales Machine',
  footerWatermark: 'Bakhtech',
  footerDescription: 'We design and build websites, stores, dashboards, booking systems, and custom web apps that drive results.',
  footerCtaLabel: 'Get started',
  footerCopyright: '© 2026 Bakhtech Solutions - All Rights Reserved',
}

const footerLinkColumns = [
  {
    title: 'Home',
    links: [
      { label: 'Overview', to: '/' },
      { label: 'Projects', to: '/portfolio' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'Testimonials', to: '/#reviews' },
      { label: 'FAQs', to: '/#faq' },
    ],
  },
  {
    title: 'About',
    links: [
      { label: 'Our Story', to: '/about' },
      { label: 'Services', to: '/#services' },
      { label: 'Founder', to: '/#founder' },
      { label: 'Portfolio', to: '/portfolio' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    title: 'Contact',
    links: [
      { label: 'Contact Us', to: '/contact' },
      { label: 'Book a Call', to: '/booking' },
      { label: 'Support', to: 'mailto:contact@bakhtech.com.ng' },
      { label: 'Live Chat', to: '/contact' },
      { label: 'Report Issue', to: 'mailto:contact@bakhtech.com.ng' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', to: '/privacy-policy' },
      { label: 'Terms of Service', to: '/terms-of-service' },
      { label: 'Cookie Policy', to: '/cookie-policy' },
      { label: 'Licenses', to: '/licenses' },
      { label: 'Security', to: '/security' },
    ],
  },
] as const

function CalendarIcon() {
  return (
    <span className="grid h-4 w-4 grid-cols-3 gap-0.5" aria-hidden="true">
      {Array.from({ length: 9 }).map((_, index) => (
        <span key={index} className="rounded-[2px] bg-current opacity-70" />
      ))}
    </span>
  )
}

function AnimatedCta({ label, icon, className = '', iconClassName = 'bg-[#ffc400] text-[#0b0b08]', to }: { label: ReactNode; icon: ReactNode; className?: string; iconClassName?: string; to: string }) {
  return (
    <Link to={to} className={`group relative inline-flex min-h-11 items-center overflow-hidden rounded-lg border px-1.5 pr-4 text-sm font-bold transition duration-300 ${className}`}>
      <span className={`pointer-events-none absolute left-1.5 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md transition-[left,transform] duration-500 ease-out group-hover:left-[calc(100%-2.5rem)] group-hover:-translate-y-1/2 group-hover:rotate-[360deg] ${iconClassName}`}>
        {icon}
      </span>
      <span className="relative z-0 block pl-9 transition-transform duration-500 ease-out group-hover:-translate-x-8">
        {label}
      </span>
    </Link>
  )
}

function InstagramIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" role="img">
      <path fill="currentColor" d={siInstagram.path} />
    </svg>
  )
}

function resolveFooterSettings(settings: Record<string, string>): AgencyFooterSettings {
  return {
    footerCtaTitle: settings.footerCtaTitle || defaultAgencyFooterSettings.footerCtaTitle,
    footerWatermark: settings.footerWatermark || defaultAgencyFooterSettings.footerWatermark,
    footerDescription: settings.footerDescription || defaultAgencyFooterSettings.footerDescription,
    footerCtaLabel: settings.footerCtaLabel || defaultAgencyFooterSettings.footerCtaLabel,
    footerCopyright: settings.footerCopyright || defaultAgencyFooterSettings.footerCopyright,
  }
}

export function AgencyFooter({ settings }: { settings?: AgencyFooterSettings }) {
  const [footerSettings, setFooterSettings] = useState(settings || defaultAgencyFooterSettings)

  useEffect(() => {
    if (settings) {
      setFooterSettings(settings)
      return
    }

    let cancelled = false
    api.publicSettings()
      .then((result) => {
        if (!cancelled) setFooterSettings(resolveFooterSettings(result.settings))
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [settings])

  return (
    <footer className="relative overflow-hidden bg-[#030303] px-4 py-16 text-white md:py-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_22%,rgba(255,255,255,0.12),transparent_28%),linear-gradient(90deg,rgba(255,255,255,0.05),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:50px_50px] opacity-[0.18]" />

      <div className="relative mx-auto max-w-6xl">
        <Link
          to="/booking"
          className="group relative block min-h-[16rem] overflow-hidden rounded-[1.8rem] border border-white/6 bg-[#11110f] px-7 py-9 shadow-[0_34px_100px_rgba(0,0,0,0.48)] md:min-h-[19rem] md:px-12 md:py-14"
        >
          <div className="relative z-10 flex items-start justify-between gap-6">
            <h2 className="max-w-[34rem] text-4xl font-medium leading-[1.08] tracking-normal text-white md:text-6xl">
              {footerSettings.footerCtaTitle}
            </h2>
            <span className="grid h-11 w-14 shrink-0 place-items-center rounded-xl bg-white text-black transition group-hover:translate-x-1">
              <ArrowRight className="h-5 w-5" />
            </span>
          </div>
          <span className="pointer-events-none absolute -bottom-6 left-6 select-none text-[4.8rem] font-bold leading-none tracking-normal text-white/[0.07] sm:text-[7rem] md:-bottom-16 md:left-10 md:text-[11rem] lg:text-[13rem]">
            {footerSettings.footerWatermark}
          </span>
        </Link>

        <div className="mt-16 grid gap-12 lg:grid-cols-[1.1fr_1.6fr] lg:gap-20">
          <div>
            <img src="/bakhtech-logo-dark.png" alt="Bakhtech Solutions" className="h-9 w-auto object-contain" decoding="async" />
            <p className="mt-5 max-w-xs text-sm font-normal leading-6 text-white/45">
              {footerSettings.footerDescription}
            </p>
            <AnimatedCta to="/booking" label={footerSettings.footerCtaLabel} icon={<CalendarIcon />} className="mt-6 border-white/12 bg-black font-medium text-white" iconClassName="rounded-md bg-[#ffd21f] text-black" />
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {footerLinkColumns.map((column) => (
              <div key={column.title}>
                <h3 className="text-xs font-normal text-white/35">{column.title}</h3>
                <ul className="mt-5 grid gap-4">
                  {column.links.map((link) => {
                    const isExternal = link.to.startsWith('mailto:') || link.to.startsWith('http')
                    const className = 'text-sm font-normal text-white/82 transition hover:text-white'
                    return (
                      <li key={link.label}>
                        {isExternal ? (
                          <a href={link.to} className={className}>{link.label}</a>
                        ) : (
                          <Link to={link.to} className={className}>{link.label}</Link>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-6 border-t border-white/8 pt-8 md:flex-row md:items-center md:justify-between">
          <p className="text-xs font-normal text-white/42">{footerSettings.footerCopyright}</p>
          <div className="flex items-center gap-5 text-white/48">
            <a href="https://x.com" aria-label="Bakhtech on X" className="text-sm font-normal transition hover:text-white">X</a>
            <a href="https://www.linkedin.com" aria-label="Bakhtech on LinkedIn" className="text-sm font-normal transition hover:text-white">in</a>
            <a href="https://www.instagram.com" aria-label="Bakhtech on Instagram" className="transition hover:text-white">
              <InstagramIcon />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
