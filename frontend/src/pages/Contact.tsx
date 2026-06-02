import { PageHero } from '@/components/ui/PageHero'
import { Section } from '@/components/ui/Section'
import { Button } from '@/components/ui/button'
import { contactItems } from '@/data/site'

export function Contact() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Ready to get started?"
        text="Building Your Online Presence, One Click at a Time!"
        image="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=80"
      />
      <Section eyebrow="Contact" title="Request A Quote">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="grid gap-4">
            {contactItems.map((item) => (
              <div key={item.label} className="surface-card rounded-lg p-6">
                <item.icon className="mb-4 h-6 w-6 text-[#1261ff]" />
                <p className="text-soft text-sm font-bold uppercase tracking-[0.18em]">{item.label}</p>
                <p className="text-main mt-2 font-black">{item.value}</p>
              </div>
            ))}
          </div>
          <form className="surface-card grid gap-4 rounded-lg p-6 md:p-8">
            {['Name', 'Email', 'Company'].map((field) => (
              <label key={field} className="text-main grid gap-2 text-sm font-bold">
                {field}
                <input className="theme-input min-h-12 rounded-lg px-4 outline-none transition" />
              </label>
            ))}
            <label className="text-main grid gap-2 text-sm font-bold">
              Message
              <textarea className="theme-input min-h-36 rounded-lg px-4 py-3 outline-none transition" />
            </label>
            <Button type="submit" showArrow>
              Get A Quote
            </Button>
          </form>
        </div>
      </Section>
    </>
  )
}
