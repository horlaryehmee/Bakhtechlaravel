import { useCallback, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

type Position = {
  x: number
  y: number
}

type Point = {
  position: Position
  time: number
  drift: Position
  age: number
  direction: Position
}

type SVGFollowerProps = {
  colors?: string[]
  removeDelay?: number
  className?: string
}

export function SVGFollower({
  colors = ['#ff6b6b', '#fff200', '#45b7d1', '#96ceb4', '#ffeaa7'],
  removeDelay = 400,
  className,
}: SVGFollowerProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const followersRef = useRef<Follower[]>([])
  const animationRef = useRef<number | null>(null)

  const animate = useCallback(() => {
    followersRef.current.forEach((follower) => follower.trim(removeDelay))
    animationRef.current = window.requestAnimationFrame(animate)
  }, [removeDelay])

  useEffect(() => {
    const stage = svgRef.current
    if (!stage) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduceMotion.matches) return

    followersRef.current = colors.map((color) => new Follower(stage, color))
    animationRef.current = window.requestAnimationFrame(animate)

    const addPoint = (position: Position) => {
      followersRef.current.forEach((follower) => follower.add(position))
    }

    const handlePointerMove = (event: PointerEvent) => {
      addPoint({ x: event.clientX, y: event.clientY })
    }

    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0]
      if (!touch) return
      addPoint({ x: touch.clientX, y: touch.clientY })
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('touchmove', handleTouchMove)
      if (animationRef.current !== null) window.cancelAnimationFrame(animationRef.current)
      followersRef.current.forEach((follower) => follower.destroy())
      followersRef.current = []
    }
  }, [animate, colors])

  return (
    <svg
      ref={svgRef}
      className={cn('pointer-events-none fixed inset-0 z-[90] h-screen w-screen overflow-hidden', className)}
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    />
  )
}

class Follower {
  private points: Point[] = []
  private line: SVGPathElement
  private stage: SVGSVGElement
  private color: string

  constructor(stage: SVGSVGElement, color: string) {
    this.stage = stage
    this.color = color
    this.line = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    this.line.style.fill = color
    this.line.style.stroke = color
    this.line.style.strokeWidth = '1'
    this.line.style.opacity = '0.82'
    this.stage.appendChild(this.line)
  }

  add(position: Position) {
    const direction = { x: 0, y: 0 }
    if (this.points[0]) {
      direction.x = (position.x - this.points[0].position.x) * 0.25
      direction.y = (position.y - this.points[0].position.y) * 0.25
    }

    const point: Point = {
      position,
      time: Date.now(),
      drift: {
        x: this.getDrift() + direction.x / 2,
        y: this.getDrift() + direction.y / 2,
      },
      age: 0,
      direction,
    }

    const shapeChance = Math.random()
    if (shapeChance < 0.08) this.makeCircle(point)
    else if (shapeChance < 0.16) this.makeSquare(point)
    else if (shapeChance < 0.24) this.makeTriangle(point)

    this.points.unshift(point)
  }

  trim(removeDelay: number) {
    if (this.points.length > 0) {
      const last = this.points[this.points.length - 1]
      if (last.time < Date.now() - removeDelay) {
        this.points.pop()
      }
    }

    this.line.setAttribute('d', this.createLine(this.points))
  }

  destroy() {
    this.points = []
    if (this.stage.contains(this.line)) {
      this.stage.removeChild(this.line)
    }
  }

  private getDrift() {
    return (Math.random() - 0.5) * 3
  }

  private createLine(points: Point[]) {
    const path: string[] = [points.length ? 'M' : '']
    if (points.length === 0) return ''

    let forward = true
    let index = 0

    while (index >= 0) {
      const point = points[index]
      const offsetX = point.direction.x * ((index - points.length) / points.length) * 0.6
      const offsetY = point.direction.y * ((index - points.length) / points.length) * 0.6
      const x = point.position.x + (forward ? offsetY : -offsetY)
      const y = point.position.y + (forward ? offsetX : -offsetX)
      point.age += 0.2

      path.push(String(x + point.drift.x * point.age))
      path.push(String(y + point.drift.y * point.age))

      index += forward ? 1 : -1
      if (index === points.length) {
        index -= 1
        forward = false
      }
    }

    return path.join(' ')
  }

  private makeCircle(point: Point) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    const radius = Math.max(3, (Math.abs(point.direction.x) + Math.abs(point.direction.y)) * 0.8)
    circle.setAttribute('r', String(radius))
    circle.style.fill = this.color
    this.moveShape(circle, point)
  }

  private makeSquare(point: Point) {
    const size = Math.max(4, (Math.abs(point.direction.x) + Math.abs(point.direction.y)) * 1.2)
    const square = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    square.setAttribute('width', String(size))
    square.setAttribute('height', String(size))
    square.style.fill = this.color
    this.moveShape(square, point)
  }

  private makeTriangle(point: Point) {
    const size = Math.max(5, (Math.abs(point.direction.x) + Math.abs(point.direction.y)) * 1.2)
    const triangle = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
    triangle.setAttribute('points', `0,0 ${size},${size / 2} 0,${size}`)
    triangle.style.fill = this.color
    this.moveShape(triangle, point)
  }

  private moveShape(shape: SVGElement, point: Point) {
    this.stage.appendChild(shape)
    const driftX = point.position.x + point.direction.x * (Math.random() * 20) + point.drift.x * (Math.random() * 10)
    const driftY = point.position.y + point.direction.y * (Math.random() * 20) + point.drift.y * (Math.random() * 10)

    shape.style.opacity = '0.78'
    shape.style.transform = `translate(${point.position.x}px, ${point.position.y}px)`
    shape.style.transformOrigin = 'center'
    shape.style.transition = 'transform 0.5s ease-out, opacity 0.5s ease-out'

    window.setTimeout(() => {
      shape.style.opacity = '0'
      shape.style.transform = `translate(${driftX}px, ${driftY}px) scale(0) rotate(${Math.random() * 360}deg)`
      window.setTimeout(() => {
        if (this.stage.contains(shape)) {
          this.stage.removeChild(shape)
        }
      }, 500)
    }, 10)
  }
}
