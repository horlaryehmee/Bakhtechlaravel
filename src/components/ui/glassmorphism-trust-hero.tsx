import {
  ArrowRight,
  CheckCircle2,
  Command,
  Cpu,
  Crown,
  Gem,
  Ghost,
  Hexagon,
  Play,
  Star,
  Target,
  Triangle,
} from 'lucide-react'
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useTheme } from '@/components/theme/ThemeProvider'
import { RainingLettersBackground } from '@/components/ui/modern-animated-hero-section'
import { cn } from '@/lib/utils'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

const CLIENTS = [
  { name: 'Acme Corp', icon: Hexagon },
  { name: 'Quantum', icon: Triangle },
  { name: 'Command+Z', icon: Command },
  { name: 'Phantom', icon: Ghost },
  { name: 'Ruby', icon: Gem },
  { name: 'Chipset', icon: Cpu },
]

const StatItem = ({ value, label }: { value: string; label: string }) => (
  <div className="flex cursor-default flex-col items-center justify-center transition-transform hover:-translate-y-1">
    <span className="text-main text-xl font-bold sm:text-2xl">{value}</span>
    <span className="text-soft text-[10px] font-medium uppercase tracking-wider sm:text-xs">{label}</span>
  </div>
)

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
          isDark ? 'opacity-25 brightness-75 saturate-125' : 'opacity-100',
        )}
      />
      <RainingLettersBackground className={cn('z-[1] bg-transparent', isDark ? 'opacity-70' : 'opacity-55')} density={150} mode={theme} />
      <div
        className={cn(
          'pointer-events-none absolute inset-0 z-[2]',
          isDark
            ? 'bg-[radial-gradient(circle_at_30%_20%,rgba(34,197,94,0.08),transparent_28%),radial-gradient(circle_at_82%_28%,rgba(99,102,241,0.12),transparent_30%),linear-gradient(180deg,rgba(9,9,11,0.18),rgba(9,9,11,0.52)_86%,#09090b_100%)]'
            : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(248,250,252,0.3)_76%,#f8fafc_100%)]',
        )}
      />
      <div className="pointer-events-none absolute inset-y-0 left-0 z-[3] w-[68%] bg-[radial-gradient(ellipse_at_38%_45%,color-mix(in_srgb,var(--background)_92%,transparent)_0%,color-mix(in_srgb,var(--background)_68%,transparent)_42%,transparent_76%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-32 bg-gradient-to-t from-[var(--background)] to-transparent" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-12 pt-28 sm:px-6 md:pb-20 md:pt-36 lg:px-8">
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="bakhtech-hero-left flex flex-col justify-center space-y-8 pt-8 will-change-transform lg:col-span-7">
            <div className="animate-fade-in delay-100">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)]/70 px-3 py-1.5 backdrop-blur-md transition-colors hover:bg-[var(--surface)]">
                <span className="text-soft flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider sm:text-xs">
                  Award-Winning Design
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                </span>
              </div>
            </div>

            <h1
              className="animate-fade-in delay-200 text-main text-5xl font-medium leading-[0.9] tracking-tight sm:text-6xl lg:text-7xl xl:text-8xl"
              style={{
                maskImage: 'linear-gradient(180deg, black 0%, black 80%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(180deg, black 0%, black 80%, transparent 100%)',
              }}
            >
              Need a website
              <br />
              <span
                className={cn(
                  'bg-clip-text text-transparent',
                  isDark
                    ? 'bg-gradient-to-br from-white via-white to-[#ffcd75]'
                    : 'bg-gradient-to-br from-[#0b1220] via-[#1261ff] to-[#0f8c76]',
                )}
              >
                that stands out?
              </span>
            </h1>

            <p className="animate-fade-in delay-300 text-soft max-w-xl text-lg leading-relaxed">
              Look no further. Bakhtech Solutions specializes in creating visually striking, user-friendly websites.
            </p>

            <div className="animate-fade-in delay-400 flex flex-col gap-4 sm:flex-row">
              <a
                href="/portfolio"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-[var(--foreground)] px-8 py-4 text-sm font-semibold text-[var(--background)] transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Get Started Now
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>

              <a
                href="/contact"
                className="group inline-flex items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)]/70 px-8 py-4 text-sm font-semibold text-[var(--foreground)] backdrop-blur-sm transition-colors hover:bg-[var(--surface)]"
              >
                <Play className="h-4 w-4 fill-current" />
                Request A Quote
              </a>
            </div>
          </div>

          <div className="bakhtech-hero-right space-y-6 will-change-transform lg:col-span-5 lg:mt-12">
            <div className="animate-fade-in delay-500 surface-card relative overflow-hidden rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
              <div className="pointer-events-none absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-[var(--brand)]/10 blur-3xl" />

              <div className="relative z-10">
                <div className="mb-8 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-main text-3xl font-bold tracking-tight">200+</div>
                    <div className="text-soft text-sm">Website Designed</div>
                  </div>
                </div>

                <div className="mb-8 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-soft">Positive Feedback</span>
                    <span className="text-main font-medium">98%</span>
                  </div>
                  <div className="surface-muted h-2 w-full overflow-hidden rounded-full">
                    <div className="h-full w-[98%] rounded-full bg-gradient-to-r from-[#1261ff] to-[#12c8a0]" />
                  </div>
                </div>

                <div className="mb-6 h-px w-full bg-[var(--line)]" />

                <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] gap-4 text-center">
                  <StatItem value="7+" label="Years" />
                  <div className="mx-auto h-full w-px bg-[var(--line)]" />
                  <StatItem value="23" label="Countries" />
                  <div className="mx-auto h-full w-px bg-[var(--line)]" />
                  <StatItem value="8+" label="Services" />
                </div>

                <div className="mt-8 flex flex-wrap gap-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium tracking-wide text-zinc-300">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                    </span>
                    ACTIVE
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium tracking-wide text-zinc-300">
                    <Crown className="h-3 w-3 text-yellow-500" />
                    PREMIUM
                  </div>
                </div>
              </div>
            </div>

            <div className="animate-fade-in delay-500 surface-card relative overflow-hidden rounded-3xl py-8 backdrop-blur-xl">
              <h3 className="text-soft mb-6 px-8 text-sm font-medium">Projects</h3>

              <div
                className="relative flex overflow-hidden"
                style={{
                  maskImage: 'linear-gradient(to right, transparent, black 20%, black 80%, transparent)',
                  WebkitMaskImage: 'linear-gradient(to right, transparent, black 20%, black 80%, transparent)',
                }}
              >
                <div className="animate-marquee flex whitespace-nowrap px-4">
                  {[...CLIENTS, ...CLIENTS, ...CLIENTS].map((client, index) => (
                    <div
                      key={`${client.name}-${index}`}
                      className="mx-6 flex cursor-default items-center gap-2 opacity-55 grayscale transition-all hover:scale-105 hover:opacity-100 hover:grayscale-0"
                    >
                      <client.icon className="h-6 w-6 fill-current text-[var(--foreground)]" />
                      <span className="text-main text-lg font-bold tracking-tight">{client.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
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
