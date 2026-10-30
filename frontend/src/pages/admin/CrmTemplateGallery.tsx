import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, LayoutTemplate, Monitor, Smartphone, Upload, X } from 'lucide-react'
import { api } from '@/lib/api'
import { customHtmlTemplate, emailTemplates, emptyBrand, templateHtml, type EmailBrand } from './crm-email-templates'
import './crm-template-gallery.css'

export function EmailLogoField({ value, onChange, disabled }: { value: string; onChange: (url: string) => void; disabled?: boolean }) {
  const file = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  async function upload(selected?: File) {
    if (!selected || disabled) return
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(selected.type) || selected.size > 5 * 1024 * 1024) { setError('Choose a PNG, JPG, WebP, or GIF under 5 MB.'); return }
    setBusy(true); setError('')
    try {
      const result = await api.uploadMedia(selected)
      const base = import.meta.env.VITE_API_BASE_URL || window.location.origin
      const url = new URL(result.media.url, base).href
      if (mounted.current) { onChange(url); if (result.warning) setError(result.warning) }
    } catch (cause) { if (mounted.current) setError((cause as Error).message) }
    finally { if (mounted.current) setBusy(false) }
  }
  return <div className="ct-logo-field"><label className="ce-field">Logo image URL<input type="url" disabled={disabled || busy} value={value} placeholder="https://yourbrand.com/logo.png" onChange={event => onChange(event.target.value)}/></label><input ref={file} hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={event => { void upload(event.target.files?.[0]); event.target.value = '' }}/><button type="button" className="ct-secondary" disabled={disabled || busy} onClick={() => file.current?.click()}><Upload size={13}/>{busy ? 'Uploading logo…' : 'Upload logo'}</button><small>Your brand name is shown until you add a logo. PNG or JPG works best in email. Images must be publicly reachable.</small>{error && <p role="alert" className="ce-warning">{error}</p>}</div>
}

export function CrmTemplateGallery({ mode, value, disabled, onApply }: { mode: 'default' | 'visual' | 'html'; value: string; disabled?: boolean; onApply: (html: string) => void }) {
  const [open, setOpen] = useState(false)
  return <div className="ct-launch"><div><span className="ct-launch-icon"><LayoutTemplate size={20}/></span><div><strong>A polished email starts here.</strong><p>{mode === 'html' ? 'One modern HTML layout. Your brand, your code.' : '10 ready-to-customize designs for every kind of conversation.'}</p></div></div><button type="button" className="ct-primary" disabled={disabled} onClick={() => setOpen(true)}>Browse {mode === 'html' ? 'HTML template' : 'templates'}<ArrowRight size={14}/></button>{open && <Gallery mode={mode} value={value} disabled={disabled} onClose={() => setOpen(false)} onApply={html => { if (!disabled) { onApply(html); setOpen(false) } }}/>}</div>
}

export function CrmTemplateCollection({ onChoose }: { onChoose: (html: string, name: string, mode: 'default' | 'visual' | 'html') => void }) {
  const [mode, setMode] = useState<'default' | 'visual' | 'html'>('default')
  const [selected, setSelected] = useState<string | null>(null)
  const designs = useMemo(() => mode === 'html' ? [{ id: 'studio', name: 'The studio letter', purpose: 'Custom HTML', description: 'A responsive editorial layout with editable branding and contact details.', surface: '#e9f0df', html: customHtmlTemplate(emptyBrand) }] : emailTemplates.map(item => ({ ...item, html: templateHtml(item, mode, emptyBrand) })), [mode])
  return <section className="cc-panel ct-library"><header><div><h2>Predesigned templates</h2><p>Choose a design, add your logo and contact details, then save your version or create a campaign.</p></div></header><nav className="ct-categories" aria-label="Predesigned template editor">{([{ id: 'default', label: 'Content Blocks · 10' }, { id: 'visual', label: 'Visual Builder · 10' }, { id: 'html', label: 'Custom HTML · 1' }] as const).map(item => <button type="button" key={item.id} aria-pressed={mode === item.id} onClick={() => setMode(item.id)}>{item.label}</button>)}</nav><div className="ct-grid">{designs.map(item => <button type="button" className="ct-card" key={item.id} onClick={() => setSelected(item.id)}><div className="ct-thumbnail" style={{ background: item.surface }}><iframe sandbox="" loading="lazy" tabIndex={-1} aria-hidden="true" title={`${item.name} preview`} srcDoc={item.html}/><span className="ct-card-tag">{item.purpose}</span></div><div className="ct-card-description"><strong>{item.name}<ArrowRight size={15}/></strong><p>{item.description}</p><span>Customize this template</span></div></button>)}</div>{selected && <Gallery mode={mode} value="" initialSelected={selected} onClose={() => setSelected(null)} onApply={(html, name) => { onChoose(html, name, mode); setSelected(null) }}/>}</section>
}

