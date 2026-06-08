import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useParams } from 'react-router-dom'
import {
  Building2,
  CheckCircle2,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Moon,
  Sun,
} from 'lucide-react'
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

function compactDate(date: string) {
  if (!date) return 'Not set'
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(parsed)
}

function titleCase(value: string) {
  return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function decodeEntities(value: string) {
  if (typeof window === 'undefined') return value
  let decoded = value
  for (let index = 0; index < 3; index += 1) {
    const textarea = window.document.createElement('textarea')
    textarea.innerHTML = decoded
    const next = textarea.value
    if (next === decoded) break
    decoded = next
  }
  return decoded
}

function sanitizeRichText(value: string) {
  if (typeof window === 'undefined') return ''
  const decoded = decodeEntities(value.trim())
  if (!decoded) return ''

  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(decoded)
  if (!hasHtml) {
    const wrapper = window.document.createElement('div')
    decoded.split(/\n{2,}/).forEach((paragraph) => {
      const text = paragraph.trim()
      if (!text) return
      const p = window.document.createElement('p')
      p.textContent = text
      wrapper.appendChild(p)
    })
    return wrapper.innerHTML
  }

  const parser = new DOMParser()
  const parsed = parser.parseFromString(decoded, 'text/html')
  const allowedTags = new Set(['P', 'BR', 'UL', 'OL', 'LI', 'STRONG', 'B', 'EM', 'I', 'U', 'H2', 'H3', 'H4'])

  function cleanNode(node: Node) {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as HTMLElement
        if (!allowedTags.has(element.tagName)) {
          const fragment = window.document.createDocumentFragment()
          while (element.firstChild) fragment.appendChild(element.firstChild)
          element.replaceWith(fragment)
          cleanNode(node)
          return
        }
        Array.from(element.attributes).forEach((attribute) => element.removeAttribute(attribute.name))
      }
      cleanNode(child)
    })
  }

  cleanNode(parsed.body)
  return parsed.body.innerHTML
}

function RichTextBlock({ value }: { value: string }) {
  const html = useMemo(() => sanitizeRichText(value), [value])
  if (!html) return null
  return <div className="invoice-portal-richtext" dangerouslySetInnerHTML={{ __html: html }} />
}

