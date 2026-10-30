import { useEffect, useState } from 'react'
import { Activity, ArrowRight, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, FlaskConical, RefreshCw, Search } from 'lucide-react'
import { api, type CrmAutomationInput, type CrmAutomationPreview, type CrmAutomationRun } from '@/lib/api'
import { actions, date, Empty, Status, titleCase } from './crm-automation-shared'

export function AutomationTest({ form, issues }: { form: CrmAutomationInput; issues: string[] }) {
  const [search,setSearch]=useState('')
  const [contacts,setContacts]=useState<Awaited<ReturnType<typeof api.crmAutomationContacts>>>([])
  const [contact,setContact]=useState<Awaited<ReturnType<typeof api.crmAutomationContacts>>[number]|null>(null)
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [result,setResult]=useState<CrmAutomationPreview|null>(null)
  useEffect(()=>{
    let current=true;setLoading(true)
    const timer=window.setTimeout(()=>{api.crmAutomationContacts(search).then(items=>{if(current){setContacts(items);setError('')}}).catch(cause=>{if(current)setError((cause as Error).message)}).finally(()=>{if(current)setLoading(false)}) },250)
    return()=>{current=false;window.clearTimeout(timer)}
  },[search])
  async function test(){if(!contact)return;setBusy(true);setError('');setResult(null);try{setResult(await api.crmPreviewAutomation({...form,enabled:false},contact.id))}catch(cause){setError((cause as Error).message)}finally{setBusy(false)}}
  return <div className="au-test-layout"><section className="cc-panel"><header><div><h2>Test with a contact</h2><p>Simulate your current workflow without saving changes or sending emails.</p></div><FlaskConical size={20}/></header><div className="au-test-body">
    {error&&<p role="alert" className="cc-feedback cc-feedback--error">{error}</p>}
    <label className="cc-search"><Search size={15}/><input aria-label="Find test contact" placeholder="Search name or email..." value={search} onChange={e=>setSearch(e.target.value)}/></label>
    <div className="au-contact-options">{loading?<p>Finding contacts...</p>:contacts.length?contacts.map(item=><button key={item.id} disabled={busy} aria-pressed={contact?.id===item.id} onClick={()=>{setContact(item);setResult(null)}}><span className="au-avatar">{item.name.slice(0,1)}</span><span><strong>{item.name}</strong><small>{item.email||'No email address'}</small></span>{contact?.id===item.id&&<CheckCircle2 size={16}/>}</button>):<p>No contacts match this search. Add a contact in Contacts to test a workflow.</p>}</div>
    <p className="au-helper">Showing up to 20 matching contacts. Search to find someone else.</p>{contact&&<div className="au-contact-summary"><strong>Selected: {contact.name}</strong><span>{titleCase(contact.stage)} · {titleCase(contact.subscription_status)}</span></div>}
    {issues.length>0&&<ul className="au-issues">{issues.map(issue=><li key={issue}>{issue}</li>)}</ul>}
    <button className="cc-button cc-button--primary" disabled={busy||!contact||!!issues.length} onClick={()=>void test()}><FlaskConical size={15}/>{busy?'Testing workflow...':'Run test preview'}</button>
  </div></section><section className="cc-panel"><header><div><h2>Test results</h2><p>Trigger targets and filters use the contact's current data.</p></div></header>
    {result?<div className="au-test-body"><Status value={result.status}/><p className="au-test-message">{result.message}</p><div className="au-result-list">{result.results.map(item=><div key={item.position}><span>{item.position}</span><div><strong>{actions.find(action=>action.id===item.action_type)?.title||item.action_type}</strong><p>{item.message}</p></div><Status value={item.status}/></div>)}</div><p className="au-helper">No tasks, notes, memberships, enrollments, or run records were saved. A real run occurs only after activation and a matching event.</p></div>:<Empty title="Preview your workflow" text="Choose a contact and run the test to see which actions would complete or be skipped."/>}
  </section></div>
}

