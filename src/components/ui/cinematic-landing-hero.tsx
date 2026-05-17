'use client'

import React, { useEffect, useRef } from 'react'
import { ArrowRight, CheckCircle2, Code2, Database, Layers3, LineChart, SearchCheck, ShieldCheck, Sparkles } from 'lucide-react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { cn } from '@/lib/utils'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

const INJECTED_STYLES = `
  .gsap-reveal { visibility: hidden; }
  .film-grain {
    position: absolute; inset: 0; pointer-events: none; z-index: 50; opacity: 0.045; mix-blend-mode: overlay;
    background: url('data:image/svg+xml;utf8,<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="noiseFilter"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23noiseFilter)"/></svg>');
  }
  .bg-grid-theme {
    background-size: 60px 60px;
    background-image:
      linear-gradient(to right, color-mix(in srgb, var(--foreground) 6%, transparent) 1px, transparent 1px),
      linear-gradient(to bottom, color-mix(in srgb, var(--foreground) 6%, transparent) 1px, transparent 1px);
    mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
    -webkit-mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
  }
  .text-3d-matte {
    color: var(--foreground);
    text-shadow: 0 10px 30px color-mix(in srgb, var(--foreground) 20%, transparent), 0 2px 4px color-mix(in srgb, var(--foreground) 10%, transparent);
  }
  .text-silver-matte {
    background: linear-gradient(180deg, var(--foreground) 0%, color-mix(in srgb, var(--foreground) 42%, transparent) 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    filter: drop-shadow(0px 10px 20px color-mix(in srgb, var(--foreground) 16%, transparent));
  }
  .text-card-silver-matte {
    background: linear-gradient(180deg, #FFFFFF 0%, #A9B8CE 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    filter: drop-shadow(0px 12px 24px rgba(0,0,0,0.8)) drop-shadow(0px 4px 8px rgba(0,0,0,0.6));
  }
  .premium-depth-card {
    background:
      radial-gradient(circle at 18% 20%, rgba(18,200,160,0.18), transparent 32%),
      radial-gradient(circle at 82% 30%, rgba(18,97,255,0.22), transparent 30%),
      linear-gradient(145deg, #123C82 0%, #07101F 100%);
    box-shadow: 0 40px 100px -20px rgba(0,0,0,0.9), 0 20px 40px -20px rgba(0,0,0,0.8), inset 0 1px 2px rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.8);
    border: 1px solid rgba(255,255,255,0.05);
    position: relative;
  }
  .card-sheen {
    position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 50;
    background: radial-gradient(800px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.07) 0%, transparent 40%);
    mix-blend-mode: screen;
  }
  .dashboard-frame {
    background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%);
    box-shadow: 0 40px 80px -20px rgba(0,0,0,0.9), inset 0 1px 1px rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.08);
    transform-style: preserve-3d;
  }
  .widget-depth {
    background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.025) 100%);
    box-shadow: 0 14px 28px rgba(0,0,0,0.32), inset 0 1px 1px rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.06);
  }
  .floating-ui-badge {
    background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 100%);
    backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
    box-shadow: 0 0 0 1px rgba(255,255,255,0.12), 0 25px 50px -12px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.2);
  }
  .btn-modern-light {
    background: linear-gradient(180deg, #FFFFFF 0%, #F1F5F9 100%);
    color: #0F172A;
    box-shadow: 0 0 0 1px rgba(0,0,0,0.05), 0 12px 24px -4px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,1);
    transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
  }
  .btn-modern-light:hover { transform: translateY(-3px); box-shadow: 0 20px 32px -6px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,1); }
  .btn-modern-dark {
    background: linear-gradient(180deg, #12C8A0 0%, #0F8C76 100%);
    color: white;
    box-shadow: 0 0 0 1px rgba(255,255,255,0.12), 0 12px 24px -4px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.18);
    transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
  }
  .btn-modern-dark:hover { transform: translateY(-3px); filter: saturate(1.1); }
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
  cardHeading = 'CMS, security, SEO, and speed in one build.',
  cardDescription = (
    <>
      <span className="font-semibold text-white">Bakhtech Solutions</span> designs Laravel, React, Vue, and MySQL
      websites that content teams can manage and customers can trust.
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
      if (window.scrollY > window.innerHeight * 2) return

      cancelAnimationFrame(requestRef.current)
      requestRef.current = requestAnimationFrame(() => {
        if (!mainCardRef.current || !mockupRef.current) return

        const rect = mainCardRef.current.getBoundingClientRect()
        mainCardRef.current.style.setProperty('--mouse-x', `${event.clientX - rect.left}px`)
        mainCardRef.current.style.setProperty('--mouse-y', `${event.clientY - rect.top}px`)

        const xVal = (event.clientX / window.innerWidth - 0.5) * 2
        const yVal = (event.clientY / window.innerHeight - 0.5) * 2

        gsap.to(mockupRef.current, {
          rotationY: xVal * 10,
          rotationX: -yVal * 10,
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
    const isMobile = window.innerWidth < 768

    const ctx = gsap.context(() => {
      gsap.set('.text-track', { autoAlpha: 0, y: 60, scale: 0.85, filter: 'blur(20px)', rotationX: -20 })
      gsap.set('.text-days', { autoAlpha: 1, clipPath: 'inset(0 100% 0 0)' })
      gsap.set('.main-card', { y: window.innerHeight + 200, autoAlpha: 1 })
      gsap.set(['.card-left-text', '.card-right-text', '.mockup-scroll-wrapper', '.floating-badge', '.phone-widget'], { autoAlpha: 0 })
      gsap.set('.cta-wrapper', { autoAlpha: 0, scale: 0.8, filter: 'blur(30px)' })

      gsap
        .timeline({ delay: 0.3 })
        .to('.text-track', { duration: 1.8, autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', rotationX: 0, ease: 'expo.out' })
        .to('.text-days', { duration: 1.4, clipPath: 'inset(0 0% 0 0)', ease: 'power4.inOut' }, '-=1.0')

      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top top',
          end: '+=5200',
          pin: true,
          scrub: 1,
          anticipatePin: 1,
        },
      })

      scrollTl
        .to(['.hero-text-wrapper', '.bg-grid-theme'], { scale: 1.15, filter: 'blur(20px)', opacity: 0.2, ease: 'power2.inOut', duration: 2 }, 0)
        .to('.main-card', { y: 0, ease: 'power3.inOut', duration: 2 }, 0)
        .to('.main-card', { width: '100%', height: '100%', borderRadius: '0px', ease: 'power3.inOut', duration: 1.5 })
        .fromTo('.mockup-scroll-wrapper', { y: 300, z: -500, rotationX: 50, rotationY: -30, autoAlpha: 0, scale: 0.6 }, { y: 0, z: 0, rotationX: 0, rotationY: 0, autoAlpha: 1, scale: 1, ease: 'expo.out', duration: 2.5 }, '-=0.8')
        .fromTo('.phone-widget', { y: 40, autoAlpha: 0, scale: 0.95 }, { y: 0, autoAlpha: 1, scale: 1, stagger: 0.12, ease: 'back.out(1.2)', duration: 1.5 }, '-=1.5')
        .to('.progress-ring', { strokeDashoffset: 74, duration: 2, ease: 'power3.inOut' }, '-=1.2')
        .to('.counter-val', { innerHTML: metricValue, snap: { innerHTML: 1 }, duration: 2, ease: 'expo.out' }, '-=2.0')
        .fromTo('.floating-badge', { y: 100, autoAlpha: 0, scale: 0.7, rotationZ: -10 }, { y: 0, autoAlpha: 1, scale: 1, rotationZ: 0, ease: 'back.out(1.5)', duration: 1.5, stagger: 0.2 }, '-=2.0')
        .fromTo('.card-left-text', { x: -50, autoAlpha: 0 }, { x: 0, autoAlpha: 1, ease: 'power4.out', duration: 1.5 }, '-=1.5')
        .fromTo('.card-right-text', { x: 50, autoAlpha: 0, scale: 0.8 }, { x: 0, autoAlpha: 1, scale: 1, ease: 'expo.out', duration: 1.5 }, '<')
        .to({}, { duration: 2.2 })
        .set('.hero-text-wrapper', { autoAlpha: 0 })
        .set('.cta-wrapper', { autoAlpha: 1 })
        .to({}, { duration: 1.2 })
        .to(['.mockup-scroll-wrapper', '.floating-badge', '.card-left-text', '.card-right-text'], { scale: 0.9, y: -40, z: -200, autoAlpha: 0, ease: 'power3.in', duration: 1.2, stagger: 0.05 })
        .to('.main-card', { width: isMobile ? '92vw' : '85vw', height: isMobile ? '92vh' : '85vh', borderRadius: isMobile ? '32px' : '40px', ease: 'expo.inOut', duration: 1.8 }, 'pullback')
        .to('.cta-wrapper', { scale: 1, filter: 'blur(0px)', ease: 'expo.inOut', duration: 1.8 }, 'pullback')
        .to('.main-card', { y: -window.innerHeight - 300, ease: 'power3.in', duration: 1.5 })
    }, containerRef)

    return () => ctx.revert()
  }, [metricValue])

  return (
    <div
      ref={containerRef}
      className={cn('relative flex h-screen w-screen items-center justify-center overflow-hidden bg-[#f8fafc] text-slate-950 antialiased', className)}
      style={{ perspective: '1500px' }}
      {...props}
    >
      <style dangerouslySetInnerHTML={{ __html: INJECTED_STYLES }} />
      <div className="film-grain" aria-hidden="true" />
      <div className="bg-grid-theme absolute inset-0 z-0 opacity-50" aria-hidden="true" />

      <div className="hero-text-wrapper absolute z-10 flex w-screen flex-col items-center justify-center px-4 text-center">
        <h1 className="text-track gsap-reveal text-3d-matte mb-2 text-5xl font-bold tracking-tight md:text-7xl lg:text-[6rem]">
          {tagline1}
        </h1>
        <h1 className="text-days gsap-reveal text-silver-matte text-5xl font-extrabold tracking-tight md:text-7xl lg:text-[6rem]">
          {tagline2}
        </h1>
      </div>

      <div className="cta-wrapper gsap-reveal pointer-events-auto absolute z-10 flex w-screen flex-col items-center justify-center px-4 text-center">
        <h2 className="text-silver-matte mb-6 text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">{ctaHeading}</h2>
        <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-slate-600 md:text-xl">{ctaDescription}</p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <a href="/contact" className="btn-modern-light flex items-center justify-center gap-3 rounded-[1.15rem] px-8 py-4 font-bold">
            Start a project <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </a>
          <a href="/portfolio" className="btn-modern-dark flex items-center justify-center gap-3 rounded-[1.15rem] px-8 py-4 font-bold">
            View portfolio <Layers3 className="h-5 w-5" aria-hidden="true" />
          </a>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center" style={{ perspective: '1500px' }}>
        <div
          ref={mainCardRef}
          className="main-card premium-depth-card gsap-reveal pointer-events-auto relative flex h-[92vh] w-[92vw] items-center justify-center overflow-hidden rounded-[32px] md:h-[85vh] md:w-[85vw] md:rounded-[40px]"
        >
          <div className="card-sheen" aria-hidden="true" />
          <div className="relative z-10 mx-auto grid h-full w-full max-w-7xl items-center gap-5 px-4 py-6 lg:grid-cols-3 lg:gap-8 lg:px-12 lg:py-0">
            <div className="card-left-text gsap-reveal order-3 flex flex-col justify-center text-center lg:order-1 lg:text-left">
              <h3 className="mb-4 text-2xl font-bold tracking-tight text-white md:text-3xl lg:text-4xl">{cardHeading}</h3>
              <p className="mx-auto hidden max-w-sm text-sm leading-relaxed text-blue-100/75 md:block lg:mx-0 lg:max-w-none lg:text-lg">
                {cardDescription}
              </p>
            </div>

            <div className="mockup-scroll-wrapper order-2 flex h-[390px] items-center justify-center lg:h-[600px]" style={{ perspective: '1000px' }}>
              <div className="relative flex h-full w-full scale-[0.76] items-center justify-center md:scale-[0.88] lg:scale-100">
                <div ref={mockupRef} className="dashboard-frame relative h-[520px] w-[310px] rounded-[2rem] p-4 text-white will-change-transform md:w-[360px]">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="phone-widget text-[10px] font-bold uppercase tracking-[0.22em] text-blue-200/60">CMS Control</p>
                      <p className="phone-widget text-2xl font-black">Bakhtech OS</p>
                    </div>
                    <div className="phone-widget grid h-11 w-11 place-items-center rounded-xl bg-white/10">
                      <ShieldCheck className="h-5 w-5 text-[#12c8a0]" />
                    </div>
                  </div>

                  <div className="phone-widget widget-depth mb-4 rounded-2xl p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-xs font-semibold text-blue-100/70">Performance</span>
                      <span className="rounded-full bg-[#12c8a0]/15 px-2 py-1 text-xs font-bold text-[#12c8a0]">Live</span>
                    </div>
                    <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
                      <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
                        <circle cx="80" cy="80" r="64" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
                        <circle className="progress-ring" cx="80" cy="80" r="64" fill="none" stroke="#12C8A0" strokeWidth="12" />
                      </svg>
                      <div className="text-center">
                        <span className="counter-val block text-5xl font-black tracking-tight">0</span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-100/55">{metricLabel}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {[
                      { label: 'Pages editable', icon: Code2 },
                      { label: 'MySQL content', icon: Database },
                      { label: 'SEO schema ready', icon: SearchCheck },
                      { label: 'Lead forms secure', icon: CheckCircle2 },
                    ].map((item) => (
                      <div key={item.label} className="phone-widget widget-depth flex items-center gap-3 rounded-xl p-3">
                        <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/10">
                          <item.icon className="h-4 w-4 text-[#12c8a0]" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-bold">{item.label}</div>
                          <div className="mt-1 h-1.5 w-3/4 rounded-full bg-white/15" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="floating-badge absolute left-[-18px] top-8 z-30 flex items-center gap-3 rounded-2xl p-4 lg:left-[-95px]">
                  <LineChart className="h-9 w-9 rounded-full bg-[#1261ff]/20 p-2 text-blue-200" />
                  <div>
                    <p className="text-sm font-bold text-white">SEO growth system</p>
                    <p className="text-xs text-blue-200/60">Schema, metadata, analytics</p>
                  </div>
                </div>
                <div className="floating-badge absolute bottom-12 right-[-18px] z-30 flex items-center gap-3 rounded-2xl p-4 lg:right-[-95px]">
                  <Sparkles className="h-9 w-9 rounded-full bg-[#12c8a0]/20 p-2 text-emerald-200" />
                  <div>
                    <p className="text-sm font-bold text-white">Motion interface</p>
                    <p className="text-xs text-blue-200/60">Interactive and responsive</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-right-text gsap-reveal order-1 flex justify-center lg:order-3 lg:justify-end">
              <h2 className="text-card-silver-matte text-5xl font-black uppercase tracking-tight md:text-[5rem] lg:text-[7rem]">
                {brandName}
              </h2>
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
