import { useGameState, addMood, addBond, setOrders } from '../../state/game'
import { getSpecForLevel } from '../merge-map'

// 甜点物体清单与等级映射（与素材/等级一致）
const catalog = [
  { level: 1, name: '巧克力' },
  { level: 2, name: '曲奇' },
  { level: 3, name: '甜甜圈' },
  { level: 4, name: '马卡龙' },
  { level: 5, name: '水果蛋糕' },
  { level: 6, name: '巨无霸蛋糕' }
]

// 心情与节奏参数
const decayPerSec = 1
const impatientThreshold = 60
const angryThreshold = 30
const eatHoldSeconds = 5
const orderUpdateSeconds = 2
const bondGain = 5

// 使用 store 管理的计时器 ID，避免模块级变量分散
// 稀有订单保底计数器（在高亲密度下保障出现频次）
let rare5SinceLast = 0
let rare6SinceLast = 0

function nameForLevel(level: number) {
  return catalog.find(c => c.level === level)?.name || '未知甜点'
}

function combosForBond(bond: number) {
  if (bond < 8) return [
    { level: 2, count: 1 },
    { level: 2, count: 2 },
    { level: 3, count: 1 },
  ]
  if (bond < 18) return [
    { level: 2, count: 2 },
    { level: 3, count: 1 },
    { level: 3, count: 2 },
    { level: 4, count: 1 },
  ]
  if (bond < 30) return [
    { level: 2, count: 3 },
    { level: 3, count: 2 },
    { level: 4, count: 1 },
    { level: 4, count: 2 },
  ]
  if (bond < 45) return [
    { level: 3, count: 3 },
    { level: 4, count: 2 },
    { level: 5, count: 1 },
    { level: 2, count: 3 },
  ]
  if (bond < 60) return [
    { level: 4, count: 3 },
    { level: 5, count: 1 },
    { level: 5, count: 2 },
    { level: 3, count: 3 },
  ]
  return [
    { level: 5, count: 2 },
    { level: 6, count: 1 },
    { level: 4, count: 3 },
    { level: 3, count: 3 },
  ]
}

function randomPick<T>(arr: T[]): T | null {
  if (!arr.length) return null
  const idx = Math.floor(Math.random() * arr.length)
  return arr[idx] ?? null
}
function pickWeighted<T>(items: T[], weightOf: (item: T) => number): T | null {
  if (!items.length) return null
  const weights = items.map(weightOf)
  const total = weights.reduce((a, b) => a + b, 0)
  if (total <= 0) return randomPick(items)
  let r = Math.random() * total
  for (let i = 0; i < items.length; i++) {
    const w = weights[i] ?? 0
    r -= w
    if (r <= 0) return items[i] ?? (items[items.length - 1] ?? null)
  }
  return items[items.length - 1] ?? null
}

