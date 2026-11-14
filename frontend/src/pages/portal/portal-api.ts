import { getAdminToken } from '@/lib/api'

export type Project = { id: number; title: string; reference: string; category: string; description: string; status: string; currency: string; client_id: number; start_date: string; due_date: string; product_limit: number; image_limit: number; upload_limit_mb: number; progress: number; client: { name: string; email: string; company: string } }
export type Activity = { id: number; actor: string; event: string; details: string; created_at: string }
export type Client = { id: number; name: string; email: string; company: string; portal_active: boolean; portal_password_set: boolean; crm_contact_id: number | null; invitation_status?: string; invitation_error?: string }
export type Product = { id: number; name: string; sku: string; description: string; short_description: string; price: string; sale_price: string; stock: number; category: string; status: string; revision_note: string; published_url: string }
export type Requirement = { id: number; title: string; instructions: string; field_type: string; required: boolean; options: string; value: string; submission_status: string; revision_note: string; due_date: string }
export type Milestone = { id: number; title: string; description: string; status: string; due_date: string }
export type ProjectFile = { id: number; name: string; size: number; mime: string; product_id: number | null; created_at: string }
export type Overview = { user: { name: string; email: string; company?: string; portal_password_set?: boolean; google_subject?: string | null }; is_admin: boolean; can_create: boolean; projects: Project[]; stats: { active: number; awaiting: number; products: number; review: number }; activity: Activity[]; notifications: { id: number; message: string; read_at: string | null; created_at: string; project_id: number }[] }
export type Detail = { project: Project; can_manage: boolean; can_review: boolean; milestones: Milestone[]; requirements: Requirement[]; files: ProjectFile[]; activity: Activity[]; product_counts: Record<string, number>; members: { id: number; name: string; admin_id: number }[] }
export const label = (value: string) => value?.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) || '—'
export const date = (value?: string) => value ? new Date(value.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set'
export const token = (admin: boolean) => admin ? getAdminToken() : sessionStorage.getItem('bakhtech-portal-token')
export const endpoint = (admin: boolean, path: string) => `/api/${admin ? 'client-admin' : 'portal'}/${path}`
export async function portalApi<T>(admin: boolean, path: string, body?: unknown, method?: string): Promise<T> {
  const response = await fetch(endpoint(admin, path), { method: method || (body ? 'POST' : 'GET'), headers: { Accept: 'application/json', ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(token(admin) ? { Authorization: `Bearer ${token(admin)}` } : {}) }, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'The server could not complete this request.' }))
    if (response.status === 401) { if (!admin) sessionStorage.removeItem('bakhtech-portal-token'); window.location.assign(admin ? '/admin/login' : '/portal') }
    throw new Error(error.errors ? Object.values(error.errors).flat().join(' ') : error.message)
  }
  return response.status === 204 ? undefined as T : response.json()
}
