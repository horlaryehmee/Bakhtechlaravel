import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { LockKeyhole } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api, getAdminToken, setAdminToken } from '@/lib/api'

export function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@bakhtech.com.ng')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (getAdminToken()) {
    return <Navigate to="/admin/dashboard" replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await api.login(email, password)
      setAdminToken(result.token)
      navigate('/admin/dashboard')
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to sign in.')
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
            <h1 className="text-2xl font-black">Sign in to dashboard</h1>
          </div>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-bold">
            Email
            <input
              className="theme-input min-h-12 rounded-xl px-4 outline-none"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="grid gap-2 text-sm font-bold">
            Password
            <input
              className="theme-input min-h-12 rounded-xl px-4 outline-none"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Default: ChangeMe123!"
              required
            />
          </label>

          {error ? <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-500">{error}</p> : null}

          <Button className="mt-2 w-full rounded-xl" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </section>
    </main>
  )
}
