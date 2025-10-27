import { getTablePolygon } from './physics/table'

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export function tableUV(
  width: number,
  height: number,
  trashLineY: number,
  launchLineY: number,
  px: number,
  py: number
) {
  const topY = trashLineY
  const bottomY = launchLineY
  const v = clamp((py - topY) / Math.max(1, (bottomY - topY)), 0, 1)
  const poly = getTablePolygon(width, height)
  const leftTopX = poly[0]!.x
  const rightTopX = poly[1]!.x
  const topWidth = Math.max(1, rightTopX - leftTopX)
  const denom = (1 - v) * topWidth + v * width
  const u = denom > 0 ? clamp((px - (1 - v) * leftTopX) / denom, 0, 1) : 0.5
  return { u, v }
}

export function connectDirForU(
  width: number,
  height: number,
  trashLineY: number,
  launchLineY: number,
  u: number
) {
  const topY = trashLineY
  const bottomY = launchLineY
  const poly = getTablePolygon(width, height)
  const leftTopX = poly[0]!.x
  const rightTopX = poly[1]!.x
  const topWidth = Math.max(1, rightTopX - leftTopX)
  const xTop = leftTopX + u * topWidth
  const xBottom = u * width
  const dx = xBottom - xTop
  const dy = bottomY - topY
  const len = Math.hypot(dx, dy)
  return len > 0 ? { x: dx / len, y: dy / len } : { x: 0, y: 1 }
}

export function bottomXForU(u: number, width: number) {
  return Math.round(u * width)
}

export function spawnXForMouse(
  width: number,
  height: number,
  launchLineY: number,
  mx: number,
  r: number
) {
  const { u } = tableUV(width, height, Math.round(height * 0.19), launchLineY, mx, launchLineY)
  const x = bottomXForU(u, width)
  return Math.min(width - r, Math.max(r, x))
}