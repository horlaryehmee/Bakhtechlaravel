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
  status: string
  createdAt: string
  updatedAt: string
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
  durationMinutes: number
  locationType: string
  locationValue: string
  googleCalendarEventUrl: string
  googleCalendarSyncStatus: string
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
}

export type BookingAvailabilityDay = {
  date: string
  label: string
  slots: BookingSlot[]
}

export type PublicBookingInput = {
  eventTypeId: number
  startsAt: string
  name: string
  email: string
  phone: string
  service?: string
  message: string
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
  email: { confirmationEnabled: boolean; adminNotificationEnabled: boolean; reminderMinutesBefore: number; confirmationTemplate?: string; adminTemplate?: string; reminderTemplate?: string; cancellationTemplate?: string }
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

export type AdminUser = {
  id: number
  email: string
  name: string
  role: string
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

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function apiUrl(path: string) {
  return `${apiBaseUrl}${path}`
}

export function getAdminToken() {
  return localStorage.getItem(tokenKey)
}

export function setAdminToken(token: string) {
  localStorage.setItem(tokenKey, token)
}

export function clearAdminToken() {
  localStorage.removeItem(tokenKey)
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAdminToken()
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Request failed.' }))
    throw new ApiError(body.message || 'Request failed.', response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export const api = {
  login(email: string, password: string) {
    return request<{ token: string; admin: { id: number; email: string; name: string } }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },
  me() {
    return request<{ admin: { id: number; email: string; name: string } }>('/api/admin/me')
  },
  dashboard() {
    return request<DashboardData>('/api/admin/dashboard')
  },
  adminProjects() {
    return request<{ projects: Project[] }>('/api/admin/projects')
  },
  cms() {
    return request<CmsData>('/api/admin/cms')
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
  createPost(post: Partial<CmsPost>) {
    return request<{ post: CmsPost }>('/api/admin/posts', {
      method: 'POST',
      body: JSON.stringify(post),
    })
  },
  updatePost(id: number, post: Partial<CmsPost>) {
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
  bookingCmsBookings() {
    return request<PaginatedResponse<BookingCmsBooking>>('/api/admin/booking/bookings?perPage=100')
  },
  updateBookingCmsStatus(id: number, status: string, adminRemarks = '') {
    return request<{ booking: BookingCmsBooking }>(`/api/admin/booking/bookings/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, adminRemarks }),
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
    return request<{ calendars: Array<{ id: string; summary: string; primary: boolean; accessRole: string; selected: boolean }> }>('/api/admin/booking/google/calendars')
  },
  selectGoogleCalendar(calendarId: string) {
    return request<{ settings: Record<string, string>; calendars: Array<{ id: string; summary: string; primary: boolean; accessRole: string; selected: boolean }> }>('/api/admin/booking/google/calendar', {
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
  publicBookingAvailability(slug: string, from?: string, to?: string) {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
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
    return request<{ settings: Record<string, string> }>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    })
  },
  uploadMedia(file: File) {
    const token = getAdminToken()
    const formData = new FormData()
    formData.append('file', file)

    return fetch(apiUrl('/api/admin/media'), {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }).then(async (response) => {
      if (!response.ok) {
        const body = await response.json().catch(() => ({ message: 'Upload failed.' }))
        throw new ApiError(body.message || 'Upload failed.', response.status)
      }
      return response.json() as Promise<{ media: MediaItem }>
    })
  },
  deleteMedia(id: number) {
    return request<void>(`/api/admin/media/${id}`, { method: 'DELETE' })
  },
  publicProjects() {
    return request<{ projects: Project[] }>('/api/projects')
  },
  publicSettings() {
    return request<{ settings: Record<string, string> }>('/api/settings')
  },
  publicReviews() {
    return request<{ reviews: Review[] }>('/api/reviews')
  },
  createProject(project: ProjectInput) {
    return request<{ project: Project }>('/api/admin/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    })
  },
  updateProject(id: number, project: ProjectInput) {
    return request<{ project: Project }>(`/api/admin/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(project),
    })
  },
  deleteProject(id: number) {
    return request<void>(`/api/admin/projects/${id}`, { method: 'DELETE' })
  },
  trackVisit(path: string) {
    return fetch(apiUrl('/api/visits'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, referrer: document.referrer }),
    }).catch(() => undefined)
  },
}
