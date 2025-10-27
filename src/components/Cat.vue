<template>
  <div class="cat-wrap">
    <div class="cat">
      <img :src="catImage" alt="猫猫状态" class="sprite" :class="phaseClass" :style="catStyle" />
      <!-- 进食时显示吃到的甜点图片 -->
      <img v-if="phase === 'eating' && lastEatenImage" :src="lastEatenImage" alt="吃到的甜点" class="bite" />
      <div v-if="furious" class="rage" />

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onUnmounted } from 'vue'
import { useGameState } from '../state/game'
import orderingImg from '../assets/image/ordering.png'
import impatientImg from '../assets/image/impatient.png'
import eatingImg from '../assets/image/eating.png'
import angryImg from '../assets/image/angry.png'


const game = useGameState()
const phase = computed(() => game.cat.phase)
const catImage = computed(() => {
  switch (phase.value) {
    case 'ordering': return orderingImg
    case 'impatient': return impatientImg
    case 'eating': return eatingImg
    case 'angry': return angryImg
    default: return orderingImg
  }
})
const phaseClass = computed(() => {
  switch (phase.value) {
    case 'ordering': return 'cat-ordering'
    case 'impatient': return 'cat-impatient'
    case 'eating': return 'cat-eating'
    case 'angry': return 'cat-angry'
    default: return 'cat-ordering'
  }
})
const lastEatenImage = computed(() => game.cat.lastEatenImage)
const mood = computed(() => game.mood)

const orderVoices = Object.values(import.meta.glob('../assets/voice/order/*.{mp3,ogg,wav}', { eager: true, import: 'default', query: '?url' })) as string[]
const impatientVoices = Object.values(import.meta.glob('../assets/voice/impatient/*.{mp3,ogg,wav}', { eager: true, import: 'default', query: '?url' })) as string[]
const eatingVoices = Object.values(import.meta.glob('../assets/voice/eating/*.{mp3,ogg,wav}', { eager: true, import: 'default', query: '?url' })) as string[]
const angryVoices = Object.values(import.meta.glob('../assets/voice/angry/*.{mp3,ogg,wav}', { eager: true, import: 'default', query: '?url' })) as string[]

let audio: HTMLAudioElement | null = null
let orderingVoicePlayed = false
function playRandom(pool: string[]) {
  if (!pool || pool.length === 0) return
  const src = pool[Math.floor(Math.random() * pool.length)] ?? ''
  if (!src) return
  if (!audio) audio = new Audio()
  audio.pause()
  audio.src = src
  audio.currentTime = 0
  audio.volume = 0.85
  audio.play().catch(() => {})
}

let meowTimer: number | null = null
const moodTotalSeconds = 60
const baseMeowMs = 10000
const meowIntervalMs = Math.max(2000, Math.floor(baseMeowMs * (moodTotalSeconds / 100)))
function startMeowTimer() {
  if (meowTimer) return
  meowTimer = setInterval(() => {
    if (game.over) return
    playRandom(angryVoices)
  }, meowIntervalMs) as unknown as number
}
function stopMeowTimer() {
  if (meowTimer) {
    clearInterval(meowTimer as unknown as number)
    meowTimer = null
  }
}


watch(phase, (p) => {
  switch (p) {
    case 'ordering':
      if (!orderingVoicePlayed) {
        playRandom(orderVoices)
        orderingVoicePlayed = true
      }
      break
    case 'impatient': playRandom(impatientVoices); break
    case 'eating': playRandom(eatingVoices); break
    case 'angry': playRandom(angryVoices); break
  }
}, { immediate: true })

watch(mood, (m) => {
  if (m < 30) startMeowTimer()
  else stopMeowTimer()
}, { immediate: true })

watch(() => game.over, (o) => { if (o) stopMeowTimer() })

