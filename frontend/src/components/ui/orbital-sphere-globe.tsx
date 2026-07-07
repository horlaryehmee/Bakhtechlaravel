import type { CSSProperties } from 'react'

type OrbitalSphereGlobeProps = {
  className?: string
}

type SphereStyle = CSSProperties & {
  '--rot': number
}

type ItemStyle = CSSProperties & {
  '--rot-y': number
}

const sphereIndexes = Array.from({ length: 9 }, (_, index) => index)
const itemIndexes = Array.from({ length: 9 }, (_, index) => index + 1)

export function OrbitalSphereGlobe({ className = '' }: OrbitalSphereGlobeProps) {
  return (
    <div className={`orbital-sphere-globe ${className}`} aria-hidden="true">
      <div className="orbital-sphere-globe__loader">
        {sphereIndexes.map((sphereIndex) => (
          <div
            key={sphereIndex}
            className="orbital-sphere-globe__sphere"
            style={{ '--rot': sphereIndex } as SphereStyle}
          >
            {itemIndexes.map((itemIndex) => (
              <span
                key={itemIndex}
                className="orbital-sphere-globe__item"
                style={{ '--rot-y': itemIndex } as ItemStyle}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default OrbitalSphereGlobe
