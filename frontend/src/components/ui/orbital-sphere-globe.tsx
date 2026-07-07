import type { COBEOptions, Globe as CobeGlobe } from 'cobe'
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

type OrbitalSphereGlobeProps = {
  className?: string
}

const globeConfig: Omit<COBEOptions, 'width' | 'height' | 'onRender'> = {
  devicePixelRatio: 1.5,
  phi: 0,
  theta: 0.28,
  dark: 1,
  diffuse: 0.45,
  mapSamples: 7000,
  mapBrightness: 1.05,
  baseColor: [1, 1, 1],
  markerColor: [1, 1, 1],
  glowColor: [1, 1, 1],
  markers: [],
}

export function OrbitalSphereGlobe({ className = '' }: OrbitalSphereGlobeProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas) return

    let phi = 0
    let width = canvas.offsetWidth
    let globe: CobeGlobe | null = null
    let animationId = 0
    let resizeObserver: ResizeObserver | null = null
    let cancelled = false

    const renderGlobe = async () => {
      const { default: createGlobe } = await import('cobe')
      if (cancelled) return

      globe?.destroy()
      globe = createGlobe(canvas, {
        ...globeConfig,
        width: width * 2,
        height: width * 2,
      })

      const animate = () => {
        phi += 0.0035
        globe?.update({ phi, width: width * 2, height: width * 2 })
        animationId = requestAnimationFrame(animate)
      }

      cancelAnimationFrame(animationId)
      animationId = requestAnimationFrame(animate)
      requestAnimationFrame(() => {
        canvas.style.opacity = '1'
      })
    }

    const startGlobe = () => {
      void renderGlobe()

      resizeObserver?.disconnect()
      resizeObserver = new ResizeObserver((entries) => {
        const nextWidth = Math.round(entries[0]?.contentRect.width || canvas.offsetWidth)
        if (!nextWidth || nextWidth === width) return
        width = nextWidth
        void renderGlobe()
      })
      resizeObserver.observe(canvas)
    }

    const intersectionObserver = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      intersectionObserver.disconnect()
      startGlobe()
    }, { rootMargin: '220px' })

    const onResizeWithoutObserver = (entries: ResizeObserverEntry[]) => {
      const nextWidth = Math.round(entries[0]?.contentRect.width || canvas.offsetWidth)
      if (!nextWidth || nextWidth === width) return
      width = nextWidth
    }

    resizeObserver = new ResizeObserver(onResizeWithoutObserver)
    resizeObserver.observe(canvas)
    intersectionObserver.observe(root)

    return () => {
      cancelled = true
      cancelAnimationFrame(animationId)
      intersectionObserver.disconnect()
      resizeObserver?.disconnect()
      globe?.destroy()
    }
  }, [])

  return (
    <div ref={rootRef} className={cn('pointer-events-none relative aspect-square overflow-visible', className)} aria-hidden="true">
      <canvas ref={canvasRef} className="block size-full opacity-0 transition-opacity duration-500 [contain:layout_paint_size]" />
    </div>
  )
}

export default OrbitalSphereGlobe
