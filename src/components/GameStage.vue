<template>
  <div ref="stageRef" class="stage">
     <canvas ref="canvasRef" class="stage-canvas"></canvas>  
     <img :src="tableImage" alt="table" class="table-bg" />
    <!-- 交互与视觉指示层（覆盖在 matter 渲染 canvas 上方） -->
    <div class="overlay">
      <div v-if="game.over" class="game-over">
        <div class="go-card" :class="game.win ? 'success' : 'fail'">
          <div class="cat-face">{{ goPhrase }}</div>
          <h2 class="go-title">{{ game.win ? '亲密度满喵！' : '这局没撑住喵～' }}</h2>
          <p v-if="game.win" class="go-desc">总用时：{{ formatElapsed(game.endedAtMs && game.startedAtMs ? game.endedAtMs - game.startedAtMs : 0) }}</p>
          <p v-else class="go-desc">提示：同款撞一撞→升级更高级；别让甜点掉下桌！</p>
          <div class="pk">📸 截图分享，和好友PK！</div>
          <div class="cta"><button class="go-restart" @click="handleRestart">再来一局喵！</button></div>
        </div>
      </div>
      <div class="zones-layer">
        <div class="zone zone-trash" :style="{ height: state.trashLineY + 'px' }"></div>
        <div class="zone zone-collision" :style="{ top: state.trashLineY + 'px', height: (state.launchLineY - state.trashLineY) + 'px' }"></div>
        <div class="zone zone-launch" :style="{ top: state.launchLineY + 'px', height: (state.height - state.launchLineY) + 'px' }"></div>
      </div>
      <!-- 倍率半圆区域：x2 外圈、x3 内圈 -->
      <div class="multiplier-layer">
        <div class="mult semi mult2" :style="{ 
          width: (state.mult2R * 2) + 'px', 
          height: state.mult2R + 'px',
          left: (state.multCx - state.mult2R) + 'px',
          top: state.trashLineY + 'px'
        }"></div>
        <div class="mult semi mult3" :style="{ 
          width: (state.mult3R * 2) + 'px', 
          height: state.mult3R + 'px',
          left: (state.multCx - state.mult3R) + 'px',
          top: state.trashLineY + 'px'
        }"></div>
        <div class="mult-label mult2-label" :style="{ 
          left: (state.multCx) + 'px',
          top: (state.trashLineY + state.mult3R + (state.mult2R - state.mult3R) * 0.5) + 'px'
        }">x2</div>
        <div class="mult-label mult3-label" :style="{ 
          left: (state.multCx) + 'px',
          top: (state.trashLineY + state.mult3R * 0.42) + 'px'
        }">x3</div>
      </div>
      <div class="trash-line" v-if="false" :style="{ top: state.trashLineY + 'px' }"></div>
      <div class="launch-line" v-if="false" :style="{ top: state.launchLineY + 'px' }"></div>
      <div v-if="next" class="ready-layer">
        <div v-if="next" class="ready-drink" :style="{
          transform: 'translate(' + state.readyX + 'px,' + (state.launchLineY - 12) + 'px)',
          width: (next.radius * 2) + 'px',
          height: (next.radius * 2) + 'px',
          marginLeft: (-next.radius) + 'px',
          marginTop: (-next.radius) + 'px'
        }">
          <img :src="next.image" alt="" class="sprite ready-sprite" />
        </div>
      </div>
      <div class="drinks-layer">
        <div v-for="d in drinks" :key="d.id" class="drink"
          :class="(game.over && !game.win) ? failClassFor(d.id) : ''"
          :style="{
            transform: 'translate(' + d.x + 'px,' + d.y + 'px) rotate(' + d.angle + 'rad)',
            width: (d.radius * 2) + 'px',
            height: (d.radius * 2) + 'px',
            marginLeft: (-d.radius) + 'px',
            marginTop: (-d.radius) + 'px'
          }">
          <img :src="d.image" alt="" class="sprite" />
        </div>
      </div>
      <div class="drops-layer">
        <div v-for="d in drops" :key="'drop-'+d.id" class="drop" :class="d.effect === 'consume' ? 'consume' : ''" :style="{ transform: 'translate(' + d.x + 'px,' + d.y + 'px) rotate(' + d.angle + 'rad)' }">
          <div class="drop-content" :style="{
            width: (d.radius * 2) + 'px',
            height: (d.radius * 2) + 'px',
            marginLeft: (-d.radius) + 'px',
            marginTop: (-d.radius) + 'px'
          }">
            <img :src="d.image" alt="" class="sprite" />
          </div>
        </div>
      </div>
      <div v-if="state.dragging" class="indicator-dots">
        <div v-for="(p, idx) in state.indicatorDots" :key="'dot-'+idx" class="indicator-dot" :style="{ left: p.x + 'px', top: p.y + 'px' }"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, reactive, watch, computed } from 'vue'
import { Engine, Render, Runner, Composite, Body, Events } from 'matter-js'
import { setCanvasAndRenderSize } from '../logic/physics/world'
import { rebuildTableWalls, getTablePolygon } from '../logic/physics/table'
import type { Drink, DropItem } from '../types'
import { getNextLevel, getSpecForLevel } from '../logic/merge-map'
import { recordMerge, recordSpawn, recordDespawn, ensureCatOrdering, resetOrders } from '../logic/gameplay/orders'
import { useGameState, setGameOver, resetGame, markGameStart } from '../state/game'
import { buildBodyFromCachedHull, precomputeLevelHulls } from '../logic/physics/mask'
import { startBgLoop, playMergeSfx } from '../logic/audio'
import { tableUV as tableUVUtil, connectDirForU as connectDirForUUtil, spawnXForMouse as spawnXForMouseUtil } from '../logic/geometry'
import { getRandomFailPhrase, getRandomWinPhrase } from '../logic/phrases'

const stageRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const game = useGameState()
const tableImage = new URL('../assets/image/table.png', import.meta.url).href

// 心情为 0 时立即触发失败并停止物理引擎
watch(() => game.mood, (m) => {
  if (m <= 0 && !game.over) {
    triggerGameOver()
  }
})

let engine: Engine | null = null
let render: Render | null = null
let runner: Runner | null = null
// removed legacy wall references; using tableWalls only
let tableWalls: Body[] = []

const drinks = ref<Drink[]>([])
let nextId = 1

const drops = ref<DropItem[]>([])
const next = ref<{ level: number; radius: number; color: string; image: string } | null>(null)
const mergeQueue: Array<{ aId: number; bId: number; level: number; x: number; y: number }> = []
const removedIds = new Set<number>()
const multiplierAttempted = new Set<number>()

const state = reactive({
  width: 800,
  height: 600,
  trashLineY: 12,
  launchLineY: 520,
  dragging: false,
  start: { x: 0, y: 0 },
  current: { x: 0, y: 0 },
  power: 0,
  canLaunch: false,
  readyX: 400,
  multCx: 400,
  // 倍率半圆半径（x3 内圈 < x2 外圈）
  mult2R: 180,
  mult3R: 120,
  indicatorDots: [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }]
})
let resizeObserver: ResizeObserver | null = null

let lastLaunchedId: number | null = null
const settledFrames = new Map<number, number>()
const playerLaunched = new Set<number>()
const leftLaunchZone = new Set<number>()
// 新增：发射区空闲检查守卫（5s 无待发射则强制刷新）
let refreshGuardTimer: number | null = null
let launchEmptySec = 0

function buildWalls() {
  if (!engine) return
  const poly = getTablePolygon(state.width, state.height)
  // 其他墙体变薄（例如 16px），并移除上方墙体
  tableWalls = rebuildTableWalls(engine, poly, tableWalls, 1, '#444', false)
}

function createSpecForLevel(level: number) {
  const s = getSpecForLevel(level)
  return { level, radius: s.radius, color: s.color, image: s.image }
}
// 新增：按亲密度线性拟合发射概率（仅 1-3 级）
function spawnWeightsForBond(bond: number): { w1: number; w2: number; w3: number } {
  const b = Math.max(0, Math.min(100, bond))
  if (b <= 50) {
    const t = b / 50
    const w1 = 0.90 + (0.60 - 0.90) * t
    const w2 = 0.10 + (0.25 - 0.10) * t
    const w3 = 0.00 + (0.15 - 0.00) * t
    const sum = w1 + w2 + w3
    return { w1: w1 / sum, w2: w2 / sum, w3: w3 / sum }
  } else {
    const t = (b - 50) / 50
    const w1 = 0.60 + (0.40 - 0.60) * t
    const w2 = 0.25 + (0.35 - 0.25) * t
    const w3 = 0.15 + (0.25 - 0.15) * t
    const sum = w1 + w2 + w3
    return { w1: w1 / sum, w2: w2 / sum, w3: w3 / sum }
  }
}
function pickSpawnLevelByBond(bond: number): 1 | 2 | 3 {
  const { w1, w2 } = spawnWeightsForBond(bond)
  const r = Math.random()
  if (r < w1) return 1
  if (r < w1 + w2) return 2
  return 3
}
function prepareNext() {
  if (game.over || next.value) return
  const lvl = pickSpawnLevelByBond(game.bond)
  next.value = createSpecForLevel(lvl)
  game.nextSpawnLevel = lvl
  state.canLaunch = true
}
// 新增：启动/停止发射区空闲检查（每 500ms 计数）
function startRefreshGuard() {
  if (refreshGuardTimer) return
  launchEmptySec = 0
  refreshGuardTimer = setInterval(() => {
    if (game.over) { launchEmptySec = 0; return }
    const noNext = !next.value
    const dragging = state.dragging
    const lastId = lastLaunchedId
    const lastLeft = (lastId == null) || leftLaunchZone.has(lastId) || !playerLaunched.has(lastId)
    if (noNext && !dragging && lastLeft) {
      launchEmptySec += 0.5
      if (launchEmptySec >= 5) {
        prepareNext()
        launchEmptySec = 0
      }
    } else {
      launchEmptySec = 0
    }
  }, 500) as unknown as number
}
function stopRefreshGuard() {
  if (refreshGuardTimer) {
    clearInterval(refreshGuardTimer as any)
    refreshGuardTimer = null
  }
  launchEmptySec = 0
}

// 新增：根据当前 readyX 与力度，更新三点指示坐标（沿连接线方向，不向下挪动）
function updateIndicatorDots() {
  const r = next.value?.radius || 18
  const centerX = state.readyX
  const centerY = state.launchLineY - 12 // 物体中心
  const { u } = tableUV(centerX, centerY)
  const dir = connectDirForU(u) // 自上到下的连接线方向
  // 起点沿连接线方向上移，且保持与物体的最小间隔
  const gap0 = Math.round(r * 0.6)
  const minGap = Math.round(r * 0.28)
  const lift = Math.round(r * 0.40) // 上移量加大
  const gap = Math.max(minGap, gap0 - lift)
  const anchorX = Math.round(centerX - dir.x * lift)
  const anchorY = Math.round(centerY + r + gap - dir.y * lift)
  // 目标为当前鼠标点，三点需位于物体与鼠标之间
  const targetX = state.current.x
  const targetY = state.current.y
  // 将锚点到鼠标的向量投影到连接线方向，得到有效段长度
  let Lraw = (targetX - anchorX) * dir.x + (targetY - anchorY) * dir.y
  Lraw = Math.max(0, Lraw)
  const safeLen = clamp(Math.round(Lraw - 10), 0, 240) // 留 10px 余量，不触碰鼠标
  // 基础间距 + 力度微调；同时确保三点落在 safeLen 内
  const base = 16
  const delta = Math.min(6, Math.round(state.power * 0.05))
  const s1 = Math.min(base + delta, Math.round(safeLen * 0.33))
  const s2 = Math.min((base + delta) * 2, Math.round(safeLen * 0.66))
  const s3 = Math.min((base + delta) * 3, Math.round(safeLen * 0.92))
  const offs = [s1, s2, s3]
  const dots: Array<{ x:number; y:number }> = []
  for (const s of offs) {
    const x = Math.round(anchorX + dir.x * s)
    const y = Math.round(anchorY + dir.y * s)
    dots.push({ x, y })
  }
  state.indicatorDots = dots
}