// 动效强度与速度（阶梯式放大；最后10秒暴怒）
const last10Threshold = (100 * 10) / moodTotalSeconds // ≈16.7
const furious = computed(() => mood.value <= last10Threshold && phase.value !== 'eating' && !game.over)
const catStyle = computed(() => {
  const m = Math.max(0, Math.min(100, mood.value))
  let floatAmp = 2.2 // px
  let swayAmp = 2.2 // deg
  let nibbleScale = 1.02 // scale
  let shakeAmp = 2.2 // px
  let speedMul = 1.15
  let biteDepth = 4 // px
  let eatBobAmp = 2 // px
  let eatTilt = 2 // deg
  if (m <= 60 && m > 30) { // 不耐烦（更夸张）
    floatAmp = 3.2; swayAmp = 4.0; nibbleScale = 1.04; shakeAmp = 4.0; speedMul = 1.35; biteDepth = 6; eatBobAmp = 3; eatTilt = 3
  } else if (m <= 30 && m > last10Threshold) { // 生气（更夸张）
    floatAmp = 4.8; swayAmp = 6.0; nibbleScale = 1.06; shakeAmp = 6.5; speedMul = 1.55; biteDepth = 8; eatBobAmp = 4; eatTilt = 4
  } else if (m <= last10Threshold) { // 暴跳如雷（最后10秒，更夸张）
    floatAmp = 7.0; swayAmp = 8.5; nibbleScale = 1.08; shakeAmp = 10.0; speedMul = 1.85; biteDepth = 12; eatBobAmp = 6; eatTilt = 6
  }
  const idleDur = `${(3.2 / speedMul).toFixed(2)}s`
  const impatientDur = `${(2.0 / speedMul).toFixed(2)}s`
  const eatingDur = `${(1.8 / speedMul).toFixed(2)}s`
  const angryDur = `${(1.6 / speedMul).toFixed(2)}s`
  const filter = furious.value ? 'contrast(1.12) saturate(1.18)' : 'none'
  return {
    '--float-amp': `${floatAmp}px`,
    '--sway-amp': `${swayAmp}deg`,
    '--nibble-scale': `${nibbleScale}`,
    '--shake-amp': `${shakeAmp}px`,
    '--bite-depth': `-${biteDepth}px`,
    '--eat-bob-amp': `${eatBobAmp}px`,
    '--eat-tilt': `${eatTilt}deg`,
    '--idle-dur': idleDur,
    '--impatient-dur': impatientDur,
    '--eating-dur': eatingDur,
    '--angry-dur': angryDur,
    'filter': filter,
  } as Record<string, string>
})

onUnmounted(() => {
  if (audio) {
    audio.pause()
    audio.src = ''
    audio = null
  }
  stopMeowTimer()
})
</script>

<style scoped>
.cat-wrap {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.cat {
  position: relative;
  width: min(240px, 32vw);
  height: min(200px, 26vh);
  perspective: 800px;
  transform-style: preserve-3d;
}
.sprite {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: transparent;
  pointer-events: none;
  user-select: none;
}
/* 阶梯式动效：变量控制振幅与速度 */
@keyframes catIdleFloat {
  0% { transform: translateY(0); }
  50% { transform: translateY(var(--float-amp, 1.5px)); }
  100% { transform: translateY(0); }
}
@keyframes catImpatientSway {
  0% { transform: rotate(0deg); }
  50% { transform: rotate(var(--sway-amp, 1.5deg)); }
  100% { transform: rotate(0deg); }
}
@keyframes catEatingNibble {
  0% { transform: translateY(0) rotateX(0deg) scale(1); }
  50% { transform: translateY(calc(var(--eat-bob-amp, 2px) * -1)) rotateX(calc(var(--eat-tilt, 2deg) * 0.6)) scale(var(--nibble-scale, 1.02)); }
  100% { transform: translateY(0) rotateX(0deg) scale(1); }
}
@keyframes catAngryShake {
  0% { transform: translateX(0); }
  50% { transform: translateX(var(--shake-amp, 1.5px)); }
  100% { transform: translateX(0); }
}
.sprite.cat-ordering { animation: catIdleFloat var(--idle-dur, 3.2s) ease-in-out infinite; }
.sprite.cat-impatient { animation: catImpatientSway var(--impatient-dur, 2.0s) ease-in-out infinite; }
.sprite.cat-eating { animation: catEatingNibble var(--eating-dur, 1.8s) ease-in-out infinite; }
.sprite.cat-angry { animation: catAngryShake var(--angry-dur, 1.6s) ease-in-out infinite; }

.bite {
  position: absolute;
  width: 55px;
  height: 58px;
  right: 26%;
  top: 56%;
  transform: rotate(-8deg);
  filter: drop-shadow(0 2px 8px rgba(0,0,0,0.25));
  will-change: transform;
  animation: biteNomm var(--eating-dur, 1.8s) ease-in-out infinite alternate;
}
@keyframes biteNomm {
  0% { transform: rotate(-8deg) translateY(0) scale(1); }
  100% { transform: rotate(-10deg) translateY(var(--bite-depth, -6px)) scale(var(--nibble-scale, 1.02)); }
}
/* 暴怒效果：最后10s 显示竖线闪烁，配合不冲突的轻微滤镜 */
.rage {
  position: absolute;
  inset: -6px;
  pointer-events: none;
  background: repeating-linear-gradient(90deg, rgba(255, 80, 80, 0.18) 0px, rgba(255, 80, 80, 0.18) 2px, transparent 4px);
  animation: rageBlink 0.6s ease-in-out infinite;
}
@keyframes rageBlink {
  0% { opacity: 0; }
  50% { opacity: 0.35; }
  100% { opacity: 0; }
}
</style>