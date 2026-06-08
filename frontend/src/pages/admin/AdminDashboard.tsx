// @ts-nocheck
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  CalendarDays,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  FileText as InvoiceIcon,
  FileText as QuoteIcon,
  FolderKanban,
  Gauge,
  Images,
  LayoutDashboard,
  Link2,
  Loader2,
  LogOut,
  Mail,
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
  Bell,
  Search,
  Sun,
  Moon,
  Menu,
  TrendingUp,
  TrendingDown,
  UserPlus,
  Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RichTextEditor } from '@/components/RichTextEditor'
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
  type InvoiceClient,
  type InvoiceDocument,
  type InvoiceEmailLog,
  type InvoiceItem,
  type InvoiceListMeta,
  type InvoiceOverview,
  type MediaItem,
  type Project,
  type ProjectInput,
  type Review,
  type ReviewInput,
} from '@/lib/api'
import { cn } from '@/lib/utils'

type AdminSection = 'dashboard' | 'pages' | 'posts' | 'projects' | 'reviews' | 'library' | 'seo' | 'bookings' | 'invoices' | 'users' | 'settings'
type BookingAdminSection = 'dashboard' | 'calendars' | 'bookings' | 'availability' | 'settings'
type InvoiceSubsection = 'dashboard' | 'invoices' | 'quotes' | 'receipts' | 'emails' | 'contacts' | 'settings' | 'import' | 'create'
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

const defaultInvoiceListMeta: InvoiceListMeta = { page: 1, perPage: 25, total: 0, lastPage: 1 }

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

const emptyInvoiceItem: InvoiceItem = {
  name: '',
  description: '',
  quantity: 1,
  unitPrice: 0,
  discountRate: 0,
  taxRate: 0,
}

const emptyInvoiceForm: Partial<InvoiceDocument> & {
  type: 'invoice' | 'quote' | 'receipt'
  title: string
  status: string
  currency: string
  exchangeRate: number
  issueDate: string
  dueDate: string
  paymentGateway: string
  paymentEnabled: boolean
  serviceOverview: string
  scopeOfService: string
  notes: string
  terms: string
  client: InvoiceClient
  items: InvoiceItem[]
  branding: NonNullable<InvoiceDocument['branding']>
} = {
  type: 'invoice',
  title: '',
  status: 'draft',
  currency: 'NGN',
  exchangeRate: 1,
  issueDate: new Date().toISOString().slice(0, 10),
  dueDate: '',
  paymentGateway: 'paystack',
  paymentEnabled: true,
  serviceOverview: '',
  scopeOfService: '',
  notes: '',
  terms: '',
  client: { name: '', email: '', phone: '', companyName: '', address: '' },
  items: [{ ...emptyInvoiceItem, name: 'Professional Service', unitPrice: 0 }],
  branding: {
    businessName: 'Bakhtech Solutions',
    logoUrl: '/bakhtech-logo-light.png',
    primaryColor: '#3b82f6',
    accentColor: '#12c8a0',
    email: 'solutions@bakhtech.com.ng',
    phone: '+234 708 637 2833',
    address: '',
  },
}

const invoicePaymentGateways = [
  { value: 'manual', label: 'Manual/Offline', description: 'Record bank transfer, cash, or custom payment instructions.' },
  { value: 'paystack', label: 'Paystack', description: 'Good default for NGN card, transfer, and local checkout flows.' },
  { value: 'flutterwave', label: 'Flutterwave', description: 'Useful for USD and multi-currency payment collection.' },
]

function parseInvoiceGatewayList(settings: Record<string, string>, currency = '') {
  const gateways = new Set<string>()
  String(settings.invoiceEnabledPaymentGateways || '')
    .split(',')
    .map((gateway) => gateway.trim())
    .filter(Boolean)
    .forEach((gateway) => gateways.add(gateway))

  const globalGateway = String(settings.gateway_active || settings.invoiceDefaultPaymentGateway || '').trim()
  if (globalGateway && globalGateway !== 'none') gateways.add(globalGateway)

  try {
    const accounts = JSON.parse(String(settings.bank_currency_accounts || '[]'))
    if (Array.isArray(accounts)) {
      accounts.forEach((account) => {
        const accountCurrency = String(account?.currency || '').toUpperCase()
        const gateway = String(account?.gateway || '').trim()
        if (gateway && gateway !== 'none' && (!currency || accountCurrency === currency.toUpperCase())) {
          gateways.add(gateway)
        }
      })
    }
  } catch {
    // WordPress stores this as serialized PHP; Laravel users can paste JSON here.
  }

  return Array.from(gateways).filter((gateway) => invoicePaymentGateways.some((option) => option.value === gateway))
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
  { id: 'invoices', label: 'Invoices', icon: Wallet },
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
    return <video className="h-40 w-full rounded-2xl object-cover" src={src} controls preload="metadata" />
  }

  if (isYoutubeMedia(src)) {
    return <div className="surface-muted grid h-40 w-full place-items-center rounded-2xl text-sm font-black text-soft">YouTube video</div>
  }

  return <img className="h-40 w-full rounded-2xl object-cover" src={src || '/showcase/showcase-01.jpg'} alt={title} />
}

