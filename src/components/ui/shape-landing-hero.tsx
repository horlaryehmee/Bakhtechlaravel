'use client'

import { motion, type Variants } from 'framer-motion'
import { Circle } from 'lucide-react'
import { AnimatedImageMarquee } from '@/components/ui/hero-3'
import { cn } from '@/lib/utils'

const BAKHTECH_MARQUEE_IMAGES = [
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=900&q=80',
]

function ElegantShape({
  className,
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = 'from-white/[0.08]',
}: {
  className?: string
  delay?: number
  width?: number
  height?: number
  rotate?: number
  gradient?: string
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: -150,
        rotate: rotate - 15,
      }}
      animate={{
        opacity: 1,
        y: 0,
        rotate,
      }}
      transition={{
        duration: 2.4,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.2 },
      }}
      className={cn('absolute', className)}
    >
      <motion.div
        animate={{
          y: [0, 15, 0],
        }}
        transition={{
          duration: 12,
          repeat: Number.POSITIVE_INFINITY,
          ease: 'easeInOut',
        }}
        style={{
          width,
          height,
        }}
        className="relative"
      >
        <div
          className={cn(
            'absolute inset-0 rounded-full',
            'bg-gradient-to-r to-transparent',
            gradient,
            'border-2 border-white/[0.15] backdrop-blur-[2px]',
            'shadow-[0_8px_32px_0_rgba(255,255,255,0.1)]',
            'after:absolute after:inset-0 after:rounded-full',
            'after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_70%)]',
          )}
        />
      </motion.div>
    </motion.div>
  )
}

function HeroGeometric({
  badge = 'Design Collective',
  title1 = 'Elevate Your Digital Vision',
  title2 = 'Crafting Exceptional Websites',
  description = 'Crafting exceptional digital experiences through innovative design and cutting-edge technology.',
  className,
}: {
  badge?: string
  title1?: string
  title2?: string
  description?: string
  className?: string
}) {
  const fadeUpVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 1,
        delay: 0.5 + i * 0.2,
        ease: 'easeOut',
      },
    }),
  }

  return (
    <div className={cn('relative flex min-h-screen w-full items-center justify-center overflow-hidden', className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.05] via-transparent to-rose-500/[0.05] blur-3xl" />

      <div className="absolute inset-0 overflow-hidden">
        <ElegantShape
          delay={0.3}
          width={600}
          height={140}
          rotate={12}
          gradient="from-indigo-500/[0.15]"
          className="left-[-10%] top-[15%] md:left-[-5%] md:top-[20%]"
        />
        <ElegantShape
          delay={0.5}
          width={500}
          height={120}
          rotate={-15}
          gradient="from-rose-500/[0.15]"
          className="right-[-5%] top-[70%] md:right-[0%] md:top-[75%]"
        />
        <ElegantShape
          delay={0.4}
          width={300}
          height={80}
          rotate={-8}
          gradient="from-violet-500/[0.15]"
          className="bottom-[5%] left-[5%] md:bottom-[10%] md:left-[10%]"
        />
        <ElegantShape
          delay={0.6}
          width={200}
          height={60}
          rotate={20}
          gradient="from-amber-500/[0.15]"
          className="right-[15%] top-[10%] md:right-[20%] md:top-[15%]"
        />
        <ElegantShape
          delay={0.7}
          width={150}
          height={40}
          rotate={-25}
          gradient="from-cyan-500/[0.15]"
          className="left-[20%] top-[5%] md:left-[25%] md:top-[10%]"
        />
      </div>

      <div className="container-x relative z-20 pb-[24vh] md:pb-[28vh]">
        <div className="mx-auto max-w-4xl text-center">
          {badge ? (
            <motion.div
              custom={0}
              variants={fadeUpVariants}
              initial="hidden"
              animate="visible"
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)]/70 px-3 py-1 backdrop-blur-xl md:mb-8"
            >
              <Circle className="h-2 w-2 fill-[#12c8a0] text-[#12c8a0]" />
              <span className="text-soft text-sm tracking-wide">{badge}</span>
            </motion.div>
          ) : null}

          <motion.div custom={1} variants={fadeUpVariants} initial="hidden" animate="visible">
            <h1 className="mb-5 text-4xl font-bold tracking-tight drop-shadow-[0_12px_36px_color-mix(in_srgb,var(--background)_72%,transparent)] sm:text-6xl md:mb-6 md:text-8xl">
              <span className="bg-gradient-to-b from-[var(--foreground)] to-[color-mix(in_srgb,var(--foreground)_72%,transparent)] bg-clip-text text-transparent">
                {title1}
              </span>
              <br />
              <span className="bg-gradient-to-r from-[#92b7ff] via-[var(--foreground)] to-[#8ce8d3] bg-clip-text text-transparent">
                {title2}
              </span>
            </h1>
          </motion.div>

          <motion.div custom={2} variants={fadeUpVariants} initial="hidden" animate="visible">
            <p className="text-soft mx-auto mb-8 max-w-2xl rounded-2xl bg-[var(--background)]/36 px-4 py-3 text-base font-normal leading-relaxed tracking-wide backdrop-blur-[2px] sm:text-lg md:text-xl">
              {description}
            </p>
          </motion.div>
        </div>
      </div>

      <AnimatedImageMarquee
        images={BAKHTECH_MARQUEE_IMAGES}
        duration={48}
        className="bottom-2 z-10 h-[20vh] opacity-72 md:bottom-4 md:h-[25vh]"
      />

      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[var(--background)] via-transparent to-[color-mix(in_srgb,var(--background)_82%,transparent)]" />
    </div>
  )
}

export { HeroGeometric }
