import { useEffect, useMemo, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type GlowColor = 'blue' | 'green' | 'orange' | 'purple' | 'red'
type GlowSize = 'sm' | 'md' | 'lg'

type GlowCardProps = {
  children: ReactNode
  className?: string
  customSize?: boolean
  glowColor?: GlowColor
  height?: number | string
  size?: GlowSize
  width?: number | string
}

const glowColorMap: Record<GlowColor, { base: number; spread: number }> = {
  blue: { base: 220, spread: 200 },
  green: { base: 120, spread: 200 },
  orange: { base: 30, spread: 200 },
  purple: { base: 280, spread: 300 },
  red: { base: 0, spread: 200 },
}

const sizeMap: Record<GlowSize, string> = {
  lg: 'h-96 w-80',
  md: 'h-80 w-64',
  sm: 'h-64 w-48',
}

const glowStyles = `
[data-glow]::before,
[data-glow]::after {
  pointer-events: none;
  content: "";
  position: absolute;
  inset: calc(var(--border-size) * -1);
  border: var(--border-size) solid transparent;
  border-radius: calc(var(--radius) * 1px);
  background-attachment: fixed;
  background-size: calc(100% + (2 * var(--border-size))) calc(100% + (2 * var(--border-size)));
  background-repeat: no-repeat;
  background-position: 50% 50%;
  mask: linear-gradient(transparent, transparent), linear-gradient(white, white);
  mask-clip: padding-box, border-box;
  mask-composite: intersect;
}

[data-glow]::before {
  background-image: radial-gradient(
    calc(var(--spotlight-size) * 0.75) calc(var(--spotlight-size) * 0.75) at
    calc(var(--x, 0) * 1px)
    calc(var(--y, 0) * 1px),
    hsl(var(--hue, 210) calc(var(--saturation, 100) * 1%) calc(var(--lightness, 50) * 1%) / var(--border-spot-opacity, 1)), transparent 100%
  );
  filter: brightness(2);
}

[data-glow]::after {
  background-image: radial-gradient(
    calc(var(--spotlight-size) * 0.5) calc(var(--spotlight-size) * 0.5) at
    calc(var(--x, 0) * 1px)
    calc(var(--y, 0) * 1px),
    hsl(0 100% 100% / var(--border-light-opacity, 1)), transparent 100%
  );
}

[data-glow] [data-glow] {
  position: absolute;
  inset: 0;
  will-change: filter;
  opacity: var(--outer, 1);
  border-radius: calc(var(--radius) * 1px);
  border-width: calc(var(--border-size) * 20);
  filter: blur(calc(var(--border-size) * 10));
  background: none;
  pointer-events: none;
  border: none;
}

[data-glow] > [data-glow]::before {
  inset: -10px;
  border-width: 10px;
}
`

let styleInjected = false

function injectGlowStyles() {
  if (styleInjected || typeof document === 'undefined') return
  const style = document.createElement('style')
  style.textContent = glowStyles
  document.head.appendChild(style)
  styleInjected = true
}

export function GlowCard({
  children,
  className = '',
  customSize = false,
  glowColor = 'blue',
  height,
  size = 'md',
  width,
}: GlowCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const { base, spread } = glowColorMap[glowColor]

  useEffect(() => {
    injectGlowStyles()

    const syncPointer = (event: PointerEvent) => {
      const card = cardRef.current
      if (!card) return

      const { clientX: x, clientY: y } = event
      card.style.setProperty('--x', x.toFixed(2))
      card.style.setProperty('--xp', (x / window.innerWidth).toFixed(2))
      card.style.setProperty('--y', y.toFixed(2))
      card.style.setProperty('--yp', (y / window.innerHeight).toFixed(2))
    }

    document.addEventListener('pointermove', syncPointer)
    return () => document.removeEventListener('pointermove', syncPointer)
  }, [])

  const style = useMemo(() => {
    const styles: CSSProperties & Record<`--${string}`, string | number | undefined> = {
      '--backdrop': 'hsl(0 0% 60% / 0.12)',
      '--backup-border': 'var(--backdrop)',
      '--base': base,
      '--border': '3',
      '--border-size': 'calc(var(--border, 2) * 1px)',
      '--hue': 'calc(var(--base) + (var(--xp, 0) * var(--spread, 0)))',
      '--outer': '1',
      '--radius': '14',
      '--size': '200',
      '--spread': spread,
      '--spotlight-size': 'calc(var(--size, 150) * 1px)',
      backgroundAttachment: 'fixed',
      backgroundColor: 'var(--backdrop)',
      backgroundImage: `radial-gradient(
        var(--spotlight-size) var(--spotlight-size) at
        calc(var(--x, 0) * 1px)
        calc(var(--y, 0) * 1px),
        hsl(var(--hue, 210) calc(var(--saturation, 100) * 1%) calc(var(--lightness, 70) * 1%) / var(--bg-spot-opacity, 0.1)), transparent
      )`,
      backgroundPosition: '50% 50%',
      backgroundSize: 'calc(100% + (2 * var(--border-size))) calc(100% + (2 * var(--border-size)))',
      border: 'var(--border-size) solid var(--backup-border)',
      height: height !== undefined ? (typeof height === 'number' ? `${height}px` : height) : undefined,
      position: 'relative',
      touchAction: 'none',
      width: width !== undefined ? (typeof width === 'number' ? `${width}px` : width) : undefined,
    }

    return styles
  }, [base, height, spread, width])

  return (
    <div
      ref={cardRef}
      data-glow
      style={style}
      className={cn(
        !customSize && sizeMap[size],
        !customSize && 'aspect-[3/4]',
        'relative grid grid-rows-[1fr_auto] gap-4 rounded-2xl p-4 shadow-[0_1rem_2rem_-1rem_black] backdrop-blur-[5px]',
        className,
      )}
    >
      <div data-glow />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
