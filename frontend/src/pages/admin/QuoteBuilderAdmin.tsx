import { QuoteBuilderOrder } from './QuoteBuilderOrder'
import { QuoteRequests } from './QuoteRequests'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { getAdminToken } from '@/lib/api'
import { money, quoteApi, type Catalog, type Option } from '@/lib/quote-builder'
import '../quote-builder.css'

type Entity = 'project_types' | 'questions' | 'features' | 'rules'
type Data = Record<string, string | number | boolean | Option[]>
type Field = { key: string; label: string; kind?: 'number' | 'checkbox' | 'textarea' }
const fields: Record<Entity, Field[]> = {
  project_types: [{key:'name',label:'Project name'},{key:'slug',label:'URL key (lowercase, hyphens)'},{key:'description',label:'Description',kind:'textarea'},{key:'base_min',label:'Starting from (NGN)' ,kind:'number'},{key:'base_max',label:'Base estimate upper amount (NGN)',kind:'number'},{key:'enabled',label:'Available to clients',kind:'checkbox'},{key:'discovery_key',label:'Discovery key (optional, e.g. showcase)'},{key:'discovery_label',label:'Discovery goal shown to customers (optional)'}],
  features: [{key:'name',label:'Feature name'},{key:'description',label:'Description',kind:'textarea'},{key:'price',label:'Price adjustment (NGN)',kind:'number'},{key:'complexity',label:'Complexity score (0–20)',kind:'number'},{key:'optional',label:'Optional (uncheck to include automatically)',kind:'checkbox'},{key:'custom_quote',label:'Requires a custom quote',kind:'checkbox'},{key:'enabled',label:'Available to clients',kind:'checkbox'}],
  questions: [{key:'label',label:'Question'}],
  rules: [{key:'level',label:'Level'},{key:'minimum_score',label:'Apply from complexity score',kind:'number'},{key:'uplift_percent',label:'Complexity uplift (%)',kind:'number'},{key:'range_percent',label:'Upper range allowance (%)',kind:'number'},{key:'custom_quote',label:'Requires a custom quote',kind:'checkbox'}],
}
function Editor({ entity, initial, saved }: { entity: Entity; initial: Data; saved: () => void }) {
  const [data, setData] = useState(initial)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const options = (data.options || []) as Option[]
  const change = (key: string, value: Data[string]) => setData(d => ({...d,[key]:value}))
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('')
    try { await quoteApi(`${entity}${data.id ? `/${data.id}` : ''}`, data, true); saved() } catch(e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  return <form onSubmit={submit}><div className="qb-admin-grid">{fields[entity].map(f => <label key={f.key} className={f.kind === 'checkbox' ? 'qb-check' : ''}>{f.kind === 'checkbox' ? <><input type="checkbox" checked={Boolean(data[f.key])} onChange={e => change(f.key,e.target.checked)}/>{f.label}</> : <>{f.label}{f.kind === 'textarea' ? <textarea required value={String(data[f.key] ?? '')} onChange={e => change(f.key,e.target.value)}/> : <input required={!f.key.startsWith('discovery_')} type={f.kind || 'text'} min={0} value={String(data[f.key] ?? '')} onChange={e => change(f.key,f.kind === 'number' ? Number(e.target.value) : e.target.value)}/>}</>}</label>)}</div>{entity === 'questions' && <><p>Answer options and their pricing adjustments</p>{options.map((o,i) => <div className="qb-admin-grid" key={i}><label>Answer<input required value={o.label} onChange={e => change('options',options.map((v,j) => j === i ? {...v,label:e.target.value} : v))}/></label><label>Adjustment (NGN)<input type="number" min={0} required value={o.price} onChange={e => change('options',options.map((v,j) => j === i ? {...v,price:Number(e.target.value)} : v))}/></label><label>Complexity score<input type="number" min={0} max={20} required value={o.complexity} onChange={e => change('options',options.map((v,j) => j === i ? {...v,complexity:Number(e.target.value)} : v))}/><button type="button" disabled={options.length <= 2} onClick={() => change('options',options.filter((_,j) => i !== j))}>Remove option</button></label></div>)}<button type="button" onClick={() => change('options',[...options,{label:'',price:0,complexity:0}])}>Add answer</button></>}{error && <p role="alert" className="qb-error">{error}</p>}<div className="qb-admin-toolbar"><button className="qb-primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button></div></form>
}
export function QuoteBuilderAdmin() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [selected, setSelected] = useState(0)
  const [tab, setTab] = useState('pricing')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [version, setVersion] = useState(0)
  const token = getAdminToken()
  async function load() { try { setCatalog(await quoteApi<Catalog>('catalog', undefined, true)); setError('') } catch(e) { setError((e as Error).message) } }
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    quoteApi<Catalog>('catalog', undefined, true, controller.signal).then(setCatalog).catch(e => { if (!controller.signal.aborted) setError(e.message) })
    return () => controller.abort()
  }, [token])
  const saved = () => { setNotice('Quote builder settings saved. New estimates will use these prices.'); void load().then(() => setVersion(v => v + 1)) }
  if (!token) return <Navigate to="/admin/login" replace/>
  const type = catalog?.types.find(t => t.id === selected) || catalog?.types[0]
  return <div className="qb qb-embedded"><div className="qb-admin"><div className="qb-admin-toolbar"><button className={tab === 'pricing' ? 'qb-primary' : ''} aria-pressed={tab === 'pricing'} onClick={() => setTab('pricing')}>Projects & starting prices</button><button className={tab === 'order' ? 'qb-primary' : ''} aria-pressed={tab === 'order'} onClick={() => setTab('order')}>Frontend order</button><button className={tab === 'quotes' ? 'qb-primary' : ''} aria-pressed={tab === 'quotes'} onClick={() => setTab('quotes')}>Quote requests</button><Link to="/quote-builder">Open public builder ↗</Link></div>{error && <p role="alert" className="qb-error">{error}</p>}{notice && <p role="status">{notice}</p>}{!catalog && !error && <p>Loading settings…</p>}
    {tab === 'pricing' && catalog && <><section className="qb-panel"><h2>Projects & starting prices</h2><p>Select a project below to edit its name, starting price, description, questions and features. You can create more project types for different customers and budgets.</p><div className="qb-project-list">{catalog.types.map(t => <button key={t.id} type="button" aria-pressed={type?.id === t.id} className={type?.id === t.id ? 'is-selected' : ''} onClick={() => setSelected(t.id)}><strong>{t.name}</strong><span>From {money(t.base_min)}</span><small>{t.enabled ? 'Available' : 'Hidden'}</small></button>)}</div></section><label>Project type<select value={type?.id || ''} onChange={e => setSelected(Number(e.target.value))}>{catalog.types.map(t => <option key={t.id} value={t.id}>{t.name}{!t.enabled ? ' (disabled)' : ''}</option>)}</select></label>{type && <section className="qb-panel" key={`${type.id}-${version}`}><h2>{type.name}</h2><p>The starting price appears on the public project card. The upper amount sets the base estimate range; answers and features can increase it. Both amounts are editable, including for lower-budget projects.</p><Editor entity="project_types" initial={type as unknown as Data} saved={saved}/><h3>Relevant questions</h3><p>Questions shown only for this project type. Historical requests retain their original answers.</p>{type.questions.map(q => <details key={q.id}><summary>{q.label}</summary><Editor entity="questions" initial={q as unknown as Data} saved={saved}/></details>)}<details><summary>+ Add question</summary><Editor entity="questions" initial={{project_type_id:type.id,label:'',options:[{label:'',price:0,complexity:0},{label:'',price:0,complexity:0}]}} saved={saved}/></details><h3>Functionality</h3><p>Disable a feature to remove it from new estimates. Its history is retained.</p>{type.features.map(f => <details key={f.id}><summary>{f.name} · {money(f.price)}{!f.enabled ? ' · disabled' : ''}</summary><Editor entity="features" initial={f as unknown as Data} saved={saved}/></details>)}<details><summary>+ Add feature</summary><Editor entity="features" initial={{project_type_id:type.id,name:'',description:'',price:0,complexity:1,optional:true,custom_quote:false,enabled:true}} saved={saved}/></details></section>}<section className="qb-panel" key={`new-${version}`}><details><summary>+ Create project type</summary><Editor entity="project_types" initial={{name:'',slug:'',description:'',base_min:250000,base_max:300000,enabled:true,discovery_key:'',discovery_label:''}} saved={saved}/></details></section><section className="qb-panel" key={`rules-${version}`}><h2>Complexity rules</h2><p>The highest matching score threshold applies. Minimum = (starting price + selected adjustments) × complexity uplift. Maximum includes the range allowance and the configured starting maximum. Values round up to ₦5,000. Custom quote rules suppress both amounts.</p>{catalog.rules.map(r => <details key={r.id}><summary>{r.level} · score {r.minimum_score}+</summary><Editor entity="rules" initial={r as unknown as Data} saved={saved}/></details>)}</section></>}
    {tab === 'order' && catalog && <QuoteBuilderOrder catalog={catalog} onSaved={() => { void load() }} />}
    {tab === 'quotes' && <QuoteRequests catalog={catalog} />}
  </div></div>
}
