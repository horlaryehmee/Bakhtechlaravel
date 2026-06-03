'use client'

import React, { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type PresetType =
  | 'fade'
  | 'slide'
  | 'scale'
  | 'blur'
  | 'blur-slide'
  | 'zoom'
  | 'flip'
  | 'bounce'
  | 'rotate'
  | 'swing'

type AnimatedGroupProps = {
  children: ReactNode
  className?: string
  variants?: unknown
  preset?: PresetType
}

export function AnimatedGroup({ children, className, variants, preset }: AnimatedGroupProps) {
  void variants

  return (
    <div className={cn('motion-safe:animate-[content-reveal_520ms_ease-out_both]', className)}>
      {React.Children.map(children, (child, index) => (
        <div
          key={index}
          className={cn('motion-safe:animate-[content-reveal_520ms_ease-out_both]', preset === 'slide' && 'motion-safe:animate-[content-slide-up_560ms_ease-out_both]')}
          style={{ animationDelay: `${Math.min(index * 70, 280)}ms` }}
        >
          {child}
        </div>
      ))}
    </div>
  )
}
