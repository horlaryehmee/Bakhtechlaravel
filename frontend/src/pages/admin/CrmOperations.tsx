import { useEffect, useState } from 'react'
import { ArrowDownToLine, ArrowRight, BriefcaseBusiness, Building2, CalendarDays, CheckSquare2, CircleCheck, FolderKanban, Plus, TrendingUp, Users } from 'lucide-react'
import { api, getAdminToken, type CrmDeal, type CrmProject, type CrmTask } from '@/lib/api'

type Section = 'deals' | 'projects' | 'tasks' | 'companies' | 'reports'
type Company = { id: number; name: string; website: string | null; phone: string | null; address: string | null; notes: string | null }
const stages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as const
const money = (value: unknown) => `NGN ${Number(value || 0).toLocaleString()}`
const field = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900'
const panel = 'rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white'
const initialDeal = { title: '', stage: 'new', estimated_value: '', contact_id: 0 }
const initialProject = { title: '', status: 'planned', contact_id: 0 }

export function CrmOperations({ tab, onContact }: { tab: Section; onContact: (id: number) => void }) {
  const [overview, setOverview] = useState<Record<string, unknown>>({})
  const [deals, setDeals] = useState<CrmDeal[]>([])
  const [projects, setProjects] = useState<CrmProject[]>([])
  const [tasks, setTasks] = useState<CrmTask[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [contacts, setContacts] = useState<Array<{ id: number; name: string }>>([])
  const [deal, setDeal] = useState<Partial<CrmDeal>>(initialDeal)
  const [project, setProject] = useState<Partial<CrmProject>>(initialProject)
  const [company, setCompany] = useState<Partial<Company>>({ name: '' })
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function reload() {
    try {
      const [summary, dealRows, projectRows, taskRows, companyRows, contactPage] = await Promise.all([
        api.crmOverview(), api.crmDeals(), api.crmProjects(), api.crmTasks(), api.crmCompanies(), api.crmContacts('', '', 1),
      ])
      setOverview(summary); setDeals(dealRows); setProjects(projectRows); setTasks(taskRows); setCompanies(companyRows)
      setContacts(contactPage.contacts.data.map(contact => ({ id: contact.id, name: contact.name })))
    } catch (cause) { setError((cause as Error).message) }
  }
  useEffect(() => { void Promise.all([api.crmOverview(), api.crmDeals(), api.crmProjects(), api.crmTasks(), api.crmCompanies(), api.crmContacts('', '', 1)]).then(([summary, dealRows, projectRows, taskRows, companyRows, contactPage]) => {
    setOverview(summary); setDeals(dealRows); setProjects(projectRows); setTasks(taskRows); setCompanies(companyRows)
    setContacts(contactPage.contacts.data.map(contact => ({ id: contact.id, name: contact.name })))
  }).catch(cause => setError((cause as Error).message)) }, [])

  async function saveDeal() { setBusy(true); setError(''); try { await api.crmSaveDeal(deal, deal.id); setDeal(initialDeal); setShowForm(false); await reload() } catch (cause) { setError((cause as Error).message) } finally { setBusy(false) } }
  async function saveProject() { setBusy(true); setError(''); try { await api.crmSaveProject(project, project.id); setProject(initialProject); setShowForm(false); await reload() } catch (cause) { setError((cause as Error).message) } finally { setBusy(false) } }
  async function saveCompany() { setBusy(true); setError(''); try { await api.crmSaveCompany({ name: company.name || '', website: company.website || '', phone: company.phone || '', address: company.address || '', notes: company.notes || '' }, company.id); setCompany({ name: '' }); setShowForm(false); await reload() } catch (cause) { setError((cause as Error).message) } finally { setBusy(false) } }
  async function completeTask(id: number, completed: boolean) { try { await api.crmCompleteTask(id, completed); await reload() } catch (cause) { setError((cause as Error).message) } }
  async function exportContacts() {
    try {
      const response = await fetch('/api/admin/crm/export', { headers: { Authorization: `Bearer ${getAdminToken()}` } })
      if (!response.ok) throw new Error('Unable to export contacts.')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'crm-contacts.csv'; anchor.click()
      URL.revokeObjectURL(url)
    } catch (cause) { setError((cause as Error).message) }
  }
  const contactSelect = (id: number, change: (id: number) => void) => <select aria-label="Contact" className={field} value={id || ''} onChange={event => change(Number(event.target.value))}><option value="">Select contact</option>{contacts.map(contact => <option key={contact.id} value={contact.id}>{contact.name}</option>)}</select>
  const page = {
    deals: { title: 'Deals pipeline', description: 'Track every opportunity from first conversation to close.', icon: BriefcaseBusiness, count: deals.length, action: 'Add deal' },
    projects: { title: 'Projects', description: 'Keep client work, milestones and delivery dates in view.', icon: FolderKanban, count: projects.length, action: 'Add project' },
    tasks: { title: 'Follow-up tasks', description: 'Keep every next step moving across your contacts.', icon: CheckSquare2, count: tasks.length, action: '' },
    companies: { title: 'Companies', description: 'Organize the businesses behind your relationships.', icon: Building2, count: companies.length, action: 'Add company' },
    reports: { title: 'CRM reports', description: 'A clear picture of leads, revenue and delivery.', icon: TrendingUp, count: 0, action: '' },
  }[tab]

  return <div className="space-y-5">
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{error}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600"><page.icon size={21} /></span><div><h1 className="text-xl font-bold tracking-tight">{page.title}{tab !== 'reports' && <span className="ml-2 text-sm font-medium text-slate-400">{page.count}</span>}</h1><p className="mt-0.5 text-xs text-slate-500">{page.description}</p></div></div>{page.action && <button className="crm-primary-button" onClick={() => { if (tab === 'deals') setDeal(initialDeal); if (tab === 'projects') setProject(initialProject); if (tab === 'companies') setCompany({ name: '' }); setShowForm(true) }}><Plus size={15} />{page.action}</button>}</div>

    {tab === 'deals' && <>
      {showForm && <section className={panel}><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">{deal.id ? 'Edit deal' : 'New deal'}</h2><button className="text-xs text-slate-500" onClick={() => setShowForm(false)}>Close</button></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{contactSelect(deal.contact_id || 0, id => setDeal({ ...deal, contact_id: id }))}<input className={field} placeholder="Opportunity title" value={deal.title || ''} onChange={event => setDeal({ ...deal, title: event.target.value })} /><select aria-label="Deal stage" className={field} value={deal.stage || 'new'} onChange={event => setDeal({ ...deal, stage: event.target.value })}>{stages.map(stage => <option key={stage} value={stage}>{stage}</option>)}</select><input className={field} type="number" min="0" placeholder="Estimated value (NGN)" value={deal.estimated_value || ''} onChange={event => setDeal({ ...deal, estimated_value: event.target.value })} /><input className={field} type="number" min="0" placeholder="Agreed value (NGN)" value={deal.agreed_value || ''} onChange={event => setDeal({ ...deal, agreed_value: event.target.value })} /><input className={field} type="date" aria-label="Expected close date" value={deal.expected_close_at || ''} onChange={event => setDeal({ ...deal, expected_close_at: event.target.value })} /><input className={field} placeholder="Lost reason" value={deal.lost_reason || ''} onChange={event => setDeal({ ...deal, lost_reason: event.target.value })} /></div><button disabled={busy || !deal.contact_id || !deal.title} className="crm-primary-button mt-4 disabled:opacity-50" onClick={() => void saveDeal()}>Save deal</button></section>}
      <div className="flex gap-4 overflow-x-auto pb-4">{stages.map(stage => { const items = deals.filter(item => item.stage === stage); return <section key={stage} className="min-w-[250px] flex-1 rounded-xl border bg-white p-3 dark:bg-slate-900"><div className="mb-3 flex items-center justify-between gap-2 px-1"><h2 className="text-sm font-semibold capitalize">{stage}</h2><span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-600">{items.length}</span></div><div className="space-y-2">{items.map(item => <article key={item.id} className="rounded-xl border bg-slate-50 p-3 dark:bg-slate-800"><button className="block text-left text-sm font-semibold text-indigo-700" onClick={() => onContact(item.contact_id)}>{item.title}</button><p className="mt-2 text-xs text-slate-500">{item.contact_name}</p><div className="mt-3 flex items-center justify-between gap-2"><strong className="text-xs">{money(item.estimated_value)}</strong><button className="text-xs font-semibold text-indigo-600" onClick={() => { setDeal(item); setShowForm(true) }}>Edit</button></div></article>)}{!items.length && <p className="rounded-lg border border-dashed p-5 text-center text-xs text-slate-400">No deals</p>}</div></section> })}</div>
    </>}

    {tab === 'projects' && <>
      {showForm && <section className={panel}><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">{project.id ? 'Edit project' : 'New project'}</h2><button className="text-xs text-slate-500" onClick={() => setShowForm(false)}>Close</button></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{contactSelect(project.contact_id || 0, id => setProject({ ...project, contact_id: id }))}<input className={field} placeholder="Project title" value={project.title || ''} onChange={event => setProject({ ...project, title: event.target.value })} /><select aria-label="Project status" className={field} value={project.status || 'planned'} onChange={event => setProject({ ...project, status: event.target.value })}>{['planned', 'active', 'on_hold', 'completed', 'cancelled'].map(status => <option key={status} value={status}>{status}</option>)}</select><input type="date" aria-label="Start date" className={field} value={project.start_at || ''} onChange={event => setProject({ ...project, start_at: event.target.value })} /><input type="date" aria-label="Due date" className={field} value={project.due_at || ''} onChange={event => setProject({ ...project, due_at: event.target.value })} /><select aria-label="Linked deal" className={field} value={project.deal_id || ''} onChange={event => setProject({ ...project, deal_id: Number(event.target.value) || null })}><option value="">No linked deal</option>{deals.filter(item => item.contact_id === project.contact_id).map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div><button disabled={busy || !project.contact_id || !project.title} className="crm-primary-button mt-4 disabled:opacity-50" onClick={() => void saveProject()}>Save project</button></section>}
      <section className="overflow-x-auto rounded-xl border bg-white dark:bg-slate-900"><table className="w-full min-w-[640px] text-left text-sm"><thead><tr><th className="px-5 py-4">Project</th><th className="px-5 py-4">Contact</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Due date</th><th className="px-5 py-4">Action</th></tr></thead><tbody>{projects.map(item => <tr key={item.id} className="border-t"><td className="px-5 py-4 font-semibold">{item.title}</td><td className="px-5 py-4"><button className="text-indigo-600" onClick={() => onContact(item.contact_id)}>{item.contact_name}</button></td><td className="px-5 py-4"><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs capitalize text-indigo-700">{item.status.replace('_', ' ')}</span></td><td className="px-5 py-4 text-slate-500">{item.due_at || 'Not set'}</td><td className="px-5 py-4"><button className="font-medium text-indigo-600" onClick={() => { setProject(item); setShowForm(true) }}>Edit <ArrowRight size={12} className="inline" /></button></td></tr>)}{!projects.length && <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-500">No projects yet. Add one to begin tracking delivery.</td></tr>}</tbody></table></section>
    </>}

    {tab === 'tasks' && <section className="overflow-x-auto rounded-xl border bg-white dark:bg-slate-900"><div className="border-b p-5 text-xs text-slate-500">Add follow-up tasks from a contact profile. Mark them complete here.</div><table className="w-full min-w-[620px] text-left text-sm"><thead><tr><th className="px-5 py-4">Done</th><th className="px-5 py-4">Task</th><th className="px-5 py-4">Contact</th><th className="px-5 py-4">Priority</th><th className="px-5 py-4">Due</th></tr></thead><tbody>{tasks.map(item => <tr key={item.id} className="border-t"><td className="px-5 py-4"><input aria-label={`Complete ${item.title}`} type="checkbox" checked={!!item.completed} onChange={event => void completeTask(item.id, event.target.checked)} /></td><td className={`px-5 py-4 font-medium ${item.completed ? 'text-slate-400 line-through' : ''}`}>{item.title}</td><td className="px-5 py-4"><button className="text-indigo-600" onClick={() => onContact(item.contact_id)}>{item.contact_name}</button></td><td className="px-5 py-4 capitalize">{item.priority}</td><td className="px-5 py-4"><span className="inline-flex items-center gap-1 text-slate-500"><CalendarDays size={13} />{item.due_at || 'No due date'}</span></td></tr>)}{!tasks.length && <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-500">No follow-up tasks yet.</td></tr>}</tbody></table></section>}

    {tab === 'companies' && <>
      {showForm && <section className={panel}><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">{company.id ? 'Edit company' : 'New company'}</h2><button className="text-xs text-slate-500" onClick={() => setShowForm(false)}>Close</button></div><div className="grid gap-3 sm:grid-cols-2"><input className={field} placeholder="Company name" value={company.name || ''} onChange={event => setCompany({ ...company, name: event.target.value })} /><input className={field} placeholder="Website URL" value={company.website || ''} onChange={event => setCompany({ ...company, website: event.target.value })} /><input className={field} placeholder="Phone" value={company.phone || ''} onChange={event => setCompany({ ...company, phone: event.target.value })} /><input className={field} placeholder="Address" value={company.address || ''} onChange={event => setCompany({ ...company, address: event.target.value })} /></div><button disabled={busy || !company.name} className="crm-primary-button mt-4 disabled:opacity-50" onClick={() => void saveCompany()}>Save company</button></section>}
      <section className="overflow-x-auto rounded-xl border bg-white dark:bg-slate-900"><table className="w-full min-w-[600px] text-left text-sm"><thead><tr><th className="px-5 py-4">Company</th><th className="px-5 py-4">Website</th><th className="px-5 py-4">Phone</th><th className="px-5 py-4">Action</th></tr></thead><tbody>{companies.map(item => <tr key={item.id} className="border-t"><td className="px-5 py-4 font-semibold">{item.name}</td><td className="px-5 py-4">{item.website || '—'}</td><td className="px-5 py-4">{item.phone || '—'}</td><td className="px-5 py-4"><button className="font-medium text-indigo-600" onClick={() => { setCompany(item); setShowForm(true) }}>Edit <ArrowRight size={12} className="inline" /></button></td></tr>)}{!companies.length && <tr><td colSpan={4} className="px-5 py-12 text-center text-slate-500">No companies yet.</td></tr>}</tbody></table></section>
    </>}

    {tab === 'reports' && <>
      <div className="flex justify-end"><button className="crm-primary-button" onClick={() => void exportContacts()}><ArrowDownToLine size={15} />Export contacts CSV</button></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
        { label: 'Contacts', value: overview.contacts, icon: Users }, { label: 'Active projects', value: overview.activeProjects, icon: FolderKanban }, { label: 'Deals won', value: overview.dealsWon, icon: CircleCheck }, { label: 'Conversion rate', value: `${overview.conversionRate ?? 0}%`, icon: TrendingUp },
        { label: 'Pipeline value', value: money(overview.pipelineValue), icon: BriefcaseBusiness }, { label: 'Won deal value', value: money(overview.wonValue), icon: CircleCheck }, { label: 'Pending payments', value: money(overview.pendingPayments), icon: CalendarDays }, { label: 'Revenue received', value: money(overview.revenue), icon: TrendingUp },
      ].map(metric => <article key={metric.label} className={`${panel} crm-metric-card`}><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><metric.icon size={17} /></span><p className="mt-4 text-xs text-slate-500">{metric.label}</p><strong className="mt-1 block text-xl">{String(metric.value ?? 0)}</strong></article>)}</div>
      <div className="grid gap-4 md:grid-cols-2"><section className={panel}><h2 className="mb-4 font-semibold">Lead sources</h2>{((overview.sources || []) as Array<{ source: string; total: number }>).map(source => <p key={source.source} className="flex justify-between border-b py-2.5 text-sm"><span>{source.source}</span><strong>{source.total}</strong></p>)}</section><section className={panel}><h2 className="mb-4 font-semibold">Monthly won deals</h2>{((overview.monthly || []) as Array<{ month: string; deals: number; value: string }>).map(month => <p key={month.month} className="flex justify-between border-b py-2.5 text-sm"><span>{month.month} · {month.deals} deals</span><strong>{money(month.value)}</strong></p>)}</section></div>
    </>}
  </div>
}
