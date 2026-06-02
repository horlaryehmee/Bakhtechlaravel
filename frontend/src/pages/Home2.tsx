import { lazy, Suspense, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarCheck, Globe2, Layers3, Megaphone, Play, Plus, SearchCheck, ShoppingCart, X } from 'lucide-react'
import { type Variants } from 'framer-motion'
import { FluidParticles } from '@/components/ui/fluid-particle'
import { AnimatedGroup } from '@/components/ui/animated-group'
import { Boxes } from '@/components/ui/background-boxes'
import { BorderBeam } from '@/components/ui/border-beam'
import { ShineBorder, TypeWriter } from '@/components/ui/hero-designali'
import { AnimatedImageMarquee } from '@/components/ui/hero-3'
import { InfiniteSlider } from '@/components/ui/infinite-slider'
import { ProgressiveBlur } from '@/components/ui/progressive-blur'
import { FeatureCard } from '@/components/ui/grid-feature-cards'
import { useTheme } from '@/components/theme/ThemeProvider'
import { api, type Project } from '@/lib/api'
import { cn } from '@/lib/utils'

const services = [
  { icon: Globe2, title: 'Business Websites', description: 'Clear, credible websites that explain your offer and guide visitors to contact you.' },
  { icon: ShoppingCart, title: 'E-commerce Platforms', description: 'Online stores with product pages, checkout flows, payments, and customer-ready layouts.' },
  { icon: Layers3, title: 'Web Apps & Portals', description: 'Dashboards, booking systems, client portals, admin tools, and custom business workflows.' },
  { icon: CalendarCheck, title: 'Booking Systems', description: 'Appointment flows, service selection, reminders, and lead capture built around your operations.' },
  { icon: SearchCheck, title: 'SEO, UI/UX & Performance', description: 'Search-ready structure, modern interfaces, fast pages, and content flows built to convert.' },
  { icon: Megaphone, title: 'Social Media Management', description: 'Content planning, creative direction, post design, and brand consistency across social channels.' },
]

const Sparkles = lazy(() => import('@/components/ui/sparkles').then((module) => ({ default: module.Sparkles })))

const talkAbout = ['Websites', 'Web Apps', 'Ecommerce', 'Booking Systems', 'Dashboards', 'Client Portals', 'UI/UX']

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

const serviceItems = [
  'Business Websites',
  'Ecommerce Stores',
  'Web Apps',
  'Booking Systems',
  'Dashboards',
  'Client Portals',
  'Landing Pages',
  'SEO',
  'UI/UX Design',
  'API Integrations',
  'CMS Websites',
  'Performance Optimization',
]

const industryItems = [
  'Beauty & Aesthetics',
  'Ecommerce',
  'Real Estate',
  'Healthcare',
  'Education',
  'Restaurants',
  'Fashion',
  'Automotive',
  'Consulting',
  'Events',
  'Travel & Tours',
  'Nonprofits',
  'Professional Services',
  'Startups',
]

