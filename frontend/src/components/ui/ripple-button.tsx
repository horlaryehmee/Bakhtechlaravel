import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useRef, useState, type ElementType, type MouseEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type RippleState = {
  x: number
  y: number
  size: number
  key: number
  isLeaving?: boolean
}

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
  const buttonRef = useRef<HTMLElement | null>(null)
  const [ripple, setRipple] = useState<RippleState | null>(null)
  const [isHovered, setIsHovered] = useState(false)
  const Comp = as ?? 'button'

  const createRipple = useCallback((event: MouseEvent<HTMLElement>) => {
    if (isHovered || !buttonRef.current) return
    setIsHovered(true)

    const rect = buttonRef.current.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height) * 2
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    setRipple({ x, y, size, key: Date.now() })
  }, [isHovered])

  const removeRipple = useCallback((event: MouseEvent<HTMLElement>) => {
    if (!buttonRef.current) return
    setIsHovered(false)

    const rect = buttonRef.current.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height) * 2
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    setRipple({ x, y, size, key: Date.now(), isLeaving: true })
  }, [])

  const moveRipple = useCallback((event: MouseEvent<HTMLElement>) => {
    if (!buttonRef.current || !isHovered || !ripple) return

    const rect = buttonRef.current.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    setRipple((current) => current ? { ...current, x, y } : current)
  }, [isHovered, ripple])

  return (
    <Comp
      ref={buttonRef}
      className={cn(
        'relative isolate overflow-hidden transition-colors duration-[600ms]',
        className,
      )}
      onMouseEnter={(event: MouseEvent<HTMLElement>) => {
        createRipple(event)
        onMouseEnter?.(event)
      }}
      onMouseLeave={(event: MouseEvent<HTMLElement>) => {
        removeRipple(event)
        onMouseLeave?.(event)
      }}
      onMouseMove={(event: MouseEvent<HTMLElement>) => {
        moveRipple(event)
        onMouseMove?.(event)
      }}
      {...props}
    >
      <span className="relative z-[2] inline-flex items-center justify-center gap-2">{children}</span>
      <AnimatePresence>
        {ripple ? (
          <motion.span
            key={ripple.key}
            className={cn('pointer-events-none absolute z-[1] rounded-full bg-black', rippleClassName)}
            style={{
              width: ripple.size,
              height: ripple.size,
              left: ripple.x,
              top: ripple.y,
              x: '-50%',
              y: '-50%',
            }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{
              scale: ripple.isLeaving ? 0 : 1,
              x: '-50%',
              y: '-50%',
            }}
            exit={{ scale: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            onAnimationComplete={() => {
              if (ripple.isLeaving) setRipple(null)
            }}
          />
        ) : null}
      </AnimatePresence>
    </Comp>
  )
}
