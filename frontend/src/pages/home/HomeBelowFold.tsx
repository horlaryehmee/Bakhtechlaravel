import { lazy, Suspense, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarCheck, ExternalLink, Globe2, Layers3, Megaphone, MessageCircle, Play, SearchCheck, ShoppingCart, X } from 'lucide-react'
import { Boxes } from '@/components/ui/background-boxes'
import { BorderBeam } from '@/components/ui/border-beam'
import { SafeImage } from '@/components/ui/safe-image'
import { InfiniteSlider } from '@/components/ui/infinite-slider'
import { ProgressiveBlur } from '@/components/ui/progressive-blur'
import { FeatureCard } from '@/components/ui/grid-feature-cards'
import { StaggerReviews } from '@/components/ui/stagger-reviews'
import { api, type Project, type Review } from '@/lib/api'
import { cn } from '@/lib/utils'

const Sparkles = lazy(() => import('@/components/ui/sparkles').then((module) => ({ default: module.Sparkles })))

const services = [
  { icon: Globe2, title: 'Business Websites', description: 'Clear, credible websites that explain your offer and guide visitors to contact you.' },
  { icon: ShoppingCart, title: 'E-commerce Platforms', description: 'Online stores with product pages, checkout flows, payments, and customer-ready layouts.' },
  { icon: Layers3, title: 'Web Apps & Portals', description: 'Dashboards, booking systems, client portals, admin tools, and custom business workflows.' },
  { icon: CalendarCheck, title: 'Booking Systems', description: 'Appointment flows, service selection, reminders, and lead capture built around your operations.' },
  { icon: SearchCheck, title: 'SEO, UI/UX & Performance', description: 'Search-ready structure, modern interfaces, fast pages, and content flows built to convert.' },
  { icon: Megaphone, title: 'Social Media Management', description: 'Content planning, creative direction, post design, and brand consistency across social channels.' },
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

type VideoMedia = {
  title: string
  type: 'youtube' | 'video'
  url: string
}

type ReviewLinks = {
  google: string
  trustpilot: string
}

function cleanProjectUrl(url: string) {
  const value = url.trim()
  if (!value || value === '#') return undefined
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
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
        <SafeImage src={coverImage || youtubeThumbnailUrl} fallbackSrc={image || '/showcase/showcase-01.jpg'} alt={project.title} className="h-full w-full object-cover" loading="lazy" decoding="async" />
        <button type="button" onClick={() => onPlay({ title: project.title, type: 'youtube', url: videoUrl })} className="absolute inset-0 z-10 grid place-items-center bg-black/18 text-white transition hover:bg-black/28" aria-label={`Play ${project.title}`}>
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
          <SafeImage src={coverImage || image} alt={project.title} className="h-full w-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <video className="h-full w-full object-cover" muted preload="metadata" playsInline>
            <source src={videoUrl} />
          </video>
        )}
        <button type="button" onClick={() => onPlay({ title: project.title, type: 'video', url: videoUrl })} className="absolute inset-0 z-10 grid place-items-center bg-black/18 text-white transition hover:bg-black/28" aria-label={`Play ${project.title}`}>
          <span className="grid h-12 w-12 place-items-center rounded-full border border-white/25 bg-white/18 backdrop-blur-md">
            <Play className="ml-0.5 h-5 w-5 fill-current" />
          </span>
        </button>
      </>
    )
  }

  return <SafeImage src={image || '/showcase/showcase-01.jpg'} alt={project.title} className="h-full w-full object-cover" loading="lazy" decoding="async" />
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
      <BorderBeam size={220} duration={8} borderWidth={1.8} colorFrom="#ef4444" colorTo="#fca5a5" delay={project.id % 4} />
      <div className="portfolio-visual-panel relative h-44 overflow-hidden rounded-xl sm:h-48">
        <ProjectMediaPreview project={project} onPlay={onPlayMedia} />
      </div>

      <div className="mt-6 flex flex-1 flex-col">
        <span className="portfolio-glass-pill mb-4 w-fit rounded-full px-3.5 py-1 text-xs font-medium text-[#d6dde5]">{project.category}</span>
        <h3 className="text-lg font-semibold leading-tight text-white sm:text-xl">{project.title}</h3>
        {showDescription && project.summary ? <p className="mt-3 flex-1 text-sm leading-6 text-white/72">{project.summary}</p> : null}

        <div className={cn('flex flex-wrap items-center gap-2', showDescription && project.summary ? 'mt-5' : 'mt-4')}>
          {projectUrl ? (
            <a href={projectUrl} target="_blank" rel="noreferrer" className="portfolio-glass-button inline-flex min-h-8 items-center gap-1.5 rounded-lg px-3 text-[0.7rem] font-medium text-[#d6dde5] transition hover:text-white sm:text-xs">
              View live project
              <ArrowRight className="h-3 w-3" />
            </a>
          ) : null}
          {videoMedia ? (
            <button type="button" onClick={() => onPlayMedia(videoMedia)} className="portfolio-glass-button inline-flex min-h-8 items-center gap-1.5 rounded-lg px-3 text-[0.7rem] font-medium text-[#d6dde5] transition hover:text-white sm:text-xs">
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
            <iframe className="h-full w-full" src={youtubeEmbedUrl} title={media.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
          ) : (
            <video className="h-full w-full" src={media.url} controls autoPlay playsInline />
          )}
        </div>
      </div>
    </div>
  )
}

function GoogleReviewLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.4 0 6.4 1.2 8.8 3.4l6.6-6.6C35.4 2.6 30.1.5 24 .5 14.8.5 6.9 5.8 3.1 13.5l7.7 6c1.8-5.8 7.1-10 13.2-10z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-2.8-.4-4.1H24v8.3h12.9c-.3 2.1-1.7 5.3-4.9 7.5l7.5 5.8c4.4-4.1 7-10.1 7-17.5z" />
      <path fill="#FBBC05" d="M10.8 28.5c-.5-1.4-.8-2.9-.8-4.5s.3-3.1.8-4.5l-7.7-6C1.4 16.7.5 20.2.5 24s.9 7.3 2.6 10.5l7.7-6z" />
      <path fill="#34A853" d="M24 47.5c6.1 0 11.3-2 15.1-5.5l-7.5-5.8c-2 1.4-4.7 2.3-7.6 2.3-6.1 0-11.4-4.1-13.2-9.9l-7.7 6C6.9 42.2 14.8 47.5 24 47.5z" />
    </svg>
  )
}

function TrustpilotReviewLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M17.227 16.67l2.19 6.742-7.413-5.388 5.223-1.354zM24 9.31h-9.165L12.005.589l-2.84 8.723L0 9.3l7.422 5.397-2.84 8.714 7.422-5.388 4.583-3.326L24 9.311z" />
    </svg>
  )
}

