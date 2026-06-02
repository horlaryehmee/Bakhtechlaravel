import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  CalendarDays,
  Eye,
  FileText,
  FolderKanban,
  Gauge,
  Images,
  LayoutDashboard,
  LogOut,
  Newspaper,
  Pencil,
  Plus,
  Save,
  SearchCheck,
  Settings,
  Trash2,
  Upload,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  api,
  clearAdminToken,
  getAdminToken,
  type Booking,
  type CmsData,
  type CmsPage,
  type CmsPost,
  type DashboardData,
  type MediaItem,
  type Project,
  type ProjectInput,
} from '@/lib/api'
import { cn } from '@/lib/utils'

type AdminSection = 'dashboard' | 'pages' | 'posts' | 'projects' | 'library' | 'seo' | 'bookings' | 'users' | 'settings'

const emptyProject: ProjectInput = {
  title: '',
  category: '',
  summary: '',
  description: '',
  image: '',
  coverImage: '',
  videoUrl: '',
  websiteUrl: '',
  services: '',
  status: 'published',
  isFeatured: true,
}

const emptyPost = {
  title: '',
  excerpt: '',
  content: '',
  category: '',
  image: '',
  status: 'draft',
}

const emptyBooking = {
  name: '',
  email: '',
  phone: '',
  service: '',
  message: '',
  status: 'open',
  scheduledAt: '',
}

const menuItems: Array<{ id: AdminSection; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pages', label: 'Pages', icon: FileText },
  { id: 'posts', label: 'Posts', icon: Newspaper },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'library', label: 'Library', icon: Images },
  { id: 'seo', label: 'SEO', icon: SearchCheck },
  { id: 'bookings', label: 'Bookings', icon: CalendarDays },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
]

function metricCards(data: DashboardData) {
  return [
    { label: 'Total Visits', value: data.totals.visits, icon: Eye },
    { label: 'Visits Today', value: data.totals.todayVisits, icon: BarChart3 },
    { label: 'Published Projects', value: data.totals.publishedProjects, icon: FolderKanban },
    { label: 'SEO Score', value: `${data.seo.score}%`, icon: SearchCheck },
    { label: 'Performance', value: `${data.performance.score}%`, icon: Gauge },
  ]
}

function toInput(project: Project): ProjectInput {
  return {
    title: project.title,
    category: project.category,
    summary: project.summary,
    description: project.description,
    image: project.image,
    coverImage: project.coverImage,
    videoUrl: project.videoUrl,
    websiteUrl: project.websiteUrl,
    services: project.services.join(', '),
    status: project.status,
    isFeatured: project.isFeatured,
  }
}

function isVideoMedia(url: string) {
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url)
}

function isYoutubeMedia(url: string) {
  return /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}/.test(url)
}

function ProjectMediaPreview({ src, title = '' }: { src: string; title?: string }) {
  if (isVideoMedia(src)) {
    return <video className="h-40 w-full rounded-xl object-cover" src={src} controls preload="metadata" />
  }

  if (isYoutubeMedia(src)) {
    return <div className="surface-muted grid h-40 place-items-center rounded-xl text-sm font-black text-soft">YouTube video</div>
  }

  return <img className="h-40 w-full rounded-xl object-cover" src={src || '/showcase/showcase-01.jpg'} alt={title} />
}

function PanelHeader({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="mb-6">
      <p className="text-sm font-black uppercase tracking-[0.18em] text-[#1261ff]">{eyebrow}</p>
      <h2 className="text-main mt-2 text-2xl font-black tracking-tight md:text-3xl">{title}</h2>
      <p className="text-soft mt-3 max-w-3xl leading-7">{text}</p>
    </div>
  )
}

const settingLabels: Record<string, string> = {
  activeHome: 'Active home page',
  contactEmail: 'Contact email',
  homePortfolioShowDescriptions: 'Show homepage portfolio descriptions',
  phone: 'Phone',
  siteName: 'Site name',
}

