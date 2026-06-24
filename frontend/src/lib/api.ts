export type Project = {
  id: number
  title: string
  slug: string
  category: string
  summary: string
  description: string
  image: string
  coverImage: string
  videoUrl: string
  websiteUrl: string
  services: string[]
  metrics: Record<string, string>
  isFeatured: boolean
  status: 'published' | 'draft'
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type ProjectInput = {
  title: string
  category: string
  summary: string
  description: string
  image: string
  coverImage: string
  videoUrl: string
  websiteUrl: string
  services: string
  status: 'published' | 'draft'
  isFeatured: boolean
  sortOrder: number
}

export type DashboardData = {
  totals: {
    projects: number
    publishedProjects: number
    bookings: number
    upcomingBookings: number
    visits: number
    todayVisits: number
  }
  seo: {
    score: number
    indexedPages: number
    issues: number
  }
  performance: {
    score: number
    loadTime: string
    mobileScore: number
  }
  visits: {
    topPages: Array<{ path: string; visits: number }>
  }
  analytics: VisitorAnalytics
}

export type VisitorAnalytics = {
  migrationRequired?: boolean
  range: 'week' | 'month' | 'year' | 'custom'
  periodLabel: string
  startDate: string
  endDate: string
  visitorTotals: { week: number; month: number; year: number }
  liveVisitors: number
  visitors: number
  sessions: number
  pageViews: number
  excludedBotPageViews: number
  averageDurationSeconds: number
  bounceRate: number
  pagesPerSession: number
  topPages: Array<{ name: string; count: number }>
  countries: Array<{ name: string; count: number }>
  sources: Array<{ name: string; count: number }>
  devices: Array<{ name: string; count: number }>
  browsers: Array<{ name: string; count: number }>
  trendInterval: 'day' | 'month'
  trend: Array<{ date: string; label: string; visitors: number; pageViews: number }>
  liveSessions: Array<{
    sessionId: string
    path: string
    country: string
    city: string
    source: string
    deviceType: string
    browser: string
    durationSeconds: number
    lastSeenAt: string
  }>
}

export type SeoAudit = {
  summary: {
    score: number
    audited: number
    published: number
    indexable: number
    critical: number
    warnings: number
    passedChecks: number
    totalChecks: number
  }
  documents: Array<{
    id: number
    type: string
    title: string
    path: string
    status: string
    indexable: boolean
    score: number
    wordCount: number
    titleLength: number
    descriptionLength: number
    canonicalUrl: string
    passedChecks: number
    totalChecks: number
    checks: Array<{ code: string; label: string; passed: boolean; weight: number; severity: 'critical' | 'warning'; message: string }>
    issues: Array<{ code: string; label: string; message: string; severity: 'critical' | 'warning'; documentId: number; documentTitle: string }>
  }>
  recommendations: Array<{ code: string; label: string; message: string; severity: 'critical' | 'warning'; affected: number }>
  technical: Array<{ label: string; url: string; status: string }>
  generatedAt: string
}

export type MediaItem = {
  id: number
  filename: string
  originalName: string
  mimeType: string
  size: number
  url: string
  createdAt: string
}

type UploadMediaResponse = {
  media: MediaItem
  warning?: string
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Unable to read this file for upload.'))
    reader.readAsDataURL(file)
  })
}

export type CmsPage = {
  id: number
  title: string
  slug: string
  template: string
  parentId: number | null
  sortOrder: number
  content: string
  excerpt: string
  seoTitle: string
  seoDescription: string
  canonicalUrl: string
  metaRobots: string
  focusKeyword: string
  ogTitle: string
  ogDescription: string
  ogImage: string
  twitterTitle: string
  twitterDescription: string
  twitterImage: string
  schemaType: string
  schemaJson: string
  status: string
  publishedAt: string
  updatedAt: string
}

export type CmsPost = {
  id: number
  title: string
  slug: string
  excerpt: string
  content: string
  category: string
  image: string
  status: 'draft' | 'published' | 'scheduled'
  seoTitle: string
  seoDescription: string
  focusKeyword: string
  canonicalUrl: string
  metaRobots: string
  ogTitle: string
  ogDescription: string
  ogImage: string
  publishedAt: string
  wordCount: number
  readingTime: number
  createdAt: string
  updatedAt: string
}

export type PostInput = Pick<CmsPost,
  | 'title'
  | 'slug'
  | 'excerpt'
  | 'content'
  | 'category'
  | 'image'
  | 'status'
  | 'seoTitle'
  | 'seoDescription'
  | 'focusKeyword'
  | 'canonicalUrl'
  | 'metaRobots'
  | 'ogTitle'
  | 'ogDescription'
  | 'ogImage'
  | 'publishedAt'
>

export type PostListResponse = {
  data: CmsPost[]
  meta: { currentPage: number; perPage: number; total: number; lastPage: number }
  summary: { total: number; published: number; drafts: number; scheduled: number }
  categories: string[]
}

export type Booking = {
  id: number
  eventTypeId: number | null
  name: string
  email: string
  phone: string
  service: string
  message: string
  status: string
  scheduledAt: string
  startsAt: string
  endsAt: string
  timezone: string
  attendeeTimezone?: string
  durationMinutes: number
  locationType: string
  locationValue: string
  googleCalendarEventUrl: string
  googleCalendarSyncStatus: string
  googleCalendarSyncError: string
  reminderSentAt: string
  createdAt: string
}