function PanelHeader({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="mb-8">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600 mb-2">{eyebrow}</p>
      <h2 className="text-3xl font-black text-gray-900 mb-3">{title}</h2>
      <p className="text-gray-600 leading-relaxed max-w-3xl">{text}</p>
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

function invoiceMoney(amount: number, currency: string) {
  const currencySymbols: Record<string, string> = {
    NGN: '₦',
    USD: '$',
    GBP: '£',
    EUR: '€',
    GHS: 'GH₵',
    KES: 'KSh',
    ZAR: 'R',
  }
  const symbol = currencySymbols[currency] || currency
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function invoicePreviewTotals(items: InvoiceItem[]) {
  let subtotal = 0
  let discount = 0
  let tax = 0
  items.forEach((item) => {
    const itemSubtotal = (item.quantity || 0) * (item.unitPrice || 0)
    subtotal += itemSubtotal
    const itemDiscount = (item.discountRate || 0) / 100 * itemSubtotal
    discount += itemDiscount
    const itemTax = (item.taxRate || 0) / 100 * (itemSubtotal - itemDiscount)
    tax += itemTax
  })
  return { subtotal, discount, tax, total: subtotal - discount + tax }
}

function storedAdminView<T extends string>(key: string, fallback: T, allowed: readonly T[]): T {
  if (typeof window === 'undefined') return fallback
  const value = window.localStorage.getItem(key) as T | null
  return value && allowed.includes(value) ? value : fallback
}

const adminDataCacheKey = 'bakhtech-admin-data-cache-v1'

function readAdminDataCache() {
  if (typeof window === 'undefined') return null
  try {
    return JSON.parse(window.localStorage.getItem(adminDataCacheKey) || 'null')
  } catch {
    return null
  }
}

function writeAdminDataCache(payload: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(adminDataCacheKey, JSON.stringify({ ...payload, cachedAt: new Date().toISOString() }))
  } catch {
    // Ignore storage quota/private-mode failures; live API data still works.
  }
}

export function AdminDashboard() {
  const navigate = useNavigate()
  const token = getAdminToken()
  const initialAdminCache = useMemo(() => readAdminDataCache(), [])
  const [activeSection, setActiveSection] = useState<AdminSection>(() => storedAdminView('bakhtech-admin-section', 'dashboard', ['dashboard', 'pages', 'posts', 'projects', 'reviews', 'library', 'seo', 'bookings', 'invoices', 'users', 'settings']))
  const [activeBookingSection, setActiveBookingSection] = useState<BookingAdminSection>(() => storedAdminView('bakhtech-admin-booking-section', 'dashboard', ['dashboard', 'calendars', 'bookings', 'availability', 'settings']))
  const [activeInvoiceSubsection, setActiveInvoiceSubsection] = useState<InvoiceSubsection>(() => storedAdminView('bakhtech-admin-invoice-section', 'dashboard', ['dashboard', 'invoices', 'quotes', 'receipts', 'emails', 'contacts', 'settings', 'import', 'create']))
  const [dashboard, setDashboard] = useState<DashboardData | null>(initialAdminCache?.dashboard ?? null)
  const [cms, setCms] = useState<CmsData | null>(initialAdminCache?.cms ?? null)
  const [bookingOverview, setBookingOverview] = useState<BookingCmsOverview | null>(null)
  const [bookingCalendars, setBookingCalendars] = useState<BookingCalendar[]>([])
  const [bookingCmsBookings, setBookingCmsBookings] = useState<BookingCmsBooking[]>([])
  const [bookingAvailabilityRules, setBookingAvailabilityRules] = useState<BookingAvailabilityRule[]>([])
  const [bookingCmsSettings, setBookingCmsSettings] = useState<Record<string, string>>({})
  const [invoiceOverview, setInvoiceOverview] = useState<InvoiceOverview | null>(initialAdminCache?.invoiceOverview ?? null)
  const [invoiceDocuments, setInvoiceDocuments] = useState<InvoiceDocument[]>(initialAdminCache?.invoiceDocuments ?? [])
  const [invoiceClients, setInvoiceClients] = useState<InvoiceClient[]>(initialAdminCache?.invoiceClients ?? [])
  const [invoiceEmailLogs, setInvoiceEmailLogs] = useState<InvoiceEmailLog[]>(initialAdminCache?.invoiceEmailLogs ?? [])
  const [selectedEmailLog, setSelectedEmailLog] = useState<InvoiceEmailLog | null>(null)
  const [invoiceDocumentsMeta, setInvoiceDocumentsMeta] = useState<InvoiceListMeta>(initialAdminCache?.invoiceDocumentsMeta ?? defaultInvoiceListMeta)
  const [invoiceClientsMeta, setInvoiceClientsMeta] = useState<InvoiceListMeta>(initialAdminCache?.invoiceClientsMeta ?? defaultInvoiceListMeta)
  const [invoiceEmailLogsMeta, setInvoiceEmailLogsMeta] = useState<InvoiceListMeta>(initialAdminCache?.invoiceEmailLogsMeta ?? defaultInvoiceListMeta)
  const [invoiceListPage, setInvoiceListPage] = useState(1)
  const [invoiceClientsPage, setInvoiceClientsPage] = useState(1)
  const [invoiceEmailLogsPage, setInvoiceEmailLogsPage] = useState(1)
  const [invoiceEmailStatusFilter, setInvoiceEmailStatusFilter] = useState('')
  const [invoiceEmailTypeFilter, setInvoiceEmailTypeFilter] = useState('')
  const [invoiceForm, setInvoiceForm] = useState(emptyInvoiceForm)
  const [editingInvoice, setEditingInvoice] = useState<InvoiceDocument | null>(null)
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    method: '',
    date: new Date().toISOString().slice(0, 10),
    notes: ''
  })
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('')
  const [googleCalendars, setGoogleCalendars] = useState<Array<{ id: string; summary: string; primary: boolean; accessRole: string; selected: boolean }>>([])
  const [loadingGoogleCalendars, setLoadingGoogleCalendars] = useState(false)
  const [editingPageId, setEditingPageId] = useState<number | null>(initialAdminCache?.cms?.pages?.[0]?.id ?? null)
  const [projects, setProjects] = useState<Project[]>(initialAdminCache?.projects ?? [])
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
  const [settingsForm, setSettingsForm] = useState<Record<string, string>>(initialAdminCache?.cms?.settings ?? {})
  const [loading, setLoading] = useState(!initialAdminCache)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Redesign state variables
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark'
    }
    return false
  })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [showCreateNewDropdown, setShowCreateNewDropdown] = useState(false)
  const [timeFilter, setTimeFilter] = useState<'7d' | '30d' | '12m'>('30d')
  const [notifications, setNotifications] = useState([
    { id: 1, text: 'New booking scheduled by John Doe', time: '10 mins ago', unread: true },
    { id: 2, text: 'Invoice #INV-2026-001 has been paid', time: '1 hour ago', unread: true },
    { id: 3, text: 'SEO score improved to 92%', time: 'Yesterday', unread: false },
  ])

  // Sync dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [darkMode])

  useEffect(() => {
    localStorage.setItem('bakhtech-admin-section', activeSection)
  }, [activeSection])

  useEffect(() => {
    localStorage.setItem('bakhtech-admin-booking-section', activeBookingSection)
  }, [activeBookingSection])

  useEffect(() => {
    localStorage.setItem('bakhtech-admin-invoice-section', activeInvoiceSubsection)
  }, [activeInvoiceSubsection])

  // Global search implementation
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const query = searchQuery.toLowerCase()
    const results: Array<{ type: string; title: string; subtitle?: string; action: () => void }> = []

    // Search Pages
    cms?.pages.forEach(page => {
      if (page.title.toLowerCase().includes(query) || page.slug.toLowerCase().includes(query)) {
        results.push({
          type: 'Page',
          title: page.title,
          subtitle: `/${page.slug}`,
          action: () => {
            setActiveSection('pages')
            setEditingPageId(page.id)
            setSearchQuery('')
          }
        })
      }
    })

    // Search Posts
    cms?.posts.forEach(post => {
      if (post.title.toLowerCase().includes(query) || post.category.toLowerCase().includes(query)) {
        results.push({
          type: 'Blog Post',
          title: post.title,
          subtitle: post.category,
          action: () => {
            setActiveSection('posts')
            editPost(post)
            setSearchQuery('')
          }
        })
      }
    })

    // Search Projects
    projects.forEach(project => {
      if (project.title.toLowerCase().includes(query) || project.category.toLowerCase().includes(query)) {
        results.push({
          type: 'Project',
          title: project.title,
          subtitle: project.category,
          action: () => {
            setActiveSection('projects')
            editProject(project)
            setSearchQuery('')
          }
        })
      }
    })

    // Search Invoices
    invoiceDocuments.forEach(doc => {
      if (
        doc.number.toLowerCase().includes(query) || 
        doc.title.toLowerCase().includes(query) ||
        doc.client.name.toLowerCase().includes(query)
      ) {
        results.push({
          type: 'Invoice/Quote',
          title: `${doc.number} - ${doc.title || 'Untitled'}`,
          subtitle: `Client: ${doc.client.name} | ${invoiceMoney(doc.total, doc.currency)}`,
          action: () => {
            setActiveSection('invoices')
            setActiveInvoiceSubsection('invoices')
            setEditingInvoice(doc)
            setInvoiceForm({
              type: doc.type,
              title: doc.title,
              status: doc.status,
              currency: doc.currency,
              exchangeRate: doc.exchangeRate,
              issueDate: doc.issueDate,
              dueDate: doc.dueDate,
              paymentGateway: doc.paymentGateway,
              paymentEnabled: doc.paymentEnabled,
              serviceOverview: doc.serviceOverview || '',
              scopeOfService: doc.scopeOfService || '',
              notes: doc.notes || '',
              terms: doc.terms || '',
              client: { ...doc.client },
              items: doc.items.map(item => ({ ...item })),
              branding: { ...doc.branding },
            })
            setSearchQuery('')
          }
        })
      }
    })

    return results.slice(0, 8)
  }, [searchQuery, cms, projects, invoiceDocuments])

  const cards = useMemo(() => (dashboard ? metricCards(dashboard) : []), [dashboard])
  const activeMenu = menuItems.find((item) => item.id === activeSection) ?? menuItems[0]

  useEffect(() => {
    if (!token) return
    void loadAdminData(!initialAdminCache)
  }, [token])

  useEffect(() => {
    if (!token || activeSection !== 'bookings') return
    void loadBookingCmsData()
  }, [token, activeSection])

  useEffect(() => {
    if (!token || activeSection !== 'invoices') return
    const documentType = ['invoices', 'quotes', 'receipts'].includes(activeInvoiceSubsection)
      ? activeInvoiceSubsection.slice(0, -1)
      : ''
    void loadInvoiceData({
      documentPage: invoiceListPage,
      documentType,
      documentStatus: invoiceStatusFilter,
      documentSearch: invoiceSearch,
      clientsPage: invoiceClientsPage,
      clientsSearch: invoiceSearch,
      emailPage: invoiceEmailLogsPage,
      emailStatus: invoiceEmailStatusFilter,
      emailType: invoiceEmailTypeFilter,
      emailSearch: invoiceSearch,
    })
  }, [token, activeSection, activeInvoiceSubsection, invoiceListPage, invoiceClientsPage, invoiceEmailLogsPage, invoiceStatusFilter, invoiceEmailStatusFilter, invoiceEmailTypeFilter])

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

  async function loadAdminData(showLoader = true) {
    if (showLoader) setLoading(true)
    setError('')

    try {
      const [
        dashboardResult,
        projectResult,
        cmsResult,
        invoiceOverviewResult,
        invoiceDocumentsResult,
        invoiceClientsResult,
        invoiceEmailLogsResult
      ] = await Promise.all([
        api.dashboard(),
        api.adminProjects(),
        api.cms(),
        api.invoiceOverview().catch(() => null),
        api.invoiceDocuments().catch(() => null),
        api.invoiceClients().catch(() => null),
        api.invoiceEmailLogs().catch(() => null)
      ])
      setDashboard(dashboardResult)
      setProjects(projectResult.projects)
      setCms(cmsResult)
      setEditingPageId((current) => current ?? cmsResult.pages[0]?.id ?? null)
      setSettingsForm(cmsResult.settings)
      if (invoiceOverviewResult) setInvoiceOverview(invoiceOverviewResult)
      if (invoiceDocumentsResult) setInvoiceDocuments(invoiceDocumentsResult.documents)
      if (invoiceDocumentsResult?.meta) setInvoiceDocumentsMeta(invoiceDocumentsResult.meta)
      if (invoiceClientsResult) setInvoiceClients(invoiceClientsResult.clients)
      if (invoiceClientsResult?.meta) setInvoiceClientsMeta(invoiceClientsResult.meta)
      if (invoiceEmailLogsResult) setInvoiceEmailLogs(invoiceEmailLogsResult.logs)
      if (invoiceEmailLogsResult?.meta) setInvoiceEmailLogsMeta(invoiceEmailLogsResult.meta)
      writeAdminDataCache({
        dashboard: dashboardResult,
        projects: projectResult.projects,
        cms: cmsResult,
        invoiceOverview: invoiceOverviewResult,
        invoiceDocuments: invoiceDocumentsResult?.documents ?? [],
        invoiceDocumentsMeta: invoiceDocumentsResult?.meta ?? defaultInvoiceListMeta,
        invoiceClients: invoiceClientsResult?.clients ?? [],
        invoiceClientsMeta: invoiceClientsResult?.meta ?? defaultInvoiceListMeta,
        invoiceEmailLogs: invoiceEmailLogsResult?.logs ?? [],
        invoiceEmailLogsMeta: invoiceEmailLogsResult?.meta ?? defaultInvoiceListMeta,
      })
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

  async function loadInvoiceData(options: { documentPage?: number; documentType?: string; documentStatus?: string; documentSearch?: string; clientsPage?: number; clientsSearch?: string; emailPage?: number; emailStatus?: string; emailType?: string; emailSearch?: string } = {}) {
    try {
      const [overviewResult, documentsResult, clientsResult, emailLogsResult] = await Promise.all([
        api.invoiceOverview(),
        api.invoiceDocuments({
          page: options.documentPage ?? invoiceListPage,
          perPage: invoiceDocumentsMeta.perPage,
          type: options.documentType ?? '',
          status: options.documentStatus ?? invoiceStatusFilter,
          search: options.documentSearch ?? invoiceSearch,
        }),
        api.invoiceClients({
          page: options.clientsPage ?? invoiceClientsPage,
          perPage: invoiceClientsMeta.perPage,
          search: options.clientsSearch ?? invoiceSearch,
        }),
        api.invoiceEmailLogs({
          page: options.emailPage ?? invoiceEmailLogsPage,
          perPage: invoiceEmailLogsMeta.perPage,
          status: options.emailStatus ?? invoiceEmailStatusFilter,
          type: options.emailType ?? invoiceEmailTypeFilter,
          search: options.emailSearch ?? invoiceSearch,
        }),
      ])
      setInvoiceOverview(overviewResult)
      setInvoiceDocuments(documentsResult.documents)
      setInvoiceDocumentsMeta(documentsResult.meta)
      setInvoiceClients(clientsResult.clients)
      setInvoiceClientsMeta(clientsResult.meta)
      setInvoiceEmailLogs(emailLogsResult.logs)
      setInvoiceEmailLogsMeta(emailLogsResult.meta)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load invoices.')
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

  function notify(text: string) {
    setMessage(text)
    window.setTimeout(() => setMessage(''), 2600)
  }

  async function copyBookingLink(link: string) {
    await navigator.clipboard.writeText(link)
    notify('Booking link copied.')
  }

  function logout() {
    clearAdminToken()
    navigate('/admin/login')
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
    setSettingsForm(result.settings)
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

  function invoiceFormFromSettings(type: 'invoice' | 'quote' | 'receipt' = 'invoice') {
    const enabledGateways = parseInvoiceGatewayList(settingsForm, settingsForm.currency || 'NGN')
    const defaultTaxRate = Number(settingsForm.default_tax_rate || 0)

    return {
      ...emptyInvoiceForm,
      type,
      currency: settingsForm.currency || emptyInvoiceForm.currency,
      paymentGateway: enabledGateways[0] || settingsForm.gateway_active || emptyInvoiceForm.paymentGateway,
      paymentEnabled: (settingsForm.invoicePaymentEnabled ?? 'true') !== 'false',
      serviceOverview: emptyInvoiceForm.serviceOverview,
      scopeOfService: emptyInvoiceForm.scopeOfService,
      notes: settingsForm.invoiceDefaultNotes || emptyInvoiceForm.notes,
      terms: settingsForm.invoiceDefaultTerms || emptyInvoiceForm.terms,
      items: [{ ...emptyInvoiceItem, name: 'Professional Service', unitPrice: 0, taxRate: Number.isFinite(defaultTaxRate) ? defaultTaxRate : 0 }],
      branding: {
        ...emptyInvoiceForm.branding,
        businessName: settingsForm.company_name || emptyInvoiceForm.branding.businessName,
        logoUrl: settingsForm.company_logo || emptyInvoiceForm.branding.logoUrl,
        email: settingsForm.company_email || emptyInvoiceForm.branding.email,
        phone: settingsForm.company_phone || emptyInvoiceForm.branding.phone,
        address: settingsForm.company_address || emptyInvoiceForm.branding.address,
      },
    }
  }

  function updateInvoiceItem(index: number, patch: Partial<InvoiceItem>) {
    setInvoiceForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }))
  }

  async function editInvoice(document: InvoiceDocument) {
    const fullDocument = document.id ? (await api.invoiceDocument(document.id)).document : document
    setEditingInvoice(fullDocument)
    setActiveInvoiceSubsection('create')
    setInvoiceForm({
      ...emptyInvoiceForm,
      ...fullDocument,
      client: fullDocument.client,
      items: fullDocument.items.length ? fullDocument.items : emptyInvoiceForm.items,
      branding: fullDocument.branding,
      paymentGateway: fullDocument.paymentGateway || 'paystack',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetInvoiceForm() {
    setEditingInvoice(null)
    setInvoiceForm(invoiceFormFromSettings(invoiceForm.type === 'quote' ? 'quote' : 'invoice'))
    setActiveInvoiceSubsection(invoiceForm.type === 'quote' ? 'quotes' : 'invoices')
  }

  async function saveInvoiceDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const enabledGatewayValues = parseInvoiceGatewayList(settingsForm, invoiceForm.currency || '')
      const selectedGateway = enabledGatewayValues.includes(invoiceForm.paymentGateway || '')
        ? invoiceForm.paymentGateway
        : enabledGatewayValues[0] || invoiceForm.paymentGateway || ''
      const payload = { ...invoiceForm, paymentGateway: selectedGateway }
      const result = editingInvoice?.id
        ? await api.updateInvoiceDocument(editingInvoice.id, payload)
        : await api.createInvoiceDocument(payload)
      setInvoiceDocuments((current) => {
        const exists = current.some((doc) => doc.id === result.document.id)
        return exists ? current.map((doc) => (doc.id === result.document.id ? result.document : doc)) : [result.document, ...current]
      })
      resetInvoiceForm()
      void loadInvoiceData()
      notify(editingInvoice ? 'Document updated.' : 'Document created.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save document.')
    } finally {
      setSaving(false)
    }
  }

  async function sendInvoiceDocument(document: InvoiceDocument) {
    await api.sendInvoiceDocument(document.id)
    void loadInvoiceData()
    notify('Document sent.')
  }

  async function copyInvoiceLink(document: InvoiceDocument) {
    await navigator.clipboard.writeText(`${window.location.origin}${document.publicUrl}`)
    notify('Public document link copied.')
  }

  async function recordInvoicePayment(invoiceId: string, amountPaid: number, paymentMethod: string, paymentDate: string, notes: string) {
    setSaving(true)
    setError('')
    try {
      // Call payment recording API endpoint
      const response = await api.post(`/invoices/${invoiceId}/payments`, {
        amount: amountPaid,
        method: paymentMethod,
        date: paymentDate,
        notes: notes,
        timestamp: new Date().toISOString()
      })
      
      // Update invoice status to paid if fully paid
      if (editingInvoice) {
        const updatedInvoice = {
          ...editingInvoice,
          status: amountPaid >= editingInvoice.total ? 'paid' : 'partial',
          updatedAt: new Date().toISOString()
        }
        setEditingInvoice(updatedInvoice)
      }

      // Generate and send receipt automatically
      await generateReceiptAndNotify(invoiceId, amountPaid, paymentMethod, paymentDate)
      
      notify('Payment recorded successfully. Receipt generated and sent.')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to record payment.')
    } finally {
      setSaving(false)
    }
  }

  async function generateReceiptAndNotify(invoiceId: string, amountPaid: number, paymentMethod: string, paymentDate: string) {
    try {
      // Generate receipt
      const receiptData = {
        invoiceId,
        amountPaid,
        paymentMethod,
        paymentDate,
        generatedAt: new Date().toISOString(),
        businessName: settingsForm.company_name || 'Your Business',
        businessEmail: settingsForm.company_email || '',
        businessPhone: settingsForm.company_phone || '',
      }

      // Send receipt via email and SMS if applicable
      await api.post(`/invoices/${invoiceId}/send-receipt`, {
        ...receiptData,
        sendEmail: true,
        recipient: editingInvoice?.client.email
      })

      notify('Receipt sent to client via email.')
    } catch (error) {
      console.error('Error generating/sending receipt:', error)
      setError('Receipt generated but failed to send via email.')
    }
  }

  async function handleImportFromJSON(file: File) {
    setSaving(true)
    setError('')
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string
          const data = JSON.parse(content)
          await api.importFromJSON(data)
          setMessage('Import completed successfully')
          await loadInvoiceData()
        } catch (parseError) {
          setError('Invalid JSON file')
        } finally {
          setSaving(false)
        }
      }
      reader.readAsText(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
      setSaving(false)
    }
  }

  async function handleImportFromWordPress(prefix?: string) {
    setSaving(true)
    setError('')
    try {
      const result = await api.importFromWordPress(prefix)
      setMessage(result.message)
      await loadInvoiceData()
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Import failed')
    } finally {
      setSaving(false)
    }
  }

  function renderInvoiceSubsections() {
    const subsections: Array<{ id: InvoiceSubsection; label: string; icon: typeof Gauge }> = [
      { id: 'dashboard', label: 'Dashboard', icon: Gauge },
      { id: 'invoices', label: 'Invoices', icon: InvoiceIcon },
      { id: 'quotes', label: 'Quotes', icon: QuoteIcon },
      { id: 'receipts', label: 'Receipts', icon: CreditCard },
      { id: 'emails', label: 'Emails', icon: Mail },
      { id: 'contacts', label: 'Contacts', icon: Users },
      { id: 'import', label: 'Import', icon: Upload },
      { id: 'settings', label: 'Settings', icon: Settings },
    ]
    return (
      <div className="bkinv-admin-tabs">
        <nav>
          {subsections.map((subsection) => {
            const TabIcon = subsection.icon
            return (
            <button
              key={subsection.id}
              type="button"
              onClick={() => {
                setActiveInvoiceSubsection(subsection.id)
                if (['invoices', 'quotes', 'receipts'].includes(subsection.id)) setInvoiceListPage(1)
                if (subsection.id === 'emails') setInvoiceEmailLogsPage(1)
                if (subsection.id === 'contacts') setInvoiceClientsPage(1)
                setEditingInvoice(null)
              }}
              className={cn(
                "bkinv-admin-tab",
                activeInvoiceSubsection === subsection.id
                  ? "is-active"
                  : ""
              )}
            >
              <TabIcon className="h-4 w-4" />
              {subsection.label}
            </button>
            )
          })}
        </nav>
      </div>
    )
  }

  function renderPagination(meta: InvoiceListMeta, onPage: (page: number) => void) {
    const from = meta.total === 0 ? 0 : ((meta.page - 1) * meta.perPage) + 1
    const to = Math.min(meta.total, meta.page * meta.perPage)

    return (
      <div className="bkinv-pagination">
        <span>{from}-{to} of {meta.total}</span>
        <div>
          <Button type="button" variant="ghost" className="bkinv-btn bkinv-btn-secondary" disabled={meta.page <= 1} onClick={() => onPage(Math.max(1, meta.page - 1))}>
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <Button type="button" variant="ghost" className="bkinv-btn bkinv-btn-secondary" disabled={meta.page >= meta.lastPage} onClick={() => onPage(Math.min(meta.lastPage, meta.page + 1))}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  async function previewInvoiceEmail(log: InvoiceEmailLog) {
    setSelectedEmailLog(log)
    try {
      const result = await api.invoiceEmailLog(log.id)
      setSelectedEmailLog(result.log)
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : 'Unable to load email preview.')
    }
  }

  function renderInvoiceEmails() {
    const sentCount = invoiceEmailLogs.filter((log) => log.status === 'sent').length
    const openedCount = invoiceEmailLogs.filter((log) => log.openedAt).length
    const failedCount = invoiceEmailLogs.filter((log) => log.status === 'failed').length
    const formatDateTime = (value: string) => value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : ''

    return (
      <div className="bkinv-email-workspace">
        <section className="bkinv-email-hero">
          <div>
            <p className="bkinv-section-kicker">Client communications</p>
            <h3>Email Notifications</h3>
            <p>Track every quote, invoice, and receipt email from delivery through first open, with a saved preview of the exact message sent.</p>
          </div>
          <Button type="button" variant="ghost" className="bkinv-btn bkinv-btn-secondary" onClick={() => void loadInvoiceData()}>
            <SearchCheck className="h-4 w-4" /> Refresh logs
          </Button>
        </section>

        <div className="bkinv-email-metrics">
          {[
            { label: 'Sent emails', value: sentCount, detail: `${invoiceEmailLogs.length} total notifications` },
            { label: 'Opened', value: openedCount, detail: 'First open recorded from the tracking pixel' },
            { label: 'Failed', value: failedCount, detail: 'SMTP or provider issues to resolve' },
          ].map((card) => (
            <div key={card.label} className="bkinv-email-metric">
              <p className="bkinv-section-kicker">{card.label}</p>
              <h3>{card.value}</h3>
              <span>{card.detail}</span>
            </div>
          ))}
        </div>

        <div className="bkinv-email-grid">
          <section className="bkinv-email-list-panel">
            <div className="bkinv-email-panel-head">
              <div>
                <p className="bkinv-section-kicker">Activity stream</p>
                <h3>Notifications sent to clients</h3>
              </div>
              <span>{invoiceEmailLogsMeta.total} records</span>
            </div>
            <div className="bkinv-list-tools">
              <label className="bkinv-search-field">
                <Search className="h-4 w-4" />
                <input
                  type="search"
                  value={invoiceSearch}
                  onChange={(event) => setInvoiceSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      setInvoiceEmailLogsPage(1)
                      void loadInvoiceData({ emailPage: 1, emailSearch: invoiceSearch })
                    }
                  }}
                  placeholder="Search recipient, subject, document..."
                />
              </label>
              <select className="bkinv-select max-w-[170px]" value={invoiceEmailStatusFilter} onChange={(event) => { setInvoiceEmailLogsPage(1); setInvoiceEmailStatusFilter(event.target.value) }}>
                <option value="">All statuses</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="queued">Queued</option>
                <option value="logged">Logged</option>
              </select>
              <select className="bkinv-select max-w-[170px]" value={invoiceEmailTypeFilter} onChange={(event) => { setInvoiceEmailLogsPage(1); setInvoiceEmailTypeFilter(event.target.value) }}>
                <option value="">All types</option>
                <option value="invoice">Invoices</option>
                <option value="quote">Quotes</option>
                <option value="receipt">Receipts</option>
              </select>
              <Button type="button" variant="ghost" className="bkinv-btn bkinv-btn-secondary" onClick={() => { setInvoiceEmailLogsPage(1); void loadInvoiceData({ emailPage: 1, emailSearch: invoiceSearch }) }}>
                <SearchCheck className="h-4 w-4" /> Apply
              </Button>
              <Button type="button" variant="ghost" className="bkinv-btn bkinv-btn-secondary" onClick={() => { setInvoiceEmailLogsPage(1); setInvoiceSearch(''); setInvoiceEmailStatusFilter(''); setInvoiceEmailTypeFilter('') }}>
                <X className="h-4 w-4" /> Reset
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="bkinv-btn bkinv-btn-secondary"
                onClick={async () => {
                  if (!confirm('Clear email logs for the current filters? This cannot be undone.')) return
                  const result = await api.clearInvoiceEmailLogs({ status: invoiceEmailStatusFilter || undefined, type: invoiceEmailTypeFilter || undefined })
                  notify(`${result.deleted} email logs cleared.`)
                  setSelectedEmailLog(null)
                  setInvoiceEmailLogsPage(1)
                  void loadInvoiceData({ emailPage: 1 })
                }}
              >
                <Trash2 className="h-4 w-4" /> Clear logs
              </Button>
            </div>

            <div className="bkinv-email-log-list">
              {invoiceEmailLogs.map((log) => (
                <button
                  key={log.id}
                  type="button"
                  className={cn('bkinv-email-log-row', selectedEmailLog?.id === log.id && 'is-selected')}
                  onClick={() => void previewInvoiceEmail(log)}
                >
                  <span className="bkinv-email-avatar">{(log.clientName || log.recipientEmail || '?').slice(0, 1).toUpperCase()}</span>
                  <span className="bkinv-email-main">
                    <strong>{log.clientName || log.recipientEmail}</strong>
                    <span>{log.recipientEmail}</span>
                    <em>{log.subject}</em>
                  </span>
                  <span className="bkinv-email-doc">
                    <strong>{log.documentNumber}</strong>
                    <span>{log.documentType}</span>
                  </span>
                  <span className="bkinv-email-times">
                    <span>{formatDateTime(log.sentAt) || 'Not sent'}</span>
                    <span>{formatDateTime(log.openedAt) || 'Waiting'}</span>
                  </span>
                  <span className={cn('bkinv-email-status', `is-${log.status}`)}>{log.status}</span>
                  <span className="bkinv-email-preview" title="Preview email"><Eye className="h-4 w-4" /></span>
                </button>
              ))}
              {!invoiceEmailLogs.length ? (
                <div className="bkinv-email-empty">No email notifications have been logged yet.</div>
              ) : null}
            </div>
            {renderPagination(invoiceEmailLogsMeta, setInvoiceEmailLogsPage)}
          </section>

          <aside className="bkinv-email-preview-panel">
            <div className="bkinv-email-panel-head">
              <div>
                <p className="bkinv-section-kicker">Preview</p>
                <h3>{selectedEmailLog ? selectedEmailLog.documentNumber : 'Select an email'}</h3>
              </div>
            </div>
            {selectedEmailLog ? (
              <div className="bkinv-email-preview-stack">
                <div className="bkinv-email-preview-meta">
                  <strong>{selectedEmailLog.subject}</strong>
                  <span>To: {selectedEmailLog.recipientEmail}</span>
                  <span>Sent: {formatDateTime(selectedEmailLog.sentAt) || 'Not sent'} · Opened: {formatDateTime(selectedEmailLog.openedAt) || 'Waiting'}</span>
                  {selectedEmailLog.errorMessage ? <em>{selectedEmailLog.errorMessage}</em> : null}
                </div>
                <iframe
                  title="Email preview"
                  className="bkinv-email-iframe"
                  srcDoc={selectedEmailLog.bodyHtml || '<p style="font-family:sans-serif;padding:24px">Preview body is not available for this older log.</p>'}
                />
              </div>
            ) : (
              <div className="bkinv-email-preview-empty">
                Choose an email log to preview the rendered notification.
              </div>
            )}
          </aside>
        </div>
      </div>
    )
  }

  function renderInvoiceDashboard() {
    const currency = invoiceOverview?.revenue.currency ?? 'NGN'
    const invoices = invoiceDocuments.filter((doc) => doc.type === 'invoice')
    const quotes = invoiceDocuments.filter((doc) => doc.type === 'quote')
    const pendingInvoices = invoices.filter((doc) => ['sent', 'viewed', 'partial'].includes(doc.status))
    const overdueInvoices = invoices.filter((doc) => doc.status === 'overdue')
    const draftQuotes = quotes.filter((doc) => doc.status === 'draft')
    const recentInvoices = invoices.slice(0, 5)
    const recentQuotes = quotes.slice(0, 5)
    const totalDocuments = invoices.length + quotes.length
    const outstanding = invoiceOverview?.revenue.outstanding ?? invoiceDocuments.reduce((sum, doc) => sum + (doc.status === 'paid' ? 0 : doc.balanceDue), 0)
    const viewedDocuments = invoiceDocuments.filter((doc) => (doc.analytics?.totalViews ?? 0) > 0).length
    const conversionRate = invoiceOverview?.conversion.viewToPaymentClickRate ?? 0
    const workQueue = invoiceDocuments
      .filter((doc) => ['draft', 'sent', 'viewed', 'overdue', 'accepted'].includes(doc.status))
      .slice(0, 8)
    const statusBuckets = [
      { label: 'Draft', count: invoiceDocuments.filter((doc) => doc.status === 'draft').length, tone: 'neutral' },
      { label: 'Sent', count: invoiceDocuments.filter((doc) => doc.status === 'sent').length, tone: 'primary' },
      { label: 'Viewed', count: invoiceDocuments.filter((doc) => doc.status === 'viewed').length, tone: 'warning' },
      { label: 'Paid / Accepted', count: invoiceDocuments.filter((doc) => ['paid', 'accepted'].includes(doc.status)).length, tone: 'success' },
      { label: 'Overdue / Rejected', count: invoiceDocuments.filter((doc) => ['overdue', 'rejected'].includes(doc.status)).length, tone: 'danger' },
    ]
    const kpis = [
      {
        label: 'Total Revenue',
        value: invoiceMoney(invoiceOverview?.revenue.paid ?? 0, currency),
        detail: 'All time paid invoices',
        icon: TrendingUp,
        tone: 'primary',
      },
      {
        label: 'Pending',
        value: pendingInvoices.length,
        detail: invoiceMoney(pendingInvoices.reduce((sum, doc) => sum + doc.balanceDue, 0), currency),
        icon: CalendarDays,
        tone: 'warning',
      },
      {
        label: 'Paid',
        value: invoiceOverview?.totals.paid ?? 0,
        detail: invoiceMoney(invoiceOverview?.revenue.paid ?? 0, currency),
        icon: SearchCheck,
        tone: 'success',
      },
      {
        label: 'Overdue',
        value: overdueInvoices.length,
        detail: invoiceMoney(overdueInvoices.reduce((sum, doc) => sum + doc.balanceDue, 0), currency),
        icon: Bell,
        tone: 'danger',
      },
      {
        label: 'Draft Quotes',
        value: draftQuotes.length,
        detail: `${quotes.length} total quotes`,
        icon: QuoteIcon,
        tone: 'neutral',
      },
    ]

    return (
      <div className="bkinv-dashboard-shell">
        <div className="bkinv-admin-hero bkinv-admin-hero-pro">
          <div>
            <p className="bkinv-section-kicker">InvoicePay backend</p>
            <h3>Invoices & Quotes Dashboard</h3>
            <p>Track revenue, quote conversion, client activity, and pending document work from one operational workspace.</p>
          </div>
          <div className="bkinv-admin-hero-actions">
            <Button
              type="button"
              className="bkinv-btn bkinv-btn-primary"
              onClick={() => {
                setEditingInvoice(null)
                setInvoiceForm(invoiceFormFromSettings('invoice'))
                setActiveInvoiceSubsection('create')
              }}
            >
              <Plus className="h-4 w-4" />
              New Invoice
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="bkinv-btn bkinv-btn-secondary"
              onClick={() => {
                setEditingInvoice(null)
                setInvoiceForm(invoiceFormFromSettings('quote'))
                setActiveInvoiceSubsection('create')
              }}
            >
              <Plus className="h-4 w-4" />
              New Quote
            </Button>
          </div>
        </div>

        <section className="bkinv-ops-grid">
          <div className="bkinv-ops-card is-strong">
            <span>Total documents</span>
            <strong>{totalDocuments.toLocaleString()}</strong>
            <p>{invoices.length.toLocaleString()} invoices · {quotes.length.toLocaleString()} quotes</p>
          </div>
          <div className="bkinv-ops-card">
            <span>Outstanding</span>
            <strong>{invoiceMoney(outstanding, currency)}</strong>
            <p>Open balances across sent, viewed, and overdue documents.</p>
          </div>
          <div className="bkinv-ops-card">
            <span>Engagement</span>
            <strong>{viewedDocuments.toLocaleString()}</strong>
            <p>{conversionRate}% view-to-payment click rate</p>
          </div>
          <div className="bkinv-ops-card">
            <span>Contacts</span>
            <strong>{invoiceClients.length.toLocaleString()}</strong>
            <p>Clients available for invoices and quotes.</p>
          </div>
        </section>

        <div className="bkinv-kpi-grid">
          {kpis.map((stat) => {
            const KpiIcon = stat.icon
            return (
              <div key={stat.label} className={cn('bkinv-kpi-card', `bkinv-kpi-${stat.tone}`)}>
                <div className="bkinv-kpi-icon"><KpiIcon className="h-7 w-7" /></div>
                <div className="bkinv-kpi-content">
                  <h3>{stat.label}</h3>
                  <p className="bkinv-kpi-value">{stat.value}</p>
                  <span className="bkinv-kpi-label">{stat.detail}</span>
                </div>
              </div>
            )
          })}
        </div>

        <section className="bkinv-workspace-grid">
          <div className="bkinv-work-card">
            <div className="bkinv-work-card-head">
              <div>
                <h2>Status pipeline</h2>
                <p>Compact health check for high document volume.</p>
              </div>
              <Button type="button" variant="ghost" className="bkinv-btn bkinv-btn-secondary" onClick={() => setActiveInvoiceSubsection('invoices')}>
                View list
              </Button>
            </div>
            <div className="bkinv-pipeline-list">
              {statusBuckets.map((bucket) => (
                <div key={bucket.label} className={`bkinv-pipeline-row is-${bucket.tone}`}>
                  <span>{bucket.label}</span>
                  <strong>{bucket.count.toLocaleString()}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="bkinv-work-card">
            <div className="bkinv-work-card-head">
              <div>
                <h2>Work queue</h2>
                <p>Documents that need attention first.</p>
              </div>
              <Button type="button" variant="ghost" className="bkinv-btn bkinv-btn-secondary" onClick={() => setActiveInvoiceSubsection('quotes')}>
                Quotes
              </Button>
            </div>
            <div className="bkinv-queue-list">
              {workQueue.length ? workQueue.map((doc) => (
                <button key={`queue-${doc.id}`} type="button" className="bkinv-queue-row" onClick={() => void editInvoice(doc)}>
                  <span className={`bkinv-status-${doc.status}`}>{doc.status}</span>
                  <div>
                    <strong>{doc.number}</strong>
                    <p>{doc.client.name || doc.client.email || 'No client'}</p>
                  </div>
                  <b>{invoiceMoney(doc.balanceDue || doc.total, doc.currency)}</b>
                </button>
              )) : <p className="bkinv-empty-state">No pending document work.</p>}
            </div>
          </div>
        </section>

        <div className="bkinv-stats-grid">
          {[
            { title: 'Recent Invoices', docs: recentInvoices, action: 'View All Invoices' as const, target: 'invoices' as const },
            { title: 'Recent Quotes', docs: recentQuotes, action: 'View All Quotes' as const, target: 'quotes' as const },
          ].map((group) => (
            <div key={group.title} className="bkinv-stats-card">
              <h2>{group.title}</h2>
              {group.docs.length ? (
                <div className="bkinv-recent-list">
                  {group.docs.map((doc) => (
                    <button key={doc.id} type="button" className="bkinv-recent-item text-left" onClick={() => void editInvoice(doc)}>
                      <div className="bkinv-recent-main">
                        <strong>{doc.number}</strong>
                        <span className="bkinv-recent-client">{doc.client.name || doc.client.email || 'No client'}</span>
                      </div>
                      <div className="bkinv-recent-meta">
                        <span className={`bkinv-status-${doc.status}`}>{doc.status}</span>
                        <strong>{invoiceMoney(doc.total, doc.currency)}</strong>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="bkinv-empty-state">No {group.target} yet.</p>
              )}
              <button type="button" className="bkinv-view-all" onClick={() => setActiveInvoiceSubsection(group.target)}>{group.action}</button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  function renderInvoiceListView(type: 'invoice' | 'quote' | 'receipt') {
    const statuses = ['', 'draft', 'sent', 'viewed', 'accepted', 'rejected', 'paid', 'partial', 'overdue', 'cancelled']
    const filteredDocuments = invoiceDocuments.filter(doc => doc.type === type)
    const TypeLabel = type === 'invoice' ? 'Invoice' : type === 'quote' ? 'Quote' : 'Receipt'
    const IconComponent = type === 'invoice' ? InvoiceIcon : type === 'quote' ? QuoteIcon : CreditCard

    return (
      <div className="bkinv-list-shell">
        <div className="bkinv-list-header">
          <div>
            <h3>{TypeLabel}s</h3>
            <p>{invoiceDocumentsMeta.total} {TypeLabel.toLowerCase()}s found</p>
          </div>
          <Button
            type="button"
            className="bkinv-btn bkinv-btn-primary"
            onClick={() => {
              setEditingInvoice(null)
              setInvoiceForm(invoiceFormFromSettings(type))
              setActiveInvoiceSubsection('create')
            }}
          >
            <Plus className="h-4 w-4" />
            New {TypeLabel}
          </Button>
        </div>

        <div className="bkinv-list-tools">
          <label className="bkinv-search-field">
            <Search className="h-4 w-4" />
            <input
              type="search"
              value={invoiceSearch}
              onChange={(event) => setInvoiceSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  setInvoiceListPage(1)
                  void loadInvoiceData({ documentPage: 1, documentType: type, documentSearch: invoiceSearch })
                }
              }}
              placeholder="Search number, client, email..."
            />
          </label>
          <select value={invoiceStatusFilter} onChange={(event) => { setInvoiceListPage(1); setInvoiceStatusFilter(event.target.value) }} className="bkinv-select max-w-[180px]">
            <option value="">All statuses</option>
            {statuses.filter(Boolean).map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}
          </select>
          <Button type="button" variant="ghost" className="bkinv-btn bkinv-btn-secondary" onClick={() => { setInvoiceListPage(1); void loadInvoiceData({ documentPage: 1, documentType: type, documentSearch: invoiceSearch }) }}>
            <SearchCheck className="h-4 w-4" /> Apply
          </Button>
          {(invoiceSearch || invoiceStatusFilter) ? (
            <Button type="button" variant="ghost" className="bkinv-btn bkinv-btn-secondary" onClick={() => { setInvoiceListPage(1); setInvoiceSearch(''); setInvoiceStatusFilter('') }}>
              <X className="h-4 w-4" /> Reset
            </Button>
          ) : null}
        </div>

        <div className="bkinv-list-card">
          <div className="overflow-x-auto">
            <table className="bkinv-admin-table">
              <thead>
                <tr>
                  <th><span className="inline-flex items-center gap-2"><IconComponent className="h-4 w-4" />Number</span></th>
                  <th>Client</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Views</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map(doc => (
                  <tr key={doc.id}>
                    <td>
                      <button type="button" className="font-black text-blue-700 hover:underline" onClick={() => void editInvoice(doc)}>{doc.number}</button>
                    </td>
                    <td>
                      <div>
                        <p className="font-semibold text-gray-900">{doc.client.name || 'No client'}</p>
                        <p className="text-xs text-gray-500">{doc.client.email}</p>
                      </div>
                    </td>
                    <td>
                      {doc.issueDate ? new Date(doc.issueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'}
                    </td>
                    <td>
                      <span className="font-black text-gray-900">{invoiceMoney(doc.total, doc.currency)}</span>
                    </td>
                    <td>
                      {doc.analytics?.totalViews ?? 0}
                    </td>
                    <td>
                      <span className={`bkinv-status-${doc.status}`}>{doc.status}</span>
                    </td>
                    <td>
                      <div className="bkinv-row-actions">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="bkinv-action-btn"
                          onClick={() => void editInvoice(doc)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="bkinv-action-btn"
                          onClick={() => window.open(doc.publicUrl, '_blank')}
                          title="View public page"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="bkinv-action-btn"
                          onClick={() => void copyInvoiceLink(doc)}
                          title="Copy link"
                        >
                          <Link2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="bkinv-action-btn"
                          onClick={() => void sendInvoiceDocument(doc)}
                          title="Mark sent/log email"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredDocuments.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <div className="bkinv-list-empty">
                        <IconComponent className="h-12 w-12" />
                        <p>No {TypeLabel.toLowerCase()}s match this view</p>
                        <span>Create a new {TypeLabel.toLowerCase()} or adjust the filters.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {renderPagination(invoiceDocumentsMeta, setInvoiceListPage)}
        </div>

        <div className="bkinv-mobile-docs">
          {filteredDocuments.map((doc) => (
            <article key={`mobile-${doc.id}`} className="bkinv-mobile-doc-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <button type="button" className="text-lg font-black text-blue-700" onClick={() => void editInvoice(doc)}>{doc.number}</button>
                  <p className="text-sm text-gray-500">{doc.client.name || doc.client.email || 'No client'}</p>
                </div>
                <span className={`bkinv-status-${doc.status}`}>{doc.status}</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <div><span>Date</span><b>{doc.issueDate || 'Not set'}</b></div>
                <div><span>Views</span><b>{doc.analytics?.totalViews ?? 0}</b></div>
                <div><span>Total</span><b>{invoiceMoney(doc.total, doc.currency)}</b></div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="ghost" className="bkinv-btn bkinv-btn-secondary" onClick={() => void editInvoice(doc)}><Pencil className="h-4 w-4" />Edit</Button>
                <Button variant="ghost" className="bkinv-btn bkinv-btn-secondary" onClick={() => window.open(doc.publicUrl, '_blank')}><Eye className="h-4 w-4" />View</Button>
                <Button variant="ghost" className="bkinv-btn bkinv-btn-secondary" onClick={() => void copyInvoiceLink(doc)}><Link2 className="h-4 w-4" />Copy</Button>
              </div>
            </article>
          ))}
          {renderPagination(invoiceDocumentsMeta, setInvoiceListPage)}
        </div>
      </div>
    )
  }

  function renderInvoiceCreateOrEdit() {
    const totals = invoicePreviewTotals(invoiceForm.items)
    const currencies = ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR']
    const isEdit = !!editingInvoice
    const documentLabel = invoiceForm.type === 'quote' ? 'Quote' : invoiceForm.type === 'receipt' ? 'Receipt' : 'Invoice'
    const enabledGatewayValues = parseInvoiceGatewayList(settingsForm, invoiceForm.currency || '')
    const availableGateways = invoicePaymentGateways.filter((gateway) => enabledGatewayValues.includes(gateway.value))
    const selectedGateway = availableGateways.some((gateway) => gateway.value === invoiceForm.paymentGateway)
      ? invoiceForm.paymentGateway
      : availableGateways[0]?.value || invoiceForm.paymentGateway || ''
    const gatewayChoices = selectedGateway && !availableGateways.some((gateway) => gateway.value === selectedGateway)
      ? [...availableGateways, invoicePaymentGateways.find((gateway) => gateway.value === selectedGateway)].filter(Boolean)
      : availableGateways
    const lineTotal = (item: InvoiceItem) => {
      const base = Number(item.quantity || 0) * Number(item.unitPrice || 0)
      const discount = base * (Number(item.discountRate || 0) / 100)
      const taxable = Math.max(0, base - discount)
      const tax = taxable * (Number(item.taxRate || 0) / 100)
      return taxable + tax
    }
    const fieldClass = 'bkinv-input'

    return (
      <div className="bkinv-edit-screen">
        <div className="bkinv-edit-hero">
          <div className="bkinv-edit-hero-copy">
            <Button
              variant="ghost"
              size="icon"
              className="bkinv-back-button"
              onClick={() => {
                setEditingInvoice(null)
                setActiveInvoiceSubsection(invoiceForm.type === 'quote' ? 'quotes' : 'invoices')
              }}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <p className="bkinv-section-kicker">{isEdit ? 'Edit document' : 'Create document'}</p>
              <h3 className="bkinv-page-title">
                {isEdit ? `Edit ${documentLabel}` : `New ${documentLabel}`}
                {isEdit && invoiceForm.number ? <span className="bkinv-saved-indicator">{invoiceForm.number}</span> : null}
              </h3>
              <p className="bkinv-edit-subtitle">Build a polished invoice or quote with client details, line items, payment routing, and public document settings.</p>
            </div>
          </div>
          <div className="bkinv-edit-actions">
            <Button
              type="button"
              variant="ghost"
              className="bkinv-btn bkinv-btn-secondary"
              onClick={resetInvoiceForm}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bkinv-btn bkinv-btn-primary"
              onClick={() => void saveInvoiceDocument({ preventDefault: () => { } } as FormEvent)}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>

        <div className="bkinv-form-layout">
          <div className="bkinv-form-main">
            {/* Client Information */}
            <div className="bkinv-card">
              <div className="bkinv-card-header">
                <Users className="h-5 w-5" />
                <h2>Client Information</h2>
              </div>
              <div className="bkinv-card-body">
                <div className="bkinv-alert bkinv-alert-info">
                  Client details are stored as contacts and reused across invoices and quotes.
                </div>
                <div className="bkinv-form-row bkinv-row-2">
                  <label className="bkinv-form-group">
                    <span>Client Name <span className="required">*</span></span>
                    <input
                      type="text"
                      className={fieldClass}
                      value={invoiceForm.client.name}
                      onChange={(e) => setInvoiceForm(prev => ({ ...prev, client: { ...prev.client, name: e.target.value } }))}
                      required
                    />
                  </label>
                  <label className="bkinv-form-group">
                    <span>Company</span>
                    <input
                      type="text"
                      className={fieldClass}
                      value={invoiceForm.client.companyName}
                      onChange={(e) => setInvoiceForm(prev => ({ ...prev, client: { ...prev.client, companyName: e.target.value } }))}
                    />
                  </label>
                </div>
                <div className="bkinv-form-row bkinv-row-2">
                  <label className="bkinv-form-group">
                    <span>Email</span>
                    <input
                      type="email"
                      className={fieldClass}
                      value={invoiceForm.client.email}
                      onChange={(e) => setInvoiceForm(prev => ({ ...prev, client: { ...prev.client, email: e.target.value } }))}
                    />
                  </label>
                  <label className="bkinv-form-group">
                    <span>Phone</span>
                    <input
                      type="tel"
                      className={fieldClass}
                      value={invoiceForm.client.phone}
                      onChange={(e) => setInvoiceForm(prev => ({ ...prev, client: { ...prev.client, phone: e.target.value } }))}
                    />
                  </label>
                </div>
                <label className="bkinv-form-group">
                  <span>Address</span>
                  <textarea
                    className="bkinv-textarea"
                    rows={3}
                    value={invoiceForm.client.address}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, client: { ...prev.client, address: e.target.value } }))}
                  />
                </label>
              </div>
            </div>

            <div className="bkinv-card">
              <div className="bkinv-card-header">
                <FileText className="h-5 w-5" />
                <h2>Service Details</h2>
              </div>
              <div className="bkinv-card-body grid gap-5">
                <div className="bkinv-form-group">
                  <span>Service Overview</span>
                  <RichTextEditor
                    value={invoiceForm.serviceOverview}
                    onChange={(value) => setInvoiceForm(prev => ({ ...prev, serviceOverview: value }))}
                    placeholder="Give the client a short overview of the service."
                  />
                </div>
                <div className="bkinv-form-group">
                  <span>Scope of Service</span>
                  <RichTextEditor
                    value={invoiceForm.scopeOfService}
                    onChange={(value) => setInvoiceForm(prev => ({ ...prev, scopeOfService: value }))}
                    placeholder="List what is included in this document."
                  />
                </div>
              </div>
            </div>

            <div className="bkinv-card">
              <div className="bkinv-card-header">
                <FileText className="h-5 w-5" />
                <h2>Notes & Terms</h2>
              </div>
              <div className="bkinv-card-body grid gap-5">
                <div className="bkinv-form-group">
                  <span>Notes</span>
                  <RichTextEditor
                    value={invoiceForm.notes}
                    onChange={(value) => setInvoiceForm(prev => ({ ...prev, notes: value }))}
                    placeholder="Add optional notes for this document."
                  />
                </div>
                <div className="bkinv-form-group">
                  <span>Terms</span>
                  <RichTextEditor
                    value={invoiceForm.terms}
                    onChange={(value) => setInvoiceForm(prev => ({ ...prev, terms: value }))}
                    placeholder="Add payment terms or document terms."
                  />
                </div>
              </div>
            </div>

            <div className="bkinv-card">
              <div className="bkinv-card-header">
                <CreditCard className="h-5 w-5" />
                <h2>Line Items</h2>
              </div>
              <div className="bkinv-card-body">
                {/* Desktop table view */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="bkinv-line-items-table min-w-[920px]">
                    <thead>
                      <tr>
                        <th style={{ width: '34%' }}>Item</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Discount %</th>
                        <th>Tax %</th>
                        <th>Total</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceForm.items.map((item, index) => (
                        <tr key={index} className="line-item-row">
                          <td>
                            <input
                              className="bkinv-input item-name"
                              placeholder="Item name"
                              value={item.name}
                              onChange={(e) => updateInvoiceItem(index, { name: e.target.value })}
                              required
                            />
                            <textarea
                              className="bkinv-textarea item-description"
                              rows={2}
                              placeholder="Description (optional)"
                              value={item.description}
                              onChange={(e) => updateInvoiceItem(index, { description: e.target.value })}
                            />
                          </td>
                          <td>
                            <input type="number" min="0" step="0.01" className="bkinv-input" value={item.quantity} onChange={(e) => updateInvoiceItem(index, { quantity: Number(e.target.value) })} />
                          </td>
                          <td>
                            <input type="number" min="0" step="0.01" className="bkinv-input" value={item.unitPrice} onChange={(e) => updateInvoiceItem(index, { unitPrice: Number(e.target.value) })} />
                          </td>
                          <td>
                            <input type="number" min="0" max="100" step="0.01" className="bkinv-input" value={item.discountRate} onChange={(e) => updateInvoiceItem(index, { discountRate: Number(e.target.value) })} />
                          </td>
                          <td>
                            <input type="number" min="0" max="100" step="0.01" className="bkinv-input" value={item.taxRate} onChange={(e) => updateInvoiceItem(index, { taxRate: Number(e.target.value) })} />
                          </td>
                          <td>
                            <input className="bkinv-input item-total" readOnly value={invoiceMoney(lineTotal(item), invoiceForm.currency)} />
                          </td>
                          <td className="text-center">
                            <button
                              type="button"
                              className="bkinv-btn-icon bkinv-btn-danger"
                              onClick={() => setInvoiceForm(prev => ({
                                ...prev,
                                items: prev.items.length > 1 ? prev.items.filter((_, i) => i !== index) : [{ ...emptyInvoiceItem }]
                              }))}
                              title="Remove item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={7}>
                          <Button
                            variant="ghost"
                            type="button"
                            className="bkinv-btn bkinv-btn-secondary"
                            onClick={() => setInvoiceForm(prev => ({ ...prev, items: [...prev.items, { ...emptyInvoiceItem }] }))}
                          >
                            <Plus className="h-4 w-4" />
                            Add Item
                          </Button>
                        </td>
                      </tr>
                      <tr className="bkinv-totals-row">
                        <td colSpan={5} className="text-right">Subtotal:</td>
                        <td><input className="bkinv-input bkinv-total-display" readOnly value={invoiceMoney(totals.subtotal, invoiceForm.currency)} /></td>
                        <td></td>
                      </tr>
                      <tr className="bkinv-totals-row">
                        <td colSpan={5} className="text-right">Total Discount:</td>
                        <td><input className="bkinv-input bkinv-total-display" readOnly value={invoiceMoney(totals.discount, invoiceForm.currency)} /></td>
                        <td></td>
                      </tr>
                      <tr className="bkinv-totals-row">
                        <td colSpan={5} className="text-right">Tax:</td>
                        <td><input className="bkinv-input bkinv-total-display" readOnly value={invoiceMoney(totals.tax, invoiceForm.currency)} /></td>
                        <td></td>
                      </tr>
                      <tr className="bkinv-totals-row bkinv-grand-total">
                        <td colSpan={5} className="text-right">TOTAL:</td>
                        <td><input className="bkinv-input bkinv-total-display" readOnly value={invoiceMoney(totals.total, invoiceForm.currency)} /></td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Mobile card view with labels */}
                <div className="md:hidden space-y-4">
                  {invoiceForm.items.map((item, index) => (
                    <div key={index} className="bkinv-card-body space-y-3" style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '16px' }}>
                      <div>
                        <label className="block text-sm font-semibold mb-2">Item Name</label>
                        <input
                          className="bkinv-input w-full"
                          placeholder="Item name"
                          value={item.name}
                          onChange={(e) => updateInvoiceItem(index, { name: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2">Description</label>
                        <textarea
                          className="bkinv-textarea w-full"
                          rows={2}
                          placeholder="Description (optional)"
                          value={item.description}
                          onChange={(e) => updateInvoiceItem(index, { description: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold mb-1.5">Quantity</label>
                          <input type="number" min="0" step="0.01" className="bkinv-input w-full" placeholder="Qty" value={item.quantity} onChange={(e) => updateInvoiceItem(index, { quantity: Number(e.target.value) })} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1.5">Unit Price</label>
                          <input type="number" min="0" step="0.01" className="bkinv-input w-full" placeholder="Price" value={item.unitPrice} onChange={(e) => updateInvoiceItem(index, { unitPrice: Number(e.target.value) })} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold mb-1.5">Discount %</label>
                          <input type="number" min="0" max="100" step="0.01" className="bkinv-input w-full" placeholder="Discount %" value={item.discountRate} onChange={(e) => updateInvoiceItem(index, { discountRate: Number(e.target.value) })} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1.5">Tax %</label>
                          <input type="number" min="0" max="100" step="0.01" className="bkinv-input w-full" placeholder="Tax %" value={item.taxRate} onChange={(e) => updateInvoiceItem(index, { taxRate: Number(e.target.value) })} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                        <div>
                          <label className="block text-xs font-semibold mb-1.5">Total</label>
                          <input className="bkinv-input w-full" readOnly value={invoiceMoney(lineTotal(item), invoiceForm.currency)} />
                        </div>
                        <div className="flex items-end justify-end">
                          <button
                            type="button"
                            className="bkinv-btn-icon bkinv-btn-danger h-10 w-10 flex items-center justify-center"
                            onClick={() => setInvoiceForm(prev => ({
                              ...prev,
                              items: prev.items.length > 1 ? prev.items.filter((_, i) => i !== index) : [{ ...emptyInvoiceItem }]
                            }))}
                            title="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    type="button"
                    className="bkinv-btn bkinv-btn-secondary w-full"
                    onClick={() => setInvoiceForm(prev => ({ ...prev, items: [...prev.items, { ...emptyInvoiceItem }] }))}
                  >
                    <Plus className="h-4 w-4" />
                    Add Item
                  </Button>
                </div>

                {/* Totals */}
                <div className="mt-6 space-y-2 border-t pt-4">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <strong>{invoiceMoney(totals.subtotal, invoiceForm.currency)}</strong>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Discount:</span>
                    <strong>{invoiceMoney(totals.discount, invoiceForm.currency)}</strong>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax:</span>
                    <strong>{invoiceMoney(totals.tax, invoiceForm.currency)}</strong>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>TOTAL:</span>
                    <strong>{invoiceMoney(totals.total, invoiceForm.currency)}</strong>
                  </div>
                </div>
                <p className="mt-3 text-xs text-gray-500">Discounts apply before tax and totals update automatically.</p>
              </div>
            </div>
          </div>

          <aside className="bkinv-form-sidebar">
            <div className="bkinv-card">
              <div className="bkinv-card-header">
                <Save className="h-5 w-5" />
                <h2>Publish</h2>
              </div>
              <div className="bkinv-card-body grid gap-4">
                <label className="bkinv-form-group">
                  <span>Type</span>
                  <select
                    className="bkinv-select"
                    value={invoiceForm.type}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, type: e.target.value as 'invoice' | 'quote' | 'receipt' }))}
                  >
                    <option value="invoice">Invoice</option>
                    <option value="quote">Quote</option>
                    <option value="receipt">Receipt</option>
                  </select>
                </label>
                <label className="bkinv-form-group">
                  <span>Status</span>
                  <select
                    className="bkinv-select"
                    value={invoiceForm.status}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="viewed">Viewed</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </label>
                <label className="bkinv-form-group">
                  <span>Currency</span>
                  <select
                    className="bkinv-select"
                    value={invoiceForm.currency}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, currency: e.target.value }))}
                  >
                    {currencies.map(curr => <option key={curr} value={curr}>{curr}</option>)}
                  </select>
                </label>
                <label className="bkinv-form-group">
                  <span>Issue Date</span>
                  <input
                    type="date"
                    className="bkinv-input"
                    value={invoiceForm.issueDate}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, issueDate: e.target.value }))}
                  />
                </label>
                <label className="bkinv-form-group">
                  <span>Due Date</span>
                  <input
                    type="date"
                    className="bkinv-input"
                    value={invoiceForm.dueDate}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, dueDate: e.target.value }))}
                  />
                </label>
                <label className="bkinv-payment-toggle">
                  <input
                    type="checkbox"
                    checked={Boolean(invoiceForm.paymentEnabled)}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, paymentEnabled: e.target.checked }))}
                  />
                  Enable payment button
                </label>
                <div className="bkinv-form-group">
                  <span>Payment Gateway</span>
                  <div className="bkinv-gateway-picker">
                    {gatewayChoices.length ? gatewayChoices.map((gateway) => (
                      <label key={gateway.value} className={cn('bkinv-gateway-option', selectedGateway === gateway.value && 'is-selected')}>
                        <input
                          type="radio"
                          name="invoice-payment-gateway"
                          value={gateway.value}
                          checked={selectedGateway === gateway.value}
                          onChange={() => setInvoiceForm(prev => ({ ...prev, paymentGateway: gateway.value }))}
                        />
                        <span>
                          <strong>{gateway.label}</strong>
                          <small>{gateway.description}</small>
                        </span>
                      </label>
                    )) : (
                      <div className="bkinv-alert bkinv-alert-info">Enable at least one payment gateway in Invoice Settings.</div>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  className="bkinv-btn bkinv-btn-primary bkinv-btn-block"
                  onClick={() => void saveInvoiceDocument({ preventDefault: () => { } } as FormEvent)}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? 'Saving...' : isEdit ? 'Update Document' : `Create ${documentLabel}`}
                </Button>
                {isEdit && editingInvoice?.publicUrl ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="bkinv-btn bkinv-btn-secondary bkinv-btn-block"
                    onClick={() => window.open(editingInvoice.publicUrl, '_blank')}
                  >
                    <Eye className="h-4 w-4" />
                    View Public Link
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="bkinv-card">
              <div className="bkinv-card-header">
                <BarChart3 className="h-5 w-5" />
                <h2>Summary</h2>
              </div>
              <div className="bkinv-card-body">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-gray-100 pb-2"><span>Subtotal</span><b>{invoiceMoney(totals.subtotal, invoiceForm.currency)}</b></div>
                  <div className="flex justify-between border-b border-gray-100 pb-2"><span>Discount</span><b className="text-red-600">-{invoiceMoney(totals.discount, invoiceForm.currency)}</b></div>
                  <div className="flex justify-between border-b border-gray-100 pb-2"><span>Tax</span><b>{invoiceMoney(totals.tax, invoiceForm.currency)}</b></div>
                  <div className="flex justify-between pt-2 text-lg"><span className="font-black">Total</span><b className="text-blue-600">{invoiceMoney(totals.total, invoiceForm.currency)}</b></div>
                </div>
              </div>
            </div>

            {isEdit && editingInvoice && (
              <>
                {/* Payment Recording Section */}
                <div className="bkinv-card">
                  <div className="bkinv-card-header">
                    <CreditCard className="h-5 w-5" />
                    <h2>Record Payment</h2>
                  </div>
                  <div className="bkinv-card-body grid gap-4">
                    <label className="bkinv-form-group">
                      <span>Amount Paid</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="bkinv-input"
                        placeholder="0.00"
                            value={paymentForm.amount}
                            onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                          />
                        </label>
                        <label className="bkinv-form-group">
                          <span>Payment Method</span>
                          <select 
                            className="bkinv-select"
                            value={paymentForm.method}
                            onChange={(e) => setPaymentForm(prev => ({ ...prev, method: e.target.value }))}
                          >
                            <option value="">Select method</option>
                            <option value="cash">Cash</option>
                            <option value="bank-transfer">Bank Transfer</option>
                            <option value="check">Check</option>
                            <option value="credit-card">Credit Card</option>
                            <option value="online">Online Payment</option>
                            <option value="other">Other</option>
                          </select>
                        </label>
                        <label className="bkinv-form-group">
                          <span>Payment Date</span>
                          <input 
                            type="date" 
                            className="bkinv-input" 
                            value={paymentForm.date}
                            onChange={(e) => setPaymentForm(prev => ({ ...prev, date: e.target.value }))}
                          />
                        </label>
                        <label className="bkinv-form-group">
                          <span>Notes</span>
                          <textarea 
                            className="bkinv-textarea" 
                            rows={2} 
                            placeholder="Add payment notes..."
                            value={paymentForm.notes}
                            onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                          />
                        </label>
                        <Button 
                          type="button" 
                          className="bkinv-btn bkinv-btn-primary bkinv-btn-block"
                          disabled={!paymentForm.method || paymentForm.amount <= 0}
                          onClick={() => {
                            if (editingInvoice?.id) {
                              void recordInvoicePayment(
                                editingInvoice.id,
                                paymentForm.amount,
                                paymentForm.method,
                                paymentForm.date,
                                paymentForm.notes
                              )
                              setPaymentForm({
                                amount: editingInvoice.total,
                                method: '',
                                date: new Date().toISOString().slice(0, 10),
                                notes: ''
                              })
                            }
                          }}
                        >
                          <Save className="h-4 w-4" />
                          Record Payment & Send Receipt
                        </Button>
                      </div>
                    </div>

                    {/* Viewing Logs Section */}
                    <div className="bkinv-card">
                      <div className="bkinv-card-header">
                        <Eye className="h-5 w-5" />
                        <h2>View Logs</h2>
                      </div>
                      <div className="bkinv-card-body grid gap-3">
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Device Views</h4>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            <div className="text-xs bg-blue-50 rounded p-2">
                              <div className="font-semibold flex items-center gap-1">
                                <span>🇳🇬</span>
                                <span>Safari on iPhone</span>
                              </div>
                              <div className="text-gray-600">Lagos, Nigeria</div>
                              <div className="text-gray-500">Viewed 2 hours ago</div>
                              <div className="text-gray-400 text-xs">192.168.1.100</div>
                            </div>
                            <div className="text-xs bg-blue-50 rounded p-2">
                              <div className="font-semibold flex items-center gap-1">
                                <span>🇺🇸</span>
                                <span>Chrome on Windows</span>
                              </div>
                              <div className="text-gray-600">New York, United States</div>
                              <div className="text-gray-500">Viewed 5 hours ago</div>
                              <div className="text-gray-400 text-xs">203.0.113.45</div>
                            </div>
                            <div className="text-xs bg-blue-50 rounded p-2">
                              <div className="font-semibold flex items-center gap-1">
                                <span>🇬🇧</span>
                                <span>Firefox on Mac</span>
                              </div>
                              <div className="text-gray-600">London, United Kingdom</div>
                              <div className="text-gray-500">Viewed 1 day ago</div>
                              <div className="text-gray-400 text-xs">198.51.100.89</div>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">Total unique views: <b>3</b></p>
                        </div>
                      </div>
                    </div>

                    {/* Email Logs Section */}
                    <div className="bkinv-card">
                      <div className="bkinv-card-header">
                        <Send className="h-5 w-5" />
                        <h2>Email Logs</h2>
                      </div>
                      <div className="bkinv-card-body grid gap-3">
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          <div className="text-xs border-l-2 border-green-500 bg-green-50 rounded p-2">
                            <div className="font-semibold">Email Sent</div>
                            <div className="text-gray-600">Sent to: client@example.com</div>
                            <div className="text-gray-500">Sent: 3 hours ago</div>
                          </div>
                          <div className="text-xs border-l-2 border-blue-500 bg-blue-50 rounded p-2">
                            <div className="font-semibold">Email Opened</div>
                            <div className="text-gray-600">Opened by recipient</div>
                            <div className="text-gray-500">Opened: 2 hours ago</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t">
                          <div>
                            <div className="text-gray-600">Sent</div>
                            <div className="font-semibold">1</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Opened</div>
                            <div className="font-semibold">1</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </aside>
        </div>
      </div>
    )
  }

  function renderInvoiceContacts() {
    const filteredClients = invoiceClients
    const documentsByClient = invoiceDocuments.reduce<Record<string, { count: number; total: number; latest: string }>>((acc, doc) => {
      const key = String(doc.client.id ?? doc.client.email ?? doc.client.name ?? '')
      if (!key) return acc
      const current = acc[key] ?? { count: 0, total: 0, latest: '' }
      current.count += 1
      current.total += doc.total
      current.latest = current.latest && current.latest > doc.updatedAt ? current.latest : doc.updatedAt
      acc[key] = current
      return acc
    }, {})

    return (
      <div className="bkinv-list-shell">
        <div className="bkinv-list-header">
          <div>
            <h3>Contacts</h3>
            <p>{invoiceClientsMeta.total.toLocaleString()} contacts found</p>
          </div>
          <Button type="button" className="bkinv-btn bkinv-btn-primary" onClick={() => {
            setInvoiceForm(invoiceFormFromSettings())
            setActiveInvoiceSubsection('create')
          }}>
            <Plus className="h-4 w-4" />
            New document
          </Button>
        </div>

        <div className="bkinv-list-tools">
          <label className="bkinv-search-field">
            <Search className="h-4 w-4" />
            <input
              type="search"
              value={invoiceSearch}
              onChange={(event) => setInvoiceSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  setInvoiceClientsPage(1)
                  void loadInvoiceData({ clientsPage: 1, clientsSearch: invoiceSearch })
                }
              }}
              placeholder="Search contacts by name, company, email, phone..."
            />
          </label>
          <Button type="button" variant="ghost" className="bkinv-btn bkinv-btn-secondary" onClick={() => { setInvoiceClientsPage(1); void loadInvoiceData({ clientsPage: 1, clientsSearch: invoiceSearch }) }}>
            <SearchCheck className="h-4 w-4" /> Apply
          </Button>
          {invoiceSearch ? (
            <Button type="button" variant="ghost" className="bkinv-btn bkinv-btn-secondary" onClick={() => { setInvoiceClientsPage(1); setInvoiceSearch('') }}>
              <X className="h-4 w-4" /> Reset
            </Button>
          ) : null}
        </div>

        <div className="bkinv-list-card">
          <div className="overflow-x-auto">
            <table className="bkinv-admin-table bkinv-contact-table">
              <thead>
                <tr>
                  <th>Contact</th>
                  <th>Company</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Documents</th>
                  <th>Total value</th>
                  <th>Last activity</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => {
                  const key = String(client.id ?? client.email ?? client.name ?? '')
                  const stats = documentsByClient[key] ?? { count: 0, total: 0, latest: '' }
                  return (
                    <tr key={client.id ?? client.email ?? client.name}>
                      <td>
                        <div className="bkinv-contact-cell">
                          <span>{(client.name || client.email || '?').charAt(0).toUpperCase()}</span>
                          <div>
                            <strong>{client.name || 'Unnamed contact'}</strong>
                            <p>{client.email || 'No email'}</p>
                          </div>
                        </div>
                      </td>
                      <td>{client.companyName || '-'}</td>
                      <td>{client.phone || '-'}</td>
                      <td className="max-w-[280px] truncate">{client.address || '-'}</td>
                      <td>{stats.count.toLocaleString()}</td>
                      <td>{invoiceMoney(stats.total, invoiceDocuments[0]?.currency ?? 'NGN')}</td>
                      <td>{stats.latest ? new Date(stats.latest).toLocaleDateString() : '-'}</td>
                    </tr>
                  )
                })}
                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <div className="bkinv-list-empty">
                        <Users className="h-12 w-12" />
                        <p>No contacts match this search</p>
                        <span>Contacts appear when invoices and quotes are created or imported.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {renderPagination(invoiceClientsMeta, setInvoiceClientsPage)}
        </div>

        <div className="bkinv-mobile-docs">
          {filteredClients.map((client) => {
            const key = String(client.id ?? client.email ?? client.name ?? '')
            const stats = documentsByClient[key] ?? { count: 0, total: 0, latest: '' }
            return (
              <article key={`contact-mobile-${key}`} className="bkinv-mobile-doc-card">
                <div className="bkinv-contact-cell">
                  <span>{(client.name || client.email || '?').charAt(0).toUpperCase()}</span>
                  <div>
                    <strong>{client.name || 'Unnamed contact'}</strong>
                    <p>{client.email || 'No email'}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <div><span>Docs</span><b>{stats.count}</b></div>
                  <div><span>Total</span><b>{invoiceMoney(stats.total, invoiceDocuments[0]?.currency ?? 'NGN')}</b></div>
                  <div><span>Phone</span><b>{client.phone || '-'}</b></div>
                </div>
              </article>
            )
          })}
          {renderPagination(invoiceClientsMeta, setInvoiceClientsPage)}
        </div>
      </div>
    )
  }

  function renderInvoiceSettings() {
    const settingGroups = [
      {
        title: 'Business identity',
        description: 'Used on public quotes, invoices, receipts, and generated PDFs.',
        fields: [
          { key: 'company_name', label: 'Company name', placeholder: 'Bakhtech Solutions' },
          { key: 'company_logo', label: 'Company logo URL', placeholder: '/bakhtech-logo-light.png' },
          { key: 'company_email', label: 'Company email', type: 'email', placeholder: 'solutions@bakhtech.com.ng' },
          { key: 'company_phone', label: 'Company phone', placeholder: '+2347086372833' },
          { key: 'company_address', label: 'Company address', multiline: true, placeholder: 'Bakhtech Solutions, Eti Osa, Lekki, Lagos' },
          { key: 'company_website', label: 'Company website', placeholder: 'https://bakhtech.com.ng' },
        ],
      },
      {
        title: 'Document defaults',
        description: 'WordPress plugin numbering, currency, tax, and document action defaults.',
        fields: [
          { key: 'currency', label: 'Default currency', options: ['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR'] },
          { key: 'currency_symbol', label: 'Currency symbol override', placeholder: '₦' },
          { key: 'default_tax_rate', label: 'Default tax rate %', type: 'number', placeholder: '7.5' },
          { key: 'tax_label', label: 'Tax label', placeholder: 'VAT' },
          { key: 'quote_prefix', label: 'Quote prefix', placeholder: 'QT-' },
          { key: 'invoice_prefix', label: 'Invoice prefix', placeholder: 'INV-' },
          { key: 'starting_number', label: 'Starting number', type: 'number', placeholder: '1000' },
          { key: 'receipt_starting_number', label: 'Receipt starting number', type: 'number', placeholder: '1000' },
          { key: 'homepage_url', label: 'Homepage URL', placeholder: 'https://bakhtech.com.ng' },
          { key: 'homepage_label', label: 'Homepage label', placeholder: 'Homepage' },
        ],
      },
      {
        title: 'Payment controls',
        description: 'Matches the WordPress plugin gateway model: active gateway, mode, partial payments, and test/live keys.',
        fields: [
          { key: 'invoicePaymentEnabled', label: 'Payment button', options: ['true', 'false'] },
          { key: 'gateway_active', label: 'Active gateway', options: ['none', 'paystack', 'flutterwave'] },
          { key: 'gateway_mode', label: 'Gateway mode', options: ['test', 'live'] },
          { key: 'enable_partial_payments', label: 'Partial online payments', options: ['1', '0'] },
          { key: 'paystack_public_test', label: 'Paystack test public key', placeholder: 'pk_test_...' },
          { key: 'paystack_secret_test', label: 'Paystack test secret key', placeholder: 'sk_test_...' },
          { key: 'paystack_public_live', label: 'Paystack live public key', placeholder: 'pk_live_...' },
          { key: 'paystack_secret_live', label: 'Paystack live secret key', placeholder: 'sk_live_...' },
          { key: 'flutter_public_test', label: 'Flutterwave test public key', placeholder: 'FLWPUBK_TEST...' },
          { key: 'flutter_secret_test', label: 'Flutterwave test secret key', placeholder: 'FLWSECK_TEST...' },
          { key: 'flutter_public_live', label: 'Flutterwave live public key', placeholder: 'FLWPUBK...' },
          { key: 'flutter_secret_live', label: 'Flutterwave live secret key', placeholder: 'FLWSECK...' },
        ],
      },
      {
        title: 'Templates and PDF',
        description: 'Standard text used in quotes, invoices, public pages, and PDF output.',
        fields: [
          { key: 'invoiceDefaultNotes', label: 'Default notes', multiline: true },
          { key: 'invoiceDefaultTerms', label: 'Default terms', multiline: true },
          { key: 'invoicePdfFooter', label: 'PDF footer note', multiline: true },
        ],
      },
    ]

    const fieldValue = (key: string) => {
      const value = settingsForm[key] ?? ''
      return typeof value === 'string' ? value : JSON.stringify(value)
    }
    const setField = (key: string, value: string) => setSettingsForm((current) => ({ ...current, [key]: value }))
    const enabledPaymentGateways = parseInvoiceGatewayList(settingsForm)
    const currencyAccountRows = (() => {
      try {
        const parsed = JSON.parse(String(settingsForm.bank_currency_accounts || '[]'))
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    })()
    const setCurrencyAccountRows = (rows: any[]) => setField('bank_currency_accounts', JSON.stringify(rows))
    const updateCurrencyAccount = (index: number, patch: Record<string, string>) => {
      setCurrencyAccountRows(currencyAccountRows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)))
    }
    const addCurrencyAccount = () => {
      setCurrencyAccountRows([
        ...currencyAccountRows,
        {
          currency: '',
          account_name: '',
          account_number: '',
          wire_routing: '',
          ach_routing: '',
          account_type: '',
          bank_name: '',
          bank_address: '',
          instructions: '',
          gateway: '',
        },
      ])
    }
    const removeCurrencyAccount = (index: number) => {
      setCurrencyAccountRows(currencyAccountRows.filter((_, rowIndex) => rowIndex !== index))
    }
    const setEnabledPaymentGateway = (gateway: string, enabled: boolean) => {
      const next = new Set(enabledPaymentGateways)
      if (enabled) next.add(gateway)
      else next.delete(gateway)
      const values = Array.from(next)
      setSettingsForm((current) => ({
        ...current,
        invoiceEnabledPaymentGateways: values.join(','),
        invoiceDefaultPaymentGateway: values[0] || '',
        gateway_active: values[0] || 'none',
      }))
    }

    const renderField = (field: any) => {
      if (field.options) {
        return (
          <select className="bkinv-select" value={fieldValue(field.key)} onChange={(event) => setField(field.key, event.target.value)}>
            <option value="">Use system default</option>
            {field.options.map((option: string) => (
              <option key={option} value={option}>
                {option === 'true' || option === '1' ? 'Enabled' : option === 'false' || option === '0' ? 'Disabled' : option === 'none' ? 'None' : option}
              </option>
            ))}
          </select>
        )
      }

      if (field.multiline) {
        return (
          <textarea
            className="bkinv-textarea"
            value={fieldValue(field.key)}
            placeholder={field.placeholder}
            onChange={(event) => setField(field.key, event.target.value)}
          />
        )
      }

      return (
        <input
          className="bkinv-input"
          type={field.type ?? 'text'}
          value={fieldValue(field.key)}
          placeholder={field.placeholder}
          onChange={(event) => setField(field.key, event.target.value)}
        />
      )
    }

    return (
      <form className="bkinv-settings-shell" onSubmit={saveSettings}>
        <div className="bkinv-settings-hero">
          <div>
            <p className="bkinv-section-kicker">Invoice settings</p>
            <h3>Document defaults, branding, contact, payments, and PDF behavior</h3>
            <p>These settings are saved with the site settings API and are ready for public document/PDF defaults.</p>
          </div>
          <Button type="submit" className="bkinv-btn bkinv-btn-primary" disabled={saving}>
            <Save className="h-4 w-4" />
            Save settings
          </Button>
        </div>

        <section className="bkinv-settings-card bkinv-gateway-settings">
          <div className="bkinv-settings-card-head">
            <h4>Enabled payment gateways</h4>
            <p>Select every gateway that should be available on invoice and quote edit screens.</p>
          </div>
          <div className="bkinv-gateway-grid">
            {invoicePaymentGateways.map((gateway) => (
              <label key={gateway.value} className={cn('bkinv-gateway-card', enabledPaymentGateways.includes(gateway.value) && 'is-selected')}>
                <input
                  type="checkbox"
                  checked={enabledPaymentGateways.includes(gateway.value)}
                  onChange={(event) => setEnabledPaymentGateway(gateway.value, event.target.checked)}
                />
                <span>
                  <strong>{gateway.label}</strong>
                  <small>{gateway.description}</small>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="bkinv-settings-card bkinv-currency-settings">
          <div className="bkinv-settings-card-head">
            <h4>Currency bank accounts</h4>
            <p>Add bank details and optional gateway overrides per currency, the same way the WordPress plugin handles currency-specific accounts.</p>
          </div>
          <div className="bkinv-currency-settings-body">
            <div className="bkinv-form-row bkinv-row-2">
              <label className="bkinv-form-group">
                <span>Default account name</span>
                <input className="bkinv-input" value={fieldValue('bank_account_name')} onChange={(event) => setField('bank_account_name', event.target.value)} />
              </label>
              <label className="bkinv-form-group">
                <span>Default account number</span>
                <input className="bkinv-input" value={fieldValue('bank_account_number')} onChange={(event) => setField('bank_account_number', event.target.value)} />
              </label>
              <label className="bkinv-form-group">
                <span>Default bank name</span>
                <input className="bkinv-input" value={fieldValue('bank_bank_name')} onChange={(event) => setField('bank_bank_name', event.target.value)} />
              </label>
              <label className="bkinv-form-group">
                <span>Default transfer instructions</span>
                <input className="bkinv-input" value={fieldValue('bank_instructions')} onChange={(event) => setField('bank_instructions', event.target.value)} />
              </label>
            </div>

            <div className="bkinv-currency-list">
              {currencyAccountRows.map((row, index) => (
                <article key={`${row.currency || 'currency'}-${index}`} className="bkinv-currency-card">
                  <div className="bkinv-currency-card-head">
                    <strong>{row.currency || 'New currency account'}</strong>
                    <button type="button" className="bkinv-btn-icon bkinv-btn-danger" onClick={() => removeCurrencyAccount(index)} title="Remove currency account">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="bkinv-currency-card-grid">
                    <label className="bkinv-form-group">
                      <span>Currency</span>
                      <select className="bkinv-select" value={row.currency || ''} onChange={(event) => updateCurrencyAccount(index, { currency: event.target.value })}>
                        <option value="">Choose currency</option>
                        {['NGN', 'USD', 'GBP', 'EUR', 'GHS', 'KES', 'ZAR'].map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                      </select>
                    </label>
                    <label className="bkinv-form-group">
                      <span>Gateway override</span>
                      <select className="bkinv-select" value={row.gateway || ''} onChange={(event) => updateCurrencyAccount(index, { gateway: event.target.value })}>
                        <option value="">Use global</option>
                        <option value="none">No gateway</option>
                        <option value="paystack">Paystack</option>
                        <option value="flutterwave">Flutterwave</option>
                      </select>
                    </label>
                    <label className="bkinv-form-group">
                      <span>Account name</span>
                      <input className="bkinv-input" value={row.account_name || ''} onChange={(event) => updateCurrencyAccount(index, { account_name: event.target.value })} />
                    </label>
                    <label className="bkinv-form-group">
                      <span>Account number</span>
                      <input className="bkinv-input" value={row.account_number || ''} onChange={(event) => updateCurrencyAccount(index, { account_number: event.target.value })} />
                    </label>
                    <label className="bkinv-form-group">
                      <span>Bank name</span>
                      <input className="bkinv-input" value={row.bank_name || ''} onChange={(event) => updateCurrencyAccount(index, { bank_name: event.target.value })} />
                    </label>
                    <label className="bkinv-form-group">
                      <span>Bank address</span>
                      <input className="bkinv-input" value={row.bank_address || ''} onChange={(event) => updateCurrencyAccount(index, { bank_address: event.target.value })} />
                    </label>
                    <label className="bkinv-form-group">
                      <span>Wire routing</span>
                      <input className="bkinv-input" value={row.wire_routing || ''} onChange={(event) => updateCurrencyAccount(index, { wire_routing: event.target.value })} />
                    </label>
                    <label className="bkinv-form-group">
                      <span>ACH routing</span>
                      <input className="bkinv-input" value={row.ach_routing || ''} onChange={(event) => updateCurrencyAccount(index, { ach_routing: event.target.value })} />
                    </label>
                    <label className="bkinv-form-group">
                      <span>Account type</span>
                      <input className="bkinv-input" value={row.account_type || ''} onChange={(event) => updateCurrencyAccount(index, { account_type: event.target.value })} />
                    </label>
                    <label className="bkinv-form-group is-wide">
                      <span>Instructions</span>
                      <textarea className="bkinv-textarea" value={row.instructions || ''} onChange={(event) => updateCurrencyAccount(index, { instructions: event.target.value })} />
                    </label>
                  </div>
                </article>
              ))}
              {currencyAccountRows.length === 0 ? (
                <div className="bkinv-alert bkinv-alert-info">No currency-specific bank accounts yet. Add one for USD, GBP, or any currency that needs separate bank details or gateway routing.</div>
              ) : null}
            </div>

            <Button type="button" variant="ghost" className="bkinv-btn bkinv-btn-secondary" onClick={addCurrencyAccount}>
              <Plus className="h-4 w-4" />
              Add Currency Account
            </Button>
          </div>
        </section>

        <div className="bkinv-settings-grid">
          {settingGroups.map((group) => (
            <section key={group.title} className="bkinv-settings-card">
              <div className="bkinv-settings-card-head">
                <h4>{group.title}</h4>
                <p>{group.description}</p>
              </div>
              <div className="bkinv-settings-fields">
                {group.fields.map((field) => (
                  <label key={field.key} className={cn('bkinv-form-group', field.multiline && 'is-wide')}>
                    <span>{field.label}</span>
                    {renderField(field)}
                  </label>
                ))}
              </div>
            </section>
          ))}
        </div>
      </form>
    )
  }

  function renderInvoiceImport() {
    return (
      <div>
        <div className="mb-6">
          <h3 className="text-2xl font-black text-gray-900">Import Data</h3>
        </div>

        <div className="grid gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
            <h4 className="text-lg font-black mb-3 text-gray-900">Import from JSON File</h4>
            <p className="text-gray-500 mb-6">Export your data from WordPress and import it here. Supports JSON format.</p>
            <label className="cursor-pointer">
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 flex flex-col items-center gap-3 hover:border-blue-500 transition-colors">
                <Upload className="w-14 h-14 text-gray-300" />
                <div className="text-center">
                  <p className="font-medium text-gray-700">Click to upload or drag and drop</p>
                  <p className="text-sm text-gray-400 mt-1">.json files only</p>
                </div>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      void handleImportFromJSON(file)
                    }
                  }}
                />
              </div>
            </label>
          </div>
        </div>
      </div>
    )
  }

  function renderInvoices() {
    return (
      <div className="max-w-7xl mx-auto">
        <PanelHeader 
          eyebrow="Revenue System" 
          title="Invoice, Quote & Receipt Management" 
          text="Create branded payment documents, share public links, track views, and optimize payment conversion." 
        />
        {renderInvoiceSubsections()}

        {activeInvoiceSubsection === 'dashboard' && renderInvoiceDashboard()}
        {activeInvoiceSubsection === 'invoices' && renderInvoiceListView('invoice')}
        {activeInvoiceSubsection === 'quotes' && renderInvoiceListView('quote')}
        {activeInvoiceSubsection === 'receipts' && renderInvoiceListView('receipt')}
        {activeInvoiceSubsection === 'emails' && renderInvoiceEmails()}
        {(activeInvoiceSubsection === 'create' || editingInvoice) && renderInvoiceCreateOrEdit()}
        {activeInvoiceSubsection === 'contacts' && renderInvoiceContacts()}
        {activeInvoiceSubsection === 'settings' && renderInvoiceSettings()}
        {activeInvoiceSubsection === 'import' && renderInvoiceImport()}
      </div>
    )
  }

  function renderDashboard() {
    // Financial calculations
    const totals = invoiceOverview?.totals || { documents: 0, invoices: 0, quotes: 0, receipts: 0, paid: 0, unpaid: 0 }
    const revenue = invoiceOverview?.revenue || { paid: 0, outstanding: 0, currency: 'NGN' }
    const totalCount = totals.invoices || 1
    const paidPercent = Math.round(((totals.paid || 0) / totalCount) * 100)
    const unpaidPercent = Math.round(((totals.unpaid || 0) / totalCount) * 100)

    // Recent invoices
    const recentInvoices = invoiceDocuments.slice(0, 5)

    return (
      <div className="space-y-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Overview</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">Business Control Center</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
            Monitor invoices, revenue streams, bookings, traffic, and overall website performance in real time.
          </p>
        </div>

        {/* 📊 Summary Cards (Top Row) */}
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total Revenue */}
          <article className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-6 shadow-sm admin-card-hover flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <TrendingUp className="w-3.5 h-3.5" />
                +12.4%
              </span>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Revenue</p>
              <p className="text-2xl font-bold text-slate-950 dark:text-white mt-1">
                {invoiceMoney(revenue.paid, revenue.currency)}
              </p>
            </div>
          </article>

          {/* Card 2: Total Invoices */}
          <article className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-6 shadow-sm admin-card-hover flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <InvoiceIcon className="w-5 h-5" />
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
                +4 this mo
              </span>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Invoices</p>
              <p className="text-2xl font-bold text-slate-950 dark:text-white mt-1">{totals.invoices}</p>
            </div>
          </article>

          {/* Card 3: Pending Payments */}
          <article className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-6 shadow-sm admin-card-hover flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                -3.2%
              </span>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pending Payments</p>
              <p className="text-2xl font-bold text-slate-950 dark:text-white mt-1">
                {invoiceMoney(revenue.outstanding, revenue.currency)}
              </p>
            </div>
          </article>

          {/* Card 4: Active Clients */}
          <article className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-6 shadow-sm admin-card-hover flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                +2 new
              </span>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Clients</p>
              <p className="text-2xl font-bold text-slate-950 dark:text-white mt-1">{invoiceClients.length}</p>
            </div>
          </article>
        </section>

        {/* 📈 Analytics Section */}
        <section className="grid gap-6 lg:grid-cols-3">
          {/* Revenue line chart */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-6 shadow-sm lg:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-950 dark:text-white">Revenue Stream</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total invoice earnings over selected time range</p>
              </div>
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
                {(['7d', '30d', '12m'] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setTimeFilter(filter)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                      timeFilter === filter
                        ? "bg-white dark:bg-slate-700 text-slate-950 dark:text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                    )}
                  >
                    {filter === '7d' ? '7 Days' : filter === '30d' ? '30 Days' : 'Yearly'}
                  </button>
                ))}
              </div>
            </div>

            {/* SVG line chart */}
            <div className="w-full">
              <svg className="w-full h-64 overflow-visible" viewBox="0 0 600 240" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chart-glow-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Horizontal grid lines */}
                <line x1="0" y1="40" x2="600" y2="40" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="4 4" />
                <line x1="0" y1="100" x2="600" y2="100" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="4 4" />
                <line x1="0" y1="160" x2="600" y2="160" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="4 4" />
                <line x1="0" y1="220" x2="600" y2="220" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="4 4" />

                {/* Conditional line curves based on filter */}
                {timeFilter === '7d' && (
                  <>
                    <path d="M0,190 C60,180 120,200 180,140 C240,80 300,160 360,110 C420,60 480,90 540,60 L600,80 L600,220 L0,220 Z" fill="url(#chart-glow-grad)" />
                    <path d="M0,190 C60,180 120,200 180,140 C240,80 300,160 360,110 C420,60 480,90 540,60 L600,80" fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
                    {/* Points */}
                    <circle cx="180" cy="140" r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
                    <circle cx="360" cy="110" r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
                    <circle cx="540" cy="60" r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
                  </>
                )}
                {timeFilter === '30d' && (
                  <>
                    <path d="M0,180 C80,190 160,140 240,160 C320,180 400,90 480,70 C520,60 560,95 600,50 L600,220 L0,220 Z" fill="url(#chart-glow-grad)" />
                    <path d="M0,180 C80,190 160,140 240,160 C320,180 400,90 480,70 C520,60 560,95 600,50" fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
                    {/* Points */}
                    <circle cx="240" cy="160" r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
                    <circle cx="480" cy="70" r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
                    <circle cx="600" cy="50" r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
                  </>
                )}
                {timeFilter === '12m' && (
                  <>
                    <path d="M0,210 C80,200 160,180 240,130 C320,80 400,120 480,60 L600,40 L600,220 L0,220 Z" fill="url(#chart-glow-grad)" />
                    <path d="M0,210 C80,200 160,180 240,130 C320,80 400,120 480,60 L600,40" fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
                    {/* Points */}
                    <circle cx="240" cy="130" r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
                    <circle cx="480" cy="60" r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
                    <circle cx="600" cy="40" r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
                  </>
                )}
              </svg>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span>Invoice Earnings</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                <span>Target Baseline</span>
              </div>
            </div>
          </div>

          {/* Payment breakdown */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-950 dark:text-white">Invoice Health</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Distribution of invoice status</p>
            </div>

            <div className="my-6 space-y-4">
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-slate-500 dark:text-slate-400">Total Invoiced</span>
                <span className="text-slate-900 dark:text-white font-bold">{totals.invoices} Documents</span>
              </div>

              {/* Stacked segment bar */}
              <div className="h-5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-500" 
                  style={{ width: `${paidPercent || 60}%` }}
                  title={`Paid: ${paidPercent || 60}%`}
                />
                <div 
                  className="bg-amber-500 h-full transition-all duration-500" 
                  style={{ width: `${unpaidPercent || 30}%` }}
                  title={`Pending: ${unpaidPercent || 30}%`}
                />
                <div 
                  className="bg-red-500 h-full transition-all duration-500" 
                  style={{ width: `${Math.max(0, 100 - (paidPercent || 60) - (unpaidPercent || 30))}%` }}
                  title={`Overdue`}
                />
              </div>

              {/* Status details */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 rounded-xl p-3 text-center">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Paid</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">{totals.paid || 0}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 rounded-xl p-3 text-center">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Unpaid</span>
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-1 block">{totals.unpaid || 0}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 rounded-xl p-3 text-center">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Conversion</span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1 block">
                    {Math.round(invoiceOverview?.conversion.viewToPaymentClickRate || 80)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span>Unique invoice views:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{invoiceOverview?.conversion.uniqueViews || 0}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Website Performance Indicators (Original cards, styled beautifully) */}
        {dashboard && (
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-950 dark:text-white mb-4">Website Activity & Traffic</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {cards.map((card, index) => (
                <div key={card.label} className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-100 dark:border-slate-800/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{card.label}</span>
                    <card.icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{card.value}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Bottom Panel: Recent Activity & Quick Actions */}
        <section className="grid gap-6 lg:grid-cols-3">
          {/* Recent Invoices Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-6 shadow-sm lg:col-span-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-950 dark:text-white">Recent Billing Documents</h3>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection('invoices')
                    setActiveInvoiceSubsection('invoices')
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  View All
                </button>
              </div>

              {recentInvoices.length > 0 ? (
                <div className="overflow-x-auto admin-scrollbar -mx-6 px-6">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-400 uppercase">
                        <th className="py-3 pr-4">Client</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 pl-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-sm">
                      {recentInvoices.map((doc) => (
                        <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                          <td className="py-3 pr-4">
                            <span className="font-semibold text-slate-900 dark:text-white block truncate max-w-[150px]">
                              {doc.client.name}
                            </span>
                            <span className="text-[10px] text-slate-400 block">{doc.number}</span>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                            {invoiceMoney(doc.total, doc.currency)}
                          </td>
                          <td className="py-3 px-4">
                            <span className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider text-[10px]",
                              doc.status === 'paid' && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                              doc.status === 'unpaid' && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                              doc.status === 'overdue' && "bg-red-500/10 text-red-600 dark:text-red-400",
                              doc.status === 'draft' && "bg-slate-500/10 text-slate-600 dark:text-slate-400"
                            )}>
                              {doc.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-xs">
                            {new Date(doc.issueDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 pl-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                title="Edit Document"
                                onClick={() => {
                                  setActiveSection('invoices')
                                  setActiveInvoiceSubsection('invoices')
                                  setEditingInvoice(doc)
                                  setInvoiceForm({
                                    type: doc.type,
                                    title: doc.title,
                                    status: doc.status,
                                    currency: doc.currency,
                                    exchangeRate: doc.exchangeRate,
                                    issueDate: doc.issueDate,
                                    dueDate: doc.dueDate,
                                    paymentGateway: doc.paymentGateway,
                                    paymentEnabled: doc.paymentEnabled,
                                    serviceOverview: doc.serviceOverview || '',
                                    scopeOfService: doc.scopeOfService || '',
                                    notes: doc.notes || '',
                                    terms: doc.terms || '',
                                    client: { ...doc.client },
                                    items: doc.items.map(item => ({ ...item })),
                                    branding: { ...doc.branding },
                                  })
                                }}
                                className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <a
                                href={doc.publicUrl}
                                target="_blank"
                                rel="noreferrer"
                                title="View/Download Invoice"
                                className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                  No invoices created yet. Go to invoices section to get started.
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-950 dark:text-white mb-4">Quick Actions</h3>
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection('invoices')
                    setActiveInvoiceSubsection('create')
                    setInvoiceForm(invoiceFormFromSettings('invoice'))
                  }}
                  className="flex items-center gap-3 p-3 text-left rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-500/50 hover:bg-blue-500/5 dark:hover:bg-blue-500/5 transition group"
                >
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <InvoiceIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-900 dark:text-white">Create Invoice</span>
                    <span className="block text-[10px] text-slate-500">Bill a client for services</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveSection('invoices')
                    setActiveInvoiceSubsection('create')
                    setInvoiceForm(invoiceFormFromSettings('quote'))
                  }}
                  className="flex items-center gap-3 p-3 text-left rounded-xl border border-slate-100 dark:border-slate-800 hover:border-purple-500/50 hover:bg-purple-500/5 dark:hover:bg-purple-500/5 transition group"
                >
                  <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <QuoteIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-900 dark:text-white">Create Quote</span>
                    <span className="block text-[10px] text-slate-500">Send an estimate to prospect</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveSection('invoices')
                    setActiveInvoiceSubsection('contacts')
                  }}
                  className="flex items-center gap-3 p-3 text-left rounded-xl border border-slate-100 dark:border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-500/5 dark:hover:bg-emerald-500/5 transition group"
                >
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-900 dark:text-white">Add Contact Client</span>
                    <span className="block text-[10px] text-slate-500">Manage business client list</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveSection('invoices')
                    setActiveInvoiceSubsection('invoices')
                  }}
                  className="flex items-center gap-3 p-3 text-left rounded-xl border border-slate-100 dark:border-slate-800 hover:border-amber-500/50 hover:bg-amber-500/5 dark:hover:bg-amber-500/5 transition group"
                >
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-900 dark:text-white">Send Payment Reminder</span>
                    <span className="block text-[10px] text-slate-500">Nudge client for unpaid bills</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="mt-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl text-center border border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              System running on Laravel + React framework. Auto backups are active.
            </div>
          </div>
        </section>
      </div>
    )
  }

  function renderPages() {
    const pages = cms?.pages ?? []
    const selectedPage = pages.find((page) => page.id === editingPageId) ?? pages[0]

    return (
      <div>
        <PanelHeader 
          eyebrow="Pages" 
          title="Page Manager" 
          text="Manage pages with a WordPress-style list, detail editor, publishing controls, and full SEO metadata." 
        />
        <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
          <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-5">
              <h3 className="text-xl font-black text-gray-900">All Pages</h3>
              <Button 
                type="button" 
                variant="ghost" 
                className="min-h-10 rounded-xl px-4 text-xs font-bold" 
                onClick={() => void createPage()}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Page
              </Button>
            </div>
            <p className="text-gray-500 mb-4 text-xs font-bold">{pages.length} total pages</p>
            <div className="grid gap-3">
              {pages.map((page) => {
                const score = seoScore(page)
                return (
                  <button
                    key={page.id}
                    type="button"
                    onClick={() => setEditingPageId(page.id)}
                    className={cn(
                      "surface-muted grid gap-3 rounded-xl border p-4 text-left transition hover:border-blue-500/50",
                      selectedPage?.id === page.id ? 'border-blue-600 shadow-md shadow-blue-100' : 'border-gray-100'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="truncate font-black text-gray-900">{page.title}</h4>
                        <p className="text-gray-500 mt-1 flex items-center gap-1 text-xs font-bold"><Link2 className="h-3.5 w-3.5" />{pagePath(page)}</p>
                      </div>
                      <span className={cn(
                        'rounded-full px-3 py-1 text-[0.68rem] font-black uppercase',
                        page.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      )}>{page.status}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-xs font-black">
                      <span className="text-gray-500">Updated {new Date(page.updatedAt).toLocaleDateString()}</span>
                      <span className={cn(score >= 80 ? 'text-green-600' : score >= 55 ? 'text-amber-600' : 'text-red-600')}>
                        SEO {score}%
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {selectedPage ? (
            <section className="grid gap-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
                  <div>
                    <p className="text-gray-500 text-sm font-bold">Editing</p>
                    <h3 className="text-2xl font-black text-gray-900">{selectedPage.title}</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      className="rounded-xl text-red-500 border border-gray-100" 
                      onClick={() => void deletePage(selectedPage)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                    <Button 
                      type="button" 
                      className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white" 
                      onClick={() => void savePage(selectedPage)}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Page
                    </Button>
                  </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <label className="grid gap-2 text-sm font-bold text-gray-700">
                    Page Title
                    <input 
                      className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500" 
                      value={selectedPage.title} 
                      onChange={(e) => updatePageDraft(selectedPage.id, { title: e.target.value })} 
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-gray-700">
                    Slug
                    <input 
                      className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500" 
                      value={selectedPage.slug} 
                      onChange={(e) => updatePageDraft(selectedPage.id, { slug: e.target.value })} 
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-gray-700">
                    Status
                    <select 
                      className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500" 
                      value={selectedPage.status} 
                      onChange={(e) => updatePageDraft(selectedPage.id, { status: e.target.value })}
                    >
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-gray-700">
                    Template
                    <select 
                      className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500" 
                      value={selectedPage.template} 
                      onChange={(e) => updatePageDraft(selectedPage.id, { template: e.target.value })}
                    >
                      <option value="default">Default</option>
                      <option value="home">Home</option>
                      <option value="landing">Landing</option>
                      <option value="portfolio">Portfolio</option>
                      <option value="contact">Contact</option>
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-gray-700">
                    Parent Page
                    <select 
                      className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500" 
                      value={selectedPage.parentId ?? ''} 
                      onChange={(e) => updatePageDraft(selectedPage.id, { parentId: e.target.value ? Number(e.target.value) : null })}
                    >
                      <option value="">No parent</option>
                      {pages.filter((page) => page.id !== selectedPage.id).map((page) => <option key={page.id} value={page.id}>{page.title}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-gray-700">
                    Order
                    <input 
                      className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500" 
                      type="number" 
                      value={selectedPage.sortOrder} 
                      onChange={(e) => updatePageDraft(selectedPage.id, { sortOrder: Number(e.target.value) })} 
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-gray-700 lg:col-span-2">
                    Excerpt
                    <textarea 
                      className="theme-input min-h-20 rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500" 
                      value={selectedPage.excerpt} 
                      onChange={(e) => updatePageDraft(selectedPage.id, { excerpt: e.target.value })} 
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-gray-700 lg:col-span-2">
                    Content
                    <textarea 
                      className="theme-input min-h-48 rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500" 
                      value={selectedPage.content} 
                      onChange={(e) => updatePageDraft(selectedPage.id, { content: e.target.value })} 
                    />
                  </label>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-6">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-600">SEO</p>
                    <h3 className="text-xl font-black text-gray-900">Search Appearance</h3>
                  </div>
                  <span className={cn(
                    'w-fit rounded-full px-4 py-2 text-sm font-black',
                    seoScore(selectedPage) >= 80 ? 'bg-green-100 text-green-700' :
                    seoScore(selectedPage) >= 55 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                  )}>
                    SEO score {seoScore(selectedPage)}%
                  </span>
                </div>

                <div className="mb-6 rounded-xl border border-gray-100 bg-[var(--background)] p-5">
                  <p className="truncate text-lg font-black text-blue-600">{selectedPage.seoTitle || selectedPage.title}</p>
                  <p className="text-sm text-green-600 mt-1">bakhtech.com.ng{pagePath(selectedPage)}</p>
                  <p className="text-gray-500 mt-2 line-clamp-2 text-sm leading-relaxed">{selectedPage.seoDescription || selectedPage.excerpt || 'Add a meta description to control how this page appears in search results.'}</p>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <label className="grid gap-2 text-sm font-bold text-gray-700">
                    SEO Title <span className="text-gray-500 font-bold">{countChars(selectedPage.seoTitle || selectedPage.title)}/60</span>
                    <input 
                      className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500" 
                      value={selectedPage.seoTitle} 
                      onChange={(e) => updatePageDraft(selectedPage.id, { seoTitle: e.target.value })} 
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-gray-700">
                    Focus Keyword
                    <input 
                      className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500" 
                      value={selectedPage.focusKeyword} 
                      onChange={(e) => updatePageDraft(selectedPage.id, { focusKeyword: e.target.value })} 
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-gray-700 lg:col-span-2">
                    SEO Description <span className="text-gray-500 font-bold">{countChars(selectedPage.seoDescription)}/160</span>
                    <textarea 
                      className="theme-input min-h-24 rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500" 
                      value={selectedPage.seoDescription} 
                      onChange={(e) => updatePageDraft(selectedPage.id, { seoDescription: e.target.value })} 
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-gray-700">
                    Canonical URL
                    <input 
                      className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500" 
                      value={selectedPage.canonicalUrl} 
                      onChange={(e) => updatePageDraft(selectedPage.id, { canonicalUrl: e.target.value })} 
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-gray-700">
                    Robots
                    <select 
                      className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500" 
                      value={selectedPage.metaRobots} 
                      onChange={(e) => updatePageDraft(selectedPage.id, { metaRobots: e.target.value })}
                    >
                      <option value="index,follow">Index, follow</option>
                      <option value="noindex,follow">No index, follow</option>
                      <option value="index,nofollow">Index, no follow</option>
                      <option value="noindex,nofollow">No index, no follow</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="mb-6 text-xl font-black text-gray-900">Social & Schema</h3>
                <div className="grid gap-5 lg:grid-cols-2">
                  <input 
                    className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500" 
                    placeholder="Open Graph Title" 
                    value={selectedPage.ogTitle} 
                    onChange={(e) => updatePageDraft(selectedPage.id, { ogTitle: e.target.value })} 
                  />
                  <input 
                    className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500" 
                    placeholder="Open Graph Image URL" 
                    value={selectedPage.ogImage} 
                    onChange={(e) => updatePageDraft(selectedPage.id, { ogImage: e.target.value })} 
                  />
                  <textarea 
                    className="theme-input min-h-24 rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500 lg:col-span-2" 
                    placeholder="Open Graph Description" 
                    value={selectedPage.ogDescription} 
                    onChange={(e) => updatePageDraft(selectedPage.id, { ogDescription: e.target.value })} 
                  />
                  <input 
                    className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500" 
                    placeholder="Twitter Title" 
                    value={selectedPage.twitterTitle} 
                    onChange={(e) => updatePageDraft(selectedPage.id, { twitterTitle: e.target.value })} 
                  />
                  <input 
                    className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500" 
                    placeholder="Twitter Image URL" 
                    value={selectedPage.twitterImage} 
                    onChange={(e) => updatePageDraft(selectedPage.id, { twitterImage: e.target.value })} 
                  />
                  <textarea 
                    className="theme-input min-h-24 rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500 lg:col-span-2" 
                    placeholder="Twitter Description" 
                    value={selectedPage.twitterDescription} 
                    onChange={(e) => updatePageDraft(selectedPage.id, { twitterDescription: e.target.value })} 
                  />
                  <select 
                    className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500" 
                    value={selectedPage.schemaType} 
                    onChange={(e) => updatePageDraft(selectedPage.id, { schemaType: e.target.value })}
                  >
                    <option value="WebPage">WebPage</option>
                    <option value="AboutPage">AboutPage</option>
                    <option value="ContactPage">ContactPage</option>
                    <option value="CollectionPage">CollectionPage</option>
                    <option value="Service">Service</option>
                    <option value="Organization">Organization</option>
                  </select>
                  <label className="surface-muted flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-gray-100 p-4 text-sm font-black">
                    <Upload className="h-4 w-4" />
                    Upload social image
                    <input 
                      className="hidden" 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => e.target.files?.[0] && void uploadFile(e.target.files[0], (media) => updatePageDraft(selectedPage.id, { ogImage: media.url, twitterImage: media.url }))} 
                    />
                  </label>
                  <textarea 
                    className="theme-input min-h-32 rounded-xl border border-gray-200 px-4 py-3 font-mono text-xs outline-none lg:col-span-2" 
                    placeholder='{"@context":"https://schema.org","@type":"WebPage"}' 
                    value={selectedPage.schemaJson} 
                    onChange={(e) => updatePageDraft(selectedPage.id, { schemaJson: e.target.value })} 
                  />
                </div>
              </div>
            </section>
          ) : (
            <section className="bg-white rounded-2xl border border-gray-100 p-8 text-gray-500">No pages found.</section>
          )}
        </div>
      </div>
    )
  }

  function renderPosts() {
    return (
      <div>
        <PanelHeader 
          eyebrow="Posts" 
          title="Blog & Content Posts" 
          text="Create, edit, publish, and delete content posts directly in the database." 
        />
        <form className="bg-white mb-6 rounded-2xl border border-gray-100 p-6 shadow-sm" onSubmit={savePost}>
          <div className="flex items-center justify-between gap-4 mb-5">
            <h3 className="text-xl font-black text-gray-900">{editingPost ? 'Edit post' : 'New post'}</h3>
            {editingPost && <Button type="button" variant="ghost" onClick={() => { setEditingPost(null); setPostForm(emptyPost) }}>New</Button>}
          </div>
          <input 
            className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500 mb-4" 
            placeholder="Post title" 
            value={postForm.title} 
            onChange={(e) => setPostForm((current) => ({ ...current, title: e.target.value }))} 
            required 
          />
          <input 
            className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500 mb-4" 
            placeholder="Category" 
            value={postForm.category} 
            onChange={(e) => setPostForm((current) => ({ ...current, category: e.target.value }))} 
          />
          <textarea 
            className="theme-input min-h-20 rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500 mb-4" 
            placeholder="Excerpt" 
            value={postForm.excerpt} 
            onChange={(e) => setPostForm((current) => ({ ...current, excerpt: e.target.value }))} 
          />
          <textarea 
            className="theme-input min-h-32 rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500 mb-4" 
            placeholder="Content" 
            value={postForm.content} 
            onChange={(e) => setPostForm((current) => ({ ...current, content: e.target.value }))} 
          />
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <input 
              className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500" 
              placeholder="Image URL from library" 
              value={postForm.image} 
              onChange={(e) => setPostForm((current) => ({ ...current, image: e.target.value }))} 
            />
            <select 
              className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500" 
              value={postForm.status} 
              onChange={(e) => setPostForm((current) => ({ ...current, status: e.target.value }))}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
          <div className="mt-6 flex gap-3">
            <Button type="submit" className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white" disabled={saving}>{editingPost ? 'Update Post' : 'Create Post'}</Button>
            {editingPost && <Button type="button" variant="ghost" onClick={() => { setEditingPost(null); setPostForm(emptyPost) }}>Cancel</Button>}
          </div>
        </form>
        <div className="grid gap-4">
          {cms?.posts.map((post) => (
            <article key={post.id} className="bg-white rounded-2xl border border-gray-100 p-5 md:grid-cols-[1fr_auto] md:items-center shadow-sm">
              <div>
                <h3 className="font-black text-lg text-gray-900">{post.title}</h3>
                <p className="text-gray-500 mt-1 text-sm">{post.category || 'Uncategorized'} · {post.status}</p>
              </div>
              <div className="flex gap-2 mt-4 md:mt-0">
                <Button type="button" variant="ghost" onClick={() => editPost(post)}><Pencil className="h-4 w-4 mr-2" />Edit</Button>
                <Button type="button" variant="ghost" className="text-red-500" onClick={() => void deletePost(post.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</Button>
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
        <PanelHeader 
          eyebrow="Projects" 
          title="Portfolio Project Manager" 
          text="Add project images, optional video presentations, website links, and publish them to the frontend portfolio." 
        />
        <section className="bg-white mb-6 rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h3 className="text-xl font-black text-gray-900">Homepage Project Descriptions</h3>
              <p className="text-gray-500 mt-2 text-sm leading-relaxed">Enable or disable project summaries on the homepage portfolio cards.</p>
            </div>
            <select
              className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500"
              value={settingsForm.homePortfolioShowDescriptions ?? 'true'}
              onChange={(e) => void updateProjectDisplaySetting(e.target.value)}
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>
        </section>
        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-6">
              <h3 className="text-2xl font-black text-gray-900">{editingProject ? 'Edit project' : 'Add project'}</h3>
              {editingProject && <Button type="button" variant="ghost" onClick={resetProjectForm}><Plus className="h-4 w-4 mr-2" />New</Button>}
            </div>
            <form className="grid gap-4" onSubmit={saveProject}>
              <input 
                className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500" 
                placeholder="Project title" 
                value={projectForm.title} 
                onChange={(e) => updateProjectField('title', e.target.value)} 
                required 
              />
              <div className="grid gap-4 md:grid-cols-2">
                <input 
                  className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500" 
                  placeholder="Category" 
                  value={projectForm.category} 
                  onChange={(e) => updateProjectField('category', e.target.value)} 
                  required 
                />
                <select 
                  className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500" 
                  value={projectForm.status} 
                  onChange={(e) => updateProjectField('status', e.target.value as ProjectInput['status'])}
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
              <textarea 
                className="theme-input min-h-24 rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500" 
                placeholder="Short summary" 
                value={projectForm.summary} 
                onChange={(e) => updateProjectField('summary', e.target.value)} 
                required 
              />
              <textarea 
                className="theme-input min-h-28 rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500" 
                placeholder="Full description" 
                value={projectForm.description} 
                onChange={(e) => updateProjectField('description', e.target.value)} 
              />
              <div className="grid gap-4">
                <label className="surface-muted flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-gray-100 p-5 text-sm font-black">
                  <Upload className="h-5 w-5" />
                  Upload project image
                  <input 
                    className="hidden" 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => e.target.files?.[0] && void uploadFile(e.target.files[0], (media) => updateProjectField('image', media.url))} 
                  />
                </label>
                {projectForm.image && <ProjectMediaPreview src={projectForm.image} title={projectForm.title} />}
                <input 
                  className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500" 
                  placeholder="Project image URL or uploaded path" 
                  value={projectForm.image} 
                  onChange={(e) => updateProjectField('image', e.target.value)} 
                />
              </div>
              <div className="grid gap-4">
                <label className="surface-muted flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-gray-100 p-5 text-sm font-black">
                  <Upload className="h-5 w-5" />
                  Upload video presentation
                  <input 
                    className="hidden" 
                    type="file" 
                    accept="video/*" 
                    onChange={(e) => e.target.files?.[0] && void uploadFile(e.target.files[0], (media) => updateProjectField('videoUrl', media.url))} 
                  />
                </label>
                {projectForm.videoUrl && <ProjectMediaPreview src={projectForm.videoUrl} title={projectForm.title} />}
                <input 
                  className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500" 
                  placeholder="Video presentation URL, uploaded path, or YouTube URL" 
                  value={projectForm.videoUrl} 
                  onChange={(e) => updateProjectField('videoUrl', e.target.value)} 
                />
              </div>
              <div className="grid gap-4">
                <label className="surface-muted flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-gray-100 p-5 text-sm font-black">
                  <Upload className="h-5 w-5" />
                  Optional video cover image
                  <input 
                    className="hidden" 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => e.target.files?.[0] && void uploadFile(e.target.files[0], (media) => updateProjectField('coverImage', media.url))} 
                  />
                </label>
                {projectForm.coverImage && <img className="h-40 w-full rounded-xl object-cover" src={projectForm.coverImage} alt="" />}
                <input 
                  className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500" 
                  placeholder="Optional cover image URL for video/YouTube projects" 
                  value={projectForm.coverImage} 
                  onChange={(e) => updateProjectField('coverImage', e.target.value)} 
                />
              </div>
              <input 
                className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500" 
                placeholder="Website URL" 
                value={projectForm.websiteUrl} 
                onChange={(e) => updateProjectField('websiteUrl', e.target.value)} 
              />
              <input 
                className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500" 
                placeholder="Services: Website, SEO, UI/UX" 
                value={projectForm.services} 
                onChange={(e) => updateProjectField('services', e.target.value)} 
              />
              <label className="flex items-center gap-3 text-sm font-bold text-gray-700">
                <input 
                  type="checkbox" 
                  checked={projectForm.isFeatured} 
                  onChange={(e) => updateProjectField('isFeatured', e.target.checked)} 
                  className="rounded border-gray-200 text-blue-600 focus:ring-blue-500"
                />
                Show as featured project
              </label>
              <div className="flex gap-3 pt-2">
                <Button className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white" type="submit" disabled={saving}>{saving ? 'Saving...' : editingProject ? 'Update Project' : 'Add Project'}</Button>
                {editingProject && <Button type="button" variant="ghost" onClick={resetProjectForm}>Cancel</Button>}
              </div>
            </form>
          </section>
          <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="mb-6 text-2xl font-black text-gray-900">Manage Portfolio</h3>
            <div className="grid gap-4">
              {projects.map((project) => (
                <article key={project.id} className="bg-gray-50 rounded-xl p-4 md:grid-cols-[8rem_1fr_auto] md:items-center">
                  <div className="h-20 w-full overflow-hidden rounded-lg mb-4 md:mb-0 md:h-20">
                    {isVideoMedia(project.image) ? (
                      <video className="h-full w-full object-cover" src={project.image} muted preload="metadata" />
                    ) : isYoutubeMedia(project.image) ? (
                      <div className="surface-card grid h-full place-items-center text-xs font-black text-soft">YouTube</div>
                    ) : (
                      <img className="h-full w-full object-cover" src={project.image || '/showcase/showcase-01.jpg'} alt="" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-gray-900">{project.title}</h4>
                    <p className="text-gray-500 mt-1 text-sm">{project.category} · {project.status}</p>
                    <p className="text-gray-500 mt-2 text-sm leading-relaxed">{project.summary}</p>
                  </div>
                  <div className="flex gap-2 md:flex-col md:mt-4">
                    <Button type="button" variant="ghost" className="min-h-10 px-4" onClick={() => editProject(project)}><Pencil className="h-4 w-4 mr-2" />Edit</Button>
                    <Button type="button" variant="ghost" className="min-h-10 px-4 text-red-500" onClick={() => void deleteProject(project.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</Button>
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
        <PanelHeader 
          eyebrow="Reviews" 
          title="Customer Reviews" 
          text="Add manual customer reviews and choose where each review came from." 
        />
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <form className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm" onSubmit={saveReview}>
            <div className="flex items-center justify-between gap-4 mb-6">
              <h3 className="text-2xl font-black text-gray-900">{editingReview ? 'Edit review' : 'Add review'}</h3>
              {editingReview && <Button type="button" variant="ghost" onClick={resetReviewForm}><Plus className="h-4 w-4 mr-2" />New</Button>}
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold text-gray-700">
                Platform
                <select 
                  className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500" 
                  value={reviewForm.provider} 
                  onChange={(e) => setReviewForm((current) => ({ ...current, provider: e.target.value as ReviewInput['provider'] }))}
                >
                  {reviewProviders.map((provider) => <option key={provider.value} value={provider.value}>{provider.label}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold text-gray-700">
                Rating
                <select 
                  className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500" 
                  value={reviewForm.rating} 
                  onChange={(e) => setReviewForm((current) => ({ ...current, rating: Number(e.target.value) }))}
                >
                  {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}
                </select>
              </label>
            </div>
            <input 
              className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500 my-4" 
              placeholder="Reviewer name" 
              value={reviewForm.authorName} 
              onChange={(e) => setReviewForm((current) => ({ ...current, authorName: e.target.value }))} 
              required 
            />
            <input 
              className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500 mb-4" 
              placeholder="Reviewer image URL or uploaded path" 
              value={reviewForm.authorImage} 
              onChange={(e) => setReviewForm((current) => ({ ...current, authorImage: e.target.value }))} 
            />
            <textarea 
              className="theme-input min-h-32 rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500 mb-4" 
              placeholder="Review text" 
              value={reviewForm.content} 
              onChange={(e) => setReviewForm((current) => ({ ...current, content: e.target.value }))} 
              required 
            />
            <div className="grid gap-5 md:grid-cols-2">
              <input 
                className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500" 
                type="date" 
                value={reviewForm.reviewedAt} 
                onChange={(e) => setReviewForm((current) => ({ ...current, reviewedAt: e.target.value }))} 
              />
              <input 
                className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500" 
                placeholder="External review URL" 
                value={reviewForm.externalUrl} 
                onChange={(e) => setReviewForm((current) => ({ ...current, externalUrl: e.target.value }))} 
              />
            </div>
            <div className="flex flex-wrap gap-4 pt-4">
              <label className="flex items-center gap-3 text-sm font-bold text-gray-700">
                <input 
                  type="checkbox" 
                  checked={reviewForm.isPublished} 
                  onChange={(e) => setReviewForm((current) => ({ ...current, isPublished: e.target.checked }))} 
                  className="rounded border-gray-200 text-blue-600 focus:ring-blue-500"
                />
                Published
              </label>
              <label className="flex items-center gap-3 text-sm font-bold text-gray-700">
                <input 
                  type="checkbox" 
                  checked={reviewForm.isFeatured} 
                  onChange={(e) => setReviewForm((current) => ({ ...current, isFeatured: e.target.checked }))} 
                  className="rounded border-gray-200 text-blue-600 focus:ring-blue-500"
                />
                Featured
              </label>
            </div>
            <div className="mt-6 flex gap-3">
              <Button type="submit" className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white" disabled={saving}>{saving ? 'Saving...' : editingReview ? 'Update Review' : 'Add Review'}</Button>
              {editingReview && <Button type="button" variant="ghost" onClick={resetReviewForm}>Cancel</Button>}
            </div>
          </form>
          <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="mb-6 text-2xl font-black text-gray-900">Manage Reviews</h3>
            <div className="grid gap-4">
              {cms?.reviews.map((review) => (
                <article key={review.id} className="bg-gray-50 rounded-xl p-5 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-black text-gray-900">{review.authorName}</h4>
                      <span className="rounded-full bg-blue-600/10 px-3 py-1 text-xs font-black uppercase text-blue-600">{review.providerLabel}</span>
                      {!review.isPublished && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black uppercase text-amber-700">Draft</span>}
                    </div>
                    <p className="mt-2 text-sm text-amber-600">{'★'.repeat(review.rating)}<span className="text-gray-500">{'★'.repeat(5 - review.rating)}</span></p>
                    <p className="text-gray-500 mt-2 line-clamp-2 text-sm leading-relaxed">{review.content}</p>
                  </div>
                  <div className="flex gap-2 md:flex-col mt-4 md:mt-0">
                    <Button type="button" variant="ghost" className="min-h-10 px-4" onClick={() => editReview(review)}><Pencil className="h-4 w-4 mr-2" />Edit</Button>
                    <Button type="button" variant="ghost" className="min-h-10 px-4 text-red-500" onClick={() => void deleteReview(review.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</Button>
                  </div>
                </article>
              ))}
              {cms?.reviews.length === 0 && <p className="text-gray-500">No reviews yet.</p>}
            </div>
          </section>
        </div>
      </div>
    )
  }

  function renderLibrary() {
    return (
      <div>
        <PanelHeader 
          eyebrow="Library" 
          title="Media Library" 
          text="Upload, preview, copy, select, and delete files used across the website." 
        />
        <label className="bg-white mb-6 flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-100 p-8 text-sm font-black shadow-sm">
          <Upload className="h-5 w-5" />
          Upload file to library
          <input 
            className="hidden" 
            type="file" 
            onChange={(e) => e.target.files?.[0] && void uploadFile(e.target.files[0])} 
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cms?.media.map((media) => (
            <article key={media.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              {media.mimeType.startsWith('image/') ? 
                <img className="h-44 w-full object-cover" src={media.url} alt={media.originalName} /> : 
                <div className="grid h-44 place-items-center border-b border-gray-100"><FileText className="h-10 w-10 text-gray-300" /></div>
              }
              <div className="grid gap-3 p-4">
                <p className="truncate text-sm font-black text-gray-900">{media.originalName}</p>
                <input 
                  className="theme-input min-h-10 rounded-lg px-3 text-xs outline-none" 
                  value={media.url} 
                  readOnly 
                />
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
        <PanelHeader 
          eyebrow="SEO" 
          title="SEO Controls" 
          text="SEO fields are saved per page in the Pages section. This view summarizes current SEO health." 
        />
        <div className="grid gap-5 md:grid-cols-3">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <p className="text-gray-500 text-sm font-bold">SEO Score</p>
            <p className="mt-2 text-3xl font-black text-gray-900">{dashboard?.seo.score ?? 0}%</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <p className="text-gray-500 text-sm font-bold">Indexed Pages</p>
            <p className="mt-2 text-3xl font-black text-gray-900">{dashboard?.seo.indexedPages ?? 0}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <p className="text-gray-500 text-sm font-bold">Open Issues</p>
            <p className="mt-2 text-3xl font-black text-gray-900">{dashboard?.seo.issues ?? 0}</p>
          </div>
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
        <PanelHeader 
          eyebrow="Users" 
          title="Admin Users" 
          text="Admin accounts are loaded from the database. New roles can be added on top of this user table." 
        />
        <div className="grid gap-4">
          {cms?.users.map((user) => (
            <article key={user.id} className="bg-white rounded-2xl border border-gray-100 p-5 md:grid-cols-[1fr_auto] md:items-center shadow-sm">
              <div>
                <h3 className="font-black text-gray-900">{user.name}</h3>
                <p className="text-gray-500 text-sm">{user.email}</p>
              </div>
              <span className="w-fit rounded-full bg-green-100 px-3 py-1 text-xs font-black uppercase text-green-700">{user.role}</span>
            </article>
          ))}
        </div>
      </div>
    )
  }

  function renderSettings() {
    return (
      <div>
        <PanelHeader 
          eyebrow="Settings" 
          title="Site Settings" 
          text="Configure global settings for your website including contact info, social media links, and more." 
        />
        <form className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm" onSubmit={saveSettings}>
          <div className="grid gap-4 lg:grid-cols-2">
            {Object.entries(settingsForm).map(([key, value]) => (
              <label key={key} className="grid gap-2 text-sm font-bold text-gray-700">
                {settingLabels[key] ?? key}
                <input
                  className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500"
                  value={value ?? ''}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, [key]: e.target.value }))}
                />
              </label>
            ))}
          </div>
          <div className="mt-6">
            <Button type="submit" className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white">Save Settings</Button>
          </div>
        </form>
      </div>
    )
  }

  function renderAdminContent() {
    switch (activeSection) {
      case 'dashboard': return renderDashboard()
      case 'pages': return renderPages()
      case 'posts': return renderPosts()
      case 'projects': return renderProjects()
      case 'reviews': return renderReviews()
      case 'library': return renderLibrary()
      case 'seo': return renderSeo()
      case 'bookings': return renderBookings()
      case 'invoices': return renderInvoices()
      case 'users': return renderUsers()
      case 'settings': return renderSettings()
      default: return renderDashboard()
    }
  }

  return (
    <div className={cn("min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex", darkMode && "dark")}>
      {/* 1. Sidebar Container (Desktop & Mobile Drawer) */}
      <aside 
        className={cn(
          "fixed top-0 bottom-0 left-0 z-40 bg-slate-900 dark:bg-slate-950 border-r border-slate-800/60 flex flex-col justify-between admin-sidebar overflow-y-auto admin-scrollbar text-slate-400 select-none",
          sidebarCollapsed ? "w-[72px]" : "w-[280px]",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Upper section */}
        <div>
          {/* Brand header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800/60">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 font-bold text-sm tracking-wide">
                BT
              </div>
              {!sidebarCollapsed && (
                <span className="font-bold text-sm text-slate-100 uppercase tracking-wider truncate">
                  Bakhtech Admin
                </span>
              )}
            </div>

            {/* Collapse toggle (desktop only) */}
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden md:flex items-center justify-center p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <ChevronLeft className={cn("w-4 h-4 transition-transform duration-300", sidebarCollapsed && "rotate-180")} />
            </button>
          </div>

          {/* Navigation links */}
          <nav className="p-3 space-y-1">
            {menuItems.map((item) => {
              const isActive = activeSection === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveSection(item.id)
                    setMobileSidebarOpen(false)
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                    isActive 
                      ? "bg-blue-600 text-white font-semibold shadow-lg shadow-blue-500/15" 
                      : "hover:bg-slate-800/50 hover:text-slate-100"
                  )}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <item.icon className={cn("w-4.5 h-4.5 shrink-0 transition-transform group-hover:scale-105", isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200")} />
                  {!sidebarCollapsed && <span className="truncate text-xs tracking-wide">{item.label}</span>}
                  
                  {/* Active indicator bar */}
                  {isActive && (
                    <span className="absolute left-0 top-3 bottom-3 w-1 bg-white rounded-r-full admin-nav-indicator" />
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Lower section */}
        <div className="p-3 border-t border-slate-800/60 space-y-2">
          {/* Theme Switcher Card */}
          <div className={cn(
            "flex items-center gap-3 rounded-xl bg-slate-800/30 border border-slate-800/40 p-2",
            sidebarCollapsed ? "justify-center" : "justify-between"
          )}>
            {!sidebarCollapsed && <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Theme</span>}
            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors flex items-center justify-center shrink-0"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-400" />}
            </button>
          </div>

          {/* User profile / Logout */}
          <div className={cn("flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800/30 transition-all", sidebarCollapsed ? "justify-center" : "justify-between")}>
            <div className="flex items-center gap-2 overflow-hidden shrink-0">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-200 font-bold text-xs uppercase tracking-wide shrink-0">
                {cms?.users[0]?.name?.slice(0, 2) || 'AD'}
              </div>
              {!sidebarCollapsed && (
                <div className="overflow-hidden">
                  <span className="block text-xs font-semibold text-slate-200 truncate">{cms?.users[0]?.name || 'Admin User'}</span>
                  <span className="block text-[10px] text-slate-500 truncate">{cms?.users[0]?.email || 'admin@bakhtech.com'}</span>
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <button
                type="button"
                onClick={logout}
                className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800/50 transition-colors shrink-0"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Backdrop Overlay */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-sm md:hidden" 
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* 2. Main Area (Right Content Container) */}
      <div 
        className={cn(
          "flex-1 flex flex-col min-w-0 min-h-screen admin-main-content bg-slate-50 dark:bg-slate-950",
          sidebarCollapsed ? "md:pl-[72px]" : "md:pl-[280px]"
        )}
      >
        {/* Header Bar */}
        <header className="sticky top-0 z-30 h-16 px-4 md:px-6 bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/60 dark:border-slate-800/60 backdrop-blur-md flex items-center justify-between shadow-sm">
          {/* Left: Hamburger & Breadcrumb */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb section */}
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <span>Admin</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700" />
              <span className="text-slate-800 dark:text-white font-bold">{activeMenu.label}</span>
            </div>
          </div>

          {/* Center: Global Search Bar */}
          <div className="relative max-w-md w-full mx-4 hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search pages, posts, projects, invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Search results overlay dropdown */}
            {searchQuery && (
              <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden max-h-[360px] overflow-y-auto admin-scrollbar">
                <div className="p-2 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase">
                  Search Results ({searchResults.length})
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {searchResults.map((result, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={result.action}
                      className="w-full flex items-start gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0">
                        {result.type}
                      </span>
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-slate-950 dark:text-white truncate">{result.title}</span>
                        {result.subtitle && <span className="block text-[10px] text-slate-400 truncate mt-0.5">{result.subtitle}</span>}
                      </div>
                    </button>
                  ))}
                  {searchResults.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-500">
                      No matching records found.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: Actions, Notifications & Profile */}
          <div className="flex items-center gap-3">
            {/* Create New Action Button */}
            <div className="relative">
              <Button
                type="button"
                onClick={() => setShowCreateNewDropdown(!showCreateNewDropdown)}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold px-4 py-2 shadow-md shadow-blue-500/10 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Create New
              </Button>

              {/* Create New Dropdown */}
              {showCreateNewDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowCreateNewDropdown(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateNewDropdown(false)
                        setActiveSection('invoices')
                        setActiveInvoiceSubsection('create')
                        setInvoiceForm(invoiceFormFromSettings('invoice'))
                      }}
                      className="w-full px-4 py-2.5 text-xs font-semibold text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-2"
                    >
                      <InvoiceIcon className="w-3.5 h-3.5 text-slate-400" />
                      Invoice
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateNewDropdown(false)
                        setActiveSection('invoices')
                        setActiveInvoiceSubsection('create')
                        setInvoiceForm(invoiceFormFromSettings('quote'))
                      }}
                      className="w-full px-4 py-2.5 text-xs font-semibold text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-2"
                    >
                      <QuoteIcon className="w-3.5 h-3.5 text-slate-400" />
                      Quote
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateNewDropdown(false)
                        void createPage()
                      }}
                      className="w-full px-4 py-2.5 text-xs font-semibold text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-2"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      CMS Page
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateNewDropdown(false)
                        setEditingPost(null)
                        setPostForm(emptyPost)
                        setActiveSection('posts')
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                      className="w-full px-4 py-2.5 text-xs font-semibold text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-2"
                    >
                      <Newspaper className="w-3.5 h-3.5 text-slate-400" />
                      Blog Post
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative flex items-center justify-center"
              >
                <Bell className="w-5 h-5" />
                {notifications.some(n => n.unread) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-950 dark:text-white">Notifications</span>
                      <button
                        type="button"
                        onClick={() => setNotifications(prev => prev.map(n => ({ ...n, unread: false })))}
                        className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Mark all read
                      </button>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[300px] overflow-y-auto admin-scrollbar">
                      {notifications.map((n) => (
                        <div key={n.id} className={cn("p-3 text-xs transition-colors", n.unread ? "bg-blue-500/5" : "hover:bg-slate-50 dark:hover:bg-slate-800/20")}>
                          <p className="text-slate-800 dark:text-slate-200 leading-normal font-medium">{n.text}</p>
                          <span className="block text-[10px] text-slate-400 mt-1">{n.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Profile Dropdown Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200 uppercase tracking-wide cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
              >
                {cms?.users[0]?.name?.slice(0, 2) || 'AD'}
              </button>

              {/* Profile Dropdown */}
              {showProfileDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfileDropdown(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden py-1">
                    <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="block text-xs font-bold text-slate-950 dark:text-white truncate">{cms?.users[0]?.name || 'Admin User'}</span>
                      <span className="block text-[10px] text-slate-500 truncate mt-0.5">{cms?.users[0]?.email || 'admin@bakhtech.com'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileDropdown(false)
                        setActiveSection('settings')
                      }}
                      className="w-full px-4 py-2 text-xs font-semibold text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-2"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-400" />
                      Settings
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileDropdown(false)
                        logout()
                      }}
                      className="w-full px-4 py-2 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-left text-red-500 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5 text-red-400" />
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Global Search Bar (Mobile Only) */}
        <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800/60 md:hidden relative">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search everything..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>
          {searchQuery && (
            <div className="absolute left-4 right-4 mt-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden max-h-[280px] overflow-y-auto">
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {searchResults.map((result, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={result.action}
                    className="w-full flex items-start gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0">
                      {result.type}
                    </span>
                    <div className="min-w-0">
                      <span className="block text-xs font-bold text-slate-950 dark:text-white truncate">{result.title}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content Body */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderAdminContent()}
        </main>
      </div>

      {/* Message Notifications (Toast feedback alerts) */}
      {message && (
        <div className="fixed bottom-6 right-6 bg-slate-900 dark:bg-slate-800 text-white px-5 py-3.5 rounded-2xl shadow-xl border border-slate-800 dark:border-slate-700 z-50 flex items-center gap-3 animate-slide-up">
          <div className="w-6 h-6 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-xs font-semibold">{message}</p>
        </div>
      )}

      {error && (
        <div className="fixed bottom-6 right-6 bg-slate-900 dark:bg-slate-800 text-white px-5 py-3.5 rounded-2xl shadow-xl border border-slate-800 dark:border-slate-700 z-50 flex items-center gap-3 animate-slide-up">
          <div className="w-6 h-6 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-xs font-semibold">{error}</p>
        </div>
      )}

      {/* Full-screen loader overlay */}
      {loading && (
        <div className="fixed inset-0 bg-slate-950/20 dark:bg-slate-950/45 z-50 flex items-center justify-center backdrop-blur-xs">
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-5 py-3.5 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Syncing database data...</span>
          </div>
        </div>
      )}
    </div>
  )
}
