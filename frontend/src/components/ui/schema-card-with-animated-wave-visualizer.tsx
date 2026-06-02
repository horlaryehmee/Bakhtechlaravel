import { useEffect, useRef } from 'react'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type SchemaCardProps = {
  label?: string
  title?: string
  description?: string
  href?: string
  status?: string
  className?: string
}

export default function SchemaCard({
  label = 'Portfolio',
  title = 'Web Systems That Convert',
  description = 'Explore websites, dashboards, booking systems, ecommerce stores, and web apps built to help businesses win customers.',
  href = '/portfolio',
  status = 'Live',
  className,
}: SchemaCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return undefined
    const activeCanvas = canvas
    const activeCtx = ctx

    let frame = 0
    let time = 0
    let animationId = 0
    const waveData = Array.from({ length: 8 }, () => ({
      value: Math.random() * 0.5 + 0.1,
      targetValue: Math.random() * 0.5 + 0.1,
      speed: Math.random() * 0.02 + 0.01,
    }))

    function resizeCanvas() {
      const rect = activeCanvas.getBoundingClientRect()
      const ratio = window.devicePixelRatio || 1
      activeCanvas.width = Math.max(1, Math.floor(rect.width * ratio))
      activeCanvas.height = Math.max(1, Math.floor(rect.height * ratio))
      activeCtx.setTransform(ratio, 0, 0, ratio, 0, 0)
    }

    function updateWaveData() {
      waveData.forEach((data) => {
        if (Math.random() < 0.01) data.targetValue = Math.random() * 0.7 + 0.1
        data.value += (data.targetValue - data.value) * data.speed
      })
    }

    function draw() {
      const width = activeCanvas.clientWidth
      const height = activeCanvas.clientHeight
      activeCtx.clearRect(0, 0, width, height)
      activeCtx.fillStyle = '#050816'
      activeCtx.fillRect(0, 0, width, height)

      waveData.forEach((data, index) => {
        const freq = data.value * 7
        activeCtx.beginPath()
        for (let x = 0; x < width; x += 1) {
          const nx = (x / width) * 2 - 1
          const px = nx + index * 0.04 + freq * 0.03
          const py = Math.sin(px * 10 + time) * Math.cos(px * 2) * freq * 0.1 * ((index + 1) / 8)
          const y = (py + 1) * height / 2
          if (x === 0) activeCtx.moveTo(x, y)
          else activeCtx.lineTo(x, y)
        }

        const intensity = Math.min(1, freq * 0.3)
        const r = 79 + intensity * 100
        const g = 70 + intensity * 130
        const b = 229
        activeCtx.lineWidth = 1 + index * 0.3
        activeCtx.strokeStyle = `rgba(${r},${g},${b},0.62)`
        activeCtx.shadowColor = `rgba(${r},${g},${b},0.55)`
        activeCtx.shadowBlur = 5
        activeCtx.stroke()
        activeCtx.shadowBlur = 0
      })
    }

    function animate() {
      frame += 1
      if (frame % 2 === 0) {
        time += 0.025
        updateWaveData()
        draw()
      }
      animationId = requestAnimationFrame(animate)
    }

    window.addEventListener('resize', resizeCanvas)
    resizeCanvas()
    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <div className={cn('relative overflow-hidden rounded-3xl bg-[#050816] text-white shadow-[0_30px_100px_rgba(15,23,42,0.26)]', className)}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(18,97,255,0.24),transparent_28%),linear-gradient(180deg,rgba(5,8,22,0.24),rgba(5,8,22,0.88))]" />

      <div className="relative z-10 grid min-h-[26rem] gap-8 p-5 md:grid-cols-[0.9fr_1.1fr] md:p-8 lg:p-10">
        <div className="flex items-center justify-center">
          <div className="schema-card-float w-full max-w-xs overflow-hidden rounded-2xl border border-white/15 bg-white/8 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl">
            <div className="p-4">
              <div className="schema-inner-glow relative h-48 overflow-hidden rounded-xl border border-indigo-300/30 bg-white/5">
                <div className="absolute inset-0 opacity-15 [background-image:linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:15px_15px]" />
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 190" fill="none">
                  <path className="schema-data-stream" d="M67 60 C102 26 155 29 190 70 S254 118 270 78" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="6 8" />
                  <path className="schema-data-stream schema-delay" d="M38 132 C92 90 128 118 167 95 S226 72 263 121" stroke="#12c8a0" strokeWidth="1.5" strokeDasharray="6 8" />
                  <rect x="34" y="42" width="86" height="56" rx="12" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.24)" />
                  <rect x="178" y="36" width="86" height="56" rx="12" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.24)" />
                  <rect x="100" y="112" width="100" height="52" rx="12" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.24)" />
                  <circle cx="62" cy="62" r="5" fill="#8b5cf6" />
                  <circle cx="206" cy="58" r="5" fill="#12c8a0" />
                  <circle cx="128" cy="132" r="5" fill="#ef4444" />
                  <path d="M54 78H101M198 74H245M121 148H179" stroke="rgba(255,255,255,0.48)" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>
            </div>
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <div className="p-4">
              <span className="mb-3 inline-block rounded-full border border-indigo-400/30 bg-white/10 px-3 py-1 text-xs font-bold text-indigo-200">{label}</span>
              <h3 className="mb-2 text-lg font-bold text-white">{title}</h3>
              <p className="mb-4 text-xs leading-relaxed text-white/70">{description}</p>
              <div className="flex items-center justify-between">
                <a href={href} className="inline-flex items-center rounded-lg border border-indigo-400/30 bg-white/10 px-3 py-1.5 text-xs font-bold text-indigo-200 transition hover:text-white">
                  View Work <ArrowRight className="ml-1 h-3 w-3" />
                </a>
                <span className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-xs text-white/60">{status}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <p className="mb-3 text-sm font-black uppercase tracking-[0.22em] text-[#67e8cf]">Portfolio</p>
          <h2 className="max-w-3xl text-balance text-3xl font-black tracking-tight md:text-5xl">
            Real projects, real systems, ready for real customers.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-white/72 md:text-lg">
            See how Bakhtech builds polished websites, ecommerce experiences, booking platforms, dashboards, portals, and custom web apps that make businesses easier to trust and easier to buy from.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            {['Websites', 'Web Apps', 'Dashboards', 'Bookings', 'Ecommerce', 'Portals'].map((item) => (
              <span key={item} className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-bold text-white/78">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