function applySize(width: number, height: number) {
  state.width = Math.max(1, Math.round(width))
  state.height = Math.max(1, Math.round(height))
  // 上下 19% 为垃圾区与发射区
  state.trashLineY = Math.round(state.height * 0.19)
  state.launchLineY = Math.round(state.height * 0.81)
  state.readyX = Math.round(state.width / 2)
  // 基于桌面顶边两点匹配倍率区中心与半径
  const poly = getTablePolygon(state.width, state.height)
  const leftTopX = poly[0]!.x
  const rightTopX = poly[1]!.x
  state.multCx = Math.round((leftTopX + rightTopX) / 2)
  const topWidth = Math.max(1, rightTopX - leftTopX)
  const maxR = Math.floor(topWidth / 2)
  state.mult3R = Math.max(1, Math.floor(maxR * 0.66))
  state.mult2R = Math.max(1, Math.floor(maxR * 0.95))
  const canvas = canvasRef.value
  if (render && canvas) {
    setCanvasAndRenderSize(render, canvas, state.width, state.height)
  } else if (canvas) {
    canvas.width = state.width
    canvas.height = state.height
    canvas.style.width = state.width + 'px'
    canvas.style.height = state.height + 'px'
  }
  buildWalls()
  updateIndicatorDots()
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}
// 移除本地 tableUV/connectDirForU/bottomXForU/spawnXForMouse，改为使用工具模块
function spawnXForMouse(mx: number, r: number) {
  return spawnXForMouseUtil(state.width, state.height, state.launchLineY, mx, r)
}
function tableUV(px: number, py: number) {
  return tableUVUtil(state.width, state.height, state.trashLineY, state.launchLineY, px, py)
}
function connectDirForU(u: number) {
  return connectDirForUUtil(state.width, state.height, state.trashLineY, state.launchLineY, u)
}
function chanceForMultiplier(level: number, mult: 2 | 3) {
  if (mult === 2) {
    return clamp(0.32 - 0.035 * (level - 1), 0.08, 0.32)
  } else {
    return clamp(0.18 - 0.03 * (level - 1), 0.03, 0.18)
  }
}
function fullyInsideSemiRegion(px: number, py: number, pr: number, regionR: number) {
  const cx = state.multCx
  const cy = state.trashLineY
  const dist = Math.hypot(px - cx, py - cy)
  // 半圆为垃圾线下方区域，要求物体完全在半圆与垃圾线之下
  return (py - pr >= cy) && (dist + pr <= regionR)
}

// Map id to fail effect class (humorous, not dizzy)
function failClassFor(id: number): string {
  const k = id % 4
  if (k === 0) return 'fail-spin'
  if (k === 1) return 'fail-fly-up'
  if (k === 2) return 'fail-fly-down'
  return 'fail-flash'
}