export type BookingEventType = {
  id: number
  calendarId?: number | null
  name: string
  slug: string
  description: string
  durationMinutes: number
  bufferMinutes: number
  locationType: string
  locationLabel: string
  timezone: string
  minNoticeHours: number
  maxFutureDays: number
  reminderMinutesBefore: number
  priceAmount?: number
  currency?: string
  paymentRequired?: boolean
  isActive: boolean
  updatedAt?: string
  availability?: Record<string, Array<{ start: string; end: string }>>
}

export type BookingSlot = {
  date: string
  time: string
  label: string
  startsAt: string
  timezone?: string
}

export type BookingAvailabilityDay = {
  date: string
  label: string
  slots: BookingSlot[]
}

export type PublicBookingInput = {
  eventTypeId: number
  startsAt: string
  timezone: string
  name: string
  email: string
  phone: string
  service?: string
  message: string
  meetingPlatform?: string
}

export type ContactMessageInput = {
  name: string
  email: string
  phone?: string
  subject?: string
  message: string
  website?: string
  company?: string
  submittedAt?: number
}

export type BookingCalendar = {
  id: number
  name: string
  slug: string
  description: string
  timezone: string
  color: string
  settings?: CalendarSettings
  bookingCount?: number
  publicUrl?: string
  isActive: boolean
  resources?: Array<{
    id?: number
    calendarId?: number
    type: string
    name: string
    email: string
    phone: string
    description: string
    isActive: boolean
  }>
  createdAt: string
  updatedAt: string
}

export type CalendarSettings = {
  form: {
    fields: Array<{ key: string; label: string; type: string; enabled: boolean; required: boolean; system?: boolean; hidden?: boolean; helpMessage?: string; options?: string[] }>
    customFields: Array<{ key: string; label: string; type: string; required: boolean; enabled?: boolean; system?: boolean; hidden?: boolean; helpMessage?: string; options?: string[] }>
  }
  payment: { enabled: boolean; pricingType: string; amount: number; currency: string; gateway: string }
  email: { confirmationEnabled: boolean; adminNotificationEnabled: boolean; reminderMinutesBefore: number | number[]; confirmationTemplate?: string; adminTemplate?: string; reminderTemplate?: string; cancellationTemplate?: string }
  availability: { timezone: string; workingDays: string[]; startTime: string; endTime: string; bufferMinutes: number; blackoutDates: string[] }
  locations?: Array<{ id: string; label: string; type: string; details?: string; enabled: boolean }>
}

export type BookingCmsBooking = {
  id: number
  calendarId: number | null
  calendarName: string
  resourceId: number | null
  resourceName: string
  eventTypeId: number | null
  eventTypeName: string
  customer: { name: string; email: string; phone: string }
  serviceType: string
  startsAt: string
  endsAt: string
  durationMinutes: number
  timezone: string
  status: string
  notes: string
  adminRemarks: string
  priceAmount: number
  currency: string
  payment: {
    provider: string
    status: string
    reference: string
    authorizationUrl: string
    paidAt: string
  }
  location: { type: string; value: string }
  googleCalendar: { status: string; eventUrl: string }
  reminderSentAt: string
  createdAt: string
  updatedAt: string
}

export type BookingCmsOverview = {
  totals: {
    today: number
    week: number
    month: number
    upcoming: number
    completed: number
    cancelled: number
  }
  revenue: {
    enabled: boolean
    currency: string
    today: number
    month: number
  }
  calendarSnapshot: {
    view: string
    from: string
    to: string
    bookings: BookingCmsBooking[]
    blackouts: Array<{ id: number; title: string; startsAt: string; endsAt: string }>
  }
  recentActivity: Array<{ id: number; actorName: string; action: string; entityType: string; entityId: number | null; createdAt: string }>
  quickActions: Array<{ key: string; label: string }>
}

export type InvoiceClient = {
  id?: number | null
  name: string
  email: string
  phone?: string
  companyName?: string
  address?: string
}

export type InvoiceItem = {
  id?: number
  name: string
  description: string
  quantity: number
  unitPrice: number
  discountRate: number
  taxRate: number
  lineTotal?: number
}

export type InvoiceDocument = {
  id: number | null
  type: 'invoice' | 'quote' | 'receipt'
  number: string
  title: string
  publicToken?: string | null
  publicUrl: string
  status: string
  currency: string
  exchangeRate: number
  subtotal: number
  discountTotal: number
  taxTotal: number
  total: number
  amountPaid: number
  balanceDue: number
  issueDate: string
  dueDate: string
  paymentGateway: string
  paymentEnabled: boolean
  partialPaymentEnabled: boolean
  serviceOverview: string
  scopeOfService: string
  notes: string
  terms: string
  branding: {
    businessName: string
    logoUrl: string
    primaryColor: string
    accentColor: string
    email: string
    phone: string
    address: string
  }
  paymentAccount?: {
    currency: string
    accountName: string
    accountNumber: string
    bankName: string
    bankAddress: string
    wireRouting: string
    achRouting: string
    accountType: string
    instructions: string
  }
  pricing?: {
    categoryId: number | null
    planId: number | null
    versionId: number | null
    snapshot: Record<string, unknown> | null
    selectedFeatures: PricingPlanFeature[]
  }
  client: InvoiceClient
  items: InvoiceItem[]
  analytics: {
    totalViews: number
    uniqueViews: number
    paymentClicks: number
    conversionRate: number
  }
  viewEvents: InvoiceEvent[]
  generatedInvoice?: {
    number: string
    publicUrl: string
    status: string
    total: number
  } | null
  createdAt: string
  updatedAt: string
}