export function AdminDashboard() {
  const navigate = useNavigate()
  const token = getAdminToken()
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard')
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [cms, setCms] = useState<CmsData | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [editingPost, setEditingPost] = useState<CmsPost | null>(null)
  const [projectForm, setProjectForm] = useState<ProjectInput>(emptyProject)
  const [postForm, setPostForm] = useState(emptyPost)
  const [bookingForm, setBookingForm] = useState(emptyBooking)
  const [settingsForm, setSettingsForm] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const cards = useMemo(() => (dashboard ? metricCards(dashboard) : []), [dashboard])
  const activeMenu = menuItems.find((item) => item.id === activeSection) ?? menuItems[0]

  useEffect(() => {
    if (!token) return
    void loadAdminData()
  }, [token])

  if (!token) {
    return <Navigate to="/admin/login" replace />
  }

  async function loadAdminData() {
    setLoading(true)
    setError('')

    try {
      const [dashboardResult, projectResult, cmsResult] = await Promise.all([api.dashboard(), api.adminProjects(), api.cms()])
      setDashboard(dashboardResult)
      setProjects(projectResult.projects)
      setCms(cmsResult)
      setSettingsForm(cmsResult.settings)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard.')
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    clearAdminToken()
    navigate('/admin/login')
  }

  function notify(text: string) {
    setMessage(text)
    window.setTimeout(() => setMessage(''), 2600)
  }

  async function uploadFile(file: File, onDone?: (media: MediaItem) => void) {
    setError('')
    try {
      const result = await api.uploadMedia(file)
      setCms((current) => (current ? { ...current, media: [result.media, ...current.media] } : current))
      onDone?.(result.media)
      notify('File uploaded to library.')
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.')
    }
  }

  function updateProjectField<Key extends keyof ProjectInput>(field: Key, value: ProjectInput[Key]) {
    setProjectForm((current) => ({ ...current, [field]: value }))
  }

  function editProject(project: Project) {
    setEditingProject(project)
    setProjectForm(toInput(project))
    setActiveSection('projects')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetProjectForm() {
    setEditingProject(null)
    setProjectForm(emptyProject)
  }

  async function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const result = editingProject ? await api.updateProject(editingProject.id, projectForm) : await api.createProject(projectForm)
      setProjects((current) => {
        const exists = current.some((project) => project.id === result.project.id)
        return exists ? current.map((project) => (project.id === result.project.id ? result.project : project)) : [result.project, ...current]
      })
      resetProjectForm()
      notify(editingProject ? 'Project updated.' : 'Project created.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save project.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteProject(id: number) {
    if (!window.confirm('Delete this project?')) return
    await api.deleteProject(id)
    setProjects((current) => current.filter((project) => project.id !== id))
    notify('Project deleted.')
  }

  async function savePage(page: CmsPage) {
    const result = await api.updatePage(page.id, page)
    setCms((current) => (current ? { ...current, pages: current.pages.map((item) => (item.id === page.id ? result.page : item)) } : current))
    notify('Page saved.')
  }

  function updatePageDraft(id: number, patch: Partial<CmsPage>) {
    setCms((current) =>
      current ? { ...current, pages: current.pages.map((page) => (page.id === id ? { ...page, ...patch } : page)) } : current,
    )
  }

  function editPost(post: CmsPost) {
    setEditingPost(post)
    setPostForm({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      category: post.category,
      image: post.image,
      status: post.status,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function savePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      const result = editingPost ? await api.updatePost(editingPost.id, postForm) : await api.createPost(postForm)
      setCms((current) => {
        if (!current) return current
        const exists = current.posts.some((post) => post.id === result.post.id)
        return {
          ...current,
          posts: exists ? current.posts.map((post) => (post.id === result.post.id ? result.post : post)) : [result.post, ...current.posts],
        }
      })
      setEditingPost(null)
      setPostForm(emptyPost)
      notify(editingPost ? 'Post updated.' : 'Post created.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save post.')
    } finally {
      setSaving(false)
    }
  }

  async function deletePost(id: number) {
    if (!window.confirm('Delete this post?')) return
    await api.deletePost(id)
    setCms((current) => (current ? { ...current, posts: current.posts.filter((post) => post.id !== id) } : current))
    notify('Post deleted.')
  }

  async function saveBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = await api.createBooking(bookingForm)
    setCms((current) => (current ? { ...current, bookings: [result.booking, ...current.bookings] } : current))
    setBookingForm(emptyBooking)
    notify('Booking added.')
  }

  async function updateBookingStatus(booking: Booking, status: string) {
    const result = await api.updateBooking(booking.id, { ...booking, status })
    setCms((current) =>
      current ? { ...current, bookings: current.bookings.map((item) => (item.id === booking.id ? result.booking : item)) } : current,
    )
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = await api.updateSettings(settingsForm)
    setCms((current) => (current ? { ...current, settings: result.settings } : current))
    notify('Settings saved.')
  }

  async function updateProjectDisplaySetting(value: string) {
    const nextSettings = { ...settingsForm, homePortfolioShowDescriptions: value }
    setSettingsForm(nextSettings)
    const result = await api.updateSettings(nextSettings)
    setCms((current) => (current ? { ...current, settings: result.settings } : current))
    setSettingsForm(result.settings)
    notify('Project display setting saved.')
  }

  async function deleteMedia(media: MediaItem) {
    if (!window.confirm(`Delete ${media.originalName}?`)) return
    await api.deleteMedia(media.id)
    setCms((current) => (current ? { ...current, media: current.media.filter((item) => item.id !== media.id) } : current))
    notify('File deleted.')
  }

  function renderDashboard() {
    return (
      <div className="grid gap-6">
        <PanelHeader eyebrow="Overview" title="Business control center" text="Monitor visits, project activity, SEO health, and performance from one admin view." />
        {dashboard ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {cards.map((card) => (
              <article key={card.label} className="surface-card rounded-2xl p-5">
                <card.icon className="h-5 w-5 text-[#1261ff]" />
                <p className="text-soft mt-4 text-xs font-black uppercase tracking-[0.16em]">{card.label}</p>
                <p className="text-main mt-2 text-2xl font-black">{card.value}</p>
              </article>
            ))}
          </div>
        ) : null}
        {dashboard ? (
          <section className="surface-card rounded-2xl p-5 md:p-6">
            <h3 className="text-xl font-black">Top visited pages</h3>
            <div className="mt-5 grid gap-3">
              {dashboard.visits.topPages.map((page) => (
                <div key={page.path} className="surface-muted flex items-center justify-between gap-4 rounded-xl p-4">
                  <span className="font-bold">{page.path}</span>
                  <span className="text-soft shrink-0 font-black">{page.visits} visits</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    )
  }

  function renderPages() {
    return (
      <div>
        <PanelHeader eyebrow="Pages" title="Database-backed pages" text="Edit page content and SEO fields. These records are stored in SQLite and ready to connect to page rendering." />
        <div className="grid gap-4">
          {cms?.pages.map((page) => (
            <article key={page.id} className="surface-card rounded-2xl p-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold">
                  Title
                  <input className="theme-input min-h-11 rounded-xl px-4 outline-none" value={page.title} onChange={(event) => updatePageDraft(page.id, { title: event.target.value })} />
                </label>
                <label className="grid gap-2 text-sm font-bold">
                  Status
                  <select className="theme-input min-h-11 rounded-xl px-4 outline-none" value={page.status} onChange={(event) => updatePageDraft(page.id, { status: event.target.value })}>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-bold lg:col-span-2">
                  Content
                  <textarea className="theme-input min-h-24 rounded-xl px-4 py-3 outline-none" value={page.content} onChange={(event) => updatePageDraft(page.id, { content: event.target.value })} />
                </label>
                <label className="grid gap-2 text-sm font-bold">
                  SEO title
                  <input className="theme-input min-h-11 rounded-xl px-4 outline-none" value={page.seoTitle} onChange={(event) => updatePageDraft(page.id, { seoTitle: event.target.value })} />
                </label>
                <label className="grid gap-2 text-sm font-bold">
                  SEO description
                  <input className="theme-input min-h-11 rounded-xl px-4 outline-none" value={page.seoDescription} onChange={(event) => updatePageDraft(page.id, { seoDescription: event.target.value })} />
                </label>
              </div>
              <Button type="button" className="mt-5 rounded-xl" onClick={() => void savePage(page)}>
                <Save className="h-4 w-4" />
                Save Page
              </Button>
            </article>
          ))}
        </div>
      </div>
    )
  }

  function renderPosts() {
    return (
      <div>
        <PanelHeader eyebrow="Posts" title="Blog and content posts" text="Create, edit, publish, and delete content posts directly in the database." />
        <form className="surface-card mb-6 grid gap-4 rounded-2xl p-5" onSubmit={savePost}>
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-xl font-black">{editingPost ? 'Edit post' : 'New post'}</h3>
            {editingPost ? <Button type="button" variant="ghost" onClick={() => { setEditingPost(null); setPostForm(emptyPost) }}>New</Button> : null}
          </div>
          <input className="theme-input min-h-11 rounded-xl px-4 outline-none" placeholder="Post title" value={postForm.title} onChange={(event) => setPostForm((current) => ({ ...current, title: event.target.value }))} required />
          <input className="theme-input min-h-11 rounded-xl px-4 outline-none" placeholder="Category" value={postForm.category} onChange={(event) => setPostForm((current) => ({ ...current, category: event.target.value }))} />
          <textarea className="theme-input min-h-20 rounded-xl px-4 py-3 outline-none" placeholder="Excerpt" value={postForm.excerpt} onChange={(event) => setPostForm((current) => ({ ...current, excerpt: event.target.value }))} />
          <textarea className="theme-input min-h-32 rounded-xl px-4 py-3 outline-none" placeholder="Content" value={postForm.content} onChange={(event) => setPostForm((current) => ({ ...current, content: event.target.value }))} />
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <input className="theme-input min-h-11 rounded-xl px-4 outline-none" placeholder="Image URL from library" value={postForm.image} onChange={(event) => setPostForm((current) => ({ ...current, image: event.target.value }))} />
            <select className="theme-input min-h-11 rounded-xl px-4 outline-none" value={postForm.status} onChange={(event) => setPostForm((current) => ({ ...current, status: event.target.value }))}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
          <Button type="submit" className="rounded-xl" disabled={saving}>{editingPost ? 'Update Post' : 'Create Post'}</Button>
        </form>
        <div className="grid gap-3">
          {cms?.posts.map((post) => (
            <article key={post.id} className="surface-card grid gap-3 rounded-2xl p-4 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <h3 className="font-black">{post.title}</h3>
                <p className="text-soft mt-1 text-sm">{post.category || 'Uncategorized'} · {post.status}</p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => editPost(post)}><Pencil className="h-4 w-4" />Edit</Button>
                <Button type="button" variant="ghost" className="text-red-500" onClick={() => void deletePost(post.id)}><Trash2 className="h-4 w-4" />Delete</Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    )
  }

  function renderProjects() {
    return (
      <div>
        <PanelHeader eyebrow="Projects" title="Portfolio project manager" text="Add project images, optional video presentations, website links, and publish them to the frontend portfolio." />
        <section className="surface-card mb-6 rounded-2xl p-5 md:p-6">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h3 className="text-xl font-black">Homepage project descriptions</h3>
              <p className="text-soft mt-2 text-sm leading-6">
                Enable or disable project summaries on the homepage portfolio cards.
              </p>
            </div>
            <select
              className="theme-input min-h-11 rounded-xl px-4 outline-none"
              value={settingsForm.homePortfolioShowDescriptions ?? 'true'}
              onChange={(event) => void updateProjectDisplaySetting(event.target.value)}
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>
        </section>
        <div className="grid gap-8 xl:grid-cols-[0.92fr_1.08fr]">
          <section className="surface-card rounded-2xl p-5 md:p-6">
            <div className="mb-6 flex items-center justify-between gap-4">
              <h3 className="text-2xl font-black">{editingProject ? 'Edit project' : 'Add project'}</h3>
              {editingProject ? <Button type="button" variant="ghost" onClick={resetProjectForm}><Plus className="h-4 w-4" />New</Button> : null}
            </div>
            <form className="grid gap-4" onSubmit={saveProject}>
              <input className="theme-input min-h-11 rounded-xl px-4 outline-none" placeholder="Project title" value={projectForm.title} onChange={(event) => updateProjectField('title', event.target.value)} required />
              <div className="grid gap-4 md:grid-cols-2">
                <input className="theme-input min-h-11 rounded-xl px-4 outline-none" placeholder="Category" value={projectForm.category} onChange={(event) => updateProjectField('category', event.target.value)} required />
                <select className="theme-input min-h-11 rounded-xl px-4 outline-none" value={projectForm.status} onChange={(event) => updateProjectField('status', event.target.value as ProjectInput['status'])}>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
              <textarea className="theme-input min-h-24 rounded-xl px-4 py-3 outline-none" placeholder="Short summary" value={projectForm.summary} onChange={(event) => updateProjectField('summary', event.target.value)} required />
              <textarea className="theme-input min-h-28 rounded-xl px-4 py-3 outline-none" placeholder="Full description" value={projectForm.description} onChange={(event) => updateProjectField('description', event.target.value)} />
              <div className="grid gap-4">
                <label className="surface-muted flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--line)] p-5 text-sm font-black">
                  <Upload className="h-5 w-5" />
                  Upload project image
                  <input className="hidden" type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && void uploadFile(event.target.files[0], (media) => updateProjectField('image', media.url))} />
                </label>
                {projectForm.image ? <ProjectMediaPreview src={projectForm.image} title={projectForm.title} /> : null}
                <input className="theme-input min-h-11 rounded-xl px-4 outline-none" placeholder="Project image URL or uploaded path" value={projectForm.image} onChange={(event) => updateProjectField('image', event.target.value)} />
              </div>
              <div className="grid gap-4">
                <label className="surface-muted flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--line)] p-5 text-sm font-black">
                  <Upload className="h-5 w-5" />
                  Upload video presentation
                  <input className="hidden" type="file" accept="video/*" onChange={(event) => event.target.files?.[0] && void uploadFile(event.target.files[0], (media) => updateProjectField('videoUrl', media.url))} />
                </label>
                {projectForm.videoUrl ? <ProjectMediaPreview src={projectForm.videoUrl} title={projectForm.title} /> : null}
                <input className="theme-input min-h-11 rounded-xl px-4 outline-none" placeholder="Video presentation URL, uploaded path, or YouTube URL" value={projectForm.videoUrl} onChange={(event) => updateProjectField('videoUrl', event.target.value)} />
              </div>
              <div className="grid gap-4">
                <label className="surface-muted flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--line)] p-5 text-sm font-black">
                  <Upload className="h-5 w-5" />
                  Optional video cover image
                  <input className="hidden" type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && void uploadFile(event.target.files[0], (media) => updateProjectField('coverImage', media.url))} />
                </label>
                {projectForm.coverImage ? <img className="h-40 w-full rounded-xl object-cover" src={projectForm.coverImage} alt="" /> : null}
                <input className="theme-input min-h-11 rounded-xl px-4 outline-none" placeholder="Optional cover image URL for video/YouTube projects" value={projectForm.coverImage} onChange={(event) => updateProjectField('coverImage', event.target.value)} />
              </div>
              <input className="theme-input min-h-11 rounded-xl px-4 outline-none" placeholder="Website URL" value={projectForm.websiteUrl} onChange={(event) => updateProjectField('websiteUrl', event.target.value)} />
              <input className="theme-input min-h-11 rounded-xl px-4 outline-none" placeholder="Services: Website, SEO, UI/UX" value={projectForm.services} onChange={(event) => updateProjectField('services', event.target.value)} />
              <label className="flex items-center gap-3 text-sm font-bold">
                <input type="checkbox" checked={projectForm.isFeatured} onChange={(event) => updateProjectField('isFeatured', event.target.checked)} />
                Show as featured project
              </label>
              <Button className="rounded-xl" type="submit" disabled={saving}>{saving ? 'Saving...' : editingProject ? 'Update Project' : 'Add Project'}</Button>
            </form>
          </section>
          <section className="surface-card rounded-2xl p-5 md:p-6">
            <h3 className="mb-6 text-2xl font-black">Manage portfolio items</h3>
            <div className="grid gap-4">
              {projects.map((project) => (
                <article key={project.id} className="surface-muted grid gap-4 rounded-xl p-4 md:grid-cols-[8rem_1fr_auto] md:items-center">
                  <div className="h-28 w-full overflow-hidden rounded-lg md:h-20">
                    {isVideoMedia(project.image) ? (
                      <video className="h-full w-full object-cover" src={project.image} muted preload="metadata" />
                    ) : isYoutubeMedia(project.image) ? (
                      <div className="surface-card grid h-full place-items-center text-xs font-black text-soft">YouTube</div>
                    ) : (
                      <img className="h-full w-full object-cover" src={project.image || '/showcase/showcase-01.jpg'} alt="" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-lg font-black">{project.title}</h4>
                    <p className="text-soft mt-1 text-sm">{project.category} · {project.status}</p>
                    <p className="text-soft mt-2 text-sm leading-6">{project.summary}</p>
                  </div>
                  <div className="flex gap-2 md:flex-col">
                    <Button type="button" variant="ghost" className="min-h-10 px-3" onClick={() => editProject(project)}><Pencil className="h-4 w-4" />Edit</Button>
                    <Button type="button" variant="ghost" className="min-h-10 px-3 text-red-500" onClick={() => void deleteProject(project.id)}><Trash2 className="h-4 w-4" />Delete</Button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    )
  }

  function renderLibrary() {
    return (
      <div>
        <PanelHeader eyebrow="Library" title="Media library" text="Upload, preview, copy, select, and delete files used across the website." />
        <label className="surface-card mb-6 flex cursor-pointer items-center justify-center gap-3 rounded-2xl border-dashed p-8 text-sm font-black">
          <Upload className="h-5 w-5" />
          Upload file to library
          <input className="hidden" type="file" onChange={(event) => event.target.files?.[0] && void uploadFile(event.target.files[0])} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cms?.media.map((media) => (
            <article key={media.id} className="surface-card overflow-hidden rounded-2xl">
              {media.mimeType.startsWith('image/') ? <img className="h-44 w-full object-cover" src={media.url} alt={media.originalName} /> : <div className="grid h-44 place-items-center"><FileText className="h-10 w-10 text-soft" /></div>}
              <div className="grid gap-3 p-4">
                <p className="truncate text-sm font-black">{media.originalName}</p>
                <input className="theme-input min-h-10 rounded-lg px-3 text-xs outline-none" value={media.url} readOnly />
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" className="min-h-10 flex-1 px-3" onClick={() => navigator.clipboard.writeText(media.url)}>Copy</Button>
                  <Button type="button" variant="ghost" className="min-h-10 flex-1 px-3 text-red-500" onClick={() => void deleteMedia(media)}>Delete</Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    )
  }

  function renderSeo() {
    return (
      <div>
        <PanelHeader eyebrow="SEO" title="SEO controls" text="SEO fields are saved per page in the Pages section. This view summarizes current SEO health." />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="surface-card rounded-2xl p-5"><p className="text-soft text-sm font-bold">SEO Score</p><p className="mt-2 text-3xl font-black">{dashboard?.seo.score ?? 0}%</p></div>
          <div className="surface-card rounded-2xl p-5"><p className="text-soft text-sm font-bold">Indexed Pages</p><p className="mt-2 text-3xl font-black">{dashboard?.seo.indexedPages ?? 0}</p></div>
          <div className="surface-card rounded-2xl p-5"><p className="text-soft text-sm font-bold">Open Issues</p><p className="mt-2 text-3xl font-black">{dashboard?.seo.issues ?? 0}</p></div>
        </div>
      </div>
    )
  }

  function renderBookings() {
    return (
      <div>
        <PanelHeader eyebrow="Bookings" title="Booking manager" text="Add consultation requests and update their status from the dashboard." />
        <form className="surface-card mb-6 grid gap-4 rounded-2xl p-5 md:grid-cols-2" onSubmit={saveBooking}>
          {(['name', 'email', 'phone', 'service', 'scheduledAt'] as const).map((field) => (
            <input key={field} className="theme-input min-h-11 rounded-xl px-4 outline-none" placeholder={field} value={bookingForm[field]} onChange={(event) => setBookingForm((current) => ({ ...current, [field]: event.target.value }))} />
          ))}
          <textarea className="theme-input min-h-24 rounded-xl px-4 py-3 outline-none md:col-span-2" placeholder="Message" value={bookingForm.message} onChange={(event) => setBookingForm((current) => ({ ...current, message: event.target.value }))} />
          <Button type="submit" className="rounded-xl md:col-span-2">Add Booking</Button>
        </form>
        <div className="grid gap-4">
          {cms?.bookings.map((booking) => (
            <article key={booking.id} className="surface-card grid gap-3 rounded-2xl p-5 md:grid-cols-[1fr_auto] md:items-center">
              <div><h3 className="font-black">{booking.name}</h3><p className="text-soft mt-1 text-sm">{booking.email} · {booking.service}</p><p className="text-soft mt-2 text-sm">{booking.message}</p></div>
              <select className="theme-input min-h-10 rounded-xl px-3 outline-none" value={booking.status} onChange={(event) => void updateBookingStatus(booking, event.target.value)}>
                <option value="open">Open</option><option value="contacted">Contacted</option><option value="closed">Closed</option>
              </select>
            </article>
          ))}
        </div>
      </div>
    )
  }

  function renderUsers() {
    return (
      <div>
        <PanelHeader eyebrow="Users" title="Admin users" text="Admin accounts are loaded from the database. New roles can be added on top of this user table." />
        <div className="grid gap-4">
          {cms?.users.map((user) => (
            <article key={user.id} className="surface-card flex flex-col gap-2 rounded-2xl p-5 md:flex-row md:items-center md:justify-between">
              <div><h3 className="font-black">{user.name}</h3><p className="text-soft text-sm">{user.email}</p></div>
              <span className="w-fit rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black uppercase text-emerald-500">{user.role}</span>
            </article>
          ))}
        </div>
      </div>
    )
  }

  function renderSettings() {
    return (
      <div>
        <PanelHeader eyebrow="Settings" title="Website settings" text="These settings are saved in the database and can power frontend controls." />
        <form className="surface-card grid gap-4 rounded-2xl p-5 md:grid-cols-2" onSubmit={saveSettings}>
          {Object.entries(settingsForm).filter(([key]) => key !== 'homePortfolioShowDescriptions').map(([key, value]) => (
            <label key={key} className="grid gap-2 text-sm font-bold">
              {settingLabels[key] ?? key}
              <input className="theme-input min-h-11 rounded-xl px-4 outline-none" value={value} onChange={(event) => setSettingsForm((current) => ({ ...current, [key]: event.target.value }))} />
            </label>
          ))}
          <Button type="submit" className="rounded-xl md:col-span-2"><Save className="h-4 w-4" />Save Settings</Button>
        </form>
      </div>
    )
  }

  function renderActiveSection() {
    if (activeSection === 'pages') return renderPages()
    if (activeSection === 'posts') return renderPosts()
    if (activeSection === 'projects') return renderProjects()
    if (activeSection === 'library') return renderLibrary()
    if (activeSection === 'seo') return renderSeo()
    if (activeSection === 'bookings') return renderBookings()
    if (activeSection === 'users') return renderUsers()
    if (activeSection === 'settings') return renderSettings()
    return renderDashboard()
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="border-b border-[var(--line)] bg-[var(--surface)]/92 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex min-h-20 items-center justify-between gap-4 px-4 lg:min-h-0 lg:flex-col lg:items-start lg:p-5">
          <div><p className="text-xs font-black uppercase tracking-[0.22em] text-[#1261ff]">Bakhtech</p><h1 className="text-xl font-black">Admin Panel</h1></div>
          <Button type="button" variant="ghost" className="min-h-10 px-3 lg:hidden" onClick={logout}><LogOut className="h-4 w-4" /></Button>
        </div>
        <nav className="flex gap-2 overflow-x-auto px-4 pb-4 lg:grid lg:overflow-visible lg:px-5 lg:pb-5">
          {menuItems.map((item) => (
            <button key={item.id} type="button" onClick={() => setActiveSection(item.id)} className={cn('flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-4 text-sm font-black transition lg:w-full', activeSection === item.id ? 'bg-[var(--foreground)] text-[var(--background)]' : 'text-soft hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]')}>
              <item.icon className="h-4 w-4" />{item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto hidden p-5 lg:block"><Button type="button" variant="ghost" className="w-full justify-start rounded-xl" onClick={logout}><LogOut className="h-4 w-4" />Logout</Button></div>
      </aside>
      <section className="min-w-0">
        <header className="border-b border-[var(--line)] bg-[var(--background)]/80 px-4 py-5 backdrop-blur-xl md:px-8">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div><p className="text-soft text-sm font-bold">Current section</p><h2 className="text-3xl font-black">{activeMenu.label}</h2></div>
            <p className="text-soft text-sm">{projects.length} projects · {cms?.media.length ?? 0} library files</p>
          </div>
        </header>
        <div className="grid gap-5 p-4 md:p-8">
          {loading ? <p className="text-soft">Loading dashboard...</p> : null}
          {error ? <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-500">{error}</p> : null}
          {message ? <p className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-500">{message}</p> : null}
          {renderActiveSection()}
        </div>
      </section>
    </main>
  )
}
