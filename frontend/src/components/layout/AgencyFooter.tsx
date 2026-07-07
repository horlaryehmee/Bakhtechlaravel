import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { api } from '@/lib/api'

export type AgencyFooterSettings = {
  footerCtaTitle: string
  footerWatermark: string
  footerDescription: string
  footerCtaLabel: string
  footerCopyright: string
  facebookUrl: string
  instagramUrl: string
  linkedinUrl: string
  tiktokUrl: string
  twitterUrl: string
  youtubeUrl: string
}

export const defaultAgencyFooterSettings: AgencyFooterSettings = {
  footerCtaTitle: 'Make Your Website a Sales Machine',
  footerWatermark: 'Bakhtech',
  footerDescription: 'We design and build websites, stores, dashboards, booking systems, and custom web apps that drive results.',
  footerCtaLabel: 'Get started',
  footerCopyright: '(c) 2026 Bakhtech Solutions - All Rights Reserved',
  facebookUrl: '',
  instagramUrl: '',
  linkedinUrl: '',
  tiktokUrl: '',
  twitterUrl: '',
  youtubeUrl: '',
}

type SocialIconType = 'facebook' | 'instagram' | 'linkedin' | 'tiktok' | 'twitter' | 'youtube'

const footerLinkColumns = [
  {
    title: 'Home',
    links: [
      { label: 'Overview', to: '/' },
      { label: 'Projects', to: '/portfolio' },
      { label: 'Testimonials', to: '/#reviews' },
      { label: 'FAQs', to: '/#faq' },
    ],
  },
  {
    title: 'About',
    links: [
      { label: 'Our Story', to: '/about' },
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
      { label: 'Support', to: 'mailto:solutions@bakhtech.com.ng' },
      { label: 'Report Issue', to: 'mailto:solutions@bakhtech.com.ng' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', to: '/privacy-policy' },
      { label: 'Terms of Service', to: '/terms-of-service' },
      { label: 'Cookie Policy', to: '/cookie-policy' },
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
      <span className={`pointer-events-none absolute left-1.5 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md transition-[left,transform] duration-500 ease-out group-hover:left-[calc(100%-2.5rem)] group-hover:-translate-y-1/2 group-hover:rotate-[360deg] group-active:left-[calc(100%-2.5rem)] group-active:-translate-y-1/2 group-active:rotate-[360deg] group-focus-visible:left-[calc(100%-2.5rem)] group-focus-visible:-translate-y-1/2 group-focus-visible:rotate-[360deg] ${iconClassName}`}>
        {icon}
      </span>
      <span className="relative z-0 block pl-9 transition-transform duration-500 ease-out group-hover:-translate-x-8 group-active:-translate-x-8 group-focus-visible:-translate-x-8">
        {label}
      </span>
    </Link>
  )
}

function SocialIcon({ type, className = 'h-4 w-4' }: { type: SocialIconType; className?: string }) {
  const paths: Record<SocialIconType, string> = {
    facebook: 'M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.438H7.078v-3.49h3.047V9.414c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97H15.83c-1.49 0-1.955.93-1.955 1.885v2.265h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z',
    instagram: 'M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm5.25-2.3a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1z',
    linkedin: 'M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V8.98h3.42v1.57h.05c.48-.9 1.64-1.85 3.37-1.85 3.61 0 4.27 2.38 4.27 5.47v6.28zM5.32 7.41a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zm1.78 13.04H3.53V8.98H7.1v11.47zM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0z',
    tiktok: 'M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 1 1-2-2.75v-3.5a6.34 6.34 0 1 0 5.45 6.27V8.74a8.16 8.16 0 0 0 4.77 1.52V6.82c-.34 0-.67-.04-1-.13z',
    twitter: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817-5.966 6.817H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z',
    youtube: 'M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.56 12 3.56 12 3.56s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.6 15.57V8.43L15.82 12 9.6 15.57z',
  }

  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" role="img">
      <path fill="currentColor" d={paths[type]} />
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
    facebookUrl: settings.facebookUrl || '',
    instagramUrl: settings.instagramUrl || '',
    linkedinUrl: settings.linkedinUrl || '',
    tiktokUrl: settings.tiktokUrl || '',
    twitterUrl: settings.twitterUrl || '',
    youtubeUrl: settings.youtubeUrl || '',
  }
}

export function AgencyFooter({ settings }: { settings?: AgencyFooterSettings }) {
  const [footerSettings, setFooterSettings] = useState(settings || defaultAgencyFooterSettings)
  const socialOptions: Array<{ key: keyof AgencyFooterSettings; label: string; type: SocialIconType }> = [
    { key: 'facebookUrl', label: 'Facebook', type: 'facebook' },
    { key: 'instagramUrl', label: 'Instagram', type: 'instagram' },
    { key: 'linkedinUrl', label: 'LinkedIn', type: 'linkedin' },
    { key: 'tiktokUrl', label: 'TikTok', type: 'tiktok' },
    { key: 'twitterUrl', label: 'X', type: 'twitter' },
    { key: 'youtubeUrl', label: 'YouTube', type: 'youtube' },
  ]
  const socialLinks = socialOptions.filter((social) => String(footerSettings[social.key] || '').trim())

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
            <span className="grid h-11 w-14 shrink-0 place-items-center rounded-xl bg-white text-black transition group-hover:translate-x-1 group-active:translate-x-1 group-focus-visible:translate-x-1">
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
          {socialLinks.length ? (
            <div className="flex items-center gap-3 text-white/48">
              {socialLinks.map((social) => (
                <a
                  key={social.key}
                  href={String(footerSettings[social.key])}
                  aria-label={`Bakhtech on ${social.label}`}
                  className="grid h-10 w-10 place-items-center rounded-full border border-white/8 bg-white/[0.03] transition hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
                  target="_blank"
                  rel="noreferrer"
                >
                  <SocialIcon type={social.type} />
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </footer>
  )
}
