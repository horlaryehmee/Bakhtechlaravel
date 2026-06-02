'use client'

import React, { useEffect, useRef } from 'react'
import { ArrowRight, CheckCircle2, Code2, Database, Layers3, SearchCheck, ShieldCheck } from 'lucide-react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { cn } from '@/lib/utils'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

const INJECTED_STYLES = `
  .gsap-reveal { visibility: hidden; }

  .bg-grid-theme {
      background-size: 60px 60px;
      background-image:
          linear-gradient(to right, color-mix(in srgb, var(--foreground) 5%, transparent) 1px, transparent 1px),
          linear-gradient(to bottom, color-mix(in srgb, var(--foreground) 5%, transparent) 1px, transparent 1px);
      mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
      -webkit-mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
  }

  .text-3d-matte {
      color: var(--foreground);
      text-shadow:
          0 10px 30px color-mix(in srgb, var(--foreground) 20%, transparent),
          0 2px 4px color-mix(in srgb, var(--foreground) 10%, transparent);
  }

  .text-silver-matte {
      background: linear-gradient(180deg, var(--foreground) 0%, color-mix(in srgb, var(--foreground) 40%, transparent) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      transform: translateZ(0);
      filter:
          drop-shadow(0px 10px 20px color-mix(in srgb, var(--foreground) 15%, transparent))
          drop-shadow(0px 2px 4px color-mix(in srgb, var(--foreground) 10%, transparent));
  }

  .text-card-silver-matte {
      background: linear-gradient(180deg, #FFFFFF 0%, #A1A1AA 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      transform: translateZ(0);
      filter:
          drop-shadow(0px 12px 24px rgba(0,0,0,0.8))
          drop-shadow(0px 4px 8px rgba(0,0,0,0.6));
  }

  .premium-depth-card {
      background: #30373f;
      box-shadow:
          0 40px 100px -20px rgba(0, 0, 0, 0.9),
          0 20px 40px -20px rgba(0, 0, 0, 0.8),
          inset 0 1px 2px rgba(255, 255, 255, 0.2),
          inset 0 -2px 4px rgba(0, 0, 0, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.04);
      position: relative;
  }

  .card-sheen {
      position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 50;
      background: radial-gradient(800px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.06) 0%, transparent 40%);
      mix-blend-mode: screen; transition: opacity 0.3s ease;
  }

  .iphone-bezel {
      background-color: #111;
      box-shadow:
          inset 0 0 0 2px #52525B,
          inset 0 0 0 7px #000,
          0 40px 80px -15px rgba(0,0,0,0.9),
          0 15px 25px -5px rgba(0,0,0,0.7);
      transform-style: preserve-3d;
  }

  .hardware-btn {
      background: linear-gradient(90deg, #404040 0%, #171717 100%);
      box-shadow:
          -2px 0 5px rgba(0,0,0,0.8),
          inset -1px 0 1px rgba(255,255,255,0.15),
          inset 1px 0 2px rgba(0,0,0,0.8);
      border-left: 1px solid rgba(255,255,255,0.05);
  }

  .screen-glare {
      background: linear-gradient(110deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 45%);
  }

  .widget-depth {
      background: linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%);
      box-shadow:
          0 10px 20px rgba(0,0,0,0.3),
          inset 0 1px 1px rgba(255,255,255,0.05),
          inset 0 -1px 1px rgba(0,0,0,0.5);
      border: 1px solid rgba(255,255,255,0.03);
  }

  .floating-ui-badge {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.01) 100%);
      box-shadow:
          0 0 0 1px rgba(255, 255, 255, 0.1),
          0 25px 50px -12px rgba(0, 0, 0, 0.8),
          inset 0 1px 1px rgba(255,255,255,0.2),
          inset 0 -1px 1px rgba(0,0,0,0.5);
  }

  .btn-modern-light, .btn-modern-dark {
      transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
  }

  .btn-modern-light {
      background: linear-gradient(180deg, #FFFFFF 0%, #F1F5F9 100%);
      color: #0F172A;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.1), 0 12px 24px -4px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,1), inset 0 -3px 6px rgba(0,0,0,0.06);
  }

  .btn-modern-light:hover {
      transform: translateY(-3px);
      box-shadow: 0 0 0 1px rgba(0,0,0,0.05), 0 6px 12px -2px rgba(0,0,0,0.15), 0 20px 32px -6px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,1), inset 0 -3px 6px rgba(0,0,0,0.06);
  }

  .btn-modern-dark {
      background: linear-gradient(180deg, #27272A 0%, #18181B 100%);
      color: #FFFFFF;
      box-shadow: 0 0 0 1px rgba(255,255,255,0.1), 0 2px 4px rgba(0,0,0,0.6), 0 12px 24px -4px rgba(0,0,0,0.9), inset 0 1px 1px rgba(255,255,255,0.15), inset 0 -3px 6px rgba(0,0,0,0.8);
  }

  .btn-modern-dark:hover {
      transform: translateY(-3px);
      background: linear-gradient(180deg, #3F3F46 0%, #27272A 100%);
      box-shadow: 0 0 0 1px rgba(255,255,255,0.15), 0 6px 12px -2px rgba(0,0,0,0.7), 0 20px 32px -6px rgba(0,0,0,1), inset 0 1px 1px rgba(255,255,255,0.2), inset 0 -3px 6px rgba(0,0,0,0.8);
  }

  .progress-ring {
      transform: rotate(-90deg);
      transform-origin: center;
      stroke-dasharray: 402;
      stroke-dashoffset: 402;
      stroke-linecap: round;
  }
`

