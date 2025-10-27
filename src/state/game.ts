import { defineStore } from 'pinia'

export interface InventoryItem {
  id: number
  type: string
  count: number
}

export interface GameOrderTarget {
  level: number
  count: number
  progress: number
}

export interface GameOrder {
  tier: number
  reward?: number
  targets: GameOrderTarget[]
}

// 猫猫心情与点餐相关类型
export type CatPhase = 'ordering' | 'impatient' | 'eating' | 'angry'
export interface CatState {
  phase: CatPhase
  desiredLevel: number
  desiredName: string
  waitSeconds: number
  lastEatenImage?: string
  freezeUntilMs?: number | null
}

export interface GameState {
  coins: number
  mood: number
  bond: number
  items: InventoryItem[]
  orders: GameOrder[]
  over: boolean
  win: boolean
  cat: CatState
  tableCounts: Record<number, number>
  removeQueue: number[]
  consumePlan: { level: number; count: number; image?: string } | null
  nextSpawnLevel: number | null
  orderHistory: { level: number; count: number }[]
  moodTimerId: number | null
  cooldownTimerId: number | null
  orderUpdateTimerId: number | null
  // 新增：开始/结束时间戳（用于显示总用时）
  startedAtMs?: number | null
  endedAtMs?: number | null
}

export const useGameStore = defineStore('game', {
  state: (): GameState => ({
    coins: 450,
    mood: 100,
    bond: 0,
    items: [],
    orders: [],
    over: false,
    win: false,
    cat: { phase: 'ordering', desiredLevel: 2, desiredName: '曲奇', waitSeconds: 0, freezeUntilMs: null },
    tableCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    removeQueue: [],
    consumePlan: null,
    nextSpawnLevel: null,
    orderHistory: [],
    moodTimerId: null,
    cooldownTimerId: null,
    orderUpdateTimerId: null,
    startedAtMs: null,
    endedAtMs: null
  }),
  actions: {
    markGameStart() {
      if (!this.startedAtMs) this.startedAtMs = Date.now()
    },
    markGameEnd(win: boolean) {
      this.over = true
      this.win = !!win
      if (!this.endedAtMs) this.endedAtMs = Date.now()
    },
    addCoins(amount: number) { this.coins += amount },
    addMood(delta: number) { this.mood = Math.max(0, Math.min(100, Math.round(this.mood + delta))) },
    addBond(delta: number) {
      this.bond = Math.max(0, Math.min(100, Math.round(this.bond + delta)))
      if (this.bond >= 100 && !this.win) {
        this.markGameEnd(true)
      }
    },
    setOrders(orders: GameOrder[]) { this.orders = orders },
    setGameOver() { this.markGameEnd(false) },
    setMoodTimer(id: number | null) { this.moodTimerId = id },
    setCooldownTimer(id: number | null) { this.cooldownTimerId = id },
    setOrderUpdateTimer(id: number | null) { this.orderUpdateTimerId = id },
    resetGame() {
      this.coins = 450
      this.mood = 100
      this.bond = 0
      this.items = []
      this.orders = []
      this.over = false
      this.win = false
      this.cat.phase = 'ordering'
      this.cat.desiredLevel = 0
      this.cat.desiredName = ''
      this.cat.waitSeconds = 0
      this.cat.lastEatenImage = undefined
      this.cat.freezeUntilMs = null
      this.tableCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
      this.removeQueue = []
      this.consumePlan = null
      this.nextSpawnLevel = null
      this.orderHistory = []
      if (this.moodTimerId) { try { clearInterval(this.moodTimerId as any) } catch {} }
      if (this.cooldownTimerId) { try { clearTimeout(this.cooldownTimerId as any) } catch {} }
      if (this.orderUpdateTimerId) { try { clearTimeout(this.orderUpdateTimerId as any) } catch {} }
      this.moodTimerId = null
      this.cooldownTimerId = null
      this.orderUpdateTimerId = null
      this.startedAtMs = null
      this.endedAtMs = null
    }
  }
})

export function useGameState() { return useGameStore() }
export function addCoins(amount: number) { return useGameStore().addCoins(amount) }
export function addMood(delta: number) { return useGameStore().addMood(delta) }
export function addBond(delta: number) { return useGameStore().addBond(delta) }
export function setOrders(orders: GameOrder[]) { return useGameStore().setOrders(orders) }
export function setGameOver() { return useGameStore().setGameOver() }
export function resetGame() { return useGameStore().resetGame() }
export function markGameStart() { return useGameStore().markGameStart() }