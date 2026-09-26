import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Copy, FileText, Mail, Phone, RefreshCw, Search } from 'lucide-react'
import { investment, money, quoteApi, type Catalog, type SavedQuote } from '@/lib/quote-builder'

type QuoteListItem = Omit<SavedQuote, 'answers' | 'features' | 'calculation' | 'description'>
type Result = { data: QuoteListItem[]; total: number; from: number | null; to: number | null; current_page: number; last_page: number; summary: { total: number; custom: number; recent: number } }
const defaults = { search: '', project_type_id: '', estimate: '', sort: 'newest', from: '', to: '' }
const date = (value: string, full = false) => new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', ...(full ? { timeStyle: 'short' as const } : {}) }).format(new Date(value))

function QuoteDetail({ id, close }: { id: number; close: () => void }) {
  const [quote, setQuote] = useState<SavedQuote | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')
  const [retry, setRetry] = useState(0)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    const controller = new AbortController()
    quoteApi<SavedQuote>(`quotes/${id}`, undefined, true, controller.signal).then(setQuote).catch(e => { if (!controller.signal.aborted) setError(e.message) })
    return () => controller.abort()
  }, [id, retry])
  useEffect(() => { if (quote) heading.current?.focus() }, [quote])
  async function copyReference() {
    try { await navigator.clipboard.writeText(quote!.reference); setCopied('Reference copied.') } catch { setCopied('Copy unavailable. Select the reference below to copy it.') }
  }
  const calc = quote?.calculation
  return <div className="qr-detail"><button className="qr-back" onClick={close}><ArrowLeft size={16}/>Back to requests</button>
    {error && <p role="alert" className="qb-error">{error} <button onClick={() => { setError(''); setRetry(n => n + 1) }}>Retry</button></p>}
    {!quote && !error && <p role="status">Loading quote request…</p>}
    {quote && <><header className="qr-detail-heading"><div><span className="qb-eyebrow">QUOTE REQUEST</span><h2 ref={heading} tabIndex={-1}>{quote.company}</h2><p>Submitted {date(quote.created_at, true)}</p></div><span className={`qr-badge ${quote.estimated_min === null ? 'qr-custom' : ''}`}>{quote.estimated_min === null ? 'Scope review needed' : 'Estimate available'}</span></header>
      <div className="qr-detail-grid"><div>
        <section className="qb-panel"><h3>Project requirements</h3><div className="qr-project-summary"><div><small>Requested solution</small><strong>{String(calc?.project || quote.selected_type)}</strong></div><div><small>Recommended solution</small><strong>{quote.recommended_type}</strong></div></div>{quote.selected_type === 'unsure' && <p>The customer used guided discovery. Goal: {String(calc?.discovery || 'Not specified')}.</p>}<h4>Customer’s project notes</h4><p className="qr-notes">{quote.description || 'No additional project notes provided.'}</p><h4>Project details</h4><dl className="qr-answers">{quote.answers.map((answer, index) => <div key={index}><dt>{answer.question_label}</dt><dd>{answer.answer}</dd></div>)}</dl>{!quote.answers.length && <p>No additional questions were included for this project.</p>}<h4>Selected functionality</h4><ul className="qr-feature-list">{quote.features.map((feature, index) => <li key={index}><span>{feature.name}</span><strong>{feature.price ? money(feature.price) : 'Included'}</strong></li>)}</ul>{!quote.features.length && <p>No additional features selected.</p>}</section>
        <section className="qb-panel"><h3>Estimate breakdown</h3><p>Saved when this request was submitted. Later pricing changes do not affect these figures.</p><dl className="qr-breakdown"><div><dt>Starting price</dt><dd>{money(Number(calc?.base_min || 0))}</dd></div>{quote.answers.filter(a => a.price > 0).map((a, i) => <div key={`a-${i}`}><dt>{a.answer}<small>{a.question_label}</small></dt><dd>+ {money(a.price)}</dd></div>)}{quote.features.filter(f => f.price > 0).map((f, i) => <div key={`f-${i}`}><dt>{f.name}</dt><dd>+ {money(f.price)}</dd></div>)}<div><dt>Complexity adjustment ({Number(calc?.uplift_percent || 0)}%)<small>{quote.complexity} · score {Number(calc?.score || 0)}</small></dt><dd>+ {money(Number(calc?.uplift || 0))}</dd></div><div><dt>Base upper estimate</dt><dd>{money(Number(calc?.base_max || 0))}</dd></div><div><dt>Upper range allowance</dt><dd>{Number(calc?.range_percent || 0)}%</dd></div><div className="qr-total"><dt>Estimated investment</dt><dd>{investment(quote)}</dd></div></dl><p>{quote.estimated_min === null ? 'Custom requirements or complexity require a scope review. No final price was calculated.' : `Amounts round up to ${money(Number(calc?.rounding || 5000))}. The upper estimate uses the larger of the configured upper base plus adjustments or the lower estimate plus its range allowance.`}</p></section>
      </div><aside><section className="qb-panel qr-contact"><h3>Customer contact</h3><strong>{quote.name}</strong><p>{quote.company}</p><a href={`mailto:${quote.email}`}><Mail size={16}/>{quote.email}</a><a href={`tel:${quote.phone.replace(/[^+\d]/g, '')}`}><Phone size={16}/>{quote.phone}</a><a className="qb-primary" href={`mailto:${quote.email}?subject=${encodeURIComponent(`Your Bakhtech quote request ${quote.reference}`)}`}>Email customer <ArrowRight size={15}/></a></section><section className="qb-panel"><h3>Request reference</h3><code className="qr-reference">{quote.reference}</code><button className="qr-copy" onClick={() => void copyReference()}><Copy size={14}/>Copy reference</button><p role="status">{copied}</p></section></aside></div>
    </>}
  </div>
}

