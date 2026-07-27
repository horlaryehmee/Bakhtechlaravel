import { api, type Review } from '@/lib/api'

function isReview(value: unknown): value is Review {
  if (!value || typeof value !== 'object') return false
  const review = value as Partial<Review>
  return typeof review.id === 'number'
    && typeof review.authorName === 'string'
    && typeof review.content === 'string'
    && typeof review.provider === 'string'
}

function normalizeReviews(value: unknown): Review[] {
  if (!value || typeof value !== 'object') return []
  const reviews = (value as { reviews?: unknown }).reviews
  return Array.isArray(reviews) ? reviews.filter(isReview) : []
}

export async function loadPublicReviews(): Promise<Review[]> {
  const path = `/api/reviews?t=${Date.now()}`

  try {
    const response = await fetch(path, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })

    if (response.ok) {
      const reviews = normalizeReviews(await response.json())
      if (reviews.length) return reviews
    }
  } catch {
    // Fall through to the shared API client below.
  }

  const result = await api.publicReviews()
  return normalizeReviews(result)
}
