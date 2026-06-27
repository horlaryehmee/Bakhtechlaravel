import { useEffect, useRef } from 'react'

interface WireframeDottedGlobeProps {
  width?: number
  height?: number
  className?: string
  dotSpacing?: number
  rotationSpeed?: number
}

type GlobePoint = {
  lng: number
  lat: number
}

const landBlobs = [
  { lng: -100, lat: 42, rx: 33, ry: 22 },
  { lng: -60, lat: -15, rx: 20, ry: 32 },
  { lng: 15, lat: 5, rx: 26, ry: 34 },
  { lng: 78, lat: 35, rx: 48, ry: 25 },
  { lng: 132, lat: -25, rx: 18, ry: 13 },
  { lng: -42, lat: 72, rx: 18, ry: 8 },
]

function normalizedDelta(value: number) {
  return Math.abs(((value + 180) % 360) - 180)
}

function isApproximateLand(lng: number, lat: number) {
  return landBlobs.some((blob) => {
    const x = normalizedDelta(lng - blob.lng) / blob.rx
    const y = (lat - blob.lat) / blob.ry
    return x * x + y * y <= 1
  })
}

function generatePoints(dotSpacing: number): GlobePoint[] {
  const points: GlobePoint[] = []
  const step = Math.max(5, dotSpacing * 0.55)

  for (let lat = -70; lat <= 75; lat += step) {
    for (let lng = -180; lng <= 180; lng += step) {
      if (isApproximateLand(lng, lat)) points.push({ lng, lat })
    }
  }

  return points
}

function projectPoint(lng: number, lat: number, rotation: number, radius: number, cx: number, cy: number) {
  const lambda = ((lng + rotation) * Math.PI) / 180
  const phi = (lat * Math.PI) / 180
  const cosPhi = Math.cos(phi)
  const x = radius * cosPhi * Math.sin(lambda)
  const y = -radius * Math.sin(phi)
  const z = cosPhi * Math.cos(lambda)

  if (z < 0) return null

  return { x: cx + x, y: cy + y, z }
}

export function WireframeDottedGlobe({
  width = 340,
  height = 300,
  className = '',
  dotSpacing = 18,
  rotationSpeed = 0.42,
}: WireframeDottedGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    const dpr = window.devicePixelRatio || 1
    const radius = Math.min(width, height) / 2.25
    const cx = width / 2
    const cy = height / 2
    const points = generatePoints(dotSpacing)
    let rotation = 0
    let frame = 0
    let animationId = 0

    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    context.setTransform(dpr, 0, 0, dpr, 0, 0)

    const drawLine = (coordinates: Array<[number, number]>) => {
      let drawing = false

      coordinates.forEach(([lng, lat]) => {
        const projected = projectPoint(lng, lat, rotation, radius, cx, cy)
        if (!projected) {
          drawing = false
          return
        }

        if (!drawing) {
          context.moveTo(projected.x, projected.y)
          drawing = true
        } else {
          context.lineTo(projected.x, projected.y)
        }
      })
    }

    const render = () => {
      context.clearRect(0, 0, width, height)
      context.beginPath()
      context.arc(cx, cy, radius, 0, Math.PI * 2)
      context.fillStyle = '#050505'
      context.fill()
      context.strokeStyle = 'rgba(255,255,255,0.72)'
      context.lineWidth = 1.5
      context.stroke()

      context.save()
      context.beginPath()
      context.arc(cx, cy, radius, 0, Math.PI * 2)
      context.clip()

      context.beginPath()
      for (let lat = -60; lat <= 60; lat += 30) {
        drawLine(Array.from({ length: 73 }, (_, index) => [-180 + index * 5, lat]))
      }
      for (let lng = -150; lng <= 180; lng += 30) {
        drawLine(Array.from({ length: 37 }, (_, index) => [lng, -90 + index * 5]))
      }
      context.strokeStyle = 'rgba(255,255,255,0.18)'
      context.lineWidth = 0.8
      context.stroke()

      points.forEach((point) => {
        const projected = projectPoint(point.lng, point.lat, rotation, radius, cx, cy)
        if (!projected) return

        context.beginPath()
        context.arc(projected.x, projected.y, 1.05, 0, Math.PI * 2)
        context.fillStyle = `rgba(255,255,255,${0.32 + projected.z * 0.3})`
        context.fill()
      })

      context.restore()
    }

    const animate = () => {
      frame += 1
      rotation += rotationSpeed
      if (frame % 2 === 0) render()
      animationId = window.requestAnimationFrame(animate)
    }

    render()
    animationId = window.requestAnimationFrame(animate)

    return () => window.cancelAnimationFrame(animationId)
  }, [dotSpacing, height, rotationSpeed, width])

  return (
    <div className={`relative ${className}`}>
      <canvas ref={canvasRef} className="block h-auto max-w-full rounded-2xl" aria-hidden="true" />
    </div>
  )
}

export default WireframeDottedGlobe