function Gallery({ mode, value, disabled, onClose, onApply, initialSelected }: { mode: 'default' | 'visual' | 'html'; value: string; disabled?: boolean; onClose: () => void; onApply: (html: string, name: string) => void; initialSelected?: string }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [selected, setSelected] = useState<string | null>(initialSelected || (mode === 'html' ? 'studio' : null))
  const [brand, setBrand] = useState<EmailBrand>(() => {
    const doc = new DOMParser().parseFromString(value, 'text/html')
    const logo = doc.querySelector<HTMLElement>('[data-crm-block="logo"],[data-crm-visual="logo"]')
    const footer = doc.querySelector<HTMLElement>('[data-crm-block="contact"],[data-crm-visual="contact"]')
    return { ...emptyBrand, name: logo?.dataset.brandName || footer?.dataset.brandName || emptyBrand.name, logo: logo?.dataset.brandUrl || '', website: footer?.dataset.brandUrl || '', email: footer?.dataset.email || '', phone: footer?.dataset.phone || '', address: footer?.dataset.address || '' }
  })
  const [mobile, setMobile] = useState(false)
  const [category, setCategory] = useState('All designs')
  const [replace, setReplace] = useState(false)
  useEffect(() => { dialog.current?.showModal() }, [])
  const template = emailTemplates.find(item => item.id === selected)
  const html = useMemo(() => mode === 'html' ? customHtmlTemplate(brand) : template ? templateHtml(template, mode, brand) : '', [mode, template, brand])
  const thumbnails = useMemo(() => emailTemplates.map(item => ({ ...item, html: templateHtml(item, mode === 'visual' ? 'visual' : 'default', emptyBrand) })), [mode])
  const categories = ['All designs', 'Grow', 'Inform', 'Connect']
  const groups: Record<string, string[]> = { Grow: ['welcome', 'launch', 'offer', 'proposal'], Inform: ['newsletter', 'appointment', 'onboarding'], Connect: ['event', 'feedback', 'reconnect'] }
  const invalid = !brand.name.trim() || (!!brand.logo && !/^https?:\/\//i.test(brand.logo)) || (!!brand.website && !/^https?:\/\//i.test(brand.website)) || (!!brand.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(brand.email))
  function apply() { if (disabled || invalid) return; if (value.trim() && !replace) { setReplace(true); return }; onApply(html, mode === 'html' ? 'The studio letter' : template?.name || 'New template') }
  return <dialog ref={dialog} className="ct-dialog" aria-labelledby="ct-gallery-title" onCancel={event => { event.preventDefault(); onClose() }}><header className="ct-dialog-heading"><div><span className="ct-eyebrow">THE EMAIL COLLECTION</span><h2 id="ct-gallery-title">{selected ? mode === 'html' ? 'The studio letter' : template?.name : 'Designed to start a conversation.'}</h2><p>{selected ? 'Make it yours. Preview your branding before applying.' : 'Pick a purpose. Add your brand. Make an impression.'}</p></div><button type="button" className="ct-close" aria-label="Close template gallery" onClick={onClose}><X size={20}/></button></header>
    {!selected ? <><nav className="ct-categories" aria-label="Template categories">{categories.map(item => <button type="button" key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}<span>10 designs · {mode === 'visual' ? 'Visual builder' : 'Content blocks'}</span></nav><div className="ct-grid">{thumbnails.filter(item => category === 'All designs' || groups[category]?.includes(item.id)).map(item => <button type="button" key={item.id} className="ct-card" onClick={() => { setSelected(item.id); setReplace(false) }}><div className="ct-thumbnail" style={{ background: item.surface }}><iframe loading="lazy" tabIndex={-1} aria-hidden="true" title={`${item.name} thumbnail`} sandbox="" srcDoc={item.html}/><span className="ct-card-tag">{item.purpose}</span></div><div className="ct-card-description"><strong>{item.name}<ArrowRight size={15}/></strong><p>{item.description}</p><span>{mode === 'visual' ? 'Editable visual sections' : 'Editable content blocks'}</span></div></button>)}</div></> : <div className="ct-customize"><aside className="ct-brand">{mode !== 'html' && <button type="button" className="ct-back" onClick={() => { setSelected(null); setReplace(false) }}><ArrowLeft size={14}/>All designs</button>}<h3>Your brand, front and center.</h3><p className="ct-help">These details fill the logo header and contact footer. All content stays editable.</p><label className="ce-field">Business / brand name<input maxLength={100} value={brand.name} disabled={disabled} onChange={e => setBrand({ ...brand, name: e.target.value })}/></label><EmailLogoField value={brand.logo} disabled={disabled} onChange={logo => setBrand(current => ({ ...current, logo }))}/><h4>Where customers find you</h4>{([{ key: 'website', label: 'Website / button destination', placeholder: 'https://yourbrand.com', type: 'url' }, { key: 'email', label: 'Contact email', placeholder: 'hello@yourbrand.com', type: 'email' }, { key: 'phone', label: 'Phone number', placeholder: '+234 …', type: 'tel' }, { key: 'address', label: 'Business address', placeholder: 'Street, city, country', type: 'text' }] as const).map(field => <label className="ce-field" key={field.key}>{field.label}<input type={field.type} value={brand[field.key]} maxLength={300} placeholder={field.placeholder} disabled={disabled} onChange={e => setBrand({ ...brand, [field.key]: e.target.value })}/></label>)}<p className="ct-help">Optional contact fields are omitted when blank. Add a destination for the call-to-action button, then tailor it to your campaign.</p>{invalid && <p className="ce-warning">Enter a brand name, valid contact email, and complete http(s) URLs where provided.</p>}</aside><section className="ct-preview"><div className="ct-preview-heading"><span>YOUR EMAIL / LIVE PREVIEW</span><div><button type="button" aria-label="Desktop template preview" aria-pressed={!mobile} onClick={() => setMobile(false)}><Monitor size={16}/></button><button type="button" aria-label="Mobile template preview" aria-pressed={mobile} onClick={() => setMobile(true)}><Smartphone size={16}/></button></div></div><div className={`ct-preview-stage ${mobile ? 'is-mobile' : ''}`}><iframe sandbox="" title="Branded template preview" srcDoc={html}/></div></section></div>}
    <footer className="ct-footer"><div>{replace ? <><strong>Replace the current email content?</strong><p>Your existing content will be replaced with this branded design.</p></> : <><strong>{selected ? 'Ready for your finishing touches.' : 'Made for your brand.'}</strong><p>{selected ? 'Replace bracketed sample text and check all links before sending.' : 'Every design includes an editable logo and contact footer.'}</p></>}</div><div>{replace && <button type="button" className="ct-secondary" onClick={() => setReplace(false)}>Keep editing</button>}<button type="button" className="ct-secondary" onClick={onClose}>Cancel</button>{selected && <button type="button" className="ct-primary" disabled={disabled || invalid} onClick={apply}><Check size={15}/>{replace ? 'Replace content' : 'Use this template'}</button>}</div></footer>
  </dialog>
}
