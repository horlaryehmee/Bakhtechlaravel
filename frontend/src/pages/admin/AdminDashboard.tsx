import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  CalendarDays,
  CreditCard,
  Eye,
  FileText,
  FolderKanban,
  Gauge,
  Images,
  LayoutDashboard,
  Link2,
  LogOut,
  MapPin,
  MessageSquareText,
  Newspaper,
  Pencil,
  Plus,
  Save,
  SearchCheck,
  Settings,
  Trash2,
  Upload,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  api,
  ApiError,
  clearAdminToken,
  getAdminToken,
  type BookingAvailabilityRule,
  type BookingCalendar,
  type BookingCmsBooking,
  type BookingCmsOverview,
  type CalendarSettings,
  type CmsData,
  type CmsPage,
  type CmsPost,
  type DashboardData,
  type MediaItem,
  type Project,
  type ProjectInput,
  type Review,
  type ReviewInput,
} from '@/lib/api'
import { cn } from '@/lib/utils'

type AdminSection = 'dashboard' | 'pages' | 'posts' | 'projects' | 'reviews' | 'library' | 'seo' | 'bookings' | 'users' | 'settings'
type BookingAdminSection = 'dashboard' | 'calendars' | 'bookings' | 'availability' | 'settings'
type CalendarSettingsSection = 'form' | 'locations' | 'payment' | 'email' | 'availability'
type LocationTab = 'google-meet' | 'zoom' | 'whatsapp-call' | 'in-person' | 'phone-call'
type BookingQuestion = {
  key: string
  label: string
  type: string
  enabled?: boolean
  required?: boolean
  system?: boolean
  hidden?: boolean
  helpMessage?: string
  options?: string[]
}
type QuestionModalState = { mode: 'add' | 'edit'; index: number | null; question: BookingQuestion }

const locationTabs: Array<{ id: LocationTab; label: string; type: string; placeholder: string; help: string }> = [
  { id: 'google-meet', label: 'Google Meet', type: 'google_meet', placeholder: 'Google Meet links are generated automatically after Google is connected', help: 'Enable this to let clients choose Google Meet. The system creates the link from your connected Google Calendar.' },
  { id: 'zoom', label: 'Zoom', type: 'zoom', placeholder: 'Zoom links are generated automatically after Zoom API is configured', help: 'Enable this to let clients choose Zoom. The system creates the link from your Zoom API settings.' },
  { id: 'whatsapp-call', label: 'WhatsApp Call', type: 'whatsapp', placeholder: 'Enter WhatsApp number, e.g. +2348012345678', help: 'Enable this for WhatsApp calls. Add the number clients should use.' },
  { id: 'in-person', label: 'In Person', type: 'in_person', placeholder: 'Enter full meeting address', help: 'Enable this for physical meetings. Add the address or visitor instructions.' },
  { id: 'phone-call', label: 'Phone Call', type: 'phone', placeholder: 'Enter phone number, e.g. +2348012345678', help: 'Enable this for phone calls. Add the phone number clients should call.' },
]

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

const emptyBookingCalendar: Partial<BookingCalendar> & {
  name: string
  slug: string
  description: string
  timezone: string
  color: string
  isActive: boolean
  settings: CalendarSettings
  resources: NonNullable<BookingCalendar['resources']>
} = {
  name: '',
  slug: '',
  description: '',
  timezone: 'Africa/Lagos',
  color: '#3b82f6',
  isActive: true,
  settings: {
    form: {
      fields: [
        { key: 'name', label: 'Your Name', type: 'name', enabled: true, required: true, system: true },
        { key: 'email', label: 'Your Email', type: 'email', enabled: true, required: true, system: true },
        { key: 'phone', label: 'WhatsApp Number', type: 'phone', enabled: true, required: true },
        { key: 'message', label: 'Additional Website Details', type: 'message', enabled: true, required: false, system: true },
        { key: 'location', label: 'Preferred Meeting Platform', type: 'location', enabled: true, required: true, system: true },
        { key: 'guests', label: 'Additional Guests', type: 'guests', enabled: false, required: false, system: true, hidden: true },
      ],
      customFields: [],
    },
    locations: [
      { id: 'google-meet', label: 'Google Meet', type: 'google_meet', details: '', enabled: true },
      { id: 'zoom', label: 'Zoom', type: 'zoom', details: '', enabled: true },
      { id: 'whatsapp-call', label: 'WhatsApp Call', type: 'whatsapp', details: '', enabled: true },
      { id: 'phone-call', label: 'Phone Call', type: 'phone', details: '', enabled: true },
      { id: 'in-person', label: 'In Person', type: 'in_person', details: '', enabled: false },
    ],
    payment: { enabled: false, pricingType: 'fixed', amount: 0, currency: 'NGN', gateway: 'paystack' },
    email: { 
      confirmationEnabled: true, 
      adminNotificationEnabled: true, 
      reminderMinutesBefore: 1440, 
      confirmationTemplate: `Hello {{name}},

Great news! Your booking has been confirmed.

📅 Booking Details:
- Date & Time: {{time}}
- Calendar: {{calendarName}}
- Location: {{location}}

If you need to reschedule or cancel, please contact us.

We look forward to meeting you!

Best regards,
The Team`, 
      adminTemplate: `Hello Admin,

You have a new booking!

📋 Booking Information:
- Name: {{name}}
- Email: {{email}}
- Phone: {{phone}}
- Date & Time: {{time}}
- Calendar: {{calendarName}}
- Message: {{message}}

Please review the booking.

Best regards,
Booking System`,
      reminderTemplate: `Hello {{name}},

Just a quick reminder about your upcoming booking!

📅 Reminder Details:
- Date & Time: {{time}}
- Calendar: {{calendarName}}

If you need to make any changes, please let us know in advance.

Best regards,
The Team`,
      cancellationTemplate: `Hello {{name}},

Your booking has been cancelled.

📅 Cancelled Booking:
- Date & Time: {{time}}
- Calendar: {{calendarName}}

If you'd like to reschedule, we'd be happy to help.

Best regards,
The Team`,
    },
    availability: { timezone: 'Africa/Lagos', workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], startTime: '09:00', endTime: '17:00', bufferMinutes: 15, blackoutDates: [] },
  },
  resources: [],
}

const defaultCalendarSettings = emptyBookingCalendar.settings as CalendarSettings

const emptyAvailabilityRule = {
  calendarId: 0,
  name: 'Business hours',
  workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  startTime: '09:00',
  endTime: '17:00',
  breaks: [{ start: '13:00', end: '14:00', label: 'Lunch' }],
  recurrence: 'weekly',
  isActive: true,
}

const emptyReview: ReviewInput = {
  provider: 'google',
  authorName: '',
  authorImage: '',
  rating: 5,
  content: '',
  externalUrl: '',
  reviewedAt: new Date().toISOString().slice(0, 10),
  isFeatured: true,
  isPublished: true,
}

const reviewProviders: Array<{ value: ReviewInput['provider']; label: string }> = [
  { value: 'google', label: 'Google' },
  { value: 'trustpilot', label: 'Trustpilot' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'website', label: 'Website' },
  { value: 'manual', label: 'Manual' },
]

const menuItems: Array<{ id: AdminSection; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pages', label: 'Pages', icon: FileText },
  { id: 'posts', label: 'Posts', icon: Newspaper },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'reviews', label: 'Reviews', icon: MessageSquareText },
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
    { label: 'Upcoming Bookings', value: data.totals.upcomingBookings, icon: CalendarDays },
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

function countChars(value: string) {
  return value.trim().length
}

function seoScore(page: CmsPage) {
  let score = 0
  const titleLength = countChars(page.seoTitle || page.title)
  const descriptionLength = countChars(page.seoDescription)

  if (titleLength >= 45 && titleLength <= 65) score += 20
  else if (titleLength > 0) score += 10
  if (descriptionLength >= 120 && descriptionLength <= 165) score += 20
  else if (descriptionLength > 0) score += 10
  if (page.focusKeyword) score += 15
  if (page.canonicalUrl || page.slug) score += 10
  if (page.ogTitle && page.ogDescription && page.ogImage) score += 15
  if (page.twitterTitle && page.twitterDescription) score += 10
  if (page.schemaType) score += 10

  return Math.min(score, 100)
}

function pagePath(page: CmsPage) {
  return page.slug === 'home' ? '/' : `/${page.slug}`
}

const settingLabels: Record<string, string> = {
  activeHome: 'Active home page',
  contactEmail: 'Contact email',
  facebookUrl: 'Facebook link',
  googleReviewUrl: 'Google review link',
  homePortfolioShowDescriptions: 'Show homepage portfolio descriptions',
  instagramUrl: 'Instagram link',
  linkedinUrl: 'LinkedIn link',
  phone: 'Phone',
  siteName: 'Site name',
  tiktokUrl: 'TikTok link',
  trustpilotReviewUrl: 'Trustpilot review link',
  twitterUrl: 'X / Twitter link',
  youtubeUrl: 'YouTube link',
}

function bookingHostLink(calendar?: BookingCalendar | null) {
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  return calendar ? `${origin}/book/${calendar.slug}` : `${origin}/booking`
}

