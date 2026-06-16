import { lazy, Suspense, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Play, Plus, X } from 'lucide-react'
import { FluidParticles } from '@/components/ui/fluid-particle'
import { AnimatedGroup } from '@/components/ui/animated-group'
import { BorderBeam } from '@/components/ui/border-beam'
import { RippleButton } from '@/components/ui/ripple-button'
import { TypeWriter } from '@/components/ui/hero-designali'
import { AnimatedImageMarquee } from '@/components/ui/hero-3'
import { useTheme } from '@/components/theme/theme-context'
import { api } from '@/lib/api'

const HomeBelowFold = lazy(() => import('@/pages/home/HomeBelowFold').then((module) => ({ default: module.HomeBelowFold })))

const impactWords = ['trust', 'sales', 'growth', 'clarity', 'impact']

const showcaseImages = [
  '/showcase/showcase-01.jpg',
  '/showcase/showcase-02.jpg',
  '/showcase/showcase-03.jpg',
  '/showcase/showcase-04.jpg',
  '/showcase/showcase-05.jpg',
  '/showcase/showcase-06.jpg',
  '/showcase/showcase-07.jpg',
  '/showcase/showcase-08.jpg',
]

const transitionVariants = {
  item: {
    hidden: {
      opacity: 0,
      filter: 'blur(8px)',
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      transition: {
        type: 'spring',
        bounce: 0.3,
        duration: 1.2,
      },
    },
  },
}

function getYoutubeVideoId(url: string) {
  const value = url.trim()
  const match = value.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match?.[1]
}

function getYoutubeEmbedUrl(url: string) {
  const id = getYoutubeVideoId(url)
  return id ? `https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1&rel=0` : undefined
}

function normalizeVideoUrl(url: string) {
  const value = url.trim()
  if (!value) return ''
  return /^https?:\/\//i.test(value) || value.startsWith('/') ? value : `https://${value}`
}

