<template>
  <div class="cat-wrap">
    <div class="cat">
      <img :src="catImage" alt="猫猫状态" class="sprite" :class="phaseClass" />
      <!-- 进食时显示吃到的甜点图片 -->
      <img v-if="phase === 'eating' && lastEatenImage" :src="lastEatenImage" alt="吃到的甜点" class="bite" />
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
function startMeowTimer() {
  if (meowTimer) return
  meowTimer = setInterval(() => {
    if (game.over) return
    playRandom(angryVoices)
  }, 10000) as unknown as number
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
}
.sprite {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: transparent;
  pointer-events: none;
  user-select: none;
}
/* 轻微动效：不同状态采用简洁缓慢的动画，无晕光效果 */
@keyframes catIdleFloat {
  0% { transform: translateY(0); }
  50% { transform: translateY(-1.5px); }
  100% { transform: translateY(0); }
}
@keyframes catImpatientSway {
  0% { transform: rotate(0deg); }
  50% { transform: rotate(1.5deg); }
  100% { transform: rotate(0deg); }
}
@keyframes catEatingNibble {
  0% { transform: scale(1); }
  50% { transform: scale(1.01); }
  100% { transform: scale(1); }
}
@keyframes catAngryShake {
  0% { transform: translateX(0); }
  50% { transform: translateX(1.5px); }
  100% { transform: translateX(0); }
}
.sprite.cat-ordering { animation: catIdleFloat 3.2s ease-in-out infinite; }
.sprite.cat-impatient { animation: catImpatientSway 2.0s ease-in-out infinite; }
.sprite.cat-eating { animation: catEatingNibble 1.8s ease-in-out infinite; }
.sprite.cat-angry { animation: catAngryShake 1.6s ease-in-out infinite; }

.bite {
  position: absolute;
  width: 55px;
  height: 58px;
  right: 26%;
  top: 56%;
  transform: rotate(-8deg);
  filter: drop-shadow(0 2px 8px rgba(0,0,0,0.25));
}
</style>