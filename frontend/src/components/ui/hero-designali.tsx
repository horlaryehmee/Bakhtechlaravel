'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

type TypeWriterProps = {
  strings: string[]
}

export function TypeWriter({ strings }: TypeWriterProps) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (strings.length < 2) return undefined

    const intervalId = window.setInterval(() => {
      setIndex((value) => (value + 1) % strings.length)
    }, 1800)

    return () => window.clearInterval(intervalId)
  }, [strings.length])

  return (
    <span className="inline-flex min-w-[8.5ch] items-baseline">
      <span className="motion-safe:animate-[content-reveal_360ms_ease-out_both]">{strings[index] ?? strings[0]}</span>
      <span className="ml-0.5 animate-pulse opacity-70" aria-hidden>
        |
      </span>
    </span>
  )
}

type ColorProp = string | string[]

type ShineBorderProps = {
  borderRadius?: number
  borderWidth?: number
  duration?: number
  color?: ColorProp
  className?: string
  children: React.ReactNode
}

export function ShineBorder({
  borderRadius = 8,
  borderWidth = 1,
  duration = 14,
  color = '#000000',
  className,
  children,
}: ShineBorderProps) {
  return (
    <div
      style={
        {
          '--border-radius': `${borderRadius}px`,
        } as React.CSSProperties
      }
      className={cn(
        'relative grid h-full w-full place-items-center rounded-3xl bg-white p-3 text-black dark:bg-black dark:text-white',
        className,
      )}
    >
      <div
        style={
          {
            '--border-width': `${borderWidth}px`,
            '--border-radius': `${borderRadius}px`,
            '--shine-pulse-duration': `${duration}s`,
            '--mask-linear-gradient': 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            '--background-radial-gradient': `radial-gradient(transparent, transparent, ${Array.isArray(color) ? color.join(',') : color}, transparent, transparent)`,
          } as React.CSSProperties
        }
        className="before:bg-shine-size before:absolute before:inset-0 before:aspect-square before:size-full before:rounded-3xl before:p-[--border-width] before:will-change-[background-position] before:content-[''] before:![-webkit-mask-composite:xor] before:[background-image:--background-radial-gradient] before:[background-size:300%_300%] before:![mask-composite:exclude] before:[mask:--mask-linear-gradient] motion-safe:before:animate-[shine-pulse_var(--shine-pulse-duration)_infinite_linear]"
      />
      {children}
    </div>
  )
}
