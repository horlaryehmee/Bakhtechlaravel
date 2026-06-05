import { useEffect, useRef, type FC } from 'react'

interface Ball {
  fillColor: string
  radius: number
  x: number
  y: number
  scale: number
  vx: number
  vy: number
}

interface BouncingBallsProps {
  backgroundColor?: string
  bounceDamping?: number
  className?: string
  colors?: string[]
  followMouse?: boolean
  friction?: number
  gravity?: number
  interactive?: boolean
  interactionRadius?: number
  interactionScale?: number
  maxRadius?: number
  minRadius?: number
  numBalls?: number
  opacity?: number
  speed?: number
  trailAlpha?: number
}

export const BouncingBalls: FC<BouncingBallsProps> = ({
  backgroundColor = 'transparent',
  bounceDamping = 1,
  className = '',
  colors,
  followMouse = false,
  friction = 1,
  gravity = 0,
  interactive = true,
  interactionRadius = 100,
  interactionScale = 4,
  maxRadius = 2,
  minRadius = 0.4,
  numBalls = 150,
  opacity = 1,
  speed = 0.5,
  trailAlpha = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    const ctx = canvas?.getContext('2d', { alpha: true })
    if (!canvas || !wrap || !ctx) return

    let animationFrame = 0
    let isVisible = true
    let lastFrame = 0
    let width = 1
    let height = 1
    let pixelRatio = 1
    const mouse = { x: 0, y: 0 }

    const getRandomColor = (): string => {
      if (colors?.length) return colors[Math.floor(Math.random() * colors.length)]
      return `rgba(${Math.ceil(Math.random() * 255)}, ${Math.ceil(Math.random() * 255)}, ${Math.ceil(Math.random() * 255)}, ${opacity})`
    }

    const balls: Ball[] = Array.from({ length: numBalls }, () => ({
      fillColor: getRandomColor(),
      radius: Math.random() * (maxRadius - minRadius) + minRadius,
      scale: 1,
      vx: (Math.random() * 2 - 1) * speed,
      vy: (Math.random() * 2 - 1) * speed,
      x: Math.random() * width,
      y: Math.random() * height,
    }))

    const resize = () => {
      const rect = wrap.getBoundingClientRect()
      const nextWidth = Math.max(1, Math.floor(rect.width))
      const nextHeight = Math.max(1, Math.floor(rect.height))
      const widthRatio = nextWidth / width
      const heightRatio = nextHeight / height

      width = nextWidth
      height = nextHeight
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.floor(width * pixelRatio)
      canvas.height = Math.floor(height * pixelRatio)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      mouse.x = width / 2
      mouse.y = height / 2

      balls.forEach((ball) => {
        ball.x = Math.min(width - ball.radius, Math.max(ball.radius, ball.x * widthRatio))
        ball.y = Math.min(height - ball.radius, Math.max(ball.radius, ball.y * heightRatio))
      })
    }

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = event.clientX - rect.left
      mouse.y = event.clientY - rect.top
    }

    const updateBall = (ball: Ball) => {
      ball.vy += gravity
      ball.vx *= friction
      ball.vy *= friction
      ball.x += ball.vx
      ball.y += ball.vy

      if (ball.x + ball.radius > width) {
        ball.x = width - ball.radius
        ball.vx *= -bounceDamping
      } else if (ball.x - ball.radius < 0) {
        ball.x = ball.radius
        ball.vx *= -bounceDamping
      }

      if (ball.y + ball.radius > height) {
        ball.y = height - ball.radius
        ball.vy *= -bounceDamping
      } else if (ball.y - ball.radius < 0) {
        ball.y = ball.radius
        ball.vy *= -bounceDamping
      }

      if (followMouse) {
        ball.vx += (mouse.x - ball.x) * 0.0005
        ball.vy += (mouse.y - ball.y) * 0.0005
      }
    }

    const updateInteraction = (ball: Ball) => {
      if (!interactive) return
      const dx = mouse.x - ball.x
      const dy = mouse.y - ball.y
      const distance = Math.hypot(dx, dy)

      if (distance < interactionRadius) {
        ball.scale += (interactionScale - ball.scale) * 0.18
      } else if (distance < interactionRadius * 1.5) {
        ball.scale += (interactionScale * 0.6 - ball.scale) * 0.14
      } else {
        ball.scale += (1 - ball.scale) * 0.12
      }
    }

    const drawBall = (ball: Ball) => {
      ctx.save()
      ctx.translate(ball.x, ball.y)
      ctx.scale(ball.scale, ball.scale)
      ctx.fillStyle = ball.fillColor
      ctx.beginPath()
      ctx.arc(0, 0, ball.radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    const animate = (time: number) => {
      if (isVisible && document.visibilityState === 'visible' && time - lastFrame >= 33) {
        if (trailAlpha < 1) {
          ctx.fillStyle = backgroundColor === 'transparent' ? `rgba(255, 255, 255, ${1 - trailAlpha})` : backgroundColor
          ctx.fillRect(0, 0, width, height)
        } else {
          ctx.clearRect(0, 0, width, height)
        }

        balls.forEach((ball) => {
          updateInteraction(ball)
          updateBall(ball)
          drawBall(ball)
        })
        lastFrame = time
      }

      animationFrame = window.requestAnimationFrame(animate)
    }

    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize)
    const visibilityObserver =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([entry]) => {
            isVisible = entry.isIntersecting
          })

    if (interactive) canvas.addEventListener('mousemove', handleMouseMove)
    resizeObserver?.observe(wrap)
    visibilityObserver?.observe(wrap)
    if (!resizeObserver) window.addEventListener('resize', resize)
    resize()
    animationFrame = window.requestAnimationFrame(animate)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      if (interactive) canvas.removeEventListener('mousemove', handleMouseMove)
      resizeObserver?.disconnect()
      visibilityObserver?.disconnect()
      if (!resizeObserver) window.removeEventListener('resize', resize)
    }
  }, [
    backgroundColor,
    bounceDamping,
    colors,
    followMouse,
    friction,
    gravity,
    interactive,
    interactionRadius,
    interactionScale,
    maxRadius,
    minRadius,
    numBalls,
    opacity,
    speed,
    trailAlpha,
  ])

  return (
    <div ref={wrapRef} className={className}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" style={{ backgroundColor }} aria-hidden="true" />
    </div>
  )
}