function buildOrderForState(): { level: number; count: number } {
  const game = useGameState()
  const pool = combosForBond(game.bond)
  const tc = game.tableCounts || {}
  const last = game.cat.desiredLevel || 0
  const spawnBoost = (lvl: number) => (game.nextSpawnLevel === lvl ? 1 : 0)
  const shortage = (o: { level: number; count: number }) => o.count - ((tc[o.level] || 0) + spawnBoost(o.level))
  const hard = pool.filter(o => (tc[o.level] || 0) > 0 && shortage(o) >= 2)
  const medium = pool.filter(o => shortage(o) >= 2)
  const viable = pool.filter(o => shortage(o) >= 1)

  const notSame = <T extends { level: number }>(arr: T[]) => arr.filter(o => o.level !== last)
  const hardA = notSame(hard)
  const mediumA = notSame(medium)
  const viableA = notSame(viable)
  const poolA = notSame(pool)

  const p5 = game.bond >= 35 ? Math.min(0.15 + (game.bond - 35) * 0.005, 0.35) : 0
  const p6 = game.bond >= 60 ? Math.min(0.08 + (game.bond - 60) * 0.004, 0.20) : 0
  const want6ByPity = game.bond >= 60 && rare6SinceLast >= 7
  const want5ByPity = game.bond >= 35 && rare5SinceLast >= 5
  if (want6ByPity || Math.random() < p6) {
    const any6 = poolA.filter(o => o.level === 6)
    const pick6 = randomPick(any6)
    if (pick6) return pick6
  }
  if (want5ByPity || Math.random() < p5) {
    const any5 = poolA.filter(o => o.level === 5)
    const pick5 = randomPick(any5)
    if (pick5) return pick5
  }

  const history = game.orderHistory || []
  const recent = history.slice(Math.max(0, history.length - 4))
  const recentLevels = recent.map(h => h.level)
  const freq = (lvl: number) => recentLevels.filter(l => l === lvl).length
  const lastCountOf = (lvl: number) => {
    for (let i = history.length - 1; i >= 0; i--) {
      const h = history[i]
      if (h && h.level === lvl) return h.count
    }
    return 1
  }
  const allowedCounts = (lvl: number) => pool.filter(o => o.level === lvl).map(o => o.count)
  const rampCount = (lvl: number) => {
    const prev = lastCountOf(lvl)
    const allowed = allowedCounts(lvl)
    if (!allowed.length) return prev
    const max = Math.max(...allowed)
    const target = Math.min(prev + 1, max)
    return allowed.includes(target) ? target : (allowed.includes(2) ? 2 : allowed[0])
  }

  const candidates = [...hardA, ...mediumA, ...viableA]
  const baseSet = candidates.length ? candidates : poolA

  const weightOf = (c: { level: number; count: number }) => {
    const sh = shortage(c)
    const base = sh >= 2 ? ((tc[c.level] || 0) > 0 ? 1.0 : 0.8) : (sh >= 1 ? 0.6 : 0.2)
    const f = freq(c.level)
    const novelty = f === 0 ? 0.6 : f === 1 ? 0.2 : -0.2
    const rc = rampCount(c.level)
    const ramp = c.count === rc ? 0.4 : (game.bond >= 10 && c.count >= 2 ? 0.2 : 0)
    const spawn = (game.nextSpawnLevel === c.level && sh >= 2) ? 0.2 : 0
    const mood = (game.mood <= 30 && c.count >= 3) ? -0.6 : ((game.mood <= 60 && c.count >= 3) ? -0.3 : 0)
    return Math.max(0.05, base + novelty + ramp + spawn + mood)
  }

  const target = pickWeighted(baseSet, weightOf) || randomPick(poolA) || { level: 2, count: 1 }
  return target
}

export function pickNextOrder() {
  const game = useGameState()
  const choice = buildOrderForState()
  if (choice.level === 5) rare5SinceLast = 0; else rare5SinceLast += 1
  if (choice.level === 6) rare6SinceLast = 0; else rare6SinceLast += 1
  setOrders([
    {
      tier: 1,
      targets: [
        {
          level: choice.level,
          count: choice.count,
          progress: Math.min(choice.count, game.tableCounts[choice.level] || 0),
        },
      ],
    },
  ])
  game.cat.desiredLevel = choice.level
  game.cat.desiredName = nameForLevel(choice.level)
  game.cat.phase = 'ordering'
  game.cat.waitSeconds = 0
  game.orderHistory.push({ level: choice.level, count: choice.count })
  if (game.orderHistory.length > 12) game.orderHistory.shift()
  tryFulfillCurrentOrderByCounts()
}

export function pickNextOrderSilently() {
  const game = useGameState()
  const choice = buildOrderForState()
  if (choice.level === 5) rare5SinceLast = 0; else rare5SinceLast += 1
  if (choice.level === 6) rare6SinceLast = 0; else rare6SinceLast += 1
  setOrders([
    {
      tier: 1,
      targets: [
        {
          level: choice.level,
          count: choice.count,
          progress: Math.min(choice.count, game.tableCounts[choice.level] || 0),
        },
      ],
    },
  ])
  game.cat.desiredLevel = choice.level
  game.cat.desiredName = nameForLevel(choice.level)
  game.orderHistory.push({ level: choice.level, count: choice.count })
  if (game.orderHistory.length > 12) game.orderHistory.shift()
}

function tickMood(dt: number) {
  const game = useGameState()
  if (game.over) return
  if (game.cat.phase === 'eating') return
  game.cat.waitSeconds += dt
  addMood(-decayPerSec * dt)
  const m = game.mood
  if (m <= angryThreshold) {
    if (game.cat.phase !== 'angry') game.cat.phase = 'angry'
  } else if (m <= impatientThreshold) {
    if (game.cat.phase !== 'impatient') game.cat.phase = 'impatient'
  } else {
    if (game.cat.phase !== 'ordering') game.cat.phase = 'ordering'
  }
}

