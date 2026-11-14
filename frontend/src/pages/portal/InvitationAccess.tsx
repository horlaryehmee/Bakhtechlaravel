import { useEffect, useState } from 'react'
import { whiteBakhtechLogo } from '@/data/brand-assets'

const requests = new Map<string, Promise<{ token?: string; message?: string }>>()
export function InvitationAccess({ secret, onComplete }: { secret: string; onComplete: (token?: string, message?: string) => void }) {
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    window.history.replaceState({}, '', '/portal')
    sessionStorage.removeItem('bakhtech-portal-token')
    if (!requests.has(secret)) requests.set(secret, fetch('/api/portal/invitation/exchange', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ secret }), cache: 'no-store' }).then(async r => { if (!r.ok) throw new Error('This invitation could not be opened. Please sign in or ask your project manager for a new link.'); return r.json() }))
    requests.get(secret)!.then(result => { if (active) { onComplete(result.token, result.message); requests.delete(secret) } }).catch(e => { if (active) { setError(e.message); requests.delete(secret) } })
    return () => { active = false }
  }, [secret, onComplete])
  return <div className="pw pw-invitation"><section><div className="pw-invitation-brand"><img src={whiteBakhtechLogo} alt="Bakhtech Solutions" /></div><h1>{error ? 'Let’s get you signed in.' : 'Opening your workspace…'}</h1>{error ? <><p role="alert">{error}</p><button className="pw-button primary" onClick={() => onComplete(undefined, error)}>Go to sign in</button></> : <p role="status">Verifying your private invitation.</p>}<small>Anyone with your invitation link can access your portal. Keep it private.</small></section></div>
}