function syncAndCleanup() {
  if (!engine) return
  // 处理待合并队列（统一在此帧执行）
  while (mergeQueue.length) {
    const m = mergeQueue.shift()!
    const da = drinks.value.find(x => x.id === m.aId)
    const db = drinks.value.find(x => x.id === m.bId)
    if (da && db) {
      // 从物理世界移除旧体
      // 记录桌面计数减少（合并消耗）
      recordDespawn(da.level)
      recordDespawn(db.level)
      Composite.remove(engine!.world, da.body, true)
      Composite.remove(engine!.world, db.body, true)
      // 标记渲染层移除（在过滤器中清理）
      removedIds.add(da.id)
      removedIds.add(db.id)
      playerLaunched.delete(da.id)
      playerLaunched.delete(db.id)
      leftLaunchZone.delete(da.id)
      leftLaunchZone.delete(db.id)
      // 生成新体
      const spec = getSpecForLevel(m.level)
      const body = buildBodyFromCachedHull(m.x, m.y, spec.image, spec.radius, {
        restitution: 0.6,
        friction: 0.1,
        frictionAir: 0.01,
        render: { fillStyle: spec.color, visible: false }
      })
      // 继承动量：合并后新体继续移动（质量加权平均速度）
      const totalMass = da.body.mass + db.body.mass
      const vx = (da.body.mass * da.body.velocity.x + db.body.mass * db.body.velocity.x) / (totalMass || 1)
      const vy = (da.body.mass * da.body.velocity.y + db.body.mass * db.body.velocity.y) / (totalMass || 1)
      Body.setVelocity(body, { x: vx, y: vy })
      Body.setAngularVelocity(body, (da.body.angularVelocity + db.body.angularVelocity) * 0.5)
      body.label = 'drink'
      const id = nextId++
      ;(body as any).drinkId = id
      ;(body as any).level = m.level
      Composite.add(engine!.world, body)
      // 播放合成音效
      playMergeSfx()
      drinks.value.push({
        id,
        body,
        level: m.level,
        radius: spec.radius,
        color: spec.color,
        image: spec.image,
        x: body.position.x,
        y: body.position.y,
        angle: body.angle
      })
      // 更新订单进度与桌面计数
      recordSpawn(m.level)
      recordMerge(id, m.level, spec.image)
      if ((lastLaunchedId === da.id || lastLaunchedId === db.id) && !next.value) {
        prepareNext()
        lastLaunchedId = null
        settledFrames.delete(da.id)
        settledFrames.delete(db.id)
      }
    }
  }
  const margin = 60
  const w = state.width
  const pendingMultiplies: Array<{ x:number; y:number; vx:number; vy:number; level:number; count:number; radius:number; color:string }> = []
  drinks.value = drinks.value.filter(d => {
    if (removedIds.has(d.id)) {
      return false
    }
    // 订单完成后的移除队列处理：爆炸效果移除，并减少桌面计数
    if (game.removeQueue.includes(d.id)) {
      Composite.remove(engine!.world, d.body)
      drops.value.push({ id: d.id, radius: d.radius, color: d.color, image: d.image, x: d.body.position.x, y: d.body.position.y, angle: d.body.angle, effect: 'consume' } as any)
      game.removeQueue = game.removeQueue.filter(x => x !== d.id)
      recordDespawn(d.level)
      setTimeout(() => {
        drops.value = drops.value.filter(di => di.id !== d.id)
        if (lastLaunchedId === d.id && !next.value) {
          prepareNext()
          lastLaunchedId = null
          playerLaunched.delete(d.id)
          leftLaunchZone.delete(d.id)
          settledFrames.delete(d.id)
        }
      }, 420)
      // 若存在消费计划且该物体等级匹配，则减少一个待移除计数
      if (game.consumePlan && game.consumePlan.level === d.level && game.consumePlan.count > 0) {
        game.consumePlan.count -= 1
        if (game.consumePlan.count <= 0) game.consumePlan = null
      }
      return false
    }
    // 批量消费计划：按等级移除剩余数量
    if (game.consumePlan && game.consumePlan.level === d.level && game.consumePlan.count > 0) {
      Composite.remove(engine!.world, d.body)
      drops.value.push({ id: d.id, radius: d.radius, color: d.color, image: d.image, x: d.body.position.x, y: d.body.position.y, angle: d.body.angle, effect: 'consume' } as any)
      recordDespawn(d.level)
      game.consumePlan.count -= 1
      if (game.consumePlan.count <= 0) game.consumePlan = null
      setTimeout(() => {
        drops.value = drops.value.filter(di => di.id !== d.id)
        // 若本次被消费的是刚刚发射的物体，补充下一件待发射并清理状态
        if (lastLaunchedId === d.id && !next.value) {
          prepareNext()
          lastLaunchedId = null
          playerLaunched.delete(d.id)
          leftLaunchZone.delete(d.id)
          settledFrames.delete(d.id)
        }
      }, 420)
      return false
    }
    const pos = d.body.position
    const halfOutTop = pos.y <= state.trashLineY
    const outSide = pos.x < -margin || pos.x > w + margin || pos.y > state.height + margin
    if (halfOutTop || outSide) {
      Composite.remove(engine!.world, d.body)
      drops.value.push({ id: d.id, radius: d.radius, color: d.color, image: d.image, x: pos.x, y: pos.y, angle: d.body.angle })
      recordDespawn(d.level)
      setTimeout(() => {
        drops.value = drops.value.filter(di => di.id !== d.id)
      }, 420)
      return false
    }
    d.x = pos.x
    d.y = pos.y
    d.angle = d.body.angle

    // 使移动沿桌面连接线方向（投影速度到连接线方向，衰减横向分量）
    {
      const topY = state.trashLineY
      const bottomY = state.launchLineY
      const onTable = (d.y - d.radius >= topY - 2) && (d.y + d.radius <= bottomY + 2)
      const v = d.body.velocity
      const speed = Math.hypot(v.x, v.y)
      if (onTable && speed > 0.02) {
        const { u } = tableUV(d.x, d.y)
        const dir = connectDirForU(u) // 指向“下”的方向
        const parallel = v.x * dir.x + v.y * dir.y
        const pvx = dir.x * parallel
        const pvy = dir.y * parallel
        const cx = v.x - pvx
        const cy = v.y - pvy
        const align = 0.85
        Body.setVelocity(d.body, { x: pvx + cx * (1 - align), y: pvy + cy * (1 - align) })
      }
    }

    // 失败判定优化：仅当该物体已离开发射区且向下再次越过发射线才结束
    if (!game.over && playerLaunched.has(d.id)) {
      const topY = d.y - d.radius
      const bottomY = d.y + d.radius
      // 标记离开发射区：顶部越过发射线
      if (!leftLaunchZone.has(d.id) && topY <= state.launchLineY - 2) {
        leftLaunchZone.add(d.id)
      }
      // 已离开发射区后，向下再次越线才失败
      if (leftLaunchZone.has(d.id)) {
        const vy = d.body.velocity.y
        if (vy > 0.2 && bottomY >= state.launchLineY + 2) {
          triggerGameOver()
        }
      }
    }

    // 倍率区域判定：首次完全进入时按等级递减概率复制
    if (!multiplierAttempted.has(d.id)) {
      const in3 = fullyInsideSemiRegion(d.x, d.y, d.radius, state.mult3R)
      const in2 = !in3 && fullyInsideSemiRegion(d.x, d.y, d.radius, state.mult2R)
      let mult: 0 | 2 | 3 = 0
      if (in3) mult = 3
      else if (in2) mult = 2
      if (mult === 2 || mult === 3) {
        multiplierAttempted.add(d.id)
        const chance = chanceForMultiplier(d.level, mult as 2 | 3)
        if (Math.random() < chance) {
          removedIds.add(d.id)
          Composite.remove(engine!.world, d.body, true)
          // 同步桌面计数：倍率复制移除原体
          recordDespawn(d.level)
          // 复制移除后，如该物体是最近一次发射，则立即补充下一件待发射物
          if (lastLaunchedId === d.id && !next.value) {
            prepareNext()
            lastLaunchedId = null
            settledFrames.delete(d.id)
          }
          pendingMultiplies.push({ x: d.x, y: d.y, vx: d.body.velocity.x, vy: d.body.velocity.y, level: d.level, count: mult, radius: d.radius, color: d.color })
          return false
        }
      }
    }

    if (lastLaunchedId === d.id && !next.value) {
      const speed = d.body.speed
      const sleeping = (d.body as any).isSleeping === true
      const prev = settledFrames.get(d.id) || 0
      const nextCount = (speed < 0.8 || sleeping) ? Math.min(prev + 1, 120) : 0
      settledFrames.set(d.id, nextCount)
      if (nextCount > 30) {
        prepareNext()
        lastLaunchedId = null
        settledFrames.delete(d.id)
      }
    }
    return true
  })

  // 执行复制：在原位置生成多个新体并加入物理世界与渲染层
  for (const pm of pendingMultiplies) {
    for (let i = 0; i < pm.count; i++) {
      const spec = getSpecForLevel(pm.level)
      const angle = (Math.PI * 2 * i) / pm.count
      // 确保相互中心距 > 2r + ε，避免刚生成立即合成
      const eps = 0.5
      const requiredOffset = pm.count === 2
        ? (spec.radius + eps * 0.5) // 2*offset > 2r + ε
        : ((2 * spec.radius + eps) / Math.sqrt(3)) // √3*offset > 2r + ε
      const offsetR = Math.max(requiredOffset, spec.radius * 1.2)
      const ox = Math.cos(angle) * offsetR
      const oy = Math.sin(angle) * offsetR
      const body = buildBodyFromCachedHull(pm.x + ox, pm.y + oy, spec.image, spec.radius, {
        restitution: 0.6,
        friction: 0.1,
        frictionAir: 0.01,
        render: { fillStyle: spec.color, visible: false }
      })
      body.label = 'drink'
      const id = nextId++
      ;(body as any).drinkId = id
      ;(body as any).level = pm.level
      Composite.add(engine!.world, body)
      // 给予径向分离速度，进一步降低立即回撞概率
      const sepV = 0.05
      Body.setVelocity(body, { x: pm.vx + Math.cos(angle) * sepV, y: pm.vy + Math.sin(angle) * sepV })
      drinks.value.push({ id, body, level: pm.level, radius: spec.radius, color: spec.color, image: spec.image, x: body.position.x, y: body.position.y, angle: body.angle })
      // 同步桌面计数：倍率复制生成新体
      recordSpawn(pm.level)
    }
  }

  // 二次清理：移除世界中所有未在渲染层存在的饮料体，避免幽灵碰撞
  const alive = new Set(drinks.value.map(d => d.id))
  const bodies = Composite.allBodies(engine!.world)
  for (const b of bodies) {
    if ((b as any).label === 'drink') {
      const id = (b as any).drinkId
      if (id != null && !alive.has(id)) {
        Composite.remove(engine!.world, b, true)
      }
    }
  }
  // 本帧已消费的移除标记清空
  removedIds.clear()
}

