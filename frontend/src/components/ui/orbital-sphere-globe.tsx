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

// The page talks to either renderer through the same small interface.
type GlobeRenderer = {
  resize: (width: number) => void
  setRunning: (running: boolean) => void
  destroy: () => void
}

function supportsWorkerRendering() {
  try {
    if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') return false
    if (!('transferControlToOffscreen' in HTMLCanvasElement.prototype)) return false
    const probe = new OffscreenCanvas(1, 1)
    return Boolean(probe.getContext('webgl2') || probe.getContext('webgl'))
  } catch {
    return false
  }
}

// Preferred: render in a worker on an OffscreenCanvas. Frames go straight to
// the compositor, so the main thread does no paint or style work per frame.
function createWorkerRenderer(canvas: HTMLCanvasElement, options: COBEOptions, minFrameMs: number, onReady: () => void): GlobeRenderer {
  const worker = new Worker(new URL('./orbital-globe.worker.ts', import.meta.url), { type: 'module' })
  const offscreen = canvas.transferControlToOffscreen()
  worker.onmessage = (event: MessageEvent<{ type: string }>) => {
    if (event.data?.type === 'ready') onReady()
  }
  worker.postMessage({ type: 'init', canvas: offscreen, options, minFrameMs }, [offscreen])

  return {
    resize: (width) => worker.postMessage({ type: 'size', width, height: width }),
    setRunning: (running) => worker.postMessage({ type: 'run', running }),
    destroy: () => {
      worker.postMessage({ type: 'destroy' })
      window.setTimeout(() => worker.terminate(), 1000)
    },
  }
}

// cobe rewrites a <style> tag in <head> on every update(), even when its
// content is unchanged. Each rewrite forces a style recalculation of the whole
// page. Ignore writes that don't change anything.
const textContentDescriptor = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent')

function skipRedundantStyleWrites(style: HTMLStyleElement) {
  if (!textContentDescriptor?.get || !textContentDescriptor.set) return
  const { get, set } = textContentDescriptor
  let lastValue = get.call(style) as string | null

  Object.defineProperty(style, 'textContent', {
    configurable: true,
    get() {
      return get.call(this)
    },
    set(value: string | null) {
      if (value === lastValue) return
      lastValue = value
      set.call(this, value)
    },
  })
}

// Fallback for browsers without OffscreenCanvas WebGL: render on the main thread.
function createMainThreadRenderer(canvas: HTMLCanvasElement, options: COBEOptions, minFrameMs: number, onReady: () => void): GlobeRenderer {
  let globe: CobeGlobe | null = null
  let phi = options.phi
  let frameId = 0
  let lastFrame = 0
  let running = false
  let destroyed = false

  const tick = (now: number) => {
    if (!running || !globe) return
    frameId = requestAnimationFrame(tick)
    const elapsed = lastFrame ? now - lastFrame : minFrameMs || 16.67
    if (elapsed < minFrameMs) return
    lastFrame = now
    phi += 0.0035 * Math.min(elapsed / 16.67, 4)
    globe.update({ phi })
  }
  const setRunning = (next: boolean) => {
    running = next
    cancelAnimationFrame(frameId)
    lastFrame = 0
    if (running && globe) frameId = requestAnimationFrame(tick)
  }

  void import('cobe').then(({ default: createGlobe }) => {
    if (destroyed) return
    const stylesBefore = new Set(document.head.querySelectorAll('style'))
    globe = createGlobe(canvas, options)
    document.head.querySelectorAll('style').forEach((style) => {
      if (!stylesBefore.has(style)) skipRedundantStyleWrites(style)
    })
    onReady()
    setRunning(running)
  })

  return {
    resize: (width) => globe?.update({ width, height: width }),
    setRunning,
    destroy: () => {
      destroyed = true
      setRunning(false)
      globe?.destroy()
    },
  }
}

export function OrbitalSphereGlobe({ className = '' }: OrbitalSphereGlobeProps) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    // The canvas is created here (not in JSX) because a canvas can only be
    // handed to a worker once; a fresh one per effect run keeps that safe.
    const canvas = document.createElement('canvas')
    canvas.className = 'block size-full opacity-0 transition-opacity duration-500 [contain:layout_paint_size]'
    root.appendChild(canvas)

    // Phones: render at 2x instead of 3x and at ~30fps. Rotation speed is
    // time-based, so the globe turns at the same pace everywhere.
    const isPhone = window.matchMedia('(max-width: 767px)').matches
    const minFrameMs = isPhone ? 32 : 0

    let renderer: GlobeRenderer | null = null
    let visible = false
    let width = 0

    const sync = () => renderer?.setRunning(visible && !document.hidden)
    const onReady = () => {
      canvas.style.opacity = '1'
    }

    const start = () => {
      width = Math.round(canvas.offsetWidth)
      if (!width) return
      const options: COBEOptions = {
        ...globeConfig,
        ...(isPhone ? { devicePixelRatio: 1 } : null),
        width: width * 2,
        height: width * 2,
      }
      renderer = supportsWorkerRendering()
        ? createWorkerRenderer(canvas, options, minFrameMs, onReady)
        : createMainThreadRenderer(canvas, options, minFrameMs, onReady)
      sync()
    }

    const intersectionObserver = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting)
      if (visible && !renderer) start()
      sync()
    })
    const resizeObserver = new ResizeObserver((entries) => {
      const nextWidth = Math.round(entries[0]?.contentRect.width || canvas.offsetWidth)
      if (!renderer || !nextWidth || nextWidth === width) return
      width = nextWidth
      renderer.resize(width * 2)
    })

    document.addEventListener('visibilitychange', sync)
    intersectionObserver.observe(root)
    resizeObserver.observe(canvas)

    return () => {
      document.removeEventListener('visibilitychange', sync)
      intersectionObserver.disconnect()
      resizeObserver.disconnect()
      renderer?.destroy()
      canvas.remove()
    }
  }, [])

  return <div ref={rootRef} className={cn('pointer-events-none relative aspect-square overflow-visible', className)} aria-hidden="true" />
}

export default OrbitalSphereGlobe
