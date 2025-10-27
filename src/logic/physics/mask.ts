import type { Vector } from 'matter-js'
import { Bodies } from 'matter-js'

// Cache hull vertices by image URL + radius key
const hullCache: Record<string, Vector[]> = {}

function key(imageUrl: string, radius: number): string {
  return `${imageUrl}::r${radius}`
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

function drawToCanvas(img: HTMLImageElement, diameter: number): { canvas: HTMLCanvasElement; scale: number; offsetX: number; offsetY: number } {
  const canvas = document.createElement('canvas')
  canvas.width = diameter
  canvas.height = diameter
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, diameter, diameter)
  const sx = diameter / img.width
  const sy = diameter / img.height
  const s = Math.min(sx, sy)
  const dw = img.width * s
  const dh = img.height * s
  const dx = (diameter - dw) / 2
  const dy = (diameter - dh) / 2
  ctx.drawImage(img, dx, dy, dw, dh)
  return { canvas, scale: s, offsetX: dx, offsetY: dy }
}

function sampleAlphaPoints(canvas: HTMLCanvasElement, threshold = 8, stride = 2): Vector[] {
  const w = canvas.width
  const h = canvas.height
  const ctx = canvas.getContext('2d')!
  const data = ctx.getImageData(0, 0, w, h).data
  const pts: Vector[] = []
  for (let y = 0; y < h; y += stride) {
    for (let x = 0; x < w; x += stride) {
      const idx = (y * w + x) * 4
      const a: number = data[idx + 3] ?? 0
       if (a > threshold) {
         pts.push({ x, y })
       }
    }
  }
  return pts
}

// Monotone chain convex hull
function convexHull(points: Vector[]): Vector[] {
  if (points.length <= 3) return points.slice()
  const pts = points.slice().sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x))
  const cross = (o: Vector, a: Vector, b: Vector) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  const lower: Vector[] = []
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) lower.pop()
    lower.push(p)
  }
  const upper: Vector[] = []
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]!
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) upper.pop()
    upper.push(p)
  }
  upper.pop()
  lower.pop()
  const hull = lower.concat(upper)
  // Downsample to at most 64 vertices to keep physics efficient
  const maxVerts = 64
  const step = Math.max(1, Math.floor(hull.length / maxVerts))
  const reduced: Vector[] = []
  for (let i = 0; i < hull.length; i += step) reduced.push(hull[i]!)
  return reduced
}

export async function precomputeLevelHulls(specs: { image: string; radius: number }[]): Promise<void> {
  const jobs = specs.map(async (s) => {
    const k = key(s.image, s.radius)
    if (hullCache[k]) return
    try {
      const img = await loadImage(s.image)
      const diameter = Math.max(8, Math.round(s.radius * 2))
      const { canvas } = drawToCanvas(img, diameter)
      const pts = sampleAlphaPoints(canvas, 8, 2)
      if (pts.length < 12) return // fallback will be used
      const hull = convexHull(pts)
      // Convert from canvas pixel space to local body vertex space (centered at 0,0)
      const cx = diameter / 2
      const cy = diameter / 2
      const verts = hull.map((p) => ({ x: p.x - cx, y: p.y - cy }))
      hullCache[k] = verts
    } catch (e) {
      // ignore errors; fallback to circle
      console.warn('Hull precompute failed for', s.image, e)
    }
  })
  await Promise.allSettled(jobs)
}

export function getCachedHull(imageUrl: string, radius: number): Vector[] | null {
  const k = key(imageUrl, radius)
  return hullCache[k] || null
}

// Helper to build a body synchronously from cached hull, else fallback circle
export function buildBodyFromCachedHull(x: number, y: number, imageUrl: string, radius: number, options: any) {
  const verts = getCachedHull(imageUrl, radius)
  if (verts && verts.length >= 3) {
    const raw = Bodies.fromVertices(x, y, verts as any, options, true) as any
    const body = Array.isArray(raw) ? raw[0] : raw
    return body
  }
  return Bodies.circle(x, y, radius, options)
}