import { Mail, MapPin, Phone } from 'lucide-react'
import { Boxes } from '@/components/ui/background-boxes'
import { BorderBeam } from '@/components/ui/border-beam'
import { Button } from '@/components/ui/button'
import { contactItems } from '@/data/site'

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
              <form className="relative z-10 grid gap-6">
                <div className="grid gap-5 md:grid-cols-2">
                  <label className="grid gap-2 text-sm font-bold">
                    Name
                    <input className="theme-input min-h-12 rounded-xl px-4 outline-none" name="name" autoComplete="name" />
                  </label>
                  <label className="grid gap-2 text-sm font-bold">
                    Email
                    <input className="theme-input min-h-12 rounded-xl px-4 outline-none" name="email" type="email" autoComplete="email" />
                  </label>
                </div>

                <label className="grid gap-2 text-sm font-bold">
                  Phone
                  <input className="theme-input min-h-12 rounded-xl px-4 outline-none" name="phone" type="tel" autoComplete="tel" />
                </label>

                <label className="grid gap-2 text-sm font-bold">
                  Message
                  <textarea
                    className="theme-input min-h-44 resize-y rounded-xl px-4 py-3 outline-none"
                    name="message"
                    placeholder="What are we building?"
                  />
                </label>

                <Button type="submit" showArrow className="min-h-12 rounded-xl bg-[#ef4444] px-6 font-black text-white shadow-none hover:bg-[#dc2626]">
                  Send message
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
