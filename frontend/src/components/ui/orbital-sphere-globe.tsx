type OrbitalSphereGlobeProps = {
  className?: string
}

const stars = [
  'star-1',
  'star-2',
  'star-3',
  'star-4',
  'star-5',
  'star-6',
  'star-7',
]

function CurvedCornerStar({ className }: { className: string }) {
  return (
    <div className={`earth-banner-globe__star ${className}`}>
      <span className="earth-banner-globe__corner earth-banner-globe__corner--top-left" />
      <span className="earth-banner-globe__corner earth-banner-globe__corner--top-right" />
      <span className="earth-banner-globe__corner earth-banner-globe__corner--bottom-left" />
      <span className="earth-banner-globe__corner earth-banner-globe__corner--bottom-right" />
    </div>
  )
}

export function OrbitalSphereGlobe({ className = '' }: OrbitalSphereGlobeProps) {
  return (
    <div className={`earth-banner-globe ${className}`} aria-hidden="true">
      {stars.map((star) => <CurvedCornerStar key={star} className={star} />)}
      <div className="earth-banner-globe__planet" />
      <div className="earth-banner-globe__shade" />
    </div>
  )
}

export default OrbitalSphereGlobe
