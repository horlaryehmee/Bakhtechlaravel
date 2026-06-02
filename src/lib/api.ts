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
  content: string
  seoTitle: string
  seoDescription: string
  status: string
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
  name: string
  email: string
  phone: string
  service: string
  message: string
  status: string
  scheduledAt: string
  createdAt: string
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
  users: AdminUser[]
  settings: Record<string, string>
  media: MediaItem[]
}

const tokenKey = 'bakhtech_admin_token'
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

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
    throw new Error(body.message || 'Request failed.')
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
  dashboard() {
    return request<DashboardData>('/api/admin/dashboard')
  },
  adminProjects() {
    return request<{ projects: Project[] }>('/api/admin/projects')
  },
  cms() {
    return request<CmsData>('/api/admin/cms')
  },
  updatePage(id: number, page: Partial<CmsPage>) {
    return request<{ page: CmsPage }>(`/api/admin/pages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(page),
    })
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
        throw new Error(body.message || 'Upload failed.')
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
