import { Bodies, Composite, Body, Engine } from 'matter-js'

export type Vec = { x: number; y: number }

/**
 * 计算桌面在屏幕坐标下的四边形（按坐姿视角近大远小的透视）
 * 顶点顺序：左上、右上、右下、左下（顺时针）
 * 可根据真实素材微调下面的比例参数。
 */
export function getTablePolygon(width: number, height: number): Vec[] {
  // 上下 19% 为垃圾区与发射区，桌面有效区介于其间
  const topY = Math.round(height * 0.19)
  const bottomY = Math.round(height * 0.81)
  // 墙体点位：
  // 左上：距左侧 20%，距上方 19%
  const leftTopX = Math.round(width * 0.20)
  // 右上：距右侧 20%（即 x=0.80w），距上方 19%
  const rightTopX = Math.round(width * 0.80)
  // 左下：x=0，距下方 19%（即 y=0.81h）
  const leftBottomX = 0
  // 右下：x=width，距下方 19%
  const rightBottomX = width
  return [
    { x: leftTopX, y: topY },
    { x: rightTopX, y: topY },
    { x: rightBottomX, y: bottomY },
    { x: leftBottomX, y: bottomY }
  ]
}

/**
 * 根据四边形构建静态斜边墙体，替换原有左右/底墙。
 * 厚度用于提高碰撞稳定性（像素单位）。
 */
export function rebuildTableWalls(
  engine: Engine,
  polygon: Vec[],
  prevEdges: Body[] = [],
  thickness = 40,
  fillStyle = '#444',
  includeTop = true
): Body[] {
  const wallOpts = { isStatic: true, render: { fillStyle, visible: false } }
  // 移除旧墙体
  for (const w of prevEdges) {
    Composite.remove(engine.world, w)
  }
  const edges: Body[] = []
  const n = polygon.length
  for (let i = 0; i < n; i++) {
    // i=0 是上边（左上->右上），根据需要可跳过构建
    if (!includeTop && i === 0) continue
    const a = polygon[i]!
    const b = polygon[(i + 1) % n]!
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy)
    const angle = Math.atan2(dy, dx)
    const cx = (a.x + b.x) / 2
    const cy = (a.y + b.y) / 2
    const wall = Bodies.rectangle(cx, cy, len, thickness, wallOpts)
    Body.rotate(wall, angle)
    ;(wall as any).label = 'wall'
    edges.push(wall)
  }
  Composite.add(engine.world, edges)
  return edges
}