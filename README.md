# Vue 3 + TypeScript + Vite

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about the recommended Project Setup and IDE Support in the [Vue Docs TypeScript Guide](https://vuejs.org/guide/typescript/overview.html#project-setup).

## 猫猫点餐与心情系统
- 心情值范围 `0-100`，低于 `60` 游戏结束（心情控制在 `src/state/game.ts` 的 `addMood` 中触发）。
- 等待心情衰减：基础 `0.5/秒`，并随等待时长递增 `0.04 * waitSeconds / 秒`。
- 吃到想吃的甜点：心情 `+15`，立即刷新下一单。
- 猫猫状态（对应图片前缀）：
  - 状态1：点餐（ordering）
  - 状态2：不耐烦（impatient）
  - 状态3：吃上了（eating）
  - 状态4：等不及了（outraged）
- 甜点清单（等级映射）：
  1. 巧克力（Lv1）
  2. 曲奇（Lv2）
  3. 甜甜圈（Lv3）
  4. 马卡龙（Lv4）
  5. 水果蛋糕（Lv5）
  6. 巨无霸蛋糕（Lv6）

## 接入点与代码位置
- 全局状态与心情：`src/state/game.ts`（包含 `mood`、`cat`、`addMood`）。
- 点餐与心情循环：`src/logic/gameplay/orders.ts`（`ensureCatOrdering` 启动循环，`recordMerge` 喂食匹配等级）。
- HUD 组件：
  - 心情显示：`src/components/ScoreBadge.vue`（已改为展示“心情值”）。
  - 猫猫点餐：`src/components/OrdersPanel.vue`（显示当前想吃、当前状态与等待秒数）。
- 入口接线：`src/components/Main.vue`（调用 `ensureCatOrdering()`）。

## 运行与预览
- `npm install`
- `npm run dev` 启动后访问终端提示的地址（示例：`http://localhost:5174/`）。

## 游戏规则回顾
- 猫猫持续点单，吃到想吃的甜点心情变好，随后继续点单。
- 随等待时间心情逐步变差；等待超过约 `10s` 进入“不耐烦”。
- 心情低于 `65` 显示“等不及了”，低于 `60` 触发游戏结束。
- 合并生成物体等级与当前需求相同视为“吃上了”，心情 `+15` 并刷新新订单。
