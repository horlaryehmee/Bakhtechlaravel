import { useEffect, useState } from 'react'
import type { Review } from '@/lib/api'
import { loadPublicReviews } from '@/lib/public-reviews'

export function usePublicReviews() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsLoaded, setReviewsLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    let retryTimer = 0
    let attempts = 0

    const load = () => {
      attempts += 1

      loadPublicReviews()
        .then((nextReviews) => {
          if (cancelled) return

          if (nextReviews.length) {
            setReviews(nextReviews)
            setReviewsLoaded(true)
            return
          }

          setReviewsLoaded(true)
          if (attempts < 20) {
            retryTimer = window.setTimeout(load, 3000)
          }
        })
        .catch(() => {
          if (cancelled) return

          setReviewsLoaded(true)
          if (attempts < 20) {
            retryTimer = window.setTimeout(load, 3000)
          }
        })
    }

    load()

    return () => {
      cancelled = true
      if (retryTimer) {
        window.clearTimeout(retryTimer)
      }
    }
  }, [])

  return { reviews, reviewsLoaded }
}