function ReviewPlatformModal({ links, onClose }: { links: ReviewLinks; onClose: () => void }) {
  const platforms = [
    { name: 'Google', href: links.google, icon: <GoogleReviewLogo className="h-7 w-7" /> },
    { name: 'Trustpilot', href: links.trustpilot, icon: <TrustpilotReviewLogo className="h-7 w-7" /> },
  ]

  return (
    <div className="fixed inset-0 z-[170] grid place-items-center bg-[#030712]/70 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Choose review platform">
      <div className="w-full max-w-md rounded-2xl border border-white/12 bg-white p-4 shadow-[0_24px_80px_rgba(15,23,42,0.28)] sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-[#111827]">Drop a review</h3>
            <p className="mt-1 text-sm leading-6 text-[#6b7280]">Choose where you would like to leave your feedback.</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#d7dbe5] text-[#111827] transition hover:bg-[#f8f8fb]" aria-label="Close review options">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {platforms.map((platform) => {
            const disabled = !platform.href.trim()
            const className = cn('flex min-h-24 flex-col justify-between rounded-xl border p-4 text-left transition', disabled ? 'cursor-not-allowed border-[#d7dbe5] bg-[#f8f8fb] text-[#9ca3af]' : 'border-[#d7dbe5] bg-white text-[#111827] hover:border-[#ef4444] hover:bg-[#fff7f7]')

            if (disabled) {
              return (
                <div key={platform.name} className={className} aria-disabled="true">
                  <span>{platform.icon}</span>
                  <span className="mt-3 text-sm font-black">{platform.name}</span>
                  <span className="mt-1 text-xs font-medium">Link not added yet</span>
                </div>
              )
            }

            return (
              <a key={platform.name} href={platform.href} target="_blank" rel="noreferrer" className={className}>
                <span>{platform.icon}</span>
                <span className="mt-3 flex items-center justify-between gap-2 text-sm font-black">
                  {platform.name}
                  <ExternalLink className="h-3.5 w-3.5" />
                </span>
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function HomeBelowFold({ isDark }: { isDark: boolean }) {
  const [portfolioProjects, setPortfolioProjects] = useState<Project[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [showPortfolioDescriptions, setShowPortfolioDescriptions] = useState(true)
  const [reviewLinks, setReviewLinks] = useState<ReviewLinks>({ google: '', trustpilot: '' })
  const [activeVideo, setActiveVideo] = useState<VideoMedia | null>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [showDeferredEffects, setShowDeferredEffects] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadPortfolioData() {
      const [projectResult, settingsResult, reviewResult] = await Promise.allSettled([api.publicProjects(), api.publicSettings(), api.publicReviews()])
      if (cancelled) return

      setPortfolioProjects(projectResult.status === 'fulfilled' ? projectResult.value.projects.slice(0, 6) : [])
      setReviews(reviewResult.status === 'fulfilled' ? reviewResult.value.reviews : [])
      const settings = settingsResult.status === 'fulfilled' ? settingsResult.value.settings : {}
      setShowPortfolioDescriptions(settings.homePortfolioShowDescriptions !== 'false')
      setReviewLinks({
        google: settings.googleReviewUrl || '',
        trustpilot: settings.trustpilotReviewUrl || '',
      })
    }

    const timeoutId = window.setTimeout(() => {
      void loadPortfolioData()
      setShowDeferredEffects(true)
    }, 100)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [])

  return (
    <>
      <section className="relative overflow-hidden bg-[var(--background)] pt-16 pb-6 md:pt-20 md:pb-8">
        <div className="container-x relative z-10">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-main text-3xl font-black tracking-tight md:text-5xl">Built for businesses that need more than a website.</h2>
            <p className="text-soft mt-5 text-lg leading-8">Bakhtech combines design, development, and launch strategy to create digital products people can trust and use.</p>
          </div>

          <div className="relative mx-auto mt-9 grid w-full max-w-5xl gap-4">
            <InfiniteSlider className="flex h-14 w-full items-center" duration={48} gap={18}>
              {serviceItems.map((item) => (
                <div key={item} className="surface-card flex h-12 min-w-max items-center justify-center rounded-full px-5 text-sm font-black text-[var(--foreground)]">{item}</div>
              ))}
            </InfiniteSlider>

            <InfiniteSlider className="flex h-14 w-full items-center" duration={52} gap={18} reverse>
              {industryItems.map((item) => (
                <div key={item} className="surface-card flex h-12 min-w-max items-center justify-center rounded-full px-5 text-sm font-black text-[var(--foreground)]">{item}</div>
              ))}
            </InfiniteSlider>

            <ProgressiveBlur className="pointer-events-none absolute left-0 top-0 h-full w-28 md:w-48" direction="left" blurIntensity={1} />
            <ProgressiveBlur className="pointer-events-none absolute right-0 top-0 h-full w-28 md:w-48" direction="right" blurIntensity={1} />
          </div>
        </div>

        <div className="relative -mt-16 h-40 w-full overflow-hidden [mask-image:radial-gradient(50%_50%,white,transparent)] md:h-52">
          <div className="absolute inset-0 before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_bottom_center,#ef4444,transparent_70%)] before:opacity-40" />
          <div className="absolute -left-1/2 top-1/2 z-10 aspect-[1/0.7] w-[200%] rounded-[100%] border-t border-zinc-900/20 bg-[var(--background)] dark:border-white/20" />
          {showDeferredEffects ? (
            <Suspense fallback={null}>
              <Sparkles density={360} className="absolute inset-x-0 bottom-0 h-full w-full [mask-image:radial-gradient(50%_50%,white,transparent_85%)]" color={isDark ? '#ffffff' : '#000000'} />
            </Suspense>
          ) : null}
        </div>
      </section>

      <section id="services" className="section-bg pt-10 pb-20 md:pt-14 md:pb-28">
        <div className="mx-auto w-full max-w-5xl space-y-8 px-4">
          <div className="mx-auto max-w-3xl text-center">
            <p className="home-eyebrow mb-3 text-sm uppercase text-[#ef4444]">What We Build</p>
            <h2 className="text-main text-balance text-3xl font-bold tracking-wide md:text-4xl lg:text-5xl xl:font-extrabold">Strategy. Design. Development. Launch.</h2>
            <p className="text-soft mt-4 text-balance text-sm tracking-wide md:text-base">Complete web development services for brands that need fast, secure, scalable digital products.</p>
          </div>

          <div className="grid grid-cols-1 divide-y divide-dashed border border-dashed border-[var(--line)] sm:grid-cols-2 sm:divide-x md:grid-cols-3">
            {services.map((service) => (
              <FeatureCard key={service.title} feature={service} />
            ))}
          </div>
        </div>
      </section>

      <section id="portfolio" className="home-portfolio-section relative overflow-hidden bg-[#151a20] py-20 md:py-28">
        <Boxes className="portfolio-bg-effect opacity-95" />
        <div className="portfolio-bg-effect pointer-events-none absolute inset-0 z-20 h-full w-full bg-[#151a20]/42 [mask-image:radial-gradient(transparent_12%,white_88%)]" />
        <div className="portfolio-bg-effect pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(circle_at_50%_18%,rgba(96,111,126,0.12),transparent_46%),linear-gradient(180deg,rgba(21,26,32,0.02),rgba(21,26,32,0.34)_90%)]" />
        <div className="container-x relative z-30">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p className="home-eyebrow mb-3 text-sm uppercase text-[#ef4444]">Portfolio</p>
            <h2 className="text-balance text-3xl font-black tracking-tight text-white md:text-5xl">Projects built for real businesses.</h2>
          </div>

          <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2 xl:grid-cols-3">
            {portfolioProjects.map((project) => (
              <ProjectCard key={project.id} project={project} showDescription={showPortfolioDescriptions} onPlayMedia={setActiveVideo} />
            ))}
          </div>

          {portfolioProjects.length ? (
            <div className="mt-10 flex justify-center">
              <Link to="/portfolio" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/10 px-5 text-sm font-black text-white backdrop-blur-md transition hover:bg-white/16">
                Show all projects
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="portfolio-glass-card mx-auto max-w-xl rounded-3xl p-8 text-center text-white/70">Published backend projects will appear here.</div>
          )}
        </div>
      </section>

      {reviews.length ? (
        <section id="reviews" className="home-reviews-section overflow-hidden bg-[#f8f8fb] py-14 md:py-20">
          <div className="container-x">
            <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
              <div className="flex min-h-[13rem] flex-col items-center justify-center pt-2 text-center lg:min-h-[25rem] lg:items-start lg:pt-2 lg:text-left">
                <h2 className="max-w-sm text-3xl font-bold leading-tight tracking-tight text-[var(--foreground)] sm:text-4xl md:text-5xl">
                  Hear from <span className="text-[#ef4444]">happy</span> customers.
                </h2>
                <button type="button" onClick={() => setShowReviewModal(true)} className="mt-5 inline-flex min-h-10 w-full max-w-[12rem] items-center justify-center gap-2 rounded-md bg-[#ef4444] px-4 text-sm font-bold text-white transition hover:bg-[#dc2626] sm:w-auto sm:min-h-11 sm:px-5">
                  <MessageCircle className="h-4 w-4" />
                  Review us
                </button>
              </div>
              <div className="lg:pt-2">
                <StaggerReviews reviews={reviews} />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {activeVideo ? <ProjectVideoModal media={activeVideo} onClose={() => setActiveVideo(null)} /> : null}
      {showReviewModal ? <ReviewPlatformModal links={reviewLinks} onClose={() => setShowReviewModal(false)} /> : null}
    </>
  )
}
