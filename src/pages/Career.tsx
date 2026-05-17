import { PageHero } from '@/components/ui/PageHero'
import { Section } from '@/components/ui/Section'
import { ButtonLink } from '@/components/ui/button'
import { jobs } from '@/data/site'

export function Career() {
  return (
    <>
      <PageHero
        eyebrow="Career"
        title="Join a team building secure, searchable, high-performance websites."
        text="At Bakhtech Solutions, we believe in pushing boundaries, solving challenges, and creating digital experiences that matter. Ready to leave your mark?"
        image="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=80"
      />
      <Section eyebrow="Career" title="Featured jobs.">
        <div className="grid gap-4">
          {jobs.map((job) => (
            <article key={job} className="surface-card flex flex-col justify-between gap-4 rounded-lg p-6 md:flex-row md:items-center">
              <div>
                <h2 className="text-main text-xl font-black">{job}</h2>
                <p className="text-soft mt-2">Liquid Themes, San Francisco.</p>
              </div>
              <ButtonLink href="/contact" variant="secondary">View Details</ButtonLink>
            </article>
          ))}
        </div>
      </Section>
    </>
  )
}
