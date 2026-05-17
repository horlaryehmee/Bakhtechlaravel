import { PageHero } from '@/components/ui/PageHero'
import { Section } from '@/components/ui/Section'
import { ButtonLink } from '@/components/ui/button'

export function Ebook() {
  return (
    <>
      <PageHero
        eyebrow="Ebook"
        title="The World is Hiring Tech Talent: Here's How to Get In"
        text="Whether you're just starting out or trying to break through, this ebook gives you a proven roadmap to learn the right tech skills, build your career, and land remote jobs with global pay."
        image="https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1600&q=80"
      />
      <Section
        eyebrow="Description"
        title="Start building a tech career that works for you."
        text="The World is Hiring Tech Talent: Your Guide to Getting In and Growing is your practical step-by-step playbook for building a tech career that pays well and creates freedom."
      >
        <ButtonLink href="/contact">Buy it now</ButtonLink>
      </Section>
    </>
  )
}
