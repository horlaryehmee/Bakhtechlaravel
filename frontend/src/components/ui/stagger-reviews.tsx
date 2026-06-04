import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { ChevronLeft, ChevronRight, Globe2, MessageSquareText, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Review } from '@/lib/api'

type StaggerReview = Review & {
  tempId: number
}

type ReviewCardProps = {
  cardSize: number
  expanded: boolean
  handleMove: (steps: number) => void
  onToggleExpanded: (reviewId: number) => void
  position: number
  review: StaggerReview
}

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'R'
}

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.4 0 6.4 1.2 8.8 3.4l6.6-6.6C35.4 2.6 30.1.5 24 .5 14.8.5 6.9 5.8 3.1 13.5l7.7 6c1.8-5.8 7.1-10 13.2-10z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-2.8-.4-4.1H24v8.3h12.9c-.3 2.1-1.7 5.3-4.9 7.5l7.5 5.8c4.4-4.1 7-10.1 7-17.5z" />
      <path fill="#FBBC05" d="M10.8 28.5c-.5-1.4-.8-2.9-.8-4.5s.3-3.1.8-4.5l-7.7-6C1.4 16.7.5 20.2.5 24s.9 7.3 2.6 10.5l7.7-6z" />
      <path fill="#34A853" d="M24 47.5c6.1 0 11.3-2 15.1-5.5l-7.5-5.8c-2 1.4-4.7 2.3-7.6 2.3-6.1 0-11.4-4.1-13.2-9.9l-7.7 6C6.9 42.2 14.8 47.5 24 47.5z" />
    </svg>
  )
}

function TrustpilotLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M17.227 16.67l2.19 6.742-7.413-5.388 5.223-1.354zM24 9.31h-9.165L12.005.589l-2.84 8.723L0 9.3l7.422 5.397-2.84 8.714 7.422-5.388 4.583-3.326L24 9.311z" />
    </svg>
  )
}

function FacebookLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.438H7.078v-3.49h3.047V9.414c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97H15.83c-1.49 0-1.955.93-1.955 1.885v2.265h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
    </svg>
  )
}

function InstagramLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm5.25-2.3a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1z"
      />
    </svg>
  )
}

function LinkedinLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V8.98h3.42v1.57h.05c.48-.9 1.64-1.85 3.37-1.85 3.61 0 4.27 2.38 4.27 5.47v6.28zM5.32 7.41a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zm1.78 13.04H3.53V8.98H7.1v11.47zM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0z" />
    </svg>
  )
}

function PlatformMark({ provider, label }: { provider: Review['provider']; label: string }) {
  if (provider === 'google') {
    return (
      <span className="grid h-7 w-7 place-items-center" aria-label={label}>
        <GoogleLogo className="h-6 w-6" />
      </span>
    )
  }

  if (provider === 'trustpilot') {
    return (
      <span className="grid h-7 w-7 place-items-center text-[#00b67a]" aria-label={label}>
        <TrustpilotLogo className="h-7 w-7" />
      </span>
    )
  }

  if (provider === 'facebook') {
    return (
      <span className="grid h-7 w-7 place-items-center text-[#1877f2]" aria-label={label}>
        <FacebookLogo className="h-6 w-6" />
      </span>
    )
  }

  if (provider === 'instagram') {
    return (
      <span className="grid h-7 w-7 place-items-center bg-[linear-gradient(135deg,#f58529,#dd2a7b,#8134af,#515bd4)] bg-clip-text text-transparent" aria-label={label}>
        <InstagramLogo className="h-6 w-6" />
      </span>
    )
  }

  if (provider === 'linkedin') {
    return (
      <span className="grid h-7 w-7 place-items-center text-[#0a66c2]" aria-label={label}>
        <LinkedinLogo className="h-6 w-6" />
      </span>
    )
  }

  if (provider === 'website') {
    return (
      <span className="grid h-7 w-7 place-items-center text-[#1261ff]" aria-label={label}>
        <Globe2 className="h-6 w-6" />
      </span>
    )
  }

  if (provider === 'manual') {
    return (
      <span className="grid h-7 w-7 place-items-center text-[#6b7280]" aria-label={label}>
        <MessageSquareText className="h-6 w-6" />
      </span>
    )
  }

  return (
    <span className="grid h-7 w-7 place-items-center text-[0.65rem] font-black uppercase text-current" aria-label={label}>
      {label.slice(0, 1)}
    </span>
  )
}

