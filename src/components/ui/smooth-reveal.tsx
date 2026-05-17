import { motion, type Variants } from 'framer-motion'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const revealVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 56,
    filter: 'blur(10px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.75,
      ease: 'easeOut',
    },
  },
}

export function SmoothReveal({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={cn('will-change-transform', className)}
      variants={revealVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.18 }}
    >
      {children}
    </motion.div>
  )
}
