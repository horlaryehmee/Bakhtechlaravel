import { type ElementType, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type RippleButtonProps = {
  as?: ElementType
  children?: ReactNode
  className?: string
  rippleClassName?: string
  disabled?: boolean
  href?: string
  to?: string
  type?: string
  onClick?: (event: any) => void
  onMouseEnter?: (event: any) => void
  onMouseLeave?: (event: any) => void
  onMouseMove?: (event: any) => void
  [key: string]: unknown
}

export function RippleButton({
  children,
  className,
  rippleClassName,
  as,
  onMouseEnter,
  onMouseLeave,
  onMouseMove,
  ...props
}: RippleButtonProps) {
  const Comp = as ?? 'button'

  return (
    <Comp
      className={cn(
        'ripple-button relative isolate overflow-hidden transition-colors duration-[600ms]',
        className,
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseMove={onMouseMove}
      {...props}
    >
      <span className="relative z-[2] inline-flex items-center justify-center gap-2">{children}</span>
      <span className={cn('ripple-button__fill pointer-events-none absolute inset-0 z-[1] rounded-[inherit] bg-black', rippleClassName)} />
    </Comp>
  )
}
