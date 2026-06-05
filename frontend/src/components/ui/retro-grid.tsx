import { useEffect, useRef } from 'react'

interface RetroGridProps {
  className?: string
  glowEffect?: boolean
  gridColor?: string
  showScanlines?: boolean
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        b: Number.parseInt(result[3], 16),
        g: Number.parseInt(result[2], 16),
        r: Number.parseInt(result[1], 16),
      }
    : { b: 159, g: 125, r: 88 }
}

export default function RetroGrid({ className = '', glowEffect = true, gridColor = '#587d9f', showScanlines = false }: RetroGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    const ctx = canvas?.getContext('2d', { alpha: true })
    if (!canvas || !wrap || !ctx) return

    let animationFrame = 0
    let height = 1
    let isVisible = true
    let lastFrame = 0
    let offset = 0
    let pixelRatio = 1
    let width = 1

    const cellWidth = 120
    const cellDepth = 80
    const numCellsWide = 16
    const numCellsDeep = 20
    const cameraX = 0
    const cameraY = 60
    const cameraZ = 400
    const focalLength = 500
    const rgb = hexToRgb(gridColor)

    const resizeCanvas = () => {
      const rect = wrap.getBoundingClientRect()
      width = Math.max(1, Math.floor(rect.width))
      height = Math.max(1, Math.floor(rect.height))
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25)
      canvas.width = Math.floor(width * pixelRatio)
      canvas.height = Math.floor(height * pixelRatio)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    }

    const project3DTo2D = (x: number, y: number, z: number) => {
      const relX = x - cameraX
      const relY = y - cameraY
      const relZ = z - cameraZ
      if (relZ <= 10) return null

      const scale = focalLength / relZ
      return {
        x: width / 2 + relX * scale,
        y: height * 0.52 - relY * scale,
      }
    }

    const drawCell = (x: number, z: number) => {
      const actualZ = z - offset
      if (actualZ < 0 || actualZ > numCellsDeep * cellDepth) return

      const topLeft = project3DTo2D(x - cellWidth / 2, 0, actualZ)
      const topRight = project3DTo2D(x + cellWidth / 2, 0, actualZ)
      const bottomLeft = project3DTo2D(x - cellWidth / 2, 0, actualZ + cellDepth)
      const bottomRight = project3DTo2D(x + cellWidth / 2, 0, actualZ + cellDepth)
      if (!topLeft || !topRight || !bottomLeft || !bottomRight) return

      const distanceFactor = Math.min(1, actualZ / (numCellsDeep * cellDepth))
      const alpha = Math.max(0.16, 0.62 - distanceFactor * 0.36)

      if (glowEffect) {
        ctx.shadowBlur = 8 * (1 - distanceFactor)
        ctx.shadowColor = gridColor
      }

      ctx.lineWidth = Math.max(0.7, 1.4 * (1 - distanceFactor * 0.35))
      ctx.strokeStyle = gridColor
      ctx.globalAlpha = alpha
      ctx.beginPath()
      ctx.moveTo(bottomLeft.x, bottomLeft.y)
      ctx.lineTo(bottomRight.x, bottomRight.y)
      ctx.lineTo(topRight.x, topRight.y)
      ctx.lineTo(topLeft.x, topLeft.y)
      ctx.closePath()
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1
    }

    const drawScanlines = () => {
      if (!showScanlines) return
      ctx.globalAlpha = 0.05
      ctx.fillStyle = '#30373f'
      for (let y = 0; y < height; y += 5) ctx.fillRect(0, y, width, 1)
      ctx.globalAlpha = 1
    }

    const animate = (time: number) => {
      if (isVisible && document.visibilityState === 'visible' && time - lastFrame >= 33) {
        ctx.clearRect(0, 0, width, height)

        const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.62)
        skyGradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.02)`)
        skyGradient.addColorStop(0.55, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)`)
        skyGradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.14)`)
        ctx.fillStyle = skyGradient
        ctx.fillRect(0, 0, width, height * 0.62)

        offset += 0.75
        if (offset >= cellDepth) offset = 0

        for (let row = -2; row < numCellsDeep; row += 1) {
          const z = row * cellDepth
          for (let col = -Math.floor(numCellsWide / 2); col <= Math.floor(numCellsWide / 2); col += 1) {
            drawCell(col * cellWidth, z)
          }
        }

        const fade = ctx.createLinearGradient(0, 0, 0, height)
        fade.addColorStop(0, 'rgba(255,255,255,0.72)')
        fade.addColorStop(0.42, 'rgba(255,255,255,0.2)')
        fade.addColorStop(1, 'rgba(255,255,255,0.84)')
        ctx.fillStyle = fade
        ctx.fillRect(0, 0, width, height)

        drawScanlines()
        lastFrame = time
      }

      animationFrame = window.requestAnimationFrame(animate)
    }

    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resizeCanvas)
    const visibilityObserver =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([entry]) => {
            isVisible = entry.isIntersecting
          })

    resizeObserver?.observe(wrap)
    visibilityObserver?.observe(wrap)
    if (!resizeObserver) window.addEventListener('resize', resizeCanvas)
    resizeCanvas()
    animationFrame = window.requestAnimationFrame(animate)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      resizeObserver?.disconnect()
      visibilityObserver?.disconnect()
      if (!resizeObserver) window.removeEventListener('resize', resizeCanvas)
    }
  }, [glowEffect, gridColor, showScanlines])

  return (
    <div ref={wrapRef} className={className}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
    </div>
  )
}
