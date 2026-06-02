import { useEffect, useState } from 'react'
import { Boxes } from '@/components/ui/background-boxes'
import { PageHero } from '@/components/ui/PageHero'
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
      <section className="relative overflow-hidden bg-[#05070c] py-20 text-white md:py-28">
        <Boxes className="opacity-80" />
        <div className="pointer-events-none absolute inset-0 z-[1] bg-[#05070c] [mask-image:radial-gradient(transparent,white_68%)]" />
        <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_50%_18%,rgba(48,55,63,0.48),transparent_38%),linear-gradient(180deg,rgba(5,7,12,0.74),#05070c_92%)]" />
        <div className="container-x relative z-10">
          <div className="mb-12 max-w-3xl">
            <p className="mb-3 text-sm font-black uppercase tracking-[0.22em] text-[#8ea0ff]">Projects</p>
            <h2 className="text-balance text-3xl font-black tracking-tight md:text-5xl">Explore Project</h2>
          </div>
          <div className="grid gap-6">
            {items.map((item) => (
              <article key={item.title} className="grid overflow-hidden rounded-2xl border border-[#30373f] bg-[#080b14]/88 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-md md:grid-cols-[0.9fr_1.1fr]">
                <img className="h-72 w-full object-cover md:h-full" src={item.image} alt="" />
                <div className="p-7 md:p-10">
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-[#8ea0ff]">{item.category}</p>
                  <h2 className="mt-4 text-3xl font-black tracking-tight text-white">{item.title}</h2>
                  <p className="mt-4 leading-8 text-white/70">{item.summary}</p>
                  <dl className="mt-8 grid gap-3 sm:grid-cols-3">
                    {(item.services?.length ? item.services.slice(0, 3) : ['CMS', 'SEO', 'Security']).map((metric) => (
                      <div key={metric} className="rounded-lg border border-[#30373f] bg-white/[0.03] p-4">
                        <dt className="text-xs font-bold uppercase tracking-[0.16em] text-white/50">{metric}</dt>
                        <dd className="mt-2 font-black text-white">Explore Project</dd>
                      </div>
                    ))}
                  </dl>
                  {item.websiteUrl ? (
                    <a className="mt-7 inline-flex font-black text-[#8ea0ff]" href={item.websiteUrl} target="_blank" rel="noreferrer">
                      Visit project
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
