import { useEffect, useState, type CSSProperties } from 'react'
import { ArrowLeft, Building2, CheckCircle2, Download, Loader2 } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { api, type PublicReceiptData } from '@/lib/api'

function money(amount: number, currency: string) {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(Number(amount || 0))
}

function dateTime(value: string) {
  if (!value) return 'Not available'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed)
}

export function PublicReceipt() {
  const { token = '' } = useParams()
  const [receipt, setReceipt] = useState<PublicReceiptData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const reference = new URLSearchParams(window.location.search).get('reference') || undefined
    void api.publicInvoiceReceipt(token, reference)
      .then((result) => setReceipt(result.receipt))
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load receipt.'))
  }, [token])

  if (!receipt && !error) {
    return <main className="receipt-page receipt-loading"><Loader2 className="h-5 w-5 animate-spin" />Loading receipt...</main>
  }

  if (!receipt) {
    return <main className="receipt-page receipt-loading"><div><h1>Receipt unavailable</h1><p>{error}</p></div></main>
  }

  const brand = receipt.branding

  return (
    <main className="receipt-page" style={{ '--receipt-primary': brand.primaryColor } as CSSProperties}>
      <article className="receipt-card">
        <header className="receipt-header">
          <div className="receipt-brand">
            {brand.logoUrl ? <img src={brand.logoUrl} alt={brand.businessName} /> : <Building2 className="h-10 w-10" />}
            <div><strong>{brand.businessName}</strong><span>{brand.email}</span><span>{brand.phone}</span></div>
          </div>
          <div className="receipt-status"><CheckCircle2 className="h-5 w-5" />Payment received</div>
        </header>

        <section className="receipt-title">
          <span>Official payment receipt</span>
          <h1>{receipt.number}</h1>
          <p>For invoice {receipt.invoiceNumber}</p>
        </section>

        <section className="receipt-amount">
          <span>Amount received</span>
          <strong>{money(receipt.amount, receipt.currency)}</strong>
        </section>

        <section className="receipt-details">
          <div><span>Received from</span><strong>{receipt.client.name || 'Client'}</strong><p>{receipt.client.companyName}</p><p>{receipt.client.email}</p></div>
          <div><span>Payment details</span><p><b>Date</b>{dateTime(receipt.paidAt)}</p><p><b>Method</b>{receipt.gateway}</p><p><b>Reference</b>{receipt.reference}</p></div>
        </section>

        <footer className="receipt-actions">
          <Button type="button" onClick={() => { window.location.href = receipt.invoiceUrl }}>
            <ArrowLeft className="h-4 w-4" />View Invoice
          </Button>
          <Button type="button" className="receipt-download" onClick={() => window.open(receipt.downloadUrl, '_blank')}>
            <Download className="h-4 w-4" />Download Receipt PDF
          </Button>
        </footer>
      </article>
    </main>
  )
}
