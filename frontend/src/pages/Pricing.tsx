import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Code2,
  Loader2,
  Mail,
  Phone,
  Shield,
  ShoppingCart,
  Sparkles,
  Wrench,
} from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import * as PricingCard from '@/components/ui/pricing-card'
import { api, type PricingCategory, type PricingPlan } from '@/lib/api'
import { cn } from '@/lib/utils'

type WizardStep = 1 | 2 | 3 | 4
type NeedType = 'new' | 'existing' | ''

const currencySymbols: Record<string, string> = { NGN: 'NGN ', USD: '$', GBP: 'GBP ' }
const categoryIcons = [Building2, ShoppingCart, CalendarDays, Code2]
const categoryTints = ['bg-[#ede9fe]', 'bg-[#dff4ff]', 'bg-[#fff2ca]', 'bg-[#e8f0ff]']

const supportIcons = [Wrench, Sparkles, Code2, Shield]

function money(amount: number | null | undefined, currency: string) {
  if (amount === null || amount === undefined) return 'Custom Pricing'
  return `${currencySymbols[currency] || currency}${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function planAmount(plan: PricingPlan, currency: string) {
  const base = plan.prices?.[currency]
  if (base === null || base === undefined) return null
  const promo = plan.promoPrices?.[currency]
  if (promo !== null && promo !== undefined && Number(promo) > 0) return Number(promo)
  const discount = Number(plan.discountPercentage || 0)
  return Math.max(0, Math.round(Number(base) - (Number(base) * discount / 100)))
}

function categoryStartPrice(category: PricingCategory, currency: string) {
  const prices = category.plans.map((plan) => planAmount(plan, currency)).filter((value): value is number => typeof value === 'number')
  return prices.length ? Math.min(...prices) : null
}

function planPeriod(plan: PricingPlan, category: PricingCategory | null) {
  if (category?.serviceType === 'existing_website') {
    const label = `${plan.name} ${plan.slug}`.toLowerCase()
    if (label.includes('24')) return '/24hrs'
    if (label.includes('week')) return '/week'
    if (label.includes('month')) return '/month'
    return ''
  }

  return plan.billingType === 'monthly' ? '/month' : '/project'
}

function basePath(pathname: string) {
  return pathname.startsWith('/admin/pricing-preview') ? '/admin/pricing-preview' : '/pricing'
}

function Header() {
  return (
    <header className="mx-auto mt-4 w-[min(1500px,calc(100%-32px))] rounded-[1.2rem] border border-slate-200 bg-white/95 shadow-[0_18px_56px_rgba(15,23,42,0.10)] backdrop-blur-xl">
      <div className="flex min-h-[82px] items-center justify-between gap-4 px-4 md:px-6">
        <Link to="/" aria-label="Bakhtech home">
          <img src="/bakhtech-logo-light.png" alt="Bakhtech" className="h-12 w-auto" />
        </Link>
        <div className="flex items-center gap-2 md:gap-3">
          <Link to="/" className="hidden min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-black text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 sm:inline-flex">
            <ArrowLeft className="h-4 w-4" />
            Back to Site
          </Link>
          <Link to="/booking" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-950 shadow-sm transition hover:bg-slate-50 md:px-5">
            <Phone className="h-4 w-4" />
            Book a Call
          </Link>
        </div>
      </div>
    </header>
  )
}

function StepHero({ step, label, title, text }: { step: WizardStep; label: string; title: React.ReactNode; text: string }) {
  return (
    <section className="rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.07)] md:p-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <span className="text-xs font-black uppercase tracking-[0.14em] text-[#255fbf]">Step {step} of 4</span>
        <span className="hidden text-xs font-black uppercase tracking-[0.16em] text-[#255fbf] sm:block">{label}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-[#2f73ed] transition-all duration-500" style={{ width: `${step * 25}%` }} />
      </div>
      <h1 className="mt-7 max-w-4xl text-[clamp(2.1rem,5vw,4.35rem)] font-black leading-[0.98] tracking-[-0.02em] text-[#071225]">{title}</h1>
      <p className="mt-5 max-w-2xl text-base font-semibold leading-8 text-slate-500 md:text-lg">{text}</p>
    </section>
  )
}

export function Pricing() {
  const location = useLocation()
  const navigate = useNavigate()
  const params = useParams()
  const rootPath = basePath(location.pathname)
  const [categories, setCategories] = useState<PricingCategory[]>([])
  const [currencies, setCurrencies] = useState(['NGN', 'USD', 'GBP'])
  const [currency, setCurrency] = useState('NGN')
  const [needType, setNeedType] = useState<NeedType>(params.categorySlug ? 'new' : '')
  const [step, setStep] = useState<WizardStep>(params.categorySlug ? 3 : 1)
  const [selectedCategorySlug, setSelectedCategorySlug] = useState(params.categorySlug || '')
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null)
  const [client, setClient] = useState({ name: '', email: '', phone: '', companyName: '', address: '' })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api.publicPricing(currency)
      .then((result) => {
        if (!active) return
        setCategories(result.categories)
        setCurrencies(result.currencies)
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load pricing.'))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [currency])

  useEffect(() => {
    if (params.categorySlug) {
      queueMicrotask(() => {
        setNeedType('new')
        setSelectedCategorySlug(params.categorySlug || '')
        setStep(3)
      })
    }
  }, [params.categorySlug])

  const selectedCategory = useMemo(() => categories.find((category) => category.slug === selectedCategorySlug) ?? null, [categories, selectedCategorySlug])
  const newWebsiteCategories = useMemo(() => categories.filter((category) => (category.serviceType || 'new_website') === 'new_website'), [categories])
  const supportCategories = useMemo(() => categories.filter((category) => category.serviceType === 'existing_website'), [categories])
  const plans = selectedCategory?.plans ?? []
  const popularPlan = plans.find((plan) => plan.isPopular) ?? plans[1] ?? plans[0]

  useEffect(() => {
    if (!params.categorySlug || !selectedCategory) return
    queueMicrotask(() => setNeedType(selectedCategory.serviceType === 'existing_website' ? 'existing' : 'new'))
  }, [params.categorySlug, selectedCategory])

  function goBack() {
    if (step === 1) return
    if (step === 2) {
      setStep(1)
      setNeedType('')
      navigate(rootPath)
      return
    }
    if (step === 3) {
      setSelectedPlan(null)
      setStep(2)
      navigate(rootPath)
      return
    }
    setStep(3)
  }

  function selectNeed(type: Exclude<NeedType, ''>) {
    setNeedType(type)
    setSelectedPlan(null)
    setSelectedCategorySlug('')
    setStep(2)
    navigate(rootPath)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function selectCategory(category: PricingCategory) {
    setSelectedCategorySlug(category.slug)
    setSelectedPlan(null)
    setStep(3)
    navigate(`${rootPath}/${category.slug}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function selectPlan(plan: PricingPlan) {
    setSelectedPlan(plan)
    setStep(4)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function submitCheckout(event: FormEvent) {
    event.preventDefault()
    if (!selectedPlan) return

    setSubmitting(true)
    setError('')
    try {
      const result = await api.checkoutPricingPlan({
        planId: selectedPlan.id,
        currency,
        documentType: planAmount(selectedPlan, currency) === null ? 'quote' : 'invoice',
        client,
        message,
      })
      window.location.href = result.document.publicUrl
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Unable to create invoice.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f6fb] pb-16 text-[#071225]">
      <Header />
      <div className="mx-auto w-[min(1320px,calc(100%-32px))] py-8 md:py-12">
        {step > 1 && (
          <button type="button" onClick={goBack} className="mb-8 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-black text-slate-500 shadow-sm transition hover:text-slate-950">
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        )}

        {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}

        {loading ? (
          <div className="grid min-h-[520px] place-items-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#2f73ed]" />
          </div>
        ) : (
          <>
            {step === 1 && (
              <>
                <StepHero
                  step={1}
                  label="Choose one option"
                  title="Choose what you need"
                  text="Start by selecting one option below, then choose the exact service that matches your situation."
                />
                <section className="mt-7 rounded-[1.25rem] border border-slate-200 bg-white p-3 shadow-sm md:p-5">
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500">Choose one option</p>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <button type="button" onClick={() => selectNeed('new')} className="group grid min-h-24 grid-cols-[24px_1fr_auto] items-center gap-4 rounded-lg border border-slate-200 bg-white p-5 text-left transition hover:border-[#2f73ed] hover:shadow-[0_18px_44px_rgba(47,115,237,0.13)]">
                      <span className="h-5 w-5 rounded-full border-2 border-slate-300 group-hover:border-[#2f73ed]" />
                      <span>
                        <strong className="block text-lg font-black">I need a new website</strong>
                        <span className="mt-1 block font-semibold text-slate-500">Web development, redesigns, and full website projects.</span>
                      </span>
                      <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-[#2f73ed]" />
                    </button>
                    <button type="button" onClick={() => selectNeed('existing')} className="group grid min-h-24 grid-cols-[24px_1fr_auto] items-center gap-4 rounded-lg border border-slate-200 bg-white p-5 text-left transition hover:border-[#2f73ed] hover:shadow-[0_18px_44px_rgba(47,115,237,0.13)]">
                      <span className="h-5 w-5 rounded-full border-2 border-slate-300 group-hover:border-[#2f73ed]" />
                      <span>
                        <strong className="block text-lg font-black">I need help with an existing website</strong>
                        <span className="mt-1 block font-semibold text-slate-500">Maintenance, bug fixes, content updates, security, and backups.</span>
                      </span>
                      <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-[#2f73ed]" />
                    </button>
                  </div>
                </section>
              </>
            )}

            {step === 2 && needType === 'new' && (
              <>
                <StepHero
                  step={2}
                  label="Choose website category"
                  title="Choose the website service you need"
                  text="Select the kind of website project you want to start."
                />
                <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {newWebsiteCategories.map((category, index) => {
                    const Icon = categoryIcons[index % categoryIcons.length]
                    return (
                      <button key={category.id} type="button" onClick={() => selectCategory(category)} className="group flex min-h-[260px] flex-col rounded-[1.2rem] border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#2f73ed] hover:shadow-[0_22px_52px_rgba(15,23,42,0.12)]">
                        <span className={cn('grid h-14 w-14 place-items-center rounded-2xl', categoryTints[index % categoryTints.length])}>
                          <Icon className="h-6 w-6 text-[#071225]" />
                        </span>
                        <h2 className="mt-5 text-xl font-black">{category.name.replace(' Websites', '').replace(' Systems', '')}</h2>
                        <p className="mt-4 flex-1 text-base font-semibold leading-7 text-slate-600">{category.description}</p>
                        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                          <strong className="text-sm font-black uppercase">From {money(categoryStartPrice(category, currency), currency)}</strong>
                          <ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#2f73ed]" />
                        </div>
                      </button>
                    )
                  })}
                </section>
              </>
            )}

            {step === 2 && needType === 'existing' && (
              <>
                <StepHero
                  step={2}
                  label="Choose support service"
                  title="Choose the service you need help with"
                  text="Select the support service that matches the work you want done on your existing website."
                />
                <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {supportCategories.map((category, index) => {
                    const Icon = supportIcons[index % supportIcons.length]
                    return (
                    <button key={category.id} type="button" onClick={() => selectCategory(category)} className="group flex min-h-[250px] flex-col rounded-[1.2rem] border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#2f73ed] hover:shadow-[0_22px_52px_rgba(15,23,42,0.12)]">
                      <span className={cn('grid h-14 w-14 place-items-center rounded-2xl', categoryTints[index % categoryTints.length])}>
                        <Icon className="h-6 w-6 text-[#071225]" />
                      </span>
                      <h2 className="mt-5 text-xl font-black">{category.name}</h2>
                      <p className="mt-4 flex-1 text-base font-semibold leading-7 text-slate-600">{category.description}</p>
                      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                        <strong className="text-sm font-black uppercase">From {money(categoryStartPrice(category, currency), currency)}</strong>
                        <ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#2f73ed]" />
                      </div>
                    </button>
                    )
                  })}
                </section>
              </>
            )}

            {step === 3 && selectedCategory && (
              <>
                <section className="rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.07)] md:p-8">
                  <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2f73ed]">Step 3 of 4</p>
                      <h1 className="mt-4 text-[clamp(2rem,4vw,3.2rem)] font-black leading-tight">Choose your <span className="text-[#2f73ed]">package</span></h1>
                      <p className="mt-4 max-w-2xl text-base font-semibold leading-8 text-slate-500">
                        Select the package that fits <strong>{selectedCategory.name}</strong>. {selectedCategory.serviceType === 'existing_website' ? 'Pick the response window that matches how quickly you need the work handled.' : 'Pick the one that matches the size and scope of your project.'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {currencies.map((item) => (
                        <button key={item} type="button" onClick={() => { setLoading(true); setCurrency(item) }} className={cn('min-h-10 rounded-lg border px-4 text-sm font-black transition', currency === item ? 'border-[#2f73ed] bg-[#2f73ed] text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-5 lg:grid-cols-3">
                    {plans.map((plan) => (
                      <PricingCard.Card key={plan.id} className={cn('max-w-none transition hover:-translate-y-1', popularPlan?.id === plan.id && 'border-blue-100 shadow-[0_24px_60px_rgba(47,115,237,0.16)] ring-2 ring-blue-100/80')}>
                        <PricingCard.Header className={popularPlan?.id === plan.id ? 'border-blue-100 bg-blue-50/70' : undefined}>
                          <PricingCard.Plan>
                            <PricingCard.PlanName>
                              <Building2 className="text-[#2f73ed]" />
                              <span>{plan.name}</span>
                            </PricingCard.PlanName>
                            {popularPlan?.id === plan.id && <PricingCard.Badge className="bg-[#071225] text-white">Popular</PricingCard.Badge>}
                          </PricingCard.Plan>
                          <PricingCard.Price>
                            <PricingCard.MainPrice>{money(planAmount(plan, currency), currency)}</PricingCard.MainPrice>
                            <PricingCard.Period>{planPeriod(plan, selectedCategory)}</PricingCard.Period>
                          </PricingCard.Price>
                          <Button type="button" onClick={() => selectPlan(plan)} className="min-h-12 w-full rounded-lg bg-gradient-to-r from-[#2f73ed] to-[#5538ee] text-base font-black text-white hover:opacity-95">
                            Select {plan.name}
                          </Button>
                        </PricingCard.Header>
                        <PricingCard.Body>
                          <PricingCard.Description>{plan.description}</PricingCard.Description>
                          <PricingCard.List>
                            {plan.features.filter((feature) => feature.isIncluded).map((feature) => (
                              <PricingCard.ListItem key={`${plan.id}-${feature.title}`} className="font-semibold text-slate-700">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#2f73ed]" />
                                <span>{feature.title}</span>
                              </PricingCard.ListItem>
                            ))}
                          </PricingCard.List>
                        </PricingCard.Body>
                      </PricingCard.Card>
                    ))}
                  </div>
                </section>

                <section className="mt-6 rounded-[1.25rem] bg-[#071225] p-6 text-white shadow-[0_20px_56px_rgba(15,23,42,0.16)] md:p-8">
                  <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                    <div>
                      <h2 className="text-2xl font-black">Need something completely unique?</h2>
                      <p className="mt-3 max-w-3xl font-semibold leading-7 text-slate-300">Complex integrations, bespoke logic, or compliance needs? We can tailor a solution to your business.</p>
                      <p className="mt-4 text-sm font-bold text-slate-400">Custom contract and NDA available</p>
                    </div>
                    <Link to="/booking" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-white px-6 text-sm font-black text-[#071225] transition hover:bg-slate-100">
                      Get a Custom Quote
                    </Link>
                  </div>
                </section>
              </>
            )}

            {step === 4 && selectedPlan && selectedCategory && (
              <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
                <div>
                  <StepHero
                    step={4}
                    label="Client details"
                    title="Enter your details"
                    text="We will create a secure invoice link using your selected package and lock the price and features."
                  />
                  <form onSubmit={submitCheckout} className="mt-7 rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="grid gap-2 text-sm font-black text-slate-700">
                        Name
                        <input required value={client.name} onChange={(event) => setClient({ ...client, name: event.target.value })} className="min-h-12 rounded-lg border border-slate-200 px-4 outline-none focus:border-[#2f73ed]" />
                      </label>
                      <label className="grid gap-2 text-sm font-black text-slate-700">
                        Email
                        <div className="relative">
                          <Mail className="absolute left-4 top-4 h-4 w-4 text-slate-400" />
                          <input type="email" value={client.email} onChange={(event) => setClient({ ...client, email: event.target.value })} className="min-h-12 w-full rounded-lg border border-slate-200 pl-11 pr-4 outline-none focus:border-[#2f73ed]" />
                        </div>
                      </label>
                      <label className="grid gap-2 text-sm font-black text-slate-700">
                        Phone
                        <div className="relative">
                          <Phone className="absolute left-4 top-4 h-4 w-4 text-slate-400" />
                          <input value={client.phone} onChange={(event) => setClient({ ...client, phone: event.target.value })} className="min-h-12 w-full rounded-lg border border-slate-200 pl-11 pr-4 outline-none focus:border-[#2f73ed]" />
                        </div>
                      </label>
                      <label className="grid gap-2 text-sm font-black text-slate-700">
                        Company
                        <input value={client.companyName} onChange={(event) => setClient({ ...client, companyName: event.target.value })} className="min-h-12 rounded-lg border border-slate-200 px-4 outline-none focus:border-[#2f73ed]" />
                      </label>
                    </div>
                    <label className="mt-4 grid gap-2 text-sm font-black text-slate-700">
                      Project notes
                      <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={5} className="rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-[#2f73ed]" />
                    </label>
                    <Button disabled={submitting} className="mt-5 min-h-12 w-full rounded-lg bg-gradient-to-r from-[#2f73ed] to-[#5538ee] text-base font-black text-white hover:opacity-95">
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Generate Invoice
                    </Button>
                  </form>
                </div>

                <aside className="h-fit rounded-[1.25rem] border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-8">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2f73ed]">Selected package</p>
                  <h2 className="mt-3 text-2xl font-black">{selectedPlan.name}</h2>
                  <p className="mt-2 text-sm font-semibold text-slate-500">{selectedCategory.name}</p>
                  <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                    <span className="text-sm font-black text-slate-500">Invoice total</span>
                    <strong className="mt-2 block text-4xl font-black">{money(planAmount(selectedPlan, currency), currency)}</strong>
                  </div>
                  <ul className="mt-5 grid gap-3">
                    {selectedPlan.features.filter((feature) => feature.isIncluded).slice(0, 8).map((feature) => (
                      <li key={feature.title} className="flex gap-3 text-sm font-semibold text-slate-700">
                        <Check className="h-4 w-4 shrink-0 text-[#12c8a0]" />
                        {feature.title}
                      </li>
                    ))}
                  </ul>
                </aside>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  )
}
