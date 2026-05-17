import { PageHero } from '@/components/ui/PageHero'
import { Section } from '@/components/ui/Section'
import { process } from '@/data/site'

export function About() {
  return (
    <>
      <PageHero
        eyebrow="About us"
        title="About us"
        text="Established with a vision to empower businesses, both startups, and large enterprises, we are a dynamic team of professionals dedicated to transforming digital landscapes."
        image="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=80"
      />
      <Section
        eyebrow="Bakhtech Solutions"
        title="Our Story"
        text="Founded on the belief that a strong online presence is the cornerstone of success in today's competitive market, Bakhtech Solutions emerged as a response to the growing need for comprehensive web solutions. Our journey began with a simple idea: to provide businesses with not just websites but digital experiences that resonate with their audience."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: 'Mission',
              text: 'At Bakhtech Solutions, our mission is to be a catalyst for your digital success. We strive to elevate your brand through innovative web solutions, enabling you to reach new heights in the digital realm.',
            },
            {
              title: 'Values',
              text: 'Innovation, integrity, collaboration, and excellence guide every project we undertake.',
            },
            {
              title: 'Our Commitment',
              text: 'At Bakhtech Solutions, we are not just a service provider; we are your digital partner.',
            },
          ].map((item) => (
            <div key={item.title} className="surface-card rounded-lg p-7">
              <h3 className="text-main text-xl font-black">{item.title}</h3>
              <p className="text-soft mt-3 leading-7">{item.text}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section
        eyebrow="Ready to Redefine Your Digital Presence?"
        title="Trust Bakhtech Solutions - Your Premier Website Design Partner."
        text="Elevate Your Brand's Online"
        className="section-strong"
      >
        <div className="grid gap-4 md:grid-cols-4">
          {process.map((step) => (
            <article key={step.title} className="surface-card rounded-lg p-6">
              <step.icon className="mb-5 h-7 w-7 text-[#1261ff]" />
              <h3 className="text-main font-black">{step.title}</h3>
              <p className="text-soft mt-3 text-sm leading-6">{step.text}</p>
            </article>
          ))}
        </div>
      </Section>
    </>
  )
}
