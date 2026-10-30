import { useEffect, useRef, useState } from 'react'
import { api, getAdminToken, type CrmContact, type CrmDetail } from '@/lib/api'
import { CrmOperations } from './CrmOperations'
import { CrmContactDetail } from './CrmContactDetail'
import { CrmMarketing } from './CrmMarketing'
import { CrmAutomations } from './CrmAutomations'
import { CrmDashboard } from './CrmDashboard'
import { CrmSavedSegments } from './CrmSavedSegments'
import { CrmCampaigns } from './CrmCampaigns'
import { CrmEmailActivities, CrmEmailAssets } from './CrmEmailSections'
import { CrmEmailPrograms } from './CrmEmailPrograms'
import { CrmForms } from './CrmForms'
import { CrmSettings } from './CrmSettings'
import { CrmReports } from './CrmReports'
import { Activity, ArrowLeft, ArrowUpDown, BarChart3, BriefcaseBusiness, Building2, ContactRound, FolderKanban, LayoutDashboard, LayoutTemplate, List, Mail, Menu, PanelsTopLeft, Repeat2, Search, Settings, Tags, UsersRound, Workflow, CheckSquare2 } from 'lucide-react'
import './crm-fluent.css'
import './crm-campaigns.css'
import './crm-administration.css'
import './crm-contacts.css'
import { CrmResources } from './CrmResources'

const stages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']
const crmNavigation = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'contacts', label: 'Contacts', icon: ContactRound },
  { id: 'campaigns', label: 'Emails', icon: Mail },
  { id: 'forms', label: 'Forms', icon: PanelsTopLeft },
  { id: 'automations', label: 'Automations', icon: Workflow },
  { id: 'deals', label: 'Deals', icon: BriefcaseBusiness },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare2 },
  { id: 'companies', label: 'Companies', icon: Building2 },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
] as const
const contactNavigation = [{ id: 'contacts', label: 'All Contacts', icon: UsersRound }, { id: 'lists', label: 'Lists', icon: List }, { id: 'tags', label: 'Tags', icon: Tags }, { id: 'segments', label: 'Segments', icon: Search }] as const
const emailNavigation = [{ id: 'campaigns', label: 'Campaigns', icon: Mail }, { id: 'recurring', label: 'Recurring Campaigns', icon: Repeat2 }, { id: 'sequences', label: 'Sequences', icon: Workflow }, { id: 'templates', label: 'Templates', icon: LayoutTemplate }, { id: 'patterns', label: 'Patterns', icon: PanelsTopLeft }, { id: 'activities', label: 'All Activities', icon: Activity }] as const

export type CrmView = 'dashboard' | 'contacts' | 'lists' | 'tags' | 'segments' | 'campaigns' | 'recurring' | 'sequences' | 'templates' | 'patterns' | 'activities' | 'forms' | 'automations' | 'reports' | 'settings' | 'addons' | 'help' | 'deals' | 'projects' | 'tasks' | 'companies'
type CrmTab = Exclude<CrmView, 'recurring' | 'sequences' | 'templates' | 'patterns' | 'activities'>
type CrmEmailTab = 'campaigns' | 'recurring' | 'sequences' | 'templates' | 'patterns' | 'activities'
const isEmailView = (view: CrmView) => ['campaigns', 'recurring', 'sequences', 'templates', 'patterns', 'activities'].includes(view)