export function QuoteRequests({ catalog }: { catalog: Catalog | null }) {
  const [filters, setFilters] = useState(defaults)
  const [query, setQuery] = useState(defaults)
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const lastTrigger = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({ ...query, page: String(page) })
    quoteApi<Result>(`quotes?${params}`, undefined, true, controller.signal).then(setResult).catch(e => { if (!controller.signal.aborted) setError(e.message) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [query, page, refresh])
  function reload() { setLoading(true); setError(''); setRefresh(n => n + 1) }
  function filter(event: FormEvent) { event.preventDefault(); setLoading(true); setError(''); setPage(1); setQuery({ ...filters }) }
  function reset() { setFilters(defaults); setQuery({ ...defaults }); setPage(1); setLoading(true); setError('') }
  function paginate(next: number) { setLoading(true); setError(''); setPage(next) }
  return <div className="qr-workspace"><div hidden={selected !== null}>
    <div className="qr-stats">{[['All requests', result?.summary.total], ['Last 7 days', result?.summary.recent], ['Need a custom quote', result?.summary.custom]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value ?? '—'}</strong></div>)}</div>
    <section className="qb-panel qr-list-panel"><header className="qr-list-heading"><div><h2>Quote requests</h2><p>Review incoming projects and follow up with customers.</p></div><button disabled={loading} onClick={reload}><RefreshCw size={15}/>Refresh</button></header>
      <form className="qr-filters" onSubmit={filter}><label className="qr-search">Search requests<input placeholder="Name, business, email or reference" value={filters.search} maxLength={150} onChange={e => setFilters(f => ({...f,search:e.target.value}))}/></label><label>Project<select value={filters.project_type_id} onChange={e => setFilters(f => ({...f,project_type_id:e.target.value}))}><option value="">All projects</option>{catalog?.types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label><label>Estimate<select value={filters.estimate} onChange={e => setFilters(f => ({...f,estimate:e.target.value}))}><option value="">All estimates</option><option value="range">Price range available</option><option value="custom">Custom quote required</option></select></label><label>From<input type="date" value={filters.from} max={filters.to || undefined} onChange={e => setFilters(f => ({...f,from:e.target.value}))}/></label><label>To<input type="date" value={filters.to} min={filters.from || undefined} onChange={e => setFilters(f => ({...f,to:e.target.value}))}/></label><label>Sort<select value={filters.sort} onChange={e => setFilters(f => ({...f,sort:e.target.value}))}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label><div className="qr-filter-actions"><button className="qb-primary" disabled={loading}><Search size={15}/>Apply filters</button><button type="button" onClick={reset} disabled={loading}>Clear</button></div></form>
      {error && <p role="alert" className="qb-error">{error} <button onClick={reload}>Retry</button></p>}
      <div aria-busy={loading}>{loading ? <p className="qr-empty" role="status">Loading quote requests…</p> : result?.data.length ? <><div className="qr-table-wrap"><table className="qr-table"><thead><tr><th>Customer</th><th>Project</th><th>Estimated investment</th><th>Submitted</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{result.data.map(q => <tr key={q.id}><td data-label="Customer"><strong>{q.company}</strong><span>{q.name}</span><small>{q.email}</small></td><td data-label="Project"><strong>{q.recommended_type}</strong><small title={q.reference}>Ref: {q.reference.slice(0, 8).toUpperCase()}</small></td><td data-label="Estimate"><span className={`qr-badge ${q.estimated_min === null ? 'qr-custom' : ''}`}>{q.estimated_min === null ? 'Custom quote required' : 'Price range'}</span><strong>{q.estimated_min === null ? 'Review requirements' : investment(q)}</strong></td><td data-label="Submitted"><span>{date(q.created_at)}</span></td><td><button className="qr-view" aria-label={`View request from ${q.company}`} onClick={e => { lastTrigger.current = e.currentTarget; setSelected(q.id) }}>View request <ArrowRight size={14}/></button></td></tr>)}</tbody></table></div><div className="qr-pagination"><span>Showing {result.from}–{result.to} of {result.total} requests</span><div><button disabled={page <= 1} onClick={() => paginate(page - 1)}>Previous</button><span>Page {result.current_page} of {result.last_page}</span><button disabled={page >= result.last_page} onClick={() => paginate(page + 1)}>Next</button></div></div></> : <div className="qr-empty"><FileText size={32}/><h3>{result?.summary.total ? 'No matching requests' : 'No quote requests yet'}</h3><p>{result?.summary.total ? 'Try different filters or clear your search.' : 'Customer submissions from the quote builder will appear here.'}</p>{Boolean(result?.summary.total) && <button onClick={reset}>Clear filters</button>}</div>}</div>
    </section>
  </div>{selected !== null && <QuoteDetail key={selected} id={selected} close={() => { setSelected(null); requestAnimationFrame(() => lastTrigger.current?.focus()) }}/>}</div>
}
