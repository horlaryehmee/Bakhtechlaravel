import { useLocation } from 'react-router-dom'
import { usePublicCmsPage } from '@/hooks/usePublicCmsPage'

const managedRoutes: Record<string, string> = {
  '/': 'home',
  '/about': 'about',
  '/portfolio': 'portfolio',
  '/contact': 'contact',
}

export function CmsPageSync() {
  const location = useLocation()
  const slug = managedRoutes[location.pathname.replace(/\/+$/, '') || '/']
  const { page } = usePublicCmsPage(slug)
  const content = page?.content.trim() || ''

  if (!content) return null

  return (
    <section className="bg-[var(--background)] px-5 py-16 text-[var(--foreground)]">
      <article className="surface-card mx-auto max-w-4xl rounded-2xl p-6 md:p-10">
        <div className="whitespace-pre-wrap text-base leading-8 text-soft">{content}</div>
      </article>
    </section>
  )
}
