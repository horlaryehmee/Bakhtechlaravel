import { CrmEmailOpenStatus } from './CrmEmailOpenStatus'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronLeft, ChevronRight, CircleAlert, Clock3, Download, Eye, FileText, LayoutTemplate, Mail, Monitor, Pause, RefreshCw, Search, Send, Smartphone, Users, X } from 'lucide-react'
import { api, type CrmCampaign, type CrmCampaignDetail } from '@/lib/api'
import { CrmEmailEditor } from './CrmEmailEditor'

type Audience = Awaited<ReturnType<typeof api.crmCampaignAudience>>
type Segments = Awaited<ReturnType<typeof api.crmSegments>>
type CampaignForm = Pick<CrmCampaign, 'name'|'subject'|'body'|'segment_id'|'editor_type'>
type Step = 'content' | 'audience' | 'review' | 'report'
export const campaignDate = (value?: string | null) => value ? new Date(value.replace(' ', 'T')).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not sent'
const format = (value: number) => value.toLocaleString()
const toForm = (value: CrmCampaign): CampaignForm => ({ name: value.name, subject: value.subject, body: value.body, segment_id: value.segment_id, editor_type: value.editor_type })
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char)
export function CampaignStatus({ value }: { value: string }) { return <span className={`cc-status cc-status--${value}`}>{value === 'sending' ? 'In progress' : value.charAt(0).toUpperCase() + value.slice(1)}</span> }
function Panel({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) { return <section className="cc-panel"><header><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</header>{children}</section> }
export function CampaignEmpty({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) { return <div className="cc-empty"><span><Mail size={25}/></span><h3>{title}</h3><p>{children}</p>{action}</div> }
export function CampaignDialog({ title, children, onClose, busy }: { title: string; children: ReactNode; onClose: () => void; busy: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { ref.current?.showModal() }, [])
  return <dialog ref={ref} className="cc-dialog" aria-labelledby="cc-dialog-title" onCancel={event => { event.preventDefault(); if (!busy) onClose() }}><header><h2 id="cc-dialog-title">{title}</h2><button type="button" disabled={busy} className="cc-icon" aria-label="Close dialog" onClick={onClose}><X size={18}/></button></header>{children}</dialog>
}

export function CampaignWorkspace({ initial, segments, onBack, onChanged, onOpenSettings }: { initial: CrmCampaign; segments: Segments; onBack: () => void; onChanged: (campaign: CrmCampaign) => void; onOpenSettings?: () => void }) {
  const [detail, setDetail] = useState<CrmCampaignDetail | null>(null)
  const [form, setForm] = useState<CampaignForm>(toForm(initial))
  const [saved, setSaved] = useState<CampaignForm>(toForm(initial))
  const [step, setStep] = useState<Step>(initial.status === 'draft' ? 'content' : 'report')
  const [audience, setAudience] = useState<Audience | null>(null)
  const [audienceLoading, setAudienceLoading] = useState(true)
  const [audienceError, setAudienceError] = useState('')
  const [templates, setTemplates] = useState<Awaited<ReturnType<typeof api.crmEmailAssets>>>([])
  const [assetKind, setAssetKind] = useState<'template'|'pattern'>('template')
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [editorRevision, setEditorRevision] = useState(0)
  const [device, setDevice] = useState<'desktop'|'mobile'>('desktop')
  const [personalize, setPersonalize] = useState(true)
  const [busy, setBusy] = useState(false)
  const [sending, setSending] = useState(false)
  const [paused, setPaused] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirm, setConfirm] = useState<'prepare'|'send'|null>(null)
  const [reportVersion, setReportVersion] = useState(0)
  const stop = useRef(false)
  const mounted = useRef(true)
  const campaign = detail?.campaign || initial
  const readOnly = campaign.status !== 'draft'
  const dirty = JSON.stringify(form) !== JSON.stringify(saved)
  const audienceName = segments.find(item => item.id === form.segment_id)?.name || 'All subscribed contacts'
  const counts = detail?.counts || {}
  const total = Object.values(counts).reduce((sum, value) => sum + Number(value), 0)
  const resolved = Number(counts.sent || 0) + Number(counts.failed || 0) + Number(counts.skipped || 0)
  const mode = form.editor_type === 'html' ? 'html' : form.editor_type === 'visual' ? 'visual' : form.editor_type === 'classic' ? 'classic' : 'default'
  const checklist = [
    { title: 'Campaign name', done: !!form.name.trim(), text: form.name || 'Add an internal name', target: 'content' as Step },
    { title: 'Email subject', done: !!form.subject.trim(), text: form.subject || 'Add a subject your readers will see', target: 'content' as Step },
    { title: 'Email content', done: !!form.body.trim(), text: form.body.trim() ? 'Content added' : 'Build your email', target: 'content' as Step },
    { title: 'Audience', done: readOnly ? total > 0 : !!audience?.eligible && !audienceLoading, text: readOnly ? `${format(total)} prepared recipients` : audienceLoading ? 'Checking eligibility…' : `${format(audience?.eligible || 0)} eligible subscribers`, target: 'audience' as Step },
  ]
  const ready = checklist.every(item => item.done) && !audienceError
  const preview = useMemo(() => {
    let body = mode === 'classic' ? `<div style="font:15px/1.7 Arial,sans-serif;white-space:pre-wrap;padding:24px">${escapeHtml(form.body)}</div>` : form.body
    if (personalize) body = body.replaceAll('{{name}}', 'Alex Johnson').replaceAll('{{email}}', 'alex@example.com')
    return body || '<div style="font:14px Arial;color:#8491a6;text-align:center;padding:80px 20px">Your email preview will appear here.</div>'
  }, [form.body, mode, personalize])

  useEffect(() => {
    mounted.current = true
    api.crmCampaign(initial.id).then(result => { if (mounted.current) setDetail(result) }).catch(cause => { if (mounted.current) setError((cause as Error).message) })
    return () => { mounted.current = false; stop.current = true }
  }, [initial.id])
  useEffect(() => {
    let current = true; setAudienceLoading(true); setAudienceError('')
    api.crmCampaignAudience(form.segment_id).then(result => { if (current) setAudience(result) }).catch(cause => { if (current) setAudienceError((cause as Error).message) }).finally(() => { if (current) setAudienceLoading(false) })
    return () => { current = false }
  }, [form.segment_id])
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => { if (dirty || sending) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', handler); return () => window.removeEventListener('beforeunload', handler)
  }, [dirty, sending])

  function accept(result: CrmCampaignDetail) { setDetail(result); onChanged(result.campaign); setReportVersion(value => value + 1) }
  async function saveDraft() { const result = await api.crmSaveCampaign(form, initial.id); setSaved({ ...form }); onChanged(result); return result }
  async function save() {
    setBusy(true); setError(''); setNotice('')
    try { await saveDraft(); accept(await api.crmCampaign(initial.id)); setNotice('Draft saved.') }
    catch (cause) { setError((cause as Error).message) } finally { setBusy(false) }
  }
  function back() { if (sending) return; if (!dirty || window.confirm('Leave this campaign and discard unsaved changes?')) onBack() }
  async function loadTemplates(kind: 'template'|'pattern' = 'template') {
    setAssetKind(kind); setTemplatesOpen(true); setTemplateLoading(true); setError('')
    try { setTemplates(await api.crmEmailAssets(kind)) } catch (cause) { setError((cause as Error).message) } finally { setTemplateLoading(false) }
  }
  async function prepare() {
    setBusy(true); setError(''); setNotice('')
    try { await saveDraft(); accept(await api.crmLaunchCampaign(initial.id)); setConfirm(null); setStep('review'); setNotice('Audience prepared. Review the email, then choose Send campaign when ready.') }
    catch (cause) { setConfirm(null); setError((cause as Error).message) } finally { setBusy(false) }
  }
  async function send() {
    setConfirm(null); setBusy(true); setSending(true); setPaused(false); setError(''); setNotice(''); stop.current = false
    let pending = Number(detail?.counts.pending || 0)
    try {
      while (!stop.current && pending > 0) {
        const current = await api.crmSendCampaignBatch(initial.id)
        if (!mounted.current) return
        accept(current)
        const remaining = Number(current.counts.pending || 0)
        if (current.campaign.status !== 'sending' || remaining === 0) { setNotice(current.counts.processing ? 'Some deliveries are still processing. Refresh the report for their results.' : 'Sending finished. Review the delivery report.'); break }
        if (remaining >= pending) { setNotice('Sending paused because no further recipients were processed. Refresh the report before continuing.'); break }
        pending = remaining
      }
      if (mounted.current) { setStep('report'); if (stop.current) setNotice('Paused after the current batch. Remaining recipients have not been sent.') }
    } catch (cause) { if (mounted.current) setError(`Sending stopped: ${(cause as Error).message}. Refresh the report before resuming.`) }
    finally { if (mounted.current) { setSending(false); setBusy(false) } }
  }
  async function refresh() { setBusy(true); setError(''); try { accept(await api.crmCampaign(initial.id)) } catch (cause) { setError((cause as Error).message) } finally { setBusy(false) } }
  const checklistView = <div className="cc-checklist">{checklist.map(item => <button key={item.title} onClick={() => setStep(item.target)}><span className={item.done ? 'is-done' : ''}>{item.done ? <Check size={12}/> : <span/>}</span><div><strong>{item.title}</strong><small>{item.text}</small></div><ChevronRight size={14}/></button>)}</div>
  const previewPanel = <div className="cc-preview-panel"><div className="cc-preview-toolbar"><span><Eye size={14}/>Email preview</span><div><button aria-label="Desktop email preview" aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')}><Monitor size={16}/></button><button aria-label="Mobile email preview" aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')}><Smartphone size={16}/></button></div></div><div className="cc-inbox-header"><p><span>From</span>{audience?.sender.name || 'Configured sender'} <small>{audience?.sender.email}</small></p><p><span>Subject</span>{(personalize ? form.subject.replaceAll('{{name}}', 'Alex Johnson').replaceAll('{{email}}', 'alex@example.com') : form.subject) || 'No subject yet'}</p></div><div className={`cc-preview-stage cc-preview-stage--${device}`}><iframe title="Campaign email preview" sandbox="" srcDoc={preview}/></div><label className="cc-personalize"><input type="checkbox" checked={personalize} onChange={e => setPersonalize(e.target.checked)}/>Preview personalization with sample data</label></div>

  return <div className="cc-page">
    <div className="cc-breadcrumb"><button disabled={sending} onClick={back}><ArrowLeft size={15}/>Campaigns</button><span>/</span><span>{campaign.name}</span></div>
    <div className="cc-workspace-heading"><div className="cc-workspace-title"><span className="cc-workspace-icon"><Mail size={24}/></span><div><div><h1>{form.name || 'Untitled campaign'}</h1><CampaignStatus value={campaign.status}/></div><p>Created {campaignDate(campaign.created_at)}<span>·</span>{dirty ? 'Unsaved changes' : `Last saved ${campaignDate(campaign.updated_at)}`}</p></div></div><div className="cc-actions"><button className="cc-icon" aria-label="Refresh campaign report" disabled={busy} onClick={() => void refresh()}><RefreshCw size={16}/></button>{!readOnly && <button className="cc-button" disabled={busy || !form.name.trim()} onClick={() => void save()}>{busy ? 'Working…' : 'Save draft'}</button>}<button className="cc-button cc-button--primary" onClick={() => setStep(readOnly ? 'report' : 'review')}>{readOnly ? 'Delivery report' : 'Review campaign'}<ArrowRight size={14}/></button></div></div>
    {error && <p role="alert" className="cc-feedback cc-feedback--error"><CircleAlert size={16}/>{error}</p>}{notice && <p role="status" className="cc-feedback"><CheckCircle2 size={16}/>{notice}</p>}
    {sending && <div className="cc-send-progress" role="status"><Send size={18}/><div><strong>Sending campaign</strong><p>{resolved} of {total} recipients processed. Each batch contains up to 20 recipients.</p><div className="cc-progress"><i style={{ width: `${total ? resolved / total * 100 : 0}%` }}/></div></div><button className="cc-button" disabled={paused} onClick={() => { stop.current = true; setPaused(true) }}><Pause size={14}/>{paused ? 'Pausing after batch…' : 'Pause after batch'}</button></div>}
    <nav className="cc-workflow-nav" aria-label="Campaign workflow">{([{ id: 'content', title: 'Content', icon: FileText }, { id: 'audience', title: 'Audience', icon: Users }, { id: 'review', title: 'Review & send', icon: Eye }, { id: 'report', title: 'Delivery report', icon: Send }] as const).map((item, index) => <button key={item.id} aria-current={step === item.id ? 'page' : undefined} onClick={() => setStep(item.id)}><span>{index + 1}</span><item.icon size={15}/>{item.title}</button>)}</nav>

    {step === 'content' && <div className="cc-compose-layout cc-compose-layout--editor"><div className="cc-stack">
      <Panel title="Campaign details" subtitle="A clear subject gives your audience a reason to read."><fieldset className="cc-form-grid" disabled={readOnly || busy}><label className="cc-field"><span>Internal campaign name</span><input required maxLength={160} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></label><label className="cc-field"><span>Email subject <small>{form.subject.length}/190</small></span><input maxLength={190} placeholder="What would make your reader open this?" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}/></label></fieldset></Panel>
      <Panel title="Email content" subtitle={readOnly ? 'This campaign is locked because its audience has been prepared.' : 'Write, style, and arrange your message.'} action={!readOnly && <div className="cc-actions"><button className="cc-button" disabled={busy} onClick={() => void loadTemplates('pattern')}>Insert pattern</button><button className="cc-button" disabled={busy} onClick={() => void loadTemplates()}><LayoutTemplate size={14}/>Use a template</button></div>}><div className="cc-editor-surface"><CrmEmailEditor key={`${initial.id}-${form.editor_type}-${editorRevision}`} mode={mode} value={form.body} onChange={body => setForm(current => ({ ...current, body }))} disabled={readOnly || busy}/></div></Panel>
    </div><div className="cc-stack"><Panel title="Campaign checklist">{checklistView}</Panel><Panel title="Make it personal"><div className="cc-help"><p>Use these fields in the subject or content. Each recipient gets their own details.</p><code>{'{{name}}'}</code><code>{'{{email}}'}</code><p>An unsubscribe link is added automatically when the email is sent.</p></div></Panel><Panel title="Sender"><div className="cc-help"><strong>{audience?.sender.name || 'Configured sender'}</strong><p>{audience?.sender.email || 'Loading sender details…'}</p>{onOpenSettings && <button className="cc-text-button" onClick={() => { if (!dirty || window.confirm('Discard unsaved changes and open email settings?')) onOpenSettings() }}>Email settings <ArrowRight size={13}/></button>}</div></Panel><button className="cc-button cc-button--primary" onClick={() => setStep('audience')}>Continue to audience<ArrowRight size={14}/></button></div></div>}

    {step === 'audience' && <div className="cc-compose-layout"><Panel title="Choose your audience" subtitle={readOnly ? 'The prepared recipient list is fixed. Delivery checks subscription status again before sending.' : 'Only subscribed contacts with a valid email address are eligible.'}><div className="cc-padded"><label className="cc-field"><span>Send to</span><select disabled={readOnly || busy} value={form.segment_id ?? ''} onChange={e => setForm({ ...form, segment_id: Number(e.target.value) || null })}><option value="">All subscribed contacts</option>{segments.map(item => <option key={item.id} value={item.id}>{item.kind === 'list' ? 'List' : 'Tag'}: {item.name}</option>)}</select></label>{audienceError && <p role="alert" className="cc-feedback cc-feedback--error">{audienceError}</p>}<div className="cc-audience-hero"><span><Users size={27}/></span><div><strong>{audienceLoading ? '—' : format(readOnly ? total : audience?.eligible || 0)}</strong><p>{readOnly ? 'prepared recipients' : 'eligible subscribers'}</p></div><span className="cc-status cc-status--draft">{audienceName}</span></div>{!readOnly && <div className="cc-audience-breakdown"><div><span>Total in audience</span><strong>{audienceLoading ? '—' : audience?.total || 0}</strong></div><div><span>Excluded: not subscribed</span><strong>{audienceLoading ? '—' : audience?.unsubscribed || 0}</strong></div><div><span>Excluded: missing or invalid email</span><strong>{audienceLoading ? '—' : audience?.invalidEmail || 0}</strong></div></div>}<p className="cc-footnote">{readOnly ? 'Use the delivery report to inspect prepared recipients.' : 'Counts are checked again when you prepare the audience.'}</p></div></Panel><Panel title={readOnly ? 'Prepared audience' : 'Recipient sample'} subtitle={readOnly ? 'The delivery report contains the full prepared list.' : 'Up to five eligible contacts from the selected audience.'}><div className="cc-recipient-sample">{!readOnly && !audienceLoading && audience?.sample.map(item => <div key={item.id}><span>{item.name.split(/\s+/).slice(0, 2).map(word => word[0]).join('')}</span><div><strong>{item.name}</strong><small>{item.email}</small></div></div>)}{readOnly ? <button className="cc-button" onClick={() => setStep('report')}>View recipients<ArrowRight size={14}/></button> : !audienceLoading && !audience?.sample.length && <p className="cc-muted">No eligible subscribers in this audience yet.</p>}</div><div className="cc-panel-footer"><button className="cc-button cc-button--primary" onClick={() => setStep('review')}>Continue to review<ArrowRight size={14}/></button></div></Panel></div>}

    {step === 'review' && <div className="cc-review-layout">{previewPanel}<div className="cc-stack"><Panel title="Before you send">{checklistView}<div className="cc-review-action">{campaign.status === 'draft' ? <><p>Preparing the audience saves your draft and locks the content and recipient list. Sending is a separate step.</p><button className="cc-button cc-button--primary" disabled={busy || !ready} onClick={() => setConfirm('prepare')}><Users size={15}/>Prepare audience</button>{audienceError && <p className="cc-danger">{audienceError}</p>}</> : campaign.status === 'sending' ? <><p>{format(Number(counts.pending || 0))} recipients are waiting. Review the preview before sending.</p><button className="cc-button cc-button--primary" disabled={busy || !counts.pending} onClick={() => setConfirm('send')}><Send size={15}/>Send campaign</button></> : <><CampaignStatus value="sent"/><p>This campaign finished sending on {campaignDate(campaign.sent_at)}.</p><button className="cc-button" onClick={() => setStep('report')}>View delivery report<ArrowRight size={14}/></button></>}</div></Panel><div className="cc-review-note"><CircleAlert size={16}/><p>Preview uses sample personalization. Actual recipients receive their own name and email, plus an unsubscribe link.</p></div></div></div>}

    {step === 'report' && <div className="cc-stack"><div className="cc-metrics cc-metrics--report">{[{ label: 'Recipients', value: total, icon: <Users size={18}/> }, { label: 'Sent', value: Number(counts.sent || 0), icon: <Send size={18}/> }, { label: 'Waiting', value: Number(counts.pending || 0) + Number(counts.processing || 0), icon: <Clock3 size={18}/> }, { label: 'Failed', value: Number(counts.failed || 0), icon: <CircleAlert size={18}/> }].map(item => <div className="cc-metric" key={item.label}><span>{item.icon}</span><div><small>{item.label}</small><strong>{format(item.value)}</strong></div></div>)}</div><Panel title="Delivery progress" action={<div className="cc-actions"><button className="cc-button" disabled={busy} onClick={() => void refresh()}><RefreshCw size={13}/>Refresh</button>{campaign.status === 'sending' && !!counts.pending && <button className="cc-button cc-button--primary" disabled={busy} onClick={() => setConfirm('send')}><Send size={14}/>{counts.sent ? 'Resume sending' : 'Send campaign'}</button>}</div>}><div className="cc-report-summary"><div className="cc-progress cc-progress--large">{(['sent', 'failed', 'skipped', 'processing', 'pending'] as const).map(value => <span key={value} className={`cc-progress-${value}`} style={{ width: `${total ? Number(counts[value] || 0) / total * 100 : 0}%` }}/>)}</div><div className="cc-report-legend">{['sent', 'pending', 'processing', 'failed', 'skipped'].map(value => <span key={value}><i className={`cc-progress-${value}`}/>{value.charAt(0).toUpperCase() + value.slice(1)} <strong>{counts[value] || 0}</strong></span>)}</div><p>{campaign.status === 'draft' ? 'Prepare an audience from Review & send to create delivery records.' : `${format(resolved)} of ${format(total)} recipients processed.`} Sent means the mail service accepted the message; open signals appear in the recipient report below. Image blocking and privacy features affect accuracy.</p></div></Panel><DeliveryReport id={initial.id} version={reportVersion}/></div>}

    {templatesOpen && <CampaignDialog title={assetKind === 'template' ? 'Start from a saved template' : 'Insert a reusable pattern'} busy={busy} onClose={() => setTemplatesOpen(false)}><div className="cc-dialog-body">{error && <p role="alert" className="cc-feedback cc-feedback--error">{error}</p>}{templateLoading ? <p className="cc-muted">Loading designs…</p> : templates.length ? <div className="cc-template-list">{templates.map(template => <button key={template.id} onClick={() => { if (assetKind === 'template' && form.body.trim() && !window.confirm('Replace the current email content with this template?')) return; if (assetKind === 'pattern' && mode !== 'html' && !window.confirm('Insert this pattern and continue editing this email as HTML? Your current content will be kept.')) return; setForm(current => { const base = mode === 'classic' ? `<div style="white-space:pre-wrap">${escapeHtml(current.body)}</div>` : current.body; const fragment = new DOMParser().parseFromString(template.body, 'text/html').body.innerHTML; const body = assetKind === 'template' ? template.body : /<\/body\s*>/i.test(base) ? base.replace(/<\/body\s*>/i, () => fragment + '</body>') : base + fragment; return { ...current, subject: assetKind === 'template' ? template.subject || current.subject : current.subject, body, editor_type: 'html' } }); setEditorRevision(value => value + 1); setTemplatesOpen(false) }}><LayoutTemplate size={20}/><span><strong>{template.name}</strong><small>{template.subject || 'No subject'}</small></span><ArrowRight size={15}/></button>)}</div> : <CampaignEmpty title={`No saved ${assetKind}s yet`}>Create reusable designs under Emails / Templates or Patterns, then use them here.</CampaignEmpty>}</div><footer><button className="cc-button" onClick={() => setTemplatesOpen(false)}>Close</button></footer></CampaignDialog>}
    {confirm && <CampaignDialog title={confirm === 'prepare' ? 'Prepare this audience?' : 'Send this campaign?'} busy={busy} onClose={() => setConfirm(null)}><div className="cc-dialog-body"><div className="cc-confirm-summary"><Mail size={22}/><div><strong>{form.subject}</strong><p>{audienceName}</p></div></div><p>{confirm === 'prepare' ? `Save and lock this campaign for approximately ${format(audience?.eligible || 0)} eligible subscribers? No email is sent by this step.` : `Send “${campaign.name}” to ${format(Number(counts.pending || 0))} waiting recipients now? Emails already sent cannot be recalled.`}</p></div><footer><button className="cc-button" disabled={busy} onClick={() => setConfirm(null)}>Cancel</button><button className="cc-button cc-button--primary" disabled={busy} onClick={() => void (confirm === 'prepare' ? prepare() : send())}>{busy ? 'Preparing…' : confirm === 'prepare' ? 'Prepare audience' : 'Send campaign'}<ArrowRight size={14}/></button></footer></CampaignDialog>}
  </div>
}

