import { useEffect, useState } from 'react'
import { PageHero } from '@/components/ui/PageHero'
import { Section } from '@/components/ui/Section'
import { portfolio } from '@/data/site'
import { api, type Project } from '@/lib/api'

type PortfolioItem = {
  title: string
  category: string
  image: string
  summary: string
  services?: string[]
  websiteUrl?: string
}

function fromProject(project: Project): PortfolioItem {
  return {
    title: project.title,
    category: project.category,
    image: project.image,
    summary: project.summary,
    services: project.services,
    websiteUrl: project.websiteUrl,
  }
}

export function Portfolio() {
  const [items, setItems] = useState<PortfolioItem[]>(portfolio)

  useEffect(() => {
    async function loadProjects() {
      try {
        const result = await api.publicProjects()
        if (result.projects.length) {
          setItems(result.projects.map(fromProject))
        }
      } catch {
        setItems(portfolio)
      }
    }

    void loadProjects()
  }, [])

  return (
    <>
      <PageHero
        eyebrow="Portfolio"
        title="Projects"
        text="Explore a selection of Bakhtech Solutions projects created for brands across automobile, ecommerce, beauty, booking, education, and corporate websites."
        image="https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1600&q=80"
      />
      <Section eyebrow="Projects" title="Explore Project">
        <div className="grid gap-6">
          {items.map((item) => (
            <article key={item.title} className="surface-card grid overflow-hidden rounded-lg md:grid-cols-[0.9fr_1.1fr]">
              <img className="h-72 w-full object-cover md:h-full" src={item.image} alt="" />
              <div className="p-7 md:p-10">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-[#1261ff]">{item.category}</p>
                <h2 className="text-main mt-4 text-3xl font-black tracking-tight">{item.title}</h2>
                <p className="text-soft mt-4 leading-8">{item.summary}</p>
                <dl className="mt-8 grid gap-3 sm:grid-cols-3">
                  {(item.services?.length ? item.services.slice(0, 3) : ['CMS', 'SEO', 'Security']).map((metric) => (
                    <div key={metric} className="surface-muted rounded-lg p-4">
                      <dt className="text-soft text-xs font-bold uppercase tracking-[0.16em]">{metric}</dt>
                      <dd className="text-main mt-2 font-black">Explore Project</dd>
                    </div>
                  ))}
                </dl>
                {item.websiteUrl ? (
                  <a className="mt-7 inline-flex font-black text-[#1261ff]" href={item.websiteUrl} target="_blank" rel="noreferrer">
                    Visit project
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </Section>
    </>
  )
}
