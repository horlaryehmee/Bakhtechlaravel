import { useEffect, useRef } from 'react'

type TubesApp = {
  dispose?: () => void
  tubes?: {
    setColors: (colors: string[]) => void
    setLightsColors: (colors: string[]) => void
  }
}

const tubesModuleUrl = 'https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js'

// The main App component that encapsulates the animation
// In React, component names must start with a capital letter to be recognized as components.
// I've renamed the function from "component" to "TubesCursor".
export default function TubesCursor() {
  // useRef to get a persistent reference to the canvas element
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  // useRef to hold the animation instance so we can call its methods
  const appRef = useRef<TubesApp | null>(null)

  /**
   * Generates an array of random hex color strings.
   * @param count - The number of random colors to generate.
   * @returns An array of color strings.
   */
  const randomColors = (count: number) => {
    return new Array(count)
      .fill(0)
      .map(() => `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`)
  }

  // This effect runs once when the component mounts
  useEffect(() => {
    // The error "Computed radius is NaN" suggests a race condition where the animation
    // library initializes before the canvas element has its final dimensions, leading
    // to invalid geometry calculations. Delaying the initialization with setTimeout
    // ensures the DOM is fully painted and ready.
    const initTimer = window.setTimeout(() => {
      import(/* @vite-ignore */ tubesModuleUrl)
        .then((module: { default: (canvas: HTMLCanvasElement, options: unknown) => TubesApp }) => {
          const TubesCursorModule = module.default

          // Ensure the canvas element is still available before initializing
          if (canvasRef.current) {
            // Initialize the TubesCursor animation
            const app = TubesCursorModule(canvasRef.current, {
              tubes: {
                colors: ['#5e72e4', '#8965e0', '#f5365c'],
                lights: {
                  intensity: 200,
                  colors: ['#21d4fd', '#b721ff', '#f4d03f', '#11cdef'],
                },
              },
            })
            // Store the instance in our ref for later use
            appRef.current = app
          }
        })
        .catch((err: unknown) => console.error('Failed to load TubesCursor module:', err))
    }, 100) // 100ms delay to allow for DOM rendering

    // Cleanup function to dispose of the animation and clear the timeout
    return () => {
      window.clearTimeout(initTimer)
      // Check if app was initialized and has a dispose method before calling
      if (appRef.current && typeof appRef.current.dispose === 'function') {
        appRef.current.dispose()
      }
    }
  }, []) // The empty dependency array ensures this effect runs only once

  // Handles click events on the main container
  const handleClick = () => {
    if (appRef.current?.tubes) {
      const newTubeColors = randomColors(3)
      const newLightColors = randomColors(4)

      // Update the colors in the running animation
      appRef.current.tubes.setColors(newTubeColors)
      appRef.current.tubes.setLightsColors(newLightColors)
    }
  }

  return (
    // Main container with full-screen styles and click handler
    <div
      onClick={handleClick}
      className="h-screen w-full cursor-pointer overflow-hidden bg-black font-['Montserrat',_sans-serif]"
    >
      {/* Canvas element for the animation, positioned behind everything else */}
      <canvas ref={canvasRef} className="fixed inset-0 z-0" />

      {/* Hero content displayed over the canvas */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-2.5 px-4 text-center">
        {/* Using arbitrary values for text-shadow which doesn't have a default Tailwind utility */}
        <h1 className="m-0 select-none p-0 text-[clamp(3.75rem,12vw,8rem)] font-bold uppercase leading-none text-white [text-shadow:0_0_20px_rgba(0,0,0,1)]">
          Bakhtech
        </h1>
        <h2 className="m-0 select-none p-0 text-[clamp(2.25rem,8vw,5.5rem)] font-medium uppercase leading-none text-white [text-shadow:0_0_20px_rgba(0,0,0,1)]">
          Solutions
        </h2>
        <p className="m-0 select-none p-0 text-xl leading-none text-white [text-shadow:0_0_20px_rgba(0,0,0,1)]">
          Click to change colors
        </p>
      </div>
    </div>
  )
}