function ReviewRating({ provider, rating }: { provider: Review['provider']; rating: number }) {
  if (provider === 'trustpilot') {
    return (
      <div className="mb-4 flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, index) => (
          <span key={index} className={cn('grid h-5 w-5 place-items-center', index < rating ? 'bg-[#00b67a] text-white' : 'bg-[#d8d8d8] text-white/70')}>
            <TrustpilotLogo className="h-3.5 w-3.5" />
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="mb-4 flex items-center gap-1 text-amber-400">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star key={index} className={cn('h-4 w-4', index < rating ? 'fill-current' : 'fill-none opacity-40')} />
      ))}
    </div>
  )
}

function ReviewCard({ cardSize, expanded, handleMove, onToggleExpanded, position, review }: ReviewCardProps) {
  const isCenter = position === 0
  const distance = Math.abs(position)
  const cornerSize = cardSize >= 300 ? 38 : 30
  const diagonalSize = Math.sqrt(cornerSize * cornerSize * 2)
  const canExpand = review.content.length > 130

  if (distance > 1) return null

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => handleMove(position)}
      onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          handleMove(position)
        }
      }}
      className={cn(
        'absolute left-1/2 top-1/2 flex cursor-pointer flex-col overflow-hidden border-2 p-5 text-left transition-all duration-500 ease-in-out sm:p-6',
        isCenter
          ? 'z-20 border-[#111827] bg-[#111827] text-white'
          : 'z-10 border-[#d7dbe5] bg-white text-[#111827] opacity-85 hover:border-[#1261ff]/50 hover:opacity-100',
      )}
      style={{
        width: cardSize,
        height: cardSize,
        clipPath: `polygon(${cornerSize}px 0%, calc(100% - ${cornerSize}px) 0%, 100% ${cornerSize}px, 100% 100%, calc(100% - ${cornerSize}px) 100%, ${cornerSize}px 100%, 0 100%, 0 0)`,
        transform: `
          translate(-50%, -50%)
          translateX(${cardSize * 0.58 * position}px)
          translateY(${isCenter ? -18 : position > 0 ? 14 : -10}px)
          rotate(${isCenter ? 0 : position > 0 ? 2 : -2}deg)
          scale(${isCenter ? 1 : 0.9})
        `,
        boxShadow: isCenter ? '0px 10px 0px 2px #d7dbe5' : '0 18px 35px rgba(17,24,39,0.08)',
      }}
      aria-label={`Show ${review.authorName} review`}
    >
      <span
        className={cn('absolute block origin-top-right rotate-45', isCenter ? 'bg-white/20' : 'bg-[#d7dbe5]')}
        style={{
          right: -2,
          top: cornerSize - 2,
          width: diagonalSize,
          height: 2,
        }}
      />
      <span className="absolute right-6 top-7">
        <PlatformMark provider={review.provider} label={review.providerLabel} />
      </span>
      <div className="mb-4 shrink-0">
        {review.authorImage ? (
          <img
            src={review.authorImage}
            alt={review.authorName}
            className="h-11 w-11 bg-[#eef1f6] object-cover object-top sm:h-12 sm:w-12"
            style={{ boxShadow: isCenter ? '3px 3px 0px rgba(255,255,255,0.16)' : '3px 3px 0px #f8f8fb' }}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span
            className={cn('grid h-11 w-11 place-items-center text-sm font-black sm:h-12 sm:w-12 sm:text-base', isCenter ? 'bg-white text-[#111827]' : 'bg-[#eef1f6] text-[#111827]')}
            style={{ boxShadow: isCenter ? '3px 3px 0px rgba(255,255,255,0.16)' : '3px 3px 0px #f8f8fb' }}
          >
            {initials(review.authorName)}
          </span>
        )}
      </div>
      <ReviewRating provider={review.provider} rating={review.rating} />
      <div className={cn('min-h-0', expanded ? 'flex-1 overflow-y-auto pr-1' : 'shrink-0', isCenter ? 'scrollbar-thin scrollbar-track-white/10 scrollbar-thumb-white/30' : 'scrollbar-thin scrollbar-track-slate-100 scrollbar-thumb-slate-300')}>
        <p className={cn(expanded ? 'text-base font-medium leading-7' : 'line-clamp-4 text-base font-medium leading-7', isCenter ? 'text-white' : 'text-[#111827]')}>"{review.content}"</p>
      </div>
      {canExpand ? (
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            onToggleExpanded(review.id)
          }}
          className={cn('mt-2 shrink-0 text-xs font-black underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1261ff]', isCenter ? 'text-white' : 'text-[#1261ff]')}
        >
          {expanded ? 'Collapse text' : 'Read more'}
        </button>
      ) : null}
      <p className={cn('mt-auto truncate pt-3 text-xs italic sm:text-sm', isCenter ? 'text-white/78' : 'text-[#6b7280]')}>
        - {review.authorName}
      </p>
    </article>
  )
}

