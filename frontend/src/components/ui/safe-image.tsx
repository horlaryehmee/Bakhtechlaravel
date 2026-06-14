import { useEffect, useMemo, useState, type ImgHTMLAttributes } from 'react'

type SafeImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src?: string
  fallbackSrc?: string
}

function normalizeImageSrc(src: string) {
  const value = src.trim()
  if (!value) return ''
  return /^https?:\/\//i.test(value) || value.startsWith('/') || value.startsWith('data:') ? value : `https://${value}`
}

export function SafeImage({ src, fallbackSrc = '/showcase/showcase-01.jpg', alt, onError, ...props }: SafeImageProps) {
  const candidates = useMemo(() => {
    const normalized = normalizeImageSrc(src || '')
    const encoded = normalized ? encodeURI(normalized) : ''
    return Array.from(new Set([normalized, encoded, fallbackSrc].filter(Boolean)))
  }, [fallbackSrc, src])
  const [candidateIndex, setCandidateIndex] = useState(0)

  useEffect(() => {
    setCandidateIndex(0)
  }, [src, fallbackSrc])

  return (
    <img
      {...props}
      src={candidates[candidateIndex] || fallbackSrc}
      alt={alt}
      onError={(event) => {
        if (candidateIndex < candidates.length - 1) {
          setCandidateIndex((index) => index + 1)
          return
        }
        onError?.(event)
      }}
    />
  )
}
