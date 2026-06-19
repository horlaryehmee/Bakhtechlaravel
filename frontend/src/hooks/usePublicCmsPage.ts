import { useEffect, useState } from 'react'
import { api, type CmsPage } from '@/lib/api'

const defaultSocialImagePath = '/social-preview.png'

function setMeta(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector)

  if (!content) {
    element?.remove()
    return
  }

  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }

  element.content = content
}

function absoluteUrl(path: string) {
  try {
    return new URL(path, window.location.origin).href
  } catch {
    return path
  }
}

function applyPageMetadata(page: CmsPage) {
  const socialImage = page.ogImage || defaultSocialImagePath
  const twitterImage = page.twitterImage || socialImage
  const usesDefaultSocialImage = socialImage === defaultSocialImagePath

  document.title = page.seoTitle || page.title
  setMeta('meta[name="description"]', 'name', 'description', page.seoDescription || page.excerpt)
  setMeta('meta[name="robots"]', 'name', 'robots', page.metaRobots)
  setMeta('meta[property="og:title"]', 'property', 'og:title', page.ogTitle || page.seoTitle || page.title)
  setMeta('meta[property="og:description"]', 'property', 'og:description', page.ogDescription || page.seoDescription || page.excerpt)
  setMeta('meta[property="og:image"]', 'property', 'og:image', absoluteUrl(socialImage))
  setMeta('meta[property="og:image:secure_url"]', 'property', 'og:image:secure_url', absoluteUrl(socialImage))
  setMeta('meta[property="og:image:type"]', 'property', 'og:image:type', usesDefaultSocialImage ? 'image/png' : '')
  setMeta('meta[property="og:image:width"]', 'property', 'og:image:width', usesDefaultSocialImage ? '1200' : '')
  setMeta('meta[property="og:image:height"]', 'property', 'og:image:height', usesDefaultSocialImage ? '630' : '')
  setMeta('meta[property="og:image:alt"]', 'property', 'og:image:alt', 'Bakhtech Solutions homepage preview')
  setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image')
  setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', page.twitterTitle || page.ogTitle || page.seoTitle || page.title)
  setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', page.twitterDescription || page.ogDescription || page.seoDescription || page.excerpt)
  setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', absoluteUrl(twitterImage))
  setMeta('meta[name="twitter:image:alt"]', 'name', 'twitter:image:alt', 'Bakhtech Solutions homepage preview')

  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (page.canonicalUrl) {
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = page.canonicalUrl
  } else {
    canonical?.remove()
  }

  document.getElementById('cms-page-schema')?.remove()
  if (page.schemaJson) {
    try {
      const schema = JSON.parse(page.schemaJson)
      const script = document.createElement('script')
      script.id = 'cms-page-schema'
      script.type = 'application/ld+json'
      script.textContent = JSON.stringify(schema)
      document.head.appendChild(script)
    } catch {
      // Invalid schema JSON stays editable in the CMS without breaking the page.
    }
  }
}

export function usePublicCmsPage(slug: string | undefined) {
  const [result, setResult] = useState<{
    slug: string | undefined
    page: CmsPage | null
    notFound: boolean
  }>({ slug: undefined, page: null, notFound: false })

  useEffect(() => {
    let cancelled = false

    if (!slug) {
      return () => {
        cancelled = true
      }
    }

    api.publicPage(slug)
      .then((result) => {
        if (cancelled) return
        setResult({ slug, page: result.page, notFound: false })
        applyPageMetadata(result.page)
      })
      .catch(() => {
        if (!cancelled) setResult({ slug, page: null, notFound: true })
      })

    return () => {
      cancelled = true
    }
  }, [slug])

  const currentResult = result.slug === slug ? result : { page: null, notFound: false }

  return {
    page: currentResult.page,
    loading: Boolean(slug) && result.slug !== slug,
    notFound: currentResult.notFound,
  }
}
