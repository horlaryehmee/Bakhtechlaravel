import { useEffect, useRef } from 'react'

type GLSLHillsProps = {
  cameraZ?: number
  className?: string
  planeSize?: number
  speed?: number
}

type Point = {
  x: number
  y: number
}

function buildWave(width: number, height: number, time: number, offset: number): Point[] {
  const points: Point[] = []
  const horizon = height * 0.58
  const amplitude = height * 0.055
  const step = Math.max(18, width / 28)

  for (let x = -step; x <= width + step; x += step) {
    const progress = x / width
    const y =
      horizon +
      Math.sin(progress * Math.PI * 1.4 + time * 0.7 + offset) * amplitude +
      Math.sin(progress * Math.PI * 3.2 - time * 0.35 + offset) * amplitude * 0.45

    points.push({ x, y })
  }

  return points
}

export function GLSLHills({ className = '', speed = 0.5 }: GLSLHillsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    const context = canvas?.getContext('2d', { alpha: true })
    if (!canvas || !container || !context) return

    let animationFrame = 0
    let lastRenderTime = 0
    let isVisible = true
    let width = 1
    let height = 1
    let pixelRatio = 1

    const resize = () => {
      const rect = container.getBoundingClientRect()
      width = Math.max(1, Math.floor(rect.width))
      height = Math.max(1, Math.floor(rect.height))
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25)
      canvas.width = Math.floor(width * pixelRatio)
      canvas.height = Math.floor(height * pixelRatio)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    }

    const drawWave = (time: number, offset: number, alpha: number, lift: number) => {
      const points = buildWave(width, height, time, offset)
      const gradient = context.createLinearGradient(0, height * 0.4, 0, height)
      gradient.addColorStop(0, `rgba(88, 125, 159, ${alpha})`)
      gradient.addColorStop(0.42, `rgba(214, 224, 237, ${alpha * 0.8})`)
      gradient.addColorStop(1, 'rgba(214, 224, 237, 0)')

      context.beginPath()
      context.moveTo(points[0].x, points[0].y + lift)
      for (let index = 1; index < points.length; index += 1) {
        const current = points[index]
        const previous = points[index - 1]
        context.quadraticCurveTo(previous.x, previous.y + lift, (previous.x + current.x) / 2, (previous.y + current.y) / 2 + lift)
      }
      context.lineTo(width + 40, height + 40)
      context.lineTo(-40, height + 40)
      context.closePath()
      context.fillStyle = gradient
      context.fill()
    }

    const render = (frameTime: number) => {
      if (isVisible && document.visibilityState === 'visible' && frameTime - lastRenderTime >= 33) {
        const time = (frameTime / 1000) * speed
        context.clearRect(0, 0, width, height)

        drawWave(time, 0, 0.2, 36)
        drawWave(time, 1.8, 0.14, 78)
        drawWave(time, 3.4, 0.1, 118)

        lastRenderTime = frameTime
      }

      animationFrame = window.requestAnimationFrame(render)
    }

    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize)
    const visibilityObserver =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([entry]) => {
            isVisible = entry.isIntersecting
          })

    resizeObserver?.observe(container)
    visibilityObserver?.observe(container)
    if (!resizeObserver) window.addEventListener('resize', resize)
    resize()
    animationFrame = window.requestAnimationFrame(render)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      resizeObserver?.disconnect()
      visibilityObserver?.disconnect()
      if (!resizeObserver) window.removeEventListener('resize', resize)
    }
  }, [speed])

  return (
    <div ref={containerRef} className={className}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
    </div>
  )
}