export function AutomationHistory({ automationId, version, onContact, onChanged }: { automationId?:number; version:number; onContact?:(id:number)=>void; onChanged:()=>void }) {
  const [data,setData]=useState<Awaited<ReturnType<typeof api.crmAutomationActivity>>|null>(null)
  const [search,setSearch]=useState('');const [status,setStatus]=useState('');const [from,setFrom]=useState('');const [to,setTo]=useState('');const [page,setPage]=useState(1)
  const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [busy,setBusy]=useState<number|null>(null);const [notice,setNotice]=useState('')
  useEffect(()=>{
    let current=true;setLoading(true);setError('')
    if(from&&to&&from>to){setError('End date must be on or after the start date.');setLoading(false);return}
    const timer=window.setTimeout(()=>{api.crmAutomationActivity({automation_id:automationId,page,search,status,from,to}).then(result=>{if(current)setData(result)}).catch(cause=>{if(current)setError((cause as Error).message)}).finally(()=>{if(current)setLoading(false)}) },search?250:0)
    return()=>{current=false;window.clearTimeout(timer)}
  },[automationId,version,page,search,status,from,to])
  async function retry(run:CrmAutomationRun){
    if(!window.confirm('Retry this failed run using its saved actions? Contact filters are checked again. All previous action changes were rolled back.'))return
    setBusy(run.id);setError('')
    try{const result=await api.crmRetryAutomation(run.automation_id,run.id);setNotice(`Retry result: ${result.status}.`);onChanged()}catch(cause){setError((cause as Error).message)}finally{setBusy(null)}
  }
  return <section className="cc-panel"><header><div><h2>Execution history</h2><p>Every matching event, its outcome, and the actions that ran.</p></div><button className="cc-button" disabled={loading} onClick={onChanged}><RefreshCw size={14}/>Refresh</button></header>
    <div className="cc-toolbar"><label className="cc-search"><Search size={15}/><input aria-label="Search automation runs" placeholder="Search contact or automation..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}/></label><select aria-label="Run status" value={status} onChange={e=>{setStatus(e.target.value);setPage(1)}}><option value="">All outcomes</option>{['completed','failed','skipped','pending'].map(item=><option key={item} value={item}>{titleCase(item)}</option>)}</select><label className="au-date-filter">From (UTC)<input type="date" value={from} onChange={e=>{setFrom(e.target.value);setPage(1)}}/></label><label className="au-date-filter">To (UTC)<input type="date" min={from||undefined} value={to} onChange={e=>{setTo(e.target.value);setPage(1)}}/></label></div>
    {error&&<p className="cc-feedback cc-feedback--error" role="alert">{error}</p>}{notice&&<p className="cc-feedback" role="status">{notice}</p>}
    {loading?<div className="cc-loading">Loading run history...</div>:!error&&data?.data.length?<div className="au-history-list">{data.data.map(run=><details key={run.id} className="au-run"><summary><span className="au-run-icon"><Activity size={17}/></span><span className="au-run-name"><strong>{run.automation}</strong><small>{run.name}{run.email?` · ${run.email}`:''}</small></span><Status value={run.status}/><span className="au-run-date">{date(run.created_at)}</span><ChevronDown size={15}/></summary><div className="au-run-detail"><div className="au-run-meta"><span>Run #{run.id} · Attempt {run.attempts}</span><span>{titleCase(run.context?.trigger||run.event_key.split(':')[0])}</span>{onContact&&<button className="cc-text-button" onClick={()=>onContact(run.contact_id)}>Open contact<ArrowRight size={12}/></button>}</div>
      {run.error&&<p className={run.status==='failed'?'au-run-error':'au-helper'}>{run.error}</p>}{run.status==='failed'&&<p className="au-helper">All changes from this attempt were rolled back. Fix the missing or paused resource, then retry. Retrying uses the saved action plan, not later builder edits.</p>}
      <div className="au-result-list">{run.results.map(item=><div key={item.position}><span>{item.position}</span><div><strong>{actions.find(action=>action.id===item.action_type)?.title||item.action_type}</strong><p>{item.message}</p></div><Status value={item.status}/></div>)}</div>
      {run.status==='failed'&&run.snapshot&&<div className="au-snapshot"><strong>Saved action plan</strong><ol>{run.snapshot.steps.map((step,index)=><li key={index}>{actions.find(action=>action.id===step.action_type)?.title||step.action_type}{step.task_title?`: ${step.task_title}`:step.segment_id?` (audience #${step.segment_id})`:step.sequence_id?` (sequence #${step.sequence_id})`:''}</li>)}</ol></div>}
      {!run.snapshot&&<p className="au-helper">This run predates detailed action tracking.</p>}{run.status==='failed'&&<button className="cc-button" disabled={busy!==null||!run.automation_enabled||!run.snapshot} onClick={()=>void retry(run)}><RefreshCw size={13}/>{busy===run.id?'Retrying...':'Retry failed run'}</button>}{run.status==='failed'&&!run.automation_enabled&&<p className="au-helper">Activate this automation before retrying.</p>}
    </div></details>)}</div>:!error&&<Empty title="No matching runs" text="Active automations appear here when their trigger fires. Adjust your filters or test a workflow from its builder."/>}
    <footer className="cc-pagination"><span>{data?.total||0} runs</span><div><button className="cc-icon" aria-label="Previous runs page" disabled={loading||page<=1} onClick={()=>setPage(page-1)}><ChevronLeft size={16}/></button><span>{page} / {data?.last_page||1}</span><button className="cc-icon" aria-label="Next runs page" disabled={loading||page>=(data?.last_page||1)} onClick={()=>setPage(page+1)}><ChevronRight size={16}/></button></div></footer>
  </section>
}
