import { useEffect, useState } from 'react'
import { ArrowRight, Layers3, Play, SearchCheck, Sparkles, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Boxes } from '@/components/ui/background-boxes'
import { BorderBeam } from '@/components/ui/border-beam'
import { portfolio } from '@/data/site'
import { api, type Project } from '@/lib/api'

type VideoMedia = {
  title: string
  type: 'video' | 'youtube'
  url: string
}

function fromProject(project: Project): Project {
  return project
}

function fromFallback(item: (typeof portfolio)[number], index: number): Project {
  return {
    id: index + 1,
    slug: item.title.toLowerCase().replace(/\s+/g, '-'),
    category: item.category,
    title: item.title,
    summary: item.summary,
    description: '',
    image: item.image,
    coverImage: '',
    videoUrl: '',
    websiteUrl: '',
    services: [],
    metrics: {},
    isFeatured: false,
    status: 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function cleanProjectUrl(url?: string) {
  const value = url?.trim()
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

function getYoutubeThumbnailUrl(url?: string) {
  const id = url ? getYoutubeVideoId(url) : undefined
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : undefined
}

function isVideoUrl(url?: string) {
  return url ? /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url) : false
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
        <img src={coverImage || youtubeThumbnailUrl} alt={project.title} className="h-full w-full object-cover" loading="lazy" decoding="async" />
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
          <img src={coverImage || image} alt={project.title} className="h-full w-full object-cover" loading="lazy" decoding="async" />
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

  return <img src={image || '/showcase/showcase-01.jpg'} alt={project.title} className="h-full w-full object-cover" loading="lazy" decoding="async" />
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
    <article className="surface-card relative flex h-full flex-col overflow-hidden rounded-2xl p-4 text-[var(--foreground)]">
      <BorderBeam size={220} duration={8} borderWidth={1.8} colorFrom="#587d9f" colorTo="#b7d5ec" delay={project.id % 4} />
      <div className="portfolio-visual-panel relative h-44 overflow-hidden rounded-xl sm:h-48">
        <ProjectMediaPreview project={project} onPlay={onPlayMedia} />
      </div>

      <div className="mt-6 flex flex-1 flex-col">
        <span className="mb-4 w-fit rounded-full bg-[#ef4444]/10 px-3.5 py-1 text-xs font-medium text-[#ef4444]">{project.category}</span>
        <h3 className="text-lg font-semibold leading-tight text-[var(--foreground)] sm:text-xl">{project.title}</h3>
        {showDescription && project.summary ? <p className="mt-3 flex-1 text-sm leading-6 text-[var(--foreground)]/70">{project.summary}</p> : null}

        <div className={showDescription && project.summary ? 'mt-5 flex flex-wrap items-center gap-2' : 'mt-4 flex flex-wrap items-center gap-2'}>
          {projectUrl ? (
            <a href={projectUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-[#ef4444]/10 px-3 text-[0.7rem] font-medium text-[#ef4444] transition hover:bg-[#ef4444]/20 sm:text-xs">
              View live project
              <ArrowRight className="h-3 w-3" />
            </a>
          ) : null}
          {videoMedia ? (
            <button type="button" onClick={() => onPlayMedia(videoMedia)} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-[var(--line)] px-3 text-[0.7rem] font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-2)] sm:text-xs">
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

export function Portfolio() {
  const [activeVideo, setActiveVideo] = useState<VideoMedia | null>(null)
  const [items, setItems] = useState<Project[]>(() => portfolio.map(fromFallback))
  const [showProjectSummaries, setShowProjectSummaries] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadProjects() {
      try {
        const [projectResult, settingsResult] = await Promise.allSettled([api.publicProjects(), api.publicSettings()])
        if (cancelled) return

        if (projectResult.status === 'fulfilled' && projectResult.value.projects.length) {
          setItems(projectResult.value.projects.map(fromProject))
        }

        if (settingsResult.status === 'fulfilled') {
          setShowProjectSummaries(settingsResult.value.settings.homePortfolioShowDescriptions !== 'false')
        }
      } catch {
        if (!cancelled) setItems(portfolio.map(fromFallback))
      }
    }

    void loadProjects()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="projects-page home-page overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <section id="projects" className="relative overflow-hidden bg-[var(--background)] pb-20 pt-32 md:pb-28 md:pt-36">
        <Boxes className="portfolio-bg-effect opacity-50" />
        <div className="container-x relative z-30">
          <div className="mx-auto mb-12 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="home-eyebrow mb-3 text-sm uppercase text-[#587d9f]">Portfolio</p>
              <h2 className="text-balance text-3xl font-black tracking-tight text-[var(--foreground)] md:text-5xl">Projects built for real businesses.</h2>
            </div>
            <p className="leading-8 text-[var(--foreground)]/70 lg:justify-self-end lg:text-right">
              Each project starts with a practical question: what should this help the business do better?
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {items.length ? (
              items.map((item) => <ProjectCard key={`${item.id}-${item.title}`} project={item} showDescription={showProjectSummaries} onPlayMedia={setActiveVideo} />)
            ) : (
              <div className="surface-card mx-auto max-w-xl rounded-3xl p-8 text-center text-[var(--foreground)]/70">Published projects will appear here.</div>
            )}
          </div>
        </div>
      </section>

      <section className="gradient-grid-bg relative overflow-hidden py-16 md:py-24">
        <div className="gradient-grid-bg-layer" aria-hidden="true" />
        <div className="container-x relative z-10">
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { icon: SearchCheck, title: 'Clear purpose', text: 'We shape each project around what customers need to understand and do.' },
              { icon: Layers3, title: 'Useful systems', text: 'We build beyond pages when the business needs booking, sales, portals, or admin tools.' },
              { icon: Sparkles, title: 'Polished delivery', text: 'We care about the details: mobile layout, speed, content flow, and launch readiness.' },
            ].map((item) => (
              <article key={item.title} className="surface-card rounded-lg p-6">
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-[var(--surface-2)] text-[#ef4444]">
                  <item.icon className="h-5 w-5" />
                </span>
                <h3 className="text-main mt-6 text-xl font-black">{item.title}</h3>
                <p className="text-soft mt-3 leading-7">{item.text}</p>
              </article>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 text-center md:p-10">
            <p className="home-eyebrow mb-3 text-sm uppercase text-[#ef4444]">Next Project</p>
            <h2 className="text-main mx-auto max-w-3xl text-balance text-3xl font-bold tracking-tight md:text-5xl">Have an idea you want to turn into something useful?</h2>
            <p className="text-soft mx-auto mt-4 max-w-2xl leading-8">Tell us what you want to build. We will help you turn it into a clear, modern digital product.</p>
            <Link to="/contact" className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#ef4444] px-5 text-sm font-black text-white transition hover:opacity-90">
              Talk to us
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {activeVideo ? <ProjectVideoModal media={activeVideo} onClose={() => setActiveVideo(null)} /> : null}
    </main>
  )
}