export function AdminDashboard() {
  const navigate = useNavigate()
  const token = getAdminToken()
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard')
  const [activeBookingSection, setActiveBookingSection] = useState<BookingAdminSection>('dashboard')
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [cms, setCms] = useState<CmsData | null>(null)
  const [bookingOverview, setBookingOverview] = useState<BookingCmsOverview | null>(null)
  const [bookingCalendars, setBookingCalendars] = useState<BookingCalendar[]>([])
  const [bookingCmsBookings, setBookingCmsBookings] = useState<BookingCmsBooking[]>([])
  const [bookingAvailabilityRules, setBookingAvailabilityRules] = useState<BookingAvailabilityRule[]>([])
  const [bookingCmsSettings, setBookingCmsSettings] = useState<Record<string, string>>({})
  const [googleCalendars, setGoogleCalendars] = useState<Array<{ id: string; summary: string; primary: boolean; accessRole: string; selected: boolean }>>([])
  const [loadingGoogleCalendars, setLoadingGoogleCalendars] = useState(false)
  const [editingPageId, setEditingPageId] = useState<number | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [editingPost, setEditingPost] = useState<CmsPost | null>(null)
  const [editingReview, setEditingReview] = useState<Review | null>(null)
  const [projectForm, setProjectForm] = useState<ProjectInput>(emptyProject)
  const [postForm, setPostForm] = useState(emptyPost)
  const [reviewForm, setReviewForm] = useState<ReviewInput>(emptyReview)
  const [bookingCalendarForm, setBookingCalendarForm] = useState(emptyBookingCalendar)
  const [editingCalendar, setEditingCalendar] = useState<BookingCalendar | null>(null)
  const [calendarSettingsSection, setCalendarSettingsSection] = useState<CalendarSettingsSection>('form')
  const [activeLocationTab, setActiveLocationTab] = useState<LocationTab>('google-meet')
  const [questionModal, setQuestionModal] = useState<QuestionModalState | null>(null)
  const [availabilityForm, setAvailabilityForm] = useState(emptyAvailabilityRule)
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

  useEffect(() => {
    if (!token || activeSection !== 'bookings') return
    void loadBookingCmsData()
  }, [token, activeSection])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const googleStatus = params.get('booking_google')
    if (!googleStatus) return
    setActiveSection('bookings')
    setActiveBookingSection('settings')
    if (googleStatus === 'connected') {
      notify('Google account connected.')
      void loadGoogleCalendars()
    } else {
      setError('Google connection failed. Please try again.')
    }
    window.history.replaceState({}, '', window.location.pathname)
  }, [])

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
      setEditingPageId((current) => current ?? cmsResult.pages[0]?.id ?? null)
      setSettingsForm(cmsResult.settings)
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.status === 401) {
        clearAdminToken()
        navigate('/admin/login', { replace: true })
        return
      }

      setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard.')
    } finally {
      setLoading(false)
    }
  }

  async function loadBookingCmsData() {
    try {
      const [overviewResult, calendarsResult, bookingsResult, availabilityResult, settingsResult] = await Promise.all([
        api.bookingOverview(),
        api.bookingCalendars(),
        api.bookingCmsBookings(),
        api.bookingAvailabilityAdmin(),
        api.bookingSettings(),
      ])
      setBookingOverview(overviewResult)
      setBookingCalendars(calendarsResult.data)
      setBookingCmsBookings(bookingsResult.data)
      setBookingAvailabilityRules(availabilityResult.rules)
      setBookingCmsSettings(settingsResult.settings)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load booking CMS.')
    }
  }

  async function copyBookingLink(link: string) {
    await navigator.clipboard.writeText(link)
    notify('Booking link copied.')
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

  async function createPage() {
    const result = await api.createPage({
      title: 'New page',
      slug: 'new-page',
      status: 'draft',
      template: 'default',
      metaRobots: 'index,follow',
      schemaType: 'WebPage',
    })
    setCms((current) => (current ? { ...current, pages: [...current.pages, result.page] } : current))
    setEditingPageId(result.page.id)
    notify('Page created.')
  }

  async function deletePage(page: CmsPage) {
    if (!window.confirm(`Delete ${page.title}?`)) return
    await api.deletePage(page.id)
    setCms((current) => (current ? { ...current, pages: current.pages.filter((item) => item.id !== page.id) } : current))
    setEditingPageId((current) => (current === page.id ? null : current))
    notify('Page deleted.')
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

  function editReview(review: Review) {
    setEditingReview(review)
    setReviewForm({
      provider: review.provider,
      authorName: review.authorName,
      authorImage: review.authorImage,
      rating: review.rating,
      content: review.content,
      externalUrl: review.externalUrl,
      reviewedAt: review.reviewedAt || new Date().toISOString().slice(0, 10),
      isFeatured: review.isFeatured,
      isPublished: review.isPublished,
    })
    setActiveSection('reviews')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetReviewForm() {
    setEditingReview(null)
    setReviewForm({ ...emptyReview, reviewedAt: new Date().toISOString().slice(0, 10) })
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

  async function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const result = editingReview ? await api.updateReview(editingReview.id, reviewForm) : await api.createReview(reviewForm)
      setCms((current) => {
        if (!current) return current
        const exists = current.reviews.some((review) => review.id === result.review.id)
        return {
          ...current,
          reviews: exists ? current.reviews.map((review) => (review.id === result.review.id ? result.review : review)) : [result.review, ...current.reviews],
        }
      })
      resetReviewForm()
      notify(editingReview ? 'Review updated.' : 'Review added.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save review.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteReview(id: number) {
    if (!window.confirm('Delete this review?')) return
    await api.deleteReview(id)
    setCms((current) => (current ? { ...current, reviews: current.reviews.filter((review) => review.id !== id) } : current))
    notify('Review deleted.')
  }

  async function updateBookingCmsStatus(booking: BookingCmsBooking, status: string) {
    const result = await api.updateBookingCmsStatus(booking.id, status, booking.adminRemarks)
    setBookingCmsBookings((current) => current.map((item) => (item.id === booking.id ? result.booking : item)))
    notify('Booking status updated.')
  }

  async function saveBookingCalendar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...bookingCalendarForm,
        resources: bookingCalendarForm.resources.filter((resource) => resource.name.trim() !== '')
      }
      const result = await api.createBookingCalendar(payload)
      setBookingCalendars((current) => [result.calendar, ...current])
      setBookingCalendarForm(emptyBookingCalendar)
      notify('Calendar created.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save calendar.')
    } finally {
      setSaving(false)
    }
  }

  async function saveEditingCalendar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingCalendar) return
    setSaving(true)
    setError('')
    try {
      const result = await api.updateBookingCalendar(editingCalendar.id, editingCalendar)
      setBookingCalendars((current) => current.map((item) => (item.id === result.calendar.id ? result.calendar : item)))
      setEditingCalendar(result.calendar)
      notify('Calendar updated.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update calendar.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteBookingCalendar(calendar: BookingCalendar) {
    if (!window.confirm(`Delete ${calendar.name}? Existing bookings will remain in the database history.`)) return
    setSaving(true)
    setError('')
    try {
      await api.deleteBookingCalendar(calendar.id)
      setBookingCalendars((current) => current.filter((item) => item.id !== calendar.id))
      notify('Calendar deleted.')
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete calendar.')
    } finally {
      setSaving(false)
    }
  }

  function updateEditingSettings(section: keyof CalendarSettings, value: CalendarSettings[keyof CalendarSettings]) {
    setEditingCalendar((current) => current ? { ...current, settings: { ...(current.settings ?? defaultCalendarSettings), [section]: value } } : current)
  }

  function normalizeQuestions(formSettings: CalendarSettings['form']): BookingQuestion[] {
    return [...(formSettings.fields ?? []), ...(formSettings.customFields ?? [])].map((field) => ({
      ...field,
      enabled: field.enabled ?? true,
      required: field.required ?? false,
      options: field.options ?? [],
    }))
  }

  function splitQuestions(questions: BookingQuestion[]): CalendarSettings['form'] {
    return {
      fields: questions.filter((question) => question.system).map((question) => ({
        key: question.key,
        label: question.label,
        type: question.type,
        enabled: question.enabled ?? true,
        required: question.required ?? false,
        system: true,
        hidden: question.hidden,
        helpMessage: question.helpMessage,
        options: question.options ?? [],
      })),
      customFields: questions.filter((question) => !question.system).map((question) => ({
        key: question.key,
        label: question.label,
        type: question.type,
        enabled: question.enabled ?? true,
        required: question.required ?? false,
        helpMessage: question.helpMessage,
        options: question.options ?? [],
      })),
    }
  }

  function updateBookingQuestions(questions: BookingQuestion[]) {
    updateEditingSettings('form', splitQuestions(questions))
  }

  function emptyQuestion(): BookingQuestion {
    return {
      key: `question_${Date.now()}`,
      label: '',
      type: 'text',
      enabled: true,
      required: false,
      system: false,
      hidden: false,
      helpMessage: '',
      options: ['Option 1', 'Option 2'],
    }
  }

  function openQuestionModal(mode: 'add' | 'edit', question?: BookingQuestion, index: number | null = null) {
    setQuestionModal({ mode, index, question: question ? { ...question, options: [...(question.options ?? ['Option 1', 'Option 2'])] } : emptyQuestion() })
  }

  async function saveAvailabilityRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const result = await api.saveBookingAvailability({
        ...availabilityForm,
        calendarId: availabilityForm.calendarId || null,
      })
      setBookingAvailabilityRules((current) => [result.rule, ...current.filter((rule) => rule.id !== result.rule.id)])
      notify('Availability saved.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save availability.')
    } finally {
      setSaving(false)
    }
  }

  async function saveBookingCmsSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const result = await api.updateBookingSettings(bookingCmsSettings)
      setBookingCmsSettings(result.settings)
      notify('Booking settings saved.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save booking settings.')
    } finally {
      setSaving(false)
    }
  }

  async function connectGoogleCalendar() {
    setSaving(true)
    setError('')
    try {
      const saved = await api.updateBookingSettings(bookingCmsSettings)
      setBookingCmsSettings(saved.settings)
      const result = await api.googleOauthUrl()
      if (!result.google.configured || !result.google.authUrl) {
        setError(result.google.message ?? 'Google OAuth is not configured yet.')
        return
      }
      window.location.href = result.google.authUrl
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : 'Unable to start Google connection.')
    } finally {
      setSaving(false)
    }
  }

  async function loadGoogleCalendars() {
    setLoadingGoogleCalendars(true)
    setError('')
    try {
      const result = await api.googleCalendars()
      setGoogleCalendars(result.calendars)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load Google calendars.')
    } finally {
      setLoadingGoogleCalendars(false)
    }
  }

  async function selectGoogleCalendar(calendarId: string) {
    setSaving(true)
    setError('')
    try {
      const result = await api.selectGoogleCalendar(calendarId)
      setBookingCmsSettings(result.settings)
      setGoogleCalendars(result.calendars)
      notify('Google calendar selected.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to select Google calendar.')
    } finally {
      setSaving(false)
    }
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
    const pages = cms?.pages ?? []
    const selectedPage = pages.find((page) => page.id === editingPageId) ?? pages[0]

    return (
      <div>
        <PanelHeader eyebrow="Pages" title="Page manager" text="Manage pages with a WordPress-style list, detail editor, publishing controls, and full SEO metadata." />
        <div className="grid gap-6 xl:grid-cols-[24rem_1fr]">
          <section className="surface-card rounded-2xl p-4 md:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-xl font-black">All pages</h3>
              <Button type="button" variant="ghost" className="min-h-9 rounded-xl px-3 text-xs" onClick={() => void createPage()}>
                <Plus className="h-4 w-4" />
                New
              </Button>
            </div>
            <p className="text-soft mb-4 text-xs font-bold">{pages.length} total pages</p>
            <div className="grid gap-3">
              {pages.map((page) => {
                const score = seoScore(page)
                return (
                  <button
                    key={page.id}
                    type="button"
                    onClick={() => setEditingPageId(page.id)}
                    className={cn(
                      'surface-muted grid gap-3 rounded-xl border p-4 text-left transition hover:border-[#1261ff]/50',
                      selectedPage?.id === page.id ? 'border-[#1261ff] shadow-[0_18px_60px_rgba(18,97,255,0.12)]' : 'border-[var(--line)]',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="truncate font-black">{page.title}</h4>
                        <p className="text-soft mt-1 flex items-center gap-1 text-xs font-bold"><Link2 className="h-3.5 w-3.5" />{pagePath(page)}</p>
                      </div>
                      <span className={cn('rounded-full px-2.5 py-1 text-[0.68rem] font-black uppercase', page.status === 'published' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500')}>
                        {page.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-xs font-black">
                      <span className="text-soft">Updated {new Date(page.updatedAt).toLocaleDateString()}</span>
                      <span className={cn(score >= 80 ? 'text-emerald-500' : score >= 55 ? 'text-amber-500' : 'text-red-500')}>SEO {score}%</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {selectedPage ? (
            <section className="grid gap-5">
              <div className="surface-card rounded-2xl p-5 md:p-6">
                <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-soft text-sm font-bold">Editing</p>
                    <h3 className="text-2xl font-black">{selectedPage.title}</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="ghost" className="rounded-xl text-red-500" onClick={() => void deletePage(selectedPage)}>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                    <Button type="button" className="rounded-xl" onClick={() => void savePage(selectedPage)}>
                      <Save className="h-4 w-4" />
                      Save Page
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="grid gap-2 text-sm font-bold">
                    Page title
                    <input className="theme-input min-h-11 rounded-xl px-4 outline-none" value={selectedPage.title} onChange={(event) => updatePageDraft(selectedPage.id, { title: event.target.value })} />
                  </label>
                  <label className="grid gap-2 text-sm font-bold">
                    Slug
                    <input className="theme-input min-h-11 rounded-xl px-4 outline-none" value={selectedPage.slug} onChange={(event) => updatePageDraft(selectedPage.id, { slug: event.target.value })} />
                  </label>
                  <label className="grid gap-2 text-sm font-bold">
                    Status
                    <select className="theme-input min-h-11 rounded-xl px-4 outline-none" value={selectedPage.status} onChange={(event) => updatePageDraft(selectedPage.id, { status: event.target.value })}>
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-bold">
                    Template
                    <select className="theme-input min-h-11 rounded-xl px-4 outline-none" value={selectedPage.template} onChange={(event) => updatePageDraft(selectedPage.id, { template: event.target.value })}>
                      <option value="default">Default</option>
                      <option value="home">Home</option>
                      <option value="landing">Landing</option>
                      <option value="portfolio">Portfolio</option>
                      <option value="contact">Contact</option>
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-bold">
                    Parent page
                    <select className="theme-input min-h-11 rounded-xl px-4 outline-none" value={selectedPage.parentId ?? ''} onChange={(event) => updatePageDraft(selectedPage.id, { parentId: event.target.value ? Number(event.target.value) : null })}>
                      <option value="">No parent</option>
                      {pages.filter((page) => page.id !== selectedPage.id).map((page) => <option key={page.id} value={page.id}>{page.title}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-bold">
                    Order
                    <input className="theme-input min-h-11 rounded-xl px-4 outline-none" type="number" value={selectedPage.sortOrder} onChange={(event) => updatePageDraft(selectedPage.id, { sortOrder: Number(event.target.value) })} />
                  </label>
                  <label className="grid gap-2 text-sm font-bold lg:col-span-2">
                    Excerpt
                    <textarea className="theme-input min-h-20 rounded-xl px-4 py-3 outline-none" value={selectedPage.excerpt} onChange={(event) => updatePageDraft(selectedPage.id, { excerpt: event.target.value })} />
                  </label>
                  <label className="grid gap-2 text-sm font-bold lg:col-span-2">
                    Content
                    <textarea className="theme-input min-h-48 rounded-xl px-4 py-3 outline-none" value={selectedPage.content} onChange={(event) => updatePageDraft(selectedPage.id, { content: event.target.value })} />
                  </label>
                </div>
              </div>

              <div className="surface-card rounded-2xl p-5 md:p-6">
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.18em] text-[#1261ff]">SEO</p>
                    <h3 className="text-2xl font-black">Search appearance</h3>
                  </div>
                  <span className={cn('w-fit rounded-full px-4 py-2 text-sm font-black', seoScore(selectedPage) >= 80 ? 'bg-emerald-500/10 text-emerald-500' : seoScore(selectedPage) >= 55 ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500')}>
                    SEO score {seoScore(selectedPage)}%
                  </span>
                </div>

                <div className="mb-5 rounded-xl border border-[var(--line)] bg-[var(--background)] p-4">
                  <p className="truncate text-lg font-black text-[#1261ff]">{selectedPage.seoTitle || selectedPage.title}</p>
                  <p className="mt-1 text-sm text-emerald-500">bakhtech.com.ng{pagePath(selectedPage)}</p>
                  <p className="text-soft mt-2 line-clamp-2 text-sm leading-6">{selectedPage.seoDescription || selectedPage.excerpt || 'Add a meta description to control how this page appears in search results.'}</p>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="grid gap-2 text-sm font-bold">
                    SEO title <span className="text-soft font-bold">{countChars(selectedPage.seoTitle || selectedPage.title)}/60</span>
                    <input className="theme-input min-h-11 rounded-xl px-4 outline-none" value={selectedPage.seoTitle} onChange={(event) => updatePageDraft(selectedPage.id, { seoTitle: event.target.value })} />
                  </label>
                  <label className="grid gap-2 text-sm font-bold">
                    Focus keyword
                    <input className="theme-input min-h-11 rounded-xl px-4 outline-none" value={selectedPage.focusKeyword} onChange={(event) => updatePageDraft(selectedPage.id, { focusKeyword: event.target.value })} />
                  </label>
                  <label className="grid gap-2 text-sm font-bold lg:col-span-2">
                    SEO description <span className="text-soft font-bold">{countChars(selectedPage.seoDescription)}/160</span>
                    <textarea className="theme-input min-h-24 rounded-xl px-4 py-3 outline-none" value={selectedPage.seoDescription} onChange={(event) => updatePageDraft(selectedPage.id, { seoDescription: event.target.value })} />
                  </label>
                  <label className="grid gap-2 text-sm font-bold">
                    Canonical URL
                    <input className="theme-input min-h-11 rounded-xl px-4 outline-none" value={selectedPage.canonicalUrl} onChange={(event) => updatePageDraft(selectedPage.id, { canonicalUrl: event.target.value })} />
                  </label>
                  <label className="grid gap-2 text-sm font-bold">
                    Robots
                    <select className="theme-input min-h-11 rounded-xl px-4 outline-none" value={selectedPage.metaRobots} onChange={(event) => updatePageDraft(selectedPage.id, { metaRobots: event.target.value })}>
                      <option value="index,follow">Index, follow</option>
                      <option value="noindex,follow">No index, follow</option>
                      <option value="index,nofollow">Index, no follow</option>
                      <option value="noindex,nofollow">No index, no follow</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="surface-card rounded-2xl p-5 md:p-6">
                <h3 className="mb-5 text-2xl font-black">Social and schema</h3>
                <div className="grid gap-4 lg:grid-cols-2">
                  <input className="theme-input min-h-11 rounded-xl px-4 outline-none" placeholder="Open Graph title" value={selectedPage.ogTitle} onChange={(event) => updatePageDraft(selectedPage.id, { ogTitle: event.target.value })} />
                  <input className="theme-input min-h-11 rounded-xl px-4 outline-none" placeholder="Open Graph image URL" value={selectedPage.ogImage} onChange={(event) => updatePageDraft(selectedPage.id, { ogImage: event.target.value })} />
                  <textarea className="theme-input min-h-24 rounded-xl px-4 py-3 outline-none lg:col-span-2" placeholder="Open Graph description" value={selectedPage.ogDescription} onChange={(event) => updatePageDraft(selectedPage.id, { ogDescription: event.target.value })} />
                  <input className="theme-input min-h-11 rounded-xl px-4 outline-none" placeholder="Twitter title" value={selectedPage.twitterTitle} onChange={(event) => updatePageDraft(selectedPage.id, { twitterTitle: event.target.value })} />
                  <input className="theme-input min-h-11 rounded-xl px-4 outline-none" placeholder="Twitter image URL" value={selectedPage.twitterImage} onChange={(event) => updatePageDraft(selectedPage.id, { twitterImage: event.target.value })} />
                  <textarea className="theme-input min-h-24 rounded-xl px-4 py-3 outline-none lg:col-span-2" placeholder="Twitter description" value={selectedPage.twitterDescription} onChange={(event) => updatePageDraft(selectedPage.id, { twitterDescription: event.target.value })} />
                  <select className="theme-input min-h-11 rounded-xl px-4 outline-none" value={selectedPage.schemaType} onChange={(event) => updatePageDraft(selectedPage.id, { schemaType: event.target.value })}>
                    <option value="WebPage">WebPage</option>
                    <option value="AboutPage">AboutPage</option>
                    <option value="ContactPage">ContactPage</option>
                    <option value="CollectionPage">CollectionPage</option>
                    <option value="Service">Service</option>
                    <option value="Organization">Organization</option>
                  </select>
                  <label className="surface-muted flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--line)] p-3 text-sm font-black">
                    <Upload className="h-4 w-4" />
                    Upload social image
                    <input className="hidden" type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && void uploadFile(event.target.files[0], (media) => updatePageDraft(selectedPage.id, { ogImage: media.url, twitterImage: media.url }))} />
                  </label>
                  <textarea className="theme-input min-h-32 rounded-xl px-4 py-3 font-mono text-xs outline-none lg:col-span-2" placeholder='{"@context":"https://schema.org","@type":"WebPage"}' value={selectedPage.schemaJson} onChange={(event) => updatePageDraft(selectedPage.id, { schemaJson: event.target.value })} />
                </div>
              </div>
            </section>
          ) : (
            <section className="surface-card rounded-2xl p-6 text-soft">No pages found.</section>
          )}
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

  function renderReviews() {
    return (
      <div>
        <PanelHeader eyebrow="Reviews" title="Customer reviews" text="Add manual customer reviews and choose where each review came from." />
        <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
          <form className="surface-card grid gap-4 rounded-2xl p-5 md:p-6" onSubmit={saveReview}>
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-2xl font-black">{editingReview ? 'Edit review' : 'Add review'}</h3>
              {editingReview ? <Button type="button" variant="ghost" onClick={resetReviewForm}><Plus className="h-4 w-4" />New</Button> : null}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold">
                Platform
                <select className="theme-input min-h-11 rounded-xl px-4 outline-none" value={reviewForm.provider} onChange={(event) => setReviewForm((current) => ({ ...current, provider: event.target.value as ReviewInput['provider'] }))}>
                  {reviewProviders.map((provider) => <option key={provider.value} value={provider.value}>{provider.label}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold">
                Rating
                <select className="theme-input min-h-11 rounded-xl px-4 outline-none" value={reviewForm.rating} onChange={(event) => setReviewForm((current) => ({ ...current, rating: Number(event.target.value) }))}>
                  {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}
                </select>
              </label>
            </div>
            <input className="theme-input min-h-11 rounded-xl px-4 outline-none" placeholder="Reviewer name" value={reviewForm.authorName} onChange={(event) => setReviewForm((current) => ({ ...current, authorName: event.target.value }))} required />
            <input className="theme-input min-h-11 rounded-xl px-4 outline-none" placeholder="Reviewer image URL or uploaded path" value={reviewForm.authorImage} onChange={(event) => setReviewForm((current) => ({ ...current, authorImage: event.target.value }))} />
            <textarea className="theme-input min-h-32 rounded-xl px-4 py-3 outline-none" placeholder="Review text" value={reviewForm.content} onChange={(event) => setReviewForm((current) => ({ ...current, content: event.target.value }))} required />
            <div className="grid gap-4 md:grid-cols-2">
              <input className="theme-input min-h-11 rounded-xl px-4 outline-none" type="date" value={reviewForm.reviewedAt} onChange={(event) => setReviewForm((current) => ({ ...current, reviewedAt: event.target.value }))} />
              <input className="theme-input min-h-11 rounded-xl px-4 outline-none" placeholder="External review URL" value={reviewForm.externalUrl} onChange={(event) => setReviewForm((current) => ({ ...current, externalUrl: event.target.value }))} />
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-3 text-sm font-bold">
                <input type="checkbox" checked={reviewForm.isPublished} onChange={(event) => setReviewForm((current) => ({ ...current, isPublished: event.target.checked }))} />
                Published
              </label>
              <label className="flex items-center gap-3 text-sm font-bold">
                <input type="checkbox" checked={reviewForm.isFeatured} onChange={(event) => setReviewForm((current) => ({ ...current, isFeatured: event.target.checked }))} />
                Featured
              </label>
            </div>
            <Button type="submit" className="rounded-xl" disabled={saving}>{saving ? 'Saving...' : editingReview ? 'Update Review' : 'Add Review'}</Button>
          </form>
          <section className="surface-card rounded-2xl p-5 md:p-6">
            <h3 className="mb-6 text-2xl font-black">Manage reviews</h3>
            <div className="grid gap-4">
              {cms?.reviews.map((review) => (
                <article key={review.id} className="surface-muted grid gap-4 rounded-xl p-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-black">{review.authorName}</h4>
                      <span className="rounded-full bg-[#1261ff]/10 px-3 py-1 text-xs font-black uppercase text-[#1261ff]">{review.providerLabel}</span>
                      {!review.isPublished ? <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-black uppercase text-amber-500">Draft</span> : null}
                    </div>
                    <p className="mt-2 text-sm text-amber-500">{'★'.repeat(review.rating)}<span className="text-soft">{'★'.repeat(5 - review.rating)}</span></p>
                    <p className="text-soft mt-2 line-clamp-2 text-sm leading-6">{review.content}</p>
                  </div>
                  <div className="flex gap-2 md:flex-col">
                    <Button type="button" variant="ghost" className="min-h-10 px-3" onClick={() => editReview(review)}><Pencil className="h-4 w-4" />Edit</Button>
                    <Button type="button" variant="ghost" className="min-h-10 px-3 text-red-500" onClick={() => void deleteReview(review.id)}><Trash2 className="h-4 w-4" />Delete</Button>
                  </div>
                </article>
              ))}
              {cms?.reviews.length === 0 ? <p className="text-soft">No reviews yet.</p> : null}
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

  function renderBookingCmsDashboard() {
    const totals = bookingOverview?.totals
    const cards = [
      { label: 'Today', value: totals?.today ?? 0, tone: 'bg-[#1261ff]/10 text-[#1261ff]' },
      { label: 'This Week', value: totals?.week ?? 0, tone: 'bg-cyan-500/10 text-cyan-600' },
      { label: 'This Month', value: totals?.month ?? 0, tone: 'bg-violet-500/10 text-violet-600' },
      { label: 'Upcoming', value: totals?.upcoming ?? 0, tone: 'bg-amber-500/10 text-amber-600' },
      { label: 'Completed', value: totals?.completed ?? 0, tone: 'bg-emerald-500/10 text-emerald-600' },
      { label: 'Cancelled', value: totals?.cancelled ?? 0, tone: 'bg-red-500/10 text-red-600' },
    ]

    return (
      <div className="grid gap-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {cards.map((card) => (
            <article key={card.label} className="surface-card rounded-xl p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <div className={cn('mb-4 grid h-10 w-10 place-items-center rounded-lg', card.tone)}>
                <CalendarDays className="h-5 w-5" />
              </div>
              <p className="text-soft text-xs font-black uppercase tracking-[0.14em]">{card.label}</p>
              <p className="mt-1 text-3xl font-black">{card.value}</p>
            </article>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <article className="surface-card rounded-xl p-5">
            <Wallet className="h-5 w-5 text-emerald-500" />
            <p className="text-soft mt-4 text-xs font-black uppercase tracking-[0.14em]">Revenue this month</p>
            <p className="mt-1 text-3xl font-black">{bookingOverview?.revenue.currency ?? 'NGN'} {bookingOverview?.revenue.month ?? 0}</p>
          </article>
          <article className="surface-card rounded-xl p-5">
            <CreditCard className="h-5 w-5 text-[#1261ff]" />
            <p className="text-soft mt-4 text-xs font-black uppercase tracking-[0.14em]">Payment provider</p>
            <p className="mt-1 text-3xl font-black">{bookingCmsSettings.payment_provider === 'paystack' ? 'Paystack' : 'None'}</p>
          </article>
        </div>
        <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
          <section className="surface-card rounded-xl p-5 md:p-6">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-xl font-black">Next 7 days</h3>
              <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-black text-soft">Weekly snapshot</span>
            </div>
            <div className="mt-4 grid gap-3">
              {(bookingOverview?.calendarSnapshot.bookings ?? []).slice(0, 8).map((booking) => (
                <div key={booking.id} className="surface-muted rounded-lg p-4">
                  <p className="font-black">{booking.customer.name}</p>
                  <p className="text-soft mt-1 text-sm">{booking.serviceType} - {booking.startsAt}</p>
                </div>
              ))}
              {(bookingOverview?.calendarSnapshot.bookings ?? []).length === 0 ? <p className="text-soft">No upcoming bookings in this view.</p> : null}
            </div>
          </section>
          <section className="surface-card rounded-xl p-5 md:p-6">
            <h3 className="text-xl font-black">Recent activity</h3>
            <div className="mt-4 grid gap-3">
              {(bookingOverview?.recentActivity ?? []).slice(0, 8).map((activity) => (
                <div key={activity.id} className="border-b border-[var(--line)] pb-3 last:border-b-0">
                  <p className="font-black">{activity.action}</p>
                  <p className="text-soft text-sm">{activity.actorName || 'System'} - {activity.createdAt}</p>
                </div>
              ))}
              {(bookingOverview?.recentActivity ?? []).length === 0 ? <p className="text-soft">No activity yet.</p> : null}
            </div>
          </section>
        </div>
      </div>
    )
  }

  function renderBookingCalendars() {
    if (editingCalendar) {
      return renderCalendarSettingsPanel()
    }

    return (
      <div className="grid gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-3xl font-black">Booking Calendars</h3>
            <p className="text-soft mt-2 max-w-2xl leading-7">Each calendar is an independent booking product with its own form, payment, email, availability, and public booking page.</p>
          </div>
          <a href="#create-booking-calendar" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--foreground)] px-5 text-sm font-black text-[var(--background)]">
            <Plus className="h-4 w-4" />
            Create New Calendar
          </a>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {bookingCalendars.map((calendar) => (
            <article key={calendar.id} className="surface-card grid gap-4 rounded-2xl p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="h-4 w-4 rounded-full shadow-sm" style={{ backgroundColor: calendar.color || '#3b82f6' }} />
                    <h4 className="truncate text-lg font-black">{calendar.name}</h4>
                  </div>
                  <p className="text-soft mt-2 line-clamp-2 text-sm leading-6">{calendar.description || 'No description added yet.'}</p>
                </div>
                <span className={cn('shrink-0 rounded-full px-3 py-1 text-xs font-black', calendar.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-gray-500/10 text-gray-500')}>
                  {calendar.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="grid gap-3 rounded-xl bg-[var(--surface-2)] p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-soft">Total Bookings</span>
                  <strong className="text-lg">{calendar.bookingCount ?? 0}</strong>
                </div>
                <button type="button" className="truncate text-left font-bold text-[#3b82f6] hover:text-[#1d4ed8] transition" onClick={() => void copyBookingLink(bookingHostLink(calendar))}>
                  {calendar.publicUrl ?? `/book/${calendar.slug}`}
                </button>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button type="button" variant="ghost" className="rounded-xl border border-[var(--line)]" onClick={() => setEditingCalendar(calendar)}><Pencil className="h-4 w-4" />Edit</Button>
                <Button type="button" variant="ghost" className="rounded-xl border border-[var(--line)]" onClick={() => window.open(bookingHostLink(calendar), '_blank')}><Eye className="h-4 w-4" />View</Button>
                <Button type="button" variant="ghost" className="rounded-xl border border-[var(--line)]" onClick={() => { setCalendarSettingsSection('form'); setEditingCalendar(calendar) }}><Settings className="h-4 w-4" />Settings</Button>
                <Button type="button" variant="ghost" className="rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/5" onClick={() => void deleteBookingCalendar(calendar)}><Trash2 className="h-4 w-4" />Delete</Button>
                <Button type="button" variant="ghost" className="col-span-2 rounded-xl border border-[var(--line)]" onClick={() => void copyBookingLink(bookingHostLink(calendar))}><Link2 className="h-4 w-4" />Copy public link</Button>
              </div>
            </article>
          ))}
          {bookingCalendars.length === 0 ? (
            <article className="surface-card rounded-2xl border-dashed p-8 text-center md:col-span-2 xl:col-span-3">
              <h4 className="text-xl font-black">No calendars yet.</h4>
              <p className="text-soft mt-2">Create your first booking calendar to generate a public booking page.</p>
            </article>
          ) : null}
        </section>

        <details id="create-booking-calendar" className="surface-card rounded-2xl p-5" open={bookingCalendars.length === 0}>
          <summary className="cursor-pointer text-lg font-black">Create New Calendar</summary>
          <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={saveBookingCalendar}>
            <input className="theme-input min-h-11 rounded-xl px-4 outline-none" placeholder="Calendar name" value={bookingCalendarForm.name} onChange={(event) => setBookingCalendarForm((current) => ({ ...current, name: event.target.value }))} required />
            <input className="theme-input min-h-11 rounded-xl px-4 outline-none" placeholder="Timezone" value={bookingCalendarForm.timezone} onChange={(event) => setBookingCalendarForm((current) => ({ ...current, timezone: event.target.value }))} />
            <select className="theme-input min-h-11 rounded-xl px-4 outline-none" value={bookingCalendarForm.isActive ? 'active' : 'inactive'} onChange={(event) => setBookingCalendarForm((current) => ({ ...current, isActive: event.target.value === 'active' }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <input className="theme-input min-h-11 rounded-xl px-4 outline-none" placeholder="Color" value={bookingCalendarForm.color} onChange={(event) => setBookingCalendarForm((current) => ({ ...current, color: event.target.value }))} />
            <textarea className="theme-input min-h-24 rounded-xl px-4 py-3 outline-none md:col-span-2" placeholder="Description" value={bookingCalendarForm.description} onChange={(event) => setBookingCalendarForm((current) => ({ ...current, description: event.target.value }))} />
            <Button type="submit" className="rounded-xl md:col-span-2" disabled={saving}>{saving ? 'Saving...' : 'Create Calendar'}</Button>
          </form>
        </details>
      </div>
    )
  }

  function renderBookingQuestionsBuilder(formSettings: CalendarSettings['form']) {
    const questions = normalizeQuestions(formSettings)
    const questionTypes = [
      { value: 'text', label: 'Text' },
      { value: 'textarea', label: 'Text Area' },
      { value: 'dropdown', label: 'Dropdown' },
      { value: 'checkbox', label: 'Checkbox' },
      { value: 'email', label: 'Email' },
      { value: 'phone', label: 'Phone' },
      { value: 'number', label: 'Number' },
      { value: 'date', label: 'Date' },
      { value: 'location', label: 'Location' },
      { value: 'message', label: 'Message' },
      { value: 'guests', label: 'Guests' },
      { value: 'name', label: 'Name' },
    ]

    const moveQuestion = (index: number, direction: -1 | 1) => {
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= questions.length) return
      const next = [...questions]
      const [item] = next.splice(index, 1)
      next.splice(nextIndex, 0, item)
      updateBookingQuestions(next)
    }

    const toggleQuestion = (index: number) => {
      updateBookingQuestions(questions.map((question, itemIndex) => itemIndex === index ? { ...question, enabled: !(question.enabled ?? true) } : question))
    }

    const deleteQuestion = (index: number) => {
      updateBookingQuestions(questions.filter((_, itemIndex) => itemIndex !== index))
    }

    const saveQuestionModal = () => {
      if (!questionModal) return
      const cleaned: BookingQuestion = {
        ...questionModal.question,
        key: questionModal.question.key || `question_${Date.now()}`,
        label: questionModal.question.label.trim(),
        options: questionModal.question.type === 'dropdown' ? (questionModal.question.options ?? []).filter((option) => option.trim() !== '') : [],
      }
      if (!cleaned.label) return
      const next = questionModal.mode === 'edit' && questionModal.index !== null
        ? questions.map((question, index) => index === questionModal.index ? cleaned : question)
        : [...questions, cleaned]
      updateBookingQuestions(next)
      setQuestionModal(null)
    }

    return (
      <div className="grid gap-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h4 className="text-xl font-black">Booking Questions</h4>
            <p className="text-soft mt-1 text-sm">Customize the questions asked on the booking page.</p>
          </div>
          <Button type="button" className="w-fit rounded-xl" onClick={() => openQuestionModal('add')}><Plus className="h-4 w-4" />Add Question</Button>
        </div>

        <div className="overflow-hidden rounded-xl border border-[var(--line)]">
          {questions.map((question, index) => {
            const enabled = question.enabled ?? true
            return (
              <div key={question.key} className={cn('grid gap-4 border-b border-[var(--line)] p-4 last:border-b-0 md:grid-cols-[auto_1fr_auto] md:items-center', !enabled && 'opacity-55')}>
                <div className="flex md:flex-col">
                  <button type="button" className="grid h-6 w-6 place-items-center rounded border border-[var(--line)] text-xs text-soft disabled:opacity-30" disabled={index === 0} onClick={() => moveQuestion(index, -1)}>↑</button>
                  <button type="button" className="grid h-6 w-6 place-items-center rounded border border-[var(--line)] text-xs text-soft disabled:opacity-30" disabled={index === questions.length - 1} onClick={() => moveQuestion(index, 1)}>↓</button>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h5 className="font-black text-[var(--foreground)]">{question.label}</h5>
                    {question.required ? <span className="rounded bg-[var(--surface-2)] px-2 py-0.5 text-[0.68rem] font-bold text-soft">Required</span> : null}
                    {question.system ? <span className="rounded bg-[var(--surface-2)] px-2 py-0.5 text-[0.68rem] font-bold text-soft">System</span> : null}
                    {question.hidden ? <span className="rounded bg-[var(--surface-2)] px-2 py-0.5 text-[0.68rem] font-bold text-soft">Hidden</span> : null}
                  </div>
                  <p className="text-soft mt-2 text-sm">{question.type}</p>
                  {question.helpMessage ? <p className="text-soft mt-1 text-xs">{question.helpMessage}</p> : null}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {!question.system || question.key !== 'name' && question.key !== 'email' ? (
                    <button type="button" onClick={() => toggleQuestion(index)} className={cn('relative h-6 w-11 rounded-full transition', enabled ? 'bg-[#3267e3]' : 'bg-[var(--surface-2)]')}>
                      <span className={cn('absolute top-1 h-4 w-4 rounded-full bg-white transition', enabled ? 'left-6' : 'left-1')} />
                    </button>
                  ) : null}
                  <Button type="button" variant="ghost" className="rounded-lg border border-[var(--line)] px-4" onClick={() => openQuestionModal('edit', question, index)}>Edit</Button>
                  {!question.system ? <Button type="button" variant="ghost" className="rounded-lg bg-red-500 text-white hover:bg-red-600" onClick={() => deleteQuestion(index)}><Trash2 className="h-4 w-4" /></Button> : null}
                </div>
              </div>
            )
          })}
        </div>

        {questionModal ? (
          <div className="fixed inset-0 z-[200] grid place-items-center bg-black/55 px-4 py-8" role="dialog" aria-modal="true">
            <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-lg bg-white p-5 text-[#0f172a] shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#d9e1ea] pb-4">
                <h3 className="text-xl font-black">{questionModal.mode === 'edit' ? 'Edit Question' : 'Add Question'}</h3>
                <button type="button" className="grid h-8 w-8 place-items-center rounded-full hover:bg-slate-100" onClick={() => setQuestionModal(null)}><X className="h-4 w-4" /></button>
              </div>
              <div className="mt-5 grid gap-4">
                <label className="grid gap-2 text-sm font-bold text-slate-600">Field Type<select className="min-h-12 rounded-lg border border-[#d9e1ea] bg-white px-4 outline-none" value={questionModal.question.type} disabled={questionModal.question.system} onChange={(event) => setQuestionModal((current) => current ? { ...current, question: { ...current.question, type: event.target.value } } : current)}>{questionTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
                <label className="grid gap-2 text-sm font-bold text-slate-600">Label *<input className="min-h-12 rounded-lg border border-[#d9e1ea] px-4 outline-none" placeholder="Label" value={questionModal.question.label} onChange={(event) => setQuestionModal((current) => current ? { ...current, question: { ...current.question, label: event.target.value } } : current)} /></label>
                {questionModal.question.type === 'dropdown' ? (
                  <div className="grid gap-2">
                    <span className="text-sm font-bold text-slate-600">Options *</span>
                    {(questionModal.question.options ?? []).map((option, optionIndex) => (
                      <input key={optionIndex} className="min-h-12 rounded-lg border border-[#d9e1ea] px-4 outline-none" value={option} onChange={(event) => setQuestionModal((current) => current ? { ...current, question: { ...current.question, options: (current.question.options ?? []).map((item, itemIndex) => itemIndex === optionIndex ? event.target.value : item) } } : current)} />
                    ))}
                    <button type="button" className="w-fit text-sm font-bold text-[#2563eb]" onClick={() => setQuestionModal((current) => current ? { ...current, question: { ...current.question, options: [...(current.question.options ?? []), `Option ${(current.question.options ?? []).length + 1}`] } } : current)}>+ Add new option</button>
                  </div>
                ) : null}
                <label className="grid gap-2 text-sm font-bold text-slate-600">Help Message<input className="min-h-12 rounded-lg border border-[#d9e1ea] px-4 outline-none" value={questionModal.question.helpMessage ?? ''} onChange={(event) => setQuestionModal((current) => current ? { ...current, question: { ...current.question, helpMessage: event.target.value } } : current)} /></label>
                <div className="grid gap-2">
                  <span className="text-sm font-bold text-slate-600">Required</span>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2"><input type="radio" checked={Boolean(questionModal.question.required)} onChange={() => setQuestionModal((current) => current ? { ...current, question: { ...current.question, required: true } } : current)} />Yes</label>
                    <label className="flex items-center gap-2"><input type="radio" checked={!questionModal.question.required} onChange={() => setQuestionModal((current) => current ? { ...current, question: { ...current.question, required: false } } : current)} />No</label>
                  </div>
                </div>
                <div className="flex justify-end gap-3 border-t border-[#d9e1ea] pt-4">
                  <Button type="button" variant="ghost" className="rounded-lg border border-[#d9e1ea]" onClick={() => setQuestionModal(null)}>Cancel</Button>
                  <Button type="button" className="rounded-lg bg-[#3267e3]" onClick={saveQuestionModal}>Save</Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  function renderCalendarSettingsPanel() {
    if (!editingCalendar) return null
    const settings = editingCalendar.settings ?? defaultCalendarSettings
    const formSettings = settings.form ?? defaultCalendarSettings.form
    const rawLocations = settings.locations ?? defaultCalendarSettings.locations ?? []
    const locations = locationTabs.map((tab) => {
      const existing = rawLocations.find((location) => location.id === tab.id || location.type === tab.type)
      return {
        id: tab.id,
        label: existing?.label ?? tab.label,
        type: tab.type,
        details: existing?.details ?? '',
        enabled: existing?.enabled ?? tab.id !== 'in-person',
      }
    })
    const activeLocationConfig = locationTabs.find((tab) => tab.id === activeLocationTab) ?? locationTabs[0]
    const activeLocation = locations.find((location) => location.id === activeLocationConfig.id) ?? locations[0]
    const updateLocation = (id: string, patch: Partial<(typeof locations)[number]>) => updateSettings('locations', locations.map((location) => location.id === id ? { ...location, ...patch } : location))
    const payment = settings.payment ?? defaultCalendarSettings.payment
    const email = settings.email ?? defaultCalendarSettings.email
    const availability = settings.availability ?? defaultCalendarSettings.availability
    const sections: Array<{ id: CalendarSettingsSection; label: string; icon: typeof CalendarDays }> = [
      { id: 'form', label: 'Form Builder', icon: FileText },
      { id: 'locations', label: 'Meeting Locations', icon: MapPin },
      { id: 'payment', label: 'Payment', icon: CreditCard },
      { id: 'email', label: 'Email', icon: MessageSquareText },
      { id: 'availability', label: 'Availability', icon: CalendarDays },
    ]
    const updateSettings = (section: keyof CalendarSettings, value: CalendarSettings[keyof CalendarSettings]) => updateEditingSettings(section, value)

    return (
      <div className="grid gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <button type="button" className="text-sm font-black text-soft" onClick={() => setEditingCalendar(null)}>Calendars</button>
            <h3 className="mt-2 text-3xl font-black">{editingCalendar.name}</h3>
            <button type="button" className="mt-2 block max-w-full truncate text-left text-sm font-bold text-[#2563eb]" onClick={() => void copyBookingLink(bookingHostLink(editingCalendar))}>{bookingHostLink(editingCalendar)}</button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" className="rounded-xl" onClick={() => window.open(bookingHostLink(editingCalendar), '_blank')}><Eye className="h-4 w-4" />View public page</Button>
            <Button type="button" variant="ghost" className="rounded-xl" onClick={() => setEditingCalendar(null)}>Back</Button>
          </div>
        </div>

        <form className="grid gap-6 xl:grid-cols-[18rem_1fr]" onSubmit={saveEditingCalendar}>
          <aside className="surface-card rounded-2xl p-3 xl:sticky xl:top-6 xl:h-fit">
            <nav className="grid gap-1">
              {sections.map((item) => (
                <button key={item.id} type="button" onClick={() => setCalendarSettingsSection(item.id)} className={cn('flex min-h-12 items-center gap-3 rounded-xl px-4 text-left text-sm font-black transition', calendarSettingsSection === item.id ? 'bg-[var(--foreground)] text-[var(--background)]' : 'text-soft hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]')}>
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          <section className="surface-card grid gap-6 rounded-2xl p-5 md:p-7">
            <div className="grid gap-4 rounded-xl border border-[var(--line)] p-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold">Calendar name<input className="theme-input min-h-11 rounded-xl px-4 outline-none" value={editingCalendar.name} onChange={(event) => setEditingCalendar((current) => current ? { ...current, name: event.target.value } : current)} required /></label>
              <label className="grid gap-2 text-sm font-bold">Status<select className="theme-input min-h-11 rounded-xl px-4 outline-none" value={editingCalendar.isActive ? 'active' : 'inactive'} onChange={(event) => setEditingCalendar((current) => current ? { ...current, isActive: event.target.value === 'active' } : current)}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
              <label className="grid gap-2 text-sm font-bold">Timezone<input className="theme-input min-h-11 rounded-xl px-4 outline-none" value={editingCalendar.timezone} onChange={(event) => setEditingCalendar((current) => current ? { ...current, timezone: event.target.value } : current)} /></label>
              <label className="grid gap-2 text-sm font-bold">Color<input className="theme-input min-h-11 rounded-xl px-4 outline-none" value={editingCalendar.color} onChange={(event) => setEditingCalendar((current) => current ? { ...current, color: event.target.value } : current)} /></label>
              <label className="grid gap-2 text-sm font-bold md:col-span-2">Description<textarea className="theme-input min-h-24 rounded-xl px-4 py-3 outline-none" value={editingCalendar.description} onChange={(event) => setEditingCalendar((current) => current ? { ...current, description: event.target.value } : current)} /></label>
            </div>

            {calendarSettingsSection === 'form' ? (
              renderBookingQuestionsBuilder(formSettings)
            ) : null}

            {calendarSettingsSection === 'locations' ? (
              <div className="grid gap-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h4 className="text-xl font-black">Meeting Locations</h4>
                    <p className="text-soft mt-1 text-sm">Enable the location options that should appear on the public booking form.</p>
                  </div>
                  <div className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-black text-soft">
                    {locations.filter((location) => location.enabled).length} active
                  </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-[15rem_1fr]">
                  <div className="grid gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/40 p-2">
                    {locationTabs.map((tab) => {
                      const location = locations.find((item) => item.id === tab.id)
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveLocationTab(tab.id)}
                          className={cn('flex min-h-12 items-center justify-between gap-3 rounded-lg px-3 text-left text-sm font-black transition', activeLocationTab === tab.id ? 'bg-[var(--surface)] shadow-sm' : 'text-soft hover:bg-[var(--surface)]')}
                        >
                          <span>{tab.label}</span>
                          <span className={cn('h-2.5 w-2.5 rounded-full', location?.enabled ? 'bg-emerald-500' : 'bg-gray-300')} />
                        </button>
                      )
                    })}
                  </div>

                  <div className="rounded-xl border border-[var(--line)] p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h5 className="text-lg font-black">{activeLocationConfig.label}</h5>
                        <p className="text-soft mt-1 text-sm leading-6">{activeLocationConfig.help}</p>
                      </div>
                      <button type="button" onClick={() => updateLocation(activeLocation.id, { enabled: !activeLocation.enabled })} className="flex items-center gap-3 rounded-full border border-[var(--line)] px-3 py-2 text-sm font-black">
                        <span>{activeLocation.enabled ? 'Active' : 'Inactive'}</span>
                        <span className={cn('relative h-6 w-11 rounded-full transition', activeLocation.enabled ? 'bg-[#3267e3]' : 'bg-[var(--surface-2)]')}>
                          <span className={cn('absolute top-1 h-4 w-4 rounded-full bg-white transition', activeLocation.enabled ? 'left-6' : 'left-1')} />
                        </span>
                      </button>
                    </div>

                    <div className={cn('mt-5 grid gap-4 md:grid-cols-2', !activeLocation.enabled && 'opacity-60')}>
                      <label className="grid gap-2 text-sm font-bold">
                        Display label
                        <input className="theme-input min-h-11 rounded-xl px-4 outline-none" value={activeLocation.label} onChange={(event) => updateLocation(activeLocation.id, { label: event.target.value })} />
                      </label>
                      <label className="grid gap-2 text-sm font-bold">
                        Type
                        <input className="theme-input min-h-11 rounded-xl px-4 outline-none" value={activeLocationConfig.type.replace('_', ' ')} disabled />
                      </label>
                      <label className="grid gap-2 text-sm font-bold md:col-span-2">
                        {activeLocationConfig.id === 'whatsapp-call' || activeLocationConfig.id === 'phone-call' ? 'Phone number' : activeLocationConfig.id === 'in-person' ? 'Address' : 'Meeting instruction'}
                        <input className="theme-input min-h-11 rounded-xl px-4 outline-none" placeholder={activeLocationConfig.placeholder} value={activeLocation.details ?? ''} onChange={(event) => updateLocation(activeLocation.id, { details: event.target.value })} />
                      </label>
                    </div>

                    <div className="mt-5 rounded-xl bg-[var(--surface-2)] p-4 text-sm text-soft">
                      {activeLocation.enabled ? `${activeLocation.label} will be shown on the public booking form.` : `${activeLocation.label} is hidden from the public booking form.`}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {calendarSettingsSection === 'payment' ? (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold">Payment<select className="theme-input min-h-11 rounded-xl px-4 outline-none" value={payment.enabled ? 'on' : 'off'} onChange={(event) => updateSettings('payment', { ...payment, enabled: event.target.value === 'on' })}><option value="off">OFF - free booking</option><option value="on">ON - collect payment</option></select></label>
                <label className="grid gap-2 text-sm font-bold">Pricing<select className="theme-input min-h-11 rounded-xl px-4 outline-none" value={payment.pricingType} onChange={(event) => updateSettings('payment', { ...payment, pricingType: event.target.value })}><option value="fixed">Fixed price</option><option value="variable">Variable price</option></select></label>
                <label className="grid gap-2 text-sm font-bold">Amount<input className="theme-input min-h-11 rounded-xl px-4 outline-none" type="number" min="0" value={payment.amount} onChange={(event) => updateSettings('payment', { ...payment, amount: Number(event.target.value) })} /></label>
                <label className="grid gap-2 text-sm font-bold">Currency<select className="theme-input min-h-11 rounded-xl px-4 outline-none" value={payment.currency} onChange={(event) => updateSettings('payment', { ...payment, currency: event.target.value })}><option value="NGN">NGN</option><option value="USD">USD</option><option value="GBP">GBP</option></select></label>
                <label className="grid gap-2 text-sm font-bold md:col-span-2">Gateway<select className="theme-input min-h-11 rounded-xl px-4 outline-none" value={payment.gateway} onChange={(event) => updateSettings('payment', { ...payment, gateway: event.target.value })}><option value="paystack">Paystack</option><option value="manual">Manual/offline</option></select></label>
              </div>
            ) : null}

            {calendarSettingsSection === 'email' ? (
              <div className="grid gap-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm font-bold">Confirmation email<select className="theme-input min-h-11 rounded-xl px-4 outline-none" value={email.confirmationEnabled ? 'on' : 'off'} onChange={(event) => updateSettings('email', { ...email, confirmationEnabled: event.target.value === 'on' })}><option value="on">ON</option><option value="off">OFF</option></select></label>
                  <label className="grid gap-2 text-sm font-bold">Admin notification<select className="theme-input min-h-11 rounded-xl px-4 outline-none" value={email.adminNotificationEnabled ? 'on' : 'off'} onChange={(event) => updateSettings('email', { ...email, adminNotificationEnabled: event.target.value === 'on' })}><option value="on">ON</option><option value="off">OFF</option></select></label>
                  <label className="grid gap-2 text-sm font-bold">Reminder timing<input className="theme-input min-h-11 rounded-xl px-4 outline-none" type="number" value={email.reminderMinutesBefore} onChange={(event) => updateSettings('email', { ...email, reminderMinutesBefore: Number(event.target.value) })} /></label>
                </div>
                
                <div className="grid gap-4">
                  <label className="grid gap-2 text-sm font-bold">Confirmation template<textarea className="theme-input min-h-32 rounded-xl px-4 py-3 outline-none" value={email.confirmationTemplate ?? ''} onChange={(event) => updateSettings('email', { ...email, confirmationTemplate: event.target.value })} /></label>
                  <label className="grid gap-2 text-sm font-bold">Admin notification template<textarea className="theme-input min-h-32 rounded-xl px-4 py-3 outline-none" value={email.adminTemplate ?? ''} onChange={(event) => updateSettings('email', { ...email, adminTemplate: event.target.value })} /></label>
                  <label className="grid gap-2 text-sm font-bold">Reminder template<textarea className="theme-input min-h-32 rounded-xl px-4 py-3 outline-none" value={email.reminderTemplate ?? ''} onChange={(event) => updateSettings('email', { ...email, reminderTemplate: event.target.value })} /></label>
                  <label className="grid gap-2 text-sm font-bold">Cancellation template<textarea className="theme-input min-h-32 rounded-xl px-4 py-3 outline-none" value={email.cancellationTemplate ?? ''} onChange={(event) => updateSettings('email', { ...email, cancellationTemplate: event.target.value })} /></label>
                </div>
              </div>
            ) : null}

            {calendarSettingsSection === 'availability' ? (
              <div className="grid gap-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm font-bold">Timezone<input className="theme-input min-h-11 rounded-xl px-4 outline-none" value={availability.timezone} onChange={(event) => updateSettings('availability', { ...availability, timezone: event.target.value })} /></label>
                  <label className="grid gap-2 text-sm font-bold">Buffer minutes<input className="theme-input min-h-11 rounded-xl px-4 outline-none" type="number" min="0" value={availability.bufferMinutes} onChange={(event) => updateSettings('availability', { ...availability, bufferMinutes: Number(event.target.value) })} /></label>
                </div>

                <section className="surface-card rounded-2xl p-5 md:p-6">
                  <h3 className="text-xl font-black mb-5">Weekly Hours</h3>
                  <div className="grid gap-4">
                    {[
                      { key: 'sunday', label: 'Sun' },
                      { key: 'monday', label: 'Mon' },
                      { key: 'tuesday', label: 'Tue' },
                      { key: 'wednesday', label: 'Wed' },
                      { key: 'thursday', label: 'Thu' },
                      { key: 'friday', label: 'Fri' },
                      { key: 'saturday', label: 'Sat' }
                    ].map((day) => {
                      const isEnabled = availability.workingDays.includes(day.key);
                      const timeOptions = [];
                      for (let h = 0; h < 24; h++) {
                        for (let m = 0; m < 60; m += 30) {
                          const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                          timeOptions.push(time);
                        }
                      }
                      return (
                        <div key={day.key} className="grid gap-3 md:grid-cols-[12rem_1fr_auto] md:items-center p-4 rounded-xl border border-[var(--line)]">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                updateSettings('availability', {
                                  ...availability,
                                  workingDays: checked
                                    ? [...availability.workingDays, day.key]
                                    : availability.workingDays.filter((d) => d !== day.key)
                                });
                              }}
                              className="h-5 w-5 rounded"
                            />
                            <span className="font-black text-sm">{day.label}</span>
                          </div>
                          {isEnabled ? (
                            <div className="grid grid-cols-2 gap-3">
                              <select
                                className="theme-input min-h-11 rounded-xl px-4 outline-none"
                                value={availability.startTime}
                                onChange={(event) => updateSettings('availability', { ...availability, startTime: event.target.value })}
                              >
                                {timeOptions.map((time) => (
                                  <option key={time} value={time}>{time}</option>
                                ))}
                              </select>
                              <select
                                className="theme-input min-h-11 rounded-xl px-4 outline-none"
                                value={availability.endTime}
                                onChange={(event) => updateSettings('availability', { ...availability, endTime: event.target.value })}
                              >
                                {timeOptions.map((time) => (
                                  <option key={time} value={time}>{time}</option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <span className="text-soft text-sm">Unavailable</span>
                          )}
                          {isEnabled ? (
                            <button type="button" className="text-soft hover:text-[var(--foreground)]">
                              +
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </section>

                <label className="grid gap-2 text-sm font-bold">Blackout dates<textarea className="theme-input min-h-24 rounded-xl px-4 py-3 outline-none" value={(availability.blackoutDates ?? []).join(', ')} onChange={(event) => updateSettings('availability', { ...availability, blackoutDates: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} placeholder="2026-12-25, 2026-12-26" /></label>
              </div>
            ) : null}

            <div className="flex flex-wrap justify-end gap-3 border-t border-[var(--line)] pt-5">
              <Button type="button" variant="ghost" className="rounded-xl" onClick={() => setEditingCalendar(null)}>Cancel</Button>
              <Button type="submit" className="rounded-xl" disabled={saving}><Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save Calendar'}</Button>
            </div>
          </section>
        </form>
      </div>
    )
  }
  function renderBookingCmsBookings() {
    return (
      <div className="grid gap-4">
        {bookingCmsBookings.map((booking) => (
          <article key={booking.id} className="surface-card grid gap-5 rounded-2xl p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-black text-lg">{booking.customer.name}</h3>
                  <span className={cn('rounded-full px-3 py-1 text-xs font-black', 
                    booking.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-600' : 
                    booking.status === 'cancelled' ? 'bg-red-500/10 text-red-600' : 
                    booking.status === 'pending' ? 'bg-amber-500/10 text-amber-600' : 
                    'bg-gray-500/10 text-gray-600'
                  )}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                </div>
                <p className="text-soft mt-1 text-sm"><span className="font-bold text-[var(--foreground)]">Email:</span> {booking.customer.email}</p>
                {booking.customer.phone ? <p className="text-soft mt-1 text-sm"><span className="font-bold text-[var(--foreground)]">Phone:</span> {booking.customer.phone}</p> : null}
                <p className="text-soft mt-1 text-sm"><span className="font-bold text-[var(--foreground)]">Service:</span> {booking.serviceType}</p>
                <p className="text-soft mt-1 text-sm"><span className="font-bold text-[var(--foreground)]">Calendar:</span> {booking.calendarName || 'No calendar'}</p>
                <p className="text-soft mt-1 text-sm"><span className="font-bold text-[var(--foreground)]">Date & Time:</span> {booking.startsAt} - {booking.endsAt}</p>
                {booking.notes ? <p className="text-soft mt-2 text-sm"><span className="font-bold text-[var(--foreground)]">Notes:</span> {booking.notes}</p> : null}
              </div>
              <div className="flex gap-2 flex-wrap">
                <select className="theme-input min-h-10 rounded-xl px-3 outline-none" value={booking.status} onChange={(event) => void updateBookingCmsStatus(booking, event.target.value)}>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="closed">Closed</option>
                </select>
                <Button type="button" variant="ghost" className="rounded-xl border border-[var(--line)]"><CalendarDays className="h-4 w-4" />Reschedule</Button>
                <Button type="button" variant="ghost" className="rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/5"><Trash2 className="h-4 w-4" />Cancel</Button>
              </div>
            </div>
          </article>
        ))}
        {bookingCmsBookings.length === 0 ? <section className="surface-card rounded-2xl p-8 text-center"><p className="text-soft">No CMS bookings yet.</p></section> : null}
      </div>
    )
  }

  function renderBookingAvailability() {
    const days = [
      { key: 'sunday', label: 'Sun' },
      { key: 'monday', label: 'Mon' },
      { key: 'tuesday', label: 'Tue' },
      { key: 'wednesday', label: 'Wed' },
      { key: 'thursday', label: 'Thu' },
      { key: 'friday', label: 'Fri' },
      { key: 'saturday', label: 'Sat' },
    ]

    const timeOptions: string[] = []
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
        timeOptions.push(time)
      }
    }

    return (
      <div className="grid gap-6">
        <div className="surface-card rounded-2xl p-5 md:p-6">
          <h3 className="text-2xl font-black">Edit the schedule below so that you can apply to your event/booking types</h3>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <form className="surface-card grid gap-4 rounded-2xl p-5" onSubmit={saveAvailabilityRule}>
            <h3 className="text-xl font-black">Availability rule</h3>
            <select className="theme-input min-h-11 rounded-xl px-4 outline-none" value={availabilityForm.calendarId} onChange={(event) => setAvailabilityForm((current) => ({ ...current, calendarId: Number(event.target.value) }))}>
              <option value={0}>Global rule</option>
              {bookingCalendars.map((calendar) => <option key={calendar.id} value={calendar.id}>{calendar.name}</option>)}
            </select>
            <input className="theme-input min-h-11 rounded-xl px-4 outline-none" value={availabilityForm.name} onChange={(event) => setAvailabilityForm((current) => ({ ...current, name: event.target.value }))} placeholder="Rule name" />
            
            <section className="rounded-xl border border-[var(--line)] p-4">
              <h4 className="text-lg font-bold mb-4">Weekly Hours</h4>
              <div className="grid gap-3">
                {days.map((day) => {
                  const isEnabled = availabilityForm.workingDays.includes(day.key)
                  return (
                    <div key={day.key} className="grid gap-3 md:grid-cols-[12rem_1fr_auto] md:items-center">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={(e) => {
                            const checked = e.target.checked
                            setAvailabilityForm((current) => ({
                              ...current,
                              workingDays: checked
                                ? [...current.workingDays, day.key]
                                : current.workingDays.filter((d) => d !== day.key)
                            }))
                          }}
                          className="h-5 w-5 rounded"
                        />
                        <span className="font-black text-sm">{day.label}</span>
                      </div>
                      {isEnabled ? (
                        <div className="grid grid-cols-2 gap-3">
                          <select
                            className="theme-input min-h-11 rounded-xl px-4 outline-none"
                            value={availabilityForm.startTime}
                            onChange={(event) => setAvailabilityForm((current) => ({ ...current, startTime: event.target.value }))}
                          >
                            {timeOptions.map((time) => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>
                          <select
                            className="theme-input min-h-11 rounded-xl px-4 outline-none"
                            value={availabilityForm.endTime}
                            onChange={(event) => setAvailabilityForm((current) => ({ ...current, endTime: event.target.value }))}
                          >
                            {timeOptions.map((time) => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <span className="text-soft text-sm">Unavailable</span>
                      )}
                      {isEnabled ? <button type="button" className="text-soft hover:text-[var(--foreground)]">+</button> : null}
                    </div>
                  )
                })}
              </div>
            </section>
            <Button type="submit" className="rounded-xl" disabled={saving}>{saving ? 'Saving...' : 'Save Availability'}</Button>
          </form>

          <section className="grid gap-4">
            {bookingAvailabilityRules.map((rule) => (
              <article key={rule.id} className="surface-card rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-black text-lg">{rule.name}</h3>
                    <p className="text-soft mt-1 text-sm">{rule.calendarId ? bookingCalendars.find((c) => c.id === rule.calendarId)?.name : 'Global'}</p>
                  </div>
                  <span className={cn('rounded-full px-3 py-1 text-xs font-black', rule.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-gray-500/10 text-gray-600')}>{rule.isActive ? 'Active' : 'Inactive'}</span>
                </div>
                <p className="text-soft mt-2 text-sm">{rule.startTime} - {rule.endTime}</p>
                <p className="text-soft mt-1 text-sm">{rule.workingDays.join(', ')}</p>
              </article>
            ))}
            {bookingAvailabilityRules.length === 0 ? <section className="surface-card rounded-2xl p-8 text-center"><p className="text-soft">No availability rules yet. Create one to get started!</p></section> : null}
          </section>
        </div>
      </div>
    )
  }

  function renderBookingSettingField(key: string, value: string) {
    const booleanFields = new Set([
      'pricing_enabled',
      'email_notifications_enabled',
      'sms_notifications_enabled',
      'google_calendar_sync_enabled',
      'google_meet_auto_generate',
      'zoom_enabled',
      'zoom_auto_generate',
      'tenant_mode_enabled',
      'paystack_enabled',
    ])
    const selectOptions: Record<string, Array<{ value: string; label: string }>> = {
      payment_provider: [
        { value: 'none', label: 'No payment gateway' },
        { value: 'paystack', label: 'Paystack' },
      ],
      paystack_mode: [
        { value: 'test', label: 'Test mode' },
        { value: 'live', label: 'Live mode' },
      ],
      currency: [
        { value: 'NGN', label: 'NGN - Nigerian Naira' },
        { value: 'USD', label: 'USD - US Dollar' },
        { value: 'GBP', label: 'GBP - British Pound' },
        { value: 'GHS', label: 'GHS - Ghanaian Cedi' },
        { value: 'ZAR', label: 'ZAR - South African Rand' },
        { value: 'KES', label: 'KES - Kenyan Shilling' },
      ],
      date_format: [
        { value: 'Y-m-d', label: '2026-06-06' },
        { value: 'd/m/Y', label: '06/06/2026' },
        { value: 'M j, Y', label: 'Jun 6, 2026' },
      ],
      time_format: [
        { value: 'H:i', label: '24-hour' },
        { value: 'h:i A', label: '12-hour' },
      ],
      paystack_channels: [
        { value: 'card,bank,ussd,bank_transfer', label: 'Card, bank, USSD, transfer' },
        { value: 'card', label: 'Card only' },
        { value: 'bank_transfer', label: 'Bank transfer only' },
        { value: 'card,bank_transfer', label: 'Card and transfer' },
      ],
      google_calendar_send_updates: [
        { value: 'all', label: 'Send updates to all guests' },
        { value: 'externalOnly', label: 'External guests only' },
        { value: 'none', label: 'Do not send Google updates' },
      ],
    }

    if (booleanFields.has(key)) {
      return (
        <select className="theme-input min-h-11 rounded-xl px-4 outline-none" value={value || 'false'} onChange={(event) => setBookingCmsSettings((current) => ({ ...current, [key]: event.target.value }))}>
          <option value="true">Enabled</option>
          <option value="false">Disabled</option>
        </select>
      )
    }

    if (selectOptions[key]) {
      return (
        <select className="theme-input min-h-11 rounded-xl px-4 outline-none" value={value} onChange={(event) => setBookingCmsSettings((current) => ({ ...current, [key]: event.target.value }))}>
          {selectOptions[key].map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      )
    }

    return (
      <input
        className="theme-input min-h-11 rounded-xl px-4 outline-none"
        type={key.includes('secret') ? 'password' : key.includes('email') ? 'email' : key.includes('url') ? 'url' : 'text'}
        value={value}
        onChange={(event) => setBookingCmsSettings((current) => ({ ...current, [key]: event.target.value }))}
      />
    )
  }

  function renderBookingCmsSettings() {
    const paymentKeys = ['payment_provider', 'pricing_enabled', 'currency', 'paystack_enabled', 'paystack_mode', 'paystack_public_key', 'paystack_secret_key', 'paystack_callback_url', 'paystack_channels']
    const googleCredentialKeys = ['google_oauth_client_id', 'google_oauth_client_secret']
    const googleOptionKeys = ['google_calendar_sync_enabled', 'google_calendar_id', 'google_calendar_send_updates', 'google_meet_auto_generate']
    const zoomKeys = ['zoom_enabled', 'zoom_account_id', 'zoom_client_id', 'zoom_client_secret', 'zoom_user_id', 'zoom_auto_generate']
    const ruleKeys = ['timezone', 'date_format', 'time_format', 'minimum_notice_minutes', 'maximum_future_days', 'maximum_bookings_per_day', 'default_buffer_minutes']
    const notificationKeys = ['email_notifications_enabled', 'sms_notifications_enabled', 'admin_alert_email', 'confirmation_email_subject', 'status_email_subject', 'reminder_email_subject', 'webhook_url']
    const googleRedirectUri = `${(import.meta.env.VITE_API_BASE_URL || window.location.origin).replace(/\/$/, '')}/api/booking/google/callback`
    const googleHasCredentials = Boolean(bookingCmsSettings.google_oauth_client_id && bookingCmsSettings.google_oauth_client_secret)
    const googleConnected = Boolean(bookingCmsSettings.google_connected_email)
    const renderGroup = (title: string, keys: string[]) => (
      <section className="surface-card rounded-xl p-5 md:p-6">
        <h3 className="text-xl font-black">{title}</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {keys.filter((key) => key in bookingCmsSettings).map((key) => (
            <label key={key} className="grid gap-2 text-sm font-bold">
              <span className="capitalize">{key.replaceAll('_', ' ')}</span>
              {renderBookingSettingField(key, bookingCmsSettings[key] ?? '')}
            </label>
          ))}
        </div>
      </section>
    )

    return (
      <form className="grid gap-5" onSubmit={saveBookingCmsSettings}>
        <div className="surface-card rounded-xl p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-2xl font-black">Gateway and booking controls</h3>
              <p className="text-soft mt-2 text-sm leading-6">Configure payments, rules, and notifications without editing code.</p>
            </div>
            <Button type="submit" className="w-fit rounded-xl" disabled={saving}><Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save Settings'}</Button>
          </div>
        </div>
        {renderGroup('Payment and Paystack', paymentKeys)}
        <section className="surface-card overflow-hidden rounded-xl">
          <div className="border-b border-[var(--line)] bg-[var(--surface-2)]/60 p-5 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-xl font-black">Google Calendar / Meet</h3>
                <p className="text-soft mt-2 text-sm leading-6">Use OAuth to connect your Google account, choose a calendar, prevent conflicts, and auto-generate Google Meet links.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={cn('rounded-full px-3 py-1 text-xs font-black', googleConnected ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600')}>{googleConnected ? 'Connected' : 'Not connected'}</span>
                  {bookingCmsSettings.google_connected_email ? <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-black text-soft">{bookingCmsSettings.google_connected_email}</span> : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="ghost" className="rounded-xl border border-[var(--line)]" onClick={connectGoogleCalendar} disabled={saving}>{saving ? 'Saving...' : 'Save & Connect Google'}</Button>
                <Button type="button" variant="ghost" className="rounded-xl border border-[var(--line)]" onClick={() => void loadGoogleCalendars()} disabled={loadingGoogleCalendars || !googleConnected}>{loadingGoogleCalendars ? 'Loading...' : 'Load calendars'}</Button>
              </div>
            </div>
          </div>

          <div className="grid gap-5 p-5 md:grid-cols-[1fr_1.2fr] md:p-6">
            <div className="grid gap-4">
              <div className="rounded-xl border border-[var(--line)] p-4">
                <h4 className="font-black">Setup guide</h4>
                <ol className="mt-3 grid gap-3 text-sm text-soft">
                  <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3267e3] text-xs font-black text-white">1</span><span>Create a Google Cloud OAuth client with application type <b>Web application</b>.</span></li>
                  <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3267e3] text-xs font-black text-white">2</span><span>Add the redirect URI below to Google Cloud authorized redirect URIs.</span></li>
                  <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3267e3] text-xs font-black text-white">3</span><span>Paste the Client ID and Client Secret here, then click <b>Save & Connect Google</b>.</span></li>
                  <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3267e3] text-xs font-black text-white">4</span><span>After login, load calendars and choose the calendar this booking system should use.</span></li>
                </ol>
              </div>

              <div className="rounded-xl border border-[var(--line)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-black">Redirect URI</h4>
                  <Button type="button" variant="ghost" className="h-9 rounded-lg border border-[var(--line)] px-3 text-xs" onClick={() => void navigator.clipboard?.writeText(googleRedirectUri)}>Copy</Button>
                </div>
                <p className="mt-2 break-all rounded-lg bg-[var(--surface-2)] p-3 text-xs font-bold text-soft">{googleRedirectUri}</p>
              </div>
            </div>

            <div>
              <h4 className="font-black">Credentials</h4>
              <div className="mt-4 grid gap-4">
                {googleCredentialKeys.map((key) => (
                  <label key={key} className="grid gap-2 text-sm font-bold">
                    <span className="capitalize">{key.replaceAll('_', ' ')}</span>
                    {renderBookingSettingField(key, bookingCmsSettings[key] ?? '')}
                  </label>
                ))}
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {googleOptionKeys.map((key) => (
                  <label key={key} className="grid gap-2 text-sm font-bold">
                    <span className="capitalize">{key.replaceAll('_', ' ')}</span>
                    {renderBookingSettingField(key, bookingCmsSettings[key] ?? '')}
                  </label>
                ))}
              </div>

              {!googleHasCredentials ? (
                <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm font-bold text-amber-700">
                  Add both Google OAuth Client ID and Client Secret before connecting. The Client Secret is required when Google sends the login callback.
                </div>
              ) : null}
            </div>
          </div>

          {googleCalendars.length > 0 ? (
            <div className="mx-5 mb-5 rounded-xl border border-[var(--line)] p-4 md:mx-6 md:mb-6">
              <h4 className="font-black">Choose calendar</h4>
              <div className="mt-3 grid gap-2">
                {googleCalendars.map((calendar) => (
                  <button key={calendar.id} type="button" onClick={() => void selectGoogleCalendar(calendar.id)} className={cn('flex min-h-11 items-center justify-between rounded-xl border px-4 text-left text-sm transition', calendar.selected ? 'border-[#3267e3] bg-[#3267e3]/10 text-[#3267e3]' : 'border-[var(--line)] hover:bg-[var(--surface-2)]')}>
                    <span className="font-bold">{calendar.summary}{calendar.primary ? ' (Primary)' : ''}</span>
                    <span className="text-soft">{calendar.accessRole}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>
        {renderGroup('Zoom Meetings', zoomKeys)}
        {renderGroup('Booking Rules', ruleKeys)}
        {renderGroup('Notifications and Integrations', notificationKeys)}
      </form>
    )
  }

  function renderBookings() {
    const bookingTabs: Array<{ id: BookingAdminSection; label: string }> = [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'calendars', label: 'Calendars' },
      { id: 'bookings', label: 'Bookings' },
      { id: 'availability', label: 'Availability' },
      { id: 'settings', label: 'Settings' },
    ]

    return (
      <div>
        <PanelHeader eyebrow="Booking CMS" title="Booking management backend" text="Control dashboard analytics, calendars, bookings, availability rules, blackout dates, and booking settings." />
        <div className="mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-2">
          {bookingTabs.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setActiveBookingSection(tab.id)} className={cn('min-h-10 shrink-0 rounded-xl px-4 text-sm font-black transition', activeBookingSection === tab.id ? 'bg-[var(--foreground)] text-[var(--background)]' : 'text-soft hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]')}>
              {tab.label}
            </button>
          ))}
        </div>
        {activeBookingSection === 'dashboard' ? renderBookingCmsDashboard() : null}
        {activeBookingSection === 'calendars' ? renderBookingCalendars() : null}
        {activeBookingSection === 'bookings' ? renderBookingCmsBookings() : null}
        {activeBookingSection === 'availability' ? renderBookingAvailability() : null}
        {activeBookingSection === 'settings' ? renderBookingCmsSettings() : null}
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
    if (activeSection === 'reviews') return renderReviews()
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

