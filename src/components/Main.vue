<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import OrdersPanel from './OrdersPanel.vue'
import ScoreBadge from './ScoreBadge.vue'
import GameStage from './GameStage.vue'
import Cat from './Cat.vue'
import PastryList from './PastryList.vue'
import WelcomeOverlay from './WelcomeOverlay.vue'
import ControlsBar from './ControlsBar.vue'
import { ensureCatOrdering } from '../logic/gameplay/orders'
import { startBgLoop, initBgMusicPersistence, setBgmVolume, setSfxVolume } from '../logic/audio'
import { markGameStart, useGameState } from '../state/game.js'
import { getRandomQuote } from '../logic/quotes'

const game = useGameState()

const showWelcome = ref(true)
function handleStart() {
  showWelcome.value = false
  try { localStorage.setItem('welcome_seen_v1', '1') } catch {}
  startBgLoop()
  // 用户点击开始游戏时才记录游戏开始时间
  markGameStart()
}

// 经典语录（贴纸）：吃饭状态显示 5s
const quoteVisible = ref(false)
const currentQuote = ref('')
const showQuote = computed(() => game.cat.phase === 'eating' && quoteVisible.value)
let quoteTimer: number | null = null
function showEatingQuote() {
  currentQuote.value = getRandomQuote()
  quoteVisible.value = true
  if (quoteTimer) { clearTimeout(quoteTimer as any); quoteTimer = null }
  quoteTimer = setTimeout(() => { quoteVisible.value = false }, 8000) as unknown as number
}
watch(() => game.cat.phase, (p) => { if (p === 'eating') showEatingQuote() })

// 自适应行数显示（智能分行，确保完整显示所有文字）
const displayQuote = computed(() => splitQuoteToLines(currentQuote.value))
function splitQuoteToLines(text: string): string {
  const t = (text || '').trim()
  if (!t) return ''
  
  // 短文字直接显示
  if (t.length <= 15) {
    return t
  }
  
  // 长文字智能分行，优先在标点处分行
  const maxLineLength = 20 // 每行最大字符数
  const puncts = ['，','。','；','、','！','？',',','.',';','!','?']
  
  // 如果文字长度适中，尝试分为两行
  if (t.length <= maxLineLength * 2) {
    const mid = Math.floor(t.length / 2)
    let breakIdx = -1
    
    // 在中位附近寻找标点
    for (let i = mid; i >= Math.max(0, mid - 8); i--) {
      const char = t[i]
      if (char && puncts.includes(char)) { breakIdx = i + 1; break }
    }
    if (breakIdx < 0) {
      for (let i = mid; i < Math.min(t.length, mid + 8); i++) {
        const char = t[i]
        if (char && puncts.includes(char)) { breakIdx = i + 1; break }
      }
    }
    if (breakIdx < 0) breakIdx = mid
    
    const line1 = t.slice(0, breakIdx).trim()
    const line2 = t.slice(breakIdx).trim()
    
    return line1 + '\n' + line2
  }
  
  // 超长文字分为多行
  const lines: string[] = []
  let remaining = t
  
  while (remaining.length > 0) {
    if (remaining.length <= maxLineLength) {
      lines.push(remaining)
      break
    }
    
    let breakIdx = maxLineLength
    // 尝试在标点处断行
    for (let i = Math.min(maxLineLength, remaining.length - 1); i >= maxLineLength - 8; i--) {
      const char = remaining[i]
      if (char && puncts.includes(char)) {
        breakIdx = i + 1
        break
      }
    }
    
    lines.push(remaining.slice(0, breakIdx).trim())
    remaining = remaining.slice(breakIdx).trim()
  }
  
  return lines.join('\n')
}

// 根据两行的最长行字符数自适应宽度，字号保持稳定
const quoteStyle = computed(() => {
  // 字号稍微增大以提升清晰度；宽度由 CSS 的 fit-content 控制
  return {
    fontSize: 'clamp(13px, 2.6vw, 16px)'
  }
})

onMounted(() => {
  // 首次载入即将音量设定为 100%
  setBgmVolume(1.0)
  setSfxVolume(1.0)
  window.dispatchEvent(new CustomEvent('game-started'))
  // 移除这里的markGameStart()，改为在用户点击开始游戏时调用

  try {
    const seen = localStorage.getItem('welcome_seen_v1')
    showWelcome.value = !seen
  } catch { showWelcome.value = true }
  ensureCatOrdering()
  initBgMusicPersistence()
  startBgLoop()
  window.addEventListener('open-rules', () => { showWelcome.value = true })
})
</script>

