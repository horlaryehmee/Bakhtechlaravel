import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { ArrowRight, ExternalLink, Layers3, Play, SearchCheck, Sparkles, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { portfolio } from '@/data/site'
import { api, type Project } from '@/lib/api'
import { cn } from '@/lib/utils'

const BouncingBalls = lazy(() => import('@/components/ui/bouncing-balls').then((module) => ({ default: module.BouncingBalls })))
const RetroGrid = lazy(() => import('@/components/ui/retro-grid'))

type PortfolioItem = {
  category: string
  coverImage?: string
  description?: string
  id: number
  image: string
  metrics?: Record<string, string>
  services?: string[]
  summary: string
  title: string
  videoUrl?: string
  websiteUrl?: string
}

type VideoMedia = {
  title: string
  type: 'video' | 'youtube'
  url: string
}

const heroBallColors = ['rgba(48,55,63,0.28)', 'rgba(88,125,159,0.34)', 'rgba(214,224,237,0.58)', 'rgba(239,68,68,0.16)']

const projectStats = [
  { label: 'Digital projects delivered', value: '200+' },
  { label: 'Core build areas', value: '8+' },
  { label: 'Client feedback', value: '98%' },
]

function fromProject(project: Project): PortfolioItem {
  return {
    category: project.category,
    coverImage: project.coverImage,
    description: project.description,
    id: project.id,
    image: project.image,
    metrics: project.metrics,
    services: project.services,
    summary: project.summary,
    title: project.title,
    videoUrl: project.videoUrl,
    websiteUrl: project.websiteUrl,
  }
}

function fromFallback(item: (typeof portfolio)[number], index: number): PortfolioItem {
  return {
    category: item.category,
    id: index + 1,
    image: item.image,
    services: ['Design', 'Development', 'Launch'],
    summary: item.summary,
    title: item.title,
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

function getProjectVideoUrl(project: PortfolioItem) {
  const explicitVideo = project.videoUrl?.trim()
  if (explicitVideo) return explicitVideo

  const legacyMedia = project.image?.trim()
  return legacyMedia && (getYoutubeVideoId(legacyMedia) || isVideoUrl(legacyMedia)) ? legacyMedia : ''
}

function ProjectMedia({ project, onPlay }: { onPlay: (media: VideoMedia) => void; project: PortfolioItem }) {
  const videoUrl = getProjectVideoUrl(project)
  const youtubeThumbnailUrl = getYoutubeThumbnailUrl(videoUrl)
  const image = project.coverImage?.trim() || youtubeThumbnailUrl || project.image?.trim() || '/showcase/showcase-01.jpg'
  const youtubeEmbedUrl = getYoutubeEmbedUrl(videoUrl)
  const videoMedia: VideoMedia | null = youtubeEmbedUrl
    ? { title: project.title, type: 'youtube', url: videoUrl }
    : isVideoUrl(videoUrl)
      ? { title: project.title, type: 'video', url: videoUrl }
      : null

  return (
    <div className="relative h-full overflow-hidden rounded-lg border border-white/10 bg-[#0f141a]">
      <img src={image} alt={project.title} className="h-full w-full object-cover" loading="lazy" decoding="async" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_35%,rgba(0,0,0,0.48))]" />
      {videoMedia ? (
        <button type="button" onClick={() => onPlay(videoMedia)} className="absolute inset-0 z-10 grid place-items-center bg-black/10 text-white transition hover:bg-black/24" aria-label={`Play ${project.title}`}>
          <span className="grid h-14 w-14 place-items-center rounded-full border border-white/25 bg-white/15 backdrop-blur-md">
            <Play className="ml-1 h-6 w-6 fill-current" />
          </span>
        </button>
      ) : null}
    </div>
  )
}

function ProjectCard({ index, project, onPlay }: { index: number; onPlay: (media: VideoMedia) => void; project: PortfolioItem }) {
  const projectUrl = cleanProjectUrl(project.websiteUrl)
  const services = project.services?.length ? project.services.slice(0, 4) : ['Strategy', 'Design', 'Build']
  const metrics = Object.entries(project.metrics ?? {}).slice(0, 2)

  return (
    <article className={cn('grid gap-5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 shadow-[0_24px_70px_rgba(15,23,42,0.08)] md:grid-cols-[0.95fr_1.05fr] md:p-4', index % 2 === 1 && 'md:grid-cols-[1.05fr_0.95fr]')}>
      <div className={cn('h-72 md:h-full', index % 2 === 1 && 'md:order-2')}>
        <ProjectMedia project={project} onPlay={onPlay} />
      </div>

      <div className="flex flex-col p-3 md:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-[#ef4444]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#ef4444]">{project.category}</span>
          <span className="text-soft text-xs font-black uppercase tracking-[0.18em]">Case 0{index + 1}</span>
        </div>

        <h2 className="text-main mt-5 text-2xl font-black tracking-tight md:text-4xl">{project.title}</h2>
        <p className="text-soft mt-4 leading-7">{project.description || project.summary}</p>

        <div className="mt-6 flex flex-wrap gap-2">
          {services.map((service) => (
            <span key={service} className="rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-bold text-[var(--foreground)]">
              {service}
            </span>
          ))}
        </div>

        {metrics.length ? (
          <dl className="mt-7 grid gap-3 sm:grid-cols-2">
            {metrics.map(([label, value]) => (
              <div key={label} className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-4">
                <dt className="text-soft text-xs font-black uppercase tracking-[0.16em]">{label}</dt>
                <dd className="text-main mt-2 text-lg font-black">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <div className="mt-7 flex flex-wrap gap-3">
          {projectUrl ? (
            <a href={projectUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#ef4444] px-4 text-sm font-black text-white transition hover:opacity-90">
              Visit project
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
          <Link to="/contact" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-black text-[var(--foreground)] transition hover:bg-[var(--surface-2)]">
            Build something similar
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  )
}

function ProjectVideoModal({ media, onClose }: { media: VideoMedia; onClose: () => void }) {
  const embedUrl = media.type === 'youtube' ? getYoutubeEmbedUrl(media.url) : undefined

  return (
    <div className="fixed inset-0 z-[160] grid place-items-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={media.title}>
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-white/12 bg-black shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-white">
          <h2 className="text-sm font-black">{media.title}</h2>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/16" aria-label="Close video">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="aspect-video bg-black">
          {embedUrl ? (
            <iframe className="h-full w-full" src={embedUrl} title={media.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
          ) : (
            <video className="h-full w-full" src={media.url} controls autoPlay playsInline />
          )}
        </div>
      </div>
    </div>
  )
}

export function Portfolio() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [activeVideo, setActiveVideo] = useState<VideoMedia | null>(null)
  const [items, setItems] = useState<PortfolioItem[]>(() => portfolio.map(fromFallback))

  useEffect(() => {
    let cancelled = false

    async function loadProjects() {
      try {
        const result = await api.publicProjects()
        if (!cancelled && result.projects.length) {
          setItems(result.projects.map(fromProject))
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

  const categories = useMemo(() => ['All', ...Array.from(new Set(items.map((item) => item.category).filter(Boolean)))], [items])
  const filteredItems = activeCategory === 'All' ? items : items.filter((item) => item.category === activeCategory)

  return (
    <main className="projects-page home-page overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <section className="relative grid min-h-[92svh] place-items-center overflow-hidden bg-[radial-gradient(circle_at_50%_20%,rgba(88,125,159,0.16),transparent_34%),var(--background)] pt-24 md:pt-28">
        <Suspense fallback={null}>
          <RetroGrid className="pointer-events-none absolute inset-0 opacity-60" glowEffect={false} gridColor="#587d9f" />
          <BouncingBalls className="pointer-events-none absolute inset-0" colors={heroBallColors} interactive={false} maxRadius={2.2} minRadius={0.6} numBalls={110} speed={0.24} />
        </Suspense>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,var(--background)_78%)] opacity-70" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,var(--background)_0%,transparent_22%,transparent_70%,var(--background)_100%)]" />

        <div className="container-x relative z-10 py-20 text-center">
          <p className="mb-5 text-xs font-extrabold uppercase tracking-[0.28em] text-[#587d9f]">Projects by Bakhtech</p>
          <h1 className="projects-hero-title mx-auto max-w-5xl text-balance text-5xl font-black leading-[0.96] tracking-tight md:text-7xl">
            <span className="block font-medium italic md:text-6xl">Proof of what</span>
            we can build.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-black md:text-lg dark:text-[#d6e0ed]">
            A look at real websites, shops, booking flows, dashboards, and digital tools created to help businesses look sharper and work better online.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/contact" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#ef4444] px-5 text-sm font-black text-white transition hover:opacity-90">
              Start a project
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#projects" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)]/70 px-5 text-sm font-black text-[var(--foreground)] backdrop-blur-md transition hover:bg-[var(--surface)]">
              Browse work
            </a>
          </div>

          <div className="mx-auto mt-12 grid max-w-3xl gap-3 sm:grid-cols-3">
            {projectStats.map((item) => (
              <div key={item.label} className="surface-card rounded-2xl p-5 backdrop-blur-md">
                <p className="text-3xl font-black text-[var(--foreground)]">{item.value}</p>
                <p className="text-soft mt-2 text-xs font-semibold leading-5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="projects" className="relative overflow-hidden bg-[#151a20] py-16 text-white md:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(88,125,159,0.18),transparent_42%),linear-gradient(180deg,#151a20,#0f141a_92%)]" />
        <div className="container-x relative z-10">
          <div className="mb-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="home-eyebrow mb-3 text-sm uppercase text-[#ef4444]">Selected Work</p>
              <h2 className="text-balance text-3xl font-bold tracking-tight text-white md:text-5xl">Projects built around business goals.</h2>
            </div>
            <p className="leading-8 text-[#d6e0ed]/78 lg:justify-self-end lg:text-right">
              Each project starts with a practical question: what should this help the business do better?
            </p>
          </div>

          <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={cn('shrink-0 rounded-full border px-4 py-2 text-sm font-black transition', activeCategory === category ? 'border-[#ef4444] bg-[#ef4444] text-white' : 'border-white/12 bg-white/[0.06] text-[#d6e0ed] hover:bg-white/[0.1]')}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="grid gap-6">
            {filteredItems.length ? (
              filteredItems.map((item, index) => <ProjectCard key={`${item.id}-${item.title}`} index={index} project={item} onPlay={setActiveVideo} />)
            ) : (
              <div className="rounded-2xl border border-white/12 bg-white/[0.06] p-8 text-center text-[#d6e0ed]">Published projects will appear here.</div>
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
