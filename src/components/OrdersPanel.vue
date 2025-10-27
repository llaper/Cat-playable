<template>
  <div class="panel compact">
    <div class="order" v-if="currentTarget">
      <div class="thumb">
        <img :src="desiredImage" alt="当前点单" class="avatar" />
      </div>
      <div class="info">
        <div class="row">
          <span class="name">{{ desiredName }}</span>
          <span class="count">× {{ targetCount }}</span>
        </div>
        <div class="bar">
          <div class="bar-fill" :style="{ width: progressPct + '%' }"></div>
          <!-- <div class="bar-label">{{ targetProgress }} / {{ targetCount }}</div> -->
        </div>
      </div>
    </div>
    <div v-else class="empty">还不饿~</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useGameState } from '../state/game'
import { getSpecForLevel } from '../logic/merge-map'

const game = useGameState()
const desiredName = computed(() => game.cat.desiredName)
const desiredImage = computed(() => getSpecForLevel(game.cat.desiredLevel).image)
const currentOrder = computed(() => game.orders[0])
const currentTarget = computed(() => currentOrder.value?.targets?.[0])
const targetCount = computed(() => currentTarget.value?.count ?? 0)
const targetProgress = computed(() => currentTarget.value?.progress ?? 0)
const phase = computed(() => game.cat.phase)
const freezeUntil = computed(() => game.cat.freezeUntilMs ?? null)

// 轻量计时器：用于2秒冻结窗口到时后自动刷新进度显示
const now = ref(Date.now())
let tick: number | null = null
onMounted(() => {
  tick = setInterval(() => { now.value = Date.now() }, 120) as unknown as number
})
onUnmounted(() => {
  if (tick) { clearInterval(tick); tick = null }
})

const progressPct = computed(() => {
  // 2秒内（开始吃饭后到静默发新单前）保持满格显示
  if (phase.value === 'eating' && freezeUntil.value && now.value < freezeUntil.value) {
    return 100
  }
  const c = targetCount.value
  const p = targetProgress.value
  return c > 0 ? Math.round(100 * p / c) : 0
})
</script>

<style scoped>
.panel.compact {
  width: 220px;
  height: 30px;
  background: linear-gradient(180deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.16) 100%);
  border: 1px solid rgba(255,255,255,0.22);
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.12);
  padding: 8px 10px;
  backdrop-filter: blur(8px);
}
.order { display: grid; grid-template-columns: 44px 1fr; align-items: center; gap: 8px; }
.thumb { display:flex; align-items:center; justify-content:center; }
.avatar { width: 30px; height: 30px; border-radius: 50%; box-shadow: 0 1px 4px rgba(0,0,0,0.12); }
.info { display:flex; flex-direction: column; gap: 6px; }
.row { display:flex; align-items:center; gap: 6px; font-size: 13px; color:#374151; }
.name { font-weight: 700; }
.count { color:#6b7280; }
.bar { position: relative; width:100%; height:6px; background:#e4dfd3; border-radius:8px; overflow:hidden; }
.bar-fill { height:100%; background: linear-gradient(90deg, #7dd3fc, #60a5fa); border-radius:8px; transition: width 0.25s ease; }
.bar-label { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:11px; color:#1f2937; }
.empty { font-size:12px; color:#6b7280; text-align:center; }

/* 移动端优先：缩小卡片与文字，避免与左侧HUD遮挡 */
@media (max-width: 480px) {
  .panel.compact { width: 30vw; padding: 6px 8px; border-radius: 10px; min-width:110px;}
  .order { grid-template-columns: 38px 1fr; gap: 6px; }
  .avatar { width: 26px; height: 26px; }
  .row { font-size: 10px; gap: 4px; }
  .bar { height: 7px; }
  .bar-label { font-size: 6px; }
}

/* 中屏（平板）优化 */
@media (min-width: 481px) and (max-width: 1023px) {
  .panel.compact { width: 210px; }
}
</style>