'use client'

import type React from 'react'
import { cn } from '@/lib/utils'

interface AnimatedMarqueeHeroProps {
  tagline: string
  title: React.ReactNode
  description: string
  ctaText: string
  images: string[]
  className?: string
}

const ActionButton = ({ children }: { children: React.ReactNode }) => (
  <button
    className="mt-8 rounded-full bg-red-500 px-8 py-3 font-semibold text-white shadow-lg transition-colors hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75"
    type="button"
  >
    {children}
  </button>
)

export function AnimatedImageMarquee({
  images,
  className,
  duration = 42,
  straight = false,
  trackClassName,
  cardClassName,
  priority = false,
}: {
  images: string[]
  className?: string
  duration?: number
  straight?: boolean
  trackClassName?: string
  cardClassName?: string
  priority?: boolean
}) {
  const repeatedImages = [...images, ...images, ...images]

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-0 z-20 w-full overflow-hidden opacity-100',
        !straight && '[mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)]',
        className,
      )}
      >
      <div
        className={cn('marquee-track flex w-max transform-gpu gap-4 px-4 will-change-transform', trackClassName)}
        style={{
          '--marquee-duration': `${duration}s`,
          '--marquee-distance': '-33.333%',
        } as React.CSSProperties}
      >
        {repeatedImages.map((src, index) => (
          <div
            key={`${src}-${index}`}
            className={cn(
              'relative h-28 flex-shrink-0 transform-gpu overflow-hidden rounded-2xl shadow-[0_20px_60px_rgba(2,6,23,0.22)] will-change-transform md:h-52',
              cardClassName,
            )}
            style={{
              aspectRatio: '16 / 10',
              rotate: straight ? '0deg' : `${index % 2 === 0 ? -1.5 : 2.5}deg`,
            }}
          >
            <img
              src={src}
              alt={`Website showcase ${index + 1}`}
              className="h-full w-full object-cover object-top"
              draggable={false}
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
              fetchPriority={priority ? 'high' : 'auto'}
              sizes="(min-width: 768px) 320px, 216px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/24 to-transparent" />
          </div>
        ))}
      </div>
    </div>
  )
}

export const AnimatedMarqueeHero: React.FC<AnimatedMarqueeHeroProps> = ({
  tagline,
  title,
  description,
  ctaText,
  images,
  className,
}) => {
  return (
    <section
      className={cn(
        'relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-[var(--background)] px-4 text-center',
        className,
      )}
    >
      <div className="z-10 flex flex-col items-center">
        <div
          className="motion-safe:animate-[content-reveal_520ms_ease-out_both] mb-4 inline-block rounded-full border border-[var(--line)] bg-[var(--surface)]/50 px-4 py-1.5 text-sm font-medium text-[var(--muted)] backdrop-blur-sm"
        >
          {tagline}
        </div>

        <h1
          className="text-5xl font-bold tracking-tight text-[var(--foreground)] md:text-7xl"
        >
          {typeof title === 'string'
            ? title.split(' ').map((word, index) => (
                <span key={`${word}-${index}`} className="motion-safe:animate-[content-reveal_520ms_ease-out_both] inline-block" style={{ animationDelay: `${Math.min(index * 70, 280)}ms` }}>
                  {word}&nbsp;
                </span>
              ))
            : title}
        </h1>

        <p
          className="motion-safe:animate-[content-reveal_520ms_ease-out_500ms_both] mt-6 max-w-xl text-lg text-[var(--muted)]"
        >
          {description}
        </p>

        <div className="motion-safe:animate-[content-reveal_520ms_ease-out_600ms_both]">
          <ActionButton>{ctaText}</ActionButton>
        </div>
      </div>

      <AnimatedImageMarquee images={images} className="h-1/3 md:h-2/5" />
    </section>
  )
}
