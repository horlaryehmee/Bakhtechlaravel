import { useEffect, useRef, useState } from 'react'

interface WireframeDottedGlobeProps {
  width?: number
  height?: number
  className?: string
  dotSpacing?: number
  rotationSpeed?: number
}

interface DotData {
  lng: number
  lat: number
}

const landDataUrl = 'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/refs/heads/master/110m/physical/ne_110m_land.json'

function pointInPolygon(point: [number, number], polygon: number[][]): boolean {
  const [x, y] = point
  let inside = false

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]

    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }

  return inside
}

function pointInFeature(point: [number, number], feature: GeoJSON.Feature): boolean {
  const geometry = feature.geometry
  if (!geometry) return false

  if (geometry.type === 'Polygon') {
    const coordinates = geometry.coordinates as number[][][]
    if (!pointInPolygon(point, coordinates[0])) return false
    return !coordinates.slice(1).some((ring) => pointInPolygon(point, ring))
  }

  if (geometry.type === 'MultiPolygon') {
    const coordinates = geometry.coordinates as number[][][][]
    return coordinates.some((polygon) => {
      if (!pointInPolygon(point, polygon[0])) return false
      return !polygon.slice(1).some((ring) => pointInPolygon(point, ring))
    })
  }

  return false
}

function generateDotsInFeature(feature: GeoJSON.Feature, dotSpacing: number, geoBounds: typeof import('d3').geoBounds): DotData[] {
  const dots: DotData[] = []
  const [[minLng, minLat], [maxLng, maxLat]] = geoBounds(feature)
  const stepSize = dotSpacing * 0.08

  for (let lng = minLng; lng <= maxLng; lng += stepSize) {
    for (let lat = minLat; lat <= maxLat; lat += stepSize) {
      if (pointInFeature([lng, lat], feature)) dots.push({ lng, lat })
    }
  }

  return dots
}

export function WireframeDottedGlobe({
  width = 340,
  height = 300,
  className = '',
  dotSpacing = 18,
  rotationSpeed = 0.42,
}: WireframeDottedGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const canvasElement = canvas
    let cancelled = false
    let cleanup: (() => void) | undefined

    async function startGlobe() {
      const context = canvasElement.getContext('2d')
      if (!context) return

      const d3 = await import('d3')
      if (cancelled) return

      let autoRotate = true
      let landFeatures: GeoJSON.FeatureCollection | null = null
      const allDots: DotData[] = []
      const rotation: [number, number] = [0, -10]
      const containerWidth = width
      const containerHeight = height
      const radius = Math.min(containerWidth, containerHeight) / 2.25
      const dpr = window.devicePixelRatio || 1

      canvasElement.width = containerWidth * dpr
      canvasElement.height = containerHeight * dpr
      canvasElement.style.width = `${containerWidth}px`
      canvasElement.style.height = `${containerHeight}px`
      context.setTransform(dpr, 0, 0, dpr, 0, 0)

      const projection = d3
        .geoOrthographic()
        .scale(radius)
        .translate([containerWidth / 2, containerHeight / 2])
        .clipAngle(90)
        .rotate(rotation)

      const path = d3.geoPath().projection(projection).context(context)
      const graticule = d3.geoGraticule()

      const render = () => {
        context.clearRect(0, 0, containerWidth, containerHeight)

        context.beginPath()
        context.arc(containerWidth / 2, containerHeight / 2, radius, 0, Math.PI * 2)
        context.fillStyle = '#050505'
        context.fill()
        context.strokeStyle = 'rgba(255,255,255,0.72)'
        context.lineWidth = 1.5
        context.stroke()

        context.beginPath()
        path(graticule())
        context.strokeStyle = 'rgba(255,255,255,0.18)'
        context.lineWidth = 0.8
        context.stroke()

        if (landFeatures) {
          context.beginPath()
          landFeatures.features.forEach((feature) => path(feature))
          context.strokeStyle = 'rgba(255,255,255,0.48)'
          context.lineWidth = 0.9
          context.stroke()

          allDots.forEach((dot) => {
            const projected = projection([dot.lng, dot.lat])
            if (!projected) return

            context.beginPath()
            context.arc(projected[0], projected[1], 1, 0, Math.PI * 2)
            context.fillStyle = 'rgba(255,255,255,0.58)'
            context.fill()
          })
        }
      }

      const timer = d3.timer(() => {
        if (!autoRotate) return
        rotation[0] += rotationSpeed
        projection.rotate(rotation)
        render()
      })

      const handlePointerDown = (event: PointerEvent) => {
        autoRotate = false
        const startX = event.clientX
        const startY = event.clientY
        const startRotation: [number, number] = [...rotation]

        const handlePointerMove = (moveEvent: PointerEvent) => {
          rotation[0] = startRotation[0] + (moveEvent.clientX - startX) * 0.45
          rotation[1] = Math.max(-70, Math.min(70, startRotation[1] - (moveEvent.clientY - startY) * 0.45))
          projection.rotate(rotation)
          render()
        }

        const handlePointerUp = () => {
          document.removeEventListener('pointermove', handlePointerMove)
          document.removeEventListener('pointerup', handlePointerUp)
          autoRotate = true
        }

        document.addEventListener('pointermove', handlePointerMove)
        document.addEventListener('pointerup', handlePointerUp)
      }

      canvasElement.addEventListener('pointerdown', handlePointerDown)
      render()

      fetch(landDataUrl)
        .then((response) => {
          if (!response.ok) throw new Error('Failed to load globe data')
          return response.json() as Promise<GeoJSON.FeatureCollection>
        })
        .then((data) => {
          if (cancelled) return
          landFeatures = data
          data.features.forEach((feature) => {
            allDots.push(...generateDotsInFeature(feature, dotSpacing, d3.geoBounds))
          })
          render()
        })
        .catch(() => {
          if (!cancelled) setError(true)
        })

      cleanup = () => {
        timer.stop()
        canvasElement.removeEventListener('pointerdown', handlePointerDown)
      }
    }

    startGlobe().catch(() => {
      if (!cancelled) setError(true)
    })

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [dotSpacing, height, rotationSpeed, width])

  if (error) {
    return <div className={`rounded-2xl bg-black/40 ${className}`} aria-hidden="true" />
  }

  return (
    <div className={`relative ${className}`}>
      <canvas ref={canvasRef} className="block h-auto max-w-full rounded-2xl" aria-hidden="true" />
    </div>
  )
}

export default WireframeDottedGlobe
