import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowLeft, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, CircleAlert, Copy, FlaskConical, GitBranch, Mail, Pause, Play, Plus, RefreshCw, Save, Search, Trash2, UserPlus, Workflow } from 'lucide-react'
import { api, type CrmAutomation, type CrmAutomationInput } from '@/lib/api'
import { CampaignDialog } from './CrmCampaignWorkspace'
import { AutomationBuilder } from './CrmAutomationBuilder'
import { AutomationHistory, AutomationTest } from './CrmAutomationActivity'
import { blank, date, Empty, newStep, problems, Status, toInput, triggers, triggerTitle, type Segments, type Sequences } from './crm-automation-shared'
import './crm-campaigns.css'
import './crm-automations.css'

export function CrmAutomations({ onContact }: { onContact?: (id: number) => void }) {
  const [rules, setRules] = useState<CrmAutomation[]>([])
  const [segments, setSegments] = useState<Segments>([])
  const [sequences, setSequences] = useState<Sequences>([])
  const [form, setForm] = useState<CrmAutomationInput|null>(null)
  const [editing, setEditing] = useState<CrmAutomation|null>(null)
  const [saved, setSaved] = useState('')
  const [tab, setTab] = useState<'workflows'|'activity'>('workflows')
  const [editorTab, setEditorTab] = useState<'builder'|'test'|'history'>('builder')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [triggerFilter, setTriggerFilter] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirm, setConfirm] = useState<'activate'|'delete'|null>(null)
  const [deleteRule, setDeleteRule] = useState<CrmAutomation|null>(null)
  const [version, setVersion] = useState(0)
  const dirty = !!form && JSON.stringify(form) !== saved
  const issues = form ? problems(form, segments, sequences) : []

  async function reload() {
    const [items, groups, programs] = await Promise.all([api.crmAutomations(), api.crmSegments(), api.crmEmailPrograms('sequence')])
    setRules(items); setSegments(groups); setSequences(programs); setLoading(false)
  }
  useEffect(() => { void reload().catch(cause => { setError((cause as Error).message); setLoading(false) }) }, [])
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = '' } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn) }, [dirty])
  function open(rule?: CrmAutomation) { const next = rule ? toInput(rule) : blank(); setEditing(rule || null); setForm(next); setSaved(JSON.stringify(next)); setEditorTab('builder'); setError(''); setNotice('') }
  function close() { if (!dirty || window.confirm('Discard unsaved automation changes?')) { setForm(null); setEditing(null); setError(''); setNotice('') } }
  function starter(type: 'welcome'|'qualified'|'subscriber') {
    const next = blank()
    if (type === 'welcome') { next.name = 'Welcome new leads'; next.description = 'Create a follow-up and capture context for each new contact.'; next.steps = [{ ...newStep('task'), task_title: 'Welcome {{name}}', task_due_days: 1 }, { ...newStep('note'), note_body: 'New contact received. Follow up with {{name}} at {{email}}.' }] }
    if (type === 'qualified') { next.name = 'Follow up qualified leads'; next.trigger_type = 'stage_changed'; next.trigger_stage = 'qualified'; next.steps = [{ ...newStep('task'), task_title: 'Prepare a proposal for {{name}}', task_due_days: 2, task_priority: 'high' }] }
    if (type === 'subscriber') { next.name = 'Subscriber welcome journey'; next.trigger_type = 'subscription_changed'; next.trigger_subscription_status = 'subscribed'; next.steps = [newStep('sequence')] }
    open(); setForm(next); setSaved('')
  }
  async function save(enabled = form?.enabled || false) {
    if (!form) return
    setBusy(true); setError(''); setNotice('')
    try { const result = await api.crmSaveAutomation({ ...form, enabled }, editing?.id); const next = toInput(result); setEditing(result); setForm(next); setSaved(JSON.stringify(next)); setConfirm(null); await reload(); setNotice(enabled ? 'Automation saved and active for future matching events.' : 'Automation saved and paused.') }
    catch (cause) { setError((cause as Error).message) } finally { setBusy(false) }
  }
  async function toggle(rule: CrmAutomation) {
    if (!rule.enabled) { open(rule); setConfirm('activate'); return }
    setBusy(true); setError('')
    try { await api.crmAutomationStatus(rule.id, false); await reload(); setNotice('Automation paused. Future events will not run it.') } catch(cause) { setError((cause as Error).message) } finally { setBusy(false) }
  }
  async function pauseEditor() {
    if (!editing) return
    setBusy(true); setError('')
    try {
      const result = await api.crmAutomationStatus(editing.id,false); setEditing(result)
      setForm(current => current ? { ...current, enabled: false } : null)
      setSaved(JSON.stringify({ ...JSON.parse(saved), enabled: false }))
      await reload(); setNotice('Automation paused. Unsaved builder edits are kept.')
    } catch(cause) { setError((cause as Error).message) } finally { setBusy(false) }
  }
  async function duplicate(rule: CrmAutomation) { setBusy(true); setError(''); try { const result = await api.crmDuplicateAutomation(rule.id); await reload(); open(result); setNotice('Paused copy created. Customize it before activating.') } catch(cause) { setError((cause as Error).message) } finally { setBusy(false) } }
  async function remove() { if (!deleteRule) return; setBusy(true); setError(''); try { await api.crmDeleteAutomation(deleteRule.id); setConfirm(null); setDeleteRule(null); await reload(); setNotice('Automation and its run history deleted.') } catch(cause) { setError((cause as Error).message) } finally { setBusy(false) } }
  function refreshHistory() { setVersion(v=>v+1); void reload().catch(cause=>setError((cause as Error).message)) }
  const feedback = <>{error && <p role="alert" className="cc-feedback cc-feedback--error"><CircleAlert size={16}/>{error}</p>}{notice && <p role="status" className="cc-feedback"><CheckCircle2 size={16}/>{notice}</p>}</>
  const filtered = useMemo(() => rules.filter(rule => (filter === 'all' || (filter === 'active') === !!rule.enabled) && (!triggerFilter || rule.trigger_type === triggerFilter) && `${rule.name} ${rule.description || ''}`.toLowerCase().includes(search.toLowerCase())), [rules, filter, triggerFilter, search])
  const pages = Math.max(1,Math.ceil(filtered.length / 10)); const currentPage = Math.min(page,pages)

  if (form) return <div className="cc-page au-page">
    <button className="cc-text-button au-back" disabled={busy} onClick={close}><ArrowLeft size={14}/>Automations</button>
    <div className="cc-page-heading"><div><span className="cc-eyebrow">Automation workspace</span><div className="au-heading-title"><h1>{form.name || 'New automation'}</h1><Status value={editing?.enabled ? 'active' : 'paused'}/></div><p>{dirty ? 'Unsaved changes' : editing ? `Saved ${date(editing.updated_at)}` : 'Configure your trigger, filters, and actions.'}</p></div><div className="cc-actions"><button className="cc-button" disabled={busy || !!issues.length} onClick={() => void save()}><Save size={14}/>{busy ? 'Saving...' : 'Save changes'}</button>{editing?.enabled ? <button className="cc-button" disabled={busy} onClick={()=>void pauseEditor()}><Pause size={14}/>Pause</button> : <button className="cc-button cc-button--primary" disabled={busy || !!issues.length} onClick={() => setConfirm('activate')}><Play size={14}/>Activate</button>}</div></div>{feedback}
    <nav className="cc-workflow-nav" aria-label="Automation workspace">{[{id:'builder',title:'Workflow builder',icon:Workflow},{id:'test',title:'Test workflow',icon:FlaskConical},{id:'history',title:'Run history',icon:Activity}].map(item => <button key={item.id} aria-current={editorTab===item.id?'page':undefined} onClick={() => setEditorTab(item.id as typeof editorTab)}><item.icon size={15}/>{item.title}</button>)}</nav>
    {editorTab==='builder' && <AutomationBuilder form={form} setForm={setForm} segments={segments} sequences={sequences} busy={busy} issues={issues} onTest={()=>setEditorTab('test')}/>}
    {editorTab==='test' && <AutomationTest form={form} issues={issues}/>}
    {editorTab==='history' && (editing ? <AutomationHistory automationId={editing.id} version={version} onContact={onContact} onChanged={refreshHistory}/> : <section className="cc-panel"><Empty title="Save your automation first" text="Real run history appears here after an active workflow receives a matching event. Test previews never create history records."/></section>)}
    {confirm==='activate' && <CampaignDialog title="Activate this automation?" busy={busy} onClose={() => setConfirm(null)}><div className="cc-dialog-body">{error && <p className="cc-feedback cc-feedback--error" role="alert">{error}</p>}<div className="au-confirm"><strong>{form.name || 'Untitled automation'}</strong><p>{triggerTitle(form,segments)}</p><span>{form.steps.length} ordered actions</span></div><p>Save this workflow and run it on future matching contact events. Existing contacts are not processed automatically. Email sequence actions can schedule emails for eligible subscribers.</p>{issues.length > 0 && <ul className="au-issues">{issues.map(issue => <li key={issue}>{issue}</li>)}</ul>}</div><footer><button className="cc-button" disabled={busy} onClick={() => setConfirm(null)}>Cancel</button><button className="cc-button cc-button--primary" disabled={busy || !!issues.length} onClick={() => void save(true)}><Play size={14}/>{busy ? 'Activating...' : 'Save & activate'}</button></footer></CampaignDialog>}
  </div>

  return <div className="cc-page au-page"><div className="cc-page-heading"><div><span className="cc-eyebrow">Workflows that work for you</span><h1>Automations</h1><p>Turn contact events into organized audiences, timely follow-ups, and email journeys.</p></div><div className="cc-actions"><button className="cc-button" disabled={busy||loading} onClick={()=>{setError('');refreshHistory()}}><RefreshCw size={14}/>Refresh</button><button className="cc-button cc-button--primary" disabled={loading} onClick={()=>open()}><Plus size={15}/>Create automation</button></div></div>{feedback}
    <div className="cc-metrics">{[{label:'Total workflows',value:rules.length,icon:Workflow},{label:'Active',value:rules.filter(rule=>rule.enabled).length,icon:Play},{label:'Completed runs',value:rules.reduce((n,rule)=>n+Number(rule.completed_count),0),icon:CheckCircle2},{label:'Failed runs',value:rules.reduce((n,rule)=>n+Number(rule.failed_count),0),icon:CircleAlert}].map(item=><div className="cc-metric" key={item.label}><span><item.icon size={18}/></span><div><small>{item.label}</small><strong>{loading?'—':item.value.toLocaleString()}</strong></div></div>)}</div>
    <nav className="cc-workflow-nav" aria-label="Automation sections"><button aria-current={tab==='workflows'?'page':undefined} onClick={()=>setTab('workflows')}><Workflow size={15}/>Workflows</button><button aria-current={tab==='activity'?'page':undefined} onClick={()=>setTab('activity')}><Activity size={15}/>All run activity</button></nav>
    {tab==='activity' ? <AutomationHistory version={version} onContact={onContact} onChanged={refreshHistory}/> : <>
      <div className="au-starters">{[{id:'welcome',title:'Welcome new leads',text:'Create a task and record a welcome note.',icon:UserPlus},{id:'qualified',title:'Follow up qualified leads',text:'Create a proposal task when a lead qualifies.',icon:GitBranch},{id:'subscriber',title:'Subscriber welcome journey',text:'Enroll new subscribers into an email sequence.',icon:Mail}].map(item=><button key={item.id} disabled={loading} onClick={()=>starter(item.id as 'welcome'|'qualified'|'subscriber')}><item.icon size={21}/><div><strong>{item.title}</strong><small>{item.text}</small></div><ArrowRight size={14}/></button>)}</div>
      <section className="cc-panel"><div className="cc-toolbar"><label className="cc-search"><Search size={15}/><input aria-label="Search automations" placeholder="Search name or description..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}/></label><select aria-label="Filter status" value={filter} onChange={e=>{setFilter(e.target.value);setPage(1)}}><option value="all">All statuses</option><option value="active">Active</option><option value="paused">Paused</option></select><select aria-label="Filter trigger" value={triggerFilter} onChange={e=>{setTriggerFilter(e.target.value);setPage(1)}}><option value="">All triggers</option>{triggers.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></div>
      <div className="cc-table-wrap"><table><thead><tr><th>Automation</th><th>Trigger</th><th>Status</th><th>Runs</th><th>Last run</th><th>Actions</th></tr></thead><tbody>{!loading&&filtered.slice((currentPage-1)*10,currentPage*10).map(rule=><tr key={rule.id}><td><button className="cc-campaign-title" onClick={()=>open(rule)}><span className="cc-mail-icon"><Workflow size={18}/></span><span><strong>{rule.name}</strong><small>{rule.steps.length} actions{rule.description?` · ${rule.description}`:''}</small></span></button></td><td><span className="au-trigger-label">{triggerTitle(rule,segments)}</span></td><td><Status value={rule.enabled?'active':'paused'}/></td><td><strong>{rule.run_count}</strong>{rule.failed_count>0&&<small className="cc-danger">{rule.failed_count} failed</small>}</td><td className="cc-date">{date(rule.last_run_at)}</td><td><div className="cc-row-actions"><button className="cc-icon" disabled={busy} aria-label={`${rule.enabled?'Pause':'Activate'} ${rule.name}`} title={rule.enabled?'Pause':'Activate'} onClick={()=>void toggle(rule)}>{rule.enabled?<Pause size={14}/>:<Play size={14}/>}</button><button className="cc-icon" disabled={busy} aria-label={`Duplicate ${rule.name}`} title="Duplicate" onClick={()=>void duplicate(rule)}><Copy size={14}/></button><button className="cc-icon cc-danger" disabled={busy} aria-label={`Delete ${rule.name}`} title="Delete" onClick={()=>{setDeleteRule(rule);setConfirm('delete');setError('')}}><Trash2 size={14}/></button><button className="cc-icon" aria-label={`Open ${rule.name}`} onClick={()=>open(rule)}><ChevronRight size={16}/></button></div></td></tr>)}</tbody></table></div>
      {loading?<div className="cc-loading">Loading automations...</div>:!filtered.length&&<Empty title={rules.length?'No workflows match your filters':'Build your first automation'} text={rules.length?'Try another search, status, or trigger.':'Start with a suggested workflow above or create your own. New workflows stay paused until you activate them.'}/>}<footer className="cc-pagination"><span>{filtered.length} workflows</span><div><button className="cc-icon" aria-label="Previous automation page" disabled={currentPage<=1} onClick={()=>setPage(currentPage-1)}><ChevronLeft size={16}/></button><span>{currentPage} / {pages}</span><button className="cc-icon" aria-label="Next automation page" disabled={currentPage>=pages} onClick={()=>setPage(currentPage+1)}><ChevronRight size={16}/></button></div></footer></section><p className="cc-footnote">Contact actions run immediately. Email sequence enrollments follow their configured delivery schedule.</p>
    </>}
    {confirm==='delete'&&deleteRule&&<CampaignDialog title="Delete automation?" busy={busy} onClose={()=>{setConfirm(null);setDeleteRule(null)}}><div className="cc-dialog-body">{error&&<p className="cc-feedback cc-feedback--error" role="alert">{error}</p>}<p>Delete <strong>{deleteRule.name}</strong> and its run history? Tasks, notes, audience changes, and sequence enrollments already created will remain. This cannot be undone.</p></div><footer><button className="cc-button" disabled={busy} onClick={()=>setConfirm(null)}>Cancel</button><button className="cc-button cc-button--danger" disabled={busy} onClick={()=>void remove()}>{busy?'Deleting...':'Delete automation'}</button></footer></CampaignDialog>}
  </div>
}