export interface CinematicHeroProps extends React.HTMLAttributes<HTMLDivElement> {
  brandName?: string
  tagline1?: string
  tagline2?: string
  introContent?: React.ReactNode
  cardHeading?: string
  cardDescription?: React.ReactNode
  metricValue?: number
  metricLabel?: string
  ctaHeading?: string
  ctaDescription?: string
}

export function CinematicHero({
  brandName = 'Bakhtech',
  tagline1 = 'Build the platform,',
  tagline2 = 'grow the business.',
  introContent,
  cardHeading = 'Accountability for every launch.',
  cardDescription = (
    <>
      <span className="font-semibold text-white">Bakhtech Solutions</span> turns CMS, SEO, security, and responsive
      design into a focused launch system for modern businesses.
    </>
  ),
  metricValue = 98,
  metricLabel = 'Speed Score',
  ctaHeading = 'Launch a sharper web presence.',
  ctaDescription = 'Start with a secure CMS website that is editable, fast, responsive, search-ready, and built for measurable leads.',
  className,
  ...props
}: CinematicHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mainCardRef = useRef<HTMLDivElement>(null)
  const mockupRef = useRef<HTMLDivElement>(null)
  const requestRef = useRef<number>(0)

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (window.scrollY > window.innerHeight * 3) return

      cancelAnimationFrame(requestRef.current)

      requestRef.current = requestAnimationFrame(() => {
        if (!mainCardRef.current || !mockupRef.current) return

        const rect = mainCardRef.current.getBoundingClientRect()
        mainCardRef.current.style.setProperty('--mouse-x', `${event.clientX - rect.left}px`)
        mainCardRef.current.style.setProperty('--mouse-y', `${event.clientY - rect.top}px`)

        const xVal = (event.clientX / window.innerWidth - 0.5) * 2
        const yVal = (event.clientY / window.innerHeight - 0.5) * 2

        gsap.to(mockupRef.current, {
          rotationY: xVal * 12,
          rotationX: -yVal * 12,
          ease: 'power3.out',
          duration: 1.2,
        })
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(requestRef.current)
    }
  }, [])

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set('.text-track', { autoAlpha: 0, y: 60, scale: 0.85, rotationX: -20 })
      gsap.set('.text-days', { autoAlpha: 1, clipPath: 'inset(0 100% 0 0)' })
      gsap.set('.main-card', { y: window.innerHeight + 200, autoAlpha: 1 })
      gsap.set(['.mockup-scroll-wrapper', '.phone-widget'], { autoAlpha: 0 })
      gsap.set('.cta-wrapper', { autoAlpha: 0, scale: 0.8 })

      gsap
        .timeline({ delay: 0.3 })
        .to('.text-track', { duration: 1.8, autoAlpha: 1, y: 0, scale: 1, rotationX: 0, ease: 'expo.out' })
        .to('.text-days', { duration: 1.4, clipPath: 'inset(0 0% 0 0)', ease: 'power4.inOut' }, '-=1.0')

      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top top',
          end: '+=2600',
          pin: true,
          scrub: 0.7,
          anticipatePin: 1,
        },
      })

      scrollTl
        .to(['.hero-text-wrapper', '.bg-grid-theme'], { scale: 1.06, opacity: 0.18, ease: 'power2.inOut', duration: 0.85 }, 0)
        .to('.main-card', { y: 0, ease: 'power3.inOut', duration: 0.85 }, 0)
        .to('.main-card', { width: '100%', height: '100%', borderRadius: '0px', ease: 'power3.inOut', duration: 0.55 })
        .fromTo(
          '.mockup-scroll-wrapper',
          { y: 180, z: -320, rotationX: 36, rotationY: -22, autoAlpha: 0, scale: 0.68 },
          { y: 0, z: 0, rotationX: 0, rotationY: 0, autoAlpha: 1, scale: 1, ease: 'expo.out', duration: 0.8 },
          '-=0.25',
        )
        .fromTo('.phone-widget', { y: 22, autoAlpha: 0, scale: 0.97 }, { y: 0, autoAlpha: 1, scale: 1, stagger: 0.05, ease: 'back.out(1.2)', duration: 0.55 }, '-=0.55')
        .to('.progress-ring', { strokeDashoffset: 60, duration: 0.65, ease: 'power3.inOut' }, '-=0.45')
        .to('.counter-val', { innerHTML: metricValue, snap: { innerHTML: 1 }, duration: 0.65, ease: 'expo.out' }, '-=0.65')
        .fromTo('.card-left-text', { x: -14 }, { x: 0, ease: 'power4.out', duration: 0.55 }, '-=0.55')
        .fromTo('.card-right-text', { x: 14, scale: 0.98 }, { x: 0, scale: 1, ease: 'expo.out', duration: 0.55 }, '<')
        .to({}, { duration: 0.35 })
        .set('.hero-text-wrapper', { autoAlpha: 0 })
        .to('.main-card', { y: -window.innerHeight - 300, ease: 'power3.in', duration: 0.85 })
    }, containerRef)

    return () => ctx.revert()
  }, [metricValue])

  return (
    <div
      ref={containerRef}
      className={cn('relative flex h-screen w-full min-w-0 items-center justify-center overflow-hidden bg-background font-sans text-foreground antialiased', className)}
      style={{ perspective: '1500px' }}
      {...props}
    >
      <style dangerouslySetInnerHTML={{ __html: INJECTED_STYLES }} />
      <div className="bg-grid-theme pointer-events-none absolute inset-0 z-0 opacity-50" aria-hidden="true" />

      <div className="hero-text-wrapper absolute inset-0 z-10 flex w-full min-w-0 flex-col items-center justify-center text-center [transform-style:preserve-3d] will-change-transform">
        {introContent ? (
          introContent
        ) : (
          <div className="px-4">
            <h1 className="text-track gsap-reveal text-3d-matte mb-2 text-5xl font-bold tracking-tight md:text-7xl lg:text-[6rem]">
              {tagline1}
            </h1>
            <h1 className="text-days gsap-reveal text-silver-matte text-5xl font-extrabold tracking-tight md:text-7xl lg:text-[6rem]">
              {tagline2}
            </h1>
          </div>
        )}
      </div>

      <div className="cta-wrapper gsap-reveal pointer-events-auto absolute z-10 flex w-full min-w-0 flex-col items-center justify-center px-4 text-center will-change-transform">
        <h2 className="text-silver-matte mb-6 text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">{ctaHeading}</h2>
        <p className="mx-auto mb-12 max-w-xl text-lg font-light leading-relaxed text-muted-foreground md:text-xl">
          {ctaDescription}
        </p>
        <div className="flex flex-col gap-6 sm:flex-row">
          <a href="/contact" className="btn-modern-light group flex items-center justify-center gap-3 rounded-[1.25rem] px-8 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            <ArrowRight className="h-7 w-7 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            <div className="text-left">
              <div className="mb-[-2px] text-[10px] font-bold uppercase tracking-wider text-neutral-500">Start with</div>
              <div className="text-xl font-bold leading-none tracking-tight">A Quote</div>
            </div>
          </a>
          <a href="/portfolio" className="btn-modern-dark group flex items-center justify-center gap-3 rounded-[1.25rem] px-8 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-background">
            <Layers3 className="h-7 w-7 transition-transform group-hover:scale-105" aria-hidden="true" />
            <div className="text-left">
              <div className="mb-[-2px] text-[10px] font-bold uppercase tracking-wider text-neutral-400">Explore our</div>
              <div className="text-xl font-bold leading-none tracking-tight">Portfolio</div>
            </div>
          </a>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center" style={{ perspective: '1500px' }}>
        <div
          ref={mainCardRef}
          className="main-card premium-depth-card gsap-reveal pointer-events-auto relative flex h-[92vh] w-[92vw] items-center justify-center overflow-hidden rounded-[32px] md:h-[85vh] md:w-[85vw] md:rounded-[40px]"
        >
          <div className="card-sheen" aria-hidden="true" />

          <div className="relative z-10 mx-auto grid h-full w-full max-w-7xl gap-5 overflow-hidden px-5 py-7 md:gap-7 md:px-8 md:py-9 lg:grid-cols-[1.05fr_0.82fr_0.95fr] lg:items-center lg:gap-8 lg:px-12">
            <div className="card-left-text order-1 z-20 lg:order-1">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-[#67e8cf] md:text-sm">
                Welcome To Bakhtech Solutions
              </p>
              <h2 className="max-w-xl text-4xl font-black leading-[0.96] tracking-tight text-white md:text-5xl lg:text-6xl">
                Web solutions built to turn visitors into customers.
              </h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-blue-100/74 md:text-base">
                Bakhtech Solutions builds business websites, ecommerce platforms, booking systems, portals, dashboards,
                and custom web apps that make your brand credible and your customer journey easier to complete.
              </p>
              <div className="mt-6 grid max-w-md grid-cols-3 gap-3">
                {[
                  { value: '7+', label: 'Years' },
                  { value: '200+', label: 'Websites' },
                  { value: '98%', label: 'Feedback' },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.07] p-3">
                    <div className="text-2xl font-black text-white md:text-3xl">{item.value}</div>
                    <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-blue-100/52">{item.label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="/contact" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-[#07101f] transition hover:-translate-y-0.5">
                  Request a Quote <ArrowRight className="h-4 w-4" />
                </a>
                <a href="/portfolio" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/12 bg-white/10 px-5 text-sm font-black text-white transition hover:-translate-y-0.5">
                  View Projects
                </a>
              </div>
            </div>

            <div className="mockup-scroll-wrapper relative order-2 z-10 hidden h-[430px] w-full items-center justify-center md:flex lg:h-[560px]" style={{ perspective: '1000px' }}>
              <div className="relative flex h-full w-full scale-[0.72] items-center justify-center md:scale-[0.78] lg:scale-[0.9]">
                <div
                  ref={mockupRef}
                  className="iphone-bezel relative flex h-[580px] w-[280px] flex-col rounded-[3rem] [transform-style:preserve-3d] will-change-transform"
                >
                  <div className="hardware-btn absolute -left-[3px] top-[120px] z-0 h-[25px] w-[3px] rounded-l-md" aria-hidden="true" />
                  <div className="hardware-btn absolute -left-[3px] top-[160px] z-0 h-[45px] w-[3px] rounded-l-md" aria-hidden="true" />
                  <div className="hardware-btn absolute -left-[3px] top-[220px] z-0 h-[45px] w-[3px] rounded-l-md" aria-hidden="true" />
                  <div className="hardware-btn absolute -right-[3px] top-[170px] z-0 h-[70px] w-[3px] scale-x-[-1] rounded-r-md" aria-hidden="true" />

                  <div className="absolute inset-[7px] z-10 overflow-hidden rounded-[2.5rem] bg-[#050914] text-white shadow-[inset_0_0_15px_rgba(0,0,0,1)]">
                    <div className="screen-glare pointer-events-none absolute inset-0 z-40" aria-hidden="true" />
                    <div className="absolute left-1/2 top-[5px] z-50 flex h-[28px] w-[100px] -translate-x-1/2 items-center justify-end rounded-full bg-black px-3 shadow-[inset_0_-1px_2px_rgba(255,255,255,0.1)]">
                      <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                    </div>

                    <div className="relative flex h-full w-full flex-col px-5 pb-8 pt-12">
                      <div className="phone-widget mb-8 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="mb-1 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Today</span>
                          <span className="text-xl font-bold tracking-tight text-white drop-shadow-md">Launch OS</span>
                        </div>
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-bold text-neutral-200 shadow-lg shadow-black/50">BT</div>
                      </div>

                      <div className="phone-widget mx-auto mb-7 flex flex-col items-center drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)]">
                        <div className="relative grid h-40 w-40 place-items-center">
                          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 160 160" aria-hidden="true">
                            <circle cx="80" cy="80" r="58" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="11" />
                            <circle className="progress-ring" cx="80" cy="80" r="58" fill="none" stroke="#3B82F6" strokeWidth="11" />
                          </svg>
                          <span className="counter-val z-10 block text-4xl font-extrabold leading-none tracking-tight text-white">0</span>
                        </div>
                        <span className="mt-1 block text-[9px] font-black uppercase leading-none tracking-[0.16em] text-blue-100/58">{metricLabel}</span>
                      </div>

                      <div className="space-y-3">
                        {[
                          { label: 'Conversion strategy', icon: Code2, color: 'text-blue-400', panel: 'from-blue-500/20 to-blue-600/5 border-blue-400/20' },
                          { label: 'Custom UI/UX design', icon: SearchCheck, color: 'text-emerald-400', panel: 'from-emerald-500/20 to-emerald-600/5 border-emerald-400/20' },
                          { label: 'Scalable development', icon: Database, color: 'text-cyan-400', panel: 'from-cyan-500/20 to-cyan-600/5 border-cyan-400/20' },
                          { label: 'Launch optimization', icon: CheckCircle2, color: 'text-teal-400', panel: 'from-teal-500/20 to-teal-600/5 border-teal-400/20' },
                        ].map((item) => (
                          <div key={item.label} className="phone-widget widget-depth flex items-center rounded-2xl p-3">
                            <div className={cn('mr-3 flex h-10 w-10 items-center justify-center rounded-xl border bg-gradient-to-br shadow-inner', item.panel)}>
                              <item.icon className={cn('h-4 w-4 drop-shadow-md', item.color)} aria-hidden="true" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-white">{item.label}</div>
                              <div className="mt-2 h-1.5 w-24 rounded-full bg-neutral-600 shadow-inner" />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="absolute bottom-2 left-1/2 h-[4px] w-[120px] -translate-x-1/2 rounded-full bg-white/20 shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <div className="card-right-text order-3 z-20 grid gap-4 lg:order-3">
              <div>
                <p className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-[#67e8cf] md:text-sm">
                  Built to convert
                </p>
                <h3 className="text-2xl font-black tracking-tight text-white md:text-3xl lg:text-4xl">
                  Everything your new website needs to win trust quickly.
                </h3>
              </div>
              <div className="grid gap-3">
                {[
                  { icon: Code2, title: 'Websites and web apps', text: 'Corporate sites, ecommerce, dashboards, portals, booking tools, and custom workflows.' },
                  { icon: SearchCheck, title: 'Growth-ready structure', text: 'Responsive UX, SEO foundations, fast pages, and content flows built to convert.' },
                  { icon: ShieldCheck, title: 'Reliable launch support', text: 'Secure forms, integrations, admin tools, deployment, and support after launch.' },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.07] p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#67e8cf]">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white">{item.title}</h4>
                      <p className="mt-1 text-sm leading-6 text-blue-100/62">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CinematicHeroDemo() {
  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      <CinematicHero />
    </div>
  )
}
