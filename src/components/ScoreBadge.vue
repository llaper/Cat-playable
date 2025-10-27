<template>
  <div class="badge">
    <div class="bar mood" :class="phaseClass">
      <span class="label">心情</span>
      <div class="track">
        <div class="fill" :style="{ width: moodPct + '%' }"></div>
        <div class="shine"></div>
      </div>
    </div>
    <div class="bar bond">
      <span class="label">亲密</span>
      <div class="track">
        <div class="fill" :style="{ width: bondPct + '%' }"></div>
        <div class="shine"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameState } from '../state/game'

const game = useGameState()
const moodPct = computed(() => Math.max(0, Math.min(100, game.mood)))
const bondPct = computed(() => Math.max(0, Math.min(100, game.bond)))
const phaseClass = computed(() => game.cat.phase)
</script>

<style scoped>
.badge {
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.16) 100%);
  border: 1px solid rgba(255,255,255,0.22);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
  backdrop-filter: blur(8px);
  width: 220px;
}
.bar {
  display: grid;
  grid-template-columns: 58px 1fr;
  align-items: center;
  gap: 3px;
}
.label {
  font-weight: 800;
  font-size: 12px;
  color: #6b4b1c;
}
.track {
  position: relative;
  width: 100%;
  height: 14px;
  border-radius: 999px;
  background: linear-gradient(180deg, #f2e9dd 0%, #e8d8c0 100%);
  box-shadow: inset 0 2px 6px rgba(0,0,0,0.15);
  overflow: hidden;
}
.fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0%;
  border-radius: 999px;
  transition: width 0.3s ease;
}
/* 默认（点单） */
.mood.ordering .fill {
  background: linear-gradient(90deg, #7dd3fc 0%, #60a5fa 60%, #2563eb 100%);
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.35);
}
/* 不耐烦：橙色，并轻微脉动 */
.mood.impatient .track { background: linear-gradient(180deg, #fff3e0 0%, #fde3c2 100%); }
.mood.impatient .fill {
  background: linear-gradient(90deg, #f59e0b 0%, #f97316 60%, #ea580c 100%);
  animation: pulse 1.2s infinite ease-in-out;
}
/* 生气：红色发光 */
.mood.angry .track { background: linear-gradient(180deg, #fee2e2 0%, #fecaca 100%); }
.mood.angry .fill {
  background: linear-gradient(90deg, #ef4444 0%, #dc2626 60%, #b91c1c 100%);
  animation: glowRed 1s infinite alternate;
}
/* 进食：绿色舒缓呼吸 */
.mood.eating .track { background: linear-gradient(180deg, #e9fbe7 0%, #d4f7cc 100%); }
.mood.eating .fill {
  background: linear-gradient(90deg, #4ade80 0%, #22c55e 60%, #16a34a 100%);
  animation: breath 1.6s infinite ease-in-out;
}

@keyframes pulse {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(1.08); }
}
@keyframes glowRed {
  0% { box-shadow: 0 0 8px rgba(239,68,68,0.45); }
  100% { box-shadow: 0 0 14px rgba(239,68,68,0.85); }
}
@keyframes breath {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(1.05); }
}

.bond .fill {
  background: linear-gradient(90deg, #fda4af 0%, #fb7185 60%, #ef4444 100%);
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.35);
}
.shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.15) 40%, rgba(255,255,255,0) 100%);
  pointer-events: none;
}
/* 移动端：统一 HUD 卡片宽度，避免拥挤与重叠 */
@media (max-width: 480px) {
  .badge { width: 30vw; height:30px; padding: 6px 8px; border-radius: 10px; }
  .bar { grid-template-columns: 2fr 6fr; gap: 1px; }
  .label { font-size: 11px; }
  .track { height: 8px; }
}
@media (min-width: 481px) and (max-width: 1023px) {
  .badge { width: 210px; }
}
</style>