function triggerGameOver() {
  if (game.over) return
  setGameOver()
  state.canLaunch = false
  if (runner && engine) {
    Runner.stop(runner)
  }
}

function handleRestart() {
  // 1) 清理订单系统定时器与全局状态
  resetOrders()
  resetGame()
  // 2) 清理本地渲染/物理与临时集合
  drinks.value = []
  drops.value = []
  mergeQueue.length = 0
  removedIds.clear()
  multiplierAttempted.clear()
  playerLaunched.clear()
  leftLaunchZone.clear()
  settledFrames.clear()
  next.value = null
  lastLaunchedId = null
  state.power = 0
  state.dragging = false
  state.canLaunch = false
  stopRefreshGuard()
  // 3) 重建物理引擎与渲染器
  if (render) {
    Render.stop(render)
    // 清理贴图缓存，避免旧资源残留
    ;(render as any).textures = {}
  }
  if (runner && engine) {
    Runner.stop(runner)
  }
  if (engine) {
    Events.off(engine as any, 'afterUpdate', syncAndCleanup as any)
    Events.off(engine as any, 'collisionStart', onCollisionStart as any)
  }
  engine = Engine.create()
  engine.gravity.x = 0
  engine.gravity.y = 0
  render = Render.create({
    engine,
    canvas: canvasRef.value as HTMLCanvasElement,
    options: {
      width: state.width,
      height: state.height,
      background: 'transparent',
      wireframes: false
    }
  })
  Render.setPixelRatio(render, window.devicePixelRatio || 1)
  Render.run(render)
  runner = Runner.create()
  Runner.run(runner, engine)
  // 重新绑定物理事件
  Events.on(engine, 'afterUpdate', syncAndCleanup)
  Events.on(engine, 'collisionStart', onCollisionStart)
  // 重建桌面墙体与准备下一件物品
  buildWalls()
  state.canLaunch = true
  ensureCatOrdering()
  prepareNext()
  // 修复：重启后重新启动发射区空闲守卫（不改变逻辑与时间）
  startRefreshGuard()
  // 重开游戏时重新记录开始时间
  markGameStart()
}





