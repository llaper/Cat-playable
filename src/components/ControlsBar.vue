<template>
  <div class="controls">
    <div class="row">
      <button class="pill icon" title="音量" @click="toggleVolume">🔊</button>
      <button class="pill icon" title="规则" @click="openRules">📜</button>
    </div>
    <div v-if="volumeOpen" class="panel">
      <div class="item">
        <span class="label">背景</span>
        <input type="range" min="0" max="100" step="1" :value="bgmPct" @input="onBgmChange($event)" />
        <span class="val">{{ bgmPct }}%</span>
      </div>
      <div class="item">
        <span class="label">音效</span>
        <input type="range" min="0" max="100" step="1" :value="sfxPct" @input="onSfxChange($event)" />
        <span class="val">{{ sfxPct }}%</span>
      </div>
      <div class="ops"><button class="close" @click="toggleVolume">收起</button></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { getBgmVolume, setBgmVolume, getSfxVolume, setSfxVolume } from '../logic/audio'

const volumeOpen = ref(false)
const bgmPct = ref(Math.round((getBgmVolume() || 1.0) * 100))
const sfxPct = ref(Math.round((getSfxVolume() || 1.0) * 100))

function toggleVolume() {
  volumeOpen.value = !volumeOpen.value
  if (volumeOpen.value) {
    // 每次展开时刷新当前音量显示，避免与进入游戏后的 100% 不一致
    bgmPct.value = Math.round((getBgmVolume() || 1.0) * 100)
    sfxPct.value = Math.round((getSfxVolume() || 1.0) * 100)
  }
}
function openRules() { window.dispatchEvent(new CustomEvent('open-rules')) }
function onBgmChange(ev: Event) {
  const v = Number((ev.target as HTMLInputElement).value || '100')
  bgmPct.value = v
  setBgmVolume(Math.max(0, Math.min(1, v / 100)))
}
function onSfxChange(ev: Event) {
  const v = Number((ev.target as HTMLInputElement).value || '100')
  sfxPct.value = v
  setSfxVolume(Math.max(0, Math.min(1, v / 100)))
}

// 进入游戏后设置为 100%，同步 UI（来自 Main 的自定义事件）
window.addEventListener('game-started', () => {
  bgmPct.value = 100
  sfxPct.value = 100
})
</script>

<style scoped>
.controls {
  position: absolute;
  left: 16px;
  top: calc(env(safe-area-inset-top, 0px) + 86px);
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 6px;
  touch-action: auto;
  pointer-events: auto;
}
.row { display: flex; gap: 6px; }
.pill {
  appearance: none;
  border: 1px solid rgba(255,255,255,0.22);
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.16) 100%);
  box-shadow: 0 8px 20px rgba(0,0,0,0.12);
  backdrop-filter: blur(8px);
  color: #2b1b10;
}
.pill.icon { width: 30px; height: 30px; display: grid; place-items: center; font-size: 14px; padding: 0; }
.panel {
  width: 180px;
  padding: 6px 8px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.22);
  background: linear-gradient(180deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.16) 100%);
  box-shadow: 0 8px 20px rgba(0,0,0,0.12);
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.item { display: grid; grid-template-columns: 38px 1fr 30px; align-items: center; gap: 4px; }
.label { font-size: 11px; font-weight: 700; color: #6b4b1c; }
.val { font-size: 11px; color: #6b7280; text-align: right; }
input[type="range"] { width: 100%; }
.ops { display: flex; justify-content: flex-end; }
.close { appearance: none; border: 0; border-radius: 999px; padding: 3px 6px; font-size: 11px; color: #3b2416; background: linear-gradient(90deg, #ffd38f 0%, #ffc371 100%); box-shadow: 0 6px 18px rgba(255, 124, 24, 0.25); }

@media (max-width: 480px) {
  .controls { left: 12px; top: calc(env(safe-area-inset-top, 0px) + 90px); }
  .panel { width: 28vw; min-width: 140px; }
}
</style>