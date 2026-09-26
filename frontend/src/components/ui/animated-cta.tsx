import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

type AnimatedCtaProps = {
  label: ReactNode
  icon: ReactNode
  className?: string
  iconClassName?: string
  onClick?: () => void
  to?: string
  disabled?: boolean
  type?: "button" | "submit"
}

export function AnimatedCta({ label, icon, className = '', iconClassName = 'bg-[#ffc400] text-[#0b0b08]', onClick, to, disabled, type = "button" }: AnimatedCtaProps) {
  const content = (
    <>
      <span className={`pointer-events-none absolute left-1.5 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md transition-[left,transform] duration-500 ease-out group-hover:left-[calc(100%-2.5rem)] group-hover:-translate-y-1/2 group-hover:rotate-[360deg] group-active:left-[calc(100%-2.5rem)] group-active:-translate-y-1/2 group-active:rotate-[360deg] group-focus-visible:left-[calc(100%-2.5rem)] group-focus-visible:-translate-y-1/2 group-focus-visible:rotate-[360deg] ${iconClassName}`}>
        {icon}
      </span>
      <span className="relative z-0 block pl-9 transition-transform duration-500 ease-out group-hover:-translate-x-8 group-active:-translate-x-8 group-focus-visible:-translate-x-8">
        {label}
      </span>
    </>
  )
  const classes = `group relative inline-flex min-h-11 items-center overflow-hidden rounded-lg border px-1.5 pr-4 text-sm font-bold transition duration-300 ${className}`

  if (to) {
    return (
      <Link to={to} className={classes}>
        {content}
      </Link>
    )
  }

  return (
    <button type={type} disabled={disabled} onClick={onClick} className={classes}>
      {content}
    </button>
  )
}