function DeliveryReport({ id, version }: { id: number; version: number }) {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof api.crmCampaignDeliveries>> | null>(null)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let current = true; setLoading(true); setError('')
    const timer = window.setTimeout(() => { api.crmCampaignDeliveries(id, page, status, search).then(result => { if (current) setRows(result) }).catch(cause => { if (current) setError((cause as Error).message) }).finally(() => { if (current) setLoading(false) }) }, search ? 250 : 0)
    return () => { current = false; window.clearTimeout(timer) }
  }, [id, page, status, search, version])
  function exportPage() {
    const safe = (value: string | null) => `"${(/^[=+@\-\t\r]/.test(value || '') ? "'" : '') + (value || '').replaceAll('"', '""')}"`
    const csv = [['Name', 'Email', 'Status', 'Sent at', 'First opened', 'Last opened', 'Open count', 'Tracking enabled', 'Error'], ...(rows?.data.map(row => [row.name, row.email, row.status, row.sent_at, row.opened_at, row.last_opened_at, String(row.open_count), row.tracked_at ? 'Yes' : 'No', row.error]) || [])].map(row => row.map(safe).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `campaign-${id}-deliveries-page-${page}.csv`; anchor.click(); URL.revokeObjectURL(url)
  }
  return <Panel title="Recipient delivery report" action={<button className="cc-button" disabled={loading || !rows?.data.length} onClick={exportPage}><Download size={14}/>Export this page</button>}><div className="cc-toolbar"><label className="cc-search"><Search size={15}/><input aria-label="Search recipients" placeholder="Search by name or email…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}/></label><select aria-label="Delivery status" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}><option value="">All delivery statuses</option>{['opened', 'unopened', 'pending', 'processing', 'sent', 'failed', 'skipped'].map(value => <option key={value} value={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</option>)}</select></div>{error && <p role="alert" className="cc-feedback cc-feedback--error">{error}</p>}{loading ? <div className="cc-loading">Loading recipients…</div> : rows?.data.length ? <div className="cc-table-wrap"><table><thead><tr><th>Recipient</th><th>Status</th><th>Sent on</th><th>Open tracking</th><th>Details</th></tr></thead><tbody>{rows.data.map(row => <tr key={row.id}><td><strong>{row.name}</strong><small>{row.email || 'No email address'}</small></td><td><CampaignStatus value={row.status}/></td><td>{row.sent_at ? campaignDate(row.sent_at) : '—'}</td><td><CrmEmailOpenStatus delivery={row}/></td><td className="cc-report-error">{row.error || (row.status === 'skipped' ? 'Not subscribed or invalid email at send time.' : '—')}</td></tr>)}</tbody></table></div> : <CampaignEmpty title="No matching delivery records">Prepare an audience or adjust the search and status filter.</CampaignEmpty>}<footer className="cc-pagination"><span>{rows?.total || 0} matching recipients</span><div><button className="cc-icon" disabled={loading || page <= 1} aria-label="Previous recipient page" onClick={() => setPage(value => value - 1)}><ChevronLeft size={16}/></button><span>Page {page} of {rows?.last_page || 1}</span><button className="cc-icon" disabled={loading || page >= (rows?.last_page || 1)} aria-label="Next recipient page" onClick={() => setPage(value => value + 1)}><ChevronRight size={16}/></button></div></footer></Panel>
}
