import { CinematicHero } from '@/components/ui/cinematic-landing-hero'
import { Section } from '@/components/ui/Section'
import { ButtonLink } from '@/components/ui/button'
import { SmoothReveal } from '@/components/ui/smooth-reveal'
import { portfolio, process, seoFeatures, services, stats, websiteTypes } from '@/data/site'

export function Home() {
  return (
    <>
      <CinematicHero
        brandName="Bakhtech"
        tagline1="Need a website"
        tagline2="that stands out?"
        cardHeading="Empower Your Business"
        cardDescription={
          <>
            <span className="font-semibold text-white">Bakhtech Solutions</span> specializes in creating visually
            striking, user-friendly websites that help businesses build a strong online presence.
          </>
        }
        metricValue={98}
        metricLabel="Positive Feedback"
        ctaHeading="Ready to get started?"
        ctaDescription="Building Your Online Presence, One Click at a Time!"
      />
      <SmoothReveal>
        <Section
          eyebrow="Welcome To Bakhtech Solutions"
          title="Empower Your Business"
          text="We specialize in creating websites that not only reflect your brand identity but also resonate with your target audience. Let's collaborate to bring your unique vision to life and leave a lasting impact in the digital realm."
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <article key={service.title} className="surface-card rounded-lg p-6 shadow-sm">
                <service.icon className="mb-5 h-7 w-7 text-[#1261ff]" />
                <h3 className="text-main text-xl font-black">{service.title}</h3>
                <p className="text-soft mt-3 leading-7">{service.text}</p>
              </article>
            ))}
          </div>
        </Section>
      </SmoothReveal>

      <SmoothReveal>
        <section className="bg-[#07101f] py-16 text-white">
          <div className="container-x grid gap-4 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-lg border border-white/10 bg-white/[0.04] p-6">
                <div className="text-4xl font-black tracking-tight text-[#12c8a0]">{stat.value}</div>
                <div className="mt-2 text-sm font-semibold text-slate-300">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>
      </SmoothReveal>

      <SmoothReveal>
        <Section
          eyebrow="Responsive Design"
          title="Ready to make a lasting impression?"
          text="Our responsive web design ensures your site not only looks stunning on all devices but also offers an optimal user experience. Stay ahead in the mobile-first era - let's create a website that adapts and impresses."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {seoFeatures.map((feature) => (
              <article key={feature.title} className="surface-card flex gap-4 rounded-lg p-6">
                <feature.icon className="mt-1 h-6 w-6 shrink-0 text-[#12c8a0]" />
                <div>
                  <h3 className="text-main text-lg font-black">{feature.title}</h3>
                  <p className="text-soft mt-2 leading-7">{feature.text}</p>
                </div>
              </article>
            ))}
          </div>
        </Section>
      </SmoothReveal>

      <SmoothReveal>
        <Section eyebrow="We Design & Develop" title="All Kinds of Website" className="section-strong">
          <div className="flex flex-wrap gap-3">
            {websiteTypes.map((type) => (
              <span key={type} className="surface-card rounded-full px-4 py-2 text-sm font-semibold">
                {type}
              </span>
            ))}
          </div>
        </Section>
      </SmoothReveal>

      <SmoothReveal>
        <Section eyebrow="Projects" title="Explore Project" className="section-strong">
          <div className="grid gap-5 md:grid-cols-3">
            {portfolio.map((item) => (
              <article key={item.title} className="surface-card overflow-hidden rounded-lg">
                <img className="h-56 w-full object-cover" src={item.image} alt="" />
                <div className="p-6">
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#1261ff]">{item.category}</p>
                  <h3 className="text-main mt-3 text-xl font-black">{item.title}</h3>
                  <p className="text-soft mt-3 leading-7">{item.summary}</p>
                </div>
              </article>
            ))}
          </div>
        </Section>
      </SmoothReveal>

      <SmoothReveal>
        <Section
          eyebrow="Why Us?"
          title="Available in 23 countries"
          text="Your success is our mission. Bakhtech Solutions invests time to understand your goals, ensuring every design aligns with your unique vision."
        >
          <div className="grid gap-4 md:grid-cols-4">
            {process.map((step) => (
              <div key={step.title} className="surface-card rounded-lg p-6">
                <step.icon className="mb-5 h-7 w-7 text-[#1261ff]" />
                <h3 className="text-main text-lg font-black">{step.title}</h3>
                <p className="text-soft mt-3 text-sm leading-6">{step.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <ButtonLink href="/contact">Get A Quote</ButtonLink>
          </div>
        </Section>
      </SmoothReveal>
    </>
  )
}
