import type { Project } from '@/lib/api'

export type ProjectVideoMedia = {
  title: string
  type: 'video' | 'youtube'
  url: string
}

export function getYoutubeVideoId(url: string) {
  const value = url.trim()
  const match = value.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match?.[1]
}

export function getYoutubeEmbedUrl(url: string) {
  const id = getYoutubeVideoId(url)
  return id ? `https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1&rel=0` : undefined
}

export function getYoutubeThumbnailUrl(url?: string) {
  const id = url ? getYoutubeVideoId(url) : undefined
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : undefined
}

export function isVideoUrl(url?: string) {
  return url ? /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url) : false
}

export function getProjectVideoUrl(project: Project) {
  const explicitVideo = project.videoUrl?.trim()
  if (explicitVideo) return explicitVideo

  const legacyMedia = project.image?.trim()
  return legacyMedia && (getYoutubeVideoId(legacyMedia) || isVideoUrl(legacyMedia)) ? legacyMedia : ''
}

export function getProjectPrimaryImage(project: Project) {
  const image = project.image?.trim()
  return image && !getYoutubeVideoId(image) && !isVideoUrl(image) ? image : ''
}

export function getProjectVideoCoverImage(project: Project) {
  const primaryImage = getProjectPrimaryImage(project)
  if (primaryImage) return primaryImage

  return project.coverImage?.trim() || getYoutubeThumbnailUrl(getProjectVideoUrl(project)) || ''
}

export function getProjectVideoMedia(project: Project): ProjectVideoMedia | null {
  const videoUrl = getProjectVideoUrl(project)
  if (getYoutubeEmbedUrl(videoUrl)) return { title: project.title, type: 'youtube', url: videoUrl }
  if (isVideoUrl(videoUrl)) return { title: project.title, type: 'video', url: videoUrl }
  return null
}

export function projectImageFallbackSrc(project: Pick<Project, 'title'>) {
  const safeTitle = project.title
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675"><rect width="1200" height="675" fill="#202832"/><rect x="32" y="32" width="1136" height="611" rx="34" fill="none" stroke="#435061" stroke-width="2"/><text x="600" y="322" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="700" fill="#d7dee8">${safeTitle}</text><text x="600" y="380" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#96a3b3">Project image unavailable</text></svg>`

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}
