import type { CrmEmailTracking } from '@/lib/api'

export const emailTime = (value: string | null) => value ? new Date(/(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : value.replace(' ', 'T') + 'Z').toLocaleString() : '—'

export function CrmEmailOpenStatus({ delivery }: { delivery: CrmEmailTracking & { status: string } }) {
  if (delivery.status !== 'sent') return <span className="text-xs text-slate-500">—</span>
  if (!delivery.tracked_at) return <span className="text-xs text-slate-500">Not tracked</span>
  if (!delivery.opened_at) return <span className="text-xs text-slate-500">No open detected</span>
  return <div className="text-xs"><strong className="text-emerald-600 dark:text-emerald-400">Opened · {delivery.open_count} {delivery.open_count === 1 ? 'time' : 'times'}</strong><small className="block text-slate-500">First: {emailTime(delivery.opened_at)}</small><small className="block text-slate-500">Last: {emailTime(delivery.last_opened_at)}</small></div>
}
