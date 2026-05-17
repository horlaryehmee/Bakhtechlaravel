import {
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'
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
  const cardRef = useRef<HTMLDivElement>(null)
  const requestRef = useRef<number>(0)

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      cancelAnimationFrame(requestRef.current)

      requestRef.current = requestAnimationFrame(() => {
        if (!cardRef.current) return

        const rect = cardRef.current.getBoundingClientRect()
        cardRef.current.style.setProperty('--mouse-x', `${event.clientX - rect.left}px`)
        cardRef.current.style.setProperty('--mouse-y', `${event.clientY - rect.top}px`)
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
      gsap.set('.bakhtech-scroll-card', { y: window.innerHeight + 180, autoAlpha: 1 })
      gsap.set(['.bakhtech-scroll-copy', '.bakhtech-scroll-pill', '.bakhtech-scroll-metric'], { autoAlpha: 0, y: 34 })
      gsap.set('.bakhtech-scroll-cta', { autoAlpha: 0, scale: 0.86, filter: 'blur(20px)' })

      gsap
        .timeline({
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top top',
            end: '+=5200',
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        })
        .to(
          ['.bakhtech-hero-left', '.bakhtech-hero-right'],
          { scale: 1.08, y: -60, filter: 'blur(14px)', opacity: 0.18, ease: 'power2.inOut', duration: 2 },
          0,
        )
        .to('.bakhtech-hero-bg', { scale: 1.08, opacity: isDark ? 0.45 : 0.62, ease: 'power2.inOut', duration: 2 }, 0)
        .to('.bakhtech-scroll-card', { y: 0, ease: 'power3.inOut', duration: 2 }, 0)
        .to('.bakhtech-scroll-card', { width: '100%', height: '100%', borderRadius: '0px', ease: 'power3.inOut', duration: 1.5 })
        .fromTo(
          '.bakhtech-scroll-copy',
          { x: -40, autoAlpha: 0, filter: 'blur(10px)' },
          { x: 0, autoAlpha: 1, filter: 'blur(0px)', ease: 'power4.out', duration: 1.4 },
          '-=0.8',
        )
        .fromTo(
          '.bakhtech-scroll-metric',
          { y: 55, autoAlpha: 0, scale: 0.9 },
          { y: 0, autoAlpha: 1, scale: 1, stagger: 0.12, ease: 'back.out(1.3)', duration: 1.2 },
          '-=0.9',
        )
        .fromTo(
          '.bakhtech-scroll-pill',
          { y: 32, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, stagger: 0.08, ease: 'power3.out', duration: 1 },
          '-=0.8',
        )
        .to({}, { duration: 1.6 })
        .to(['.bakhtech-scroll-copy', '.bakhtech-scroll-pill', '.bakhtech-scroll-metric'], {
          y: -38,
          scale: 0.96,
          autoAlpha: 0,
          filter: 'blur(12px)',
          ease: 'power3.in',
          duration: 1.1,
          stagger: 0.04,
        })
        .to(
          '.bakhtech-scroll-card',
          {
            width: isMobile ? '92vw' : '84vw',
            height: isMobile ? '76vh' : '78vh',
            borderRadius: isMobile ? '28px' : '38px',
            ease: 'expo.inOut',
            duration: 1.5,
          },
          'pullback',
        )
        .to('.bakhtech-scroll-cta', { autoAlpha: 1, scale: 1, filter: 'blur(0px)', ease: 'expo.inOut', duration: 1.5 }, 'pullback')
        .to({}, { duration: 1 })
        .to('.bakhtech-scroll-card', { y: -window.innerHeight - 220, ease: 'power3.in', duration: 1.4 })
    }, containerRef)

    return () => ctx.revert()
  }, [isDark])

  return (
    <div
      ref={containerRef}
      className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-[var(--background)] font-sans text-[var(--foreground)]"
      style={{ perspective: '1500px' }}
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
      <RainingLettersBackground className={cn('z-[1] bg-transparent', isDark ? 'opacity-34' : 'opacity-55')} density={150} mode={theme} />
      <div
        className={cn(
          'pointer-events-none absolute inset-0 z-[2]',
          isDark
            ? 'bg-[radial-gradient(circle_at_28%_18%,rgba(139,184,255,0.22),transparent_32%),radial-gradient(circle_at_84%_30%,rgba(103,232,207,0.16),transparent_34%),linear-gradient(180deg,rgba(16,23,41,0.34),rgba(16,23,41,0.58)_78%,#101729_100%)]'
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

      <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center" style={{ perspective: '1500px' }}>
        <div
          ref={cardRef}
          className="bakhtech-scroll-card pointer-events-auto relative h-[76vh] w-[92vw] overflow-hidden rounded-[28px] border border-white/10 bg-[#07101f] shadow-[0_42px_120px_rgba(0,0,0,0.72)] md:h-[78vh] md:w-[84vw] md:rounded-[38px]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(800px_circle_at_var(--mouse-x,50%)_var(--mouse-y,50%),rgba(255,255,255,0.12),transparent_42%)]" />
          <img src="/bg1.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(18,200,160,0.28),transparent_30%),radial-gradient(circle_at_82%_28%,rgba(18,97,255,0.3),transparent_32%),linear-gradient(145deg,#123c82_0%,#07101f_70%)]" />

          <div className="relative z-10 grid h-full items-center gap-8 px-6 py-10 text-white md:px-12 lg:grid-cols-[1.05fr_0.95fr] lg:px-16">
            <div className="bakhtech-scroll-copy">
              <p className="mb-4 text-sm font-black uppercase tracking-[0.24em] text-[#12c8a0]">Welcome To Bakhtech Solutions</p>
              <h2 className="max-w-2xl text-4xl font-black leading-[0.95] tracking-tight md:text-6xl lg:text-7xl">
                Empower Your Business
              </h2>
              <p className="mt-6 max-w-xl text-base leading-8 text-blue-100/78 md:text-lg">
                We specialize in creating websites that not only reflect your brand identity but also resonate with your
                target audience. Let's collaborate to bring your unique vision to life and leave a lasting impact in the
                digital realm.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {['Innovate', 'Transform', 'Elevate'].map((label) => (
                  <span
                    key={label}
                    className="bakhtech-scroll-pill rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-bold text-white/86 backdrop-blur-xl"
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
                <div key={item.label} className="bakhtech-scroll-metric rounded-2xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur-xl">
                  <div className="text-4xl font-black tracking-tight text-white">{item.value}</div>
                  <div className="mt-2 text-sm font-semibold text-blue-100/62">{item.label}</div>
                </div>
              ))}
            </div>

            <div className="bakhtech-scroll-cta absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center">
              <h2 className="max-w-4xl text-4xl font-black tracking-tight text-white md:text-6xl lg:text-7xl">
                Ready to get started?
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-blue-100/72">
                Building Your Online Presence, One Click at a Time!
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <a href="/contact" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-black text-[#07101f]">
                  Get A Quote <ArrowRight className="h-4 w-4" />
                </a>
                <a href="/portfolio" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/8 px-6 text-sm font-black text-white backdrop-blur-xl">
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