export function PublicInvoice() {
  const { token = '' } = useParams()
  const [document, setDocument] = useState<InvoiceDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [generatingInvoice, setGeneratingInvoice] = useState(false)
  const [activeItemIndex, setActiveItemIndex] = useState(0)
  const [generatedInvoiceUrl, setGeneratedInvoiceUrl] = useState('')
  const [darkQuoteMode, setDarkQuoteMode] = useState(false)
  const [darkInvoiceMode, setDarkInvoiceMode] = useState(false)
  const [selectedPaymentPercent, setSelectedPaymentPercent] = useState(100)
  const [expandedInvoiceSections, setExpandedInvoiceSections] = useState<Record<string, boolean>>({})
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

  async function generateInvoice() {
    setGeneratingInvoice(true)
    setError('')
    try {
      const result = await api.generateInvoiceFromQuote(token)
      setDocument(result.quote)
      setGeneratedInvoiceUrl(result.document.publicUrl)
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : 'Unable to generate invoice.')
    } finally {
      setGeneratingInvoice(false)
    }
  }

  function downloadPdf() {
    void api.trackInvoiceEvent(token, { eventType: 'pdf.downloaded', sessionId: sid }).catch(() => undefined)
    window.open(`/api/invoices/${token}/pdf`, '_blank')
  }

  async function handlePaymentClick() {
    await api.trackInvoiceEvent(token, { eventType: 'payment.clicked', sessionId: sid }).catch(() => undefined)
    window.alert(`${document?.paymentGateway || 'Payment'} checkout is configured for this document. Gateway redirect wiring is the next integration step.`)
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-stone-50 text-zinc-950">
        <div className="flex items-center gap-3 text-zinc-500"><Loader2 className="h-5 w-5 animate-spin" />Loading document...</div>
      </main>
    )
  }

  if (!document) {
    return (
      <main className="grid min-h-screen place-items-center bg-stone-50 px-6 text-center text-zinc-950">
        <div><h1 className="text-2xl font-black">Document unavailable</h1><p className="mt-2 text-zinc-500">{error || 'This link is invalid or expired.'}</p></div>
      </main>
    )
  }

  const brand = document.branding
  const isPositiveStatus = document.status === 'paid' || document.status === 'accepted'
  const isDangerStatus = document.status === 'overdue' || document.status === 'rejected'
  const statusClass = isPositiveStatus ? 'is-success' : isDangerStatus ? 'is-danger' : 'is-warning'
  const docName = titleCase(document.type)
  const isQuote = document.type === 'quote'
  const invoiceUrl = generatedInvoiceUrl || document.generatedInvoice?.publicUrl || ''
  const activeItem = document.items[Math.min(activeItemIndex, Math.max(0, document.items.length - 1))]
  const payableAmount = Math.max(0, document.balanceDue || document.total)
  const selectedPaymentAmount = payableAmount * (selectedPaymentPercent / 100)
  const paymentPresets = [50, 75, 100]
  const renderInvoiceExpandableSection = (key: string, title: string, value: string) => {
    if (!value) return null
    const isExpanded = Boolean(expandedInvoiceSections[key])

    return (
      <section className={cn('invoice-sheet-notes invoice-sheet-expandable', isExpanded && 'is-open')}>
        <button
          type="button"
          className="invoice-sheet-expand-toggle"
          onClick={() => setExpandedInvoiceSections((current) => ({ ...current, [key]: !current[key] }))}
          aria-expanded={isExpanded}
        >
          <span>{title}</span>
          <b>{isExpanded ? 'Hide details' : 'View details'}</b>
        </button>
        {isExpanded ? <RichTextBlock value={value} /> : null}
      </section>
    )
  }

  if (isQuote) {
    return (
      <main className={cn('quote-document-page', darkQuoteMode && 'is-dark')} style={{ '--primary': brand.primaryColor, '--accent': brand.accentColor } as CSSProperties}>
        <button type="button" className="quote-document-mode" onClick={() => setDarkQuoteMode((value) => !value)}>
          {darkQuoteMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          {darkQuoteMode ? 'Light mode' : 'Dark mode'}
        </button>

        <div className="quote-document-sheet">
          <header className="quote-document-header">
            <div className="quote-document-brand">
              {brand.logoUrl ? <img src={brand.logoUrl} alt={brand.businessName} /> : <Building2 className="h-10 w-10" />}
              <div>
                <h1>{brand.businessName}</h1>
                <p>Email: {brand.email || 'Not provided'}</p>
                <p>Phone: {brand.phone || 'Not provided'}</p>
                <p>{brand.address || 'Address not provided'}</p>
              </div>
            </div>

            <div className="quote-document-id">
              <span>Quote</span>
              <strong>{document.number}</strong>
              <div>
                <b>Issued {compactDate(document.issueDate)}</b>
                <b>Valid {compactDate(document.dueDate)}</b>
              </div>
              <button type="button" onClick={() => void api.trackInvoiceEvent(token, { eventType: 'document.viewed', sessionId: sid }).catch(() => undefined)}>
                Viewed
              </button>
            </div>
          </header>

          {error ? <div className="quote-document-alert is-error">{error}</div> : null}
          {invoiceUrl ? (
            <div className="quote-document-alert is-success">
              <CheckCircle2 className="h-4 w-4" />
              <span>Invoice ready: {document.generatedInvoice?.number || 'generated invoice'}</span>
              <button type="button" onClick={() => window.open(invoiceUrl, '_blank')}>Open invoice</button>
            </div>
          ) : null}

          <section className="quote-document-top-grid">
            <div className="quote-document-card">
              <span>Client</span>
              <h2>{document.client.name || 'Client'}</h2>
              {document.client.companyName ? <p>{document.client.companyName}</p> : null}
              {document.client.email ? <p>{document.client.email}</p> : null}
              {document.client.phone ? <p>{document.client.phone}</p> : null}
            </div>
            <div className="quote-document-card">
              <span>Details</span>
              <p><strong>Quote #</strong> {document.number}</p>
              <p><strong>Issued</strong> {compactDate(document.issueDate)}</p>
              <p><strong>Valid Until</strong> {compactDate(document.dueDate)}</p>
            </div>
          </section>

          {document.serviceOverview ? (
            <section className="quote-document-section">
              <h3>Service Overview</h3>
              <div className="quote-document-panel">
                <RichTextBlock value={document.serviceOverview} />
              </div>
            </section>
          ) : null}

          {document.scopeOfService ? (
            <section className="quote-document-section">
              <h3>Scope of Service</h3>
              <div className="quote-document-panel quote-document-scope">
                <RichTextBlock value={document.scopeOfService} />
              </div>
            </section>
          ) : null}

          {document.notes ? (
            <section className="quote-document-section">
              <h3>Notes</h3>
              <div className="quote-document-panel">
                <RichTextBlock value={document.notes} />
              </div>
            </section>
          ) : null}

          {document.terms ? (
            <section className="quote-document-section">
              <h3>Terms</h3>
              <div className="quote-document-panel">
                <RichTextBlock value={document.terms} />
              </div>
            </section>
          ) : null}

          <section className="quote-document-section">
            <div className="quote-document-table">
              <div className="quote-document-table-head">
                <span>Item</span>
                <span>Qty</span>
                <span>Price</span>
                <span>Discount</span>
                <span>Total</span>
              </div>
              {document.items.map((item, index) => (
                <button
                  type="button"
                  className={cn('quote-document-row', activeItemIndex === index && 'is-active')}
                  key={item.id ?? `${item.name}-${index}`}
                  onClick={() => setActiveItemIndex(index)}
                >
                  <span><strong>{item.name || `Item ${index + 1}`}</strong>{item.description ? <RichTextBlock value={item.description} /> : null}</span>
                  <span data-label="Qty">{item.quantity}</span>
                  <span data-label="Price">{money(item.unitPrice, document.currency)}</span>
                  <span data-label="Discount">{item.discountRate > 0 ? `${item.discountRate}%` : 'None'}</span>
                  <span>{money(item.lineTotal ?? 0, document.currency)}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="quote-document-total-row">
            <div className="quote-document-selected">
              <span>Selected Item</span>
              <strong>{activeItem?.name || 'Quote item'}</strong>
              {activeItem ? <p>{activeItem.quantity} x {money(activeItem.unitPrice, document.currency)}</p> : null}
            </div>
            <div className="quote-document-totals">
              <div><span>Subtotal</span><strong>{money(document.subtotal, document.currency)}</strong></div>
              <div><span>Discount</span><strong>{money(document.discountTotal, document.currency)}</strong></div>
              <div><span>Tax</span><strong>{money(document.taxTotal, document.currency)}</strong></div>
              <div className="is-final"><span>Total</span><strong>{money(document.total, document.currency)}</strong></div>
            </div>
          </section>

          <footer className="quote-document-footer">
            <div>
              <h3>Ready to proceed?</h3>
              <p>Generate an invoice when you are ready to accept this quote and continue.</p>
            </div>
            <div className="quote-document-actions">
              <Button type="button" className="quote-document-download" onClick={downloadPdf}>
                <Download className="h-4 w-4" />Download PDF
              </Button>
              {invoiceUrl ? (
                <Button type="button" className="quote-document-generate" onClick={() => window.open(invoiceUrl, '_blank')}>
                  <ExternalLink className="h-4 w-4" />Open invoice
                </Button>
              ) : (
                <Button type="button" className="quote-document-generate" disabled={generatingInvoice || document.status === 'rejected'} onClick={() => void generateInvoice()}>
                  {generatingInvoice ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}Generate invoice
                </Button>
              )}
            </div>
          </footer>
        </div>
      </main>
    )
  }

  return (
    <main className={cn('invoice-sheet-page', darkInvoiceMode && 'is-dark')} style={{ '--primary': brand.primaryColor, '--accent': brand.accentColor } as CSSProperties}>
      <button type="button" className="invoice-sheet-mode" onClick={() => setDarkInvoiceMode((value) => !value)}>
        {darkInvoiceMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        {darkInvoiceMode ? 'Light mode' : 'Dark mode'}
      </button>

      <article className="invoice-sheet">
        <header className="invoice-sheet-header">
          <div className="invoice-sheet-brand">
            {brand.logoUrl ? <img src={brand.logoUrl} alt={brand.businessName} /> : <Building2 className="h-10 w-10" />}
            <div className="invoice-sheet-contact">
              <strong>{brand.businessName}</strong>
              <span>Email: {brand.email || 'Not provided'}</span>
              <span>Phone: {brand.phone || 'Not provided'}</span>
              <span>{brand.address || 'Address not provided'}</span>
            </div>
          </div>

          <div className="invoice-sheet-id">
            <span>{docName}</span>
            <h1>{document.number}</h1>
            <div className="invoice-sheet-date-pills">
              <b>Issued {compactDate(document.issueDate)}</b>
              <b>Due {compactDate(document.dueDate)}</b>
            </div>
            <span className={cn('invoice-sheet-status', statusClass)}>{titleCase(document.status)}</span>
          </div>
        </header>

        {error ? <div className="invoice-sheet-alert">{error}</div> : null}

        <section className="invoice-sheet-info-grid">
          <div className="invoice-sheet-card">
            <span>Bill To</span>
            <strong>{document.client.name || 'Client'}</strong>
            {document.client.companyName ? <p>{document.client.companyName}</p> : null}
            {document.client.email ? <p>{document.client.email}</p> : null}
            {document.client.phone ? <p>{document.client.phone}</p> : null}
            {document.client.address ? <p className="whitespace-pre-line">{document.client.address}</p> : null}
          </div>
          <div className="invoice-sheet-card">
            <span>Details</span>
            <p><strong>{docName} #</strong> {document.number}</p>
            <p><strong>Issued</strong> {compactDate(document.issueDate)}</p>
            <p><strong>Due</strong> {compactDate(document.dueDate)}</p>
          </div>
        </section>

        <section className="invoice-sheet-items">
          <div className="invoice-sheet-table-head">
            <span>Item</span>
            <span>Qty</span>
            <span>Price</span>
            <span>Total</span>
          </div>
          {document.items.map((item, index) => (
            <div className="invoice-sheet-row" key={item.id ?? `${item.name}-${index}`}>
              <div>
                <strong>{item.name || `Item ${index + 1}`}</strong>
                {item.description ? <RichTextBlock value={item.description} /> : null}
              </div>
              <span data-label="Qty">{item.quantity}</span>
              <span data-label="@">{money(item.unitPrice, document.currency)}</span>
              <strong data-label="Total">{money(item.lineTotal ?? 0, document.currency)}</strong>
            </div>
          ))}
        </section>

        <section className="invoice-sheet-summary">
          <div className="invoice-sheet-total-box">
            <div><span>Subtotal</span><strong>{money(document.subtotal, document.currency)}</strong></div>
            {document.discountTotal > 0 ? <div><span>Discount</span><strong>-{money(document.discountTotal, document.currency)}</strong></div> : null}
            <div><span>Tax</span><strong>{money(document.taxTotal, document.currency)}</strong></div>
            {document.amountPaid > 0 ? <div><span>Paid</span><strong>{money(document.amountPaid, document.currency)}</strong></div> : null}
            <div className="is-final"><span>Total</span><strong>{money(document.total, document.currency)}</strong></div>
          </div>
        </section>

        <section className="invoice-sheet-payment">
          <h2>Payment Options</h2>
          <div className="invoice-sheet-payment-card">
            <div className="invoice-sheet-bank">
              <strong>Bank Transfer</strong>
              <span>{brand.businessName}</span>
              <span>Provided after checkout confirmation</span>
            </div>
            <div className="invoice-sheet-bank">
              <strong>Online Payment</strong>
              <span>{titleCase(document.paymentGateway || 'paystack')}</span>
            </div>
            <div className="invoice-sheet-pay-row">
              <span>Pay</span>
              <div className="invoice-sheet-presets">
                {paymentPresets.map((percent) => (
                  <button
                    type="button"
                    className={cn(selectedPaymentPercent === percent && 'is-active')}
                    key={percent}
                    onClick={() => setSelectedPaymentPercent(percent)}
                  >
                    {percent}%
                  </button>
                ))}
              </div>
              <small>Selected: {money(selectedPaymentAmount, document.currency)}</small>
            </div>
            {document.paymentEnabled && payableAmount > 0 ? (
              <Button type="button" className="invoice-sheet-pay-button" onClick={() => void handlePaymentClick()}>
                <CreditCard className="h-4 w-4" />Pay with {titleCase(document.paymentGateway || 'paystack')} ({money(selectedPaymentAmount, document.currency)})
              </Button>
            ) : (
              <div className="invoice-sheet-paid">Payment is not required for this invoice.</div>
            )}
          </div>
        </section>

        {renderInvoiceExpandableSection('serviceOverview', 'Service Overview', document.serviceOverview)}
        {renderInvoiceExpandableSection('scopeOfService', 'Scope of Service', document.scopeOfService)}

        {document.notes ? (
          <section className="invoice-sheet-notes">
            <h2>Notes</h2>
            <RichTextBlock value={document.notes} />
          </section>
        ) : null}

        {document.terms ? (
          <section className="invoice-sheet-notes">
            <h2>Terms</h2>
            <RichTextBlock value={document.terms} />
          </section>
        ) : null}

        <footer className="invoice-sheet-actions">
          <Button type="button" className="invoice-sheet-download" onClick={downloadPdf}>
            <Download className="h-4 w-4" />Download PDF
          </Button>
          <Button type="button" variant="ghost" className="invoice-sheet-home" onClick={() => { window.location.href = '/' }}>
            <ExternalLink className="h-4 w-4" />Homepage
          </Button>
        </footer>
      </article>
    </main>
  )
}
