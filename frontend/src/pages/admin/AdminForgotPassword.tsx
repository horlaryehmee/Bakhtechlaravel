import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

export function AdminForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      const result = await api.requestAdminPasswordReset(email)
      setMessage(result.message)
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Unable to send reset link.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--background)] px-4 py-10 text-[var(--foreground)]">
      <section className="surface-card w-full max-w-md rounded-2xl p-6 shadow-[var(--shadow-soft)] md:p-8">
        <div className="mb-8 flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#1261ff] text-white">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#1261ff]">Admin</p>
            <h1 className="text-2xl font-black">Reset password</h1>
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

          {message ? <p className="rounded-xl bg-green-500/10 px-4 py-3 text-sm font-bold text-green-600">{message}</p> : null}
          {error ? <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm font-bold text-red-500">{error}</p> : null}

          <Button className="mt-2 w-full rounded-xl" type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </Button>
          <Link className="text-center text-sm font-bold text-[#1261ff] hover:underline" to="/admin/login">
            Back to sign in
          </Link>
        </form>
      </section>
    </main>
  )
}