export function ensureCatOrdering() {
  const game = useGameState()
  if (!game.cat.desiredLevel || !game.cat.desiredName || game.orders.length === 0) {
    pickNextOrder()
  }
  // 使用 store 管理计时器
  if (!game.moodTimerId) {
    const id = setInterval(() => tickMood(1), 1000) as unknown as number
    game.setMoodTimer(id)
  }
}

export function resetOrders() {
  const g = useGameState()
  if (g.moodTimerId) { try { clearInterval(g.moodTimerId as any) } catch {} ; g.setMoodTimer(null) }
  if (g.cooldownTimerId) { try { clearTimeout(g.cooldownTimerId as any) } catch {} ; g.setCooldownTimer(null) }
  if (g.orderUpdateTimerId) { try { clearTimeout(g.orderUpdateTimerId as any) } catch {} ; g.setOrderUpdateTimer(null) }
  rare5SinceLast = 0
  rare6SinceLast = 0
}

function scheduleNextOrder() {
  const g = useGameState()
  // 进食阶段 2 秒后静默更新下一单
  if (g.orderUpdateTimerId) { try { clearTimeout(g.orderUpdateTimerId as any) } catch {} }
  const upId = setTimeout(() => {
    const gs = useGameState()
    if (!gs.over) { pickNextOrderSilently() }
  }, orderUpdateSeconds * 1000) as unknown as number
  g.setOrderUpdateTimer(upId)

  // 进食阶段结束后切回 ordering，并尝试满足
  if (g.cooldownTimerId) { try { clearTimeout(g.cooldownTimerId as any) } catch {} }
  const cdId = setTimeout(() => {
    const gs = useGameState()
    if (!gs.over) {
      gs.cat.phase = 'ordering'
      gs.cat.waitSeconds = 0
      gs.cat.freezeUntilMs = null
      tryFulfillCurrentOrderByCounts()
      if (!gs.moodTimerId) {
        const id = setInterval(() => tickMood(1), 1000) as unknown as number
        gs.setMoodTimer(id)
      }
    }
  }, eatHoldSeconds * 1000) as unknown as number
  g.setCooldownTimer(cdId)
}

export function recordSpawn(level: number) {
  const game = useGameState()
  const cur = game.tableCounts[level] || 0
  game.tableCounts[level] = cur + 1
  const current = game.orders[0]
  const target = current?.targets?.[0]
  if (target) {
    target.progress = Math.min(target.count, game.tableCounts[target.level] || 0)
  }
  tryFulfillCurrentOrderByCounts()
}
export function recordDespawn(level: number) {
  const game = useGameState()
  const cur = game.tableCounts[level] || 0
  game.tableCounts[level] = Math.max(0, cur - 1)
  const current = game.orders[0]
  const target = current?.targets?.[0]
  if (target) {
    target.progress = Math.min(target.count, game.tableCounts[target.level] || 0)
  }
}

export function recordMerge(id: number, level: number, image: string) {
  const game = useGameState()
  if (game.over) return
  const current = game.orders[0]
  const target = current?.targets?.[0]
  if (!target) return
  if (level !== target.level) return
  const countOnTable = game.tableCounts[target.level] || 0
  if (game.cat.phase !== 'eating' && countOnTable >= target.count) {
    game.removeQueue.push(id)
    game.consumePlan = { level: target.level, count: target.count, image }
    game.cat.phase = 'eating'
    game.cat.lastEatenImage = image
    addMood(100 - game.mood)
    addBond(bondGain)
    game.cat.waitSeconds = 0
    game.cat.freezeUntilMs = Date.now() + orderUpdateSeconds * 1000
    scheduleNextOrder()
  }
}

function tryFulfillCurrentOrderByCounts() {
  const game = useGameState()
  if (game.over) return
  if (game.cat.phase === 'eating') return
  const current = game.orders[0]
  const target = current?.targets?.[0]
  if (!target) return
  const countOnTable = game.tableCounts[target.level] || 0
  if (countOnTable >= target.count) {
    const spec = getSpecForLevel(target.level)
    game.consumePlan = { level: target.level, count: target.count, image: spec.image }
    game.cat.phase = 'eating'
    game.cat.lastEatenImage = spec.image
    addMood(100 - game.mood)
    addBond(bondGain)
    game.cat.waitSeconds = 0
    game.cat.freezeUntilMs = Date.now() + orderUpdateSeconds * 1000
    scheduleNextOrder()
  }
}