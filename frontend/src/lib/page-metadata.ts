type PageMetadata = {
  title: string
  description: string
  url?: string
}

function setMeta(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let element = window.document.head.querySelector<HTMLMetaElement>(selector)
  if (!element) {
    element = window.document.createElement('meta')
    element.setAttribute(attribute, key)
    window.document.head.appendChild(element)
  }
  element.content = content
}

export function updatePageMetadata({ title, description, url = window.location.href }: PageMetadata) {
  window.document.title = title
  setMeta('meta[name="description"]', 'name', 'description', description)
  setMeta('meta[property="og:title"]', 'property', 'og:title', title)
  setMeta('meta[property="og:description"]', 'property', 'og:description', description)
  setMeta('meta[property="og:url"]', 'property', 'og:url', url)
  setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title)
  setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description)

  const canonical = window.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (canonical) canonical.href = url
}
