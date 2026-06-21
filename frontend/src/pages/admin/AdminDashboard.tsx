import { useEffect, useEffectEvent, useMemo, useRef, useState, type FormEvent } from 'react'
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
  GripVertical,
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
  RotateCcw,
  Trash2,
  Upload,
  Download,
  Users,
  Wallet,
  X,
  Bell,
  Search,
  Sun,
  Moon,
  Menu,
  TrendingUp,
  UserPlus,
  Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RichTextEditor } from '@/components/RichTextEditor'
import { SafeImage } from '@/components/ui/safe-image'
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
  type DashboardData,
  type DeploymentCommandResult,
  type InvoiceClient,
  type InvoiceDocument,
  type InvoiceEmailLog,
  type InvoiceItem,
  type InvoiceListMeta,
  type InvoiceOverview,
  type MediaItem,
  type MailSettings,
  type PricingCategory,
  type PricingPlanFeature,
  type PricingPlan,
  type Project,
  type ProjectInput,
  type GoogleReviewConnection,
  type Review,
  type ReviewInput,
  type SiteEmailLog,
} from '@/lib/api'
import { cn } from '@/lib/utils'
import { AdminPostsWorkspace } from '@/pages/admin/AdminPostsWorkspace'

type AdminSection = 'dashboard' | 'pages' | 'posts' | 'projects' | 'reviews' | 'library' | 'seo' | 'bookings' | 'pricing' | 'invoices' | 'users' | 'settings'
type BookingAdminSection = 'dashboard' | 'calendars' | 'bookings' | 'availability' | 'settings'
type InvoiceSubsection = 'dashboard' | 'invoices' | 'quotes' | 'receipts' | 'emails' | 'contacts' | 'settings' | 'import' | 'create'
type CalendarSettingsSection = 'form' | 'locations' | 'payment' | 'email' | 'availability'
type SiteSettingsSection = 'menu' | 'theme' | 'site' | 'social' | 'smtp' | 'email-logs' | 'advanced'
type ReviewAdminSection = 'reviews' | 'google' | 'trustpilot' | 'settings'
type LocationTab = 'google-meet' | 'zoom' | 'whatsapp-call' | 'in-person' | 'phone-call'
type MediaPickerState = {
  field: keyof Pick<ProjectInput, 'image' | 'coverImage' | 'videoUrl'>
  title: string
  accept: string
} | null
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
type HeaderMenuItem = { label: string; href: string; visible: boolean; children: HeaderMenuItem[] }
type CurrencyAccountRow = Record<string, string>
type InvoiceSettingsField = { key: string; label: string; type?: string; multiline?: boolean; options?: string[]; placeholder?: string }

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character] ?? character)
}


const optimizedImageMaxBytes = 1_800_000
const optimizedImageMaxSide = 1920

function isCompressibleImage(file: File) {
  return file.type.startsWith('image/') && !['image/gif', 'image/svg+xml'].includes(file.type)
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
}

function loadImageElement(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Unable to read this image. Try saving it as JPG or PNG first.'))
    }
    image.src = objectUrl
  })
}

function uploadErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError && error.status >= 500) {
    return 'Upload did not complete after both upload methods. Check public/uploads or storage/app/public/uploads permissions on the live server.'
  }

  return error instanceof Error ? error.message : fallback
}

async function optimizeImageFile(file: File) {
  if (!isCompressibleImage(file)) {
    return file
  }

  let width = 0
  let height = 0
  let source: CanvasImageSource

  try {
    if (!('createImageBitmap' in window)) {
      throw new Error('createImageBitmap is unavailable.')
    }
    const bitmap = await createImageBitmap(file)
    width = bitmap.width
    height = bitmap.height
    source = bitmap
  } catch {
    const image = await loadImageElement(file)
    width = image.naturalWidth || image.width
    height = image.naturalHeight || image.height
    source = image
  }

  const scale = Math.min(1, optimizedImageMaxSide / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  const context = canvas.getContext('2d')
  if (!context) {
    return file
  }
  context.drawImage(source, 0, 0, canvas.width, canvas.height)

  if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) {
    source.close()
  }

  let quality = 0.86
  let blob = await canvasToBlob(canvas, 'image/jpeg', quality)
  while (blob && blob.size > optimizedImageMaxBytes && quality > 0.58) {
    quality -= 0.08
    blob = await canvasToBlob(canvas, 'image/jpeg', quality)
  }

  if (!blob || blob.size >= file.size) {
    return file
  }

  const cleanName = file.name.replace(/\.[^.]+$/, '') || 'project-image'
  return new File([blob], `${cleanName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
}

const emptyMailSettings: MailSettings = {
  enabled: false,
  host: '',
  port: 587,
  encryption: 'tls',
  username: '',
  password: '',
  hasPassword: false,
  fromAddress: '',
  fromName: '',
}

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
  sortOrder: 0,
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
      reminderMinutesBefore: [1440, 60, 30],
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

function dateAfterDays(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
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
  partialPaymentEnabled: boolean
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
  dueDate: dateAfterDays(30),
  paymentGateway: 'paystack',
  paymentEnabled: true,
  partialPaymentEnabled: true,
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

const emptyPricingCategoryForm: Partial<PricingCategory> = {
  name: '',
  slug: '',
  description: '',
  icon: 'layout-template',
  isActive: true,
  sortOrder: 0,
}

const emptyPricingPlanForm: Partial<PricingPlan> = {
  pricingCategoryId: 0,
  name: '',
  slug: '',
  description: '',
  billingType: 'one_time',
  monthlyEnabled: false,
  prices: { NGN: 0, USD: 0, GBP: 0 },
  promoPrices: {},
  discountPercentage: 0,
  isActive: true,
  isPopular: false,
  sortOrder: 0,
  features: [],
}

const invoicePaymentGateways = [
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
  if (globalGateway && globalGateway !== 'none' && globalGateway !== 'manual') gateways.add(globalGateway)

  try {
    const accounts = JSON.parse(String(settings.bank_currency_accounts || '[]'))
    if (Array.isArray(accounts)) {
      accounts.forEach((account) => {
        const accountCurrency = String(account?.currency || '').toUpperCase()
        const gateway = String(account?.gateway || '').trim()
        if (gateway && gateway !== 'none' && gateway !== 'manual' && (!currency || accountCurrency === currency.toUpperCase())) {
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
  { id: 'pricing', label: 'Pricing', icon: CreditCard },
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
    sortOrder: project.sortOrder,
  }
}

function isVideoMedia(url: string) {
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url)
}

function isYoutubeMedia(url: string) {
  return /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}/.test(url)
}

function adminMediaFallbackSrc(title: string) {
  const safeTitle = escapeHtml(title || 'Selected media')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675"><rect width="1200" height="675" rx="28" fill="#f8fafc"/><rect x="32" y="32" width="1136" height="611" rx="24" fill="none" stroke="#d7dce5" stroke-width="3"/><text x="600" y="326" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700" fill="#1f2937">${safeTitle}</text><text x="600" y="378" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#6b7280">Image could not be previewed</text></svg>`

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function ProjectMediaPreview({ src, title = '' }: { src: string; title?: string }) {
  if (isVideoMedia(src)) {
    return <video className="h-40 w-full rounded-2xl object-cover" src={src} controls preload="metadata" />
  }

  if (isYoutubeMedia(src)) {
    return <div className="surface-muted grid h-40 w-full place-items-center rounded-2xl text-sm font-black text-soft">YouTube video</div>
  }

  return <SafeImage className="h-40 w-full rounded-2xl object-cover" src={src} fallbackSrc={adminMediaFallbackSrc(title)} alt={title} />
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
  google_business_client_id: 'Google Business Client ID',
  google_business_client_secret: 'Google Business Client Secret',
  homePortfolioShowDescriptions: 'Show public project summaries',
  homepageVideoUrl: 'Homepage video URL',
  instagramUrl: 'Instagram link',
  linkedinUrl: 'LinkedIn link',
  phone: 'Phone',
  siteName: 'Site name',
  tiktokUrl: 'TikTok link',
  trustpilotReviewUrl: 'Trustpilot review link',
  twitterUrl: 'X / Twitter link',
  youtubeUrl: 'YouTube link',
  navigation_items: 'Header menu',
  theme_light_primary: 'Light primary',
  theme_light_secondary: 'Light secondary',
  theme_light_active: 'Light active color',
  theme_dark_primary: 'Dark primary',
  theme_dark_secondary: 'Dark secondary',
  theme_dark_active: 'Dark active color',
}

const defaultThemeColors: Record<string, string> = {
  theme_light_primary: '#1261ff',
  theme_light_secondary: '#12c8a0',
  theme_light_active: '#ef4444',
  theme_dark_primary: '#8bb8ff',
  theme_dark_secondary: '#67e8cf',
  theme_dark_active: '#ef4444',
}

const defaultHeaderMenu = [
  { label: 'Home', href: '/', visible: true, children: [] },
  { label: 'About', href: '/about', visible: true, children: [] },
  { label: 'Portfolio', href: '/portfolio', visible: true, children: [] },
  { label: 'Booking', href: '/booking', visible: true, children: [] },
  { label: 'Contact', href: '/contact', visible: true, children: [] },
]

function parseHeaderMenu(value?: string): HeaderMenuItem[] {
  try {
    const parsed: unknown = JSON.parse(value || '[]')
    if (Array.isArray(parsed) && parsed.length) {
      return parsed.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object')).map((item) => ({
        label: String(item.label || ''),
        href: String(item.href || ''),
        visible: item.visible !== false,
        children: Array.isArray(item.children)
          ? item.children.filter((child): child is Record<string, unknown> => Boolean(child && typeof child === 'object')).map((child) => ({
              label: String(child.label || ''),
              href: String(child.href || ''),
              visible: child.visible !== false,
              children: [],
            }))
          : [],
      }))
    }
  } catch {
    // Keep the editor usable even if old settings contain invalid JSON.
  }

  return defaultHeaderMenu
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

