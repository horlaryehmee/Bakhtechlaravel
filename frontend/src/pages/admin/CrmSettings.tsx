import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Mail, RefreshCw, Send, Settings2 } from 'lucide-react'
import { api, type MailSettings, type SiteEmailLog } from '@/lib/api'

const empty: MailSettings = { enabled: false, host: '', port: 587, encryption: 'tls', username: '', password: '', hasPassword: false, fromAddress: '', fromName: '' }
const input = 'mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900'

export function CrmSettings({ onOpenAppSettings }: { onOpenAppSettings?: () => void }) {
  const [section, setSection] = useState<'email' | 'delivery' | 'demo'>('email')
  const [demoCount, setDemoCount] = useState<number | null>(null)
  const [settings, setSettings] = useState<MailSettings>(empty)
  const [logsLoading,setLogsLoading]=useState(false)
  const [logSearch,setLogSearch]=useState(''),[logStatus,setLogStatus]=useState('')
  const [savedSettings,setSavedSettings]=useState('')
  const [logs, setLogs] = useState<SiteEmailLog[]>([])
  const [recipient, setRecipient] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function loadSettings() {
    setLoading(true); setError('')
    try { const result=(await api.mailSettings()).settings;setSettings(result);setSavedSettings(JSON.stringify(result)) }
    catch (e) { setError((e as Error).message) }
    finally { setLoading(false) }
  }
  async function loadLogs() {
    setError('');setLogsLoading(true)
    try { setLogs((await api.siteEmailLogs({ perPage: 100 })).logs) }
    catch (e) { setError((e as Error).message) }
    finally {setLogsLoading(false)}
  }
  useEffect(() => { void loadSettings() }, [])
  useEffect(() => { api.crmDemoStatus().then(result => setDemoCount(result.contacts)).catch(() => {}) }, [])
  useEffect(() => { if (section === 'delivery') void loadLogs() }, [section])

  async function save() {
    setBusy(true); setError(''); setNotice('')
    try { const result=(await api.updateMailSettings(settings)).settings;setSettings(result);setSavedSettings(JSON.stringify(result)); setNotice('Email settings saved.') }
    catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }
  async function sendTest() {
    setBusy(true); setError(''); setNotice('')
    try { setNotice((await api.testMail(recipient)).message); await loadLogs() }
    catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }
  async function updateDemo(clear: boolean) {
    if (clear && !window.confirm(`Clear ${demoCount} demo contacts and their sample CRM records?`)) return
    setBusy(true); setError(''); setNotice('')
    try {
      if (clear) { const result = await api.crmDemoClear(); setDemoCount(0); setNotice(`Cleared ${result.cleared} demo contacts.`) }
      else { const result = await api.crmDemoSeed(); setDemoCount(result.contacts); setNotice(`Added ${result.contacts} demo contacts.`) }
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }
  const update = <K extends keyof MailSettings>(key: K, value: MailSettings[K]) => setSettings(current => ({ ...current, [key]: value }))

  return <div className="cc-page ca-page ca-settings space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-lg font-semibold">Settings</h1><p className="mt-1 text-sm text-slate-500">Configure the sender used by CRM campaigns, sequences, and other site email.</p></div>{onOpenAppSettings && <button type="button" className="crm-secondary-action" onClick={onOpenAppSettings}>All site settings</button>}</div>
    <nav className="flex gap-2 border-b border-slate-200" aria-label="CRM settings sections"><button type="button" className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm ${section === 'email' ? 'border-blue-600 font-semibold text-blue-700' : 'border-transparent text-slate-500'}`} onClick={() => setSection('email')}><Settings2 size={15}/> Email Settings</button><button type="button" className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm ${section === 'delivery' ? 'border-blue-600 font-semibold text-blue-700' : 'border-transparent text-slate-500'}`} onClick={() => setSection('delivery')}><Mail size={15}/> Email Delivery</button>{demoCount !== null && <button type="button" className={`border-b-2 px-3 py-3 text-sm ${section === 'demo' ? 'border-blue-600 font-semibold text-blue-700' : 'border-transparent text-slate-500'}`} onClick={() => setSection('demo')}>Demo Data</button>}</nav>
    {error && <p role="alert" className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={16}/>{error}</p>}
    {notice && <p role="status" className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700"><CheckCircle2 size={16}/>{notice}</p>}
    {section === 'demo' ? <section className="max-w-4xl rounded-lg border bg-white p-5 dark:bg-slate-900"><h2 className="font-semibold">CRM demo data</h2><p className="mt-1 text-sm text-slate-500">{demoCount} sample contacts with companies, deals, tasks, activity, and a project. Sample contacts are unsubscribed and will not receive campaign emails.</p><div className="mt-5 flex gap-3"><button type="button" disabled={busy || !!demoCount} className="crm-primary-button disabled:opacity-50" onClick={() => void updateDemo(false)}>Add demo data</button><button type="button" disabled={busy || !demoCount} className="crm-secondary-action disabled:opacity-50" onClick={() => void updateDemo(true)}>Clear demo data</button></div><p className="mt-3 text-xs text-slate-500">Clearing removes only records tracked as demo data.</p></section> : loading ? <p className="text-sm text-slate-500">Loading settings…</p> : section === 'email' ? <form onSubmit={e=>{e.preventDefault();void save()}} className="rounded-lg border bg-white p-5 dark:bg-slate-900">
      <fieldset disabled={busy}><div className="mb-5 flex items-center justify-between gap-3 border-b pb-4"><div><h2 className="font-semibold">Sender & SMTP</h2><p className="mt-1 text-xs text-slate-500">Changes to the sender apply to all outbound mail from this app.</p></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.enabled} onChange={e => update('enabled', e.target.checked)}/> Enable SMTP</label></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">From Name<input className={input} value={settings.fromName} onChange={e => update('fromName', e.target.value)} /></label>
        <label className="text-sm font-medium">From Email<input type="email" required={settings.enabled} className={input} value={settings.fromAddress} onChange={e => update('fromAddress', e.target.value)} /></label>
        <label className="text-sm font-medium">SMTP Host<input className={input} required={settings.enabled} value={settings.host} placeholder="smtp.example.com" onChange={e => update('host', e.target.value)} /></label>
        <label className="text-sm font-medium">Port<input type="number" min="1" max="65535" className={input} value={settings.port} onChange={e => update('port', Number(e.target.value))} /></label>
        <label className="text-sm font-medium">Encryption<select className={input} value={settings.encryption} onChange={e => update('encryption', e.target.value as MailSettings['encryption'])}><option value="tls">TLS</option><option value="ssl">SSL</option><option value="none">None</option></select></label>
        <label className="text-sm font-medium">Username<input className={input} autoComplete="username" value={settings.username} onChange={e => update('username', e.target.value)} /></label>
        <label className="text-sm font-medium sm:col-span-2">Password<input type="password" autoComplete="new-password" className={input} value={settings.password} placeholder={settings.hasPassword ? 'Saved password — leave blank to keep it' : 'SMTP password'} onChange={e => update('password', e.target.value)} /></label>
      </div>
      <div className="mt-5 flex justify-end"><button type="submit" disabled={busy||JSON.stringify(settings)===savedSettings} className="crm-primary-button disabled:opacity-50">{busy?'Saving...':'Save settings'}</button></div></fieldset>
    </form> : <div className="space-y-5">
      <section className="max-w-4xl rounded-lg border bg-white p-5 dark:bg-slate-900"><h2 className="font-semibold">Send a test email</h2><p className="mt-1 text-xs text-slate-500">Save your sender settings first. Tests use the saved configuration and appear in the delivery log.</p><div className="mt-4 flex flex-wrap gap-2"><input type="email" aria-label="Test recipient email" className={`${input} mt-0 min-w-[240px] flex-1`} placeholder="you@example.com" value={recipient} onChange={e => setRecipient(e.target.value)}/><button type="button" disabled={busy || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)||JSON.stringify(settings)!==savedSettings} className="crm-primary-button disabled:opacity-50" onClick={() => void sendTest()}><Send size={14}/> Send Test</button></div></section>
      <section className="overflow-hidden rounded-lg border bg-white dark:bg-slate-900"><div className="flex items-center justify-between border-b px-5 py-4"><h2 className="font-semibold">Recent delivery activity</h2><button type="button" className="crm-secondary-action flex items-center gap-2" disabled={logsLoading} onClick={() => void loadLogs()}><RefreshCw size={14}/> Refresh</button></div><div className="cc-toolbar"><label className="cc-search"><input aria-label="Search delivery logs" placeholder="Search recipient or subject..." value={logSearch} onChange={e=>setLogSearch(e.target.value)}/></label><select aria-label="Delivery status" value={logStatus} onChange={e=>setLogStatus(e.target.value)}><option value="">All statuses</option><option value="sent">Sent</option><option value="failed">Failed</option></select><span className="ca-hint">Latest 100 deliveries</span></div>{logsLoading&&<p className="cc-loading">Loading deliveries...</p>}<div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead><tr><th className="px-5 py-3">Recipient</th><th className="px-5 py-3">Subject</th><th className="px-5 py-3">Source</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Date</th></tr></thead><tbody>{logs.filter(log=>(!logStatus||log.status===logStatus)&&`${log.recipient} ${log.subject}`.toLowerCase().includes(logSearch.toLowerCase())).map(log => <tr key={log.id} className="border-t"><td className="px-5 py-3">{log.recipient}</td><td className="px-5 py-3">{log.subject}</td><td className="px-5 py-3">{log.source || '—'}</td><td className="px-5 py-3"><span title={log.errorMessage || undefined} className={log.status === 'sent' ? 'text-green-700' : 'text-red-700'}>{log.status}</span>{log.errorMessage&&<details className="mt-2"><summary>View error</summary><p className="mt-2 text-xs text-red-600">{log.errorMessage}</p></details>}</td><td className="px-5 py-3 text-slate-500">{log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}</td></tr>)}{!logsLoading&&!logs.some(log=>(!logStatus||log.status===logStatus)&&`${log.recipient} ${log.subject}`.toLowerCase().includes(logSearch.toLowerCase())) && <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-500">No email deliveries match the current filters.</td></tr>}</tbody></table></div></section>
    </div>}
  </div>
}
