import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useTheme } from '@/components/theme/ThemeProvider'
import { RainingLettersBackground } from '@/components/ui/modern-animated-hero-section'
import { HeroGeometric } from '@/components/ui/shape-landing-hero'
import { cn } from '@/lib/utils'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

export default function HeroSection() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return

    const ctx = gsap.context(() => {
      gsap.set('.cinematic-card', { yPercent: 115, autoAlpha: 1, scale: 0.94 })
      gsap.set('.cinematic-final', {
        autoAlpha: 0,
        y: 24,
      })

      gsap
        .timeline({
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top top',
            end: '+=3000',
            pin: true,
            scrub: 0.65,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        })
        .to('.bakhtech-hero-left', { y: -70, scale: 0.98, opacity: 0.18, duration: 1.2, ease: 'power2.out' }, 0)
        .to('.bakhtech-hero-bg', { scale: 1.04, opacity: isDark ? 0.24 : 0.62, duration: 1.2, ease: 'power2.out' }, 0)
        .to('.cinematic-card', { yPercent: 0, scale: 1, duration: 1.35, ease: 'power3.out' }, 0.05)
        .to('.cinematic-copy', { y: 0, duration: 0.8, ease: 'power3.out' }, 0.8)
        .to('.cinematic-metric', { y: 0, stagger: 0.08, duration: 0.65, ease: 'power3.out' }, 0.95)
        .to('.cinematic-pill', { y: 0, stagger: 0.06, duration: 0.55, ease: 'power3.out' }, 1.1)
        .to({}, { duration: 0.8 })
        .to(['.cinematic-copy', '.cinematic-metric', '.cinematic-pill'], {
          autoAlpha: 0,
          y: -18,
          duration: 0.55,
          ease: 'power2.in',
        })
        .to('.cinematic-final', { autoAlpha: 1, y: 0, duration: 0.75, ease: 'power3.out' }, '>-0.15')
        .to({}, { duration: 0.55 })
        .to('.cinematic-card', { yPercent: -115, scale: 0.98, duration: 0.85, ease: 'power3.in' })
    }, containerRef)

    return () => ctx.revert()
  }, [isDark])

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[var(--background)] font-sans text-[var(--foreground)]"
    >
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .animate-fade-in {
          animation: fadeSlideIn 0.8s ease-out forwards;
          opacity: 0;
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }
        .delay-500 { animation-delay: 0.5s; }
      `}</style>

      <img
        src="/bg1.jpg"
        alt=""
        className={cn(
          'bakhtech-hero-bg',
          'pointer-events-none absolute inset-0 z-0 h-full w-full object-cover',
          isDark ? 'opacity-42 brightness-90 saturate-110' : 'opacity-100',
        )}
      />
      <RainingLettersBackground className={cn('z-[1] bg-transparent', isDark ? 'opacity-22' : 'opacity-32')} density={80} mode={theme} />
      <div
        className={cn(
          'pointer-events-none absolute inset-0 z-[2]',
          isDark
            ? 'bg-[radial-gradient(circle_at_28%_18%,rgba(139,184,255,0.22),transparent_32%),radial-gradient(circle_at_84%_30%,rgba(103,232,207,0.16),transparent_34%),linear-gradient(180deg,rgba(0,0,0,0.34),rgba(0,0,0,0.58)_78%,#000000_100%)]'
            : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(248,250,252,0.3)_76%,#f8fafc_100%)]',
        )}
      />
      <div className="pointer-events-none absolute inset-y-0 left-0 z-[3] w-[68%] bg-[radial-gradient(ellipse_at_38%_45%,color-mix(in_srgb,var(--background)_92%,transparent)_0%,color-mix(in_srgb,var(--background)_68%,transparent)_42%,transparent_76%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-32 bg-gradient-to-t from-[var(--background)] to-transparent" />

      <div className="bakhtech-hero-left relative z-10 w-full will-change-transform">
        <HeroGeometric
          badge=""
          title1="Need a website"
          title2="that stands out?"
          description="Look no further. Bakhtech Solutions specializes in creating visually striking, user-friendly websites."
          actions={
            <div className="pointer-events-auto flex flex-col gap-3 sm:flex-row md:hidden">
              <a
                href="/contact"
                className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--foreground)] px-8 text-sm font-semibold text-[var(--background)] transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Get Started Now
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
              <a
                href="/portfolio"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)]/70 px-8 text-sm font-semibold text-[var(--foreground)] backdrop-blur-sm transition hover:bg-[var(--surface)]"
              >
                Explore Project
              </a>
            </div>
          }
          className="min-h-screen bg-transparent"
        />
        <div className="pointer-events-auto absolute left-1/2 top-[70%] z-30 hidden -translate-x-1/2 -translate-y-1/2 flex-col gap-3 sm:flex-row md:flex md:gap-4">
          <a
            href="/contact"
            className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--foreground)] px-8 text-sm font-semibold text-[var(--background)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Get Started Now
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
          <a
            href="/portfolio"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)]/70 px-8 text-sm font-semibold text-[var(--foreground)] backdrop-blur-sm transition hover:bg-[var(--surface)]"
          >
            Explore Project
          </a>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center px-4">
        <div className="cinematic-card pointer-events-auto relative h-[78vh] w-[92vw] overflow-hidden rounded-[30px] border border-white/10 bg-[#07101f] text-white shadow-[0_40px_120px_rgba(2,6,23,0.5)] md:h-[80vh] md:w-[86vw] md:rounded-[38px]">
          <img src="/bg1.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-18 mix-blend-screen" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_20%,rgba(18,200,160,0.26),transparent_30%),radial-gradient(circle_at_84%_26%,rgba(18,97,255,0.34),transparent_34%),linear-gradient(135deg,#123c82_0%,#07101f_72%)]" />

          <div className="relative z-10 grid h-full content-start items-start gap-7 px-6 py-10 md:px-12 md:py-14 lg:grid-cols-[1.04fr_0.96fr] lg:px-16">
            <div className="cinematic-copy">
              <p className="mb-4 text-xs font-black uppercase tracking-[0.24em] text-[#67e8cf] md:text-sm">
                Welcome To Bakhtech Solutions
              </p>
              <h2 className="max-w-2xl text-4xl font-black leading-[0.95] tracking-tight md:text-6xl lg:text-7xl">
                Empower Your Business
              </h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-blue-100/78 md:text-lg md:leading-8">
                We specialize in creating websites that reflect your brand identity, resonate with your target audience,
                and leave a lasting impact in the digital realm.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                {['Innovate', 'Transform', 'Elevate', 'Responsive Design', 'Advanced SEO'].map((label) => (
                  <span
                    key={label}
                    className="cinematic-pill rounded-full border border-white/12 bg-white/10 px-4 py-2 text-sm font-bold text-white/86 backdrop-blur-xl"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { value: '7+', label: 'Years Experience' },
                { value: '200+', label: 'Website Designed' },
                { value: '98%', label: 'Positive Feedback' },
                { value: '23', label: 'Countries' },
              ].map((item) => (
                <div key={item.label} className="cinematic-metric rounded-2xl border border-white/10 bg-white/[0.08] p-5 backdrop-blur-xl">
                  <div className="text-4xl font-black tracking-tight">{item.value}</div>
                  <div className="mt-2 text-sm font-semibold text-blue-100/62">{item.label}</div>
                </div>
              ))}
            </div>

            <div className="cinematic-copy lg:col-span-2">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#67e8cf] md:text-sm">
                We Design & Develop
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {[
                  'E-commerce Website',
                  'Business Website',
                  'Blogs',
                  'Portfolio',
                  'Real Estate Website',
                  'Educational Website',
                  'Consultancy Website',
                  'And Many More',
                ].map((label) => (
                  <span key={label} className="cinematic-pill rounded-full border border-white/12 bg-white/[0.07] px-4 py-2 text-sm font-bold text-white/82">
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="cinematic-final absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center">
              <h2 className="max-w-4xl text-4xl font-black tracking-tight md:text-6xl lg:text-7xl">Ready to get started?</h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-blue-100/72">Building Your Online Presence, One Click at a Time!</p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <a href="/contact" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-black text-[#07101f]">
                  Get A Quote <ArrowRight className="h-4 w-4" />
                </a>
                <a href="/portfolio" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/10 px-6 text-sm font-black text-white backdrop-blur-xl">
                  Explore Project <CheckCircle2 className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
