import { Bodies, Composite, Body, Engine, Render } from 'matter-js'

export interface Walls { left: Body; right: Body; bottom: Body }

/**
 * 重建墙体：根据舞台尺寸移除旧墙体并创建新墙体（左/右/下）。
 * 顶部留空用于垃圾桶与掉落。
 */
export function rebuildWalls(
  engine: Engine,
  width: number,
  height: number,
  prev?: Partial<Walls>,
  thickness = 40,
  fillStyle = '#444'
): Walls {
  const wallOpts = { isStatic: true, render: { fillStyle } }
  // 移除旧墙体（如存在）
  if (prev?.left) Composite.remove(engine.world, prev.left)
  if (prev?.right) Composite.remove(engine.world, prev.right)
  if (prev?.bottom) Composite.remove(engine.world, prev.bottom)

  const left = Bodies.rectangle(-thickness / 2, height / 2, thickness, height, wallOpts)
  const right = Bodies.rectangle(width + thickness / 2, height / 2, thickness, height, wallOpts)
  const bottom = Bodies.rectangle(width / 2, height + thickness / 2, width, thickness, wallOpts)
  Composite.add(engine.world, [left, right, bottom])
  return { left, right, bottom }
}

/**
 * 同步 Canvas 与 Render 的尺寸，并设置像素比避免高分屏模糊。
 */
export function setCanvasAndRenderSize(render: Render, canvas: HTMLCanvasElement, width: number, height: number) {
  canvas.width = width
  canvas.height = height
  canvas.style.width = width + 'px'
  canvas.style.height = height + 'px'

  render.options.width = width
  render.options.height = height
  Render.setPixelRatio(render, (window as any).devicePixelRatio || 1)
}