export type InvoiceEvent = {
  id: number
  documentId: number
  documentNumber: string
  documentType: string
  eventType: string
  deviceType: string
  browser: string
  operatingSystem: string
  ipAddress: string
  country: string
  city: string
  sessionId: string
  metadata: Record<string, unknown>
  createdAt: string
}

export type PublicReceiptData = {
  number: string
  reference: string
  gateway: string
  amount: number
  currency: string
  paidAt: string
  invoiceNumber: string
  invoiceUrl: string
  downloadUrl: string
  client: { name: string; email: string; companyName: string }
  branding: NonNullable<InvoiceDocument['branding']>
}

export type PricingPlanFeature = {
  id?: number
  featureId?: number | null
  title: string
  description: string
  groupName: string
  isIncluded: boolean
  sortOrder: number
}

export type PricingPlan = {
  id: number
  pricingCategoryId: number
  name: string
  slug: string
  description: string
  billingType: 'one_time' | 'monthly'
  monthlyEnabled: boolean
  prices: Record<string, number>
  promoPrices: Record<string, number>
  discountPercentage: number
  displayPrice: { currency: string; baseAmount: number | null; amount: number | null; promoApplied: boolean }
  isActive: boolean
  isPopular: boolean
  sortOrder: number
  version: number
  features: PricingPlanFeature[]
  createdAt?: string
  updatedAt?: string
}

export type PricingCategory = {
  id: number
  name: string
  slug: string
  description: string
  icon: string
  serviceType: 'new_website' | 'existing_website'
  isActive: boolean
  sortOrder: number
  plans: PricingPlan[]
}

export type PricingFeature = {
  id: number
  title: string
  description: string
  groupName: string
  isActive: boolean
}

export type InvoiceOverview = {
  totals: { documents: number; invoices: number; quotes: number; receipts: number; paid: number; unpaid: number }
  revenue: { paid: number; outstanding: number; currency: string }
  conversion: { uniqueViews: number; paymentClicks: number; viewToPaymentClickRate: number }
  recentEvents: InvoiceEvent[]
}

export type InvoiceListMeta = {
  page: number
  perPage: number
  total: number
  lastPage: number
}

export type InvoiceEmailLog = {
  id: number
  documentId: number
  documentNumber: string
  documentType: string
  documentStatus: string
  clientName: string
  recipientEmail: string
  subject: string
  templateKey: string
  status: string
  bodyHtml: string
  sentAt: string
  openedAt: string
  openCount: number
  opens: Array<{
    id: number
    openedAt: string
    ipAddress: string
    deviceType: string
    browser: string
    operatingSystem: string
    country: string
    city: string
    userAgent: string
  }>
  clickedAt: string
  errorMessage: string
  createdAt: string
  updatedAt: string
}

export type MailSettings = {
  enabled: boolean
  host: string
  port: number
  encryption: 'tls' | 'ssl' | 'none'
  username: string
  password: string
  hasPassword: boolean
  fromAddress: string
  fromName: string
}

export type SiteEmailLog = {
  id: number
  recipient: string
  subject: string
  bodyHtml: string
  bodyText: string
  source: string
  mailer: string
  status: 'sent' | 'failed'
  errorMessage: string
  sentAt: string
  createdAt: string
}

export type DeploymentCommandResult = {
  command: string
  exitCode: number
  output: string
  durationMs: number
}

export type BookingAvailabilityRule = {
  id: number
  calendarId: number | null
  eventTypeId: number | null
  name: string
  workingDays: string[]
  startTime: string
  endTime: string
  breaks: Array<{ start: string; end: string; label?: string }>
  recurrence: string
  effectiveFrom: string
  effectiveUntil: string
  isActive: boolean
}

export type PaginatedResponse<T> = {
  data: T[]
  meta: {
    currentPage: number
    perPage: number
    total: number
    lastPage: number
  }
}

export type Review = {
  id: number
  provider: 'google' | 'trustpilot' | 'facebook' | 'instagram' | 'linkedin' | 'website' | 'manual'
  providerLabel: string
  authorName: string
  authorImage: string
  rating: number
  content: string
  externalUrl: string
  reviewedAt: string
  isFeatured: boolean
  isPublished: boolean
  createdAt: string
  updatedAt: string
}

export type ReviewInput = {
  provider: Review['provider']
  authorName: string
  authorImage: string
  rating: number
  content: string
  externalUrl: string
  reviewedAt: string
  isFeatured: boolean
  isPublished: boolean
}

export type GoogleReviewConnection = {
  connected: boolean
  popupUrl: string
  businessName: string
  businessAddress: string
  pageId: string
  provider: string
  hasAccessToken: boolean
  maskedAccessToken: string
  webhookUrl: string
  connectionEndpoint: string
  lastSyncedAt: string
  lastError: string
  importedReviewCount: number
  googleReviewCount: number
  connectorLimit: string
  businessUrl: string
  hasApiKey: boolean
  maskedApiKey: string
}

export type AdminUser = {
  id: number
  email: string
  name: string
  role: string
  twoFactorEnabled: boolean
  createdAt: string
}