function HomepageVideoModal({ videoUrl, onClose }: { videoUrl: string; onClose: () => void }) {
  const normalizedUrl = normalizeVideoUrl(videoUrl)
  const youtubeEmbedUrl = getYoutubeEmbedUrl(normalizedUrl)

  return (
    <div className="fixed inset-0 z-[160] grid place-items-center bg-black/78 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Homepage video">
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-white/14 bg-[#050816] shadow-[0_30px_100px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
          <h3 className="truncate text-sm font-bold text-white">Bakhtech Solutions</h3>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/8 text-white transition hover:bg-white/14" aria-label="Close video">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="aspect-video bg-black">
          {youtubeEmbedUrl ? (
            <iframe className="h-full w-full" src={youtubeEmbedUrl} title="Bakhtech Solutions video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
          ) : (
            <video className="h-full w-full" src={normalizedUrl} controls autoPlay playsInline />
          )}
        </div>
      </div>
    </div>
  )
}

export function Home2() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [loadBelowFold, setLoadBelowFold] = useState(false)
  const [homepageVideoUrl, setHomepageVideoUrl] = useState('')
  const [showHomepageVideo, setShowHomepageVideo] = useState(false)

  useEffect(() => {
    const show = () => setLoadBelowFold(true)

    const timeoutId = window.setTimeout(show, 9000)
    window.addEventListener('scroll', show, { passive: true, once: true })
    window.addEventListener('pointerdown', show, { passive: true, once: true })

    return () => {
      window.clearTimeout(timeoutId)
      window.removeEventListener('scroll', show)
      window.removeEventListener('pointerdown', show)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    api.publicSettings()
      .then((result) => {
        if (mounted) setHomepageVideoUrl(result.settings.homepageVideoUrl?.trim() ?? '')
      })
      .catch(() => undefined)

    return () => {
      mounted = false
    }
  }, [])

  return (
    <>
      <main className="home-page overflow-hidden">
      <section className="relative min-h-[100svh] overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
        <FluidParticles
          className="absolute inset-0 h-full w-full"
          particleDensity={220}
          particleSize={1}
          particleColor={isDark ? '#555555' : '#555555'}
          activeColor={isDark ? '#ffffff' : '#000000'}
          maxBlastRadius={300}
          hoverDelay={1}
          interactionDistance={100}
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 z-[2] hidden opacity-50 contain-strict lg:block">
          <div className="absolute left-0 top-0 h-[80rem] w-[35rem] -translate-y-[350px] -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.12)_0,hsla(0,0%,55%,.04)_50%,hsla(0,0%,45%,0)_80%)]" />
          <div className="absolute left-0 top-0 h-[80rem] w-56 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.08)_0,hsla(0,0%,45%,.03)_80%,transparent_100%)] [translate:5%_-50%]" />
          <div className="absolute left-0 top-0 h-[80rem] w-56 -translate-y-[350px] -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.03)_80%,transparent_100%)]" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,color-mix(in_srgb,var(--brand)_10%,transparent),transparent_34%),linear-gradient(180deg,color-mix(in_srgb,var(--background)_42%,transparent),var(--background)_94%)]" />

        <div className="container-x relative z-10 flex min-h-[100svh] flex-col justify-center pb-10 pt-28 text-center md:pb-16 md:pt-36">
          <AnimatedGroup variants={transitionVariants} className="mx-auto max-w-5xl">
            <div className="relative mx-auto h-full border border-[var(--line)] bg-[var(--background)]/72 p-6 py-10 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm [mask-image:radial-gradient(800rem_96rem_at_center,white,transparent)] md:px-10 md:py-12">
              <Plus strokeWidth={4} className="absolute -left-5 -top-5 h-10 w-10 text-[#ef4444]" />
              <Plus strokeWidth={4} className="absolute -bottom-5 -left-5 h-10 w-10 text-[#ef4444]" />
              <Plus strokeWidth={4} className="absolute -right-5 -top-5 h-10 w-10 text-[#ef4444]" />
              <Plus strokeWidth={4} className="absolute -bottom-5 -right-5 h-10 w-10 text-[#ef4444]" />
              <h1 className="mx-auto flex max-w-5xl flex-col text-center text-5xl font-semibold leading-none tracking-tight md:text-7xl lg:text-8xl">
                <span>
                  Need a website{' '}
                  <span className="text-[#ef4444]">that stands out?</span>
                </span>
              </h1>
            </div>

            <h2 className="text-main mt-8 text-2xl font-semibold md:text-3xl">
              Welcome to Bakhtech Solutions.
            </h2>

            <p className="text-soft mx-auto max-w-2xl py-4 text-base leading-7 md:text-lg">
              We build digital experiences that turn attention into{' '}
              <span className="font-bold text-[#ef4444]">
                <TypeWriter strings={impactWords} />
              </span>
              .
            </p>
          </AnimatedGroup>

          <AnimatedGroup
            variants={{
              container: {
                visible: {
                  transition: {
                    staggerChildren: 0.05,
                    delayChildren: 0.35,
                  },
                },
              },
              ...transitionVariants,
            }}
            className="mt-3 flex items-center justify-center gap-2 sm:gap-3"
          >
            <RippleButton
              as={Link}
              to="/booking"
              className="inline-flex min-h-14 w-[min(52vw,11rem)] items-center justify-center rounded-xl bg-[var(--foreground)] px-5 text-sm font-bold text-[var(--background)] shadow-[0_14px_30px_rgba(15,23,42,0.14)] transition hover:-translate-y-0.5 hover:text-white sm:w-auto sm:min-w-40 sm:max-w-[18rem]"
              rippleClassName="bg-[#ef4444]"
            >
              Get Started
            </RippleButton>
            <button
              type="button"
              className="relative isolate inline-grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--line)] bg-[var(--surface)]/90 text-[var(--foreground)] shadow-[0_14px_30px_rgba(15,23,42,0.12)] backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-[var(--surface-2)]"
              onClick={() => {
                if (homepageVideoUrl) setShowHomepageVideo(true)
              }}
              aria-label="Play homepage video"
              aria-disabled={!homepageVideoUrl}
              title={homepageVideoUrl ? 'Play video' : 'Add a homepage video in Admin Settings'}
            >
              <BorderBeam size={80} duration={4} borderWidth={2.2} colorFrom="#ef4444" colorTo="#fca5a5" />
              <Play className="ml-0.5 h-5 w-5 fill-current" />
            </button>
          </AnimatedGroup>

          <div className="relative mt-7 h-[7.6rem] w-full overflow-hidden sm:h-[9.2rem] md:mt-10 md:h-[11.25rem]">
            <AnimatedImageMarquee
              images={showcaseImages}
              className="h-full [mask-image:linear-gradient(to_right,transparent,black_9%,black_91%,transparent)]"
              duration={68}
              straight
              priority
              trackClassName="gap-4 px-4 sm:gap-5 md:gap-10 md:px-10"
              cardClassName="h-[7.6rem] w-[13.5rem] rounded-md border border-[var(--line)] bg-[var(--surface)] shadow-[0_18px_48px_rgba(15,23,42,0.12)] sm:h-[9.2rem] sm:w-[16.35rem] md:h-[11.25rem] md:w-[20rem]"
            />
          </div>

        </div>
      </section>

      {loadBelowFold ? (
        <Suspense fallback={<div className="min-h-[120svh] bg-[var(--background)]" />}>
          <HomeBelowFold isDark={isDark} />
        </Suspense>
      ) : (
        <div className="min-h-[120svh] bg-[var(--background)]" aria-hidden />
      )}

      </main>
      {showHomepageVideo && homepageVideoUrl ? (
        <HomepageVideoModal videoUrl={homepageVideoUrl} onClose={() => setShowHomepageVideo(false)} />
      ) : null}
    </>
  )
}
