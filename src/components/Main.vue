<script setup lang="ts">
import { onMounted, ref } from 'vue'
import OrdersPanel from './OrdersPanel.vue'
import ScoreBadge from './ScoreBadge.vue'
import GameStage from './GameStage.vue'
import Cat from './Cat.vue'
import PastryList from './PastryList.vue'
import WelcomeOverlay from './WelcomeOverlay.vue'
import { ensureCatOrdering } from '../logic/gameplay/orders'
import { startBgLoop, initBgMusicPersistence } from '../logic/audio'

const showWelcome = ref(true)
function handleStart() {
  showWelcome.value = false
  try { localStorage.setItem('welcome_seen_v1', '1') } catch {}
  // 确保在用户主动点击后尝试启动背景音乐
  startBgLoop()
}

onMounted(() => {
  try {
    const seen = localStorage.getItem('welcome_seen_v1')
    showWelcome.value = !seen
  } catch { showWelcome.value = true }
  ensureCatOrdering()
  initBgMusicPersistence()
  // 若浏览器限制自动播放，真正的播放将在用户点击“开始”后触发
  startBgLoop()
})
</script>

<template>
  <div class="main">
    <div class="center">
      <div class="stage-stack">
        <GameStage class="gamestage" />
        <!-- 猫坐在前方凳子上，底边对齐垃圾线（19% 位置） -->
        <Cat class="cat-on-stool" />
      </div>
      <PastryList />
    </div>
    <OrdersPanel class="orders" />
    <ScoreBadge class="score" />
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

@media (max-width: 480px) {
  .main { padding: var(--safe-top, 76px) 10px var(--safe-bottom, 12px); }
  .center { gap: 6px; width: min(360px, 94vw); }
  .stage-stack { width: clamp(240px, 88vw, 420px); height: clamp(380px, 58vh, 620px); }
  /* 小屏下猫再下移一点，贴近桌面前沿 */
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
