import { getAdminToken } from './api'

export type Option = { label: string; price: number; complexity: number }
export type Question = { id: number; project_type_id: number; label: string; options: Option[] }
export type Feature = { id: number; project_type_id: number; name: string; description: string; price: number; complexity: number; optional: boolean; custom_quote: boolean; enabled: boolean }
export type ProjectType = { id: number; slug: string; name: string; description: string; base_min: number; base_max: number; enabled: boolean; discovery_key: string | null; discovery_label: string | null; questions: Question[]; features: Feature[] }
export type PricingRule = { id: number; level: string; minimum_score: number; uplift_percent: number; range_percent: number; custom_quote: boolean }
export type Catalog = { types: ProjectType[]; rules: PricingRule[] }
export type Configuration = { project_type: string; discovery: string; answers: Record<string, string>; features: number[] }
export type Estimate = { recommended_type: string; recommendation: string; custom_quote: boolean; estimated_min: number | null; estimated_max: number | null; answers: { question_label: string; answer: string; price: number }[]; features: { name: string; price: number }[]; calculation: Record<string, string | number | null> }
export type SavedQuote = Estimate & { id: number; reference: string; name: string; company: string; email: string; phone: string; description: string | null; created_at: string; selected_type: string; complexity: string }
export const money = (n: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n)
export const investment = (estimate: Pick<Estimate, 'estimated_min' | 'estimated_max'>) => estimate.estimated_min === null ? 'Custom Quote Required' : `${money(estimate.estimated_min)} – ${money(estimate.estimated_max!)}`
export async function quoteApi<T>(path: string, body?: unknown, admin = false, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')}/api/${admin ? 'admin/' : ''}quote-builder/${path}`, {
    method: body === undefined ? 'GET' : 'POST', signal,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(admin ? { Authorization: `Bearer ${getAdminToken() || ''}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.errors ? Object.values(data.errors).flat().join(' ') : data.message || 'Unable to connect. Please try again.')
  return data as T
}
