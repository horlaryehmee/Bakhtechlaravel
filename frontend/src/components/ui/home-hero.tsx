import { ArrowRight, PencilLine } from 'lucide-react'
import { RippleButton } from '@/components/ui/ripple-button'

export function HomeHero() {
  return (
    <section className="relative flex min-h-[720px] items-start justify-center overflow-hidden px-4 pb-24 pt-36 md:min-h-[760px] md:pt-44">
      <div className="absolute inset-0 bg-[#fffafd]" />
      <div className="absolute left-1/2 top-0 h-[620px] w-[980px] -translate-x-1/2 rounded-b-[52%] bg-[radial-gradient(circle_at_45%_20%,rgba(171,142,255,0.38),transparent_35%),radial-gradient(circle_at_86%_86%,rgba(96,221,240,0.48),transparent_34%),radial-gradient(circle_at_56%_72%,rgba(255,246,205,0.72),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.92),rgba(238,228,255,0.78)_46%,rgba(222,250,255,0.85))] blur-[0.2px]" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-white via-white/80 to-transparent" />

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <h1 className="text-balance text-[3.5rem] font-black leading-[1.08] tracking-tight text-[#4b65b7] md:text-[5.4rem]">
          Need a
          <span className="block text-[#675ac9]">website that</span>
          <span className="relative inline-block text-[#8c55cf]">
            stands out?
            <svg
              className="absolute -bottom-5 left-1/2 h-9 w-[108%] -translate-x-1/2 overflow-visible"
              viewBox="0 0 520 48"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M13 28C131 14 301 11 500 30"
                stroke="#9148c8"
                strokeWidth="10"
                strokeLinecap="butt"
              />
            </svg>
            <PencilLine className="absolute -right-10 bottom-0 h-6 w-6 rotate-[-12deg] text-slate-950 md:-right-12" />
          </span>
        </h1>
        <p className="mx-auto mt-12 max-w-[540px] text-base leading-7 text-[#4e4b59] md:text-lg">
          Look no further. Bakhtech Solutions specializes in creating visually striking, user-friendly websites.
        </p>
        <div className="mt-9 flex justify-center">
          <RippleButton
            as="a"
            href="/contact"
            className="inline-flex min-h-14 items-center justify-center rounded-[5px] bg-[#29273d] px-8 font-semibold text-white shadow-none hover:text-white"
            rippleClassName="bg-[#ef4444]"
          >
            Get Started Now
          </RippleButton>
        </div>
        <div className="mt-10 flex items-center justify-center gap-2 text-xs font-semibold text-[#6f6b7c]">
          <span>Secure CMS</span>
          <span className="h-1 w-1 rounded-full bg-[#a59ec0]" />
          <span>Advanced SEO</span>
          <span className="h-1 w-1 rounded-full bg-[#a59ec0]" />
          <span className="inline-flex items-center gap-1">
            Fast launch <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </section>
  )
}
