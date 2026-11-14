/// <reference lib="webworker" />
// Renders the cobe globe on an OffscreenCanvas inside a worker, so its frames
// go straight to the compositor and never repaint the page on the main thread.
import createGlobe, { type COBEOptions, type Globe } from 'cobe'

type GlobeWorkerMessage =
  | { type: 'init'; canvas: OffscreenCanvas; options: COBEOptions; minFrameMs: number }
  | { type: 'size'; width: number; height: number }
  | { type: 'run'; running: boolean }
  | { type: 'destroy' }

// cobe only touches the DOM for marker/arc labels (a <style> tag and anchor
// divs). There are no markers here, so a do-nothing stand-in is enough.
function installDocumentStub() {
  const scope = self as unknown as { document?: unknown }
  if (scope.document) return
  const element = () => ({ style: {}, textContent: '', append() {}, remove() {}, insertBefore() {} })
  scope.document = { createElement: element, head: element() }
}

// cobe loads its built-in world map with `new Image()`, which workers lack.
// Stand in an Image that decodes the same data URL with createImageBitmap, and
// let WebGL receive the decoded bitmap when cobe uploads the texture.
class WorkerImage {
  onload: (() => void) | null = null
  bitmap: ImageBitmap | null = null

  set src(url: string) {
    void fetch(url)
      .then((response) => response.blob())
      .then((blob) => createImageBitmap(blob))
      .then((bitmap) => {
        this.bitmap = bitmap
        this.onload?.()
      })
      .catch(() => undefined)
  }
}

function installImageStub() {
  const scope = self as unknown as { Image?: unknown }
  if (!scope.Image) scope.Image = WorkerImage

  const contexts = [self.WebGL2RenderingContext, self.WebGLRenderingContext].filter(Boolean)
  for (const context of contexts) {
    const prototype = context.prototype as unknown as { texImage2D: (...args: unknown[]) => void; __globePatched?: boolean }
    if (prototype.__globePatched) continue
    const original = prototype.texImage2D
    prototype.texImage2D = function (this: unknown, ...args: unknown[]) {
      const last = args[args.length - 1]
      if (last instanceof WorkerImage) {
        if (!last.bitmap) return
        args[args.length - 1] = last.bitmap
      }
      return original.apply(this, args)
    }
    prototype.__globePatched = true
  }
}

const frame: (callback: (now: number) => void) => number =
  typeof self.requestAnimationFrame === 'function'
    ? (callback) => self.requestAnimationFrame(callback)
    : (callback) => self.setTimeout(() => callback(performance.now()), 16) as unknown as number
const cancelFrame: (id: number) => void =
  typeof self.cancelAnimationFrame === 'function' ? (id) => self.cancelAnimationFrame(id) : (id) => self.clearTimeout(id)

let globe: Globe | null = null
let phi = 0
let minFrameMs = 0
let lastFrame = 0
let frameId = 0
let running = false

function tick(now: number) {
  if (!running || !globe) return
  frameId = frame(tick)
  const elapsed = lastFrame ? now - lastFrame : minFrameMs || 16.67
  if (elapsed < minFrameMs) return
  lastFrame = now
  phi += 0.0035 * Math.min(elapsed / 16.67, 4)
  globe.update({ phi })
}

function setRunning(next: boolean) {
  running = next
  cancelFrame(frameId)
  lastFrame = 0
  if (running && globe) frameId = frame(tick)
}

self.onmessage = (event: MessageEvent<GlobeWorkerMessage>) => {
  const message = event.data

  if (message.type === 'init') {
    installDocumentStub()
    installImageStub()
    minFrameMs = message.minFrameMs
    phi = message.options.phi
    globe = createGlobe(message.canvas as unknown as HTMLCanvasElement, message.options)
    self.postMessage({ type: 'ready' })
    setRunning(running)
  } else if (message.type === 'size') {
    globe?.update({ width: message.width, height: message.height })
  } else if (message.type === 'run') {
    setRunning(message.running)
  } else if (message.type === 'destroy') {
    setRunning(false)
    globe?.destroy()
    globe = null
    self.close()
  }
}