function pricingRate(settings: Record<string, string>, currency: 'USD' | 'GBP') {
  const fallback = currency === 'USD' ? 0.00067 : 0.00053
  const value = Number(settings[`pricing_rate_${currency.toLowerCase()}`])
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function calculatedPricingPrices(baseNgn: number, settings: Record<string, string>) {
  const ngn = Number(baseNgn || 0)
  return {
    NGN: ngn,
    USD: Math.round(ngn * pricingRate(settings, 'USD') * 100) / 100,
    GBP: Math.round(ngn * pricingRate(settings, 'GBP') * 100) / 100,
  }
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
  const [activeSection, setActiveSection] = useState<AdminSection>(() => storedAdminView('bakhtech-admin-section', 'dashboard', ['dashboard', 'pages', 'posts', 'projects', 'reviews', 'library', 'seo', 'bookings', 'pricing', 'invoices', 'users', 'settings']))
  const [activeBookingSection, setActiveBookingSection] = useState<BookingAdminSection>(() => storedAdminView('bakhtech-admin-booking-section', 'dashboard', ['dashboard', 'calendars', 'bookings', 'availability', 'settings']))
  const [activeInvoiceSubsection, setActiveInvoiceSubsection] = useState<InvoiceSubsection>(() => storedAdminView('bakhtech-admin-invoice-section', 'dashboard', ['dashboard', 'invoices', 'quotes', 'receipts', 'emails', 'contacts', 'settings', 'import', 'create']))
  const [dashboard, setDashboard] = useState<DashboardData | null>(initialAdminCache?.dashboard ?? null)
  const [cms, setCms] = useState<CmsData | null>(initialAdminCache?.cms ?? null)
  const [mediaPicker, setMediaPicker] = useState<MediaPickerState>(null)
  const [mediaSearch, setMediaSearch] = useState('')
  const [bookingOverview, setBookingOverview] = useState<BookingCmsOverview | null>(null)
  const [bookingCalendars, setBookingCalendars] = useState<BookingCalendar[]>([])
  const [bookingCmsBookings, setBookingCmsBookings] = useState<BookingCmsBooking[]>([])
  const [bookingCmsBookingsMeta, setBookingCmsBookingsMeta] = useState<InvoiceListMeta>(defaultInvoiceListMeta)
  const [expandedBookingId, setExpandedBookingId] = useState<number | null>(null)
  const [selectedBookingIds, setSelectedBookingIds] = useState<number[]>([])
  const [bookingAvailabilityRules, setBookingAvailabilityRules] = useState<BookingAvailabilityRule[]>([])
  const [bookingCmsSettings, setBookingCmsSettings] = useState<Record<string, string>>({})
  const [invoiceOverview, setInvoiceOverview] = useState<InvoiceOverview | null>(initialAdminCache?.invoiceOverview ?? null)
  const [invoiceDocuments, setInvoiceDocuments] = useState<InvoiceDocument[]>(initialAdminCache?.invoiceDocuments ?? [])
  const [invoiceClients, setInvoiceClients] = useState<InvoiceClient[]>(initialAdminCache?.invoiceClients ?? [])
  const [invoiceEmailLogs, setInvoiceEmailLogs] = useState<InvoiceEmailLog[]>(initialAdminCache?.invoiceEmailLogs ?? [])
  const [documentEmailLogs, setDocumentEmailLogs] = useState<InvoiceEmailLog[]>([])
  const [selectedEmailLog, setSelectedEmailLog] = useState<InvoiceEmailLog | null>(null)
  const [invoiceDocumentsMeta, setInvoiceDocumentsMeta] = useState<InvoiceListMeta>(initialAdminCache?.invoiceDocumentsMeta ?? defaultInvoiceListMeta)
  const [invoiceClientsMeta, setInvoiceClientsMeta] = useState<InvoiceListMeta>(initialAdminCache?.invoiceClientsMeta ?? defaultInvoiceListMeta)
  const [invoiceEmailLogsMeta, setInvoiceEmailLogsMeta] = useState<InvoiceListMeta>(initialAdminCache?.invoiceEmailLogsMeta ?? defaultInvoiceListMeta)
  const [pricingCategories, setPricingCategories] = useState<PricingCategory[]>([])
  const [pricingCategoryForm, setPricingCategoryForm] = useState(emptyPricingCategoryForm)
  const [pricingPlanForm, setPricingPlanForm] = useState(emptyPricingPlanForm)
  const [editingPricingCategory, setEditingPricingCategory] = useState<PricingCategory | null>(null)
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
  const [googleCalendars, setGoogleCalendars] = useState<Array<{ id: string; summary: string; primary: boolean; accessRole: string; canCreateEvents: boolean; selected: boolean }>>([])
  const [loadingGoogleCalendars, setLoadingGoogleCalendars] = useState(false)
  const [googleCalendarMessage, setGoogleCalendarMessage] = useState('')
  const loadedGoogleCalendarsFor = useRef('')
  const [loadingGoogleReviews, setLoadingGoogleReviews] = useState(false)
  const [googleReviewSettings, setGoogleReviewSettings] = useState<GoogleReviewConnection | null>(null)
  const [trustpilotReviewSettings, setTrustpilotReviewSettings] = useState<GoogleReviewConnection | null>(null)
  const [trustpilotBusinessUrl, setTrustpilotBusinessUrl] = useState('')
  const [trustpilotApiKey, setTrustpilotApiKey] = useState('')
  const loadedGoogleReviewSettings = useRef(false)
  const [reviewAdminSection, setReviewAdminSection] = useState<ReviewAdminSection>('google')
  const [editingPageId, setEditingPageId] = useState<number | null>(initialAdminCache?.cms?.pages?.[0]?.id ?? null)
  const [projects, setProjects] = useState<Project[]>(initialAdminCache?.projects ?? [])
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [projectSearch, setProjectSearch] = useState('')
  const [projectStatusFilter, setProjectStatusFilter] = useState<'all' | Project['status']>('all')
  const [projectCategoryFilter, setProjectCategoryFilter] = useState('all')
  const [projectPage, setProjectPage] = useState(1)
  const [projectPerPage, setProjectPerPage] = useState(10)
  const [projectDragId, setProjectDragId] = useState<number | null>(null)
  const [showProjectArrangeView, setShowProjectArrangeView] = useState(false)
  const [mediaPickerVisibleCount, setMediaPickerVisibleCount] = useState(12)
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [editingReview, setEditingReview] = useState<Review | null>(null)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewSearch, setReviewSearch] = useState('')
  const [reviewProviderFilter, setReviewProviderFilter] = useState('all')
  const [reviewStatusFilter, setReviewStatusFilter] = useState('all')
  const [reviewPage, setReviewPage] = useState(1)
  const [reviewPerPage, setReviewPerPage] = useState(10)
  const [projectForm, setProjectForm] = useState<ProjectInput>(emptyProject)
  const [reviewForm, setReviewForm] = useState<ReviewInput>(emptyReview)
  const [bookingCalendarForm, setBookingCalendarForm] = useState(emptyBookingCalendar)
  const [editingCalendar, setEditingCalendar] = useState<BookingCalendar | null>(null)
  const [calendarSettingsSection, setCalendarSettingsSection] = useState<CalendarSettingsSection>('form')
  const [activeLocationTab, setActiveLocationTab] = useState<LocationTab>('google-meet')
  const [questionModal, setQuestionModal] = useState<QuestionModalState | null>(null)
  const [availabilityForm, setAvailabilityForm] = useState(emptyAvailabilityRule)
  const [settingsForm, setSettingsForm] = useState<Record<string, string>>(initialAdminCache?.cms?.settings ?? {})
  const [siteSettingsSection, setSiteSettingsSection] = useState<SiteSettingsSection>('menu')
  const [mailSettings, setMailSettings] = useState<MailSettings>(emptyMailSettings)
  const [mailTestEmail, setMailTestEmail] = useState('')
  const [siteEmailLogs, setSiteEmailLogs] = useState<SiteEmailLog[]>([])
  const [selectedSiteEmailLog, setSelectedSiteEmailLog] = useState<SiteEmailLog | null>(null)
  const [siteEmailLogsMeta, setSiteEmailLogsMeta] = useState<InvoiceListMeta>(defaultInvoiceListMeta)
  const [siteEmailLogStatus, setSiteEmailLogStatus] = useState('')
  const [siteEmailLogSearch, setSiteEmailLogSearch] = useState('')
  const [deploymentRunning, setDeploymentRunning] = useState(false)
  const [deploymentResults, setDeploymentResults] = useState<DeploymentCommandResult[]>([])
  const [deploymentCompletedAt, setDeploymentCompletedAt] = useState('')
  const loadedMailSettings = useRef(false)
  const [profileForms, setProfileForms] = useState<Record<number, { name: string; email: string }>>({})
  const [passwordForms, setPasswordForms] = useState<Record<number, { password: string; confirmation: string }>>({})
  const [twoFactorForms, setTwoFactorForms] = useState<Record<number, { secret: string; otpauthUri: string; code: string }>>({})
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

  useEffect(() => {
    if (activeSection !== 'settings') return

    if (siteSettingsSection === 'smtp' && !loadedMailSettings.current) {
      loadedMailSettings.current = true
      void loadMailSettings()
    }

    if (siteSettingsSection === 'email-logs') {
      void loadSiteEmailLogs()
    }
  }, [activeSection, siteSettingsSection])

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

  useEffect(() => {
    setProjectPage(1)
  }, [projectSearch, projectStatusFilter, projectCategoryFilter, projectPerPage])

  useEffect(() => {
    setMediaPickerVisibleCount(12)
  }, [mediaPicker, mediaSearch])

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
              partialPaymentEnabled: doc.partialPaymentEnabled ?? true,
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
  const loadAdminDataEffect = useEffectEvent((showLoading: boolean) => loadAdminData(showLoading))
  const loadInvoiceDataEffect = useEffectEvent((options: Parameters<typeof loadInvoiceData>[0]) => loadInvoiceData(options))
  const loadGoogleCalendarsEffect = useEffectEvent(() => loadGoogleCalendars())

  useEffect(() => {
    if (!token) return
    void loadAdminDataEffect(!initialAdminCache)
  }, [initialAdminCache, token])

  useEffect(() => {
    if (!token || activeSection !== 'bookings') return
    void loadBookingCmsData()
  }, [token, activeSection])

  useEffect(() => {
    const connectedEmail = bookingCmsSettings.google_connected_email || ''
    if (!token || activeSection !== 'bookings' || activeBookingSection !== 'settings' || !connectedEmail || loadedGoogleCalendarsFor.current === connectedEmail) return
    loadedGoogleCalendarsFor.current = connectedEmail
    void loadGoogleCalendarsEffect()
  }, [token, activeSection, activeBookingSection, bookingCmsSettings.google_connected_email])

  useEffect(() => {
    if (!token || activeSection !== 'invoices') return
    const documentType = ['invoices', 'quotes', 'receipts'].includes(activeInvoiceSubsection)
      ? activeInvoiceSubsection.slice(0, -1)
      : ''
    void loadInvoiceDataEffect({
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
  }, [token, activeSection, activeInvoiceSubsection, invoiceListPage, invoiceClientsPage, invoiceEmailLogsPage, invoiceStatusFilter, invoiceEmailStatusFilter, invoiceEmailTypeFilter, invoiceSearch])

  useEffect(() => {
    if (!token || activeSection !== 'pricing') return
    void loadPricingData()
  }, [token, activeSection])

  useEffect(() => {
    if (!token || activeSection !== 'reviews' || loadedGoogleReviewSettings.current) return
    loadedGoogleReviewSettings.current = true
    void loadGoogleReviewConnection()
  }, [token, activeSection])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const googleStatus = params.get('booking_google')

    if (googleStatus) {
      queueMicrotask(() => {
        setActiveSection('bookings')
        setActiveBookingSection('settings')
      })
    }

    if (googleStatus === 'connected') {
      notify('Google account connected.')
      void loadGoogleCalendars()
    } else if (googleStatus === 'failed') {
      queueMicrotask(() => setError('Google connection failed. Please try again.'))
    }

    if (googleStatus) {
      window.history.replaceState({}, '', window.location.pathname)
    }
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

  async function loadPricingData() {
    try {
      const result = await api.adminPricing()
      setPricingCategories(result.categories)
      setPricingPlanForm((current) => ({
        ...current,
        pricingCategoryId: current.pricingCategoryId || result.categories[0]?.id || 0,
      }))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load pricing.')
    }
  }

  async function savePricingCategory(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const payload = pricingCategoryForm
      if (editingPricingCategory) {
        await api.updatePricingCategory(editingPricingCategory.id, payload)
      } else {
        await api.createPricingCategory(payload)
      }
      notify(editingPricingCategory ? 'Pricing category updated.' : 'Pricing category created.')
      setEditingPricingCategory(null)
      setPricingCategoryForm(emptyPricingCategoryForm)
      await loadPricingData()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save pricing category.')
    } finally {
      setSaving(false)
    }
  }

  async function savePricingRates() {
    setSaving(true)
    setError('')

    try {
      const result = await api.updateSettings({
        ...settingsForm,
        pricing_rate_usd: String(pricingRate(settingsForm, 'USD')),
        pricing_rate_gbp: String(pricingRate(settingsForm, 'GBP')),
      })
      setCms((current) => (current ? { ...current, settings: result.settings } : current))
      setSettingsForm(result.settings)
      notify('Pricing exchange rates saved.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save pricing rates.')
    } finally {
      setSaving(false)
    }
  }

  async function deletePricingCategory(id: number) {
    if (!window.confirm('Delete this pricing category and its plans?')) return
    await api.deletePricingCategory(id)
    notify('Pricing category deleted.')
    await loadPricingData()
  }

  async function deletePricingPlan(id: number) {
    if (!window.confirm('Delete this pricing plan? Existing invoices keep their snapshots.')) return
    await api.deletePricingPlan(id)
    notify('Pricing plan deleted.')
    await loadPricingData()
  }

  async function loadBookingCmsData(page = bookingCmsBookingsMeta.page, perPage = bookingCmsBookingsMeta.perPage) {
    try {
      const [overviewResult, calendarsResult, bookingsResult, availabilityResult, settingsResult] = await Promise.all([
        api.bookingOverview(),
        api.bookingCalendars(),
        api.bookingCmsBookings({ page, perPage }),
        api.bookingAvailabilityAdmin(),
        api.bookingSettings(),
      ])
      setBookingOverview(overviewResult)
      setBookingCalendars(calendarsResult.data)
      setBookingCmsBookings(bookingsResult.data)
      setBookingCmsBookingsMeta({
        page: bookingsResult.meta.currentPage,
        perPage: bookingsResult.meta.perPage,
        total: bookingsResult.meta.total,
        lastPage: bookingsResult.meta.lastPage,
      })
      setSelectedBookingIds((current) => current.filter((id) => bookingsResult.data.some((booking) => booking.id === id)))
      setBookingAvailabilityRules(availabilityResult.rules)
      setBookingCmsSettings(settingsResult.settings)
      if (expandedBookingId && !bookingsResult.data.some((booking) => booking.id === expandedBookingId)) {
        setExpandedBookingId(null)
      }
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

  async function uploadFile(file: File, onDone?: (media: MediaItem) => void | Promise<void>) {
    setError('')
    try {
      const uploadTarget = await optimizeImageFile(file)
      if (uploadTarget !== file) {
        notify('Image optimized for upload.')
      }
      const result = await api.uploadMedia(uploadTarget)
      setCms((current) => (current ? { ...current, media: [result.media, ...current.media] } : current))
      await onDone?.(result.media)
      if (result.warning) {
        setError(result.warning)
      }
      notify('File uploaded to library.')
    } catch (uploadError) {
      setError(uploadErrorMessage(uploadError, 'Upload failed.'))
    }
  }

  function updateProjectField<Key extends keyof ProjectInput>(field: Key, value: ProjectInput[Key]) {
    setProjectForm((current) => ({ ...current, [field]: value }))
  }

  function editProject(project: Project) {
    setEditingProject(project)
    setProjectForm(toInput(project))
    setShowProjectForm(true)
    setActiveSection('projects')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetProjectForm() {
    setEditingProject(null)
    setProjectForm(emptyProject)
    setShowProjectForm(false)
  }

  async function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const result = editingProject ? await api.updateProject(editingProject.id, projectForm) : await api.createProject(projectForm)
      setProjects((current) => {
        const exists = current.some((project) => project.id === result.project.id)
        return (exists ? current.map((project) => (project.id === result.project.id ? result.project : project)) : [result.project, ...current])
          .sort((a, b) => (a.sortOrder || Number.MAX_SAFE_INTEGER) - (b.sortOrder || Number.MAX_SAFE_INTEGER) || a.title.localeCompare(b.title))
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

  function normalizedProjectOrder(source: Project[] = projects) {
    return [...source]
      .map((project, index) => ({ ...project, sortOrder: project.sortOrder || index + 1 }))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
      .map((project, index) => ({ ...project, sortOrder: index + 1 }))
  }

  async function persistProjectOrder(nextOrderedProjects: Project[], successMessage = 'Portfolio order updated.') {
    const normalizedProjects = nextOrderedProjects.map((project, index) => ({ ...project, sortOrder: index + 1 }))
    const previousOrder = new Map(projects.map((project) => [project.id, project.sortOrder || 0]))
    const changedProjects = normalizedProjects.filter((project) => previousOrder.get(project.id) !== project.sortOrder)

    setProjects((current) => current
      .map((project) => normalizedProjects.find((item) => item.id === project.id) ?? project)
      .sort((a, b) => (a.sortOrder || Number.MAX_SAFE_INTEGER) - (b.sortOrder || Number.MAX_SAFE_INTEGER) || a.title.localeCompare(b.title)))

    if (!changedProjects.length) return

    try {
      const results = await Promise.all(changedProjects.map((project) => api.updateProject(project.id, toInput(project))))
      setProjects((current) => current
        .map((project) => results.find((result) => result.project.id === project.id)?.project ?? project)
        .sort((a, b) => (a.sortOrder || Number.MAX_SAFE_INTEGER) - (b.sortOrder || Number.MAX_SAFE_INTEGER) || a.title.localeCompare(b.title)))
      notify(successMessage)
    } catch (orderError) {
      setError(orderError instanceof Error ? orderError.message : 'Unable to update portfolio order.')
      void loadAdminData()
    }
  }

  async function moveProject(projectId: number, direction: -1 | 1) {
    const orderedProjects = normalizedProjectOrder()
    const currentIndex = orderedProjects.findIndex((project) => project.id === projectId)
    const targetIndex = currentIndex + direction
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedProjects.length) return

    const [project] = orderedProjects.splice(currentIndex, 1)
    orderedProjects.splice(targetIndex, 0, project)
    await persistProjectOrder(orderedProjects)
  }

  async function dropProject(projectId: number, targetProjectId: number, placement: 'before' | 'after') {
    if (projectId === targetProjectId) return
    const orderedProjects = normalizedProjectOrder()
    const currentIndex = orderedProjects.findIndex((project) => project.id === projectId)
    const targetIndex = orderedProjects.findIndex((project) => project.id === targetProjectId)
    if (currentIndex < 0 || targetIndex < 0) return

    const [project] = orderedProjects.splice(currentIndex, 1)
    let insertIndex = targetIndex + (placement === 'after' ? 1 : 0)
    if (currentIndex < insertIndex) {
      insertIndex -= 1
    }
    orderedProjects.splice(Math.max(0, Math.min(orderedProjects.length, insertIndex)), 0, project)
    await persistProjectOrder(orderedProjects, 'Project order saved.')
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

  function editReview(review: Review) {
    setEditingReview(review)
    setShowReviewForm(true)
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
      setShowReviewForm(false)
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

  async function saveReviewIntegrationSettings() {
    const keys = [
      'googleReviewUrl',
      'trustpilotReviewUrl',
      'reviewFrontendMinWords',
      'reviewFrontendMaxWords',
      'reviewFrontendMinCharacters',
      'reviewFrontendMaxCharacters',
      'reviewFrontendMinRating',
      'reviewFrontendProvider',
      'reviewFrontendFeaturedOnly',
      'reviewFrontendLimit',
    ]
    const nextSettings = { ...settingsForm }
    keys.forEach((key) => {
      nextSettings[key] = settingsForm[key] ?? ''
    })

    setSaving(true)
    setError('')

    try {
      const result = await api.updateSettings(nextSettings)
      setCms((current) => (current ? { ...current, settings: result.settings } : current))
      setSettingsForm(result.settings)
      notify('Review settings saved.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save review settings.')
    } finally {
      setSaving(false)
    }
  }

  async function connectGoogleReviews() {
    setSaving(true)
    setError('')

    try {
      const result = await api.googleReviewConnection()
      setGoogleReviewSettings(result.google)
      const payload = await openTrustindexPopup(result.google.popupUrl)
      await importGoogleReviews(payload)
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : 'Unable to start Google reviews connection.')
    } finally {
      setSaving(false)
    }
  }

  async function connectTrustpilotReviews() {
    setSaving(true)
    setError('')

    try {
      const imported = await api.importTrustpilotReviews(trustpilotBusinessUrl, trustpilotApiKey)
      setCms((current) => current ? { ...current, reviews: imported.reviews } : current)
      setTrustpilotReviewSettings(imported.trustpilot)
      setTrustpilotBusinessUrl(imported.trustpilot.businessUrl)
      setTrustpilotApiKey('')
      if (imported.result.ok === false) throw new Error(imported.result.message)
      notify(imported.result.message)
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : 'Unable to connect Trustpilot reviews.')
    } finally {
      setSaving(false)
    }
  }

  async function disconnectTrustpilotReviews() {
    if (!window.confirm('Disconnect Trustpilot? Imported reviews will remain in Review Management.')) return
    setSaving(true)
    setError('')
    try {
      const result = await api.disconnectTrustpilotReviews()
      setTrustpilotReviewSettings(result.trustpilot)
      notify('Trustpilot integration disconnected.')
    } catch (disconnectError) {
      setError(disconnectError instanceof Error ? disconnectError.message : 'Unable to disconnect Trustpilot.')
    } finally {
      setSaving(false)
    }
  }

  async function loadGoogleReviewConnection() {
    setLoadingGoogleReviews(true)
    setError('')

    try {
      const [google, trustpilot] = await Promise.all([
        api.googleReviewConnection(),
        api.trustpilotReviewConnection(),
      ])
      setGoogleReviewSettings(google.google)
      setTrustpilotReviewSettings(trustpilot.trustpilot)
      setTrustpilotBusinessUrl(trustpilot.trustpilot.businessUrl || '')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load the Google review connection.')
    } finally {
      setLoadingGoogleReviews(false)
    }
  }

  function openTrustindexPopup(popupUrl: string): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const openedPopup = window.open(popupUrl, 'trustindex', 'width=850,height=850,menubar=0')
      if (!openedPopup) {
        reject(new Error('Allow popups for this site, then try connecting Google reviews again.'))
        return
      }
      const popup = openedPopup

      const timeout = window.setTimeout(() => finish(new Error('The Trustindex connection timed out. Please try again.')), 10 * 60 * 1000)
      const closed = window.setInterval(() => {
        if (popup.closed) finish(new Error('The Trustindex window was closed before the connection finished.'))
      }, 1000)

      const onMessage = (event: MessageEvent) => {
        if (event.origin !== 'https://admin.trustindex.io' || !event.data || typeof event.data !== 'object') return
        const data = event.data as Record<string, unknown>
        const payload = data.place && typeof data.place === 'object'
          ? data.place as Record<string, unknown>
          : data

        if (!payload.id && !payload.page_id && !payload.reviews) return
        finish(null, payload)
      }

      function finish(error: Error | null, payload?: Record<string, unknown>) {
        window.clearTimeout(timeout)
        window.clearInterval(closed)
        window.removeEventListener('message', onMessage)
        if (!popup.closed) popup.close()
        if (error) reject(error)
        else resolve(payload ?? {})
      }

      window.addEventListener('message', onMessage)
    })
  }

  async function importGoogleReviews(payload: Record<string, unknown>) {
    const result = await api.importGoogleReviews(payload)
    setCms((current) => current ? { ...current, reviews: result.reviews } : current)
    setGoogleReviewSettings(result.google)

    if (result.result.ok === false) {
      throw new Error(result.result.message)
    }

    notify(result.result.message)
  }

  async function disconnectGoogleReviews() {
    if (!window.confirm('Disconnect this Google Business integration? Imported reviews will remain in Review Management.')) return

    setSaving(true)
    setError('')

    try {
      const result = await api.disconnectGoogleReviews()
      setGoogleReviewSettings(result.google)
      notify('Google review integration disconnected.')
    } catch (disconnectError) {
      setError(disconnectError instanceof Error ? disconnectError.message : 'Unable to disconnect Google reviews.')
    } finally {
      setSaving(false)
    }
  }

  async function updateBookingCmsStatus(booking: BookingCmsBooking, status: string) {
    setSaving(true)
    setError('')
    try {
      const result = await api.updateBookingCmsStatus(booking.id, status, booking.adminRemarks)
      setBookingCmsBookings((current) => current.map((item) => (item.id === booking.id ? result.booking : item)))
      notify('Booking status updated.')
      await loadBookingCmsData()
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Unable to update booking status.')
    } finally {
      setSaving(false)
    }
  }

  function bookingDateTimeInputValue(value: string) {
    if (!value) return ''
    const normalized = value.includes('T') ? value : value.replace(' ', 'T')
    const match = normalized.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/)
    return match?.[1] ?? ''
  }

  async function rescheduleBookingCmsBooking(booking: BookingCmsBooking) {
    const currentValue = bookingDateTimeInputValue(booking.startsAt)
    const startsAt = window.prompt('Enter the new start time for this booking (YYYY-MM-DDTHH:mm).', currentValue)
    if (!startsAt) return

    setSaving(true)
    setError('')
    try {
      const result = await api.rescheduleBookingCmsBooking(booking.id, startsAt, booking.durationMinutes)
      setBookingCmsBookings((current) => current.map((item) => (item.id === booking.id ? result.booking : item)))
      notify('Booking rescheduled.')
      await loadBookingCmsData()
    } catch (rescheduleError) {
      setError(rescheduleError instanceof Error ? rescheduleError.message : 'Unable to reschedule booking.')
    } finally {
      setSaving(false)
    }
  }

  async function cancelBookingCmsBooking(booking: BookingCmsBooking) {
    if (!window.confirm(`Cancel booking for ${booking.customer.name}?`)) return
    const adminRemarks = window.prompt('Add a cancellation note for internal records.', booking.adminRemarks) ?? booking.adminRemarks

    setSaving(true)
    setError('')
    try {
      const result = await api.cancelBookingCmsBooking(booking.id, adminRemarks)
      setBookingCmsBookings((current) => current.map((item) => (item.id === booking.id ? result.booking : item)))
      notify('Booking cancelled.')
      await loadBookingCmsData()
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : 'Unable to cancel booking.')
    } finally {
      setSaving(false)
    }
  }

  function toggleBookingSelection(id: number, checked: boolean) {
    setSelectedBookingIds((current) => checked
      ? Array.from(new Set([...current, id]))
      : current.filter((item) => item !== id)
    )
  }

  function toggleCurrentBookingPageSelection(checked: boolean) {
    const currentPageIds = bookingCmsBookings.map((booking) => booking.id)
    setSelectedBookingIds((current) => checked
      ? Array.from(new Set([...current, ...currentPageIds]))
      : current.filter((id) => !currentPageIds.includes(id))
    )
  }

  async function deleteBookingCmsBooking(booking: BookingCmsBooking) {
    if (!window.confirm(`Permanently delete booking for ${booking.customer.name}? This cannot be undone.`)) return

    setSaving(true)
    setError('')
    try {
      await api.deleteBookingCmsBooking(booking.id)
      setSelectedBookingIds((current) => current.filter((id) => id !== booking.id))
      setExpandedBookingId((current) => current === booking.id ? null : current)
      notify('Booking deleted.')
      const nextPage = bookingCmsBookings.length <= 1 && bookingCmsBookingsMeta.page > 1
        ? bookingCmsBookingsMeta.page - 1
        : bookingCmsBookingsMeta.page
      await loadBookingCmsData(nextPage, bookingCmsBookingsMeta.perPage)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete booking.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteSelectedBookingCmsBookings() {
    if (selectedBookingIds.length === 0) return
    if (!window.confirm(`Permanently delete ${selectedBookingIds.length} selected booking${selectedBookingIds.length === 1 ? '' : 's'}? This cannot be undone.`)) return

    setSaving(true)
    setError('')
    try {
      const ids = [...selectedBookingIds]
      await api.deleteBookingCmsBookings(ids)
      setSelectedBookingIds([])
      setExpandedBookingId((current) => current && ids.includes(current) ? null : current)
      notify('Selected bookings deleted.')
      const deletedOnPage = bookingCmsBookings.filter((booking) => ids.includes(booking.id)).length
      const nextPage = deletedOnPage >= bookingCmsBookings.length && bookingCmsBookingsMeta.page > 1
        ? bookingCmsBookingsMeta.page - 1
        : bookingCmsBookingsMeta.page
      await loadBookingCmsData(nextPage, bookingCmsBookingsMeta.perPage)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete selected bookings.')
    } finally {
      setSaving(false)
    }
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
    setGoogleCalendarMessage('')
    setError('')
    try {
      const result = await api.googleCalendars()
      setGoogleCalendars(result.calendars)
      setGoogleCalendarMessage(result.message || '')
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
      setGoogleCalendarMessage(result.message || '')
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

  async function loadMailSettings() {
    setError('')
    try {
      const result = await api.mailSettings()
      setMailSettings(result.settings)
      setMailTestEmail((current) => current || result.settings.fromAddress)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load SMTP settings.')
    }
  }

  async function saveMailSettings() {
    setSaving(true)
    setError('')
    try {
      const result = await api.updateMailSettings(mailSettings)
      setMailSettings(result.settings)
      notify('SMTP settings saved.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save SMTP settings.')
    } finally {
      setSaving(false)
    }
  }

  async function sendTestMail() {
    if (!mailTestEmail.trim()) {
      setError('Enter a test email address.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const result = await api.testMail(mailTestEmail.trim())
      notify(result.message)
      await loadSiteEmailLogs()
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Unable to send the test email.')
      await loadSiteEmailLogs()
    } finally {
      setSaving(false)
    }
  }

  async function loadSiteEmailLogs(page = 1) {
    setError('')
    try {
      const result = await api.siteEmailLogs({
        page,
        perPage: siteEmailLogsMeta.perPage,
        status: siteEmailLogStatus,
        search: siteEmailLogSearch,
      })
      setSiteEmailLogs(result.logs)
      setSiteEmailLogsMeta(result.meta)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load email logs.')
    }
  }

  async function clearSiteEmailLogs() {
    if (!window.confirm('Clear all website email logs?')) return

    setSaving(true)
    setError('')
    try {
      const result = await api.clearSiteEmailLogs()
      notify(`${result.deleted} email logs cleared.`)
      setSelectedSiteEmailLog(null)
      await loadSiteEmailLogs(1)
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : 'Unable to clear email logs.')
    } finally {
      setSaving(false)
    }
  }

  async function previewSiteEmail(log: SiteEmailLog) {
    setSelectedSiteEmailLog(log)
    setError('')
    try {
      const result = await api.siteEmailLog(log.id)
      setSelectedSiteEmailLog(result.log)
    } catch (previewError) {
      setSelectedSiteEmailLog(null)
      setError(previewError instanceof Error ? previewError.message : 'Unable to load email preview.')
    }
  }

  async function runDeploymentMaintenance() {
    const confirmed = window.confirm(
      'Run database migrations and rebuild Laravel caches now? The site may respond more slowly while this is running.'
    )
    if (!confirmed) return

    setDeploymentRunning(true)
    setDeploymentResults([])
    setDeploymentCompletedAt('')
    setError('')

    try {
      const result = await api.runDeploymentMaintenance()
      setDeploymentResults(result.results)
      setDeploymentCompletedAt(result.completedAt)
      notify(result.message)
    } catch (maintenanceError) {
      setError(maintenanceError instanceof Error ? maintenanceError.message : 'Deployment maintenance failed.')
    } finally {
      setDeploymentRunning(false)
    }
  }

  async function updateAdminUserPassword(userId: number) {
    const form = passwordForms[userId] ?? { password: '', confirmation: '' }
    if (!form.password || !form.confirmation) {
      setError('Enter and confirm the new password.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const result = await api.updateAdminUserPassword(userId, form.password, form.confirmation)
      setCms((current) => current ? {
        ...current,
        users: current.users.map((user) => user.id === userId ? result.user : user),
      } : current)
      setPasswordForms((current) => ({ ...current, [userId]: { password: '', confirmation: '' } }))
      notify('Password updated.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update password.')
    } finally {
      setSaving(false)
    }
  }

  async function updateAdminUserProfile(userId: number) {
    const user = cms?.users.find((item) => item.id === userId)
    const form = profileForms[userId] ?? { name: user?.name ?? '', email: user?.email ?? '' }
    if (!form.name.trim() || !form.email.trim()) {
      setError('Enter a name and email address.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const result = await api.updateAdminUser(userId, { name: form.name.trim(), email: form.email.trim() })
      setCms((current) => current ? {
        ...current,
        users: current.users.map((item) => item.id === userId ? result.user : item),
      } : current)
      setProfileForms((current) => ({ ...current, [userId]: { name: result.user.name, email: result.user.email } }))
      notify('User profile updated.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update user profile.')
    } finally {
      setSaving(false)
    }
  }

  async function startAdminUserTwoFactorSetup(userId: number) {
    setSaving(true)
    setError('')

    try {
      const result = await api.setupAdminUserTwoFactor(userId)
      setCms((current) => current ? {
        ...current,
        users: current.users.map((item) => item.id === userId ? result.user : item),
      } : current)
      setTwoFactorForms((current) => ({ ...current, [userId]: { secret: result.secret, otpauthUri: result.otpauthUri, code: '' } }))
      notify('Two-factor setup started.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to start two-factor setup.')
    } finally {
      setSaving(false)
    }
  }

  async function enableAdminUserTwoFactor(userId: number) {
    const form = twoFactorForms[userId] ?? { secret: '', otpauthUri: '', code: '' }
    if (form.code.length !== 6) {
      setError('Enter the 6-digit authenticator code.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const result = await api.enableAdminUserTwoFactor(userId, form.code)
      setCms((current) => current ? {
        ...current,
        users: current.users.map((item) => item.id === userId ? result.user : item),
      } : current)
      setTwoFactorForms((current) => ({ ...current, [userId]: { secret: '', otpauthUri: '', code: '' } }))
      notify('Two-factor authentication enabled.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to enable two-factor authentication.')
    } finally {
      setSaving(false)
    }
  }

  async function disableAdminUserTwoFactor(userId: number) {
    if (!window.confirm('Disable two-factor authentication for this user?')) return

    setSaving(true)
    setError('')

    try {
      const result = await api.disableAdminUserTwoFactor(userId)
      setCms((current) => current ? {
        ...current,
        users: current.users.map((item) => item.id === userId ? result.user : item),
      } : current)
      setTwoFactorForms((current) => ({ ...current, [userId]: { secret: '', otpauthUri: '', code: '' } }))
      notify('Two-factor authentication disabled.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to disable two-factor authentication.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteAdminUser(userId: number) {
    const user = cms?.users.find((item) => item.id === userId)
    if (!user || !window.confirm(`Delete admin user ${user.email}?`)) return

    setSaving(true)
    setError('')

    try {
      await api.deleteAdminUser(userId)
      setCms((current) => current ? {
        ...current,
        users: current.users.filter((item) => item.id !== userId),
      } : current)
      notify('Admin user deleted.')
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete admin user.')
    } finally {
      setSaving(false)
    }
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
    await api.deleteMediaFile(media)
    setCms((current) => (current ? { ...current, media: current.media.filter((item) => item.id !== media.id && item.url !== media.url) } : current))
    notify('File deleted.')
  }

  function invoiceFormFromSettings(type: 'invoice' | 'quote' | 'receipt' = 'invoice') {
    const enabledGateways = parseInvoiceGatewayList(settingsForm, settingsForm.currency || 'NGN')
    const defaultTaxRate = Number(settingsForm.default_tax_rate || 0)

    return {
      ...emptyInvoiceForm,
      type,
      currency: settingsForm.currency || emptyInvoiceForm.currency,
      paymentGateway: enabledGateways[0] || emptyInvoiceForm.paymentGateway,
      paymentEnabled: (settingsForm.invoicePaymentEnabled ?? 'true') !== 'false',
      partialPaymentEnabled: (settingsForm.enable_partial_payments ?? '1') !== '0',
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
    if (fullDocument.id) {
      void loadDocumentEmailLogs(fullDocument.id)
    } else {
      setDocumentEmailLogs([])
    }
    setEditingInvoice(fullDocument)
    setActiveInvoiceSubsection('create')
    setInvoiceForm({
      ...emptyInvoiceForm,
      ...fullDocument,
      client: fullDocument.client,
      items: fullDocument.items.length ? fullDocument.items : emptyInvoiceForm.items,
      branding: fullDocument.branding,
      paymentGateway: fullDocument.paymentGateway && fullDocument.paymentGateway !== 'manual' ? fullDocument.paymentGateway : 'paystack',
      partialPaymentEnabled: fullDocument.partialPaymentEnabled ?? true,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetInvoiceForm() {
    setEditingInvoice(null)
    setDocumentEmailLogs([])
    setInvoiceForm(invoiceFormFromSettings(invoiceForm.type === 'quote' ? 'quote' : 'invoice'))
    setActiveInvoiceSubsection(invoiceForm.type === 'quote' ? 'quotes' : 'invoices')
  }

  async function saveInvoiceDocument() {
    setSaving(true)
    setError('')

    try {
      const enabledGatewayValues = parseInvoiceGatewayList(settingsForm, invoiceForm.currency || '')
      const selectedGateway = enabledGatewayValues.includes(invoiceForm.paymentGateway || '')
        ? invoiceForm.paymentGateway
        : enabledGatewayValues[0] || 'paystack'
      const payload = { ...invoiceForm, paymentGateway: selectedGateway }
      const result = editingInvoice?.id
        ? await api.updateInvoiceDocument(editingInvoice.id as number, payload)
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
    if (document.id === null || document.id === undefined) return
    await api.sendInvoiceDocument(document.id)
    await loadDocumentEmailLogs(document.id)
    void loadInvoiceData()
    notify('Document sent.')
  }

  async function loadDocumentEmailLogs(documentId: number) {
    try {
      const result = await api.invoiceEmailLogs({ documentId, perPage: 100, includeOpens: 1 })
      setDocumentEmailLogs(result.logs)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load this document email log.')
    }
  }

  async function copyInvoiceLink(document: InvoiceDocument) {
    await navigator.clipboard.writeText(`${window.location.origin}${document.publicUrl}`)
    notify('Public document link copied.')
  }

  async function recordInvoicePayment(invoiceId: number, amountPaid: number, paymentMethod: string, paymentDate: string, notes: string) {
    setSaving(true)
    setError('')
    try {
      const response = await api.recordInvoicePayment(invoiceId, {
        amount: amountPaid,
        method: paymentMethod,
        date: paymentDate,
        notes: notes,
      })
      
      setEditingInvoice(response.document)
      notify('Payment recorded successfully. Receipt notification sent.')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to record payment.')
    } finally {
      setSaving(false)
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
          const result = await api.importFromJSON(data)
          setInvoiceSearch('')
          setInvoiceStatusFilter('')
          setInvoiceListPage(1)
          await loadInvoiceData({
            documentPage: 1,
            documentType: '',
            documentStatus: '',
            documentSearch: '',
            clientsPage: 1,
            clientsSearch: '',
          })
          setMessage(`${result.imported} document${result.imported === 1 ? '' : 's'} imported successfully`)
        } catch (importError) {
          setError(importError instanceof Error ? importError.message : 'Invalid JSON file')
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

  async function handleExportToJSON() {
    setSaving(true)
    setError('')
    try {
      const blob = await api.exportInvoicesJSON()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `bakhtech-invoice-export-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setMessage('Export downloaded successfully')
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Export failed')
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
      { id: 'import', label: 'Import / Export', icon: Upload },
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

  function numberedPages(currentPage: number, totalPages: number) {
    const pages = new Set<number>([1, totalPages])
    for (let page = currentPage - 2; page <= currentPage + 2; page += 1) {
      if (page >= 1 && page <= totalPages) {
        pages.add(page)
      }
    }
    return Array.from(pages).sort((a, b) => a - b)
  }

  function renderNumberedPagination(args: {
    currentPage: number
    totalPages: number
    onPage: (page: number) => void
    buttonClassName?: string
    activeClassName?: string
  }) {
    const totalPages = Math.max(1, args.totalPages)
    const currentPage = Math.min(Math.max(1, args.currentPage), totalPages)
    const pages = numberedPages(currentPage, totalPages)
    const buttonClassName = args.buttonClassName ?? 'rounded-xl border border-gray-200 px-4'
    const activeClassName = args.activeClassName ?? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
    let previousPage = 0

    return (
      <div className="flex flex-wrap items-center gap-2">
        {pages.map((page) => {
          const needsGap = previousPage > 0 && page - previousPage > 1
          previousPage = page
          return (
            <span key={page} className="flex items-center gap-2">
              {needsGap ? <span className="px-1 text-sm font-black text-gray-400">...</span> : null}
              <Button
                type="button"
                variant="ghost"
                className={cn(buttonClassName, page === currentPage ? activeClassName : '')}
                aria-current={page === currentPage ? 'page' : undefined}
                onClick={() => args.onPage(page)}
              >
                {page}
              </Button>
            </span>
          )
        })}
      </div>
    )
  }

  function renderPagination(meta: InvoiceListMeta, onPage: (page: number) => void) {
    const from = meta.total === 0 ? 0 : ((meta.page - 1) * meta.perPage) + 1
    const to = Math.min(meta.total, meta.page * meta.perPage)

    return (
      <div className="bkinv-pagination">
        <span>{from}-{to} of {meta.total}</span>
        {renderNumberedPagination({
          currentPage: meta.page,
          totalPages: meta.lastPage,
          onPage,
          buttonClassName: 'bkinv-btn bkinv-btn-secondary min-w-10 justify-center px-3',
          activeClassName: 'is-active bg-blue-600 text-white',
        })}
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
      : availableGateways[0]?.value || 'paystack'
    const selectedGatewayOption = invoicePaymentGateways.find((gateway) => gateway.value === selectedGateway)
    const gatewayChoices = selectedGatewayOption && !availableGateways.some((gateway) => gateway.value === selectedGateway)
      ? [...availableGateways, selectedGatewayOption]
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
              onClick={() => void saveInvoiceDocument()}
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
                <label className="bkinv-payment-toggle">
                  <input
                    type="checkbox"
                    checked={Boolean(invoiceForm.partialPaymentEnabled)}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, partialPaymentEnabled: e.target.checked }))}
                  />
                  Allow partial payment on this document
                </label>
                <div className="bkinv-form-group">
                  <span>Online Payment Gateway</span>
                  <small className="text-xs font-semibold text-gray-500">Manual/offline payment is always available on the public document.</small>
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
                  onClick={() => void saveInvoiceDocument()}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? 'Saving...' : isEdit ? 'Update Document' : `Create ${documentLabel}`}
                </Button>
                {isEdit && editingInvoice?.publicUrl ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      className="bkinv-btn bkinv-btn-secondary bkinv-btn-block"
                      onClick={() => void sendInvoiceDocument(editingInvoice)}
                    >
                      <Send className="h-4 w-4" />
                      Send Email Notification
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="bkinv-btn bkinv-btn-secondary bkinv-btn-block"
                      onClick={() => window.open(editingInvoice.publicUrl, '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                      View Public Link
                    </Button>
                  </>
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
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="ml-auto"
                          onClick={() => editingInvoice.id && void loadDocumentEmailLogs(editingInvoice.id)}
                        >
                          Refresh
                        </Button>
                      </div>
                      <div className="bkinv-card-body grid gap-3">
                        <p className="text-xs text-gray-500">
                          Opens are detected by a tracking image. Privacy tools and email image proxies can hide or pre-load device and location data.
                        </p>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {documentEmailLogs.map((log) => (
                            <div key={log.id} className={cn('rounded border-l-4 p-3 text-xs', log.status === 'failed' ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50')}>
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="font-bold">{log.subject}</div>
                                  <div className="text-gray-600">To: {log.recipientEmail}</div>
                                </div>
                                <span className={cn('bkinv-email-status', `is-${log.status}`)}>{log.status}</span>
                              </div>
                              <div className="mt-2 text-gray-500">
                                Sent: {log.sentAt ? new Date(log.sentAt).toLocaleString() : 'Not sent'}
                              </div>
                              {log.errorMessage ? <div className="mt-1 text-red-700">{log.errorMessage}</div> : null}
                              <div className="mt-3 border-t border-black/10 pt-2 font-semibold">
                                {log.openCount || log.opens.length} open{(log.openCount || log.opens.length) === 1 ? '' : 's'}
                              </div>
                              {log.opens.map((open) => {
                                const device = [open.browser, open.operatingSystem, open.deviceType].filter((value) => value && value !== 'Unknown').join(' on ')
                                const location = [open.city, open.country].filter(Boolean).join(', ')
                                return (
                                  <div key={open.id} className="mt-2 rounded bg-white/80 p-2 text-gray-600">
                                    <div className="font-semibold text-gray-800">{device || 'Device unavailable'}</div>
                                    <div>{location || 'Location unavailable'}</div>
                                    <div>{new Date(open.openedAt).toLocaleString()}</div>
                                    <div className="break-all text-[10px] text-gray-400">IP: {open.ipAddress || 'Unavailable'}</div>
                                  </div>
                                )
                              })}
                            </div>
                          ))}
                          {!documentEmailLogs.length ? (
                            <div className="rounded bg-gray-50 p-4 text-center text-xs text-gray-500">No emails have been sent for this document.</div>
                          ) : null}
                        </div>
                        <div className="grid grid-cols-2 gap-2 border-t pt-2 text-xs">
                          <div>
                            <div className="text-gray-600">Sent</div>
                            <div className="font-semibold">{documentEmailLogs.filter((log) => log.status === 'sent').length}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Opened</div>
                            <div className="font-semibold">{documentEmailLogs.reduce((count, log) => count + (log.openCount || log.opens.length), 0)}</div>
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
    const settingGroups: Array<{ title: string; description: string; fields: InvoiceSettingsField[] }> = [
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
        const parsed: unknown = JSON.parse(String(settingsForm.bank_currency_accounts || '[]'))
        return Array.isArray(parsed)
          ? parsed.filter((row): row is CurrencyAccountRow => Boolean(row && typeof row === 'object'))
          : []
      } catch {
        return []
      }
    })()
    const setCurrencyAccountRows = (rows: CurrencyAccountRow[]) => setField('bank_currency_accounts', JSON.stringify(rows))
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

    const renderField = (field: InvoiceSettingsField) => {
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
            <h4>Enabled online payment gateways</h4>
            <p>Manual/offline payment is always active on public invoices. Select only the online checkout gateways available on invoice and quote edit screens.</p>
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
          <h3 className="text-2xl font-black text-gray-900">Import / Export Data</h3>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
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
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
            <h4 className="text-lg font-black mb-3 text-gray-900">Export to JSON File</h4>
            <p className="text-gray-500 mb-6">Download invoices, quotes, receipts, line items, payments, activity logs, and email logs in the same JSON structure this importer accepts.</p>
            <Button type="button" className="bkinv-btn bkinv-btn-primary" onClick={() => void handleExportToJSON()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {saving ? 'Preparing export...' : 'Download JSON Export'}
            </Button>
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
              {cards.map((card) => (
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
                                    partialPaymentEnabled: doc.partialPaymentEnabled ?? true,
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
    return <AdminPostsWorkspace />
  }

  function renderProjects() {
    const orderedProjects = [...projects].sort((a, b) => (a.sortOrder || Number.MAX_SAFE_INTEGER) - (b.sortOrder || Number.MAX_SAFE_INTEGER) || a.title.localeCompare(b.title))
    const projectCategories = Array.from(new Set(orderedProjects.map((project) => project.category).filter(Boolean))).sort()
    const filteredProjects = orderedProjects.filter((project) => {
      const query = projectSearch.trim().toLowerCase()
      const matchesSearch = !query
        || project.title.toLowerCase().includes(query)
        || project.category.toLowerCase().includes(query)
        || project.summary.toLowerCase().includes(query)
        || project.websiteUrl.toLowerCase().includes(query)
      const matchesStatus = projectStatusFilter === 'all' || project.status === projectStatusFilter
      const matchesCategory = projectCategoryFilter === 'all' || project.category === projectCategoryFilter
      return matchesSearch && matchesStatus && matchesCategory
    })
    const totalProjectPages = Math.max(1, Math.ceil(filteredProjects.length / projectPerPage))
    const activeProjectPage = Math.min(projectPage, totalProjectPages)
    const visibleProjects = filteredProjects.slice((activeProjectPage - 1) * projectPerPage, activeProjectPage * projectPerPage)
    const openNewProjectForm = () => {
      setEditingProject(null)
      setProjectForm({
        ...emptyProject,
        sortOrder: (orderedProjects[orderedProjects.length - 1]?.sortOrder ?? orderedProjects.length) + 1,
      })
      setShowProjectForm(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    const fieldClass = 'theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500'
    const labelClass = 'grid gap-2 text-sm font-bold text-gray-700'
    const persistProjectMedia = async (
      field: keyof Pick<ProjectInput, 'image' | 'coverImage' | 'videoUrl'>,
      url: string,
    ) => {
      const nextForm = { ...projectForm, [field]: url }
      updateProjectField(field, url)
      if (!editingProject) {
        return
      }

      let result: { project: Project }
      try {
        result = await api.updateProjectMedia(editingProject.id, field, url)
      } catch {
        try {
          result = await api.updateProject(editingProject.id, nextForm)
        } catch {
          result = await api.updateProjectLegacy(editingProject.id, nextForm)
        }
      }
      setEditingProject(result.project)
      setProjectForm(toInput(result.project))
      setProjects((current) => current.map((project) => (project.id === result.project.id ? result.project : project)))
      notify('Project image updated.')
    }
    const uploadMediaForPicker = async (
      file: File,
      picker: NonNullable<MediaPickerState>,
    ) => {
      setError('')
      try {
        const uploadTarget = await optimizeImageFile(file)
        if (uploadTarget !== file) {
          notify('Image optimized for upload.')
        }
        const result = await api.uploadMedia(uploadTarget)
        setCms((current) => (current ? { ...current, media: [result.media, ...current.media.filter((item) => item.url !== result.media.url)] } : current))
        await persistProjectMedia(picker.field, result.media.url)
        if (result.warning) {
          setError(result.warning)
        }
        setMediaPicker(null)
      } catch (uploadError) {
        setError(uploadErrorMessage(uploadError, 'Unable to upload and select this media.'))
      }
    }
    const updateProjectStatus = async (project: Project, status: Project['status']) => {
      if (project.status === status) return
      setError('')
      try {
        const result = await api.updateProject(project.id, { ...toInput(project), status })
        setProjects((current) => current.map((item) => (item.id === result.project.id ? result.project : item)))
        if (editingProject?.id === result.project.id) {
          setEditingProject(result.project)
          setProjectForm(toInput(result.project))
        }
        notify(status === 'draft' ? 'Project moved to draft.' : 'Project published.')
      } catch (statusError) {
        setError(statusError instanceof Error ? statusError.message : 'Unable to update project status.')
      }
    }
    const pickerItems = (cms?.media ?? []).filter((media) => media.mimeType.startsWith(mediaPicker?.field === 'videoUrl' ? 'video/' : 'image/'))
    const filteredPickerItems = pickerItems.filter((media) => {
      const query = mediaSearch.trim().toLowerCase()
      return !query || media.originalName.toLowerCase().includes(query) || media.url.toLowerCase().includes(query)
    })
    const visiblePickerItems = filteredPickerItems.slice(0, mediaPickerVisibleCount)
    const renderMediaInput = (
      title: string,
      text: string,
      value: string,
      accept: string,
      field: keyof Pick<ProjectInput, 'image' | 'coverImage' | 'videoUrl'>,
      placeholder: string,
    ) => (
      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="text-sm font-black uppercase tracking-wide text-gray-900">{title}</h4>
            <p className="mt-1 text-xs font-semibold leading-5 text-gray-500">{text}</p>
          </div>
          {value ? (
            <button type="button" className="text-xs font-black text-red-500" onClick={() => updateProjectField(field, '')}>
              Clear
            </button>
          ) : null}
        </div>
        <div className="mt-4">
          <button
            type="button"
            className="flex min-h-24 w-full flex-col items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-center text-sm font-black text-gray-700 transition hover:border-blue-300 hover:bg-blue-50/60"
            onClick={() => {
              setMediaSearch('')
              setMediaPicker({ field, title, accept })
            }}
          >
            <Images className="h-5 w-5 text-blue-600" />
            Choose from library
          </button>
        </div>
        {value ? <div className="mt-4"><ProjectMediaPreview src={value} title={projectForm.title} /></div> : null}
        <input
          className={`${fieldClass} mt-4 w-full text-sm`}
          placeholder={placeholder}
          value={value}
          onChange={(event) => updateProjectField(field, event.target.value)}
        />
      </section>
    )
    const renderProjectRow = (project: Project, options: { compact?: boolean } = {}) => {
      const globalIndex = orderedProjects.findIndex((item) => item.id === project.id)
      return (
        <article
          key={project.id}
          draggable
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = 'move'
            event.dataTransfer.setData('text/plain', String(project.id))
            setProjectDragId(project.id)
          }}
          onDragEnd={() => setProjectDragId(null)}
          onDragOver={(event) => {
            if (projectDragId && projectDragId !== project.id) {
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
            }
          }}
          onDrop={(event) => {
            event.preventDefault()
            const draggedProjectId = Number(event.dataTransfer.getData('text/plain')) || projectDragId
            setProjectDragId(null)
            if (!draggedProjectId || draggedProjectId === project.id) return
            const bounds = event.currentTarget.getBoundingClientRect()
            const placement = event.clientY > bounds.top + (bounds.height / 2) ? 'after' : 'before'
            void dropProject(draggedProjectId, project.id, placement)
          }}
          className={cn(
            'grid cursor-grab gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 transition md:grid-cols-[8rem_minmax(0,1fr)_auto] md:items-center',
            options.compact ? 'md:grid-cols-[4.5rem_minmax(0,1fr)_auto] md:p-3' : '',
            projectDragId === project.id ? 'opacity-50 ring-2 ring-blue-200' : 'hover:border-blue-200',
          )}
        >
          <div className={cn('h-24 w-full overflow-hidden rounded-lg md:h-20', options.compact ? 'md:h-14' : '')}>
            {isVideoMedia(project.image) ? (
              <video className="h-full w-full object-cover" src={project.image} muted preload="metadata" />
            ) : isYoutubeMedia(project.image) ? (
              <div className="surface-card grid h-full place-items-center text-xs font-black text-soft">YouTube</div>
            ) : (
              <SafeImage className="h-full w-full object-cover" src={project.image} fallbackSrc={adminMediaFallbackSrc(project.title)} alt="" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <GripVertical className="h-4 w-4 text-gray-400" aria-hidden="true" />
              <h4 className={cn('font-black text-gray-900', options.compact ? 'text-base' : 'text-lg')}>{project.title}</h4>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-gray-500">#{globalIndex + 1}</span>
              {project.status === 'draft' ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black uppercase text-amber-700">Draft</span> : null}
            </div>
            <p className="text-gray-500 mt-1 text-sm">{project.category} - {project.status}</p>
            {!options.compact && project.summary ? <p className="text-gray-500 mt-2 text-sm leading-relaxed">{project.summary}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2 md:mt-4 md:flex-col">
            <select
              className="theme-input min-h-10 rounded-xl border border-gray-200 px-3 text-sm font-bold outline-none focus:border-blue-500"
              value={project.status}
              onChange={(event) => void updateProjectStatus(project, event.target.value as Project['status'])}
              title="Change project publish status"
            >
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" className="h-10 w-10 rounded-xl border border-gray-200 p-0" disabled={globalIndex <= 0} onClick={() => void moveProject(project.id, -1)} title="Move project up">
                <ChevronLeft className="h-4 w-4 rotate-90" />
              </Button>
              <Button type="button" variant="ghost" className="h-10 w-10 rounded-xl border border-gray-200 p-0" disabled={globalIndex >= orderedProjects.length - 1} onClick={() => void moveProject(project.id, 1)} title="Move project down">
                <ChevronRight className="h-4 w-4 rotate-90" />
              </Button>
            </div>
            <Button type="button" variant="ghost" className="min-h-10 px-4" onClick={() => editProject(project)}><Pencil className="h-4 w-4 mr-2" />Edit</Button>
            {!options.compact ? <Button type="button" variant="ghost" className="min-h-10 px-4 text-red-500" onClick={() => void deleteProject(project.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</Button> : null}
          </div>
        </article>
      )
    }

    return (
      <div>
        <PanelHeader 
          eyebrow="Projects" 
          title="Portfolio Project Manager" 
          text="Add project images, optional video presentations, website links, and publish them to the frontend portfolio." 
        />
        <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto_auto] lg:items-center">
            <div>
              <h3 className="text-xl font-black text-gray-900">Portfolio Controls</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">Manage project cards, visibility, and frontend order from one full-width list.</p>
            </div>
            <select
              className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500"
              value={settingsForm.homePortfolioShowDescriptions ?? 'true'}
              onChange={(e) => void updateProjectDisplaySetting(e.target.value)}
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
            <Button type="button" className="min-h-11 rounded-xl bg-blue-600 px-5 text-white hover:bg-blue-700" onClick={openNewProjectForm}>
              <Plus className="h-4 w-4" />
              Add Project
            </Button>
          </div>
        </section>
        {showProjectForm ? (
          <section className="mb-6 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-gray-100 bg-gray-50/70 p-5 md:flex-row md:items-center md:justify-between md:p-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">{editingProject ? 'Editing project' : 'New project'}</p>
                <h3 className="mt-1 text-2xl font-black text-gray-900">{editingProject ? projectForm.title || 'Edit project' : 'Add project'}</h3>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-gray-500">Use the primary image for the portfolio card. The cover image is only a fallback for video presentations.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {editingProject ? <Button type="button" variant="ghost" className="rounded-xl border border-gray-200 bg-white" onClick={openNewProjectForm}><Plus className="h-4 w-4" />New</Button> : null}
                <Button type="button" variant="ghost" className="rounded-xl border border-gray-200 bg-white" onClick={resetProjectForm}><X className="h-4 w-4" />Close</Button>
              </div>
            </div>

            <form className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:p-6 xl:grid-cols-[minmax(0,1fr)_26rem]" onSubmit={saveProject}>
              <div className="grid gap-5">
                <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:p-5">
                  <h4 className="text-lg font-black text-gray-900">Project details</h4>
                  <div className="mt-5 grid gap-4">
                    <label className={labelClass}>
                      Project title
                      <input className={fieldClass} placeholder="e.g. Celeb Beauty Clinic" value={projectForm.title} onChange={(event) => updateProjectField('title', event.target.value)} required />
                    </label>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className={labelClass}>
                        Category
                        <input className={fieldClass} placeholder="Beauty, Booking Website" value={projectForm.category} onChange={(event) => updateProjectField('category', event.target.value)} required />
                      </label>
                      <label className={labelClass}>
                        Status
                        <select className={fieldClass} value={projectForm.status} onChange={(event) => updateProjectField('status', event.target.value as ProjectInput['status'])}>
                          <option value="published">Published</option>
                          <option value="draft">Draft</option>
                        </select>
                      </label>
                    </div>
                    <label className={labelClass}>
                      Website URL
                      <input className={fieldClass} placeholder="https://example.com" value={projectForm.websiteUrl} onChange={(event) => updateProjectField('websiteUrl', event.target.value)} />
                    </label>
                    <label className={labelClass}>
                      Services
                      <input className={fieldClass} placeholder="Website, SEO, UI/UX" value={projectForm.services} onChange={(event) => updateProjectField('services', event.target.value)} />
                    </label>
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:p-5">
                  <h4 className="text-lg font-black text-gray-900">Content</h4>
                  <div className="mt-5 grid gap-4">
                    <label className={labelClass}>
                      Short summary
                      <textarea className="theme-input min-h-28 rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500" placeholder="Brief project result or client context" value={projectForm.summary} onChange={(event) => updateProjectField('summary', event.target.value)} />
                    </label>
                    <label className={labelClass}>
                      Full description
                      <textarea className="theme-input min-h-36 rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500" placeholder="Longer case study notes, scope, or outcomes" value={projectForm.description} onChange={(event) => updateProjectField('description', event.target.value)} />
                    </label>
                  </div>
                </section>
              </div>

              <aside className="grid gap-5 lg:self-start">
                {renderMediaInput('Primary project image', 'Always used first on portfolio cards and homepage project boxes.', projectForm.image, 'image/*', 'image', 'Project image URL or uploaded path')}
                {renderMediaInput('Video presentation', 'Optional uploaded video or YouTube link. Adds a play action to the project card.', projectForm.videoUrl, 'video/*', 'videoUrl', 'Video URL, uploaded path, or YouTube URL')}
                {renderMediaInput('Video cover image', 'Optional fallback for video cards only. It will not override the primary image.', projectForm.coverImage, 'image/*', 'coverImage', 'Optional cover image URL')}

                <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <label className="flex items-center justify-between gap-4 text-sm font-bold text-gray-700">
                    <span>
                      <span className="block text-gray-900">Featured project</span>
                      <span className="mt-1 block text-xs font-semibold text-gray-500">Keep this enabled for important portfolio work.</span>
                    </span>
                    <input type="checkbox" checked={projectForm.isFeatured} onChange={(event) => updateProjectField('isFeatured', event.target.checked)} className="h-5 w-5 rounded border-gray-200 text-blue-600 focus:ring-blue-500" />
                  </label>
                </section>

                <div className="sticky bottom-4 z-10 flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white/95 p-3 shadow-lg backdrop-blur md:flex-row lg:top-4 lg:bottom-auto lg:flex-col">
                  <Button className="min-h-11 flex-1 rounded-xl bg-blue-600 text-white hover:bg-blue-700" type="submit" disabled={saving}>{saving ? 'Saving...' : editingProject ? 'Update Project' : 'Add Project'}</Button>
                  <Button type="button" variant="ghost" className="min-h-11 flex-1 rounded-xl border border-gray-200" onClick={resetProjectForm}>Cancel</Button>
                </div>
              </aside>
            </form>
          </section>
        ) : null}
        {mediaPicker ? (
          <div className="fixed inset-0 z-[160] grid place-items-center bg-black/60 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true">
            <section className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex flex-col gap-4 border-b border-gray-100 p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Media Library</p>
                  <h3 className="mt-1 text-xl font-black text-gray-900">Choose {mediaPicker.title}</h3>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-700 transition hover:bg-blue-100">
                    <Upload className="h-4 w-4" />
                    Upload to library
                    <input
                      className="hidden"
                      type="file"
                      accept={mediaPicker.accept}
                      onChange={(event) => {
                        const selectedFile = event.target.files?.[0]
                        event.currentTarget.value = ''
                        if (selectedFile) {
                          void uploadMediaForPicker(selectedFile, mediaPicker)
                        }
                      }}
                    />
                  </label>
                  <input
                    className="theme-input min-h-10 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-blue-500"
                    placeholder="Search media"
                    value={mediaSearch}
                    onChange={(event) => setMediaSearch(event.target.value)}
                  />
                  <Button type="button" variant="ghost" className="rounded-xl border border-gray-200" onClick={() => setMediaPicker(null)}><X className="h-4 w-4" />Close</Button>
                </div>
              </div>
              <div className="grid gap-4 overflow-y-auto p-5 sm:grid-cols-2 lg:grid-cols-4">
                {visiblePickerItems.map((media) => (
                  <button
                    key={`${media.id}-${media.url}`}
                    type="button"
                    className="overflow-hidden rounded-xl border border-gray-100 bg-gray-50 text-left shadow-sm transition hover:border-blue-400 hover:ring-2 hover:ring-blue-100"
                    onClick={() => {
                      void persistProjectMedia(mediaPicker.field, media.url)
                        .then(() => setMediaPicker(null))
                        .catch((selectError) => setError(selectError instanceof Error ? selectError.message : 'Unable to select this media.'))
                    }}
                  >
                    {media.mimeType.startsWith('video/') ? (
                      <video className="h-36 w-full object-cover" src={media.url} muted preload="metadata" />
                    ) : (
                      <SafeImage className="h-36 w-full object-cover" src={media.url} fallbackSrc={adminMediaFallbackSrc(media.originalName)} alt={media.originalName} />
                    )}
                    <span className="block truncate p-3 text-xs font-black text-gray-800">{media.originalName}</span>
                  </button>
                ))}
                {filteredPickerItems.length === 0 ? <p className="col-span-full py-12 text-center text-sm font-semibold text-gray-500">No matching media found.</p> : null}
                {filteredPickerItems.length > visiblePickerItems.length ? (
                  <div className="col-span-full flex justify-center pt-2">
                    <Button type="button" variant="ghost" className="rounded-xl border border-gray-200 px-5" onClick={() => setMediaPickerVisibleCount((count) => count + 12)}>
                      Show more
                    </Button>
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        ) : null}
          <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-black text-gray-900">Arrange All Projects</h3>
                <p className="mt-1 text-sm font-semibold text-gray-500">Open one compact view to drag every project into the exact frontend order.</p>
              </div>
              <Button type="button" variant="ghost" className="rounded-xl border border-gray-200" onClick={() => setShowProjectArrangeView((current) => !current)}>
                <GripVertical className="h-4 w-4" />
                {showProjectArrangeView ? 'Hide arranger' : 'Arrange all'}
              </Button>
            </div>
            {showProjectArrangeView ? (
              <div className="grid max-h-[70vh] gap-3 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                {orderedProjects.map((project) => renderProjectRow(project, { compact: true }))}
                {!orderedProjects.length ? (
                  <div className="rounded-xl bg-white p-8 text-center text-sm font-semibold text-gray-500">No projects to arrange.</div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm font-bold text-gray-600">
                {projects.length} projects available. Click Arrange all to manage the full order in one scrollable view.
              </div>
            )}
          </section>
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-black text-gray-900">Portfolio List</h3>
                <p className="mt-1 text-sm font-semibold text-gray-500">Drag project rows to rearrange them. This exact order is used on the frontend.</p>
              </div>
              <Button type="button" className="rounded-xl bg-blue-600 text-white" onClick={openNewProjectForm}><Plus className="h-4 w-4" />New Project</Button>
            </div>
            <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_170px_220px_150px]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  className="theme-input min-h-11 w-full rounded-xl border border-gray-200 pl-10 pr-4 outline-none focus:border-blue-500"
                  placeholder="Search title, category, summary, or link"
                  value={projectSearch}
                  onChange={(event) => setProjectSearch(event.target.value)}
                />
              </label>
              <select className="theme-input min-h-11 rounded-xl border border-gray-200 px-3 outline-none focus:border-blue-500" value={projectStatusFilter} onChange={(event) => setProjectStatusFilter(event.target.value as 'all' | Project['status'])}>
                <option value="all">All status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
              <select className="theme-input min-h-11 rounded-xl border border-gray-200 px-3 outline-none focus:border-blue-500" value={projectCategoryFilter} onChange={(event) => setProjectCategoryFilter(event.target.value)}>
                <option value="all">All categories</option>
                {projectCategories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
              <select className="theme-input min-h-11 rounded-xl border border-gray-200 px-3 outline-none focus:border-blue-500" value={projectPerPage} onChange={(event) => setProjectPerPage(Number(event.target.value))}>
                {[10, 20, 50].map((size) => <option key={size} value={size}>{size} / page</option>)}
              </select>
            </div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3">
              <p className="text-sm font-bold text-gray-600">{filteredProjects.length} of {projects.length} projects</p>
              <p className="text-xs font-black uppercase tracking-wide text-gray-400">Page {activeProjectPage} of {totalProjectPages}</p>
            </div>
            <div className="grid gap-4">
              {visibleProjects.map((project) => {
                const globalIndex = orderedProjects.findIndex((item) => item.id === project.id)
                return (
                <article
                  key={project.id}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = 'move'
                    event.dataTransfer.setData('text/plain', String(project.id))
                    setProjectDragId(project.id)
                  }}
                  onDragEnd={() => setProjectDragId(null)}
                  onDragOver={(event) => {
                    if (projectDragId && projectDragId !== project.id) {
                      event.preventDefault()
                      event.dataTransfer.dropEffect = 'move'
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    const draggedProjectId = Number(event.dataTransfer.getData('text/plain')) || projectDragId
                    setProjectDragId(null)
                    if (!draggedProjectId || draggedProjectId === project.id) return
                    const bounds = event.currentTarget.getBoundingClientRect()
                    const placement = event.clientY > bounds.top + (bounds.height / 2) ? 'after' : 'before'
                    void dropProject(draggedProjectId, project.id, placement)
                  }}
                  className={cn(
                    'grid cursor-grab gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 transition md:grid-cols-[8rem_minmax(0,1fr)_auto] md:items-center',
                    projectDragId === project.id ? 'opacity-50 ring-2 ring-blue-200' : 'hover:border-blue-200',
                  )}
                >
                  <div className="h-24 w-full overflow-hidden rounded-lg md:h-20">
                    {isVideoMedia(project.image) ? (
                      <video className="h-full w-full object-cover" src={project.image} muted preload="metadata" />
                    ) : isYoutubeMedia(project.image) ? (
                      <div className="surface-card grid h-full place-items-center text-xs font-black text-soft">YouTube</div>
                    ) : (
                      <SafeImage className="h-full w-full object-cover" src={project.image} fallbackSrc={adminMediaFallbackSrc(project.title)} alt="" />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <GripVertical className="h-4 w-4 text-gray-400" aria-hidden="true" />
                      <h4 className="text-lg font-black text-gray-900">{project.title}</h4>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-gray-500">#{globalIndex + 1}</span>
                    </div>
                    <p className="text-gray-500 mt-1 text-sm">{project.category} · {project.status}</p>
                    {project.summary ? <p className="text-gray-500 mt-2 text-sm leading-relaxed">{project.summary}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2 md:mt-4 md:flex-col">
                    <select
                      className="theme-input min-h-10 rounded-xl border border-gray-200 px-3 text-sm font-bold outline-none focus:border-blue-500"
                      value={project.status}
                      onChange={(event) => void updateProjectStatus(project, event.target.value as Project['status'])}
                      title="Change project publish status"
                    >
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                    </select>
                    <div className="flex gap-2">
                      <Button type="button" variant="ghost" className="h-10 w-10 rounded-xl border border-gray-200 p-0" disabled={globalIndex <= 0} onClick={() => void moveProject(project.id, -1)} title="Move project up">
                        <ChevronLeft className="h-4 w-4 rotate-90" />
                      </Button>
                      <Button type="button" variant="ghost" className="h-10 w-10 rounded-xl border border-gray-200 p-0" disabled={globalIndex >= orderedProjects.length - 1} onClick={() => void moveProject(project.id, 1)} title="Move project down">
                        <ChevronRight className="h-4 w-4 rotate-90" />
                      </Button>
                    </div>
                    <Button type="button" variant="ghost" className="min-h-10 px-4" onClick={() => editProject(project)}><Pencil className="h-4 w-4 mr-2" />Edit</Button>
                    <Button type="button" variant="ghost" className="min-h-10 px-4 text-red-500" onClick={() => void deleteProject(project.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</Button>
                  </div>
                </article>
                )
              })}
              {!filteredProjects.length ? (
                <div className="rounded-xl bg-gray-50 p-8 text-center text-sm font-semibold text-gray-500">No projects match the current filters.</div>
              ) : null}
            </div>
            {filteredProjects.length ? (
              <div className="mt-5 flex flex-col justify-between gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center">
                <p className="text-sm font-semibold text-gray-500">
                  Showing {((activeProjectPage - 1) * projectPerPage) + 1}-{Math.min(filteredProjects.length, activeProjectPage * projectPerPage)} of {filteredProjects.length}
                </p>
                {renderNumberedPagination({
                  currentPage: activeProjectPage,
                  totalPages: totalProjectPages,
                  onPage: setProjectPage,
                })}
              </div>
            ) : null}
          </section>
      </div>
    )
  }

  function renderReviews() {
    const allReviews = cms?.reviews ?? []
    const normalizedReviewSearch = reviewSearch.trim().toLowerCase()
    const filteredReviews = allReviews.filter((review) => {
      const matchesSearch = normalizedReviewSearch === ''
        || review.authorName.toLowerCase().includes(normalizedReviewSearch)
        || review.content.toLowerCase().includes(normalizedReviewSearch)
      const matchesProvider = reviewProviderFilter === 'all' || review.provider === reviewProviderFilter
      const matchesStatus = reviewStatusFilter === 'all'
        || (reviewStatusFilter === 'published' && review.isPublished)
        || (reviewStatusFilter === 'draft' && !review.isPublished)
        || (reviewStatusFilter === 'featured' && review.isFeatured)

      return matchesSearch && matchesProvider && matchesStatus
    })
    const totalReviewPages = Math.max(1, Math.ceil(filteredReviews.length / reviewPerPage))
    const activeReviewPage = Math.min(reviewPage, totalReviewPages)
    const paginatedReviews = filteredReviews.slice((activeReviewPage - 1) * reviewPerPage, activeReviewPage * reviewPerPage)

    return (
      <div>
        <PanelHeader 
          eyebrow="Reviews" 
          title="Customer Reviews" 
          text="Connect Google, manage imported reviews, and configure review links from one place."
        />
        <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
          {([
            ['google', 'Google Integration'],
            ['trustpilot', 'Trustpilot Integration'],
            ['reviews', 'Review Management'],
            ['settings', 'Settings & Diagnostics'],
          ] as Array<[ReviewAdminSection, string]>).map(([section, label]) => (
            <button
              key={section}
              type="button"
              onClick={() => setReviewAdminSection(section)}
              className={cn(
                'min-h-11 rounded-xl px-4 text-sm font-black transition',
                reviewAdminSection === section ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {reviewAdminSection === 'google' ? (
        <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <div>
              <h3 className="text-xl font-black text-gray-900">Google Reviews Import</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                Find and connect your Google Business Profile through Trustindex, then import its reviews into this backend.
              </p>
              <ol className="mt-4 grid gap-2 text-sm font-semibold text-gray-600">
                <li>1. Click Connect Google Business.</li>
                <li>2. Search for and select Bakhtech Solutions in the Trustindex window.</li>
                <li>3. Confirm the business to import its available Google reviews.</li>
                <li>4. Use Refresh Google Reviews later to fetch updated reviews.</li>
              </ol>
              {googleReviewSettings?.connected ? (
                <div className="mt-3 rounded-xl bg-green-500/10 px-4 py-3">
                  <p className="text-sm font-bold text-green-700">
                    Connected to {googleReviewSettings.businessName || 'Google Business'}
                  </p>
                  {googleReviewSettings.businessAddress ? (
                    <p className="mt-1 text-xs font-semibold text-green-700/75">{googleReviewSettings.businessAddress}</p>
                  ) : null}
                  <p className="mt-2 text-xs font-semibold text-green-700/75">
                    Google Place ID: {googleReviewSettings.pageId}
                  </p>
                </div>
              ) : (
                <p className="mt-3 rounded-xl bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-700">
                  Not connected. Complete the Trustindex business selection popup to connect.
                </p>
              )}
              {googleReviewSettings?.lastSyncedAt ? (
                <p className="mt-1 text-xs font-semibold text-gray-500">Last import: {googleReviewSettings.lastSyncedAt}</p>
              ) : null}
              {googleReviewSettings?.connected ? (
                <p className="mt-1 text-xs font-semibold text-gray-500">
                  Imported {googleReviewSettings.importedReviewCount} review(s)
                  {googleReviewSettings.googleReviewCount > 0 ? ` of ${googleReviewSettings.googleReviewCount} reported by Google` : ''}.
                </p>
              ) : null}
              {googleReviewSettings?.lastError ? (
                <p className="mt-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-600">{googleReviewSettings.lastError}</p>
              ) : null}
            </div>
            <div className="grid gap-3">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-gray-500">Connection status</p>
                <p className={cn('mt-2 text-lg font-black', googleReviewSettings?.connected ? 'text-green-700' : 'text-amber-700')}>
                  {googleReviewSettings?.connected ? 'Connected' : 'Not connected'}
                </p>
                <p className="mt-2 text-sm font-semibold text-gray-600">
                  Access token: {googleReviewSettings?.hasAccessToken ? googleReviewSettings.maskedAccessToken : 'Not received'}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  The complete token is stored in the backend and only supplied to the admin-only Trustindex refresh popup. This page displays a masked value.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button type="button" className="rounded-xl bg-blue-600 px-4 text-white" onClick={connectGoogleReviews} disabled={saving}>
                  {saving
                    ? 'Waiting for Trustindex...'
                    : googleReviewSettings?.connected
                      ? 'Refresh Google Reviews'
                      : 'Connect Google Business'}
                </Button>
                {googleReviewSettings?.connected ? (
                  <Button type="button" variant="ghost" className="rounded-xl border border-red-200 px-4 text-red-600" onClick={() => void disconnectGoogleReviews()} disabled={saving}>
                    Disconnect
                  </Button>
                ) : null}
                {loadingGoogleReviews ? <span className="self-center text-sm font-semibold text-gray-500">Loading connection...</span> : null}
              </div>
            </div>
          </div>
        </section>
        ) : null}

        {reviewAdminSection === 'trustpilot' ? (
          <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="grid gap-6 xl:grid-cols-2">
              <div>
                <h3 className="text-xl font-black text-gray-900">Trustpilot Reviews Import</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  Enter your public Trustpilot business profile URL and API key. The backend uses Trustpilot's supported API, applies the saved filters, and stores up to 20 accepted reviews.
                </p>
                {trustpilotReviewSettings?.connected ? (
                  <div className="mt-4 rounded-xl bg-green-500/10 px-4 py-3 text-green-700">
                    <p className="text-sm font-black">Connected to {trustpilotReviewSettings.businessName || 'Trustpilot business'}</p>
                    <p className="mt-1 text-xs font-semibold">Business ID: {trustpilotReviewSettings.pageId}</p>
                    <p className="mt-1 text-xs font-semibold">{trustpilotReviewSettings.importedReviewCount} reviews stored</p>
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-700">Trustpilot is not connected.</p>
                )}
              </div>
              <div className="grid content-start gap-3">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-gray-500">Connection status</p>
                  <p className={cn('mt-2 text-lg font-black', trustpilotReviewSettings?.connected ? 'text-green-700' : 'text-amber-700')}>
                    {trustpilotReviewSettings?.connected ? 'Connected' : 'Not connected'}
                  </p>
                  <p className="mt-2 break-all text-sm font-semibold text-gray-600">{trustpilotReviewSettings?.businessUrl || 'No business profile configured'}</p>
                  <p className="mt-1 text-sm font-semibold text-gray-600">API key: {trustpilotReviewSettings?.hasApiKey ? trustpilotReviewSettings.maskedApiKey : 'Not configured'}</p>
                </div>
                <label className="grid gap-2 text-sm font-bold text-gray-700">
                  Trustpilot business profile URL
                  <input
                    type="url"
                    className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-[#00b67a]"
                    placeholder="https://www.trustpilot.com/review/example.com"
                    value={trustpilotBusinessUrl}
                    onChange={(event) => setTrustpilotBusinessUrl(event.target.value)}
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold text-gray-700">
                  Trustpilot API key
                  <input
                    type="password"
                    className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-[#00b67a]"
                    placeholder={trustpilotReviewSettings?.hasApiKey ? 'Leave blank to reuse the saved key' : 'Enter your Trustpilot API key'}
                    value={trustpilotApiKey}
                    onChange={(event) => setTrustpilotApiKey(event.target.value)}
                  />
                </label>
                <p className="text-xs leading-5 text-gray-500">Create an API application in Trustpilot Business and paste its API key here. The complete key remains on the backend.</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" className="rounded-xl bg-[#00b67a] px-4 text-white hover:bg-[#009b68]" onClick={connectTrustpilotReviews} disabled={saving}>
                    {saving ? 'Connecting...' : trustpilotReviewSettings?.connected ? 'Refresh Trustpilot Reviews' : 'Connect Trustpilot'}
                  </Button>
                  {trustpilotReviewSettings?.connected ? (
                    <Button type="button" variant="ghost" className="rounded-xl border border-red-200 px-4 text-red-600" onClick={() => void disconnectTrustpilotReviews()} disabled={saving}>Disconnect</Button>
                  ) : null}
                </div>
                {trustpilotReviewSettings?.lastError ? <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-600">{trustpilotReviewSettings.lastError}</p> : null}
              </div>
            </div>
          </section>
        ) : null}

        {reviewAdminSection === 'settings' ? (
          <section className="mb-6 grid gap-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm xl:grid-cols-2">
            <div className="grid gap-4">
              <div>
                <h3 className="text-xl font-black text-gray-900">Public Review Links</h3>
                <p className="mt-1 text-sm text-gray-500">These links are used by the public review buttons on the website.</p>
              </div>
              <label className="grid gap-2 text-sm font-bold text-gray-700">
                Public Google review link
                <input
                  className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500"
                  value={settingsForm.googleReviewUrl ?? ''}
                  onChange={(event) => setSettingsForm((current) => ({ ...current, googleReviewUrl: event.target.value }))}
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-gray-700">
                Trustpilot review link
                <input
                  className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500"
                  value={settingsForm.trustpilotReviewUrl ?? ''}
                  onChange={(event) => setSettingsForm((current) => ({ ...current, trustpilotReviewUrl: event.target.value }))}
                />
              </label>
              <div className="mt-2 border-t border-gray-200 pt-5">
                <h3 className="text-xl font-black text-gray-900">Frontend Review Filters</h3>
                <p className="mt-1 text-sm text-gray-500">Only reviews matching these rules will appear on the public website. All imported reviews remain in Review Management.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold text-gray-700">
                  Minimum words
                  <input
                    type="number"
                    min="0"
                    className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500"
                    value={settingsForm.reviewFrontendMinWords ?? '0'}
                    onChange={(event) => setSettingsForm((current) => ({ ...current, reviewFrontendMinWords: event.target.value }))}
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold text-gray-700">
                  Maximum words
                  <input
                    type="number"
                    min="0"
                    className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500"
                    value={settingsForm.reviewFrontendMaxWords ?? '0'}
                    onChange={(event) => setSettingsForm((current) => ({ ...current, reviewFrontendMaxWords: event.target.value }))}
                  />
                  <span className="text-xs font-medium text-gray-500">Use 0 for no maximum.</span>
                </label>
                <label className="grid gap-2 text-sm font-bold text-gray-700">
                  Minimum characters
                  <input
                    type="number"
                    min="0"
                    className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500"
                    value={settingsForm.reviewFrontendMinCharacters ?? '0'}
                    onChange={(event) => setSettingsForm((current) => ({ ...current, reviewFrontendMinCharacters: event.target.value }))}
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold text-gray-700">
                  Maximum characters
                  <input
                    type="number"
                    min="0"
                    className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500"
                    value={settingsForm.reviewFrontendMaxCharacters ?? '0'}
                    onChange={(event) => setSettingsForm((current) => ({ ...current, reviewFrontendMaxCharacters: event.target.value }))}
                  />
                  <span className="text-xs font-medium text-gray-500">Use 0 for no maximum.</span>
                </label>
                <label className="grid gap-2 text-sm font-bold text-gray-700">
                  Minimum rating
                  <select
                    className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500"
                    value={settingsForm.reviewFrontendMinRating ?? '1'}
                    onChange={(event) => setSettingsForm((current) => ({ ...current, reviewFrontendMinRating: event.target.value }))}
                  >
                    {[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating}+ stars</option>)}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-bold text-gray-700">
                  Platform
                  <select
                    className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500"
                    value={settingsForm.reviewFrontendProvider ?? 'all'}
                    onChange={(event) => setSettingsForm((current) => ({ ...current, reviewFrontendProvider: event.target.value }))}
                  >
                    <option value="all">All platforms</option>
                    {reviewProviders.map((provider) => <option key={provider.value} value={provider.value}>{provider.label}</option>)}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-bold text-gray-700">
                  Reviews displayed
                  <input
                    type="number"
                    min="1"
                    max="50"
                    className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500"
                    value={settingsForm.reviewFrontendLimit ?? '6'}
                    onChange={(event) => setSettingsForm((current) => ({ ...current, reviewFrontendLimit: event.target.value }))}
                  />
                </label>
                <label className="flex min-h-11 items-center gap-3 self-end rounded-xl border border-gray-200 px-4 text-sm font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={(settingsForm.reviewFrontendFeaturedOnly ?? 'false') === 'true'}
                    onChange={(event) => setSettingsForm((current) => ({ ...current, reviewFrontendFeaturedOnly: String(event.target.checked) }))}
                  />
                  Featured reviews only
                </label>
              </div>
              <Button type="button" className="w-fit rounded-xl bg-blue-600 px-4 text-white" onClick={() => void saveReviewIntegrationSettings()} disabled={saving}>
                Save Links & Filters
              </Button>
            </div>
            <div className="grid content-start gap-3">
              <h3 className="text-xl font-black text-gray-900">Integration Diagnostics</h3>
              {[
                ['Provider', googleReviewSettings?.provider || 'Trustindex'],
                ['Status', googleReviewSettings?.connected ? 'Connected' : 'Not connected'],
                ['Business', googleReviewSettings?.businessName || 'Not selected'],
                ['Google Place ID', googleReviewSettings?.pageId || 'Not available'],
                ['Access token', googleReviewSettings?.hasAccessToken ? googleReviewSettings.maskedAccessToken : 'Not received'],
                ['Imported reviews', String(googleReviewSettings?.importedReviewCount ?? 0)],
                ['Google review total', googleReviewSettings?.googleReviewCount ? String(googleReviewSettings.googleReviewCount) : 'Not reported'],
                ['Last import', googleReviewSettings?.lastSyncedAt || 'Never'],
                ['Connection endpoint', googleReviewSettings?.connectionEndpoint || `${window.location.origin}/api/admin/reviews/google/connection`],
                ['Webhook URL', googleReviewSettings?.webhookUrl || `${window.location.origin}/api/reviews/google/trustindex-webhook`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-xs font-black uppercase tracking-wide text-gray-500">{label}</p>
                  <p className="mt-1 break-all text-sm font-bold text-gray-800">{value}</p>
                </div>
              ))}
              <p className="rounded-xl bg-blue-500/10 px-4 py-3 text-sm font-semibold leading-relaxed text-blue-700">
                After every cPanel update, run <code>php artisan optimize:clear</code> and <code>php artisan optimize</code> so Laravel loads new API routes.
              </p>
              <p className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm font-semibold leading-relaxed text-amber-700">
                {googleReviewSettings?.connectorLimit || 'Trustindex free connections may return only 10 reviews. All reviews require a Trustindex plan/API or Google Business Profile API access.'}
              </p>
            </div>
          </section>
        ) : null}

        {reviewAdminSection === 'reviews' ? (
        <div className="grid gap-6">
          <div className="flex flex-col justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
            <div>
              <h3 className="text-xl font-black text-gray-900">Review Management</h3>
              <p className="mt-1 text-sm font-semibold text-gray-500">Browse imported reviews or add a review manually.</p>
            </div>
            <Button
              type="button"
              className="rounded-xl bg-blue-600 px-5 text-white hover:bg-blue-700"
              onClick={() => {
                if (showReviewForm) {
                  resetReviewForm()
                  setShowReviewForm(false)
                } else {
                  resetReviewForm()
                  setShowReviewForm(true)
                }
              }}
            >
              {showReviewForm ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
              {showReviewForm ? 'Close Form' : 'Add Review'}
            </Button>
          </div>

          {showReviewForm ? (
          <form className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm" onSubmit={saveReview}>
            <div className="flex flex-col justify-between gap-3 border-b border-gray-100 px-6 py-5 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-2xl font-black text-gray-900">{editingReview ? 'Edit Review' : 'Add Review'}</h3>
                <p className="mt-1 text-sm font-semibold text-gray-500">Enter the reviewer, review content, source, and publishing status.</p>
              </div>
              {editingReview ? (
                <Button type="button" variant="ghost" className="rounded-xl border border-gray-200 px-4" onClick={resetReviewForm}>
                  <Plus className="mr-2 h-4 w-4" /> New Review
                </Button>
              ) : null}
            </div>

            <div className="grid gap-6 p-6 xl:grid-cols-2">
              <fieldset className="grid content-start gap-4 rounded-2xl border border-gray-200 p-5">
                <legend className="px-2 text-sm font-black uppercase tracking-wide text-gray-500">Reviewer Details</legend>
                <label className="grid gap-2 text-sm font-bold text-gray-700">
                  Reviewer name <span className="font-medium text-red-500">Required</span>
                  <input
                    className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500"
                    placeholder="e.g. John Ade"
                    value={reviewForm.authorName}
                    onChange={(event) => setReviewForm((current) => ({ ...current, authorName: event.target.value }))}
                    required
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold text-gray-700">
                  Reviewer photo URL
                  <input
                    className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500"
                    placeholder="https://... or /uploads/..."
                    value={reviewForm.authorImage}
                    onChange={(event) => setReviewForm((current) => ({ ...current, authorImage: event.target.value }))}
                  />
                  <span className="text-xs font-medium text-gray-500">Leave empty to display the reviewer’s initials.</span>
                </label>
              </fieldset>

              <fieldset className="grid content-start gap-4 rounded-2xl border border-gray-200 p-5">
                <legend className="px-2 text-sm font-black uppercase tracking-wide text-gray-500">Source & Rating</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-bold text-gray-700">
                    Platform
                    <select
                      className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500"
                      value={reviewForm.provider}
                      onChange={(event) => setReviewForm((current) => ({ ...current, provider: event.target.value as ReviewInput['provider'] }))}
                    >
                      {reviewProviders.map((provider) => <option key={provider.value} value={provider.value}>{provider.label}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-gray-700">
                    Rating
                    <select
                      className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500"
                      value={reviewForm.rating}
                      onChange={(event) => setReviewForm((current) => ({ ...current, rating: Number(event.target.value) }))}
                    >
                      {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} star{rating === 1 ? '' : 's'}</option>)}
                    </select>
                  </label>
                </div>
                <label className="grid gap-2 text-sm font-bold text-gray-700">
                  Review date
                  <input
                    className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500"
                    type="date"
                    value={reviewForm.reviewedAt}
                    onChange={(event) => setReviewForm((current) => ({ ...current, reviewedAt: event.target.value }))}
                  />
                </label>
              </fieldset>

              <fieldset className="grid gap-4 rounded-2xl border border-gray-200 p-5 xl:col-span-2">
                <legend className="px-2 text-sm font-black uppercase tracking-wide text-gray-500">Review Content</legend>
                <label className="grid gap-2 text-sm font-bold text-gray-700">
                  Review text <span className="font-medium text-red-500">Required</span>
                  <textarea
                    className="theme-input min-h-36 resize-y rounded-xl border border-gray-200 px-4 py-3 leading-7 outline-none focus:border-blue-500"
                    placeholder="Enter the complete customer review..."
                    value={reviewForm.content}
                    onChange={(event) => setReviewForm((current) => ({ ...current, content: event.target.value }))}
                    required
                  />
                  <span className="text-right text-xs font-semibold text-gray-500">{reviewForm.content.length} characters</span>
                </label>
                <label className="grid gap-2 text-sm font-bold text-gray-700">
                  Original review URL
                  <input
                    className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500"
                    placeholder="https://..."
                    value={reviewForm.externalUrl}
                    onChange={(event) => setReviewForm((current) => ({ ...current, externalUrl: event.target.value }))}
                  />
                </label>
              </fieldset>

              <fieldset className="rounded-2xl border border-gray-200 p-5 xl:col-span-2">
                <legend className="px-2 text-sm font-black uppercase tracking-wide text-gray-500">Publication</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-4">
                    <input type="checkbox" checked={reviewForm.isPublished} onChange={(event) => setReviewForm((current) => ({ ...current, isPublished: event.target.checked }))} className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span><strong className="block text-sm text-gray-800">Published</strong><span className="mt-1 block text-xs font-medium text-gray-500">Allow this review to appear through the public review API.</span></span>
                  </label>
                  <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-4">
                    <input type="checkbox" checked={reviewForm.isFeatured} onChange={(event) => setReviewForm((current) => ({ ...current, isFeatured: event.target.checked }))} className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span><strong className="block text-sm text-gray-800">Featured</strong><span className="mt-1 block text-xs font-medium text-gray-500">Prioritize this review when featured-only filtering is enabled.</span></span>
                  </label>
                </div>
              </fieldset>
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
              <Button type="button" variant="ghost" className="rounded-xl border border-gray-200 px-5" onClick={() => {
                resetReviewForm()
                setShowReviewForm(false)
              }}>Cancel</Button>
              <Button type="submit" className="rounded-xl bg-blue-600 px-6 text-white hover:bg-blue-700" disabled={saving}>
                <Save className="mr-2 h-4 w-4" /> {saving ? 'Saving...' : editingReview ? 'Update Review' : 'Add Review'}
              </Button>
            </div>
          </form>
          ) : null}
          <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="mb-6 text-2xl font-black text-gray-900">Manage Reviews</h3>
            <div className="mb-5 grid gap-3 border-b border-gray-100 pb-5 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_170px_150px_110px]">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={reviewSearch}
                  onChange={(event) => {
                    setReviewSearch(event.target.value)
                    setReviewPage(1)
                  }}
                  className="theme-input min-h-11 w-full rounded-xl border border-gray-200 pl-10 pr-4 text-sm outline-none focus:border-blue-500"
                  placeholder="Search reviewer or text"
                />
              </label>
              <select
                value={reviewProviderFilter}
                onChange={(event) => {
                  setReviewProviderFilter(event.target.value)
                  setReviewPage(1)
                }}
                className="theme-input min-h-11 rounded-xl border border-gray-200 px-3 text-sm font-semibold outline-none focus:border-blue-500"
              >
                <option value="all">All platforms</option>
                {reviewProviders.map((provider) => <option key={provider.value} value={provider.value}>{provider.label}</option>)}
              </select>
              <select
                value={reviewStatusFilter}
                onChange={(event) => {
                  setReviewStatusFilter(event.target.value)
                  setReviewPage(1)
                }}
                className="theme-input min-h-11 rounded-xl border border-gray-200 px-3 text-sm font-semibold outline-none focus:border-blue-500"
              >
                <option value="all">All statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="featured">Featured</option>
              </select>
              <select
                value={reviewPerPage}
                onChange={(event) => {
                  setReviewPerPage(Number(event.target.value))
                  setReviewPage(1)
                }}
                className="theme-input min-h-11 rounded-xl border border-gray-200 px-3 text-sm font-semibold outline-none focus:border-blue-500"
              >
                {[10, 20, 50].map((size) => <option key={size} value={size}>{size} / page</option>)}
              </select>
            </div>
            <p className="mb-4 text-sm font-semibold text-gray-500">
              Showing {paginatedReviews.length} of {filteredReviews.length} matching reviews. {allReviews.length} total stored.
            </p>
            <div className="grid gap-4">
              {paginatedReviews.map((review) => (
                <article key={review.id} className="grid rounded-xl border border-gray-100 bg-gray-50 p-4 md:grid-cols-[minmax(180px,0.7fr)_90px_minmax(260px,1.3fr)_auto] md:items-center md:gap-5">
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
              {paginatedReviews.length === 0 && <p className="py-10 text-center text-gray-500">No reviews match the selected filters.</p>}
            </div>
            <div className="mt-5 flex flex-col justify-between gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center">
              <p className="text-sm font-semibold text-gray-500">Page {activeReviewPage} of {totalReviewPages}</p>
              {renderNumberedPagination({
                currentPage: activeReviewPage,
                totalPages: totalReviewPages,
                onPage: setReviewPage,
              })}
            </div>
          </section>
        </div>
        ) : null}
      </div>
    )
  }

  function renderLibrary() {
    const libraryItems = (cms?.media ?? []).filter((media) => {
      const query = mediaSearch.trim().toLowerCase()
      return !query || media.originalName.toLowerCase().includes(query) || media.url.toLowerCase().includes(query)
    })

    return (
      <div>
        <PanelHeader 
          eyebrow="Library" 
          title="Media Library" 
          text="Upload, preview, copy, select, and delete files used across the website." 
        />
        <section className="mb-6 grid gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:grid-cols-[1fr_auto] lg:items-center">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className="theme-input min-h-11 w-full rounded-xl border border-gray-200 pl-10 pr-4 outline-none focus:border-blue-500"
              placeholder="Search media library"
              value={mediaSearch}
              onChange={(event) => setMediaSearch(event.target.value)}
            />
          </label>
          <label className="flex min-h-11 cursor-pointer items-center justify-center gap-3 rounded-xl bg-blue-600 px-5 text-sm font-black text-white shadow-sm transition hover:bg-blue-700">
            <Upload className="h-5 w-5" />
            Upload to library
            <input
              className="hidden"
              type="file"
              accept="image/*,video/*,application/pdf"
              onChange={(e) => e.target.files?.[0] && void uploadFile(e.target.files[0])}
            />
          </label>
        </section>
        <p className="mb-4 text-sm font-semibold text-gray-500">{libraryItems.length} media item{libraryItems.length === 1 ? '' : 's'} visible.</p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {libraryItems.map((media) => (
            <article key={`${media.id}-${media.url}`} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              {media.mimeType.startsWith('image/') ?
                <SafeImage className="h-44 w-full object-cover" src={media.url} fallbackSrc={adminMediaFallbackSrc(media.originalName)} alt={media.originalName} /> : 
                media.mimeType.startsWith('video/') ?
                <video className="h-44 w-full object-cover" src={media.url} muted preload="metadata" /> :
                <div className="grid h-44 place-items-center border-b border-gray-100"><FileText className="h-10 w-10 text-gray-300" /></div>
              }
              <div className="grid gap-3 p-4">
                <p className="truncate text-sm font-black text-gray-900">{media.originalName}</p>
                <p className="truncate text-xs font-semibold text-gray-500">{media.mimeType} - {Math.round(media.size / 1024)} KB</p>
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
          {libraryItems.length === 0 ? <p className="col-span-full rounded-2xl bg-white p-10 text-center text-sm font-semibold text-gray-500 shadow-sm">No media found. Upload images here, then select them from project forms.</p> : null}
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
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold leading-6 text-blue-800">
                  Booking confirmations are always sent to the attendee and the admin for every new booking.
                </div>

                <section className="rounded-2xl border border-[var(--line)] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black">Reminder schedule</h3>
                      <p className="mt-1 text-sm text-soft">Add multiple reminders. Each one is sent to both the attendee and admin.</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="rounded-xl border border-[var(--line)]"
                      onClick={() => {
                        const current = Array.isArray(email.reminderMinutesBefore) ? email.reminderMinutesBefore : [Number(email.reminderMinutesBefore || 60)]
                        updateSettings('email', { ...email, reminderMinutesBefore: [...current, 30] })
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Add reminder
                    </Button>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {(Array.isArray(email.reminderMinutesBefore) ? email.reminderMinutesBefore : [Number(email.reminderMinutesBefore || 60)]).map((minutes, index, reminders) => {
                      const unit = minutes % 1440 === 0 ? 1440 : minutes % 60 === 0 ? 60 : 1
                      const value = Math.max(1, minutes / unit)
                      return (
                        <div key={`${minutes}-${index}`} className="grid gap-3 rounded-xl bg-[var(--surface-2)] p-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
                          <label className="grid gap-2 text-sm font-bold">
                            Time before meeting
                            <input
                              className="theme-input min-h-11 rounded-xl px-4 outline-none"
                              type="number"
                              min="1"
                              value={value}
                              onChange={(event) => {
                                const next = [...reminders]
                                next[index] = Math.max(1, Number(event.target.value)) * unit
                                updateSettings('email', { ...email, reminderMinutesBefore: next })
                              }}
                            />
                          </label>
                          <label className="grid gap-2 text-sm font-bold">
                            Unit
                            <select
                              className="theme-input min-h-11 rounded-xl px-4 outline-none"
                              value={unit}
                              onChange={(event) => {
                                const next = [...reminders]
                                next[index] = value * Number(event.target.value)
                                updateSettings('email', { ...email, reminderMinutesBefore: next })
                              }}
                            >
                              <option value={1}>Minutes</option>
                              <option value={60}>Hours</option>
                              <option value={1440}>Days</option>
                            </select>
                          </label>
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-11 rounded-xl border border-red-100 text-red-600"
                            disabled={reminders.length === 1}
                            onClick={() => updateSettings('email', { ...email, reminderMinutesBefore: reminders.filter((_, reminderIndex) => reminderIndex !== index) })}
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </section>

                <div className="grid gap-4">
                  <p className="theme-muted text-sm leading-6">
                    These templates control the opening message. The branded email automatically includes the booking schedule, attendee details, notes, and the correct meeting link, WhatsApp number, or phone number.
                  </p>
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
    const bookingStatusClass = (status: string) => cn(
      'inline-flex rounded-full px-3 py-1 text-xs font-black capitalize',
      status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-600' :
      status === 'cancelled' ? 'bg-red-500/10 text-red-600' :
      status === 'pending' ? 'bg-amber-500/10 text-amber-600' :
      'bg-gray-500/10 text-gray-600'
    )
    const formatBookingDate = (value: string) => {
      if (!value) return 'No date'
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
    }
    const currentPageBookingIds = bookingCmsBookings.map((booking) => booking.id)
    const selectedBookingSet = new Set(selectedBookingIds)
    const selectedOnCurrentPage = currentPageBookingIds.filter((id) => selectedBookingSet.has(id))
    const allCurrentPageSelected = currentPageBookingIds.length > 0 && selectedOnCurrentPage.length === currentPageBookingIds.length

    return (
      <div className="grid gap-4">
        <section className="surface-card overflow-hidden rounded-2xl shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-3 border-b border-[var(--line)] p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-black">Bookings</h3>
              <p className="text-soft mt-1 text-sm">Compact list view. Expand a row to see full booking information.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selectedBookingIds.length > 0 ? (
                <Button type="button" variant="ghost" className="rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/5" disabled={saving} onClick={() => void deleteSelectedBookingCmsBookings()}>
                  <Trash2 className="h-4 w-4" />
                  Delete selected ({selectedBookingIds.length})
                </Button>
              ) : null}
              <span className="text-soft text-sm font-bold">Rows</span>
              <select
                className="theme-input min-h-10 rounded-xl px-3 text-sm outline-none"
                value={bookingCmsBookingsMeta.perPage}
                onChange={(event) => void loadBookingCmsData(1, Number(event.target.value))}
              >
                {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </div>
          </div>

          <div className="hidden grid-cols-[44px_44px_1.2fr_1fr_1fr_0.8fr_150px] gap-4 border-b border-[var(--line)] bg-gray-50 px-4 py-3 text-xs font-black uppercase tracking-wide text-gray-500 lg:grid">
            <span className="flex items-center justify-center">
              <input
                type="checkbox"
                className="h-4 w-4 rounded"
                checked={allCurrentPageSelected}
                aria-label="Select all bookings on this page"
                onChange={(event) => toggleCurrentBookingPageSelection(event.target.checked)}
              />
            </span>
            <span />
            <span>Customer</span>
            <span>Service</span>
            <span>Date</span>
            <span>Calendar</span>
            <span>Status</span>
          </div>

          <div className="divide-y divide-[var(--line)]">
            {bookingCmsBookings.map((booking) => {
              const expanded = expandedBookingId === booking.id

              return (
                <article key={booking.id} className="bg-white">
                  <div className="grid gap-3 px-4 py-4 transition hover:bg-gray-50 lg:grid-cols-[44px_1fr] lg:items-center lg:gap-0">
                    <label className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--line)] bg-white">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded"
                        checked={selectedBookingSet.has(booking.id)}
                        aria-label={`Select booking for ${booking.customer.name || 'customer'}`}
                        onChange={(event) => toggleBookingSelection(booking.id, event.target.checked)}
                      />
                    </label>
                    <button
                      type="button"
                      className="grid w-full gap-3 text-left lg:grid-cols-[44px_1.2fr_1fr_1fr_0.8fr_150px] lg:items-center lg:gap-4"
                      onClick={() => setExpandedBookingId(expanded ? null : booking.id)}
                      aria-expanded={expanded}
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--line)] bg-white">
                        <ChevronRight className={cn('h-4 w-4 transition-transform', expanded ? 'rotate-90' : '')} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-base font-black text-[var(--foreground)]">{booking.customer.name || 'Unnamed customer'}</span>
                        <span className="text-soft block truncate text-sm">{booking.customer.email || 'No email'}</span>
                      </span>
                      <span className="min-w-0">
                        <span className="text-soft block text-xs font-black uppercase lg:hidden">Service</span>
                        <span className="block truncate text-sm font-bold text-[var(--foreground)]">{booking.serviceType || booking.eventTypeName || 'No service'}</span>
                      </span>
                      <span className="min-w-0">
                        <span className="text-soft block text-xs font-black uppercase lg:hidden">Date</span>
                        <span className="block text-sm font-bold text-[var(--foreground)]">{formatBookingDate(booking.startsAt)}</span>
                      </span>
                      <span className="min-w-0">
                        <span className="text-soft block text-xs font-black uppercase lg:hidden">Calendar</span>
                        <span className="block truncate text-sm font-bold text-[var(--foreground)]">{booking.calendarName || 'No calendar'}</span>
                      </span>
                      <span>
                        <span className={bookingStatusClass(booking.status)}>{booking.status}</span>
                      </span>
                    </button>
                  </div>

                  {expanded ? (
                    <div className="grid gap-5 border-t border-[var(--line)] bg-gray-50 px-4 py-5">
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-xl border border-[var(--line)] bg-white p-4">
                          <p className="text-soft text-xs font-black uppercase">Contact</p>
                          <p className="mt-2 text-sm font-bold">{booking.customer.email || 'No email'}</p>
                          <p className="text-soft mt-1 text-sm">{booking.customer.phone || 'No phone'}</p>
                        </div>
                        <div className="rounded-xl border border-[var(--line)] bg-white p-4">
                          <p className="text-soft text-xs font-black uppercase">Schedule</p>
                          <p className="mt-2 text-sm font-bold">{formatBookingDate(booking.startsAt)}</p>
                          <p className="text-soft mt-1 text-sm">{formatBookingDate(booking.endsAt)} · {booking.durationMinutes} mins</p>
                        </div>
                        <div className="rounded-xl border border-[var(--line)] bg-white p-4">
                          <p className="text-soft text-xs font-black uppercase">Payment</p>
                          <p className="mt-2 text-sm font-bold">{booking.currency} {booking.priceAmount.toLocaleString()}</p>
                          <p className="text-soft mt-1 text-sm capitalize">{booking.payment.status || 'unpaid'} {booking.payment.provider ? `via ${booking.payment.provider}` : ''}</p>
                        </div>
                        <div className="rounded-xl border border-[var(--line)] bg-white p-4">
                          <p className="text-soft text-xs font-black uppercase">Location</p>
                          <p className="mt-2 text-sm font-bold capitalize">{booking.location.type || 'Not set'}</p>
                          <p className="text-soft mt-1 break-words text-sm">{booking.location.value || 'No location value'}</p>
                        </div>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-xl border border-[var(--line)] bg-white p-4">
                          <p className="text-soft text-xs font-black uppercase">Notes</p>
                          <p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-[var(--foreground)]">{booking.notes || 'No notes added.'}</p>
                        </div>
                        <div className="rounded-xl border border-[var(--line)] bg-white p-4">
                          <p className="text-soft text-xs font-black uppercase">Admin remarks</p>
                          <p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-[var(--foreground)]">{booking.adminRemarks || 'No admin remarks.'}</p>
                        </div>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                        <div className="rounded-xl border border-[var(--line)] bg-white p-4">
                          <p className="text-soft text-xs font-black uppercase">System details</p>
                          <div className="mt-2 grid gap-2 text-sm font-semibold text-[var(--foreground)] md:grid-cols-2">
                            <span>Event type: {booking.eventTypeName || 'None'}</span>
                            <span>Resource: {booking.resourceName || 'None'}</span>
                            <span>Timezone: {booking.timezone || 'Not set'}</span>
                            <span>Google Calendar: {booking.googleCalendar.status || 'not_configured'}</span>
                            <span>Created: {formatBookingDate(booking.createdAt)}</span>
                            <span>Updated: {formatBookingDate(booking.updatedAt)}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <select className="theme-input min-h-10 rounded-xl px-3 outline-none" value={booking.status} disabled={saving} onChange={(event) => void updateBookingCmsStatus(booking, event.target.value)}>
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="closed">Closed</option>
                          </select>
                          <Button type="button" variant="ghost" className="rounded-xl border border-[var(--line)]" disabled={saving} onClick={() => void rescheduleBookingCmsBooking(booking)}><CalendarDays className="h-4 w-4" />Reschedule</Button>
                          <Button type="button" variant="ghost" className="rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/5" disabled={saving || booking.status === 'cancelled'} onClick={() => void cancelBookingCmsBooking(booking)}><Trash2 className="h-4 w-4" />Cancel</Button>
                          <Button type="button" variant="ghost" className="rounded-xl border border-red-500/20 bg-red-500/5 text-red-600 hover:bg-red-500/10" disabled={saving} onClick={() => void deleteBookingCmsBooking(booking)}><Trash2 className="h-4 w-4" />Delete</Button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>

          {bookingCmsBookings.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-soft">No CMS bookings yet.</p>
            </div>
          ) : null}

          <div className="border-t border-[var(--line)] p-4">
            {renderPagination(bookingCmsBookingsMeta, (page) => void loadBookingCmsData(page, bookingCmsBookingsMeta.perPage))}
          </div>
        </section>
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
                {googleConnected ? <Button type="button" variant="ghost" className="rounded-xl border border-[var(--line)]" onClick={() => void loadGoogleCalendars()} disabled={loadingGoogleCalendars}>{loadingGoogleCalendars ? 'Loading...' : 'Refresh calendars'}</Button> : null}
                <Button type="button" variant="ghost" className="rounded-xl border border-[var(--line)]" onClick={connectGoogleCalendar} disabled={saving}>{saving ? 'Saving...' : googleConnected ? 'Reconnect Google' : 'Save & Connect Google'}</Button>
              </div>
            </div>
          </div>

          {googleConnected ? (
            <div className="p-5 md:p-6">
              <h4 className="font-black">Calendars</h4>
              <p className="text-soft mt-1 text-sm">Tick the calendar where bookings and Google Meet links should be created.</p>
              {loadingGoogleCalendars ? <p className="text-soft mt-4 text-sm">Loading calendars...</p> : null}
              {!loadingGoogleCalendars && googleCalendars.length === 0 ? (
                <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm font-bold text-amber-700">
                  {googleCalendarMessage || 'Google did not return any calendars. Refresh the list or reconnect the account.'}
                </div>
              ) : null}
              <div className="mt-4 grid gap-2">
                {googleCalendars.map((calendar) => (
                  <label key={calendar.id} className={cn('flex min-h-12 items-center gap-3 rounded-xl border px-4 text-sm transition', calendar.canCreateEvents ? 'cursor-pointer' : 'cursor-not-allowed opacity-60', calendar.selected ? 'border-[#3267e3] bg-[#3267e3]/10 text-[#3267e3]' : 'border-[var(--line)] hover:bg-[var(--surface-2)]')}>
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded border-[var(--line)] accent-[#3267e3]"
                      checked={calendar.selected}
                      disabled={saving || !calendar.canCreateEvents}
                      onChange={() => void selectGoogleCalendar(calendar.id)}
                    />
                    <span className="font-bold">{calendar.summary}{calendar.primary ? ' (Primary)' : ''}</span>
                    {!calendar.canCreateEvents ? <span className="ml-auto text-xs font-bold text-soft">Read only</span> : null}
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid gap-5 p-5 md:grid-cols-[1fr_1.2fr] md:p-6">
              <div className="grid gap-4">
                <div className="rounded-xl border border-[var(--line)] p-4">
                  <h4 className="font-black">Setup guide</h4>
                  <ol className="mt-3 grid gap-3 text-sm text-soft">
                    <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3267e3] text-xs font-black text-white">1</span><span>Create a Google Cloud OAuth client with application type <b>Web application</b>.</span></li>
                    <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3267e3] text-xs font-black text-white">2</span><span>Add the redirect URI below to Google Cloud authorized redirect URIs.</span></li>
                    <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3267e3] text-xs font-black text-white">3</span><span>Paste the Client ID and Client Secret here, then click <b>Save & Connect Google</b>.</span></li>
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
                {!googleHasCredentials ? (
                  <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm font-bold text-amber-700">
                    Add both Google OAuth Client ID and Client Secret before connecting. The Client Secret is required when Google sends the login callback.
                  </div>
                ) : null}
              </div>
            </div>
          )}
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
          {cms?.users.map((user) => {
            const profileForm = profileForms[user.id] ?? { name: user.name, email: user.email }
            const form = passwordForms[user.id] ?? { password: '', confirmation: '' }
            const twoFactorForm = twoFactorForms[user.id] ?? { secret: '', otpauthUri: '', code: '' }
            return (
            <article key={user.id} className="grid gap-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-black text-gray-900">{user.name}</h3>
                  <p className="text-gray-500 text-sm">{user.email}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex w-fit rounded-full bg-green-100 px-3 py-1 text-xs font-black uppercase text-green-700">{user.role}</span>
                  <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-black uppercase ${user.twoFactorEnabled ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    2FA {user.twoFactorEnabled ? 'enabled' : 'off'}
                  </span>
                  {cms.users.length > 1 ? (
                    <Button type="button" variant="ghost" className="min-h-8 px-3 text-xs text-red-500" disabled={saving} onClick={() => void deleteAdminUser(user.id)}>
                      Delete
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <label className="grid gap-2 text-sm font-bold text-gray-700">
                  Name / username
                  <input
                    className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500"
                    value={profileForm.name}
                    onChange={(event) => setProfileForms((current) => ({
                      ...current,
                      [user.id]: { ...(current[user.id] ?? { name: user.name, email: user.email }), name: event.target.value },
                    }))}
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold text-gray-700">
                  Email
                  <input
                    type="email"
                    className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500"
                    value={profileForm.email}
                    onChange={(event) => setProfileForms((current) => ({
                      ...current,
                      [user.id]: { ...(current[user.id] ?? { name: user.name, email: user.email }), email: event.target.value },
                    }))}
                  />
                </label>
                <Button
                  type="button"
                  className="min-h-11 rounded-xl bg-blue-600 px-5 font-black text-white hover:bg-blue-700"
                  disabled={saving}
                  onClick={() => void updateAdminUserProfile(user.id)}
                >
                  Save Profile
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <label className="grid gap-2 text-sm font-bold text-gray-700">
                  New password
                  <input
                    type="password"
                    className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500"
                    value={form.password}
                    minLength={8}
                    autoComplete="new-password"
                    onChange={(event) => setPasswordForms((current) => ({
                      ...current,
                      [user.id]: { ...(current[user.id] ?? { password: '', confirmation: '' }), password: event.target.value },
                    }))}
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold text-gray-700">
                  Confirm password
                  <input
                    type="password"
                    className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500"
                    value={form.confirmation}
                    minLength={8}
                    autoComplete="new-password"
                    onChange={(event) => setPasswordForms((current) => ({
                      ...current,
                      [user.id]: { ...(current[user.id] ?? { password: '', confirmation: '' }), confirmation: event.target.value },
                    }))}
                  />
                </label>
                <Button
                  type="button"
                  className="min-h-11 rounded-xl bg-blue-600 px-5 font-black text-white hover:bg-blue-700"
                  disabled={saving || form.password.length < 8 || form.password !== form.confirmation}
                  onClick={() => void updateAdminUserPassword(user.id)}
                >
                  Update Password
                </Button>
              </div>
              <div className="grid gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="font-black text-gray-900">Two-factor authentication</h4>
                    <p className="text-sm font-semibold text-gray-500">Optional login protection using a 6-digit authenticator app code.</p>
                  </div>
                  {user.twoFactorEnabled ? (
                    <Button type="button" variant="ghost" className="min-h-10 px-4 text-red-500" disabled={saving} onClick={() => void disableAdminUserTwoFactor(user.id)}>
                      Disable 2FA
                    </Button>
                  ) : (
                    <Button type="button" variant="ghost" className="min-h-10 px-4" disabled={saving} onClick={() => void startAdminUserTwoFactorSetup(user.id)}>
                      Start 2FA Setup
                    </Button>
                  )}
                </div>
                {twoFactorForm.secret && !user.twoFactorEnabled ? (
                  <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                    <div className="grid gap-2">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">Manual setup key</p>
                      <code className="break-all rounded-lg bg-white px-3 py-2 text-sm font-black text-gray-800">{twoFactorForm.secret}</code>
                      <p className="break-all text-xs font-semibold text-gray-500">{twoFactorForm.otpauthUri}</p>
                    </div>
                    <div className="grid gap-2">
                      <label className="grid gap-2 text-sm font-bold text-gray-700">
                        Authenticator code
                        <input
                          className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500"
                          inputMode="numeric"
                          maxLength={6}
                          value={twoFactorForm.code}
                          onChange={(event) => setTwoFactorForms((current) => ({
                            ...current,
                            [user.id]: { ...(current[user.id] ?? twoFactorForm), code: event.target.value.replace(/\D/g, '').slice(0, 6) },
                          }))}
                        />
                      </label>
                      <Button type="button" className="min-h-11 rounded-xl bg-blue-600 px-5 font-black text-white hover:bg-blue-700" disabled={saving || twoFactorForm.code.length !== 6} onClick={() => void enableAdminUserTwoFactor(user.id)}>
                        Enable 2FA
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
            )
          })}
        </div>
      </div>
    )
  }

  function renderSettings() {
    const headerMenu = parseHeaderMenu(settingsForm.navigation_items)
    const setHeaderMenu = (items: HeaderMenuItem[]) => {
      setSettingsForm((current) => ({ ...current, navigation_items: JSON.stringify(items) }))
    }
    const updateHeaderMenuItem = (index: number, patch: Partial<{ label: string; href: string; visible: boolean }>) => {
      setHeaderMenu(headerMenu.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)))
    }
    const updateHeaderSubmenuItem = (index: number, childIndex: number, patch: Partial<{ label: string; href: string; visible: boolean }>) => {
      setHeaderMenu(headerMenu.map((item, itemIndex) => {
        if (itemIndex !== index) return item
        return {
          ...item,
          children: (item.children || []).map((child, currentChildIndex) => currentChildIndex === childIndex ? { ...child, ...patch } : child),
        }
      }))
    }
    const moveHeaderMenuItem = (index: number, direction: -1 | 1) => {
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= headerMenu.length) return
      const next = [...headerMenu]
      const [item] = next.splice(index, 1)
      next.splice(nextIndex, 0, item)
      setHeaderMenu(next)
    }
    const moveHeaderSubmenuItem = (index: number, childIndex: number, direction: -1 | 1) => {
      const children = [...(headerMenu[index]?.children || [])]
      const nextIndex = childIndex + direction
      if (nextIndex < 0 || nextIndex >= children.length) return
      const [child] = children.splice(childIndex, 1)
      children.splice(nextIndex, 0, child)
      setHeaderMenu(headerMenu.map((item, itemIndex) => itemIndex === index ? { ...item, children } : item))
    }
    const addHeaderMenuItem = () => setHeaderMenu([...headerMenu, { label: 'New link', href: '/', visible: true, children: [] }])
    const removeHeaderMenuItem = (index: number) => setHeaderMenu(headerMenu.filter((_, itemIndex) => itemIndex !== index))
    const addHeaderSubmenuItem = (index: number) => {
      setHeaderMenu(headerMenu.map((item, itemIndex) => itemIndex === index
        ? { ...item, children: [...(item.children || []), { label: 'Submenu link', href: '/', visible: true, children: [] }] }
        : item
      ))
    }
    const removeHeaderSubmenuItem = (index: number, childIndex: number) => {
      setHeaderMenu(headerMenu.map((item, itemIndex) => itemIndex === index
        ? { ...item, children: (item.children || []).filter((_, currentChildIndex) => currentChildIndex !== childIndex) }
        : item
      ))
    }
    const settingSections = [
      { id: 'menu', label: 'Header Menu', icon: Menu },
      { id: 'theme', label: 'Theme Colors', icon: Sun },
      { id: 'site', label: 'Site Info', icon: Settings },
      { id: 'social', label: 'Social Links', icon: Link2 },
      { id: 'smtp', label: 'SMTP', icon: Send },
      { id: 'email-logs', label: 'Email Logs', icon: Mail },
      { id: 'advanced', label: 'Advanced', icon: Gauge },
    ] as const
    const themeKeys = ['theme_light_primary', 'theme_light_secondary', 'theme_light_active', 'theme_dark_primary', 'theme_dark_secondary', 'theme_dark_active']
    const siteKeys = ['siteName', 'contactEmail', 'phone', 'activeHome', 'homePortfolioShowDescriptions', 'homepageVideoUrl']
    const socialKeys = ['facebookUrl', 'instagramUrl', 'linkedinUrl', 'tiktokUrl', 'twitterUrl', 'youtubeUrl']
    const reviewKeys = [
      'googleReviewUrl',
      'trustpilotReviewUrl',
      'google_business_client_id',
      'google_business_client_secret',
      'reviewFrontendMinWords',
      'reviewFrontendMaxWords',
      'reviewFrontendMinCharacters',
      'reviewFrontendMaxCharacters',
      'reviewFrontendMinRating',
      'reviewFrontendProvider',
      'reviewFrontendFeaturedOnly',
      'reviewFrontendLimit',
    ]
    const visibleKeySet = new Set(['navigation_items', ...themeKeys, ...siteKeys, ...socialKeys, ...reviewKeys])
    const belongsOutsideSiteSettings = (key: string) => (
      key.startsWith('invoice')
      || key.startsWith('quote_')
      || key.startsWith('receipt_')
      || key.startsWith('company_')
      || key.startsWith('gateway_')
      || key.startsWith('paystack_')
      || key.startsWith('flutter_')
      || key.startsWith('bank_')
      || key.startsWith('pricing_rate_')
      || reviewKeys.includes(key)
      || ['currency', 'currency_symbol', 'default_tax_rate', 'tax_label', 'starting_number', 'homepage_url', 'homepage_label', 'enable_partial_payments', 'bookingIntro'].includes(key)
    )
    const keysForSection = siteSettingsSection === 'site'
      ? siteKeys
      : siteSettingsSection === 'social'
        ? socialKeys
        : siteSettingsSection === 'theme'
          ? themeKeys
          : Object.keys(settingsForm).filter((key) => !visibleKeySet.has(key) && !belongsOutsideSiteSettings(key))
    const setThemeColor = (key: string, value: string) => setSettingsForm((current) => ({ ...current, [key]: value }))
    const resetThemeColors = () => setSettingsForm((current) => ({ ...current, ...defaultThemeColors }))
    const renderThemeColorSettings = () => {
      const groups = [
        {
          title: 'Light mode',
          fields: [
            { key: 'theme_light_primary', label: 'Primary', fallback: defaultThemeColors.theme_light_primary },
            { key: 'theme_light_secondary', label: 'Secondary', fallback: defaultThemeColors.theme_light_secondary },
            { key: 'theme_light_active', label: 'Active', fallback: defaultThemeColors.theme_light_active },
          ],
        },
        {
          title: 'Dark mode',
          fields: [
            { key: 'theme_dark_primary', label: 'Primary', fallback: defaultThemeColors.theme_dark_primary },
            { key: 'theme_dark_secondary', label: 'Secondary', fallback: defaultThemeColors.theme_dark_secondary },
            { key: 'theme_dark_active', label: 'Active', fallback: defaultThemeColors.theme_dark_active },
          ],
        },
      ]

      return (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 lg:col-span-2">
            <p className="text-sm font-semibold text-gray-600">Reset restores the original light and dark theme colors. Use Save settings after resetting.</p>
            <button
              type="button"
              onClick={resetThemeColors}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-black text-gray-700 transition hover:bg-gray-50"
            >
              <RotateCcw className="h-4 w-4" />
              Reset defaults
            </button>
          </div>
          {groups.map((group) => (
            <section key={group.title} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <h3 className="text-lg font-black text-gray-900">{group.title}</h3>
              <div className="mt-4 grid gap-4">
                {group.fields.map((field) => {
                  const value = settingsForm[field.key] || field.fallback
                  return (
                    <label key={field.key} className="grid gap-2 text-sm font-bold text-gray-700">
                      {field.label}
                      <div className="flex min-h-11 overflow-hidden rounded-xl border border-gray-200 bg-white">
                        <input
                          className="h-11 w-14 cursor-pointer border-0 bg-transparent p-1"
                          type="color"
                          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : field.fallback}
                          onChange={(event) => setThemeColor(field.key, event.target.value)}
                        />
                        <input
                          className="min-w-0 flex-1 px-3 font-mono text-sm outline-none"
                          value={value}
                          placeholder={field.fallback}
                          onChange={(event) => setThemeColor(field.key, event.target.value)}
                        />
                      </div>
                    </label>
                  )
                })}
              </div>
            </section>
          ))}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 lg:col-span-2">
            <p className="text-sm font-semibold text-gray-600">Active color is used for selected states, emphasis, buttons, highlights, and brand accents. Primary and secondary feed the site-wide CSS theme tokens for both light and dark mode.</p>
          </div>
        </div>
      )
    }
    const renderSettingsFields = (keys: string[]) => (
      <div className="grid gap-4 lg:grid-cols-2">
        {keys.filter((key) => key in settingsForm).map((key) => (
          <label key={key} className="grid gap-2 text-sm font-bold text-gray-700">
            {settingLabels[key] ?? key}
            {key === 'homepageVideoUrl' ? (
              <>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    className="theme-input min-h-11 min-w-0 flex-1 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500"
                    value={settingsForm[key] ?? ''}
                    placeholder="YouTube URL or /uploads/video.mp4"
                    onChange={(event) => setSettingsForm(prev => ({ ...prev, [key]: event.target.value }))}
                  />
                  <span className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-black text-gray-700 transition hover:bg-gray-100">
                    <Upload className="h-4 w-4" />
                    Upload
                    <input
                      className="hidden"
                      type="file"
                      accept="video/*"
                      onChange={(event) => event.target.files?.[0] && void uploadFile(event.target.files[0], (media) => setSettingsForm(prev => ({ ...prev, homepageVideoUrl: media.url })))}
                    />
                  </span>
                </div>
                <span className="text-xs font-medium text-gray-500">Supports YouTube links or uploaded video files from the media library.</span>
              </>
            ) : (
              <input
                className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500"
                value={settingsForm[key] ?? ''}
                onChange={(event) => setSettingsForm(prev => ({ ...prev, [key]: event.target.value }))}
              />
            )}
          </label>
        ))}
      </div>
    )
    const mailFieldClass = 'theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500'
    const renderSmtpSettings = () => (
      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Mail delivery</p>
            <h3 className="mt-1 text-xl font-black text-gray-900">SMTP connection</h3>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-gray-500">Configure the mail server used by bookings, invoices, password resets, and other website email.</p>
          </div>
          <label className="inline-flex min-h-11 items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-black text-gray-700">
            <input type="checkbox" checked={mailSettings.enabled} onChange={(event) => setMailSettings((current) => ({ ...current, enabled: event.target.checked }))} />
            Enable SMTP
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="grid gap-2 text-sm font-bold text-gray-700">
            SMTP host
            <input className={mailFieldClass} value={mailSettings.host} placeholder="smtp.example.com" onChange={(event) => setMailSettings((current) => ({ ...current, host: event.target.value }))} />
          </label>
          <label className="grid gap-2 text-sm font-bold text-gray-700">
            Port
            <input className={mailFieldClass} type="number" min="1" max="65535" value={mailSettings.port} onChange={(event) => setMailSettings((current) => ({ ...current, port: Number(event.target.value) }))} />
          </label>
          <label className="grid gap-2 text-sm font-bold text-gray-700">
            Encryption
            <select className={mailFieldClass} value={mailSettings.encryption} onChange={(event) => setMailSettings((current) => ({ ...current, encryption: event.target.value as MailSettings['encryption'] }))}>
              <option value="tls">TLS / STARTTLS</option>
              <option value="ssl">SSL</option>
              <option value="none">None</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-gray-700">
            Username
            <input className={mailFieldClass} autoComplete="username" value={mailSettings.username} onChange={(event) => setMailSettings((current) => ({ ...current, username: event.target.value }))} />
          </label>
          <label className="grid gap-2 text-sm font-bold text-gray-700">
            Password
            <input className={mailFieldClass} type="password" autoComplete="new-password" value={mailSettings.password} placeholder={mailSettings.hasPassword ? 'Saved password (leave blank to keep)' : 'SMTP password'} onChange={(event) => setMailSettings((current) => ({ ...current, password: event.target.value }))} />
          </label>
          <label className="grid gap-2 text-sm font-bold text-gray-700">
            From email
            <input className={mailFieldClass} type="email" value={mailSettings.fromAddress} placeholder="hello@example.com" onChange={(event) => setMailSettings((current) => ({ ...current, fromAddress: event.target.value }))} />
          </label>
          <label className="grid gap-2 text-sm font-bold text-gray-700">
            From name
            <input className={mailFieldClass} value={mailSettings.fromName} placeholder="Bakhtech Solutions" onChange={(event) => setMailSettings((current) => ({ ...current, fromName: event.target.value }))} />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <label className="grid min-w-[260px] flex-1 gap-2 text-sm font-bold text-gray-700">
            Test recipient
            <input className={mailFieldClass} type="email" value={mailTestEmail} placeholder="you@example.com" onChange={(event) => setMailTestEmail(event.target.value)} />
          </label>
          <Button type="button" disabled={saving} variant="ghost" className="min-h-11 rounded-xl border border-blue-200 bg-white text-blue-700" onClick={() => void sendTestMail()}>
            <Send className="h-4 w-4" />
            Send test email
          </Button>
          <Button type="button" disabled={saving} className="min-h-11 rounded-xl bg-blue-600 text-white" onClick={() => void saveMailSettings()}>
            <Save className="h-4 w-4" />
            Save SMTP
          </Button>
        </div>
      </section>
    )
    const siteEmailPreviewHtml = selectedSiteEmailLog?.bodyHtml
      || (selectedSiteEmailLog?.bodyText
        ? `<pre style="box-sizing:border-box;margin:0;min-height:100vh;padding:24px;white-space:pre-wrap;word-break:break-word;font:14px/1.7 Arial,sans-serif;color:#111827;background:#ffffff">${escapeHtml(selectedSiteEmailLog.bodyText)}</pre>`
        : '<p style="font:14px/1.7 Arial,sans-serif;padding:24px;color:#6b7280">Preview body is not available for this older email log.</p>')
    const renderSiteEmailLogs = () => (
      <>
      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Delivery history</p>
            <h3 className="mt-1 text-xl font-black text-gray-900">Website email logs</h3>
            <p className="mt-2 text-sm font-semibold text-gray-500">Successful mail and SMTP test failures are recorded here.</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" className="rounded-xl border border-gray-200" onClick={() => void loadSiteEmailLogs(1)}>Refresh</Button>
            <Button type="button" variant="ghost" disabled={saving || siteEmailLogs.length === 0} className="rounded-xl border border-red-100 text-red-600" onClick={() => void clearSiteEmailLogs()}>
              <Trash2 className="h-4 w-4" />
              Clear logs
            </Button>
          </div>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_180px_auto]">
          <input className={mailFieldClass} value={siteEmailLogSearch} placeholder="Search recipient, subject, or source" onChange={(event) => setSiteEmailLogSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void loadSiteEmailLogs(1) } }} />
          <select className={mailFieldClass} value={siteEmailLogStatus} onChange={(event) => setSiteEmailLogStatus(event.target.value)}>
            <option value="">All statuses</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
          <Button type="button" className="rounded-xl bg-gray-900 text-white" onClick={() => void loadSiteEmailLogs(1)}>Filter</Button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {siteEmailLogs.map((log) => (
                <tr key={log.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-500">{log.sentAt || log.createdAt ? new Date(log.sentAt || log.createdAt).toLocaleString() : ''}</td>
                  <td className="px-4 py-3 font-bold text-gray-900">{log.recipient}</td>
                  <td className="max-w-md px-4 py-3 text-gray-700">
                    <p className="font-semibold">{log.subject || 'No subject'}</p>
                    {log.errorMessage ? <p className="mt-1 text-xs font-semibold text-red-600">{log.errorMessage}</p> : null}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-500">{log.source}</td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-black uppercase', log.status === 'sent' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>{log.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button type="button" variant="ghost" className="rounded-xl border border-gray-200" onClick={() => void previewSiteEmail(log)}>
                      <Eye className="h-4 w-4" />
                      Preview
                    </Button>
                  </td>
                </tr>
              ))}
              {siteEmailLogs.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center font-semibold text-gray-500">No email logs found.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-sm font-bold text-gray-500">
          <span>{siteEmailLogsMeta.total} total logs</span>
          {renderNumberedPagination({
            currentPage: siteEmailLogsMeta.page,
            totalPages: siteEmailLogsMeta.lastPage,
            onPage: (page) => void loadSiteEmailLogs(page),
          })}
        </div>
      </section>
      {selectedSiteEmailLog ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Email preview">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 p-5">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Email preview</p>
                <h3 className="mt-1 truncate text-lg font-black text-gray-900">{selectedSiteEmailLog.subject || 'No subject'}</h3>
                <p className="mt-1 text-sm font-semibold text-gray-500">To: {selectedSiteEmailLog.recipient}</p>
              </div>
              <Button type="button" variant="ghost" className="h-10 w-10 rounded-xl border border-gray-200 p-0" onClick={() => setSelectedSiteEmailLog(null)} title="Close preview">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-3 border-b border-gray-100 bg-gray-50 px-5 py-3 text-xs font-bold text-gray-500 sm:grid-cols-3">
              <span>Source: {selectedSiteEmailLog.source}</span>
              <span>Mailer: {selectedSiteEmailLog.mailer || 'Unknown'}</span>
              <span>Status: {selectedSiteEmailLog.status}</span>
            </div>
            {selectedSiteEmailLog.errorMessage ? (
              <p className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700">{selectedSiteEmailLog.errorMessage}</p>
            ) : null}
            <iframe
              title="Sent email content"
              sandbox=""
              className="min-h-[60vh] w-full flex-1 bg-white"
              srcDoc={siteEmailPreviewHtml}
            />
          </div>
        </div>
      ) : null}
      </>
    )
    const renderAdvancedSettings = () => (
      <div className="grid gap-6">
        <section className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-600">Deployment maintenance</p>
              <h3 className="mt-1 text-xl font-black text-gray-900">Update database and Laravel caches</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-gray-500">
                Runs migrations, clears old cached routes and configuration, then rebuilds Laravel's production caches.
                Use this after deploying backend changes.
              </p>
            </div>
            <Button
              type="button"
              disabled={deploymentRunning}
              className="min-h-11 rounded-xl bg-amber-600 text-white hover:bg-amber-700"
              onClick={() => void runDeploymentMaintenance()}
            >
              {deploymentRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              {deploymentRunning ? 'Running maintenance...' : 'Run deployment update'}
            </Button>
          </div>

          <div className="mt-5 rounded-xl border border-gray-200 bg-gray-950 p-4 font-mono text-xs leading-6 text-gray-200">
            <div>php artisan migrate --force</div>
            <div>php artisan optimize:clear</div>
            <div>php artisan optimize</div>
          </div>

          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-800">
            Admin only. Do not close or refresh this page while the update is running.
          </p>
        </section>

        {deploymentResults.length ? (
          <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Completed</p>
                <h3 className="mt-1 text-xl font-black text-gray-900">Deployment output</h3>
              </div>
              <span className="text-sm font-bold text-gray-500">{deploymentCompletedAt ? new Date(deploymentCompletedAt).toLocaleString() : ''}</span>
            </div>
            <div className="grid gap-3">
              {deploymentResults.map((result) => (
                <article key={result.command} className="overflow-hidden rounded-xl border border-gray-200">
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 px-4 py-3">
                    <code className="font-bold text-gray-900">{result.command}</code>
                    <span className={cn('rounded-full px-2.5 py-1 text-xs font-black uppercase', result.exitCode === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>
                      {result.exitCode === 0 ? 'Success' : `Exit ${result.exitCode}`}
                    </span>
                  </div>
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap bg-gray-950 p-4 text-xs leading-6 text-gray-200">{result.output || 'Command completed without output.'}</pre>
                  <p className="border-t border-gray-200 px-4 py-2 text-xs font-bold text-gray-500">{result.durationMs.toLocaleString()} ms</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {keysForSection.length ? (
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-black text-gray-900">Additional settings</h3>
            {renderSettingsFields(keysForSection)}
          </section>
        ) : null}
      </div>
    )

    return (
      <div>
        <PanelHeader 
          eyebrow="Settings" 
          title="Site Settings" 
          text="Configure global settings for your website including contact info, social media links, and more." 
        />
        <form className="grid gap-6" onSubmit={saveSettings}>
          <div className="grid gap-3 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm sm:grid-cols-2 xl:grid-cols-7">
            {settingSections.map((section) => {
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setSiteSettingsSection(section.id)}
                  className={cn('flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black transition', siteSettingsSection === section.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900')}
                >
                  <Icon className="h-4 w-4" />
                  {section.label}
                </button>
              )
            })}
          </div>

          {siteSettingsSection === 'menu' ? (
            <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Header menu</p>
                  <h3 className="mt-1 text-xl font-black text-gray-900">Navigation links and submenus</h3>
                </div>
                <Button type="button" variant="ghost" className="min-h-10 gap-2 rounded-xl border border-gray-200" onClick={addHeaderMenuItem}>
                  <Plus className="h-4 w-4" />
                  Add link
                </Button>
              </div>

              <div className="grid gap-3">
                {headerMenu.map((item, index) => (
                  <article key={`${item.label}-${index}`} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                      <label className="grid gap-2 text-sm font-bold text-gray-700">
                        Label
                        <input className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500" value={item.label} onChange={(event) => updateHeaderMenuItem(index, { label: event.target.value })} />
                      </label>
                      <label className="grid gap-2 text-sm font-bold text-gray-700">
                        URL
                        <input className="theme-input min-h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500" value={item.href} placeholder="/about" onChange={(event) => updateHeaderMenuItem(index, { href: event.target.value })} />
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold text-gray-700">
                          <input type="checkbox" checked={item.visible} onChange={(event) => updateHeaderMenuItem(index, { visible: event.target.checked })} />
                          Visible
                        </label>
                        <Button type="button" variant="ghost" className="h-10 w-10 rounded-xl border border-gray-200 p-0" onClick={() => moveHeaderMenuItem(index, -1)} disabled={index === 0} title="Move up"><ChevronLeft className="h-4 w-4 rotate-90" /></Button>
                        <Button type="button" variant="ghost" className="h-10 w-10 rounded-xl border border-gray-200 p-0" onClick={() => moveHeaderMenuItem(index, 1)} disabled={index === headerMenu.length - 1} title="Move down"><ChevronRight className="h-4 w-4 rotate-90" /></Button>
                        <Button type="button" variant="ghost" className="h-10 w-10 rounded-xl border border-red-100 p-0 text-red-600" onClick={() => removeHeaderMenuItem(index)} title="Remove link"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-gray-200 bg-white p-3">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <strong className="text-sm text-gray-800">Submenu</strong>
                        <Button type="button" variant="ghost" className="min-h-9 gap-2 rounded-xl border border-gray-200 px-3 text-xs" onClick={() => addHeaderSubmenuItem(index)}>
                          <Plus className="h-3.5 w-3.5" />
                          Add submenu
                        </Button>
                      </div>
                      <div className="grid gap-2">
                        {(item.children || []).map((child, childIndex) => (
                          <div key={`${child.label}-${childIndex}`} className="grid gap-2 rounded-lg bg-gray-50 p-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                            <label className="grid gap-1 text-xs font-bold text-gray-600">
                              Label
                              <input className="theme-input min-h-10 rounded-xl border border-gray-200 px-3 outline-none focus:border-blue-500" value={child.label} onChange={(event) => updateHeaderSubmenuItem(index, childIndex, { label: event.target.value })} />
                            </label>
                            <label className="grid gap-1 text-xs font-bold text-gray-600">
                              URL
                              <input className="theme-input min-h-10 rounded-xl border border-gray-200 px-3 outline-none focus:border-blue-500" value={child.href} onChange={(event) => updateHeaderSubmenuItem(index, childIndex, { href: event.target.value })} />
                            </label>
                            <div className="flex flex-wrap items-center gap-2">
                              <label className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700">
                                <input type="checkbox" checked={child.visible} onChange={(event) => updateHeaderSubmenuItem(index, childIndex, { visible: event.target.checked })} />
                                Visible
                              </label>
                              <Button type="button" variant="ghost" className="h-9 w-9 rounded-xl border border-gray-200 p-0" onClick={() => moveHeaderSubmenuItem(index, childIndex, -1)} disabled={childIndex === 0} title="Move up"><ChevronLeft className="h-3.5 w-3.5 rotate-90" /></Button>
                              <Button type="button" variant="ghost" className="h-9 w-9 rounded-xl border border-gray-200 p-0" onClick={() => moveHeaderSubmenuItem(index, childIndex, 1)} disabled={childIndex === (item.children || []).length - 1} title="Move down"><ChevronRight className="h-3.5 w-3.5 rotate-90" /></Button>
                              <Button type="button" variant="ghost" className="h-9 w-9 rounded-xl border border-red-100 p-0 text-red-600" onClick={() => removeHeaderSubmenuItem(index, childIndex)} title="Remove submenu"><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </div>
                        ))}
                        {(item.children || []).length === 0 ? <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-500">No submenu links.</p> : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : siteSettingsSection === 'theme' ? (
            <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              {renderThemeColorSettings()}
            </section>
          ) : siteSettingsSection === 'smtp' ? (
            renderSmtpSettings()
          ) : siteSettingsSection === 'email-logs' ? (
            renderSiteEmailLogs()
          ) : siteSettingsSection === 'advanced' ? (
            renderAdvancedSettings()
          ) : (
            <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              {keysForSection.length ? renderSettingsFields(keysForSection) : (
                <p className="rounded-xl bg-gray-50 p-4 text-sm font-semibold text-gray-500">No settings in this section yet.</p>
              )}
            </section>
          )}

          {!['smtp', 'email-logs'].includes(siteSettingsSection) ? (
            <div>
              <Button type="submit" className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white">Save Settings</Button>
            </div>
          ) : null}
        </form>
      </div>
    )
  }

  function editPricingCategory(category: PricingCategory) {
    setEditingPricingCategory(category)
    setPricingCategoryForm({ ...category })
  }

  function pricingFeatureLines(plan: PricingPlan) {
    return (plan.features || []).filter((feature) => feature.isIncluded !== false).map((feature) => feature.title).join('\n')
  }

  function pricingFeaturesFromLines(value: string): PricingPlanFeature[] {
    return value.split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((title, index) => ({
        featureId: null,
        title,
        description: '',
        groupName: 'General',
        isIncluded: true,
        sortOrder: index + 1,
      }))
  }

  function updatePricingPackage(categoryId: number, planId: number, patch: Partial<PricingPlan>) {
    setPricingCategories((current) => current.map((category) => {
      if (category.id !== categoryId) return category
      return {
        ...category,
        plans: category.plans.map((plan) => plan.id === planId ? { ...plan, ...patch } : plan),
      }
    }))
  }

  function addPricingPackage(categoryId: number) {
    const tempId = -Date.now()
    const nextPlan: PricingPlan = {
      id: tempId,
      pricingCategoryId: categoryId,
      name: 'New Package',
      slug: `package-${Math.abs(tempId)}`,
      description: '',
      billingType: 'one_time',
      monthlyEnabled: false,
      prices: { NGN: 0, USD: 0, GBP: 0 },
      promoPrices: {},
      discountPercentage: 0,
      displayPrice: { currency: 'NGN', baseAmount: 0, amount: 0, promoApplied: false },
      isActive: true,
      isPopular: false,
      sortOrder: 0,
      version: 1,
      features: [],
    }

    setPricingCategories((current) => current.map((category) => category.id === categoryId
      ? { ...category, plans: [...category.plans, nextPlan] }
      : category
    ))
  }

  async function savePricingPackage(categoryId: number, plan: PricingPlan) {
    setSaving(true)
    setError('')

    try {
      const prices = calculatedPricingPrices(Number(plan.prices?.NGN || 0), settingsForm)
      const payload = {
        ...plan,
        pricingCategoryId: categoryId,
        prices,
        promoPrices: {},
        discountPercentage: Number(plan.discountPercentage || 0),
        features: plan.features || [],
      }

      if (plan.id > 0) {
        await api.updatePricingPlan(plan.id, payload)
      } else {
        await api.createPricingPlan(payload)
      }
      notify('Package saved.')
      await loadPricingData()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save package.')
    } finally {
      setSaving(false)
    }
  }

  async function saveActivePricingCategory(category: PricingCategory) {
    setSaving(true)
    setError('')

    try {
      await api.updatePricingCategory(category.id, category)
      notify('Service saved.')
      await loadPricingData()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save service.')
    } finally {
      setSaving(false)
    }
  }

  function renderPricing() {
    const calculatedPlanPrices = calculatedPricingPrices(Number(pricingPlanForm.prices?.NGN || 0), settingsForm)
    const activePricingCategory = pricingCategories.find((category) => category.id === Number(pricingPlanForm.pricingCategoryId || pricingCategories[0]?.id || 0)) ?? pricingCategories[0]
    const pricingShareLink = activePricingCategory
      ? `${typeof window === 'undefined' ? '' : window.location.origin}/pricing?service=${activePricingCategory.slug}`
      : ''

    return (
      <div className="space-y-6">
        <PanelHeader
          eyebrow="Pricing System"
          title="Pricing plans and currency rates"
          text="Manage service categories, plan prices, reusable features, and the pricing data that is locked onto generated invoices."
        />

        <div className="flex flex-wrap gap-3">
          <Button type="button" className="rounded-xl bg-blue-600 text-white" onClick={() => void loadPricingData()}>
            Refresh Pricing
          </Button>
          <a href="/admin/pricing-preview" target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700">
            Open Custom Pricing Frontend
          </a>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-950">Currency Rates</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">Enter rates as 1 NGN equals the currency amount. Plan USD and GBP prices are calculated from the NGN base price.</p>
            </div>
            <Button type="button" disabled={saving} className="rounded-xl bg-blue-600 text-white" onClick={() => void savePricingRates()}>
              <Save className="h-4 w-4" />
              Save Rates
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
              USD rate
              <input
                type="number"
                min="0"
                step="0.00001"
                value={settingsForm.pricing_rate_usd ?? '0.00067'}
                onChange={(event) => setSettingsForm((current) => ({ ...current, pricing_rate_usd: event.target.value }))}
                className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold normal-case text-slate-900"
              />
            </label>
            <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
              GBP rate
              <input
                type="number"
                min="0"
                step="0.00001"
                value={settingsForm.pricing_rate_gbp ?? '0.00053'}
                onChange={(event) => setSettingsForm((current) => ({ ...current, pricing_rate_gbp: event.target.value }))}
                className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold normal-case text-slate-900"
              />
            </label>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-black uppercase text-slate-500">Example</p>
              <p className="mt-1 text-sm font-bold text-slate-800">NGN 1,000,000 = USD {calculatedPricingPrices(1000000, settingsForm).USD.toLocaleString()} / GBP {calculatedPricingPrices(1000000, settingsForm).GBP.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-3">
              <p className="text-xs font-black uppercase text-blue-600">Current plan preview</p>
              <p className="mt-1 text-sm font-bold text-slate-800">USD {calculatedPlanPrices.USD.toLocaleString()} / GBP {calculatedPlanPrices.GBP.toLocaleString()}</p>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <form onSubmit={savePricingCategory} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-black text-slate-950">{editingPricingCategory ? 'Edit Category' : 'New Category'}</h3>
              {editingPricingCategory && (
                <button type="button" className="text-xs font-black text-slate-500" onClick={() => { setEditingPricingCategory(null); setPricingCategoryForm(emptyPricingCategoryForm) }}>Cancel</button>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
                Name
                <input required value={pricingCategoryForm.name || ''} onChange={(event) => setPricingCategoryForm({ ...pricingCategoryForm, name: event.target.value })} className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold normal-case text-slate-900" />
              </label>
              <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
                Slug
                <input value={pricingCategoryForm.slug || ''} onChange={(event) => setPricingCategoryForm({ ...pricingCategoryForm, slug: event.target.value })} className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold normal-case text-slate-900" />
              </label>
              <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
                Icon
                <input value={pricingCategoryForm.icon || ''} onChange={(event) => setPricingCategoryForm({ ...pricingCategoryForm, icon: event.target.value })} className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold normal-case text-slate-900" />
              </label>
              <label className="grid gap-1 text-xs font-black uppercase text-slate-500">
                Sort Order
                <input type="number" value={pricingCategoryForm.sortOrder || 0} onChange={(event) => setPricingCategoryForm({ ...pricingCategoryForm, sortOrder: Number(event.target.value) })} className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold normal-case text-slate-900" />
              </label>
            </div>
            <label className="mt-3 grid gap-1 text-xs font-black uppercase text-slate-500">
              Description
              <textarea value={pricingCategoryForm.description || ''} onChange={(event) => setPricingCategoryForm({ ...pricingCategoryForm, description: event.target.value })} className="min-h-24 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold normal-case text-slate-900" />
            </label>
            <label className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-700">
              <input type="checkbox" checked={Boolean(pricingCategoryForm.isActive)} onChange={(event) => setPricingCategoryForm({ ...pricingCategoryForm, isActive: event.target.checked })} />
              Active
            </label>
            <Button disabled={saving} className="mt-4 rounded-xl bg-blue-600 text-white">
              <Save className="h-4 w-4" />
              Save Category
            </Button>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-lg font-black text-slate-950">Categories</h3>
            <div className="grid gap-3">
              {pricingCategories.map((category) => (
                <div key={category.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div>
                    <p className="font-black text-slate-950">{category.name}</p>
                    <p className="text-xs font-bold text-slate-500">{category.slug} - {category.plans.length} plans - {category.isActive ? 'Active' : 'Inactive'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600" onClick={() => editPricingCategory(category)}><Pencil className="h-4 w-4" /></button>
                    <button type="button" className="rounded-lg border border-red-100 bg-red-50 p-2 text-red-600" onClick={() => void deletePricingCategory(category.id)}><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {activePricingCategory ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 border-b border-slate-200 pb-5">
              <label className="grid gap-2 text-xs font-black uppercase text-slate-600">
                Active service
                <select
                  value={activePricingCategory.id}
                  onChange={(event) => setPricingPlanForm((current) => ({ ...current, pricingCategoryId: Number(event.target.value) }))}
                  className="min-h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold normal-case text-slate-900"
                >
                  {pricingCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-xs font-black uppercase text-slate-600">
                Description
                <textarea
                  value={activePricingCategory.description || ''}
                  onChange={(event) => setPricingCategories((current) => current.map((category) => category.id === activePricingCategory.id ? { ...category, description: event.target.value } : category))}
                  className="min-h-24 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold normal-case text-slate-900"
                />
              </label>
              <div className="grid gap-2 text-xs font-black uppercase text-slate-600">
                <span>Share link</span>
                <div className="flex gap-2">
                  <input readOnly value={pricingShareLink} className="min-h-10 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold normal-case text-slate-900" />
                  <Button type="button" variant="ghost" className="rounded-xl border border-blue-200 px-4 text-blue-700" onClick={() => void navigator.clipboard.writeText(pricingShareLink)}>Copy</Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button type="button" className="rounded-xl bg-blue-600 text-white" disabled={saving} onClick={() => void saveActivePricingCategory(activePricingCategory)}>
                  <Save className="h-4 w-4" />
                  Save Service
                </Button>
                <Button type="button" variant="ghost" className="rounded-xl border border-slate-200" onClick={() => addPricingPackage(activePricingCategory.id)}>
                  <Plus className="h-4 w-4" />
                  Add Package
                </Button>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-black text-slate-950">Packages</h3>
              <div className="mt-5 grid gap-5 xl:grid-cols-3 md:grid-cols-2">
                {activePricingCategory.plans.map((plan) => {
                  const calculated = calculatedPricingPrices(Number(plan.prices?.NGN || 0), settingsForm)
                  return (
                    <article key={plan.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                        <input
                          value={plan.name}
                          onChange={(event) => updatePricingPackage(activePricingCategory.id, plan.id, { name: event.target.value })}
                          className="min-w-0 flex-1 rounded-lg border border-transparent px-2 py-1 text-base font-black text-blue-700 outline-none focus:border-blue-200"
                        />
                        <button type="button" className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => plan.id > 0 ? void deletePricingPlan(plan.id) : setPricingCategories((current) => current.map((category) => category.id === activePricingCategory.id ? { ...category, plans: category.plans.filter((item) => item.id !== plan.id) } : category))}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid gap-4">
                        <div className="grid grid-cols-2 gap-4">
                          <label className="grid gap-2 text-xs font-black uppercase text-slate-600">
                            Package ID
                            <input value={plan.slug || ''} onChange={(event) => updatePricingPackage(activePricingCategory.id, plan.id, { slug: event.target.value })} className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold normal-case text-slate-900" />
                          </label>
                          <label className="grid gap-2 text-xs font-black uppercase text-slate-600">
                            Price (NGN)
                            <input type="number" min="0" value={plan.prices?.NGN || 0} onChange={(event) => updatePricingPackage(activePricingCategory.id, plan.id, { prices: calculatedPricingPrices(Number(event.target.value), settingsForm) })} className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold normal-case text-slate-900" />
                          </label>
                        </div>
                        <label className="grid gap-2 text-xs font-black uppercase text-slate-600">
                          Package Name
                          <input value={plan.name || ''} onChange={(event) => updatePricingPackage(activePricingCategory.id, plan.id, { name: event.target.value })} className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold normal-case text-slate-900" />
                        </label>
                        <label className="grid gap-2 text-xs font-black uppercase text-slate-600">
                          Features (one per line)
                          <textarea value={pricingFeatureLines(plan)} onChange={(event) => updatePricingPackage(activePricingCategory.id, plan.id, { features: pricingFeaturesFromLines(event.target.value) })} className="min-h-32 rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs leading-5 text-slate-900" />
                        </label>
                        <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-500">
                          <span>USD {calculated.USD.toLocaleString()}</span>
                          <span>GBP {calculated.GBP.toLocaleString()}</span>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-700">
                            <input type="checkbox" checked={Boolean(plan.isActive)} onChange={(event) => updatePricingPackage(activePricingCategory.id, plan.id, { isActive: event.target.checked })} />
                            Active
                          </label>
                          <Button type="button" disabled={saving || !plan.name || !plan.slug} className="rounded-xl bg-blue-600 text-white" onClick={() => void savePricingPackage(activePricingCategory.id, plan)}>
                            <Save className="h-4 w-4" />
                            Save
                          </Button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          </section>
        ) : null}
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
      case 'pricing': return renderPricing()
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
