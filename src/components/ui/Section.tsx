import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type SectionProps = {
  eyebrow?: string
  title: string
  text?: string
  children?: ReactNode
  className?: string
}

export function Section({ eyebrow, title, text, children, className }: SectionProps) {
  return (
    <section className={cn('section-bg py-20 md:py-28', className)}>
      <div className="container-x">
        <div className="mb-10 max-w-3xl">
          {eyebrow ? <p className="mb-3 text-sm font-black uppercase tracking-[0.22em] text-[#1261ff]">{eyebrow}</p> : null}
          <h2 className="text-main text-balance text-3xl font-black tracking-tight md:text-5xl">{title}</h2>
          {text ? <p className="text-soft mt-5 text-lg leading-8">{text}</p> : null}
        </div>
        {children}
      </div>
    </section>
  )
}
