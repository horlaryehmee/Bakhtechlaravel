import { Link, useParams } from 'react-router-dom'
import { usePublicCmsPage } from '@/hooks/usePublicCmsPage'

export function CmsPage() {
  const { pageSlug } = useParams()
  const { page, loading, notFound } = usePublicCmsPage(pageSlug)

  if (loading) {
    return <main className="min-h-screen bg-[var(--background)] pt-32" />
  }

  if (notFound || !page) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--background)] px-5 text-[var(--foreground)]">
        <div className="text-center">
          <h1 className="text-4xl font-black">Page not found</h1>
          <Link to="/" className="mt-5 inline-flex rounded-xl bg-[var(--foreground)] px-5 py-3 font-black text-[var(--background)]">
            Return home
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-5 pb-20 pt-36 text-[var(--foreground)]">
      <article className="surface-card mx-auto max-w-4xl rounded-2xl p-6 md:p-12">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-[#ef4444]">{page.template}</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">{page.title}</h1>
        {page.excerpt ? <p className="mt-5 text-lg leading-8 text-soft">{page.excerpt}</p> : null}
        {page.content ? <div className="mt-10 whitespace-pre-wrap text-base leading-8 text-soft">{page.content}</div> : null}
      </article>
    </main>
  )
}
