import { type FormEvent, useMemo, useState } from 'react'
import { Mail, MapPin, Phone } from 'lucide-react'
import { Boxes } from '@/components/ui/background-boxes'
import { BorderBeam } from '@/components/ui/border-beam'
import { Button } from '@/components/ui/button'
import { contactItems } from '@/data/site'
import { ApiError, api } from '@/lib/api'

function contactHref(label: string, value: string) {
  if (label.toLowerCase() === 'email') return `mailto:${value}`
  if (label.toLowerCase() === 'phone') return `tel:${value.replace(/\s+/g, '')}`
  return undefined
}

function ContactIcon({ label }: { label: string }) {
  if (label.toLowerCase() === 'email') return <Mail className="h-4 w-4" />
  if (label.toLowerCase() === 'phone') return <Phone className="h-4 w-4" />
  return <MapPin className="h-4 w-4" />
}

export function Contact() {
  const submittedAt = useMemo(() => Math.floor(Date.now() / 1000), [])
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    website: '',
    company: '',
  })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [feedback, setFeedback] = useState('')

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    if (status !== 'sending') {
      setStatus('idle')
      setFeedback('')
    }
  }

  async function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('sending')
    setFeedback('')

    try {
      const result = await api.submitContact({
        ...form,
        submittedAt,
      })

      setStatus('sent')
      setFeedback(result.message || 'Thanks. Your message has been received.')
      setForm({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
        website: '',
        company: '',
      })
    } catch (error) {
      setStatus('error')
      setFeedback(error instanceof ApiError && error.status === 422
        ? 'Please check your details and write a clear message.'
        : error instanceof Error ? error.message : 'Unable to send your message right now.')
    }
  }

  return (
    <main className="contact-page home-page overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_18%_18%,rgba(239,68,68,0.13),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(88,125,159,0.16),transparent_34%),var(--background)] pb-16 pt-32 md:pb-24 md:pt-36">
        <Boxes className="portfolio-bg-effect opacity-35" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,var(--background)_0%,transparent_34%,var(--background)_100%)]" />

        <div className="container-x relative z-30">
          <div className="mx-auto max-w-4xl text-center">
            <p className="home-eyebrow mb-4 text-sm uppercase text-[#ef4444]">Contact Us</p>
            <h1 className="text-balance text-5xl font-black leading-[0.95] tracking-tight md:text-7xl">
              Let&apos;s build something useful.
            </h1>
            <p className="text-soft mx-auto mt-5 max-w-2xl text-base leading-8 md:text-lg">
              Choose a direction, send the brief, and we will reply with the next step.
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-6xl gap-5 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
            <aside className="surface-card rounded-2xl p-5 md:p-8">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#587d9f]">Start Here</p>
              <h2 className="mt-3 text-balance text-3xl font-black tracking-tight md:text-4xl">
                Send the details. We will handle the next step.
              </h2>
              <p className="text-soft mt-4 leading-8">
                Share what you need, and we will reply with a clear direction for your website or digital product.
              </p>

              <div className="mt-8 grid gap-3">
                {contactItems.map((item) => {
                  const href = contactHref(item.label, item.value)
                  const content = (
                    <>
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#ef4444]/10 text-[#ef4444]">
                        <ContactIcon label={item.label} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-black uppercase tracking-[0.16em] text-[var(--foreground)]/45">{item.label}</span>
                        <span className="mt-1 block break-words text-sm font-bold leading-6">{item.value}</span>
                      </span>
                    </>
                  )

                  return href ? (
                    <a key={item.label} href={href} className="flex gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4 transition hover:bg-[var(--surface)]">
                      {content}
                    </a>
                  ) : (
                    <article key={item.label} className="flex gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
                      {content}
                    </article>
                  )
                })}
              </div>
            </aside>

            <div className="surface-card relative overflow-hidden rounded-2xl p-5 md:p-8">
              <BorderBeam size={280} duration={8} borderWidth={1.8} colorFrom="#ef4444" colorTo="#587d9f" />
              <form className="relative z-10 grid gap-6" onSubmit={submitContact}>
                <div className="hidden" aria-hidden="true">
                  <label>
                    Website
                    <input tabIndex={-1} autoComplete="off" name="website" value={form.website} onChange={(event) => updateField('website', event.target.value)} />
                  </label>
                  <label>
                    Company
                    <input tabIndex={-1} autoComplete="off" name="company" value={form.company} onChange={(event) => updateField('company', event.target.value)} />
                  </label>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <label className="grid gap-2 text-sm font-bold">
                    Name
                    <input className="theme-input min-h-12 rounded-xl px-4 outline-none" name="name" autoComplete="name" value={form.name} onChange={(event) => updateField('name', event.target.value)} required minLength={2} maxLength={120} />
                  </label>
                  <label className="grid gap-2 text-sm font-bold">
                    Email
                    <input className="theme-input min-h-12 rounded-xl px-4 outline-none" name="email" type="email" autoComplete="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} required maxLength={190} />
                  </label>
                </div>

                <label className="grid gap-2 text-sm font-bold">
                  Phone
                  <input className="theme-input min-h-12 rounded-xl px-4 outline-none" name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} maxLength={60} />
                </label>

                <label className="grid gap-2 text-sm font-bold">
                  Subject
                  <input className="theme-input min-h-12 rounded-xl px-4 outline-none" name="subject" value={form.subject} onChange={(event) => updateField('subject', event.target.value)} maxLength={160} />
                </label>

                <label className="grid gap-2 text-sm font-bold">
                  Message
                  <textarea
                    className="theme-input min-h-44 resize-y rounded-xl px-4 py-3 outline-none"
                    name="message"
                    placeholder="What are we building?"
                    value={form.message}
                    onChange={(event) => updateField('message', event.target.value)}
                    required
                    minLength={20}
                    maxLength={5000}
                  />
                </label>

                {feedback ? (
                  <p className={status === 'error' ? 'rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-600' : 'rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-600'}>
                    {feedback}
                  </p>
                ) : null}

                <Button type="submit" showArrow disabled={status === 'sending'} className="min-h-12 rounded-xl bg-[#ef4444] px-6 font-black text-white shadow-none hover:bg-[#dc2626] disabled:pointer-events-none disabled:opacity-70">
                  {status === 'sending' ? 'Sending...' : 'Send message'}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