export function StaggerReviews({ reviews }: { reviews: Review[] }) {
  const [cardSize, setCardSize] = useState(320)
  const [expandedReviewId, setExpandedReviewId] = useState<number | null>(null)
  const [reviewList, setReviewList] = useState<StaggerReview[]>([])
  const dragState = useRef<{ startX: number | null; consumedClick: boolean }>({ startX: null, consumedClick: false })
  const centerIndex = useMemo(() => Math.floor(reviewList.length / 2), [reviewList.length])

  useEffect(() => {
    setReviewList(reviews.map((review, index) => ({ ...review, tempId: index })))
  }, [reviews])

  useEffect(() => {
    const updateSize = () => {
      const { matches } = window.matchMedia('(min-width: 640px)')
      setCardSize(matches ? 320 : 260)
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  function handleMove(steps: number) {
    if (steps === 0) return
    setExpandedReviewId(null)

    setReviewList((current) => {
      const next = [...current]
      if (steps > 0) {
        for (let index = steps; index > 0; index--) {
          const item = next.shift()
          if (!item) return current
          next.push({ ...item, tempId: Math.random() })
        }
      } else {
        for (let index = steps; index < 0; index++) {
          const item = next.pop()
          if (!item) return current
          next.unshift({ ...item, tempId: Math.random() })
        }
      }
      return next
    })
  }

  function handleToggleExpanded(reviewId: number) {
    setExpandedReviewId((current) => (current === reviewId ? null : reviewId))
  }

  function handleCardClick(steps: number) {
    if (dragState.current.consumedClick) return
    handleMove(steps)
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    dragState.current.startX = event.clientX
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const startX = dragState.current.startX
    dragState.current.startX = null
    if (startX === null) return

    const distance = event.clientX - startX
    if (Math.abs(distance) < 52) return

    dragState.current.consumedClick = true
    handleMove(distance < 0 ? 1 : -1)
    window.setTimeout(() => {
      dragState.current.consumedClick = false
    }, 0)
  }

  if (!reviewList.length) return null

  return (
    <div
      className="relative mx-auto h-[23rem] w-full max-w-[45rem] touch-pan-y overflow-hidden bg-[#f8f8fb] sm:h-[25rem]"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        dragState.current.startX = null
      }}
    >
      {reviewList.map((review, index) => {
        const position = index - centerIndex
        return <ReviewCard key={review.tempId} cardSize={cardSize} expanded={expandedReviewId === review.id} handleMove={handleCardClick} onToggleExpanded={handleToggleExpanded} position={position} review={review} />
      })}
      <div
        className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 gap-2"
        onPointerDown={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => handleMove(-1)}
          className="flex h-10 w-10 items-center justify-center border border-[#d7dbe5] bg-white text-[#111827] transition-colors hover:bg-[#111827] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1261ff] focus-visible:ring-offset-2"
          aria-label="Previous review"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => handleMove(1)}
          className="flex h-10 w-10 items-center justify-center border border-[#d7dbe5] bg-white text-[#111827] transition-colors hover:bg-[#111827] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1261ff] focus-visible:ring-offset-2"
          aria-label="Next review"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
