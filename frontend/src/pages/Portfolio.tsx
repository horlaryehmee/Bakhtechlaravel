import { useEffect, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, Layers3, Play, SearchCheck, Sparkles } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { Boxes } from '@/components/ui/background-boxes'
import { AgencyCta } from '@/components/ui/agency-cta'
import { BorderBeam } from '@/components/ui/border-beam'
import { SafeImage } from '@/components/ui/safe-image'
import { VideoModal } from '@/components/media/video-modal'
import { api, type Project } from '@/lib/api'
import { getProjectPrimaryImage, getProjectVideoCoverImage, getProjectVideoMedia, getProjectVideoUrl, getYoutubeEmbedUrl, isVideoUrl, projectImageFallbackSrc, warmVideoMedia, type ProjectVideoMedia } from '@/lib/project-media'

function fromProject(project: Project): Project {
  return project
}

const PROJECTS_PER_PAGE = 15

function cleanProjectUrl(url?: string) {
  const value = url?.trim()
  if (!value || value === '#') return undefined
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

function ProjectMediaPreview({ project, onPlay }: { project: Project; onPlay: (media: ProjectVideoMedia) => void }) {
  const videoUrl = getProjectVideoUrl(project)
  const displayImage = getProjectPrimaryImage(project)
  const videoCoverImage = getProjectVideoCoverImage(project)
  const fallbackSrc = projectImageFallbackSrc(project)

  if (getYoutubeEmbedUrl(videoUrl)) {
    return (
      <>
        <SafeImage src={videoCoverImage} fallbackSrc={fallbackSrc} alt={project.title} className="h-full w-full object-cover" loading="lazy" decoding="async" />
        <button type="button" onPointerEnter={() => warmVideoMedia({ title: project.title, type: 'youtube', url: videoUrl })} onFocus={() => warmVideoMedia({ title: project.title, type: 'youtube', url: videoUrl })} onClick={() => onPlay({ title: project.title, type: 'youtube', url: videoUrl })} className="absolute inset-0 z-10 grid place-items-center bg-black/18 text-white transition hover:bg-black/28" aria-label={`Play ${project.title}`}>
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
        {videoCoverImage ? (
          <SafeImage src={videoCoverImage} fallbackSrc={fallbackSrc} alt={project.title} className="h-full w-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <video className="h-full w-full object-cover" muted preload="metadata" playsInline>
            <source src={videoUrl} />
          </video>
        )}
        <button type="button" onPointerEnter={() => warmVideoMedia({ title: project.title, type: 'video', url: videoUrl })} onFocus={() => warmVideoMedia({ title: project.title, type: 'video', url: videoUrl })} onClick={() => onPlay({ title: project.title, type: 'video', url: videoUrl })} className="absolute inset-0 z-10 grid place-items-center bg-black/18 text-white transition hover:bg-black/28" aria-label={`Play ${project.title}`}>
          <span className="grid h-12 w-12 place-items-center rounded-full border border-white/25 bg-white/18 backdrop-blur-md">
            <Play className="ml-0.5 h-5 w-5 fill-current" />
          </span>
        </button>
      </>
    )
  }

  return <SafeImage src={displayImage} fallbackSrc={fallbackSrc} alt={project.title} className="h-full w-full object-cover" loading="lazy" decoding="async" />
}

function ProjectCard({ project, showDescription, onPlayMedia }: { project: Project; showDescription: boolean; onPlayMedia: (media: ProjectVideoMedia) => void }) {
  const projectUrl = cleanProjectUrl(project.websiteUrl)
  const videoMedia = getProjectVideoMedia(project)

  return (
    <article className="surface-card relative flex h-full flex-col overflow-hidden rounded-2xl p-4 text-[var(--foreground)]">
      <BorderBeam size={220} duration={8} borderWidth={1.8} colorFrom="#111111" colorTo="#ffc400" delay={project.id % 4} />
      <div className="portfolio-visual-panel relative h-44 overflow-hidden rounded-xl sm:h-48">
        <ProjectMediaPreview project={project} onPlay={onPlayMedia} />
      </div>

      <div className="mt-6 flex flex-1 flex-col">
        <span className="mb-4 w-fit rounded-full bg-black/5 px-3.5 py-1 text-xs font-medium text-black/55">{project.category}</span>
        <h3 className="text-lg font-semibold leading-tight text-[var(--foreground)] sm:text-xl">{project.title}</h3>
        {showDescription && project.summary ? <p className="mt-3 flex-1 text-sm leading-6 text-[var(--foreground)]/70">{project.summary}</p> : null}

        <div className={showDescription && project.summary ? 'mt-5 flex flex-wrap items-center gap-2' : 'mt-4 flex flex-wrap items-center gap-2'}>
          {projectUrl ? (
            <a href={projectUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-black px-3 text-[0.7rem] font-medium text-white transition hover:bg-black/80 sm:text-xs">
              View live project
              <ArrowRight className="h-3 w-3" />
            </a>
          ) : null}
          {videoMedia ? (
            <button type="button" onPointerEnter={() => warmVideoMedia(videoMedia)} onFocus={() => warmVideoMedia(videoMedia)} onClick={() => onPlayMedia(videoMedia)} className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-[var(--line)] px-3 text-[0.7rem] font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-2)] sm:text-xs">
              Play presentation
              <Play className="h-3 w-3 fill-current" />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  )
}

export function Portfolio() {
  const [activeVideo, setActiveVideo] = useState<ProjectVideoMedia | null>(null)
  const [items, setItems] = useState<Project[]>([])
  const [loaded, setLoaded] = useState(false)
  const [showProjectSummaries, setShowProjectSummaries] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    let cancelled = false

    async function loadProjects() {
      try {
        const [projectResult, settingsResult] = await Promise.allSettled([api.publicProjects(), api.publicSettings()])
        if (cancelled) return

        setItems(projectResult.status === 'fulfilled' ? projectResult.value.projects.map(fromProject) : [])

        if (settingsResult.status === 'fulfilled') {
          setShowProjectSummaries(settingsResult.value.settings.homePortfolioShowDescriptions !== 'false')
        }
      } catch {
        if (!cancelled) setItems([])
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }

    void loadProjects()
    return () => {
      cancelled = true
    }
  }, [])

  if (!loaded) {
    return <main className="min-h-screen bg-[var(--background)]" />
  }

  if (!items.length) {
    return <Navigate to="/" replace />
  }

  const totalPages = Math.ceil(items.length / PROJECTS_PER_PAGE)
  const pageStart = (currentPage - 1) * PROJECTS_PER_PAGE
  const visibleItems = items.slice(pageStart, pageStart + PROJECTS_PER_PAGE)

  function goToPage(page: number) {
    const nextPage = Math.min(Math.max(page, 1), totalPages)
    if (nextPage === currentPage) return
    setCurrentPage(nextPage)
    window.requestAnimationFrame(() => {
      document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

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
            {visibleItems.map((item) => <ProjectCard key={`${item.id}-${item.title}`} project={item} showDescription={showProjectSummaries} onPlayMedia={setActiveVideo} />)}
          </div>

          {totalPages > 1 ? (
            <nav className="mt-12 flex flex-wrap items-center justify-center gap-2" aria-label="Portfolio pagination">
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="grid h-11 w-11 place-items-center rounded-lg border border-black/10 bg-white text-black transition hover:bg-black hover:text-white disabled:pointer-events-none disabled:opacity-35"
                aria-label="Previous portfolio page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => goToPage(page)}
                  className={page === currentPage
                    ? 'h-11 min-w-11 rounded-lg border border-black bg-black px-3 text-sm font-bold text-white'
                    : 'h-11 min-w-11 rounded-lg border border-black/10 bg-white px-3 text-sm font-bold text-black transition hover:bg-black hover:text-white'}
                  aria-label={`Portfolio page ${page}`}
                  aria-current={page === currentPage ? 'page' : undefined}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="grid h-11 w-11 place-items-center rounded-lg border border-black/10 bg-white text-black transition hover:bg-black hover:text-white disabled:pointer-events-none disabled:opacity-35"
                aria-label="Next portfolio page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </nav>
          ) : null}
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
            <AgencyCta to="/contact" label="Talk to us" icon={<ArrowRight className="h-4 w-4" />} className="mt-7 min-h-12" />
          </div>
        </div>
      </section>

      {activeVideo ? <VideoModal media={activeVideo} onClose={() => setActiveVideo(null)} /> : null}
    </main>
  )
}
