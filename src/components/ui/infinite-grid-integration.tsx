import React, { useRef, useState } from 'react'
import {
  motion,
  useAnimationFrame,
  useMotionTemplate,
  useMotionValue,
} from 'framer-motion'
import { Info, Moon, MousePointerClick, Settings2, Sun } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useTheme } from '@/components/theme/ThemeProvider'
import { AnimatedImageMarquee } from '@/components/ui/hero-3'

/**
 * Standard Shadcn utility for merging Tailwind classes safely.
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Helper component for the SVG grid pattern.
 */
const GridPattern = ({ offsetX, offsetY, size }: { offsetX: any; offsetY: any; size: number }) => {
  return (
    <svg className="h-full w-full">
      <defs>
        <motion.pattern
          id="grid-pattern"
          width={size}
          height={size}
          patternUnits="userSpaceOnUse"
          x={offsetX}
          y={offsetY}
        >
          <path
            d={`M ${size} 0 L 0 0 0 ${size}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-muted-foreground"
          />
        </motion.pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-pattern)" />
    </svg>
  )
}

/**
 * The Infinite Grid Component
 * Displays a scrolling background grid that reveals an active layer on mouse hover.
 */
type InfiniteGridProps = {
  title?: React.ReactNode
  description?: React.ReactNode
  showControls?: boolean
  showActions?: boolean
  showHeroCtas?: boolean
  heroMarqueeImages?: string[]
  className?: string
}

export const InfiniteGrid = ({
  title = (
    <>
      <span className="block">Need a website</span>
      <span className="hero-ink-title block md:whitespace-nowrap">
        that stands out?
        <span className="hero-ink-stroke" aria-hidden="true">
          <svg className="hero-ink-line" viewBox="0 0 520 52" preserveAspectRatio="none" focusable="false">
            <path d="M14 31C142 17 311 15 470 31" />
          </svg>
          <svg className="hero-ink-pencil" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
            <path d="M15.2 4.2L19.8 8.8" />
            <path d="M4.4 19.6L6 14.2L16.3 3.9C17.2 3 18.7 3 19.6 3.9L20.1 4.4C21 5.3 21 6.8 20.1 7.7L9.8 18L4.4 19.6Z" />
            <path d="M6 14.2L9.8 18" />
          </svg>
        </span>
      </span>
    </>
  ),
  description = (
    <>
      Bakhtech Solutions builds websites, ecommerce platforms, booking systems, portals, dashboards, and custom web apps
      that help businesses win more enquiries.
    </>
  ),
  showControls = true,
  showActions = true,
  showHeroCtas = false,
  heroMarqueeImages = [],
  className,
}: InfiniteGridProps) => {
  const [count, setCount] = useState(0)
  const [gridSize, setGridSize] = useState(40)
  const containerRef = useRef<HTMLDivElement>(null)

  // Track mouse position with Motion Values for performance (avoids React re-renders)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top } = e.currentTarget.getBoundingClientRect()
    mouseX.set(e.clientX - left)
    mouseY.set(e.clientY - top)
  }

  // Grid offsets for infinite scroll animation
  const gridOffsetX = useMotionValue(0)
  const gridOffsetY = useMotionValue(0)

  const speedX = 0.5
  const speedY = 0.5

  useAnimationFrame(() => {
    const currentX = gridOffsetX.get()
    const currentY = gridOffsetY.get()
    // Reset offset at pattern width to simulate infinity
    gridOffsetX.set((currentX + speedX) % gridSize)
    gridOffsetY.set((currentY + speedY) % gridSize)
  })

  // Create a dynamic radial mask for the "flashlight" effect
  const maskImage = useMotionTemplate`radial-gradient(300px circle at ${mouseX}px ${mouseY}px, black, transparent)`

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={cn(
        'relative flex min-h-[100svh] w-full flex-col items-center justify-center overflow-hidden bg-background',
        className,
      )}
    >
      {/* Layer 1: Subtle background grid (always visible) */}
      <div className="absolute inset-0 z-0 opacity-[0.05]">
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} size={gridSize} />
      </div>

      {/* Layer 2: Highlighted grid (revealed by mouse mask) */}
      <motion.div
        className="absolute inset-0 z-0 opacity-40"
        style={{ maskImage, WebkitMaskImage: maskImage }}
      >
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} size={gridSize} />
      </motion.div>

      {/* Decorative Blur Spheres */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute right-[-20%] top-[-20%] h-[40%] w-[40%] rounded-full bg-orange-500/40 blur-[120px] dark:bg-orange-600/20" />
        <div className="absolute right-[10%] top-[-10%] h-[20%] w-[20%] rounded-full bg-primary/30 blur-[100px]" />
        <div className="absolute bottom-[-20%] left-[-10%] h-[40%] w-[40%] rounded-full bg-blue-500/40 blur-[120px] dark:bg-blue-600/20" />
      </div>

      {/* Grid Density Control Panel */}
      {showControls ? (
        <div className="pointer-events-auto absolute bottom-10 right-10 z-30">
          <div className="min-w-[200px] space-y-3 rounded-xl border border-border bg-background/80 p-4 shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Settings2 className="h-4 w-4" />
              Grid Density
            </div>
            <input
              type="range"
              min="20"
              max="100"
              value={gridSize}
              onChange={(e) => setGridSize(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
            />
            <div className="flex justify-between font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              <span>Dense</span>
              <span>Sparse ({gridSize}px)</span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Content */}
      <div className="pointer-events-none relative z-10 mx-auto flex w-full max-w-6xl translate-y-10 flex-col items-center space-y-5 px-5 text-center sm:translate-y-14 md:translate-y-24">
        <div className="w-full space-y-5 md:space-y-9">
          <h1 className="mx-auto max-w-[21rem] text-4xl font-black leading-[1.08] tracking-tight text-foreground drop-shadow-sm sm:max-w-2xl sm:text-5xl md:max-w-none md:text-7xl lg:text-8xl">
            {title}
          </h1>
          <p className="mx-auto max-w-[20rem] text-base font-semibold leading-7 text-muted-foreground sm:max-w-xl md:text-xl">
            {description}
          </p>
        </div>

        {showHeroCtas ? (
          <>
            <div className="pointer-events-auto flex w-full flex-col items-center gap-3 pt-1 sm:w-auto sm:flex-row sm:gap-4">
              <a
                href="/contact"
                className="inline-flex min-h-12 w-full max-w-[18rem] items-center justify-center rounded-[16px] border-2 border-[#d8c3b8] bg-[#161616] px-6 text-base font-black text-white shadow-[0_14px_30px_rgba(15,23,42,0.16)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-[#12c8a0] focus:ring-offset-2 focus:ring-offset-background sm:min-h-14 sm:min-w-44 sm:text-lg"
              >
                Start Building
              </a>
              <a
                href="/contact"
                className="inline-flex min-h-12 w-full max-w-[18rem] rounded-[16px] bg-gradient-to-r from-[#10c8ee] to-[#7c4dff] p-[3px] text-base font-black shadow-[0_14px_30px_rgba(15,23,42,0.12)] transition duration-300 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#12c8a0] focus:ring-offset-2 focus:ring-offset-background sm:min-h-14 sm:min-w-52 sm:text-lg"
              >
                <span className="flex w-full items-center justify-center rounded-[15px] bg-background px-7 text-foreground">
                  Request a demo
                </span>
              </a>
            </div>
            {heroMarqueeImages.length ? (
              <div className="relative mt-5 h-28 w-screen max-w-none sm:h-32 md:mt-10 md:h-48">
                <AnimatedImageMarquee
                  images={heroMarqueeImages}
                  className="h-full [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"
                  duration={46}
                  straight
                  trackClassName="gap-6 px-6 md:gap-20 md:px-20"
                  cardClassName="h-28 rounded-sm shadow-none sm:h-32 md:h-48"
                />
              </div>
            ) : null}
          </>
        ) : null}

        {showActions ? (
        <div className="pointer-events-auto flex gap-4">
          <motion.button
            onClick={() => setCount(count + 1)}
            whileHover={{
              scale: 1.05,
              y: -4,
              backgroundColor: '#4338ca',
              borderColor: '#6366f1',
              color: '#ffffff',
              boxShadow: '0 25px 50px -12px rgba(67, 56, 202, 0.6)',
            }}
            whileTap={{ scale: 0.98, y: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="flex items-center gap-2 rounded-md border-2 border-transparent bg-primary px-8 py-3 font-semibold text-primary-foreground shadow-md transition-colors"
          >
            <MousePointerClick className="h-4 w-4" />
            Interact ({count})
          </motion.button>

          <motion.button
            whileHover={{
              scale: 1.05,
              y: -4,
              backgroundColor: '#6d28d9',
              borderColor: '#8b5cf6',
              color: '#ffffff',
              boxShadow: '0 25px 50px -12px rgba(109, 40, 217, 0.6)',
            }}
            whileTap={{ scale: 0.98, y: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="flex items-center gap-2 rounded-md border-2 border-transparent bg-secondary px-8 py-3 font-semibold text-secondary-foreground transition-colors"
          >
            <Info className="h-4 w-4" />
            Learn More
          </motion.button>
        </div>
        ) : null}
      </div>
    </div>
  )
}

const App: React.FC = () => {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="relative min-h-screen w-full">
      {/* Sticky Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="fixed right-4 top-4 z-50 flex items-center justify-center rounded-full border border-border bg-background/50 p-3 shadow-lg backdrop-blur-sm transition-all hover:scale-110 active:scale-95"
        aria-label="Toggle Theme"
      >
        {isDark ? (
          <Sun className="h-5 w-5 text-yellow-500 transition-transform group-hover:rotate-45" />
        ) : (
          <Moon className="h-5 w-5 text-indigo-500 transition-transform group-hover:-rotate-12" />
        )}
      </button>

      {/* Main Content */}
      <main>
        <InfiniteGrid />
      </main>

      {/* Footer Branding */}
      <footer className="fixed bottom-4 left-4 z-50 font-mono text-[10px] uppercase tracking-widest text-muted-foreground opacity-50">
        Shadcn Infinite Grid v1.1
      </footer>
    </div>
  )
}

export default App