export type CmsData = {
  pages: CmsPage[]
  posts: CmsPost[]
  bookings: Booking[]
  bookingEventTypes: BookingEventType[]
  reviews: Review[]
  users: AdminUser[]
  settings: Record<string, string>
  media: MediaItem[]
}

const tokenKey = 'bakhtech_admin_token'
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  requiresTwoFactor: boolean

  constructor(message: string, status: number, requiresTwoFactor = false) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.requiresTwoFactor = requiresTwoFactor
  }
}

function apiUrl(path: string) {
  return `${apiBaseUrl}${path}`
}

async function parseJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const contentType = response.headers.get('content-type') || ''

  if (!contentType.toLowerCase().includes('application/json')) {
    const body = await response.text().catch(() => '')
    const isHtml = body.trimStart().startsWith('<')
    const message = isHtml
      ? 'The API returned an HTML page instead of JSON. Check that /api routes are forwarded to Laravel on the live server.'
      : body.trim().slice(0, 300) || `${fallbackMessage} (${response.status || 'network error'})`

    throw new ApiError(message, response.status)
  }

  return response.json() as Promise<T>
}

async function parseErrorPayload(response: Response, fallbackMessage: string) {
  try {
    const body = await parseJsonResponse<{ message?: string; requiresTwoFactor?: boolean }>(response, fallbackMessage)
    return {
      message: body.message || fallbackMessage,
      requiresTwoFactor: Boolean(body.requiresTwoFactor),
    }
  } catch (error) {
    const statusLabel = response.status ? ` (${response.status})` : ''
    return {
      message: error instanceof ApiError ? error.message : `${fallbackMessage}${statusLabel}`,
      requiresTwoFactor: false,
    }
  }
}

export function getAdminToken() {
  const token = sessionStorage.getItem(tokenKey)
  localStorage.removeItem(tokenKey)

  return token
}

export function setAdminToken(token: string) {
  localStorage.removeItem(tokenKey)
  sessionStorage.setItem(tokenKey, token)
}

export function clearAdminToken() {
  sessionStorage.removeItem(tokenKey)
  localStorage.removeItem(tokenKey)
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAdminToken()
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorPayload = await parseErrorPayload(response, 'Request failed.')
    throw new ApiError(errorPayload.message, response.status, errorPayload.requiresTwoFactor)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return parseJsonResponse<T>(response, 'Request failed.')
}

let publicSettingsPromise: Promise<{ settings: Record<string, string> }> | null = null

function publicSettings() {
  publicSettingsPromise ??= request<{ settings: Record<string, string> }>('/api/settings')
    .catch((error) => {
      publicSettingsPromise = null
      throw error
    })

  return publicSettingsPromise
}

