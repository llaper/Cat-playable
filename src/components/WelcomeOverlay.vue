<template>
  <div class="welcome-wrap" role="dialog" aria-modal="true">
    <div class="card">
      <div class="cat-face">🐾 喵喵欢迎你～（ฅ^•ﻌ•^ฅ）</div>
      <h1 class="title">欢迎光临小店喵！</h1>
      <p class="subtitle">开玩之前，猫猫送上超简明小贴士：</p>

      <ul class="rules">
        <li>按住下方轻轻拖，松手“咻”～甜点起飞喵！</li>
        <li>两个同款撞一撞→升级更高级，噗呲好满足喵！</li>
        <li>别让它掉下桌面，会被扫进垃圾桶，猫猫会皱眉喵～</li>
        <li>看右上角订单，完成有小奖励，猫猫会蹦蹦跳喵！</li>
      </ul>

      <div class="cta">
        <button class="start-btn" @click="handleStart">继续嗷</button>
      </div>
      <div class="hint">提示：开始后可随时再看规则，猫猫会耐心的～</div>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{ (e: 'start'): void }>()
function handleStart() {
  emit('start')
}
</script>

<style scoped>
.welcome-wrap {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(22, 16, 10, 0.55);
  backdrop-filter: blur(6px);
}
.card {
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
.title {
  font-size: clamp(20px, 4.6vw, 28px);
  margin: 4px 0 8px;
}
.subtitle {
  font-size: clamp(14px, 3.4vw, 15px);
  margin: 0 0 8px;
}
.rules {
  text-align: left;
  margin: 0 auto 14px;
  padding: 0 4px;
  max-width: 560px;
  list-style: none;
}
.rules li {
  position: relative;
  padding-left: 20px;
  margin: 6px 0;
  line-height: 1.5;
  font-size: clamp(13px, 3.4vw, 15px);
}
.rules li::before {
  content: '🐱';
  position: absolute;
  left: 0;
  top: 0;
}
.cta { margin: 6px 0 8px; }
.start-btn {
  appearance: none;
  border: 0;
  border-radius: 999px;
  padding: 10px 18px;
  font-size: clamp(14px, 3.8vw, 18px);
  font-weight: 600;
  color: #3b2416;
  background: linear-gradient(90deg, #ffd38f 0%, #ffc371 100%);
  box-shadow: 0 6px 18px rgba(255, 124, 24, 0.35);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.start-btn:hover { filter: brightness(1.08); }
.start-btn:active { transform: translateY(1px); }
.hint {
  margin-top: 6px;
  font-size: 12px;
  color: #7a5b45;
}
@media (max-width: 480px) {
  .card { padding: 16px 14px; }
  .rules li { margin: 6px 0; }
}
</style>