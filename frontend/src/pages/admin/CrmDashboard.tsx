import { useEffect, useState } from 'react'
import { ArrowDownLeft, ArrowRight, BriefcaseBusiness, CheckSquare2, ChevronRight, Eye, FolderKanban, Mail, RefreshCw, Send, Users, Workflow } from 'lucide-react'
import { api } from '@/lib/api'
import { emailTime } from './CrmEmailOpenStatus'
import './crm-dashboard.css'

type Dashboard = Awaited<ReturnType<typeof api.crmMarketingDashboard>>
type Destination = 'contacts' | 'campaigns' | 'automations' | 'reports' | 'deals' | 'projects' | 'tasks' | 'activities'
const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const dateRange = (days: number) => { const start = new Date(); start.setDate(start.getDate() - days + 1); return { start: dayKey(start), end: dayKey(new Date()) } }
const initials = (name: string) => name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()

export function CrmDashboard({ onNavigate, onContact }: { onNavigate: (section: Destination) => void; onContact: (id: number) => void }) {
  const [range, setRange] = useState(() => dateRange(30))
  const [draft, setDraft] = useState(range)
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState(0)
  const [updated, setUpdated] = useState<Date | null>(null)
  useEffect(() => {
    let active = true, pending = false
    const load = async (quiet = false) => {
      if (pending) return
      pending = true
      if (!quiet) setLoading(true)
      try { const next = await api.crmMarketingDashboard(range.start, range.end); if (active) { setData(next); setError(''); setUpdated(new Date()) } }
      catch (cause) { if (active) setError((cause as Error).message) }
      finally { pending = false; if (active) setLoading(false) }
    }
    void load()
    const timer = window.setInterval(() => { if (!document.hidden) void load(true) }, 30000)
    return () => { active = false; window.clearInterval(timer) }
  }, [range.start, range.end, version])
  const number = (value: number | undefined) => data ? (value ?? 0).toLocaleString() : '\u2014'
  const engagement = data?.engagement
  const rate = engagement?.openRate ?? 0
  const growth = data?.growth ?? []
  const max = Math.max(4, ...growth.map(point => point.new))
  const line = growth.map((point, index) => `${index ? 'L' : 'M'} ${36 + index * 688 / Math.max(1, growth.length - 1)} ${160 - point.new * 132 / max}`).join(' ')
  const newContacts = growth.reduce((sum, point) => sum + point.new, 0)
  const invalidRange = !draft.start || !draft.end || draft.start > draft.end || (new Date(draft.end).getTime() - new Date(draft.start).getTime()) / 86400000 > 365
  const metrics = [
    { label: 'Total contacts', value: data?.totalContacts, detail: `${number(data?.activeContacts)} subscribed`, icon: Users, target: 'contacts' as const },
    { label: 'Emails sent', value: engagement?.sent, detail: 'In the selected period', icon: Send, target: 'activities' as const },
    { label: 'Emails opened', value: engagement?.opened, detail: `${number(engagement?.opens)} total open signals`, icon: Eye, target: 'activities' as const },
    { label: 'Open rate', value: null, detail: `${number(engagement?.tracked)} tracked emails sent`, icon: ArrowDownLeft, target: 'reports' as const },
  ]

  return <div className="crm-overview" aria-busy={loading}>
    <header className="co-heading"><div><span className="co-eyebrow">BAKHTECH / CUSTOMER RELATIONSHIPS</span><h1>Your business, at a glance.</h1><p>Stay close to your audience. Know what needs your attention.</p></div><button className="co-primary" onClick={() => onNavigate('campaigns')}><Send size={16}/>Create a campaign<ArrowRight size={16}/></button></header>
    <div className="co-toolbar"><div className="co-presets" aria-label="Dashboard period">{[7, 30, 90].map(days => <button key={days} aria-pressed={range.start === dateRange(days).start && range.end === dateRange(days).end} onClick={() => { const next = dateRange(days); setRange(next); setDraft(next) }}>Last {days} days</button>)}</div><form className="co-dates" onSubmit={event => { event.preventDefault(); if (!invalidRange) setRange(draft) }}><input aria-label="Start date" type="date" value={draft.start} max={draft.end} onChange={e => setDraft({ ...draft, start: e.target.value })}/><span>to</span><input aria-label="End date" type="date" value={draft.end} min={draft.start} onChange={e => setDraft({ ...draft, end: e.target.value })}/><button disabled={invalidRange || loading}>Apply</button></form><button className="co-refresh" aria-label="Refresh dashboard" disabled={loading} onClick={() => setVersion(v => v + 1)}><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/></button></div>
    {invalidRange && <p className="co-note">Choose a valid date range of up to one year.</p>}
    {error && <p role="alert" className="co-error">{error} {data && 'Showing the last successful update.'}<button onClick={() => setVersion(v => v + 1)}>Retry</button></p>}
    <div className={`co-metrics ${loading ? 'co-updating' : ''}`}>{metrics.map((metric, index) => <button key={metric.label} className={`co-metric co-metric-${index}`} onClick={() => onNavigate(metric.target)}><span className="co-metric-top">{metric.label}<metric.icon size={17}/></span><strong>{metric.value === null ? (engagement?.openRate == null ? '\u2014' : `${engagement.openRate}%`) : number(metric.value)}</strong><span className="co-metric-bottom">{metric.detail}<ChevronRight size={14}/></span></button>)}</div>
    <div className="co-main-grid">
      <section className="co-panel co-growth"><div className="co-panel-heading"><div><span className="co-eyebrow">AUDIENCE</span><h2>Make every connection count.</h2></div><button className="co-text-button" onClick={() => onNavigate('contacts')}>View contacts<ArrowRight size={14}/></button></div><div className="co-chart-summary"><strong>{data ? newContacts.toLocaleString() : '\u2014'}</strong><span>new contacts in this period</span><span className="co-chart-key"><i/>New contacts</span></div>
        {loading && !data ? <div className="co-empty">Loading your audience...</div> : <svg viewBox="0 0 760 200" role="img" aria-label={`Daily new contacts, ${range.start} to ${range.end}. ${newContacts} new contacts.`} className="co-chart"><defs><linearGradient id="co-growth-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0e9383" stopOpacity=".2"/><stop offset="100%" stopColor="#0e9383" stopOpacity="0"/></linearGradient></defs>{[0, 1, 2, 3, 4].map(i => <g key={i}><line x1="36" x2="724" y1={160 - i * 33} y2={160 - i * 33} stroke="currentColor" opacity=".1" strokeDasharray="3 5"/><text x="8" y={164 - i * 33} fontSize="10" fill="currentColor" opacity=".55">{Math.round(max * i / 4)}</text></g>)}{line && <><path d={`${line} L ${growth.length === 1 ? 36 : 724} 160 L 36 160 Z`} fill="url(#co-growth-fill)"/><path d={line} fill="none" stroke="#0e9383" strokeWidth="2.5" strokeLinejoin="round"/>{growth.map((point, i) => <circle key={point.date} cx={36 + i * 688 / Math.max(1, growth.length - 1)} cy={160 - point.new * 132 / max} r="3" fill="#0e9383"><title>{point.date}: {point.new} new contacts</title></circle>)}</>}{growth.filter((_, i) => i === 0 || i === growth.length - 1 || i % Math.max(1, Math.ceil(growth.length / 5)) === 0).map(point => <text key={point.date} x={36 + growth.indexOf(point) * 688 / Math.max(1, growth.length - 1)} y="190" textAnchor="middle" fontSize="10" fill="currentColor" opacity=".55">{new Date(`${point.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</text>)}</svg>}
        <div className="co-growth-footer"><span><span className="co-dot"/>Grow your audience with meaningful conversations.</span><button onClick={() => onNavigate('contacts')}>Manage contacts<ArrowRight size={14}/></button></div>
      </section>
      <section className="co-panel"><div className="co-panel-heading"><div><span className="co-eyebrow">EMAIL ENGAGEMENT</span><h2>Did your message land?</h2></div><Eye size={20} className="co-muted"/></div><div className="co-engagement"><div className="co-ring" style={{ background: `conic-gradient(#0e9383 ${rate}%, var(--co-line) 0)` }}><div><strong>{engagement?.openRate == null ? '\u2014' : `${rate}%`}</strong><span>open rate</span></div></div><div className="co-engagement-legend"><p><i className="co-dot"/>Opened<strong>{number(engagement?.opened)}</strong></p><p><i className="co-dot co-dot-muted"/>No open detected<strong>{number(engagement ? engagement.tracked - engagement.opened : undefined)}</strong></p><p>Not tracked<strong>{number(engagement ? engagement.sent - engagement.tracked : undefined)}</strong></p></div></div><p className="co-note">Unique opened emails / tracked emails sent in this period. Privacy features may preload images; blocked images may hide opens.</p></section>
      <section className="co-panel co-opens"><div className="co-panel-heading"><div><span className="co-eyebrow">RECENT OPEN ACTIVITY</span><h2>See who is engaging.</h2></div><span className="co-live"><span className="co-dot"/>Updates every 30s</span></div>{data?.recentOpens.length ? <div className="co-feed">{data.recentOpens.map(open => <button key={open.id} className="co-feed-row" onClick={() => onContact(open.contact_id)}><span className="co-avatar">{initials(open.name)}<Eye size={12}/></span><span className="co-feed-content"><strong>{open.name}<span> opened an email</span></strong><span>{open.campaign} &middot; {open.subject}</span><small>{open.email}</small></span><span className="co-feed-time"><time dateTime={open.last_opened_at}>{emailTime(open.last_opened_at)}</time><small>{open.open_count} {open.open_count === 1 ? 'open' : 'opens'}</small></span><ChevronRight size={15}/></button>)}</div> : <div className="co-empty"><span className="co-empty-icon"><Eye size={26}/></span><h3>{loading ? 'Loading email activity...' : 'Your next connection starts here.'}</h3><p>Opens from newly sent emails will appear here with the recipient and time.</p><button className="co-text-button" onClick={() => onNavigate('campaigns')}>Go to campaigns<ArrowRight size={14}/></button></div>}<footer className="co-panel-footer"><span>{updated ? `Updated ${updated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Waiting for data'}</span><button onClick={() => onNavigate('activities')}>All email activity<ArrowRight size={14}/></button></footer></section>
      <section className="co-panel co-tasks"><div className="co-panel-heading"><div><span className="co-eyebrow">YOUR NEXT MOVES</span><h2>Keep things moving.</h2></div><CheckSquare2 size={20} className="co-muted"/></div><div className="co-business">{[{ label: 'Open deals', value: data?.openDeals, icon: BriefcaseBusiness, target: 'deals' as const }, { label: 'Active projects', value: data?.activeProjects, icon: FolderKanban, target: 'projects' as const }, { label: 'Open tasks', value: data?.openTasks, icon: CheckSquare2, target: 'tasks' as const }].map(item => <button key={item.label} onClick={() => onNavigate(item.target)}><item.icon size={17}/><span>{item.label}</span><strong>{number(item.value)}</strong><ChevronRight size={14}/></button>)}</div><div className="co-task-heading"><h3>Upcoming & overdue</h3>{!!data?.overdueTasks && <span>{data.overdueTasks} overdue</span>}</div>{data?.upcomingTasks.length ? data.upcomingTasks.map(task => <button className="co-task" key={task.id} onClick={() => onNavigate('tasks')}><span className="co-task-check"/><span><strong>{task.title}</strong><small>Due {emailTime(task.due_at)}</small></span><ArrowRight size={14}/></button>) : <p className="co-note">No scheduled follow-ups. Add a task to keep your next conversation on track.</p>}</section>
    </div>
    <section className="co-panel co-campaigns"><div className="co-panel-heading"><div><span className="co-eyebrow">CAMPAIGNS</span><h2>Your latest conversations.</h2></div><button className="co-text-button" onClick={() => onNavigate('campaigns')}>All campaigns<ArrowRight size={14}/></button></div>{data?.recentCampaigns.length ? <div className="co-campaign-grid">{data.recentCampaigns.slice(0, 3).map(campaign => <button className="co-campaign" key={campaign.id} onClick={() => onNavigate('campaigns')}><span className="co-campaign-top"><Mail size={19}/><span className={`co-badge co-badge-${campaign.status}`}>{campaign.status}</span></span><strong>{campaign.name}</strong><p>{campaign.subject || 'Add a subject to get started'}</p><span className="co-campaign-bottom">View campaign<ArrowRight size={15}/></span></button>)}</div> : <div className="co-empty co-empty-compact"><Mail size={25}/><p>Your campaigns will appear here once you create one.</p><button className="co-text-button" onClick={() => onNavigate('campaigns')}>Create your first campaign<ArrowRight size={14}/></button></div>}</section>
    <div className="co-automation"><Workflow size={22}/><div><strong>A little automation. More time for your customers.</strong><p>{number(data?.activeAutomations)} active automations working behind the scenes.</p></div><button onClick={() => onNavigate('automations')}>Manage automations<ArrowRight size={15}/></button></div>
  </div>
}
