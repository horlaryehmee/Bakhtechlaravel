import { useCallback, useEffect, useRef, useState } from 'react'
import createGlobe from 'cobe'

interface CdnMarker {
  id: string
  location: [number, number]
  region: string
}

interface CdnArc {
  id: string
  from: [number, number]
  to: [number, number]
}

interface GlobeCdnProps {
  markers?: CdnMarker[]
  arcs?: CdnArc[]
  className?: string
  speed?: number
}

const defaultMarkers: CdnMarker[] = [
  { id: 'cdn-iad', location: [38.95, -77.45], region: 'iad1' },
  { id: 'cdn-sfo', location: [37.62, -122.38], region: 'sfo1' },
  { id: 'cdn-cdg', location: [49.01, 2.55], region: 'cdg1' },
  { id: 'cdn-hnd', location: [35.55, 139.78], region: 'hnd1' },
  { id: 'cdn-syd', location: [-33.95, 151.18], region: 'syd1' },
  { id: 'cdn-gru', location: [-23.43, -46.47], region: 'gru1' },
  { id: 'cdn-sin', location: [1.36, 103.99], region: 'sin1' },
  { id: 'cdn-arn', location: [59.65, 17.93], region: 'arn1' },
  { id: 'cdn-dub', location: [53.43, -6.25], region: 'dub1' },
  { id: 'cdn-bom', location: [19.09, 72.87], region: 'bom1' },
]

const defaultArcs: CdnArc[] = [
  { id: 'cdn-arc-1', from: [38.95, -77.45], to: [49.01, 2.55] },
  { id: 'cdn-arc-2', from: [37.62, -122.38], to: [35.55, 139.78] },
  { id: 'cdn-arc-3', from: [49.01, 2.55], to: [1.36, 103.99] },
  { id: 'cdn-arc-4', from: [38.95, -77.45], to: [-23.43, -46.47] },
  { id: 'cdn-arc-5', from: [35.55, 139.78], to: [-33.95, 151.18] },
  { id: 'cdn-arc-6', from: [49.01, 2.55], to: [19.09, 72.87] },
]

