import { useEffect, useState } from 'react'

let completion: Promise<{ token: string }> | undefined
const errors: Record<string, string> = {
  disabled: 'Google sign-in is not enabled yet. Please use your email and password.',
  expired: 'Your Google sign-in request expired. Please try again.',
  cancelled: 'Google sign-in was cancelled. You can try again or use your password.',
  failed: 'Google sign-in could not be completed. Please try again or contact your project manager.',
  unverified: 'Google could not verify your email address.',
  no_account: 'No eligible active client account matches this Google account. Ask your project manager to add your Gmail or Google Workspace email.',
}

export function GoogleLogin({ onSignedIn }: { onSignedIn: () => void }) {
  const [enabled, setEnabled] = useState(false)
  const query = new URLSearchParams(window.location.search)
  const [message, setMessage] = useState(errors[query.get('google_error') || ''] || '')
  const [pending, setPending] = useState(query.has('google_complete'))
  useEffect(() => {
    let active = true
    fetch('/api/portal/google-availability').then(r => r.json()).then(data => { if (active) setEnabled(data.enabled) }).catch(() => {})
    if (new URLSearchParams(window.location.search).has('google_complete')) {
      completion ??= fetch('/auth/google/complete', { credentials: 'same-origin', headers: { Accept: 'application/json' }, cache: 'no-store' }).then(async r => { if (!r.ok) throw new Error('Your sign-in session expired. Please try again.'); return r.json() })
      completion.then(result => {
        if (!active) return
        sessionStorage.setItem('bakhtech-portal-token', result.token)
        window.history.replaceState({}, '', '/portal')
        onSignedIn()
      }).catch(e => { if (active) { setMessage(e.message); setPending(false); completion = undefined; window.history.replaceState({}, '', '/portal') } })
    }
    return () => { active = false }
  }, [onSignedIn])
  return <>{message && <div className="pw-alert" role="alert">{message}</div>}{pending ? <p role="status">Completing Google sign-in…</p> : enabled && <><a className="pw-google-button" href="/auth/google/start"><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5h6.6c3.9-3.6 6.1-8.8 6.1-14.9Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5c-1.8 1.2-4.1 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2A20.4 20.4 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.2H5.8a20 20 0 0 0 0 17.6l6.8-5.2Z"/><path fill="#EA4335" d="M24 12c3 0 5.6 1 7.7 3l5.8-5.8A19.5 19.5 0 0 0 24 4 20.4 20.4 0 0 0 5.8 15.2l6.8 5.2C14.2 15.6 18.7 12 24 12Z"/></svg>Sign in with Google</a><div className="pw-login-divider"><span>or sign in with email</span></div></>}</>
}
