'use client'

import type React from 'react'
import { motion, type Variants } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AnimatedMarqueeHeroProps {
  tagline: string
  title: React.ReactNode
  description: string
  ctaText: string
  images: string[]
  className?: string
}

const FADE_IN_ANIMATION_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 20 } },
}

const ActionButton = ({ children }: { children: React.ReactNode }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className="mt-8 rounded-full bg-red-500 px-8 py-3 font-semibold text-white shadow-lg transition-colors hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75"
    type="button"
  >
    {children}
  </motion.button>
)

export function AnimatedImageMarquee({
  images,
  className,
  duration = 42,
  straight = false,
  trackClassName,
  cardClassName,
}: {
  images: string[]
  className?: string
  duration?: number
  straight?: boolean
  trackClassName?: string
  cardClassName?: string
}) {
  const repeatedImages = [...images, ...images, ...images]

  return (
    <div
      className={cn(
        'pointer-events-none absolute bottom-0 left-0 w-full overflow-hidden',
        !straight && '[mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)]',
        className,
      )}
      >
        <motion.div
        className={cn('flex w-max transform-gpu gap-4 px-4 will-change-transform', trackClassName)}
        animate={{
          x: ['0%', '-33.333%'],
          transition: {
            ease: 'linear',
            duration,
            repeat: Infinity,
          },
        }}
      >
        {repeatedImages.map((src, index) => (
          <div
            key={`${src}-${index}`}
            className={cn(
              'relative h-28 flex-shrink-0 overflow-hidden rounded-2xl shadow-[0_20px_60px_rgba(2,6,23,0.22)] md:h-52',
              cardClassName,
            )}
            style={{
              aspectRatio: '16 / 10',
              rotate: straight ? '0deg' : `${index % 2 === 0 ? -1.5 : 2.5}deg`,
            }}
          >
            <img src={src} alt={`Website showcase ${index + 1}`} className="h-full w-full object-cover object-top" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/24 to-transparent" />
          </div>
        ))}
      </motion.div>
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
        <motion.div
          initial="hidden"
          animate="show"
          variants={FADE_IN_ANIMATION_VARIANTS}
          className="mb-4 inline-block rounded-full border border-[var(--line)] bg-[var(--surface)]/50 px-4 py-1.5 text-sm font-medium text-[var(--muted)] backdrop-blur-sm"
        >
          {tagline}
        </motion.div>

        <motion.h1
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: {
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
          className="text-5xl font-bold tracking-tight text-[var(--foreground)] md:text-7xl"
        >
          {typeof title === 'string'
            ? title.split(' ').map((word, index) => (
                <motion.span key={`${word}-${index}`} variants={FADE_IN_ANIMATION_VARIANTS} className="inline-block">
                  {word}&nbsp;
                </motion.span>
              ))
            : title}
        </motion.h1>

        <motion.p
          initial="hidden"
          animate="show"
          variants={FADE_IN_ANIMATION_VARIANTS}
          transition={{ delay: 0.5 }}
          className="mt-6 max-w-xl text-lg text-[var(--muted)]"
        >
          {description}
        </motion.p>

        <motion.div initial="hidden" animate="show" variants={FADE_IN_ANIMATION_VARIANTS} transition={{ delay: 0.6 }}>
          <ActionButton>{ctaText}</ActionButton>
        </motion.div>
      </div>

      <AnimatedImageMarquee images={images} className="h-1/3 md:h-2/5" />
    </section>
  )
}