const transitionVariants: { item: Variants } = {
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

function cleanProjectUrl(url: string) {
  const value = url.trim()
  if (!value || value === '#') return undefined
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

type VideoMedia = {
  title: string
  type: 'youtube' | 'video'
  url: string
}

function getYoutubeVideoId(url: string) {
  const value = url.trim()
  const match = value.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match?.[1]
}

function getYoutubeEmbedUrl(url: string) {
  const id = getYoutubeVideoId(url)
  return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : undefined
}

function getYoutubeThumbnailUrl(url: string) {
  const id = getYoutubeVideoId(url)
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : undefined
}

function isVideoUrl(url: string) {
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url)
}

function getProjectVideoUrl(project: Project) {
  const explicitVideo = project.videoUrl?.trim()
  if (explicitVideo) return explicitVideo

  const legacyMedia = project.image?.trim()
  return legacyMedia && (getYoutubeVideoId(legacyMedia) || isVideoUrl(legacyMedia)) ? legacyMedia : ''
}

function ProjectMediaPreview({ project, onPlay }: { project: Project; onPlay: (media: VideoMedia) => void }) {
  const videoUrl = getProjectVideoUrl(project)
  const youtubeThumbnailUrl = getYoutubeThumbnailUrl(videoUrl)
  const coverImage = project.coverImage?.trim()
  const image = project.image?.trim()

  if (youtubeThumbnailUrl) {
    return (
      <>
        <img src={coverImage || youtubeThumbnailUrl} alt={project.title} className="h-full w-full object-cover" loading="lazy" />
        <button
          type="button"
          onClick={() => onPlay({ title: project.title, type: 'youtube', url: videoUrl })}
          className="absolute inset-0 z-10 grid place-items-center bg-black/18 text-white transition hover:bg-black/28"
          aria-label={`Play ${project.title}`}
        >
          <span className="grid h-12 w-12 place-items-center rounded-full border border-white/25 bg-white/18 backdrop-blur-md">
            <Play className="ml-0.5 h-5 w-5 fill-current" />
          </span>
        </button>
      </>
    )
  }

  if (isVideoUrl(videoUrl)) {
    return (
      <>
        {coverImage || image ? (
          <img src={coverImage || image} alt={project.title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <video className="h-full w-full object-cover" muted preload="metadata" playsInline>
            <source src={videoUrl} />
          </video>
        )}
        <button
          type="button"
          onClick={() => onPlay({ title: project.title, type: 'video', url: videoUrl })}
          className="absolute inset-0 z-10 grid place-items-center bg-black/18 text-white transition hover:bg-black/28"
          aria-label={`Play ${project.title}`}
        >
          <span className="grid h-12 w-12 place-items-center rounded-full border border-white/25 bg-white/18 backdrop-blur-md">
            <Play className="ml-0.5 h-5 w-5 fill-current" />
          </span>
        </button>
      </>
    )
  }

  return <img src={image || '/showcase/showcase-01.jpg'} alt={project.title} className="h-full w-full object-cover" loading="lazy" />
}

function ProjectCard({ project, showDescription, onPlayMedia }: { project: Project; showDescription: boolean; onPlayMedia: (media: VideoMedia) => void }) {
  const projectUrl = cleanProjectUrl(project.websiteUrl)
  const videoUrl = getProjectVideoUrl(project)
  const videoMedia: VideoMedia | null = getYoutubeEmbedUrl(videoUrl)
    ? { title: project.title, type: 'youtube', url: videoUrl }
    : isVideoUrl(videoUrl)
      ? { title: project.title, type: 'video', url: videoUrl }
      : null

  return (
    <article className="portfolio-glass-card relative flex h-full flex-col overflow-hidden rounded-2xl p-4 text-white">
      <BorderBeam size={220} duration={8} borderWidth={1.8} colorFrom="#587d9f" colorTo="#b7d5ec" delay={project.id % 4} />
      <div className="portfolio-visual-panel relative h-44 overflow-hidden rounded-xl sm:h-48">
        <ProjectMediaPreview project={project} onPlay={onPlayMedia} />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(48,55,63,0.08),rgba(8,11,14,0.2))]" />
        <div className="pointer-events-none absolute inset-0 opacity-14 mix-blend-screen [background-image:linear-gradient(90deg,rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.2)_1px,transparent_1px)] [background-size:18px_18px]" />
      </div>

      <div className="mt-6 flex flex-1 flex-col">
        <span className="portfolio-glass-pill mb-4 w-fit rounded-full px-3.5 py-1 text-xs font-medium text-[#d6dde5]">
          {project.category}
        </span>
        <h3 className="text-lg font-semibold leading-tight text-white sm:text-xl">{project.title}</h3>
        {showDescription ? <p className="mt-3 flex-1 text-sm leading-6 text-white/72">{project.summary}</p> : null}

        <div className={cn('flex flex-wrap items-center gap-2', showDescription ? 'mt-5' : 'mt-4')}>
          {projectUrl ? (
            <a
              href={projectUrl}
              target="_blank"
              rel="noreferrer"
              className="portfolio-glass-button inline-flex min-h-8 items-center gap-1.5 rounded-lg px-3 text-[0.7rem] font-medium text-[#d6dde5] transition hover:text-white sm:text-xs"
            >
              View live project
              <ArrowRight className="h-3 w-3" />
            </a>
          ) : null}
          {videoMedia ? (
            <button
              type="button"
              onClick={() => onPlayMedia(videoMedia)}
              className="portfolio-glass-button inline-flex min-h-8 items-center gap-1.5 rounded-lg px-3 text-[0.7rem] font-medium text-[#d6dde5] transition hover:text-white sm:text-xs"
            >
              Play presentation
              <Play className="h-3 w-3 fill-current" />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function ProjectVideoModal({ media, onClose }: { media: VideoMedia; onClose: () => void }) {
  const youtubeEmbedUrl = media.type === 'youtube' ? getYoutubeEmbedUrl(media.url) : undefined

  return (
    <div className="fixed inset-0 z-[160] grid place-items-center bg-black/78 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={media.title}>
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-white/14 bg-[#050816] shadow-[0_30px_100px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
          <h3 className="truncate text-sm font-bold text-white">{media.title}</h3>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/8 text-white transition hover:bg-white/14" aria-label="Close video">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="aspect-video bg-black">
          {youtubeEmbedUrl ? (
            <iframe
              className="h-full w-full"
              src={youtubeEmbedUrl}
              title={media.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <video className="h-full w-full" src={media.url} controls autoPlay playsInline />
          )}
        </div>
      </div>
    </div>
  )
}

export function Home2() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [portfolioProjects, setPortfolioProjects] = useState<Project[]>([])
  const [showPortfolioDescriptions, setShowPortfolioDescriptions] = useState(true)
  const [activeVideo, setActiveVideo] = useState<VideoMedia | null>(null)
  const [showDeferredEffects, setShowDeferredEffects] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadPortfolioData() {
      try {
        const [projectResult, settingsResult] = await Promise.all([api.publicProjects(), api.publicSettings()])
        if (cancelled) return
        setPortfolioProjects(projectResult.projects.slice(0, 6))
        setShowPortfolioDescriptions(settingsResult.settings.homePortfolioShowDescriptions !== 'false')
      } catch {
        if (cancelled) return
        setPortfolioProjects([])
      }
    }

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }

    if (idleWindow.requestIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(() => {
        void loadPortfolioData()
      }, { timeout: 1800 })

      return () => {
        cancelled = true
        idleWindow.cancelIdleCallback?.(idleId)
      }
    }

    const timeoutId = window.setTimeout(() => {
      void loadPortfolioData()
    }, 900)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [])

  useEffect(() => {
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }

    if (idleWindow.requestIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(() => {
        setShowDeferredEffects(true)
      }, { timeout: 2200 })

      return () => idleWindow.cancelIdleCallback?.(idleId)
    }

    const timeoutId = window.setTimeout(() => {
      setShowDeferredEffects(true)
    }, 1500)

    return () => window.clearTimeout(timeoutId)
  }, [])

  return (
    <>
      <main className="overflow-hidden">
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
              We craft high-converting digital products for businesses, including{' '}
              <span className="font-bold text-[#1261ff]">
                <TypeWriter strings={talkAbout} />
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
            <Link to="/contact" className="w-[min(46vw,11rem)] sm:w-auto sm:max-w-[18rem]">
              <ShineBorder
                borderWidth={3}
                className="h-auto w-full cursor-pointer border bg-white/5 p-2 backdrop-blur-md dark:bg-black/5"
                color={['#FF007F', '#39FF14', '#00FFFF']}
              >
                <span className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--foreground)] px-3 text-xs font-bold text-[var(--background)] sm:px-5 sm:text-sm">
                  Start Building
                </span>
              </ShineBorder>
            </Link>
            <Link to="/contact" className="inline-flex min-h-12 w-[min(46vw,11rem)] items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)]/60 px-3 text-xs font-bold text-[var(--foreground)] transition hover:bg-[var(--surface-2)] sm:w-auto sm:max-w-[18rem] sm:px-6 sm:text-base">
              <span className="text-nowrap">Book a call</span>
            </Link>
          </AnimatedGroup>

          <AnimatedGroup preset="slide" className="relative mt-7 h-[7.6rem] w-full overflow-hidden sm:h-[9.2rem] md:mt-10 md:h-[11.25rem]">
            <AnimatedImageMarquee
              images={showcaseImages}
              className="h-full [mask-image:linear-gradient(to_right,transparent,black_9%,black_91%,transparent)]"
              duration={68}
              straight
              trackClassName="gap-4 px-4 sm:gap-5 md:gap-10 md:px-10"
              cardClassName="h-[7.6rem] w-[13.5rem] rounded-md border border-[var(--line)] bg-[var(--surface)] shadow-[0_18px_48px_rgba(15,23,42,0.12)] sm:h-[9.2rem] sm:w-[16.35rem] md:h-[11.25rem] md:w-[20rem]"
            />
          </AnimatedGroup>

        </div>
      </section>

      <section className="relative overflow-hidden bg-[var(--background)] pt-16 pb-6 md:pt-20 md:pb-8">
        <div className="container-x relative z-10">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-main text-3xl font-black tracking-tight md:text-5xl">
              Built for businesses that need more than a website.
            </h2>
            <p className="text-soft mt-5 text-lg leading-8">
              Bakhtech combines design, development, and launch strategy to create digital products people can trust and use.
            </p>
          </div>

          <div className="relative mx-auto mt-9 grid w-full max-w-5xl gap-4">
            <InfiniteSlider className="flex h-14 w-full items-center" duration={48} gap={18}>
              {serviceItems.map((item) => (
                <div key={item} className="surface-card flex h-12 min-w-max items-center justify-center rounded-full px-5 text-sm font-black text-[var(--foreground)]">
                  {item}
                </div>
              ))}
            </InfiniteSlider>

            <InfiniteSlider className="flex h-14 w-full items-center" duration={52} gap={18} reverse>
              {industryItems.map((item) => (
                <div key={item} className="surface-card flex h-12 min-w-max items-center justify-center rounded-full px-5 text-sm font-black text-[var(--foreground)]">
                  {item}
                </div>
              ))}
            </InfiniteSlider>

            <ProgressiveBlur className="pointer-events-none absolute left-0 top-0 h-full w-28 md:w-48" direction="left" blurIntensity={1} />
            <ProgressiveBlur className="pointer-events-none absolute right-0 top-0 h-full w-28 md:w-48" direction="right" blurIntensity={1} />
          </div>
        </div>

        <div className="relative -mt-16 h-40 w-full overflow-hidden [mask-image:radial-gradient(50%_50%,white,transparent)] md:h-52">
          <div className="absolute inset-0 before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_bottom_center,#8350e8,transparent_70%)] before:opacity-40" />
          <div className="absolute -left-1/2 top-1/2 z-10 aspect-[1/0.7] w-[200%] rounded-[100%] border-t border-zinc-900/20 bg-[var(--background)] dark:border-white/20" />
          {showDeferredEffects ? (
            <Suspense fallback={null}>
              <Sparkles
                density={360}
                className="absolute inset-x-0 bottom-0 h-full w-full [mask-image:radial-gradient(50%_50%,white,transparent_85%)]"
                color={isDark ? '#ffffff' : '#000000'}
              />
            </Suspense>
          ) : null}
        </div>
      </section>

      <section id="services" className="section-bg pt-10 pb-20 md:pt-14 md:pb-28">
        <div className="mx-auto w-full max-w-5xl space-y-8 px-4">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-3 text-sm font-black uppercase tracking-[0.22em] text-[#1261ff]">What We Build</p>
            <h2 className="text-main text-balance text-3xl font-bold tracking-wide md:text-4xl lg:text-5xl xl:font-extrabold">
              Strategy. Design. Development. Launch.
            </h2>
            <p className="text-soft mt-4 text-balance text-sm tracking-wide md:text-base">
              Complete web development services for brands that need fast, secure, scalable digital products.
            </p>
          </div>

          <div className="grid grid-cols-1 divide-y divide-dashed border border-dashed border-[var(--line)] sm:grid-cols-2 sm:divide-x md:grid-cols-3">
            {services.map((service) => (
              <FeatureCard key={service.title} feature={service} />
            ))}
          </div>
        </div>
      </section>

      <section id="portfolio" className="relative overflow-hidden bg-[#151a20] py-20 md:py-28">
        <Boxes className="opacity-95" />
        <div className="pointer-events-none absolute inset-0 z-20 h-full w-full bg-[#151a20]/42 [mask-image:radial-gradient(transparent_12%,white_88%)]" />
        <div className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(circle_at_50%_18%,rgba(96,111,126,0.12),transparent_46%),linear-gradient(180deg,rgba(21,26,32,0.02),rgba(21,26,32,0.34)_90%)]" />
        <div className="container-x relative z-30">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p className="mb-3 text-sm font-black uppercase tracking-[0.22em] text-[#8ea0ff]">Portfolio</p>
            <h2 className="text-balance text-3xl font-black tracking-tight text-white md:text-5xl">
              Projects built for real businesses.
            </h2>
          </div>

          <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2 xl:grid-cols-3">
            {portfolioProjects.map((project) => (
              <ProjectCard key={project.id} project={project} showDescription={showPortfolioDescriptions} onPlayMedia={setActiveVideo} />
            ))}
          </div>

          {portfolioProjects.length ? (
            <div className="mt-10 flex justify-center">
              <Link
                to="/portfolio"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/10 px-5 text-sm font-black text-white backdrop-blur-md transition hover:bg-white/16"
              >
                Show all projects
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="portfolio-glass-card mx-auto max-w-xl rounded-3xl p-8 text-center text-white/70">
              Published backend projects will appear here.
            </div>
          )}
        </div>
      </section>

      {activeVideo ? <ProjectVideoModal media={activeVideo} onClose={() => setActiveVideo(null)} /> : null}

      </main>
    </>
  )
}