// 触摸事件适配：阻止默认滚动/下拉刷新，复用同样的拖拽与发射逻辑




function onCollisionStart(ev: any) {
  const pairs = ev.pairs || []
  for (const p of pairs) {
    const a = p.bodyA
    const b = p.bodyB
    if (!a || !b) continue
    if ((a as any).label !== 'drink' || (b as any).label !== 'drink') continue
    const la = (a as any).level
    const lb = (b as any).level
    if (!la || la !== lb) continue
    const nextLevel = getNextLevel(la)
    if (nextLevel == null) continue
    const aid = (a as any).drinkId
    const bid = (b as any).drinkId
    if (aid == null || bid == null) continue
    if (removedIds.has(aid) || removedIds.has(bid)) continue
    const cx = (a.position.x + b.position.x) * 0.5
    const cy = (a.position.y + b.position.y) * 0.5
    mergeQueue.push({ aId: aid, bId: bid, level: nextLevel, x: cx, y: cy })
    removedIds.add(aid)
    removedIds.add(bid)
  }
}

// Unified pointer events
function localPointerPoint(ev: PointerEvent) {
  const el = stageRef.value
  if (!el) return { x: 0, y: 0 }
  const rect = el.getBoundingClientRect()
  return { x: ev.clientX - rect.left, y: ev.clientY - rect.top }
}
function handlePointerDown(ev: PointerEvent) {
  const target = ev.target as Element | null
  // 跳过 UI 控件：规则卡片、结束卡片、欢迎层、控制栏与滑块
  if (target && (
    target.closest('.start-btn') ||
    target.closest('.go-restart') ||
    target.closest('.game-over') ||
    target.closest('.welcome-wrap') ||
    target.closest('.controls') ||
    target.matches('input[type="range"]') ||
    target.closest('input[type="range"]')
  )) {
    return
  }
  if (ev.cancelable) ev.preventDefault()
  startBgLoop()
  const p = localPointerPoint(ev)
  if (!state.canLaunch || !next.value) return
  const r = next.value?.radius || 18
  state.readyX = spawnXForMouse(p.x, r)
  state.dragging = true
  state.start = { x: p.x, y: p.y }
  state.current = { x: state.readyX, y: p.y }
  updateIndicatorDots()
}
function handlePointerMove(ev: PointerEvent) {
  if (!state.dragging) return
  if (ev.cancelable) ev.preventDefault()
  const p = localPointerPoint(ev)
  const r = next.value?.radius || 18
  state.readyX = spawnXForMouse(p.x, r)
  state.current = { x: state.readyX, y: p.y }
  const dx = p.x - state.start.x
  const dy = p.y - state.start.y
  state.power = Math.hypot(dx, dy)
  updateIndicatorDots()
}
function handlePointerUp(ev: PointerEvent) {
  if (!state.dragging) return
  if (ev.cancelable) ev.preventDefault()
  state.dragging = false
  const end = localPointerPoint(ev)
  const dx = end.x - state.start.x
  const dy = end.y - state.start.y
  let len = Math.hypot(dx, dy)
  const maxLen = 200
  const gamma = 1.3
  const vMax = 8.8
  const vBase = 2.2
  let speed = vBase
  if (len >= 2) {
    len = Math.min(len, maxLen)
    const t = len / maxLen
    speed = vBase + Math.pow(t, gamma) * (vMax - vBase)
  }
  const { u } = tableUV(state.readyX, state.launchLineY - 10)
  const dir = connectDirForU(u)
  const vx = -dir.x * speed
  const vy = -dir.y * speed
  if (!engine || !next.value) return
  const spec = next.value
  const body = buildBodyFromCachedHull(state.readyX, state.launchLineY - 10, spec.image, spec.radius, {
    restitution: 0.4,
    friction: 0.5,
    frictionAir: 0.022,
    render: { fillStyle: spec.color, visible: false }
  })
  Composite.add(engine.world, body)
  Body.setVelocity(body, { x: vx, y: vy })
  const id = nextId++
  body.label = 'drink'
  ;(body as any).drinkId = id
  ;(body as any).level = spec.level
  drinks.value.push({ id, body, level: spec.level, radius: spec.radius, color: spec.color, image: spec.image, x: body.position.x, y: body.position.y, angle: body.angle })
  recordSpawn(spec.level)
  playerLaunched.add(id)
  lastLaunchedId = id
  next.value = null
  state.canLaunch = false
  state.power = 0
}

onMounted(() => {
  const el = stageRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  applySize(rect.width || 800, rect.height || 600)
  engine = Engine.create()
  engine.gravity.x = 0
  engine.gravity.y = 0
  render = Render.create({
    engine,
    canvas: canvasRef.value as HTMLCanvasElement,
    options: {
      width: state.width,
      height: state.height,
      background: 'transparent',
      wireframes: false
    }
  })
  Render.setPixelRatio(render, window.devicePixelRatio || 1)
  // 预计算各等级的凸包，用于多边形碰撞体
  precomputeLevelHulls([1,2,3,4,5,6].map(l => getSpecForLevel(l)))
  buildWalls()
  resizeObserver = new ResizeObserver(() => {
    const r = el.getBoundingClientRect()
    applySize(r.width, r.height)
  })
  resizeObserver.observe(el)

  Render.run(render)
  runner = Runner.create()
  Runner.run(runner, engine)

  Events.on(engine, 'afterUpdate', syncAndCleanup)
  Events.on(engine, 'collisionStart', onCollisionStart)

  // 使用 pointer 事件
  window.addEventListener('pointerdown', handlePointerDown, { passive: false })
  window.addEventListener('pointermove', handlePointerMove, { passive: false })
  window.addEventListener('pointerup', handlePointerUp)

  // 初次准备一件待发射物品
  prepareNext()
  startRefreshGuard()
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', handlePointerDown as any)
  window.removeEventListener('pointermove', handlePointerMove as any)
  window.removeEventListener('pointerup', handlePointerUp as any)
  if (render) {
    Render.stop(render)
    render.textures = {}
  }
  if (runner && engine) {
    Runner.stop(runner)
  }
  if (engine) {
    Events.off(engine as any, 'afterUpdate', syncAndCleanup as any)
    Events.off(engine as any, 'collisionStart', onCollisionStart as any)
  }
  engine = null
  render = null
  runner = null
  resizeObserver?.disconnect()
  resizeObserver = null
  stopRefreshGuard()
})
const goPhrase = computed(() => (game.win ? getRandomWinPhrase() : getRandomFailPhrase()))
function formatElapsed(ms?: number | null) {
  if (!ms || ms <= 0) return '00:00'
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}
</script>

