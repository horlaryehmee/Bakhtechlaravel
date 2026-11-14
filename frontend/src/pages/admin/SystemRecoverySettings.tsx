import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export function SystemRecoverySettings() {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.recoveryStatus>> | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [restore, setRestore] = useState('')
  const [confirmation, setConfirmation] = useState('')
  useEffect(() => {
    let active = true
    const refresh = () => api.recoveryStatus().then((result) => {
      if (active) { setData(result); setError('') }
    }).catch(() => { if (active) setError('Status unavailable. The site may be in maintenance mode; checking again automatically.') })
    void refresh()
    const timer = window.setInterval(() => void refresh(), 5000)
    return () => { active = false; window.clearInterval(timer) }
  }, [])
  const busy = pending || ['queued', 'running'].includes(data?.operation?.status || '')
  async function run(action: 'update' | 'backup' | 'restore') {
    setPending(true)
    setError('')
    try {
      await api.recoveryOperation(action, action === 'restore' ? restore : undefined, action === 'restore' ? confirmation : undefined)
      setData(await api.recoveryStatus())
      setRestore(''); setConfirmation('')
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to start operation.') }
    finally { setPending(false) }
  }
  const button = 'rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white disabled:opacity-40'
  return <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
    <h3 className="text-xl font-black text-gray-900">Version updates & backups</h3>
    <p className="mt-2 text-sm text-gray-600">Update from GitHub with an automatic recovery backup, Composer dependencies, migrations, and cache rebuilds. The site briefly enters maintenance mode.</p>
    <p className="my-3 break-all text-xs text-gray-500">Installed version: {data?.version || 'Loading…'}</p>
    {data && !data.enabled && <p className="my-3 text-sm text-amber-800">Server setup required: enable maintenance and configure the Git checkout, private backup directory, and scheduler on your Linux hosting.</p>}
    <div className="flex flex-wrap gap-3">
      <button type="button" className={button} disabled={!data?.enabled || busy} onClick={() => void run('update')}>Update from GitHub</button>
      <button type="button" className={button} disabled={!data?.enabled || busy} onClick={() => void run('backup')}>Back up files & database</button>
    </div>
    {data?.operation && <p role="status" className="mt-4 text-sm">{data.operation.status}: {data.operation.message} {data.operation.status === 'queued' && 'The scheduler normally starts within a minute. You can leave this page.'}</p>}
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    <div className="mt-5 space-y-3">{data?.backups.map((backup) => <div key={backup.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
      <div><p className="text-sm font-bold">{new Date(backup.createdAt).toLocaleString()}</p><p className="text-xs text-gray-500">{(backup.bytes / 1048576).toFixed(1)} MB · {backup.version.slice(0, 12)}</p></div>
      <button type="button" className={button} disabled={busy || !data.enabled} onClick={() => { setRestore(backup.id); setConfirmation('') }}>Restore…</button>
    </div>)}</div>
    {restore && <div className="mt-4 rounded-xl bg-amber-50 p-4">
      <p className="text-sm text-amber-900">Restore {restore}? This replaces backed-up files and database records. Newer files absent from the backup remain. A safety backup is created first. Type RESTORE to continue.</p>
      <input aria-label="Restore confirmation" className="my-3 rounded border bg-white p-2" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
      <div className="flex gap-3"><button type="button" className={button} disabled={busy || confirmation !== 'RESTORE'} onClick={() => void run('restore')}>Confirm restore</button><button type="button" onClick={() => setRestore('')}>Cancel</button></div>
    </div>}
  </section>
}
