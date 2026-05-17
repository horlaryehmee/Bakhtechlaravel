import { ArrowRight } from 'lucide-react'
import { useTheme } from '@/components/theme/ThemeProvider'
import { RainingLettersBackground } from '@/components/ui/modern-animated-hero-section'
import { HeroGeometric } from '@/components/ui/shape-landing-hero'
import { cn } from '@/lib/utils'

export default function HeroSection() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[var(--background)] font-sans text-[var(--foreground)]">
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

    </div>
  )
}