<style scoped>
.stage {
  position: relative;
  width: 100%;
  height: 100%;
  /* 由父容器（Main.vue 的 .gamestage）统一控制尺寸，避免重复 70vh 导致遮挡 */
  margin: 0 auto;
  border-radius: 12px;
  overflow: hidden;
}
.table-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  z-index: 0;
  pointer-events: none;
}
.stage-canvas {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  display: block;
}
.overlay {
   position: absolute;
   inset: 0;
   pointer-events: auto;
   z-index: 2;
 }
 
 /* 提升待发射层级，保证始终在桌面物体之上可见，不改逻辑与刷新时间 */
 .ready-layer {
   z-index: 4;
 }
.zones-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.multiplier-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}
.zone { position: absolute; left: 0; right: 0; }
.zone-trash { background: transparent; }
.zone-collision { background: transparent; border: none; }
.zone-launch { background: transparent; border: none; }
.trash-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(255, 68, 68, 0.95);
}
.launch-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(255, 255, 255, 0.9);
}
.drinks-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}
.indicator-dots {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}
.indicator-dot {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 0 3px rgba(0,0,0,0.25);
}
.drops-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 3;
}
.drink {
  position: absolute;
  border-radius: 0;
  box-shadow: none;
}
.drop {
  position: absolute;
}
.drop-content {
  border-radius: 0;
  box-shadow: none;
  animation: trash-drop 0.4s ease-out forwards;
}
.sprite {
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
}
@keyframes trash-drop {
  0% { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-40px) scale(0.85); }
}
/* 删除重复的 .power/.indicator 规则，保留一份定义 */
.power {
  position: absolute;
  transform: translate(-50%, -150%);
  color: #fff;
  font-size: 12px;
  background: rgba(0, 0, 0, 0.4);
  padding: 2px 6px;
  border-radius: 6px;
}
.indicator {
  position: absolute;
  left: 0;
  top: 0;
}
/* 保留 ready-layer 样式一处 */
.ready-layer .ready-drink {
  position: absolute;
  border-radius: 9999px;
  opacity: 1;
  z-index: 3;
}
.ready-layer .ready-drink::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: calc(100% + 16px);
  height: calc(100% + 16px);
  transform: translate(-50%, -50%);
  border-radius: 9999px;
  /* 冷色调径向光圈增强 */
  /* background: radial-gradient(rgba(140, 205, 255, 0.50), rgba(140, 205, 255, 0.28) 44%, rgba(140, 205, 255, 0) 72%); */
  animation: readyPulse 1.6s ease-in-out infinite;
  pointer-events: none;
}
.ready-layer .ready-drink .sprite,
.ready-sprite {
  animation: readyFloat 2.0s ease-in-out infinite;
  filter: brightness(1.08) saturate(1.14) contrast(1.08) drop-shadow(0 0 10px rgba(140, 200, 255, 0.50));
}
@keyframes readyPulse {
  0% { opacity: 0.68; }
  50% { opacity: 1; }
  100% { opacity: 0.68; }
}
@keyframes readyFloat {
  0% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-2px) scale(1.04); }
  100% { transform: translateY(0) scale(1); }
}
/* 重复样式已移除：统一在上方定义 .power/.indicator/ready-layer .ready-drink */

/* 倍率半圆与标签样式 */
.mult {
  position: absolute;
  overflow: hidden;
  border-bottom-left-radius: 9999px;
  border-bottom-right-radius: 9999px;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}
