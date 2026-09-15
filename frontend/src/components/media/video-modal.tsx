import { useEffect, useRef, useState } from 'react'
import { LoaderCircle, X } from 'lucide-react'
import { getYoutubeEmbedUrl, type ProjectVideoMedia } from '@/lib/project-media'

export function VideoModal({ media, onClose }: { media: ProjectVideoMedia; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const youtubeEmbedUrl = media.type === 'youtube' ? getYoutubeEmbedUrl(media.url) : undefined

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => {
    if (!videoRef.current) return
    videoRef.current.load()
    void videoRef.current.play().catch(() => undefined)
  }, [media.url])

  const playWhenReady = () => {
    setReady(true)
    if (videoRef.current?.paused) void videoRef.current.play().catch(() => undefined)
  }

  return (
    <div className="fixed inset-0 z-[160] grid place-items-center bg-black/78 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={media.title} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-white/14 bg-[#050816] shadow-[0_30px_100px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
          <h3 className="truncate text-sm font-bold text-white">{media.title}</h3>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/8 text-white transition hover:bg-white/14" aria-label="Close video">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="relative aspect-video bg-black">
          {!ready && !failed ? <div className="absolute inset-0 z-10 grid place-items-center bg-black text-white" aria-label="Loading video"><LoaderCircle className="h-8 w-8 animate-spin" /></div> : null}
          {failed ? <div className="absolute inset-0 z-10 grid place-items-center bg-black px-6 text-center text-sm text-white">This video format could not be played by your browser.</div> : null}
          {youtubeEmbedUrl ? (
            <iframe className="h-full w-full" src={youtubeEmbedUrl} title={media.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen loading="eager" onLoad={() => setReady(true)} />
          ) : (
            <video ref={videoRef} className="h-full w-full" src={media.url} controls autoPlay playsInline preload="auto" onCanPlay={playWhenReady} onPlaying={() => setReady(true)} onError={() => setFailed(true)} />
          )}
        </div>
      </div>
    </div>
  )
}
