import { useState } from 'react'
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react'
import { quoteApi, type Catalog } from '@/lib/quote-builder'

type Item = { id: number; label: string; enabled?: boolean }

function OrderList({ items, entity, projectId, onSaved }: { items: Item[]; entity: string; projectId?: number; onSaved: () => void }) {
  const [ordered, setOrdered] = useState(items)
  const [dragId, setDragId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const dirty = ordered.some((item, i) => item.id !== items[i]?.id)

  function move(from: number, to: number) {
    if (busy || from < 0 || to < 0 || to >= ordered.length || from === to) return
    setOrdered(current => { const next = [...current]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next })
    setSaved(''); setError('')
  }
  async function save() {
    setBusy(true); setError('')
    try {
      await quoteApi(`order/${entity}`, { ids: ordered.map(item => item.id), ...(projectId ? { project_type_id: projectId } : {}) }, true)
      setSaved('Order saved. Refresh the public builder to see your changes.')
      onSaved()
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  return <div><p>Drag rows into position, or use the up and down buttons. Hidden items retain their position when enabled again.</p>
    <ol className="qb-order-list">{ordered.map((item, i) => <li key={item.id} draggable={!busy} onDragStart={e => { setDragId(item.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(item.id)) }} onDragEnd={() => setDragId(null)} onDragOver={e => { if (dragId !== null) e.preventDefault() }} onDrop={e => { e.preventDefault(); if (dragId !== null) move(ordered.findIndex(row => row.id === dragId), i); setDragId(null) }} className={dragId === item.id ? 'is-dragging' : ''}>
      <GripVertical size={17} aria-hidden="true"/><span className="qb-order-position">{i + 1}</span><span className="qb-order-label">{item.label}{item.enabled !== undefined && !item.enabled && <small>Hidden</small>}</span>
      <button type="button" disabled={busy || i === 0} aria-label={`Move ${item.label} up`} onClick={() => move(i, i - 1)}><ArrowUp size={16}/></button>
      <button type="button" disabled={busy || i === ordered.length - 1} aria-label={`Move ${item.label} down`} onClick={() => move(i, i + 1)}><ArrowDown size={16}/></button>
    </li>)}</ol>
    {!ordered.length && <p>No items yet. Add them in Projects & starting prices.</p>}
    {error && <p className="qb-error" role="alert">{error}</p>}{saved && <p role="status">{saved}</p>}
    <div className="qb-admin-toolbar"><button className="qb-primary" disabled={busy || !dirty} onClick={() => void save()}>{busy ? 'Saving order…' : 'Save frontend order'}</button><button disabled={busy || !dirty} onClick={() => { setOrdered(items); setError('') }}>Reset changes</button></div>
  </div>
}

export function QuoteBuilderOrder({ catalog, onSaved }: { catalog: Catalog; onSaved: () => void }) {
  const [entity, setEntity] = useState('project_types')
  const [selected, setSelected] = useState(catalog.types[0]?.id || 0)
  const project = catalog.types.find(t => t.id === selected)
  const items: Item[] = entity === 'project_types' ? catalog.types.map(t => ({id:t.id,label:t.name,enabled:t.enabled})) : entity === 'questions' ? (project?.questions || []).map(q => ({id:q.id,label:q.label})) : (project?.features || []).map(f => ({id:f.id,label:f.name,enabled:f.enabled}))
  return <section className="qb-panel"><h2>Frontend display order</h2><p>Choose the order customers see project cards, questions, and features. Discovery goals follow the project order.</p>
    <div className="qb-admin-grid"><label>Arrange<select value={entity} onChange={e => setEntity(e.target.value)}><option value="project_types">Project cards</option><option value="questions">Project questions</option><option value="features">Project features</option></select></label>{entity !== 'project_types' && <label>Project<select value={selected} onChange={e => setSelected(Number(e.target.value))}>{catalog.types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}</div>
    <OrderList key={`${entity}-${selected}`} items={items} entity={entity} projectId={entity === 'project_types' ? undefined : selected} onSaved={onSaved}/>
  </section>
}