.mult2 { background: rgba(59, 130, 246, 0.12); border-bottom: 2px dashed rgba(59, 130, 246, 0.35); }
.mult3 { background: rgba(255, 196, 0, 0.15); border-bottom: 2px dashed rgba(255, 196, 0, 0.45); }
.mult-label {
  position: absolute;
  color: rgba(255, 255, 255, 0.85);
  font-size: 12px;
  transform: translate(-50%, -50%);
  /* 去除强烈阴影以避免突兀 */
  text-shadow: none;
}
.game-over {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: #fff;
  font-size: 24px;
  font-weight: 800;
  z-index: 4;
  pointer-events: auto;
  backdrop-filter: none;
}
.go-card {
  width: min(520px, 90vw);
  max-width: 520px;
  padding: 18px 16px 14px;
  border-radius: 16px;
  color: #2b1b10;
  background: linear-gradient(180deg, #fff8ee 0%, #ffe6c7 100%);
  box-shadow: 0 12px 38px rgba(0, 0, 0, 0.28);
  text-align: center;
}
.cat-face {
  font-size: clamp(18px, 2.8vw, 22px);
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}
.go-title {
  font-size: clamp(20px, 4.6vw, 26px);
  margin: 4px 0 8px;
  font-weight: 800;
}
.go-desc {
  font-size: clamp(14px, 3.4vw, 15px);
  margin: 0 0 8px;
  opacity: 0.9;
}
.go-restart {
  appearance: none;
  border: 0;
  border-radius: 999px;
  padding: 10px 20px;
  font-size: clamp(14px, 3.8vw, 18px);
  font-weight: 700;
  color: #3b2416;
  background: linear-gradient(90deg, #ffd38f 0%, #ffc371 50%, #ffd38f 100%);
  background-size: 200% 200%;
  box-shadow: 0 8px 24px rgba(255, 124, 24, 0.45);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  position: relative;
  overflow: hidden;
  will-change: transform, filter;
  animation: restartPulse 2.2s ease-in-out infinite, gradientFlow 5s linear infinite;
}
.go-restart::before {
  content: '';
  position: absolute;
  left: -20%;
  top: 0;
  width: 40%;
  height: 100%;
  background: linear-gradient(90deg, rgba(255,255,255,0.0), rgba(255,255,255,0.35), rgba(255,255,255,0.0));
  transform: skewX(-20deg);
  animation: shineSweep 2.8s ease-in-out infinite;
  pointer-events: none;
}
.go-restart:hover {
  filter: brightness(1.12) saturate(1.06);
  animation-duration: 1.8s;
}
.go-restart:active { transform: translateY(1px) scale(0.98); }
.go-restart:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(255, 145, 48, 0.35), 0 8px 24px rgba(255, 124, 24, 0.45);
}

/* Keyframes */
@keyframes restartPulse {
  0% { transform: translateY(0) scale(1); box-shadow: 0 8px 24px rgba(255, 124, 24, 0.45); }
  50% { transform: translateY(-2px) scale(1.06); box-shadow: 0 12px 30px rgba(255, 124, 24, 0.55); }
  100% { transform: translateY(0) scale(1); box-shadow: 0 8px 24px rgba(255, 124, 24, 0.45); }
}
@keyframes gradientFlow {
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}
@keyframes shineSweep {
  0% { transform: translateX(-120%) skewX(-20deg); opacity: 0; }
  20% { opacity: 1; }
  50% { transform: translateX(160%) skewX(-20deg); opacity: 0.9; }
  100% { transform: translateX(260%) skewX(-20deg); opacity: 0; }
}

/* Card pop-in for end screen */
@keyframes goCardPop {
  0% { opacity: 0; transform: scale(0.92) translateY(8px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
.go-card { animation: goCardPop 0.38s ease-out; }

/* Motion reduce */
@media (prefers-reduced-motion: reduce) {
  .go-restart { animation: none; }
  .go-restart::before { animation: none; }
  .go-card { animation: none; }
}

/* Consume fade-out (no flash disappear) */
.drop.consume .drop-content { animation: consumeFade 0.6s ease-out forwards; }
@keyframes consumeFade {
  0% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(0.6); }
}
/* Fail humorous effects (short, not dizzy) */
@keyframes failSpinKf {
  0% { transform: rotate(0deg); }
  50% { transform: rotate(14deg); }
  100% { transform: rotate(0deg); }
}
@keyframes failFlyUpKf {
  0% { transform: translate(0,0); }
  100% { transform: translate(-18px, -26px); }
}
@keyframes failFlyDownKf {
  0% { transform: translate(0,0); }
  100% { transform: translate(22px, 18px); }
}
@keyframes failFlashKf {
  0% { opacity: 1; filter: none; }
  25% { opacity: 0.6; filter: hue-rotate(12deg) brightness(1.15); }
  50% { opacity: 1; filter: none; }
  75% { opacity: 0.7; filter: hue-rotate(-12deg) brightness(1.12); }
  100% { opacity: 1; filter: none; }
}
.drink.fail-spin .sprite { animation: failSpinKf 1.2s ease-in-out 2; }
.drink.fail-fly-up { animation: failFlyUpKf 0.8s ease-out 1 forwards; }
.drink.fail-fly-down { animation: failFlyDownKf 0.8s ease-out 1 forwards; }
.drink.fail-flash .sprite { animation: failFlashKf 1.0s ease-in-out 2; }
/* 卡片美化：成功金色系、失败暖红系 + 轻装饰 */
.go-card { position: relative; }
.go-card.success { border: 1px solid rgba(255, 198, 98, 0.9); background: linear-gradient(180deg, #fff8ee 0%, #ffe3b8 100%); }
.go-card.success::after { content: ''; position: absolute; inset: -2px; border-radius: 16px; border: 2px dashed rgba(255, 200, 120, 0.7); pointer-events: none; }
.go-card.fail { border: 1px solid rgba(255, 120, 120, 0.85); background: linear-gradient(180deg, #fff3f3 0%, #ffd4d4 100%); }
.go-card.fail::after { content: ''; position: absolute; inset: -2px; border-radius: 16px; border: 2px dashed rgba(255, 140, 140, 0.7); pointer-events: none; }

.go-title { letter-spacing: 0.2px; }
.pk { font-size: 12px; color: #7a5b45; margin-bottom: 8px; }

/* 成功小装饰：边框闪光 */
@keyframes borderShine { 0%{ box-shadow: 0 0 0 rgba(255,185,90,0.0);} 50%{ box-shadow: 0 0 16px rgba(255,185,90,0.35);} 100%{ box-shadow: 0 0 0 rgba(255,185,90,0.0);} }
.go-card.success { animation: borderShine 2.6s ease-in-out infinite; }

/* 失败小装饰：轻微抖动标题 */
@keyframes titleShake { 0%{ transform: translateX(0);} 50%{ transform: translateX(1.2px);} 100%{ transform: translateX(0);} }
.go-card.fail .go-title { animation: titleShake 2.4s ease-in-out infinite; }
</style>