<template>
  <div class="pastry-hint">
    <div class="bar" v-if="items.length">
      <div v-for="(item, idx) in items" :key="idx" class="thumb-wrap">
        <img :src="item.src" :alt="'pastry ' + item.order" class="thumb" />
      </div>
    </div>
    <div v-else class="empty">暂无糕点素材</div>
  </div>
</template>

<script setup lang="ts">
// 仅显示 1.png ~ 6.png，按顺序
const modules = import.meta.glob('../assets/image/*.png', { eager: true, import: 'default' }) as Record<string, string>
const byName = new Map<string, string>()
for (const [path, src] of Object.entries(modules)) {
  const name = (path.split('/').pop() || '').toLowerCase()
  byName.set(name, src)
}
const targets = ['1.png','2.png','3.png','4.png','5.png','6.png']
const items = targets
  .map((name) => ({ order: parseInt(name, 10), src: byName.get(name) }))
  .filter((x): x is { order: number; src: string } => !!x.src)
</script>

<style scoped>
.pastry-hint {
  width: auto;
  position: absolute;
  left: 50%;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
  transform: translateX(-50%);
  z-index: 28;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0;
}
.bar {
  position: relative;
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  height: 44px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.16) 100%);
  border: 1px solid rgba(255,255,255,0.22);
  box-shadow: 0 8px 20px rgba(0,0,0,0.12);
  backdrop-filter: blur(8px);
}
.bar::after { /* 保留柔光层增强融合 */
  content: '';
  position: absolute;
  inset: 0;
  /* background: linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.08) 40%, rgba(255,255,255,0) 100%); */
  pointer-events: none;
}
.thumb-wrap {
  width: clamp(26px, 6.5vw, 38px);
  height: clamp(26px, 6.5vw, 38px);
  display: grid;
  place-items: center;
}
.thumb {
  width: clamp(26px, 6.5vw, 38px);
  height: clamp(26px, 6.5vw, 38px);
  object-fit: contain;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.12));
}
.empty {
  font-size: 12px;
  color: #a37487;
}

/* 移动端优先：压缩高度与图标尺寸，避免与桌面底部重叠 */
@media (max-width: 480px) {
  .bar { height: clamp(34px, 9vw, 46px); padding: 6px 10px; gap: 8px; }
}

/* 中屏（平板）优化 */
@media (min-width: 481px) and (max-width: 1023px) {
  .bar { height: 40px; gap: 9px; }
}
</style>