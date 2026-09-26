import { AnimatedCta } from '@/components/ui/animated-cta'
import { whiteBakhtechLogo } from '@/data/brand-assets'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, MessageCircle } from 'lucide-react'
import { investment, money, quoteApi, type Catalog, type Configuration, type Estimate } from '@/lib/quote-builder'
import { chooseProject, detailsComplete } from '@/lib/quote-builder-state'
import './quote-builder.css'

const empty: Configuration = { project_type: '', discovery: '', answers: {}, features: [] }
const steps = ['Project', 'Details', 'Functionality', 'Review']

export function QuoteBuilder() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [config, setConfig] = useState<Configuration>(empty)
  const [step, setStep] = useState(0)
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [contact, setContact] = useState(false)
  const [reference, setReference] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)
  const goals = (catalog?.types || []).filter(t => t.discovery_key && t.discovery_label).map(t => ({ value: t.discovery_key!, label: t.discovery_label!, type: t.slug }))
  const selected = config.project_type === 'unsure' ? goals.find(g => g.value === config.discovery)?.type : config.project_type
  const type = catalog?.types.find(t => t.slug === selected)
  const showcase = catalog?.types.find(t => t.discovery_key === 'showcase')

  useEffect(() => { const controller = new AbortController(); quoteApi<Catalog>('catalog', undefined, false, controller.signal).then(setCatalog).catch(e => { if (!controller.signal.aborted) setError(e.message) }); return () => controller.abort() }, [])
  useEffect(() => {
    if (!type) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setLoading(true)
      quoteApi<Estimate>('estimate', config, false, controller.signal).then(result => { setEstimate(result); setError('') }).catch(e => { if (!controller.signal.aborted) { setEstimate(null); setError(e.message) } }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    }, 200)
    return () => { clearTimeout(timer); controller.abort() }
  }, [config, type])
  function update(next: Configuration) { if (next === config) return; setConfig(next); setEstimate(null); setLoading(Boolean(next.project_type)); setError('') }
  function navigate(next: number) { setStep(next); setError(''); setTimeout(() => heading.current?.focus(), 0) }
  function next() {
    if (!type) return setError('Choose a project type or tell us your main goal.')
    if (step === 1 && !detailsComplete(type, config)) return setError('Please answer each question so we can understand your project.')
    navigate(step + 1)
  }
  function reset() { setConfig(empty); setEstimate(null); setContact(false); setReference(''); setLoading(false); navigate(0) }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (submitting) return
    const lead = Object.fromEntries(new FormData(event.currentTarget)); setSubmitting(true); setError('')
    try { const result = await quoteApi<{ reference: string }>('quotes', { ...config, ...lead }); setReference(result.reference) } catch (e) { setError((e as Error).message) } finally { setSubmitting(false) }
  }
  return <div className="qb qb-homepage">
    <header className="qb-header"><Link to="/" className="qb-brand" aria-label="Bakhtech Solutions home"><img src={whiteBakhtechLogo} alt="Bakhtech Solutions" width="120" height="40" /></Link><span className="qb-header-note">Website & application estimator</span><AnimatedCta to="/booking" label="Chat with us" icon={<MessageCircle size={16}/>} className="qb-home-cta" /></header>
    <main className="qb-main">
      <div className="qb-intro"><span className="qb-eyebrow">PLAN YOUR NEXT PROJECT</span><h1>From your idea to a clearer estimate.</h1><p>Tell us what you're looking to build. We'll help you estimate what your project may cost.</p></div>
      {reference ? <section className="qb-success"><CheckCircle2 size={42}/><h2>Your requirements are with us.</h2><p>Thank you. Bakhtech will review your project and contact you about a formal quote.</p><p>Your reference</p><strong className="qb-reference">{reference}</strong><div className="qb-actions"><AnimatedCta className="qb-home-cta" to="/booking" label="Schedule a consultation" icon={<ArrowRight size={16}/>} /><button onClick={reset}>Start a new estimate</button></div></section> : <>
        <ol className="qb-progress" aria-label="Quote progress">{steps.map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined}><button disabled={index > step} onClick={() => navigate(index)}><span>{index < step ? <Check size={15}/> : `0${index + 1}`}</span>{label}</button></li>)}</ol>
        <div className="qb-layout"><section className="qb-panel">
          <span className="qb-eyebrow">STEP {step + 1} OF 4</span>
          <h2 tabIndex={-1} ref={heading}>{['What do you want to build?', 'A little more about your project', 'What should it be able to do?', 'Your project, at a glance'][step]}</h2>
          <p className="qb-muted">{['Choose the closest fit. We’ll help you work through the details.', 'A few relevant details help us make your estimate more useful.', 'Select what you need now. You can always discuss more with our team.', 'Review your requirements before requesting a formal quote.'][step]}</p>
          {!catalog && !error && <p role="status">Loading project options…</p>}
          {step === 0 && <><div className="qb-options">{catalog?.types.map(t => <button className={`qb-option ${config.project_type === t.slug ? 'is-selected' : ''}`} key={t.id} aria-pressed={config.project_type === t.slug} onClick={() => update(chooseProject(config, t.slug))}><span className="qb-choice-dot"/><strong>{t.name}</strong><p>{t.description}</p><small>From {money(t.base_min)}</small></button>)}<button className={`qb-option ${config.project_type === 'unsure' ? 'is-selected' : ''}`} aria-pressed={config.project_type === 'unsure'} onClick={() => update(chooseProject(config, 'unsure', config.project_type === 'unsure' ? config.discovery : ''))}><span className="qb-choice-dot"/><strong>I'm not sure</strong><p>Tell us your goal and we’ll suggest a starting point.</p><small>Let’s figure it out together</small></button></div>{type?.discovery_key === 'sell' && showcase && <div className="qb-result qb-catalogue-alternative"><h3>Just need to showcase your products?</h3><p>{showcase.name} starts from {money(showcase.base_min)}. Customers browse your products and contact you directly. Choose ecommerce when you need a cart, checkout and order management.</p><button type="button" onClick={() => update(chooseProject(config, showcase.slug))}>Choose {showcase.name} <ArrowRight size={15}/></button></div>}{config.project_type === 'unsure' && <fieldset className="qb-discovery"><legend>What would you like to achieve?</legend>{goals.filter(g => catalog?.types.some(t => t.slug === g.type)).map(g => <label className="qb-radio" key={g.value}><input type="radio" name="discovery" checked={config.discovery === g.value} onChange={() => update(chooseProject(config, 'unsure', g.value))}/>{g.label}</label>)}</fieldset>}</>}
          {step === 1 && type?.questions.map(q => <fieldset className="qb-question" key={q.id}><legend>{q.label}</legend><div className="qb-answer-options">{q.options.map(o => <label key={o.label} className={`qb-radio ${config.answers[q.id] === o.label ? 'is-selected' : ''}`}><input type="radio" name={`question-${q.id}`} checked={config.answers[q.id] === o.label} onChange={() => update({ ...config, answers: { ...config.answers, [q.id]: o.label } })}/>{o.label}</label>)}</div></fieldset>)}
          {step === 2 && <div className="qb-features">{type?.features.map(f => <label key={f.id} className={`qb-feature ${!f.optional || config.features.includes(f.id) ? 'is-selected' : ''}`}><input type="checkbox" checked={!f.optional || config.features.includes(f.id)} disabled={!f.optional} onChange={e => update({ ...config, features: e.target.checked ? [...config.features, f.id] : config.features.filter(id => id !== f.id) })}/><span><strong>{f.name}</strong><small>{f.description}</small></span><em>{!f.optional ? 'Included' : f.custom_quote ? 'Scope review' : f.price ? `+ ${money(f.price)}` : 'No extra cost'}</em></label>)}</div>}
          {step === 3 && estimate && <div className="qb-review"><div className="qb-result"><small>RECOMMENDED SOLUTION</small><h3>{estimate.recommended_type}</h3><p>{estimate.recommendation}</p></div><h3>What you selected</h3><p>{config.project_type === 'unsure' ? `Discovery: ${goals.find(g => g.value === config.discovery)?.label}` : type?.name}</p><dl>{estimate.answers.map(a => <div key={a.question_label}><dt>{a.question_label}</dt><dd>{a.answer}</dd></div>)}</dl><h3>What's included</h3><ul><li>Responsive design for desktop, tablet and mobile</li><li>Project planning, development and launch support</li>{estimate.features.map(f => <li key={f.name}>{f.name}</li>)}</ul><button onClick={() => navigate(1)}>Edit project details</button></div>}
          {error && <div role="alert" className="qb-error">{error}{!catalog && <button onClick={() => window.location.reload()}>Retry</button>}</div>}
          {step === 3 && contact && <form onSubmit={submit} className="qb-contact"><h3>Where can we reach you?</h3><p>We’ll use these details to follow up on your project.</p><div className="qb-options">{[['name','Your name','text'],['company','Business / company name','text'],['email','Email address','email'],['phone','Phone / WhatsApp','tel']].map(([name,label,inputType]) => <label key={name}>{label}<input name={name} type={inputType} required maxLength={name === 'phone' ? 30 : 150} autoComplete={{name:'name',company:'organization',email:'email',phone:'tel'}[name]} /></label>)}</div><label>Project description <span className="qb-muted">(optional)</span><textarea name="description" rows={4} maxLength={5000}/></label><small>By submitting, you agree that we may contact you about this request. <Link to="/privacy-policy">Privacy policy</Link></small><AnimatedCta type="submit" className="qb-home-cta" disabled={submitting || loading || !estimate} label={submitting ? 'Sending your request...' : 'Send my quote request'} icon={<ArrowRight size={16}/>} /></form>}
          <div className="qb-actions">{step > 0 && <button onClick={() => navigate(step - 1)}><ArrowLeft size={16}/>Back</button>}{step < 3 ? <AnimatedCta className="qb-home-cta" onClick={next} disabled={!catalog} label="Continue" icon={<ArrowRight size={16}/>} /> : <>{!contact && <AnimatedCta className="qb-home-cta" disabled={!estimate || loading} onClick={() => setContact(true)} label="Get My Quote" icon={<ArrowRight size={16}/>} />}<button onClick={reset}>Start Over</button></>}</div>
        </section><aside className="qb-sidebar"><div className="qb-estimate"><span className="qb-eyebrow">YOUR PROJECT ESTIMATE</span><h3>Estimated investment</h3><div className="qb-amount" aria-live="polite">{loading && type ? 'Updating estimate…' : estimate && type ? investment(estimate) : 'Let’s find your starting point'}</div><p>{estimate?.custom_quote ? 'Your requirements need a closer look. Send them to us and we’ll work through the scope together.' : 'Your estimate is based on the requirements selected. Final pricing will be confirmed after we review your project requirements.'}</p>{type && <div className="qb-estimate-detail"><span>Project</span><strong>{type.name}</strong><span>Selected functionality</span><strong>{config.features.length + type.features.filter(f => !f.optional).length} features</strong></div>}<small>One-time project estimate in Nigerian naira. Hosting, domain names, ongoing support and third-party fees are scoped separately.</small></div><div className="qb-help"><strong>A little guidance goes a long way.</strong><p>Have something unusual in mind? Let’s talk through it.</p><Link to="/booking">Schedule a consultation <ArrowRight size={15}/></Link></div></aside></div>
      </>}
      <footer className="qb-footer">Bakhtech Solutions <span>Thoughtful websites. Useful software.</span></footer>
    </main>
  </div>
}
