import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { LockKeyhole } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

export function AdminResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialEmail = useMemo(() => searchParams.get('email') || '', [searchParams])
  const token = useMemo(() => searchParams.get('token') || '', [searchParams])
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (password !== passwordConfirmation) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const result = await api.resetAdminPassword({ email, token, password, passwordConfirmation })
      setMessage(result.message)
      window.setTimeout(() => navigate('/admin/login', { replace: true }), 1200)
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Unable to reset password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--background)] px-4 py-10 text-[var(--foreground)]">
      <section className="surface-card w-full max-w-md rounded-2xl p-6 shadow-[var(--shadow-soft)] md:p-8">
        <div className="mb-8 flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#1261ff] text-white">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#1261ff]">Admin</p>
            <h1 className="text-2xl font-black">Create new password</h1>
          </div>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-bold">
            Admin email
            <input
              className="theme-input min-h-12 rounded-xl px-4 outline-none"
              type="email"
              value={email}
              autoComplete="username"
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="grid gap-2 text-sm font-bold">
            New password
            <input
              className="theme-input min-h-12 rounded-xl px-4 outline-none"
              type="password"
              value={password}
              minLength={8}
              autoComplete="new-password"
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <label className="grid gap-2 text-sm font-bold">
            Confirm password
            <input
              className="theme-input min-h-12 rounded-xl px-4 outline-none"
              type="password"
              value={passwordConfirmation}
              minLength={8}
              autoComplete="new-password"
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              required
            />
          </label>

          {message ? <p className="rounded-xl bg-green-500/10 px-4 py-3 text-sm font-bold text-green-600">{message}</p> : null}
          {error ? <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-500">{error}</p> : null}

          <Button className="mt-2 w-full rounded-xl" type="submit" disabled={loading || !token}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </Button>
          <Link className="text-center text-sm font-bold text-[#1261ff] hover:underline" to="/admin/login">
            Back to sign in
          </Link>
        </form>
      </section>
    </main>
  )
}

