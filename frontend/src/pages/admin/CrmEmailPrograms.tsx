import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, CalendarClock, ChevronRight, Copy, Plus, RotateCcw, Save, Trash2, Users, ArrowLeft, Search, RefreshCw, Mail, Workflow } from 'lucide-react'
import { api, type CrmEmailProgram, type CrmEmailProgramDetail, type CrmEmailProgramInput, type CrmEmailProgramStep } from '@/lib/api'
import { CrmEmailEditor } from './CrmEmailEditor'
import { CampaignEmpty, CampaignStatus } from './CrmCampaignWorkspace'
import './crm-campaigns.css'
import './crm-email-library.css'

type Kind = 'recurring' | 'sequence'
const blank = (kind: Kind): CrmEmailProgramInput => ({ kind, name: '', enabled: false, segment_id: null, frequency: kind === 'recurring' ? 'weekly' : null, next_run_at: kind === 'recurring' ? new Date(Date.now() + 3600000).toISOString() : null, editor_type: 'default', subject: '', body: '', steps: kind === 'sequence' ? [{ subject: '', body: '', delay_days: 0 }] : [] })
const localDateTime = (date: string | null) => date ? new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(date) ? date : `${date.replace(' ', 'T')}Z`).toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16) : ''

export function CrmEmailPrograms({ kind }: { kind: Kind }) {
  const [rows, setRows] = useState<CrmEmailProgram[]>([])
  const [segments, setSegments] = useState<Array<{ id: number; name: string; kind: string }>>([])
  const [editing, setEditing] = useState<number | null>(null)
  const [form, setForm] = useState<CrmEmailProgramInput>(blank(kind))
  const [detail, setDetail] = useState<CrmEmailProgramDetail | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [tab, setTab] = useState<'settings'|'content'|'history'>('settings')
  const [selectedStep, setSelectedStep] = useState(0)
  const [saved, setSaved] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [stepOrderVersion, setStepOrderVersion] = useState(0)

  async function reload() {
    const [programs, groups] = await Promise.all([api.crmEmailPrograms(kind), api.crmSegments()])
    setRows(programs.map(row => ({ ...row, enabled: !!row.enabled }))); setSegments(groups); setLoading(false)
  }
  useEffect(() => { void reload().catch(e => { setError((e as Error).message); setLoading(false) }) }, [kind])
  function start(row?: CrmEmailProgram) {
    setTab('settings'); setSelectedStep(0); setStepOrderVersion(v => v + 1)
    const next: CrmEmailProgramInput = row ? { kind: row.kind, name: row.name, enabled: row.enabled, segment_id: row.segment_id, frequency: row.frequency, next_run_at: row.next_run_at, editor_type: row.editor_type, subject: row.subject, body: row.body, steps: row.steps } : blank(kind)
    setEditing(row?.id ?? 0); setForm(next); setSaved(JSON.stringify(next))
    setDetail(null); setError(''); setNotice('')
    if (row) void api.crmEmailProgram(row.id).then(setDetail).catch(e => setError((e as Error).message))
  }
  function copy(row: CrmEmailProgram) {
    setTab('settings'); setSelectedStep(0); setStepOrderVersion(v => v + 1); setSaved(''); setEditing(0); setDetail(null); setError(''); setNotice('Save to create a paused copy.')
    setForm({ kind: row.kind, name: row.name.slice(0, 153) + ' (copy)', enabled: false, segment_id: row.segment_id,
      frequency: row.frequency, next_run_at: row.kind === 'recurring' ? new Date(Date.now() + 3600000).toISOString() : null,
      editor_type: row.editor_type, subject: row.subject, body: row.body, steps: row.steps.map(step => ({ ...step })) })
  }
  function moveStep(index: number, direction: -1 | 1) {
    setStepOrderVersion(version => version + 1)
    setForm(current => {
      const steps = [...current.steps]
      const target = index + direction
      if (target < 0 || target >= steps.length) return current
      ;[steps[index], steps[target]] = [steps[target], steps[index]]
      return { ...current, steps }
    })
  }
  async function save() {
    if (form.enabled && !detail?.program.enabled && !window.confirm('Activate this workflow? The scheduler may send due emails to subscribed contacts.')) return
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await api.crmSaveEmailProgram(form, editing || undefined)
      setEditing(result.program.id); setDetail(result); const next = { ...form, ...result.program, enabled: !!result.program.enabled }; setForm(next); setSaved(JSON.stringify(next)); await reload(); setNotice('Saved successfully.')
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  async function remove(row: CrmEmailProgram) {
    if (!window.confirm(`Delete ${row.name} and its enrollment history? Sent campaigns remain in Campaigns.`)) return
    setBusy(true); setError('')
    try { await api.crmDeleteEmailProgram(row.id); if (editing === row.id) setEditing(null); await reload() }
    catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  async function enroll() {
    if (!editing || !window.confirm('Enroll eligible contacts from the saved audience? Due sequence emails can be sent by the scheduler.')) return
    setBusy(true); setError('')
    try { const result = await api.crmEnrollEmailProgram(editing); setNotice(`${result.enrolled} subscribed contact${result.enrolled === 1 ? '' : 's'} enrolled.`); setDetail(await api.crmEmailProgram(editing)); await reload() }
    catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  async function retry(run: number) {
    if (!editing) return
    setBusy(true); setError('')
    try { setDetail(await api.crmRetryEmailProgramRun(editing, run)); setNotice('Retry queued for the next scheduler run.') }
    catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  const updateStep = (index: number, patch: Partial<CrmEmailProgramStep>) => setForm(current => ({ ...current, steps: current.steps.map((step, i) => i === index ? { ...step, ...patch } : step) }))
  const title = kind === 'recurring' ? 'Recurring Campaigns' : 'Email Sequences'
  const help = kind === 'recurring' ? 'Send a fresh campaign to subscribed contacts on a daily, weekly, or monthly schedule.' : 'Send a timed series of emails to subscribed contacts in a list or tag.'

  const dirty = editing !== null && JSON.stringify(form) !== saved
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = '' } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn) }, [dirty])
  const close = () => { if (!dirty || window.confirm('Discard unsaved workflow changes?')) { setEditing(null); setError(''); setNotice('') } }
  const filtered = rows.filter(row => (!search || row.name.toLowerCase().includes(search.toLowerCase())) && (status === 'all' || (status === 'active') === !!row.enabled))
  const pages = Math.max(1, Math.ceil(filtered.length / 10)); const currentPage = Math.min(page, pages)
  const lockedSteps = !!detail?.enrollments.active
  const feedback = <>{error && <p role="alert" className="cc-feedback cc-feedback--error">{error}</p>}{notice && <p role="status" className="cc-feedback">{notice}</p>}</>
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  function changeEditor(next: CrmEmailProgramInput['editor_type']) {
    if (next === form.editor_type) return
    const hasContent = !!form.body?.trim() || form.steps.some(step => step.body.trim())
    if (hasContent && !window.confirm('Changing editor clears the current email content. Cancel to keep it, or continue to start again.')) return
    setForm(current => ({ ...current, editor_type: next, body: '', steps: current.steps.map(step => ({ ...step, body: '' })) })); setStepOrderVersion(v => v + 1)
  }
  if (editing !== null) return <div className="cc-page el-page">
    <button className="cc-text-button el-back" disabled={busy} onClick={close}><ArrowLeft size={14}/>{title}</button>
    <div className="cc-page-heading"><div><span className="cc-eyebrow">{kind === 'recurring' ? 'Scheduled email' : 'Customer journey'}</span><h1>{form.name || (kind === 'recurring' ? 'New recurring campaign' : 'New sequence')}</h1><p>{dirty ? 'Unsaved changes' : editing ? 'All changes saved' : 'New workflow - not saved'} / {detail?.program.enabled ? 'Active workflow' : 'Paused workflow'}</p></div><button className="cc-button cc-button--primary" disabled={busy || !form.name.trim()} onClick={() => void save()}><Save size={14}/>{busy ? 'Saving...' : 'Save workflow'}</button></div>
    {feedback}<nav className="cc-workflow-nav">{(['settings','content','history'] as const).map((item,index) => <button key={item} aria-current={tab === item ? 'page' : undefined} onClick={() => setTab(item)}><span>{index + 1}</span>{item === 'settings' ? 'Audience & schedule' : item === 'content' ? kind === 'recurring' ? 'Email content' : 'Sequence builder' : 'Run history'}</button>)}</nav>
    {tab === 'settings' && <div className="el-settings"><section className="cc-panel"><header><div><h2>Workflow settings</h2><p>Choose who receives your emails and when they run.</p></div></header><fieldset disabled={busy} className="el-form"><label className="cc-field">Internal name<input maxLength={160} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></label><label className="cc-field">Audience<select value={form.segment_id ?? ''} onChange={e => setForm({ ...form, segment_id: Number(e.target.value) || null })}><option value="">All subscribed contacts</option>{segments.map(segment => <option key={segment.id} value={segment.id}>{segment.kind}: {segment.name}</option>)}</select><small>Only subscribed contacts receive email. Unsubscribe links are added automatically.</small></label>{kind === 'recurring' && <div className="el-two"><label className="cc-field">Repeat<select value={form.frequency || 'weekly'} onChange={e => setForm({ ...form, frequency: e.target.value as CrmEmailProgramInput['frequency'] })}><option value="daily">Every day</option><option value="weekly">Every week</option><option value="monthly">Every month</option></select></label><label className="cc-field">Next send time<input type="datetime-local" value={localDateTime(form.next_run_at)} onChange={e => setForm({ ...form, next_run_at: e.target.value ? new Date(e.target.value).toISOString() : null })}/><small>Time zone: {timezone}</small></label></div>}<label className="el-toggle"><input type="checkbox" checked={!!form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })}/><div><strong>{form.enabled ? 'Active after saving' : 'Paused'}</strong><p>{form.enabled ? 'The scheduler can send emails when they become due.' : 'Keep paused while you prepare your content.'}</p></div></label></fieldset><footer className="cc-panel-footer"><button className="cc-button cc-button--primary" onClick={() => setTab('content')}>Continue to content<ChevronRight size={14}/></button></footer></section><div className="cc-stack"><section className="cc-panel"><header><h2>{kind === 'recurring' ? 'Schedule overview' : 'How enrollment works'}</h2></header><div className="el-info"><CalendarClock size={25}/><h3>{kind === 'recurring' ? form.frequency : `${form.steps.length} email steps`}</h3><p>{kind === 'recurring' ? `Next send: ${form.next_run_at ? new Date(localDateTime(form.next_run_at)).toLocaleString() : 'Choose a date and time'}. Each run creates a campaign for the current subscribed audience.` : 'Save and activate your sequence, then enroll the current audience from Run history. Each step waits its configured delay after the previous email.'}</p><p>Scheduled delivery requires the application scheduler to be running.</p></div></section><section className="cc-panel"><header><h2>Before activating</h2></header><div className="el-info"><p>Check your audience, review every email, and verify your mail settings. Saving an active workflow permits scheduled sending.</p></div></section></div></div>}
    {tab === 'content' && <div className="cc-stack"><section className="cc-panel"><header><div><h2>{kind === 'recurring' ? 'Recurring email' : 'Sequence builder'}</h2><p>{kind === 'recurring' ? 'The same content is used for each scheduled run.' : 'Design an ordered journey. Delays are measured in days.'}</p></div><select className="el-select" disabled={busy || lockedSteps} value={form.editor_type} onChange={e => changeEditor(e.target.value as CrmEmailProgramInput['editor_type'])}><option value="default">Content blocks</option><option value="visual">Visual builder</option><option value="html">Custom HTML</option><option value="classic">Plain text</option></select></header>{kind === 'recurring' ? <><div className="el-form"><label className="cc-field">Email subject<input disabled={busy} maxLength={190} value={form.subject || ''} onChange={e => setForm({ ...form, subject: e.target.value })}/></label></div><CrmEmailEditor key={`recurring-${editing}-${form.editor_type}-${stepOrderVersion}`} mode={form.editor_type} disabled={busy} value={form.body || ''} onChange={body => setForm(current => ({ ...current, body }))}/></> : <><div className="el-step-strip">{form.steps.map((step,index) => <button key={index} className={selectedStep === index ? 'is-active' : ''} onClick={() => setSelectedStep(index)}><span>{index + 1}</span><div><strong>{step.subject || `Email ${index + 1}`}</strong><small>{step.delay_days ? `Wait ${step.delay_days} days` : 'Send without delay'}</small></div></button>)}<button disabled={busy || lockedSteps || form.steps.length >= 20} onClick={() => { setForm(current => ({ ...current, steps: [...current.steps, { subject: '', body: '', delay_days: 1 }] })); setSelectedStep(form.steps.length) }}><Plus size={17}/>Add step</button></div>{lockedSteps && <p className="el-info">Steps are locked while contacts have active enrollments. Duplicate this sequence to create a different journey.</p>}{form.steps[selectedStep] && <><div className="el-step-heading"><strong>Email {selectedStep + 1}</strong><div className="cc-actions"><button className="cc-icon" aria-label="Move step earlier" disabled={busy || lockedSteps || selectedStep === 0} onClick={() => { moveStep(selectedStep,-1); setSelectedStep(selectedStep-1) }}><ArrowUp size={15}/></button><button className="cc-icon" aria-label="Move step later" disabled={busy || lockedSteps || selectedStep === form.steps.length-1} onClick={() => { moveStep(selectedStep,1); setSelectedStep(selectedStep+1) }}><ArrowDown size={15}/></button><button className="cc-icon cc-danger" aria-label="Remove step" disabled={busy || lockedSteps || form.steps.length === 1} onClick={() => { if (!window.confirm('Remove this step? Save to apply the change.')) return; setForm(current => ({ ...current, steps: current.steps.filter((_,index) => index !== selectedStep) })); setSelectedStep(Math.max(0,selectedStep-1)); setStepOrderVersion(v => v+1) }}><Trash2 size={15}/></button></div></div><fieldset disabled={busy || lockedSteps} className="el-form el-step-fields"><label className="cc-field">Wait before sending (days)<input type="number" min={0} max={365} value={form.steps[selectedStep].delay_days} onChange={e => updateStep(selectedStep,{ delay_days: Number(e.target.value) })}/><small>{selectedStep === 0 ? 'From enrollment' : 'After the preceding email'}</small></label><label className="cc-field">Subject<input maxLength={190} value={form.steps[selectedStep].subject} onChange={e => updateStep(selectedStep,{ subject: e.target.value })}/></label></fieldset><CrmEmailEditor key={`step-${editing}-${selectedStep}-${form.editor_type}-${stepOrderVersion}`} mode={form.editor_type} disabled={busy || lockedSteps} value={form.steps[selectedStep].body} onChange={body => updateStep(selectedStep,{ body })}/></>}</>}</section></div>}
    {tab === 'history' && <section className="cc-panel"><header><div><h2>Run history</h2><p>Most recent 50 runs{kind === 'sequence' ? ` / ${detail?.enrollments.active || 0} active enrollments` : ''}</p></div><div className="cc-actions"><button className="cc-button" disabled={!editing || busy} onClick={() => { if (editing) void api.crmEmailProgram(editing).then(setDetail).catch(e => setError((e as Error).message)) }}><RefreshCw size={14}/>Refresh</button>{kind === 'sequence' && <button className="cc-button cc-button--primary" disabled={!editing || busy || dirty || !detail?.program.enabled} onClick={() => void enroll()}><Users size={14}/>Enroll saved audience</button>}</div></header><div className="cc-table-wrap"><table><thead><tr><th>Recipient / run</th><th>Status</th><th>Created</th><th>Details</th><th>Action</th></tr></thead><tbody>{detail?.runs.map(run => <tr key={run.id}><td>{run.contact_name || run.run_key}</td><td><CampaignStatus value={run.status}/></td><td>{new Date(localDateTime(run.created_at)).toLocaleString()}</td><td className="el-run-error">{run.error || '-'}</td><td>{run.status === 'failed' && <button className="cc-text-button" disabled={busy} onClick={() => { if (window.confirm('Queue this failed run for retry by the scheduler?')) void retry(run.id) }}><RotateCcw size={13}/>Retry</button>}</td></tr>)}</tbody></table></div>{!detail?.runs.length && <CampaignEmpty title="No runs yet">{editing ? 'Delivery history appears here when the scheduler processes this workflow.' : 'Save your workflow to start tracking its runs.'}</CampaignEmpty>}</section>}
  </div>
  return <div className="cc-page el-page"><div className="cc-page-heading"><div><span className="cc-eyebrow">Email workflows</span><h1>{title}</h1><p>{help}</p></div><div className="cc-actions"><button className="cc-button" disabled={loading || busy} onClick={() => void reload().catch(e => setError((e as Error).message))}><RefreshCw size={14}/>Refresh</button><button className="cc-button cc-button--primary" onClick={() => start()}><Plus size={15}/>Create {kind === 'recurring' ? 'campaign' : 'sequence'}</button></div></div>{feedback}<div className="cc-metrics">{[{ label: 'Total workflows', value: rows.length, icon: <Workflow size={18}/> },{ label: 'Active', value: rows.filter(row => row.enabled).length, icon: <CalendarClock size={18}/> },{ label: 'Paused', value: rows.filter(row => !row.enabled).length, icon: <Mail size={18}/> },{ label: kind === 'sequence' ? 'Active enrollments' : 'Total runs', value: rows.reduce((n,row) => n + Number(kind === 'sequence' ? row.active_enrollments || 0 : row.run_count || 0),0), icon: <Users size={18}/> }].map(item => <div className="cc-metric" key={item.label}><span>{item.icon}</span><div><small>{item.label}</small><strong>{loading ? '-' : item.value}</strong></div></div>)}</div><section className="cc-panel"><div className="cc-toolbar"><label className="cc-search"><Search size={15}/><input aria-label="Search workflows" placeholder="Search by name..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}/></label><select aria-label="Filter workflow status" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}><option value="all">All statuses</option><option value="active">Active</option><option value="paused">Paused</option></select></div><div className="cc-table-wrap"><table><thead><tr><th>Name</th><th>Audience</th><th>{kind === 'recurring' ? 'Schedule' : 'Journey'}</th><th>Status</th><th>Runs</th><th>Actions</th></tr></thead><tbody>{filtered.slice((currentPage-1)*10,currentPage*10).map(row => <tr key={row.id}><td><button className="cc-campaign-title" onClick={() => start(row)}><span className="cc-mail-icon">{kind === 'recurring' ? <CalendarClock size={18}/> : <Workflow size={18}/>}</span><strong>{row.name}</strong></button></td><td>{row.segment_name || 'All subscribers'}</td><td>{kind === 'recurring' ? <><span className="el-capitalize">{row.frequency}</span><small>{row.next_run_at ? new Date(localDateTime(row.next_run_at)).toLocaleString() : 'No date set'}</small></> : `${row.steps.length} emails`}</td><td><CampaignStatus value={row.enabled ? 'active' : 'paused'}/></td><td>{row.run_count || 0}</td><td><div className="cc-row-actions"><button className="cc-icon" aria-label={`Duplicate ${row.name}`} onClick={() => copy(row)}><Copy size={14}/></button><button className="cc-icon cc-danger" aria-label={`Delete ${row.name}`} disabled={busy} onClick={() => void remove(row)}><Trash2 size={14}/></button><button className="cc-icon" aria-label={`Open ${row.name}`} onClick={() => start(row)}><ChevronRight size={16}/></button></div></td></tr>)}</tbody></table></div>{loading ? <div className="cc-loading">Loading workflows...</div> : !filtered.length && <CampaignEmpty title={rows.length ? 'No matching workflows' : `Create your first ${kind === 'recurring' ? 'recurring campaign' : 'sequence'}`}>{rows.length ? 'Try a different search or status.' : help}</CampaignEmpty>}<footer className="cc-pagination"><span>{filtered.length} workflows</span><div><button className="cc-button" disabled={currentPage<=1} onClick={() => setPage(currentPage-1)}>Previous</button><span>{currentPage} / {pages}</span><button className="cc-button" disabled={currentPage>=pages} onClick={() => setPage(currentPage+1)}>Next</button></div></footer></section></div>
}
