import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

type AgencyCtaProps = {
  label: ReactNode
  icon: ReactNode
  to?: string
  className?: string
  iconClassName?: string
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>

export function AgencyCta({
  label,
  icon,
  to,
  className,
  iconClassName,
  type = 'button',
  ...buttonProps
}: AgencyCtaProps) {
  const content = (
    <>
      <span
        className={cn(
          'pointer-events-none absolute left-1.5 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md bg-[#ffc400] text-[#0b0b08] transition-[left,transform] duration-500 ease-out group-hover:left-[calc(100%-2.5rem)] group-hover:rotate-[360deg] group-active:left-[calc(100%-2.5rem)] group-active:rotate-[360deg] group-focus-visible:left-[calc(100%-2.5rem)] group-focus-visible:rotate-[360deg]',
          iconClassName,
        )}
      >
        {icon}
      </span>
      <span className="relative z-0 block pl-9 transition-transform duration-500 ease-out group-hover:-translate-x-8 group-active:-translate-x-8 group-focus-visible:-translate-x-8">
        {label}
      </span>
    </>
  )

  const classes = cn(
    'group relative inline-flex min-h-11 items-center justify-center overflow-hidden rounded-lg border border-transparent bg-black px-1.5 pr-4 text-sm font-bold text-white shadow-[0_12px_32px_rgba(0,0,0,0.12)] transition duration-300 hover:bg-black/82 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 disabled:pointer-events-none disabled:opacity-60',
    className,
  )

  if (to) {
    return <Link to={to} className={classes}>{content}</Link>
  }

  return (
    <button type={type} className={classes} {...buttonProps}>
      {content}
    </button>
  )
}