export function CrmWorkspace({ onExit, onOpenSettings, embedded = false, initialView = 'dashboard', navigationRequest, onViewChange }: { onExit?: () => void; onOpenSettings?: () => void; embedded?: boolean; initialView?: CrmView; navigationRequest?: { view: CrmView; id: number } | null; onViewChange?: (view: CrmView) => void } = {}) {
  const requestId = useRef(0)
  const [loading, setLoading] = useState(true)
  const [compact, setCompact] = useState(false)
  const [contacts, setContacts] = useState<CrmContact[]>([])
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState('')
  const [segmentId, setSegmentId] = useState(0)
  const [savedSegmentId, setSavedSegmentId] = useState(0)
  const [formSource, setFormSource] = useState('')
  const [subscription, setSubscription] = useState('')
  const [sort, setSort] = useState('')
  const [direction, setDirection] = useState('desc')
  const [total, setTotal] = useState(0)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [advanced, setAdvanced] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [bulkSegmentId, setBulkSegmentId] = useState(0)
  const [segments, setSegments] = useState<Array<{id:number;kind:string;name:string}>>([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [detail, setDetail] = useState<CrmDetail | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<CrmTab>(() => isEmailView(initialView) ? 'campaigns' : initialView as CrmTab)
  const [emailTab, setEmailTab] = useState<CrmEmailTab>(() => isEmailView(initialView) ? initialView as CrmEmailTab : 'campaigns')
  const [mobileNav, setMobileNav] = useState(false)
  useEffect(() => {
    if (!navigationRequest) return
    const view = navigationRequest.view
    if (view === 'contacts') { setDetail(null); setCreating(false) }
    if (isEmailView(view)) {
      setTab('campaigns')
      setEmailTab(view as CrmEmailTab)
    } else {
      setTab(view as CrmTab)
    }
  }, [navigationRequest?.id])
  useEffect(() => { onViewChange?.(tab === 'campaigns' ? emailTab : tab) }, [tab, emailTab, onViewChange])

  async function reload() {
    const id = ++requestId.current
    setLoading(true); setError('')
    try {
      const result = await api.crmContacts(search, stage, page, segmentId, subscription, sort, direction, savedSegmentId, formSource)
      if (id !== requestId.current) return
      setContacts(result.contacts.data); setPages(result.contacts.last_page); setTotal(result.contacts.total)
    } catch (e) { if (id === requestId.current) setError((e as Error).message) }
    finally { if (id === requestId.current) setLoading(false) }
  }
  useEffect(() => { setSelectedIds([]);setActionsOpen(false);void reload() }, [search, stage, page, segmentId, subscription, sort, direction, savedSegmentId, formSource])
  useEffect(() => { api.crmSegments().then(setSegments).catch(() => {}) }, [tab])
  async function select(id: number) {
    try {
      const result = await api.crmContact(id)
      setDetail(result); setCreating(false); setError('')
    } catch (e) { setError((e as Error).message) }
  }
  async function applyBulkSegment() {
    if (!bulkSegmentId || selectedIds.length === 0) return
    setBusy(true); setError('')
    try {
      await Promise.all(selectedIds.map(async id => {
        const current = await api.crmContactSegments(id)
        const next = [...new Set([...current.map(segment => segment.id), bulkSegmentId])]
        await api.crmSetContactSegments(id, next)
      }))
      setSelectedIds([]); setActionsOpen(false); await reload()
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  return <div className={`crm-workspace ${embedded ? 'crm-embedded' : 'crm-standalone'} min-h-screen pb-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100`}>
    {!embedded && <>
    <div className="crm-admin-bar"><button type="button" onClick={onExit} className="crm-admin-back"><ArrowLeft size={13}/> Bakhtech Admin</button><span>Bakhtech Solutions</span><button type="button" onClick={() => setTab('settings')}><Settings size={13}/> CRM settings</button></div>
    {mobileNav && <button type="button" className="crm-side-backdrop" aria-label="Close CRM menu" onClick={() => setMobileNav(false)} />}
    <aside className={`crm-side ${mobileNav ? 'is-open' : ''}`} aria-label="CRM sidebar"><button type="button" className="crm-side-brand" onClick={() => {setTab('dashboard');setMobileNav(false)}}><img className="crm-side-mark" src="/fluentcrm-logo.svg" alt=""/> FluentCRM <small>Pro</small></button>
      <button type="button" className={tab==='dashboard'?'is-active':''} onClick={() => {setTab('dashboard');setMobileNav(false)}}><LayoutDashboard size={14}/> Dashboard</button>
      <div className="crm-side-group"><button type="button" className={tab==='contacts'?'is-active':''} onClick={() => {setTab('contacts');setFormSource('');setMobileNav(false)}}><ContactRound size={14}/> Contacts</button>{contactNavigation.slice(1,3).map(item=><button type="button" key={item.id} className={`crm-side-sub ${tab===item.id?'is-current':''}`} onClick={() => {setTab(item.id);setMobileNav(false)}}>{item.label}</button>)}</div>
      <div className="crm-side-group"><button type="button" className={tab==='campaigns'&&emailTab==='campaigns'?'is-active':''} onClick={() => {setTab('campaigns');setEmailTab('campaigns');setMobileNav(false)}}><Mail size={14}/> Campaigns</button>{emailNavigation.slice(1,4).map(item=><button type="button" key={item.id} className={`crm-side-sub ${tab==='campaigns'&&emailTab===item.id?'is-current':''}`} onClick={() => {setTab('campaigns');setEmailTab(item.id);setMobileNav(false)}}>{item.id === 'sequences' ? 'Email Sequences' : item.id === 'templates' ? 'Email Templates' : item.label}</button>)}</div>
      <div className="crm-side-group"><button type="button" className={tab==='forms'?'is-active':''} onClick={() => {setTab('forms');setMobileNav(false)}}><PanelsTopLeft size={14}/> Forms</button>
      <button type="button" className={tab==='automations'?'is-active':''} onClick={() => {setTab('automations');setMobileNav(false)}}><Workflow size={14}/> Automations</button></div>
      <div className="crm-side-group"><button type="button" className={tab==='settings'?'is-active':''} onClick={() => {setTab('settings');setMobileNav(false)}}><Settings size={14}/> Settings</button>
      <button type="button" className={tab==='reports'?'is-active':''} onClick={() => {setTab('reports');setMobileNav(false)}}><BarChart3 size={14}/> Reports</button>
      <button type="button" className={tab==='addons'?'is-active':''} onClick={() => {setTab('addons');setMobileNav(false)}}>Addons</button>
      <button type="button" className={tab==='help'?'is-active':''} onClick={() => {setTab('help');setMobileNav(false)}}>Help</button></div>
      <div className="crm-side-divider">Bakhtech CRM</div>{crmNavigation.filter(item=>['deals','projects','tasks','companies'].includes(item.id)).map(item=><button type="button" key={item.id} className={tab===item.id?'is-active':''} onClick={() => {setTab(item.id);setMobileNav(false)}}><item.icon size={14}/>{item.label}</button>)}
    </aside>
    </>}
    <div className="crm-main">
    {embedded ? <header className="crm-embedded-header"><img src="/fluentcrm-logo.svg" alt=""/><div><strong>CRM</strong><span>Customer relationships and campaigns</span></div></header> : <>
    <header className="crm-topbar" aria-label="CRM workspace navigation"><div className="crm-topbar__heading"><button type="button" className="crm-mobile-menu" aria-label="Open CRM menu" onClick={() => setMobileNav(true)}><Menu size={18}/></button><img className="crm-brand-icon" src="/fluentcrm-logo.svg" alt="FluentCRM"/><div><strong>FluentCRM <small>Pro</small></strong></div></div><nav className="crm-nav-scroll" aria-label="CRM sections">{crmNavigation.filter(item=>['dashboard','contacts','campaigns','forms','automations','reports'].includes(item.id)).map(item => {const active=item.id==='contacts'?['contacts','lists','tags','segments'].includes(tab):tab===item.id;return <button key={item.id} type="button" aria-current={active?'page':undefined} className="crm-nav-item" onClick={() => {setTab(item.id);if(item.id==='contacts'){setFormSource('');setDetail(null);setCreating(false);void reload()}}}><span>{item.label}</span></button>})}</nav><button type="button" className="crm-top-settings" aria-label="Open CRM settings" onClick={() => setTab('settings')}><Settings size={17}/></button></header>
    </>}
    {['contacts','lists','tags','segments'].includes(tab) && <nav className="crm-subnav" aria-label="Contacts sections">{contactNavigation.map(item=><button key={item.id} type="button" aria-current={tab===item.id?'page':undefined} onClick={()=>{setTab(item.id);if(item.id==='contacts'){setFormSource('');setDetail(null);setCreating(false);void reload()}}}><item.icon size={15}/>{item.label}</button>)}</nav>}
    {tab==='campaigns' && <nav className="crm-subnav" aria-label="Email sections">{emailNavigation.map(item=><button key={item.id} type="button" aria-current={emailTab===item.id?'page':undefined} onClick={()=>setEmailTab(item.id)}><item.icon size={15}/>{item.label}</button>)}</nav>}
    <div className="crm-content space-y-5 px-4 md:px-6">
    {tab === 'dashboard' && <CrmDashboard onNavigate={view => { if (view === 'activities') { setTab('campaigns'); setEmailTab('activities') } else { setTab(view); if (view === 'campaigns') setEmailTab('campaigns') } }} onContact={id => { setTab('contacts'); void select(id) }} />}
    {tab === 'forms' && <CrmForms onContacts={source=>{setFormSource(source);setSegmentId(0);setSavedSegmentId(0);setSubscription('');setStage('');setSearch('');setDetail(null);setCreating(false);setPage(1);setTab('contacts')}} />}
    {tab === 'settings' && <CrmSettings onOpenAppSettings={onOpenSettings} />}
    {tab === 'addons' && <CrmResources section="addons" onNavigate={setTab}/>}
    {tab === 'help' && <CrmResources section="help" onNavigate={setTab}/>}
    {['deals','projects','tasks','companies'].includes(tab) && <CrmOperations key={tab} tab={tab as 'deals'|'projects'|'tasks'|'companies'} onContact={id => { setTab('contacts'); void select(id) }} />}
    {tab === 'reports' && <CrmReports onContact={id => { setTab('contacts'); void select(id) }} />}
    {['lists','tags'].includes(tab) && <CrmMarketing key={tab} tab={tab as 'lists'|'tags'} onView={id=>{setSegmentId(id);setSavedSegmentId(0);setFormSource('');setSubscription('');setStage('');setSearch('');setDetail(null);setCreating(false);setAdvanced(true);setPage(1);setTab('contacts')}} />}
    {tab==='campaigns' && emailTab==='campaigns' && <CrmCampaigns onOpenSettings={() => setTab('settings')} />}
    {tab==='campaigns' && (emailTab==='templates'||emailTab==='patterns') && <CrmEmailAssets key={emailTab} kind={emailTab==='templates'?'template':'pattern'} onCampaignCreated={()=>setEmailTab('campaigns')} />}
    {tab==='campaigns' && emailTab==='activities' && <CrmEmailActivities onContact={id=>{setTab('contacts');void select(id)}} />}
    {tab==='campaigns' && (emailTab==='recurring'||emailTab==='sequences') && <CrmEmailPrograms key={emailTab} kind={emailTab==='recurring'?'recurring':'sequence'} />}
    {tab==='segments' && <CrmSavedSegments onView={id=>{setSavedSegmentId(id);setSegmentId(0);setFormSource('');setSubscription('');setStage('');setSearch('');setDetail(null);setCreating(false);setPage(1);setTab('contacts')}} />}
    {tab==='automations' && <CrmAutomations onContact={id => { setTab('contacts'); void select(id) }} />}
    {tab === 'contacts' && <>
    {!detail && !creating && <>
    <div className="ct-directory">
      <header className="ct-heading"><div><span className="ct-eyebrow">YOUR PEOPLE, IN ONE PLACE</span><h2>Contacts <span>{total.toLocaleString()}</span></h2><p>A complete view of your relationships, from first conversation to loyal customer.</p></div><div className="ct-actions"><ImportContacts onDone={() => void reload()} /><button className="ct-primary" onClick={() => {setCreating(true);setDetail(null)}}>+ Add contact</button></div></header>
      <section className="ct-panel" aria-label="Contact directory">
        <div className="ct-tabs" aria-label="Subscription filters">{[['','All contacts'],['subscribed','Subscribed'],['unsubscribed','Unsubscribed']].map(([value,label])=><button key={value} aria-pressed={subscription===value} onClick={()=>{setSubscription(value);setPage(1)}}>{label}</button>)}<span>Manage and grow your audience</span></div>
        <div className="ct-toolbar"><label className="ct-search"><Search size={17}/><input aria-label="Search contacts" placeholder="Search name, email, phone or company..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}/></label><button className="ct-button" aria-expanded={advanced} onClick={()=>setAdvanced(!advanced)}>Filters {(stage || segmentId || formSource || savedSegmentId) ? 'Active' : ''}</button><label className="ct-density"><input type="checkbox" checked={compact} onChange={e=>setCompact(e.target.checked)}/> Compact</label><label className="ct-sort">Sort by<select value={sort || 'last_interaction_at'} onChange={e=>{setSort(e.target.value);setPage(1)}}><option value="last_interaction_at">Last interaction</option><option value="name">Contact name</option></select></label><button className="ct-button" aria-label={direction==='asc'?'Sort descending':'Sort ascending'} onClick={()=>{setDirection(direction==='asc'?'desc':'asc');setPage(1)}}><ArrowUpDown size={14}/>{direction==='asc'?'Ascending':'Descending'}</button></div>
        {advanced && <div className="ct-filters"><label>Lists & tags<select value={segmentId} onChange={e=>{setSegmentId(Number(e.target.value));setPage(1)}}><option value={0}>All lists and tags</option>{segments.map(segment=><option key={segment.id} value={segment.id}>{segment.kind}: {segment.name}</option>)}</select></label><label>Lead stage<select value={stage} onChange={e=>{setStage(e.target.value);setPage(1)}}><option value="">All stages</option>{stages.map(value=><option key={value}>{value}</option>)}</select></label><label>Form origin<select value={formSource} onChange={e=>{setFormSource(e.target.value);setPage(1)}}><option value="">All origins</option><option value="message">Contact form</option><option value="quote">Quote builder</option><option value="booking">Booking form</option></select></label></div>}
        {(search || stage || segmentId>0 || subscription || formSource || savedSegmentId>0) && <div className="ct-filter-summary"><span>{loading?'Searching...':`${total.toLocaleString()} matching contacts`}{stage && ` / Stage: ${stage}`}{segmentId>0 && ` / ${segments.find(item=>item.id===segmentId)?.name || 'Selected list/tag'}`}{formSource && ` / ${formSource} form`}{savedSegmentId>0 && ` / Saved segment #${savedSegmentId}`}</span><button onClick={()=>{setSearch('');setStage('');setSegmentId(0);setSavedSegmentId(0);setSubscription('');setFormSource('');setPage(1)}}>Clear all filters</button></div>}
        {selectedIds.length>0 && <div className="ct-selection"><strong>{selectedIds.length} selected on this page</strong><button className="ct-button" aria-expanded={actionsOpen} onClick={()=>setActionsOpen(!actionsOpen)}>Add to list or tag</button><button onClick={()=>setSelectedIds([])}>Clear selection</button>{actionsOpen && <div className="ct-bulk"><select aria-label="Bulk list or tag" value={bulkSegmentId} onChange={e=>setBulkSegmentId(Number(e.target.value))}><option value={0}>Choose list or tag</option>{segments.map(segment=><option key={segment.id} value={segment.id}>{segment.kind}: {segment.name}</option>)}</select><button className="ct-primary" disabled={busy||!bulkSegmentId} onClick={()=>void applyBulkSegment()}>{busy?'Applying...':'Apply to selected'}</button></div>}</div>}
        {error && <div role="alert" className="ct-error">{error}<button className="ct-button" onClick={()=>void reload()}>Retry</button></div>}
        <div className={`ct-table-wrap ${compact?'ct-compact':''}`} aria-busy={loading}>
          <table className="ct-table"><caption className="sr-only">Contacts with communication details, company, lead stage, subscription, lists, tags, source and activity</caption><thead><tr><th><input aria-label="Select all contacts on this page" type="checkbox" disabled={loading} checked={contacts.length>0 && contacts.every(contact=>selectedIds.includes(contact.id))} ref={node=>{if(node)node.indeterminate=selectedIds.length>0 && selectedIds.length<contacts.length}} onChange={e=>setSelectedIds(e.target.checked?contacts.map(contact=>contact.id):[])}/></th><th scope="col">Contact</th><th scope="col">Company & interest</th><th scope="col">Lead stage</th><th scope="col">Subscription</th><th scope="col">Lists & tags</th><th scope="col">Source</th><th scope="col">Last interaction</th><th scope="col"><span className="sr-only">Open profile</span></th></tr></thead><tbody>
          {!loading && !error && contacts.map(contact=><tr key={contact.id} className={selectedIds.includes(contact.id)?'is-selected':''}>
            <td><input aria-label={`Select ${contact.name}`} type="checkbox" checked={selectedIds.includes(contact.id)} onChange={e=>setSelectedIds(e.target.checked?[...selectedIds,contact.id]:selectedIds.filter(id=>id!==contact.id))}/></td>
            <td><div className="ct-person"><span className={`ct-avatar ct-avatar-${contact.id%4}`}>{contact.name.split(/\s+/).slice(0,2).map(part=>part[0]?.toUpperCase()).join('')}</span><div><button className="ct-name" onClick={()=>void select(contact.id)}>{contact.name}</button>{contact.email?<a className="ct-secondary" href={`mailto:${contact.email}`}>{contact.email}</a>:<span className="ct-secondary">No email address</span>}{contact.phone && <a className="ct-secondary" href={`tel:${contact.phone.replace(/[^+\d]/g,'')}`}>{contact.phone}</a>}</div></div></td>
            <td><strong className="ct-cell-title">{contact.company || '--'}</strong><span className="ct-secondary">{contact.service_interest || 'No service specified'}</span></td>
            <td><span className={`ct-stage ct-stage-${contact.stage}`}><i/>{contact.stage}</span></td>
            <td><span className={`ct-status ${contact.subscription_status==='subscribed'?'is-subscribed':''}`}>{contact.subscription_status==='subscribed'?'Subscribed':'Unsubscribed'}</span></td>
            <td><div className="ct-segments">{contact.segments?.length?contact.segments.map(segment=><button key={segment.id} className={`ct-chip ct-chip-${segment.kind}`} title={`Filter by ${segment.kind}: ${segment.name}`} onClick={()=>{setSegmentId(segment.id);setPage(1);setAdvanced(true)}}>{segment.kind==='tag'?'# ':''}{segment.name}</button>):<span className="ct-secondary">Not assigned</span>}</div></td>
            <td><span className="ct-source">{contact.source?.replaceAll('_',' ') || '--'}</span><span className="ct-secondary">Added {contactDate(contact.created_at)}</span></td>
            <td><strong className="ct-cell-title">{contactDate(contact.last_interaction_at)}</strong><span className="ct-secondary">{contact.last_interaction_at?'Last recorded activity':'No activity yet'}</span></td>
            <td><button className="ct-profile" aria-label={`Open ${contact.name}'s profile`} onClick={()=>void select(contact.id)}>&#8599;</button></td>
          </tr>)}
          {(loading || error || contacts.length===0) && <tr><td colSpan={9}><div className="ct-empty" role="status"><UsersRound size={30}/><strong>{loading?'Loading your contacts...':error?'Unable to load contacts':'No contacts found'}</strong><p>{loading?'Getting the latest details for your directory.':error?'Retry to load the directory.':'Add a contact, import a CSV, or adjust your filters to get started.'}</p></div></td></tr>}
          </tbody></table>
        </div>
        <footer className="ct-footer"><span>{loading?'Loading...':total>0?`Showing ${((page-1)*30+1).toLocaleString()}-${Math.min(page*30,total).toLocaleString()} of ${total.toLocaleString()} contacts`:'0 contacts'}<small>30 per page</small></span><div><button className="ct-button" disabled={loading||page<=1} onClick={()=>setPage(page-1)}>Previous</button><span>Page {page} of {pages}</span><button className="ct-button" disabled={loading||page>=pages} onClick={()=>setPage(page+1)}>Next</button></div></footer>
      </section>
    </div>
    </>}
    {(detail || creating) && <CrmContactDetail
      key={detail?.contact.id || 'new'}
      initial={detail}
      onBack={() => { setDetail(null); setCreating(false); void reload() }}
      onUpdated={result => { setDetail(result); setCreating(false) }}
      onNavigate={id => void select(id)}
      previousId={detail ? contacts[contacts.findIndex(item => item.id === detail.contact.id) - 1]?.id : undefined}
      nextId={detail && contacts.some(item => item.id === detail.contact.id) ? contacts[contacts.findIndex(item => item.id === detail.contact.id) + 1]?.id : undefined}
    />}</>}

    </div>
    </div>
  </div>
}

function contactDate(value: string | null | undefined) {
  if (!value) return '--'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '--' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function ImportContacts({onDone}:{onDone:()=>void}) {
  const [message,setMessage]=useState('')
  const [busy,setBusy]=useState(false)
  async function upload(file:File) {
    setBusy(true);setMessage('')
    try {
      const form=new FormData();form.append('file',file)
      const response=await fetch('/api/admin/crm/import',{method:'POST',headers:{Authorization:`Bearer ${getAdminToken()}`},body:form})
      const result=await response.json()
      if(!response.ok)throw new Error(result.message||'Import failed')
      setMessage(`Imported ${result.created}, updated ${result.updated}, skipped ${result.skipped}.`);onDone()
    }catch(e){setMessage((e as Error).message)}finally{setBusy(false)}
  }
  return <div className="relative"><label className="inline-flex cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">{busy ? 'Importing...' : 'Import CSV'}<input className="sr-only" type="file" accept=".csv,text/csv" disabled={busy} onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);e.target.value=''}}/></label>{message&&<span role="status" className="absolute right-0 top-full z-10 mt-1 min-w-64 rounded-lg border bg-white p-2 text-xs shadow">{message}</span>}</div>
}