export function GlobeCdn({
  markers = defaultMarkers,
  arcs = defaultArcs,
  className = '',
  speed = 0.003,
}: GlobeCdnProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerInteracting = useRef<{ x: number; y: number } | null>(null)
  const dragOffset = useRef({ phi: 0, theta: 0 })
  const phiOffsetRef = useRef(0)
  const thetaOffsetRef = useRef(0)
  const isPausedRef = useRef(false)
  const [traffic, setTraffic] = useState(() =>
    defaultArcs.map((arc, index) => ({
      id: arc.id,
      value: [420, 380, 290, 185, 156, 134][index] || 100,
    })),
  )

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTraffic((data) =>
        data.map((item) => ({
          ...item,
          value: Math.max(50, item.value + Math.floor(Math.random() * 21) - 10),
        })),
      )
    }, 250)

    return () => window.clearInterval(interval)
  }, [])

  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    pointerInteracting.current = { x: event.clientX, y: event.clientY }
    if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing'
    isPausedRef.current = true
  }, [])

  const handlePointerUp = useCallback(() => {
    if (pointerInteracting.current !== null) {
      phiOffsetRef.current += dragOffset.current.phi
      thetaOffsetRef.current += dragOffset.current.theta
      dragOffset.current = { phi: 0, theta: 0 }
    }

    pointerInteracting.current = null
    if (canvasRef.current) canvasRef.current.style.cursor = 'grab'
    isPausedRef.current = false
  }, [])

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (pointerInteracting.current !== null) {
        dragOffset.current = {
          phi: (event.clientX - pointerInteracting.current.x) / 300,
          theta: (event.clientY - pointerInteracting.current.y) / 1000,
        }
      }
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('pointerup', handlePointerUp, { passive: true })

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [handlePointerUp])

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    let globe: ReturnType<typeof createGlobe> | null = null
    let animationId = 0
    let phi = 0
    let resizeObserver: ResizeObserver | null = null

    function init() {
      const width = canvas.offsetWidth
      if (width === 0 || globe) return

      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width,
        height: width,
        phi: 0,
        theta: 0.2,
        dark: 0,
        diffuse: 1.5,
        mapSamples: 16000,
        mapBrightness: 10,
        baseColor: [1, 1, 1],
        markerColor: [0, 0, 0],
        glowColor: [0.94, 0.93, 0.91],
        markerElevation: 0.02,
        markers: markers.map((marker) => ({
          location: marker.location,
          size: 0.012,
          id: marker.id,
        })),
        arcs: arcs.map((arc) => ({
          from: arc.from,
          to: arc.to,
          id: arc.id,
        })),
        arcColor: [0, 0, 0],
        arcWidth: 0.5,
        arcHeight: 0.25,
        opacity: 0.7,
      })

      function animate() {
        if (!isPausedRef.current) phi += speed
        globe?.update({
          phi: phi + phiOffsetRef.current + dragOffset.current.phi,
          theta: 0.2 + thetaOffsetRef.current + dragOffset.current.theta,
        })
        animationId = window.requestAnimationFrame(animate)
      }

      animate()
      window.setTimeout(() => {
        canvas.style.opacity = '1'
      })
    }

    if (canvas.offsetWidth > 0) {
      init()
    } else {
      resizeObserver = new ResizeObserver((entries) => {
        if (entries[0]?.contentRect.width > 0) {
          resizeObserver?.disconnect()
          resizeObserver = null
          init()
        }
      })
      resizeObserver.observe(canvas)
    }

    return () => {
      if (animationId) window.cancelAnimationFrame(animationId)
      resizeObserver?.disconnect()
      globe?.destroy()
    }
  }, [markers, arcs, speed])

  const pyramidFaceStyle = (index: number): React.CSSProperties => {
    const transforms = [
      'rotateY(0deg) translateZ(4px) rotateX(19.5deg)',
      'rotateY(120deg) translateZ(4px) rotateX(19.5deg)',
      'rotateY(240deg) translateZ(4px) rotateX(19.5deg)',
      'rotateX(-90deg) rotateZ(60deg) translateY(4px)',
    ]
    const colors = ['#111', '#333', '#555', '#222']

    return {
      position: 'absolute',
      left: -0.5,
      top: 0,
      width: 0,
      height: 0,
      borderLeft: '6.5px solid transparent',
      borderRight: '6.5px solid transparent',
      borderBottom: `13px solid ${colors[index]}`,
      transformOrigin: 'center bottom',
      transform: transforms[index],
    }
  }

  return (
    <div className={`relative aspect-square select-none ${className}`}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        style={{
          width: '100%',
          height: '100%',
          cursor: 'grab',
          opacity: 0,
          transition: 'opacity 1.2s ease',
          borderRadius: '50%',
          touchAction: 'none',
        }}
      />
      {markers.map((marker) => (
        <div
          key={marker.id}
          style={{
            position: 'absolute',
            positionAnchor: `--cobe-${marker.id}`,
            bottom: 'anchor(top)',
            left: 'anchor(center)',
            translate: '-50% 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            pointerEvents: 'none',
            opacity: `var(--cobe-visible-${marker.id}, 0)`,
            filter: `blur(calc((1 - var(--cobe-visible-${marker.id}, 0)) * 8px))`,
            transition: 'opacity 0.3s, filter 0.3s',
          } as React.CSSProperties}
        >
          <div
            className="globe-cdn-pyramid"
            style={{
              width: 12,
              height: 12,
              position: 'relative',
              transformStyle: 'preserve-3d',
            }}
          >
            {[0, 1, 2, 3].map((index) => (
              <div key={index} style={pyramidFaceStyle(index)} />
            ))}
          </div>
          <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[0.55rem] tracking-wider text-black shadow-sm">
            {marker.region}
          </span>
        </div>
      ))}
      {traffic.map((item) => (
        <div
          key={item.id}
          style={{
            position: 'absolute',
            positionAnchor: `--cobe-arc-${item.id}`,
            bottom: 'anchor(top)',
            left: 'anchor(center)',
            translate: '-50% 0',
            pointerEvents: 'none',
            opacity: `var(--cobe-visible-arc-${item.id}, 0)`,
            filter: `blur(calc((1 - var(--cobe-visible-arc-${item.id}, 0)) * 8px))`,
            transition: 'opacity 0.3s, filter 0.3s',
          } as React.CSSProperties}
          className="whitespace-nowrap rounded bg-black px-2 py-1 font-mono text-[0.5rem] text-white"
        >
          {item.value}k req/s
        </div>
      ))}
    </div>
  )
}
