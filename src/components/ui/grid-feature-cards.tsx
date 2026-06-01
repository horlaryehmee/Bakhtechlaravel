import React from 'react'
import { cn } from '@/lib/utils'

type FeatureType = {
  title: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  description: string
}

type FeatureCardProps = React.ComponentProps<'div'> & {
  feature: FeatureType
}

export function FeatureCard({ feature, className, ...props }: FeatureCardProps) {
  const pattern = genRandomPattern()

  return (
    <div
      className={cn(
        'group relative overflow-hidden p-6 transition duration-300 hover:-translate-y-1 hover:bg-[var(--surface)] hover:shadow-[0_24px_70px_rgba(18,97,255,0.16)]',
        className,
      )}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(18,97,255,0.18),transparent_32%),radial-gradient(circle_at_84%_18%,rgba(18,200,160,0.16),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(239,68,68,0.12),transparent_34%)]" />
      </div>
      <div className="pointer-events-none absolute left-1/2 top-0 -ml-20 -mt-2 h-full w-full [mask-image:linear-gradient(white,transparent)]">
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/5 to-foreground/1 opacity-100 [mask-image:radial-gradient(farthest-side_at_top,white,transparent)]">
          <GridPattern
            width={20}
            height={20}
            x="-12"
            y="4"
            squares={pattern}
            className="absolute inset-0 h-full w-full fill-foreground/5 stroke-foreground/25 mix-blend-overlay"
          />
        </div>
      </div>
      <div className="relative z-10 grid size-11 place-items-center rounded-xl border border-[var(--line)] bg-[var(--surface)] transition duration-300 group-hover:border-transparent group-hover:bg-[#1261ff] group-hover:text-white">
        <feature.icon className="size-6 text-foreground/75 transition duration-300 group-hover:text-white" strokeWidth={1} aria-hidden />
      </div>
      <h3 className="relative z-10 mt-8 text-sm font-semibold text-[var(--foreground)] transition duration-300 group-hover:text-[#1261ff] md:text-base">{feature.title}</h3>
      <p className="relative z-20 mt-2 text-xs font-light leading-5 text-[var(--muted-foreground)]">{feature.description}</p>
    </div>
  )
}

function GridPattern({
  width,
  height,
  x,
  y,
  squares,
  ...props
}: React.ComponentProps<'svg'> & { width: number; height: number; x: string; y: string; squares?: number[][] }) {
  const patternId = React.useId()

  return (
    <svg aria-hidden="true" {...props}>
      <defs>
        <pattern id={patternId} width={width} height={height} patternUnits="userSpaceOnUse" x={x} y={y}>
          <path d={`M.5 ${height}V.5H${width}`} fill="none" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${patternId})`} />
      {squares ? (
        <svg x={x} y={y} className="overflow-visible">
          {squares.map(([squareX, squareY], index) => (
            <rect key={index} strokeWidth="0" width={width + 1} height={height + 1} x={squareX * width} y={squareY * height} />
          ))}
        </svg>
      ) : null}
    </svg>
  )
}

function genRandomPattern(length = 5): number[][] {
  return Array.from({ length }, () => [Math.floor(Math.random() * 4) + 7, Math.floor(Math.random() * 6) + 1])
}
