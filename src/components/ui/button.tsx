import { type AnchorHTMLAttributes, type ButtonHTMLAttributes } from 'react'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type SharedProps = {
  variant?: 'primary' | 'secondary' | 'ghost'
  showArrow?: boolean
}

const styles = {
  primary:
    'bg-[#1261ff] text-white shadow-[0_18px_40px_rgba(18,97,255,0.32)] hover:bg-[#0b4ed6]',
  secondary: 'surface-card hover:bg-[var(--surface-2)]',
  ghost: 'bg-transparent text-[var(--foreground)] ring-1 ring-[var(--line)] hover:bg-[var(--surface-2)]',
}

export function ButtonLink({
  className,
  children,
  variant = 'primary',
  showArrow = true,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & SharedProps) {
  return (
    <a
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition duration-300 focus:outline-none focus:ring-2 focus:ring-[#12c8a0] focus:ring-offset-2 focus:ring-offset-[var(--background)]',
        styles[variant],
        className,
      )}
      {...props}
    >
      {children}
      {showArrow ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
    </a>
  )
}

export function Button({
  className,
  children,
  variant = 'primary',
  showArrow = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & SharedProps) {
  return (
    <button
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition duration-300 focus:outline-none focus:ring-2 focus:ring-[#12c8a0] focus:ring-offset-2 focus:ring-offset-[var(--background)]',
        styles[variant],
        className,
      )}
      {...props}
    >
      {children}
      {showArrow ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
    </button>
  )
}
