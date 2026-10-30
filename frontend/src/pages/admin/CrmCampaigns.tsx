import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowRight, Blocks, Check, CheckCircle2, ChevronLeft, ChevronRight, CircleAlert, CodeXml, Copy, FileText, Mail, PanelsTopLeft, Plus, RefreshCw, Search, Send, Trash2, Users } from 'lucide-react'
import { api, type CrmCampaign } from '@/lib/api'
import { CampaignWorkspace, CampaignDialog, CampaignEmpty, CampaignStatus, campaignDate } from './CrmCampaignWorkspace'
import './crm-campaigns.css'

const editorOptions = [
  { id: 'default', title: 'Content blocks', text: 'Build an email with text, images, and buttons.', icon: Blocks },
  { id: 'visual', title: 'Visual builder', text: 'Arrange sections and customize their appearance.', icon: PanelsTopLeft },
  { id: 'html', title: 'Custom HTML', text: 'Bring your own email markup and design.', icon: CodeXml },
]

export function CrmCampaigns({ onOpenSettings }: { onOpenSettings?: () => void } = {}) {
  const [rows, setRows] = useState<CrmCampaign[]>([])
  const [segments, setSegments] = useState<Awaited<ReturnType<typeof api.crmSegments>>>([])
  const [active, setActive] = useState<CrmCampaign | null>(null)
  const [selected, setSelected] = useState<number[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [segment, setSegment] = useState('all')
  const [sort, setSort] = useState('updated')
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [editorType, setEditorType] = useState('default')
  const [deleteIds, setDeleteIds] = useState<number[]>([])

  async function reload() {
    setLoading(true); setError('')
    try {
      const [campaigns, groups] = await Promise.all([api.crmCampaigns(), api.crmSegments()])
      setRows(campaigns); setSegments(groups)
      setSelected(current => current.filter(id => campaigns.some(row => row.id === id)))
    } catch (cause) { setError((cause as Error).message) }
    finally { setLoading(false) }
  }
  useEffect(() => { void reload() }, [])
  const filtered = useMemo(() => rows.filter(row =>
    (status === 'all' || row.status === status) &&
    (segment === 'all' || (segment === 'everyone' ? row.segment_id === null : row.segment_id === Number(segment))) &&
    `${row.name} ${row.subject}`.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'recipients' ? Number(b.recipients || 0) - Number(a.recipients || 0) : String(sort === 'created' ? b.created_at : b.updated_at).localeCompare(String(sort === 'created' ? a.created_at : a.updated_at))), [rows, search, status, segment, sort])
  const pages = Math.max(1, Math.ceil(filtered.length / size)), currentPage = Math.min(page, pages)
  const visible = filtered.slice((currentPage - 1) * size, currentPage * size)

  async function create(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const row = await api.crmSaveCampaign({ name: newName.trim(), subject: '', body: '', segment_id: null, editor_type: editorType })
      setCreating(false); setActive(row); setNewName(''); await reload()
    } catch (cause) { setError((cause as Error).message) } finally { setBusy(false) }
  }
  async function duplicate(row: CrmCampaign) {
    setBusy(true); setError('')
    try { const copy = await api.crmDuplicateCampaign(row.id); await reload(); setNotice(`Created “${copy.name}” as a draft.`) }
    catch (cause) { setError((cause as Error).message) } finally { setBusy(false) }
  }
  async function remove() {
    setBusy(true); setError('')
    try {
      for (const id of deleteIds) await api.crmDeleteCampaign(id)
      setNotice(`${deleteIds.length} campaign${deleteIds.length === 1 ? '' : 's'} deleted.`)
      setSelected([]); setDeleteIds([]); await reload()
    } catch (cause) { await reload(); setError((cause as Error).message) } finally { setBusy(false) }
  }
  const startNew = () => { setNewName(''); setEditorType('default'); setError(''); setCreating(true) }
  if (active) return <CampaignWorkspace key={active.id} initial={active} segments={segments} onBack={() => { setActive(null); void reload() }} onChanged={campaign => setRows(current => current.map(row => row.id === campaign.id ? { ...row, ...campaign } : row))} onOpenSettings={onOpenSettings}/>

  return <div className="cc-page">
    <div className="cc-page-heading"><div><span className="cc-eyebrow">EMAIL MARKETING</span><h1>Campaigns</h1><p>Create thoughtful emails. Reach the right people. Follow every delivery.</p></div><div className="cc-actions"><button className="cc-button" disabled={loading || busy} onClick={() => void reload()}><RefreshCw size={14}/>Refresh</button><button className="cc-button cc-button--primary" onClick={startNew}><Plus size={16}/>Create campaign</button></div></div>
    {error && !creating && !deleteIds.length && <p role="alert" className="cc-feedback cc-feedback--error">{error}</p>}
    {notice && <p role="status" className="cc-feedback"><CheckCircle2 size={15}/>{notice}</p>}
    <div className="cc-metrics">{[
      { label: 'Total campaigns', value: rows.length, icon: <Mail size={18}/>, caption: 'Across all audiences' },
      { label: 'Drafts', value: rows.filter(row => row.status === 'draft').length, icon: <FileText size={18}/>, caption: 'Your work in progress' },
      { label: 'Emails sent', value: rows.reduce((sum, row) => sum + Number(row.sent_count || 0), 0), icon: <Send size={18}/>, caption: 'Accepted by the mail service' },
      { label: 'Failed deliveries', value: rows.reduce((sum, row) => sum + Number(row.failed_count || 0), 0), icon: <CircleAlert size={18}/>, caption: 'Review in delivery reports' },
    ].map(item => <div className="cc-metric" key={item.label}><span>{item.icon}</span><div><small>{item.label}</small><strong>{loading ? '—' : item.value.toLocaleString()}</strong><p>{item.caption}</p></div></div>)}</div>
    <section className="cc-panel cc-library">
      <div className="cc-library-heading"><nav aria-label="Filter campaigns by status">{[{ id: 'all', title: 'All campaigns' }, { id: 'draft', title: 'Drafts' }, { id: 'sending', title: 'In progress' }, { id: 'sent', title: 'Sent' }].map(item => <button key={item.id} aria-pressed={status === item.id} onClick={() => { setStatus(item.id); setPage(1) }}>{item.title}<span>{item.id === 'all' ? rows.length : rows.filter(row => row.status === item.id).length}</span></button>)}</nav></div>
      <div className="cc-toolbar"><label className="cc-search"><Search size={16}/><input aria-label="Search campaigns" placeholder="Search campaign name or subject…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}/></label><select aria-label="Filter campaign audience" value={segment} onChange={e => { setSegment(e.target.value); setPage(1) }}><option value="all">All audiences</option><option value="everyone">All subscribers</option>{segments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select aria-label="Sort campaigns" value={sort} onChange={e => { setSort(e.target.value); setPage(1) }}><option value="updated">Recently updated</option><option value="created">Newest created</option><option value="name">Name A–Z</option><option value="recipients">Most recipients</option></select></div>
      {selected.length > 0 && <div className="cc-selection"><span>{selected.length} selected</span><button className="cc-text-button" onClick={() => setSelected([])}>Clear selection</button><button className="cc-text-button cc-danger" disabled={busy || selected.some(id => rows.find(row => row.id === id)?.status === 'sending')} onClick={() => { setError(''); setDeleteIds(selected) }}><Trash2 size={13}/>Delete selected</button></div>}
      <div className="cc-table-wrap"><table><thead><tr><th className="cc-checkbox"><input aria-label="Select visible campaigns" type="checkbox" checked={visible.length > 0 && visible.every(row => selected.includes(row.id))} onChange={e => setSelected(e.target.checked ? [...new Set([...selected, ...visible.map(row => row.id)])] : selected.filter(id => !visible.some(row => row.id === id)))}/></th><th>Campaign</th><th>Audience</th><th>Status</th><th>Delivery</th><th>Updated</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{!loading && visible.map(row => <tr key={row.id}>
        <td className="cc-checkbox"><input aria-label={`Select ${row.name}`} type="checkbox" checked={selected.includes(row.id)} onChange={e => setSelected(e.target.checked ? [...selected, row.id] : selected.filter(id => id !== row.id))}/></td>
        <td><button className="cc-campaign-title" onClick={() => setActive(row)}><span className={`cc-mail-icon ${row.status === 'sent' ? 'is-sent' : ''}`}>{row.status === 'sent' ? <Send size={17}/> : <Mail size={17}/>}</span><span><strong>{row.name}</strong><small>{row.subject || 'Subject not added yet'}</small></span></button></td>
        <td><span className="cc-audience-label"><Users size={13}/>{row.segment_name || 'All subscribers'}</span></td><td><CampaignStatus value={row.status}/></td>
        <td>{row.recipients ? <div className="cc-delivery-cell"><span><strong>{Number(row.sent_count || 0).toLocaleString()}</strong> / {Number(row.recipients).toLocaleString()} sent</span><div><i style={{ width: `${Number(row.sent_count || 0) / row.recipients * 100}%` }}/></div><small>{row.tracked_count ? `${row.opened_count || 0} opened / ${Math.round(Number(row.opened_count || 0) / row.tracked_count * 100)}% open rate` : "Open tracking unavailable for previous sends"}</small>{!!row.failed_count && <small className="cc-danger">{row.failed_count} failed</small>}</div> : <span className="cc-muted">Audience not prepared</span>}</td>
        <td><span className="cc-date">{campaignDate(row.updated_at)}</span></td><td><div className="cc-row-actions"><button className="cc-icon" title="Duplicate campaign" aria-label={`Duplicate ${row.name}`} disabled={busy} onClick={() => void duplicate(row)}><Copy size={14}/></button><button className="cc-icon cc-danger" title={row.status === 'sending' ? 'In-progress campaigns cannot be deleted' : 'Delete campaign'} aria-label={`Delete ${row.name}`} disabled={busy || row.status === 'sending'} onClick={() => { setError(''); setDeleteIds([row.id]) }}><Trash2 size={14}/></button><button className="cc-icon" aria-label={`Open ${row.name}`} onClick={() => setActive(row)}><ChevronRight size={16}/></button></div></td>
      </tr>)}</tbody></table></div>
      {loading ? <div className="cc-loading"><RefreshCw size={18} className="cc-spin"/>Loading campaigns…</div> : !visible.length && <CampaignEmpty title={rows.length ? 'No campaigns match your filters' : 'Your next conversation starts here'} action={<button className="cc-button cc-button--primary" onClick={rows.length ? () => { setSearch(''); setStatus('all'); setSegment('all') } : startNew}>{rows.length ? 'Clear filters' : 'Create your first campaign'}</button>}>{rows.length ? 'Try another name, status, or audience.' : 'Build an email, choose your subscribers, and review before sending.'}</CampaignEmpty>}
      <footer className="cc-pagination"><span>{filtered.length ? (currentPage - 1) * size + 1 : 0}–{Math.min(currentPage * size, filtered.length)} of {filtered.length} campaigns</span><div><select aria-label="Campaigns per page" value={size} onChange={e => { setSize(Number(e.target.value)); setPage(1) }}>{[10, 20, 50].map(value => <option key={value} value={value}>{value} per page</option>)}</select><button className="cc-icon" disabled={currentPage <= 1} aria-label="Previous campaign page" onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16}/></button><span>{currentPage} / {pages}</span><button className="cc-icon" disabled={currentPage >= pages} aria-label="Next campaign page" onClick={() => setPage(currentPage + 1)}><ChevronRight size={16}/></button></div></footer>
    </section><p className="cc-footnote">Delivery totals show mail-service results. Open rates use tracked emails only. Image blocking and privacy preloading affect accuracy.</p>
    {creating && <CampaignDialog title="Create a campaign" busy={busy} onClose={() => setCreating(false)}><form onSubmit={event => void create(event)}><div className="cc-dialog-body">{error && <p role="alert" className="cc-feedback cc-feedback--error">{error}</p>}<label className="cc-field"><span>Campaign name</span><input autoFocus required maxLength={160} placeholder="e.g. November product update" value={newName} onChange={e => setNewName(e.target.value)}/><small>Internal name. Your audience will see the email subject.</small></label><p className="cc-field-title">Choose your starting point</p><div className="cc-editor-options">{editorOptions.map(option => <button key={option.id} type="button" aria-pressed={editorType === option.id} onClick={() => setEditorType(option.id)}><option.icon size={25}/><strong>{option.title}</strong><small>{option.text}</small>{editorType === option.id && <span><Check size={12}/></span>}</button>)}</div></div><footer><button type="button" className="cc-button" disabled={busy} onClick={() => setCreating(false)}>Cancel</button><button className="cc-button cc-button--primary" disabled={busy || !newName.trim()}>{busy ? 'Creating…' : 'Create draft'}<ArrowRight size={14}/></button></footer></form></CampaignDialog>}
    {!!deleteIds.length && <CampaignDialog title="Delete campaigns?" busy={busy} onClose={() => setDeleteIds([])}><div className="cc-dialog-body">{error && <p role="alert" className="cc-feedback cc-feedback--error">{error}</p>}<p>Delete {deleteIds.length} selected campaign{deleteIds.length === 1 ? '' : 's'} and their delivery reports? This cannot be undone.</p></div><footer><button className="cc-button" disabled={busy} onClick={() => setDeleteIds([])}>Cancel</button><button className="cc-button cc-button--danger" disabled={busy} onClick={() => void remove()}>{busy ? 'Deleting…' : 'Delete campaigns'}</button></footer></CampaignDialog>}
  </div>
}