<template>
  <div class="main">
    <div class="center">
      <div class="stage-stack">
        <GameStage class="gamestage" />
        <div class="cat-on-stool">
          <Cat />
          <div v-if="showQuote" class="quote-note" :style="quoteStyle">{{ displayQuote }}</div>
        </div>
      </div>
      <PastryList />
    </div>
    <OrdersPanel class="orders" />
    <ScoreBadge class="score" />
    <ControlsBar />
    <PastryList />
    <WelcomeOverlay v-if="showWelcome" @start="handleStart" />
  </div>
</template>

<style scoped>
.main {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: url('../assets/background.jpg') center / cover no-repeat;
  overflow: hidden;
  min-width: 0;
  min-height: 500px;
  padding: var(--safe-top, 68px) var(--side-pad, 12px) var(--safe-bottom, 12px);
  overscroll-behavior-y: none;
  overscroll-behavior-x: none;
  touch-action: none;
}
.center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  width: min(600px, 92vw);
  height: auto;
}
.stage-stack {
  position: relative;
  width: clamp(240px, 84vw, 520px);
  height: clamp(420px, 62vh, 700px);
  touch-action: none;
  overscroll-behavior: none;
}
.gamestage { width: 100%; height: 100%; touch-action: none; }

.orders {
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 16px);
  right: 16px;
  z-index: 30;
}
.score {
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 16px);
  left: 16px;
  z-index: 30;
}

/* 猫：在前方凳子上，较之前整体下移 */
.cat-on-stool {
  position: absolute;
  left: 50%;
  top: 22%;
  transform: translate(-50%, -100%);
  pointer-events: none;
  z-index: 1;
}
.cat-on-stool :deep(.cat) {
  width: clamp(160px, 28%, 240px);
  height: clamp(120px, 22%, 200px);
}

/* 经典语录贴纸（贴着猫猫上方，轻柔不抢眼） */
.quote-note {
  position: absolute;
  bottom: calc(100% - 20px);
  left: 50%;
  transform: translateX(-50%);
  /* 宽度完全自适应，不限制最大宽度，让文字完整显示 */
  width: fit-content;
  min-width: 80px;
  padding: 6px 8px;
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(255,250,235,0.58) 100%);
  border: 1px solid rgba(255, 206, 120, 0.35);
  color: rgba(62,42,25,0.96);
  line-height: 1.45;
  letter-spacing: 0.2px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
  backdrop-filter: blur(4px);
  pointer-events: none;
  z-index: 2;
  animation: thoughtPop 0.22s ease-out;
  white-space: pre-line;
  word-break: keep-all;
  display: inline-block;
  /* 确保一行和多行显示的统一外观 */
  min-height: 1.45em;
  vertical-align: top;
  /* 移除行数限制，允许多行显示，确保所有文字都能显示 */
}
.quote-note::after {
  content: '';
  position: absolute;
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.78), rgba(255,250,235,0.58));
  border: 1px solid rgba(255, 206, 120, 0.35);
  box-shadow: 0 2px 6px rgba(0,0,0,0.10);
}
@keyframes thoughtPop {
  0% { opacity: 0; transform: translateX(-50%) scale(0.92); }
  100% { opacity: 1; transform: translateX(-50%) scale(1); }
}

@media (max-width: 480px) {
  .main { padding: var(--safe-top, 76px) 10px var(--safe-bottom, 12px); }
  .center { gap: 6px; width: min(360px, 94vw); }
  .stage-stack { width: clamp(240px, 88vw, 420px); height: clamp(380px, 58vh, 620px); }
  .cat-on-stool { top: 24%; }
}

@media (min-width: 481px) and (max-width: 1023px) {
  .main { padding: var(--safe-top, 72px) 14px var(--safe-bottom, 14px); }
  .center { width: min(640px, 92vw); }
  .stage-stack { width: clamp(320px, 80vw, 560px); height: clamp(460px, 60vh, 680px); }
}

@media (min-width: 1024px) {
  .main { padding: var(--safe-top, 64px) 16px var(--safe-bottom, 16px); }
  .center { width: min(720px, 68vw); }
  .stage-stack { width: clamp(420px, 54vw, 640px); height: clamp(520px, 60vh, 760px); }
}
</style>
