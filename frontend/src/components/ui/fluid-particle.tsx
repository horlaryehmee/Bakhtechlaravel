"use client"

import { useEffect, useRef } from 'react'

type FluidParticlesProps = {
  particleDensity?: number
  particleSize?: number
  particleColor?: string
  activeColor?: string
  maxBlastRadius?: number
  hoverDelay?: number
  interactionDistance?: number
  className?: string
}

type MouseState = {
  x: number
  y: number
  prevX: number
  prevY: number
}

type BlastState = {
  active: boolean
  x: number
  y: number
  radius: number
  maxRadius: number
}

const easeOutQuad = (value: number) => value * (2 - value)

export function FluidParticles({
  particleDensity = 100,
  particleSize = 1,
  particleColor = '#555555',
  activeColor = '#ffffff',
  maxBlastRadius = 300,
  hoverDelay = 100,
  interactionDistance = 10,
  className,
}: FluidParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const mouseRef = useRef<MouseState>({ x: -9999, y: -9999, prevX: -9999, prevY: -9999 })
  const blastRef = useRef<BlastState>({ active: false, x: 0, y: 0, radius: 0, maxRadius: maxBlastRadius })
  const animationRef = useRef<number>(0)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  class Particle {
    x: number
    y: number
    size: number
    baseX: number
    baseY: number
    density: number
    color: string
    vx: number
    vy: number
    friction: number

    constructor(x: number, y: number) {
      this.x = x
      this.y = y
      this.baseX = x
      this.baseY = y
      this.size = Math.random() * particleSize + 0.5
      this.density = Math.random() * 3 + 1
      this.color = particleColor
      this.vx = 0
      this.vy = 0
      this.friction = 0.9 - 0.01 * this.density
    }

    draw() {
      const context = contextRef.current
      if (!context) return

      context.fillStyle = this.color
      context.beginPath()
      context.arc(this.x, this.y, this.size, 0, Math.PI * 2)
      context.closePath()
      context.fill()
    }

    update() {
      this.x += this.vx
      this.y += this.vy
      this.vx *= this.friction
      this.vy *= this.friction

      const dx = mouseRef.current.x - this.x
      const dy = mouseRef.current.y - this.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance > 0 && distance < interactionDistance) {
        const forceDirectionX = dx / distance
        const forceDirectionY = dy / distance
        const force = (interactionDistance - distance) / interactionDistance

        this.x -= forceDirectionX * force * this.density * 0.6
        this.y -= forceDirectionY * force * this.density * 0.6
        this.color = activeColor
      } else {
        this.x -= (this.x - this.baseX) / 20
        this.y -= (this.y - this.baseY) / 20
        this.color = particleColor
      }

      if (blastRef.current.active) {
        const blastDx = this.x - blastRef.current.x
        const blastDy = this.y - blastRef.current.y
        const blastDistance = Math.sqrt(blastDx * blastDx + blastDy * blastDy)

        if (blastDistance < blastRef.current.radius) {
          const blastForceX = blastDx / (blastDistance || 1)
          const blastForceY = blastDy / (blastDistance || 1)
          const blastForce = (blastRef.current.radius - blastDistance) / blastRef.current.radius

          this.vx += blastForceX * blastForce * 15
          this.vy += blastForceY * blastForce * 15

          const intensity = Math.min(255, Math.floor(255 - blastDistance))
          this.color = `rgba(${intensity}, 100, 255, 0.8)`
        }
      }

      this.draw()
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const context = canvas.getContext('2d', { alpha: true })
    if (!context) return undefined

    contextRef.current = context
    context.globalCompositeOperation = 'lighter'
    blastRef.current.maxRadius = maxBlastRadius

    const initParticles = () => {
      particlesRef.current = []
      const densityMultiplier = window.innerWidth < 768 ? 1.8 : 1
      const particleCount = Math.floor((window.innerWidth * window.innerHeight) / (particleDensity * densityMultiplier))

      for (let index = 0; index < particleCount; index += 1) {
        particlesRef.current.push(new Particle(Math.random() * window.innerWidth, Math.random() * window.innerHeight))
      }
    }

    const handleResize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.25 : 1.75)
      canvas.width = window.innerWidth * pixelRatio
      canvas.height = window.innerHeight * pixelRatio
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      context.globalCompositeOperation = 'lighter'
      initParticles()
    }

    const triggerBlast = (x: number, y: number) => {
      blastRef.current = { active: true, x, y, radius: 0, maxRadius: maxBlastRadius }

      const startTime = performance.now()
      const duration = 300

      const expandBlast = (timestamp: number) => {
        const elapsed = timestamp - startTime
        const progress = Math.min(elapsed / duration, 1)
        blastRef.current.radius = easeOutQuad(progress) * blastRef.current.maxRadius

        if (progress < 1) {
          requestAnimationFrame(expandBlast)
        } else {
          window.setTimeout(() => {
            blastRef.current.active = false
          }, 100)
        }
      }

      requestAnimationFrame(expandBlast)

      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current)
        hoverTimerRef.current = null
      }
    }

    let lastMoveTime = 0

    const handleMouseMove = (event: MouseEvent) => {
      const now = performance.now()
      if (now - lastMoveTime < 10) return
      lastMoveTime = now

      const prevX = mouseRef.current.x
      const prevY = mouseRef.current.y
      mouseRef.current = { x: event.clientX, y: event.clientY, prevX, prevY }

      const dx = mouseRef.current.x - mouseRef.current.prevX
      const dy = mouseRef.current.y - mouseRef.current.prevY
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < 5) {
        hoverTimerRef.current ??= window.setTimeout(() => triggerBlast(event.clientX, event.clientY), hoverDelay)
      } else if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current)
        hoverTimerRef.current = null
      }
    }

    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0]
      if (!touch) return

      const prevX = mouseRef.current.x
      const prevY = mouseRef.current.y
      mouseRef.current = { x: touch.clientX, y: touch.clientY, prevX, prevY }
    }

    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0]
      if (!touch) return

      hoverTimerRef.current = window.setTimeout(() => triggerBlast(touch.clientX, touch.clientY), hoverDelay)
    }

    const clearHoverTimer = () => {
      if (!hoverTimerRef.current) return
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }

    const handleClick = (event: MouseEvent) => triggerBlast(event.clientX, event.clientY)

    const animate = () => {
      if (document.visibilityState === 'hidden') {
        animationRef.current = requestAnimationFrame(animate)
        return
      }

      context.clearRect(0, 0, window.innerWidth, window.innerHeight)
      particlesRef.current.forEach((particle) => particle.update())
      animationRef.current = requestAnimationFrame(animate)
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchend', clearHoverTimer)
    window.addEventListener('click', handleClick)

    handleResize()
    animate()

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', clearHoverTimer)
      window.removeEventListener('click', handleClick)
      clearHoverTimer()
      cancelAnimationFrame(animationRef.current)
    }
  }, [activeColor, hoverDelay, interactionDistance, maxBlastRadius, particleColor, particleDensity, particleSize])

  return <canvas ref={canvasRef} className={className ?? 'absolute inset-0'} />
}