export const api = {
  login(email: string, password: string, twoFactorCode = '') {
    return request<{ token: string; admin: { id: number; email: string; name: string; twoFactorEnabled: boolean } }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, twoFactorCode }),
    })
  },
  requestAdminPasswordReset(email: string) {
    return request<{ message: string }>('/api/admin/password/forgot', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  },
  resetAdminPassword(payload: { email: string; token: string; password: string; passwordConfirmation: string }) {
    return request<{ message: string }>('/api/admin/password/reset', {
      method: 'POST',
      body: JSON.stringify({
        email: payload.email,
        token: payload.token,
        password: payload.password,
        password_confirmation: payload.passwordConfirmation,
      }),
    })
  },
  me() {
    return request<{ admin: { id: number; email: string; name: string; twoFactorEnabled: boolean } }>('/api/admin/me')
  },
  dashboard() {
    return request<DashboardData>('/api/admin/dashboard')
  },
  seoAudit() {
    return request<SeoAudit>('/api/admin/seo/audit')
  },
  adminProjects() {
    return request<{ projects: Project[] }>('/api/admin/projects')
  },
  cms() {
    return request<CmsData>('/api/admin/cms')
  },
  updateAdminUserPassword(id: number, password: string, passwordConfirmation: string) {
    return request<{ user: AdminUser }>(`/api/admin/profile-users/${id}/password`, {
      method: 'POST',
      body: JSON.stringify({ password, password_confirmation: passwordConfirmation }),
    })
  },
  updateAdminUser(id: number, user: { name: string; email: string }) {
    return request<{ user: AdminUser }>(`/api/admin/profile-users/${id}/save`, {
      method: 'POST',
      body: JSON.stringify(user),
    })
  },
  deleteAdminUser(id: number) {
    return request<void>(`/api/admin/profile-users/${id}/delete`, {
      method: 'POST',
    })
  },
  setupAdminUserTwoFactor(id: number) {
    return request<{ secret: string; otpauthUri: string; user: AdminUser }>(`/api/admin/users/${id}/two-factor/setup`, {
      method: 'POST',
    })
  },
  enableAdminUserTwoFactor(id: number, code: string) {
    return request<{ user: AdminUser }>(`/api/admin/users/${id}/two-factor`, {
      method: 'POST',
      body: JSON.stringify({ code }),
    })
  },
  disableAdminUserTwoFactor(id: number) {
    return request<{ user: AdminUser }>(`/api/admin/users/${id}/two-factor/disable`, {
      method: 'POST',
    })
  },
  createPage(page: Partial<CmsPage>) {
    return request<{ page: CmsPage }>('/api/admin/pages', {
      method: 'POST',
      body: JSON.stringify(page),
    })
  },
  updatePage(id: number, page: Partial<CmsPage>) {
    return request<{ page: CmsPage }>(`/api/admin/pages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(page),
    })
  },
  deletePage(id: number) {
    return request<void>(`/api/admin/pages/${id}`, { method: 'DELETE' })
  },
  adminPosts(params: { page?: number; perPage?: number; search?: string; status?: string; category?: string; sort?: string } = {}) {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') query.set(key, String(value))
    })
    const suffix = query.toString() ? `?${query.toString()}` : ''
    return request<PostListResponse>(`/api/admin/posts${suffix}`)
  },
  createPost(post: PostInput) {
    return request<{ post: CmsPost }>('/api/admin/posts', {
      method: 'POST',
      body: JSON.stringify(post),
    })
  },
  updatePost(id: number, post: PostInput) {
    return request<{ post: CmsPost }>(`/api/admin/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(post),
    })
  },
  deletePost(id: number) {
    return request<void>(`/api/admin/posts/${id}`, { method: 'DELETE' })
  },
  createReview(review: ReviewInput) {
    return request<{ review: Review }>('/api/admin/reviews', {
      method: 'POST',
      body: JSON.stringify(review),
    })
  },
  updateReview(id: number, review: ReviewInput) {
    return request<{ review: Review }>(`/api/admin/reviews/${id}`, {
      method: 'PUT',
      body: JSON.stringify(review),
    })
  },
  deleteReview(id: number) {
    return request<void>(`/api/admin/reviews/${id}`, { method: 'DELETE' })
  },
  googleReviewConnection() {
    return request<{ google: GoogleReviewConnection }>('/api/admin/reviews/google/connection')
  },
  importGoogleReviews(payload: Record<string, unknown>) {
    return request<{ result: { ok?: boolean; imported: number; updated: number; total: number; message: string }; google: GoogleReviewConnection; reviews: Review[] }>('/api/admin/reviews/google/import', {
      method: 'POST',
      body: JSON.stringify({ payload }),
    })
  },
  disconnectGoogleReviews() {
    return request<{ google: GoogleReviewConnection }>('/api/admin/reviews/google/disconnect', {
      method: 'POST',
    })
  },
  trustpilotReviewConnection() {
    return request<{ trustpilot: GoogleReviewConnection }>('/api/admin/reviews/trustpilot/connection')
  },
  importTrustpilotReviews(businessUrl: string, apiKey: string) {
    return request<{ result: { ok?: boolean; imported: number; updated: number; total: number; message: string }; trustpilot: GoogleReviewConnection; reviews: Review[] }>('/api/admin/reviews/trustpilot/import', {
      method: 'POST',
      body: JSON.stringify({ businessUrl, apiKey }),
    })
  },
  disconnectTrustpilotReviews() {
    return request<{ trustpilot: GoogleReviewConnection }>('/api/admin/reviews/trustpilot/disconnect', {
      method: 'POST',
    })
  },
  createBooking(booking: Partial<Booking>) {
    return request<{ booking: Booking }>('/api/admin/bookings', {
      method: 'POST',
      body: JSON.stringify(booking),
    })
  },
  updateBooking(id: number, booking: Partial<Booking>) {
    return request<{ booking: Booking }>(`/api/admin/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(booking),
    })
  },
  bookingOverview() {
    return request<BookingCmsOverview>('/api/admin/booking/dashboard/overview')
  },
  bookingCalendars() {
    return request<PaginatedResponse<BookingCalendar>>('/api/admin/booking/calendars?perPage=100')
  },
  createBookingCalendar(calendar: Partial<BookingCalendar>) {
    return request<{ calendar: BookingCalendar }>('/api/admin/booking/calendars', {
      method: 'POST',
      body: JSON.stringify(calendar),
    })
  },
  updateBookingCalendar(id: number, calendar: Partial<BookingCalendar>) {
    return request<{ calendar: BookingCalendar }>(`/api/admin/booking/calendars/${id}`, {
      method: 'PUT',
      body: JSON.stringify(calendar),
    })
  },
  deleteBookingCalendar(id: number) {
    return request<{ message: string }>(`/api/admin/booking/calendars/${id}`, { method: 'DELETE' })
  },
  bookingEventTypesAdmin(calendarId?: number) {
    return request<{ data: BookingEventType[] }>(`/api/admin/booking/event-types${calendarId ? `?calendarId=${calendarId}` : ''}`)
  },
  createBookingEventType(eventType: Partial<BookingEventType>) {
    return request<{ eventType: BookingEventType }>('/api/admin/booking/event-types', {
      method: 'POST',
      body: JSON.stringify(eventType),
    })
  },
  updateBookingEventType(id: number, eventType: Partial<BookingEventType>) {
    return request<{ eventType: BookingEventType }>(`/api/admin/booking/event-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(eventType),
    })
  },
  bookingCmsBookings(params: { page?: number; perPage?: number } = {}) {
    const query = new URLSearchParams()
    if (params.page) query.set('page', String(params.page))
    if (params.perPage) query.set('perPage', String(params.perPage))
    const suffix = query.toString() ? `?${query.toString()}` : ''
    return request<PaginatedResponse<BookingCmsBooking>>(`/api/admin/booking/bookings${suffix}`)
  },
  updateBookingCmsStatus(id: number, status: string, adminRemarks = '') {
    return request<{ booking: BookingCmsBooking }>(`/api/admin/booking/bookings/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, adminRemarks }),
    })
  },
  rescheduleBookingCmsBooking(id: number, startsAt: string, durationMinutes?: number) {
    return request<{ booking: BookingCmsBooking }>(`/api/admin/booking/bookings/${id}/reschedule`, {
      method: 'POST',
      body: JSON.stringify({ startsAt, durationMinutes }),
    })
  },
  cancelBookingCmsBooking(id: number, adminRemarks = '') {
    return request<{ booking: BookingCmsBooking }>(`/api/admin/booking/bookings/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ adminRemarks }),
    })
  },
  deleteBookingCmsBooking(id: number) {
    return request<{ deleted: number }>(`/api/admin/booking/bookings/${id}`, {
      method: 'DELETE',
    })
  },
  deleteBookingCmsBookings(ids: number[]) {
    return request<{ deleted: number }>('/api/admin/booking/bookings/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    })
  },
  bookingAvailabilityAdmin(calendarId?: number) {
    return request<{ rules: BookingAvailabilityRule[]; blackouts: Array<{ id: number; calendarId: number | null; title: string; startsAt: string; endsAt: string; reason: string; isRecurring: boolean }> }>(`/api/admin/booking/availability${calendarId ? `?calendarId=${calendarId}` : ''}`)
  },
  saveBookingAvailability(rule: Partial<BookingAvailabilityRule>) {
    return request<{ rule: BookingAvailabilityRule }>('/api/admin/booking/availability', {
      method: 'POST',
      body: JSON.stringify(rule),
    })
  },
  bookingSettings() {
    return request<{ settings: Record<string, string> }>('/api/admin/booking/settings')
  },
  updateBookingSettings(settings: Record<string, string>) {
    return request<{ settings: Record<string, string> }>('/api/admin/booking/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    })
  },
  googleOauthUrl() {
    return request<{ google: { configured: boolean; authUrl?: string; redirectUri?: string; message?: string } }>('/api/admin/booking/google/oauth-url')
  },
  googleCalendars() {
    return request<{ calendars: Array<{ id: string; summary: string; primary: boolean; accessRole: string; canCreateEvents: boolean; selected: boolean }>; message: string | null; needsReconnect: boolean }>('/api/admin/booking/google/calendars')
  },
  selectGoogleCalendar(calendarId: string) {
    return request<{ settings: Record<string, string>; calendars: Array<{ id: string; summary: string; primary: boolean; accessRole: string; canCreateEvents: boolean; selected: boolean }>; message: string | null; needsReconnect: boolean }>('/api/admin/booking/google/calendar', {
      method: 'PUT',
      body: JSON.stringify({ calendarId }),
    })
  },
  publicBookingEventTypes(calendarSlug?: string) {
    return request<{ eventTypes: BookingEventType[] }>(`/api/booking/event-types${calendarSlug ? `?calendar=${encodeURIComponent(calendarSlug)}` : ''}`)
  },
  publicBookingCalendars() {
    return request<{ calendars: BookingCalendar[] }>('/api/booking/calendars')
  },
  publicBookingCalendar(slug: string) {
    return request<{ calendar: BookingCalendar; eventTypes: BookingEventType[] }>(`/api/booking/calendars/${slug}`)
  },
  publicBookingAvailability(slug: string, from?: string, to?: string, timezone?: string) {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    if (timezone) params.set('timezone', timezone)
    const suffix = params.toString() ? `?${params.toString()}` : ''
    return request<{ eventType: BookingEventType; availability: BookingAvailabilityDay[] }>(`/api/booking/event-types/${slug}/availability${suffix}`)
  },
  createPublicBooking(booking: PublicBookingInput) {
    return request<{ booking: Booking }>('/api/booking/bookings', {
      method: 'POST',
      body: JSON.stringify(booking),
    })
  },
  updateSettings(settings: Record<string, string>) {
    publicSettingsPromise = null
    return request<{ settings: Record<string, string> }>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    })
  },
  mailSettings() {
    return request<{ settings: MailSettings }>('/api/admin/mail/settings')
  },
  updateMailSettings(settings: MailSettings & { clearPassword?: boolean }) {
    return request<{ settings: MailSettings }>('/api/admin/mail/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    })
  },
  testMail(email: string) {
    return request<{ message: string }>('/api/admin/mail/test', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  },
  siteEmailLogs(params: Record<string, string | number> = {}) {
    const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '').map(([key, value]) => [key, String(value)])).toString()
    return request<{ logs: SiteEmailLog[]; meta: InvoiceListMeta }>(`/api/admin/mail/logs${query ? `?${query}` : ''}`)
  },
  siteEmailLog(id: number) {
    return request<{ log: SiteEmailLog }>(`/api/admin/mail/logs/${id}`)
  },
  clearSiteEmailLogs() {
    return request<{ deleted: number }>('/api/admin/mail/logs/clear', { method: 'POST' })
  },
  runDeploymentMaintenance() {
    return request<{ message: string; results: DeploymentCommandResult[]; completedAt: string }>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ _systemAction: 'deployment-maintenance' }),
    })
  },
  async uploadMedia(file: File) {
    const token = getAdminToken()
    const formData = new FormData()
    formData.append('file', file)

    const multipartUpload = await fetch(apiUrl('/api/admin/media'), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    })

    if (multipartUpload.ok) {
      return parseJsonResponse<UploadMediaResponse>(multipartUpload, 'Upload failed.')
    }

    const multipartError = await parseErrorPayload(multipartUpload, 'Upload failed.')
    if (multipartUpload.status < 500 && !multipartError.message.includes('HTML page instead of JSON')) {
      throw new ApiError(multipartError.message, multipartUpload.status, multipartError.requiresTwoFactor)
    }

    const dataUrl = await fileToDataUrl(file)
    return request<UploadMediaResponse>('/api/admin/media/base64', {
      method: 'POST',
      body: JSON.stringify({
        filename: file.name || 'uploaded-file',
        mimeType: file.type || 'application/octet-stream',
        data: dataUrl,
      }),
    })
  },
  deleteMedia(id: number) {
    return request<void>(`/api/admin/media/${id}`, { method: 'DELETE' })
  },
  deleteMediaFile(media: Pick<MediaItem, 'id' | 'url' | 'filename'>) {
    if (media.id > 0) {
      return request<void>(`/api/admin/media/${media.id}`, { method: 'DELETE' })
    }

    return request<void>('/api/admin/media/delete', {
      method: 'POST',
      body: JSON.stringify({ url: media.url, filename: media.filename }),
    })
  },
  publicProjects() {
    return request<{ projects: Project[] }>('/api/projects')
  },
  publicSettings() {
    return publicSettings()
  },
  submitContact(payload: ContactMessageInput) {
    return request<{ message: string }>('/api/contact', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  publicPage(slug: string) {
    return request<{ page: CmsPage }>(`/api/pages/${encodeURIComponent(slug)}`)
  },
  publicReviews() {
    return request<{ reviews: Review[] }>('/api/reviews')
  },
  publicPricing(currency = 'NGN') {
    return request<{ categories: PricingCategory[]; currencies: string[] }>(`/api/pricing?currency=${encodeURIComponent(currency)}`)
  },
  checkoutPricingPlan(payload: { planId: number; currency: string; documentType?: 'quote' | 'invoice'; client?: Partial<InvoiceClient>; message?: string }) {
    return request<{ document: { id: number; number: string; type: string; status: string; currency: string; total: number; publicUrl: string } }>('/api/pricing/checkout', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  adminPricing() {
    return request<{ categories: PricingCategory[]; features: PricingFeature[] }>('/api/admin/pricing')
  },
  createPricingCategory(category: Partial<PricingCategory>) {
    return request<{ category: PricingCategory }>('/api/admin/pricing/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    })
  },
  updatePricingCategory(id: number, category: Partial<PricingCategory>) {
    return request<{ category: PricingCategory }>(`/api/admin/pricing/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(category),
    })
  },
  deletePricingCategory(id: number) {
    return request<void>(`/api/admin/pricing/categories/${id}`, { method: 'DELETE' })
  },
  createPricingFeature(feature: Partial<PricingFeature>) {
    return request<{ feature: PricingFeature }>('/api/admin/pricing/features', {
      method: 'POST',
      body: JSON.stringify(feature),
    })
  },
  updatePricingFeature(id: number, feature: Partial<PricingFeature>) {
    return request<{ feature: PricingFeature }>(`/api/admin/pricing/features/${id}`, {
      method: 'PUT',
      body: JSON.stringify(feature),
    })
  },
  deletePricingFeature(id: number) {
    return request<void>(`/api/admin/pricing/features/${id}`, { method: 'DELETE' })
  },
  createPricingPlan(plan: Partial<PricingPlan>) {
    return request<{ plan: PricingPlan }>('/api/admin/pricing/plans', {
      method: 'POST',
      body: JSON.stringify(plan),
    })
  },
  updatePricingPlan(id: number, plan: Partial<PricingPlan>) {
    return request<{ plan: PricingPlan }>(`/api/admin/pricing/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(plan),
    })
  },
  deletePricingPlan(id: number) {
    return request<void>(`/api/admin/pricing/plans/${id}`, { method: 'DELETE' })
  },
  createProject(project: ProjectInput) {
    return request<{ project: Project }>('/api/admin/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    })
  },
  updateProject(id: number, project: ProjectInput) {
    return request<{ project: Project }>(`/api/admin/projects/${id}/save`, {
      method: 'POST',
      body: JSON.stringify(project),
    })
  },
  updateProjectLegacy(id: number, project: ProjectInput) {
    return request<{ project: Project }>(`/api/admin/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(project),
    })
  },
  updateProjectMedia(id: number, field: 'image' | 'coverImage' | 'videoUrl', value: string) {
    return request<{ project: Project }>(`/api/admin/projects/${id}/media`, {
      method: 'POST',
      body: JSON.stringify({ field, value }),
    })
  },
  deleteProject(id: number) {
    return request<void>(`/api/admin/projects/${id}`, { method: 'DELETE' })
  },
  trackVisit(path: string, analytics: {
    eventType?: 'pageview' | 'heartbeat'
    visitorId?: string
    sessionId?: string
    sourceHint?: string
    referrer?: string
    language?: string
    screenWidth?: number
    screenHeight?: number
    durationSeconds?: number
  } = {}) {
    return fetch(apiUrl('/api/visits'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, referrer: document.referrer, ...analytics }),
      keepalive: analytics.eventType === 'heartbeat',
    }).catch(() => undefined)
  },
  visitorAnalytics(filters: { range?: 'week' | 'month' | 'year' | 'custom'; startDate?: string; endDate?: string } = {}) {
    const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value).map(([key, value]) => [key, String(value)])).toString()
    return request<{ analytics: VisitorAnalytics }>(`/api/admin/analytics${query ? `?${query}` : ''}`)
  },
  invoiceOverview() {
    return request<InvoiceOverview>('/api/admin/invoices/overview')
  },
  invoiceClients(params: Record<string, string | number> = {}) {
    const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '').map(([key, value]) => [key, String(value)])).toString()
    return request<{ clients: InvoiceClient[]; meta: InvoiceListMeta }>(`/api/admin/invoices/clients${query ? `?${query}` : ''}`)
  },
  invoiceDocuments(params: Record<string, string | number> = {}) {
    const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '').map(([key, value]) => [key, String(value)])).toString()
    return request<{ documents: InvoiceDocument[]; meta: InvoiceListMeta }>(`/api/admin/invoices/documents${query ? `?${query}` : ''}`)
  },
  invoiceEmailLogs(params: Record<string, string | number> = {}) {
    const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '').map(([key, value]) => [key, String(value)])).toString()
    return request<{ logs: InvoiceEmailLog[]; meta: InvoiceListMeta }>(`/api/admin/invoices/email-logs${query ? `?${query}` : ''}`)
  },
  invoiceEmailLog(id: number) {
    return request<{ log: InvoiceEmailLog }>(`/api/admin/invoices/email-logs/${id}`)
  },
  clearInvoiceEmailLogs(filters: { status?: string; type?: string; olderThanDays?: number } = {}) {
    return request<{ deleted: number }>('/api/admin/invoices/email-logs', {
      method: 'DELETE',
      body: JSON.stringify(filters),
    })
  },
  invoiceDocument(id: number) {
    return request<{ document: InvoiceDocument }>(`/api/admin/invoices/documents/${id}`)
  },
  createInvoiceDocument(document: Partial<InvoiceDocument>) {
    return request<{ document: InvoiceDocument }>('/api/admin/invoices/documents', {
      method: 'POST',
      body: JSON.stringify(document),
    })
  },
  updateInvoiceDocument(id: number, document: Partial<InvoiceDocument>) {
    return request<{ document: InvoiceDocument }>(`/api/admin/invoices/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(document),
    })
  },
  sendInvoiceDocument(id: number) {
    return request<{ document: InvoiceDocument }>(`/api/admin/invoices/documents/${id}/send`, { method: 'POST' })
  },
  recordInvoicePayment(id: number, payment: { amount: number; method: string; date: string; notes?: string }) {
    return request<{ document: InvoiceDocument }>(`/api/admin/invoices/documents/${id}/payments`, {
      method: 'POST',
      body: JSON.stringify(payment),
    })
  },
  sendInvoiceReceipt(id: number) {
    return request<{ document: InvoiceDocument }>(`/api/admin/invoices/documents/${id}/send-receipt`, { method: 'POST' })
  },
  publicInvoiceDocument(token: string) {
    return request<{ document: InvoiceDocument }>(`/api/invoices/${token}`)
  },
  trackInvoiceEvent(token: string, payload: { eventType: string; sessionId?: string; timeSpentSeconds?: number }) {
    return request<void>(`/api/invoices/${token}/events`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  decideQuote(token: string, decision: 'accepted' | 'rejected') {
    return request<{ document: InvoiceDocument }>(`/api/invoices/${token}/quote-decision`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
    })
  },
  generateInvoiceFromQuote(token: string) {
    return request<{ document: InvoiceDocument; quote: InvoiceDocument; alreadyGenerated: boolean }>(`/api/invoices/${token}/generate-invoice`, {
      method: 'POST',
    })
  },
  initializeInvoicePayment(id: number) {
    return request<{ payment: { reference: string; gateway: string; amount: number; currency: string; authorizationUrl: string } }>(`/api/admin/invoices/documents/${id}/payments/initialize`, { method: 'POST' })
  },
  initializePublicInvoicePayment(token: string, amount: number) {
    return request<{ payment: { reference: string; gateway: string; amount: number; currency: string; authorizationUrl: string } }>(`/api/invoices/${token}/payments/initialize`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    })
  },
  verifyPublicInvoicePayment(token: string, reference: string, transactionId?: string) {
    return request<{ processed: boolean; document: InvoiceDocument }>(`/api/invoices/${token}/payments/verify`, {
      method: 'POST',
      body: JSON.stringify({ reference, transactionId }),
    })
  },
  publicInvoiceReceipt(token: string, reference?: string) {
    const query = reference ? `?reference=${encodeURIComponent(reference)}` : ''
    return request<{ receipt: PublicReceiptData }>(`/api/invoices/${token}/receipt${query}`)
  },
  importFromJSON(data: unknown) {
    return request<{ imported: number; message: string; summary: { documents: number; payments: number; events: number; emails: number } }>('/api/admin/invoices/import/json', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },
  async exportInvoicesJSON() {
    const token = getAdminToken()
    const response = await fetch(apiUrl('/api/admin/invoices/export/json'), {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })

    if (!response.ok) {
      const errorPayload = await parseErrorPayload(response, 'Export failed.')
      throw new ApiError(errorPayload.message, response.status, errorPayload.requiresTwoFactor)
    }

    return response.blob()
  },
}
