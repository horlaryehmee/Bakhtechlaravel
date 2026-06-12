import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface Character {
  char: string
  x: number
  y: number
  speed: number
}

class TextScramble {
  el: HTMLElement
  chars: string
  queue: Array<{
    from: string
    to: string
    start: number
    end: number
    char?: string
  }>
  frame: number
  frameRequest: number
  resolve: (value: void | PromiseLike<void>) => void

  constructor(el: HTMLElement) {
    this.el = el
    this.chars = '!<>-_\\/[]{}-=+*^?#'
    this.queue = []
    this.frame = 0
    this.frameRequest = 0
    this.resolve = () => {}
    this.update = this.update.bind(this)
  }

  setText(newText: string) {
    const oldText = this.el.innerText
    const length = Math.max(oldText.length, newText.length)
    const promise = new Promise<void>((resolve) => {
      this.resolve = resolve
    })
    this.queue = []

    for (let i = 0; i < length; i++) {
      const from = oldText[i] || ''
      const to = newText[i] || ''
      const start = Math.floor(Math.random() * 40)
      const end = start + Math.floor(Math.random() * 40)
      this.queue.push({ from, to, start, end })
    }

    cancelAnimationFrame(this.frameRequest)
    this.frame = 0
    this.update()
    return promise
  }

  update() {
    let output = ''
    let complete = 0

    for (let i = 0, n = this.queue.length; i < n; i++) {
      const queueItem = this.queue[i]
      const { from, to, start, end } = queueItem
      let { char } = queueItem

      if (this.frame >= end) {
        complete++
        output += to
      } else if (this.frame >= start) {
        if (!char || Math.random() < 0.28) {
          char = this.chars[Math.floor(Math.random() * this.chars.length)]
          queueItem.char = char
        }
        output += `<span class="dud">${char}</span>`
      } else {
        output += from
      }
    }

    this.el.innerHTML = output
    if (complete === this.queue.length) {
      this.resolve()
    } else {
      this.frameRequest = requestAnimationFrame(this.update)
      this.frame++
    }
  }
}

export const ScrambledTitle: React.FC<{ phrases?: string[]; className?: string }> = ({
  phrases = ['LARAVEL CMS', 'REACT FRONTENDS', 'ADVANCED SEO', 'SECURE BUILDS', 'FAST WEBSITES'],
  className,
}) => {
  const elementRef = useRef<HTMLHeadingElement>(null)
  const scramblerRef = useRef<TextScramble | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (elementRef.current && !scramblerRef.current) {
      scramblerRef.current = new TextScramble(elementRef.current)
      setMounted(true)
    }

    return () => {
      if (scramblerRef.current) {
        cancelAnimationFrame(scramblerRef.current.frameRequest)
      }
    }
  }, [])

  useEffect(() => {
    if (!mounted || !scramblerRef.current) return

    let counter = 0
    let timeoutId: number
    let cancelled = false

    const next = () => {
      if (!scramblerRef.current || cancelled) return

      scramblerRef.current.setText(phrases[counter]).then(() => {
        timeoutId = window.setTimeout(next, 1800)
      })
      counter = (counter + 1) % phrases.length
    }

    next()

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [mounted, phrases])

  return (
    <h1 ref={elementRef} className={cn('text-center font-mono text-5xl font-bold tracking-wider text-white', className)}>
      RAINING LETTERS
    </h1>
  )
}

export const RainingLettersBackground: React.FC<{ className?: string; density?: number; mode?: 'light' | 'dark' }> = ({
  className,
  density = 180,
  mode = 'dark',
}) => {
  const createCharacters = useCallback(() => {
    const allChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?'
    const newCharacters: Character[] = []

    for (let i = 0; i < density; i++) {
      newCharacters.push({
        char: allChars[Math.floor(Math.random() * allChars.length)],
        x: Math.random() * 100,
        y: Math.random() * 100,
      speed: 0.045 + Math.random() * 0.12,
      })
    }

    return newCharacters
  }, [density])
  const [characters, setCharacters] = useState<Character[]>(createCharacters)
  const [activeIndices, setActiveIndices] = useState<Set<number>>(new Set())

  useEffect(() => {
    const flickerInterval = window.setInterval(() => {
      setActiveIndices(() => {
        const newActiveIndices = new Set<number>()
        const numActive = Math.floor(Math.random() * 3) + 3

        for (let i = 0; i < numActive; i++) {
          newActiveIndices.add(Math.floor(Math.random() * characters.length))
        }

        return newActiveIndices
      })
    }, 180)

    return () => window.clearInterval(flickerInterval)
  }, [characters.length])

  useEffect(() => {
    let animationFrameId: number
    const allChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?'

    const updatePositions = () => {
      setCharacters((prevChars) =>
        prevChars.map((character) => ({
          ...character,
          y: character.y + character.speed,
          ...(character.y >= 105 && {
            y: -5,
            x: Math.random() * 100,
            char: allChars[Math.floor(Math.random() * allChars.length)],
          }),
        })),
      )
      animationFrameId = requestAnimationFrame(updatePositions)
    }

    animationFrameId = requestAnimationFrame(updatePositions)
    return () => cancelAnimationFrame(animationFrameId)
  }, [])

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        mode === 'dark' ? 'bg-black' : 'bg-[#f7fbff]',
        className,
      )}
      aria-hidden="true"
    >
      {characters.map((character, index) => {
        const active = activeIndices.has(index)
        const activeColor = mode === 'dark' ? '#00ff66' : '#1261ff'
        const inactiveColor = mode === 'dark' ? '#64748b' : '#4d6b9d'

        return (
          <span
            key={index}
            className={cn(
              'absolute font-mono transition-colors duration-100',
              active ? 'z-10 animate-pulse font-bold' : 'font-light',
            )}
            style={{
              left: `${character.x}%`,
              top: `${character.y}%`,
              color: active ? activeColor : inactiveColor,
              transform: `translate(-50%, -50%) ${active ? 'scale(1.22)' : 'scale(1)'}`,
              textShadow:
                active && mode === 'dark'
            ? '0 0 6px rgba(0,255,102,0.5), 0 0 12px rgba(0,255,102,0.24)'
                  : active
                    ? '0 0 8px rgba(18,97,255,0.2)'
                    : 'none',
              opacity: active ? (mode === 'dark' ? 0.62 : 0.5) : mode === 'dark' ? 0.28 : 0.24,
              transition: 'color 0.1s, transform 0.1s, text-shadow 0.1s',
              willChange: 'transform, top',
              fontSize: active ? '1.12rem' : '0.94rem',
            }}
          >
            {character.char}
          </span>
        )
      })}
      <style>{`
        .dud {
          color: #00ff66;
          opacity: 0.7;
        }
      `}</style>
    </div>
  )
}

export default function RainingLetters() {
  return (
    <div className="relative h-screen w-full overflow-hidden bg-black">
      <RainingLettersBackground />
      <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
        <ScrambledTitle />
      </div>
    </div>
  )
}
