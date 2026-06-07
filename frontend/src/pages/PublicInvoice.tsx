import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, CreditCard, Download, Loader2, MousePointerClick, ShieldCheck, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api, type InvoiceDocument } from '@/lib/api'
import { cn } from '@/lib/utils'

function sessionId() {
  const key = 'bakhtech-invoice-session'
  const existing = sessionStorage.getItem(key)
  if (existing) return existing
  const next = crypto.randomUUID()
  sessionStorage.setItem(key, next)
  return next
}

function money(amount: number, currency: string) {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(Number(amount || 0))
}

export function PublicInvoice() {
  const { token = '' } = useParams()
  const [document, setDocument] = useState<InvoiceDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const sid = useMemo(sessionId, [])

  useEffect(() => {
    let cancelled = false

    async function loadDocument() {
      setLoading(true)
      setError('')
      try {
        const result = await api.publicInvoiceDocument(token)
        if (cancelled) return
        setDocument(result.document)
        await api.trackInvoiceEvent(token, { eventType: 'document.viewed', sessionId: sid }).catch(() => undefined)
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Unable to load document.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (token) void loadDocument()
    return () => {
      cancelled = true
    }
  }, [sid, token])

  useEffect(() => {
    if (!token || !document) return
    const startedAt = Date.now()
    const interval = window.setInterval(() => {
      void api.trackInvoiceEvent(token, { eventType: 'time.spent', sessionId: sid, timeSpentSeconds: Math.round((Date.now() - startedAt) / 1000) }).catch(() => undefined)
    }, 30000)
    return () => window.clearInterval(interval)
  }, [document, sid, token])

  async function decideQuote(decision: 'accepted' | 'rejected') {
    setSaving(true)
    setError('')
    try {
      const result = await api.decideQuote(token, decision)
      setDocument(result.document)
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : 'Unable to update quote.')
    } finally {
      setSaving(false)
    }
  }

  async function handlePaymentClick() {
    await api.trackInvoiceEvent(token, { eventType: 'payment.clicked', sessionId: sid }).catch(() => undefined)
    window.alert(`${document?.paymentGateway || 'Payment'} checkout is configured for this document. Gateway redirect wiring is the next integration step.`)
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--background)] text-[var(--foreground)]">
        <div className="flex items-center gap-3 text-soft"><Loader2 className="h-5 w-5 animate-spin" />Loading document...</div>
      </main>
    )
  }

  if (!document) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--background)] px-6 text-center text-[var(--foreground)]">
        <div><h1 className="text-2xl font-black">Document unavailable</h1><p className="text-soft mt-2">{error || 'This link is invalid or expired.'}</p></div>
      </main>
    )
  }

  const brand = document.branding
  const statusClass = document.status === 'paid' || document.status === 'accepted'
    ? 'bg-emerald-500/10 text-emerald-600'
    : document.status === 'overdue' || document.status === 'rejected'
      ? 'bg-red-500/10 text-red-600'
      : 'bg-amber-500/10 text-amber-600'

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)] md:py-12" style={{ '--brand': brand.primaryColor, '--brand-2': brand.accentColor } as CSSProperties}>
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="surface-card overflow-hidden rounded-2xl">
          <div className="border-b border-[var(--line)] bg-[var(--surface-2)] p-6 md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="flex items-center gap-4">
                {brand.logoUrl ? <img src={brand.logoUrl} alt={brand.businessName} className="h-12 w-auto object-contain" /> : null}
                <div>
                  <h1 className="text-2xl font-black">{brand.businessName}</h1>
                  <p className="text-soft text-sm">{brand.email} · {brand.phone}</p>
                </div>
              </div>
              <div className="text-left md:text-right">
                <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-black uppercase', statusClass)}>{document.status}</span>
                <h2 className="mt-3 text-3xl font-black capitalize">{document.type}</h2>
                <p className="text-soft font-bold">{document.number}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-8 p-6 md:p-8">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <p className="text-soft text-xs font-black uppercase tracking-[0.18em]">Billed to</p>
                <h3 className="mt-2 text-xl font-black">{document.client.name}</h3>
                <p className="text-soft">{document.client.companyName}</p>
                <p className="text-soft">{document.client.email}</p>
                <p className="text-soft whitespace-pre-line">{document.client.address}</p>
              </div>
              <div className="grid gap-2 text-sm md:justify-end md:text-right">
                <p><span className="text-soft">Issue date:</span> <b>{document.issueDate || 'Not set'}</b></p>
                <p><span className="text-soft">Due date:</span> <b>{document.dueDate || 'Not set'}</b></p>
                <p><span className="text-soft">Currency:</span> <b>{document.currency}</b></p>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-black">{document.title}</h3>
              <div className="mt-5 overflow-x-auto rounded-xl border border-[var(--line)]">
                <table className="w-full min-w-[44rem] text-left text-sm">
                  <thead className="bg-[var(--surface-2)] text-xs uppercase tracking-[0.12em] text-soft">
                    <tr><th className="px-4 py-3">Item</th><th className="px-4 py-3">Qty</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Tax</th><th className="px-4 py-3 text-right">Total</th></tr>
                  </thead>
                  <tbody>
                    {document.items.map((item) => (
                      <tr key={item.id ?? item.name} className="border-t border-[var(--line)]">
                        <td className="px-4 py-4"><b>{item.name}</b><p className="text-soft mt-1">{item.description}</p></td>
                        <td className="px-4 py-4">{item.quantity}</td>
                        <td className="px-4 py-4">{money(item.unitPrice, document.currency)}</td>
                        <td className="px-4 py-4">{item.taxRate}%</td>
                        <td className="px-4 py-4 text-right font-black">{money(item.lineTotal ?? 0, document.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-[1fr_20rem]">
              <div>
                {document.notes ? <p className="text-soft leading-7">{document.notes}</p> : null}
                {document.terms ? <p className="text-soft mt-3 text-sm leading-6">{document.terms}</p> : null}
              </div>
              <div className="rounded-xl border border-[var(--line)] p-5">
                <div className="flex justify-between"><span className="text-soft">Subtotal</span><b>{money(document.subtotal, document.currency)}</b></div>
                <div className="mt-2 flex justify-between"><span className="text-soft">Discount</span><b>{money(document.discountTotal, document.currency)}</b></div>
                <div className="mt-2 flex justify-between"><span className="text-soft">Tax</span><b>{money(document.taxTotal, document.currency)}</b></div>
                <div className="mt-4 flex justify-between border-t border-[var(--line)] pt-4 text-xl"><span className="font-black">Balance due</span><b>{money(document.balanceDue, document.currency)}</b></div>
              </div>
            </div>
          </div>
        </section>

        <aside className="grid h-fit gap-4 lg:sticky lg:top-6">
          <section className="surface-card rounded-2xl p-5">
            <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-[var(--brand)]" /><h3 className="font-black">Secure document</h3></div>
            <p className="text-soft mt-2 text-sm leading-6">This tokenized page tracks document views, payment intent, and quote decisions for better follow-up.</p>
          </section>

          {document.paymentEnabled && document.balanceDue > 0 ? (
            <Button type="button" className="min-h-12 rounded-xl bg-[var(--brand)] text-white hover:opacity-90" onClick={() => void handlePaymentClick()}>
              <CreditCard className="h-4 w-4" />Pay with {document.paymentGateway || 'gateway'}
            </Button>
          ) : null}

          {document.type === 'quote' && !['accepted', 'rejected'].includes(document.status) ? (
            <section className="grid gap-2">
              <Button type="button" className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700" disabled={saving} onClick={() => void decideQuote('accepted')}><CheckCircle2 className="h-4 w-4" />Accept quote</Button>
              <Button type="button" variant="ghost" className="rounded-xl border border-[var(--line)] text-red-500" disabled={saving} onClick={() => void decideQuote('rejected')}><XCircle className="h-4 w-4" />Reject quote</Button>
            </section>
          ) : null}

          <Button type="button" variant="ghost" className="rounded-xl border border-[var(--line)]" onClick={() => window.open(`/api/invoices/${token}/pdf`, '_blank')}>
            <Download className="h-4 w-4" />Download PDF
          </Button>

          <section className="surface-card rounded-2xl p-5">
            <h3 className="font-black">Engagement</h3>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-xl bg-[var(--surface-2)] p-3"><b>{document.analytics.totalViews}</b><p className="text-soft text-xs">Views</p></div>
              <div className="rounded-xl bg-[var(--surface-2)] p-3"><b>{document.analytics.uniqueViews}</b><p className="text-soft text-xs">Unique</p></div>
              <div className="rounded-xl bg-[var(--surface-2)] p-3"><b>{document.analytics.paymentClicks}</b><p className="text-soft text-xs">Clicks</p></div>
            </div>
            <p className="text-soft mt-3 flex items-center gap-2 text-xs"><MousePointerClick className="h-3.5 w-3.5" />Payment CTA clicks are tracked.</p>
          </section>
        </aside>
      </div>
    </main>
  )
}
