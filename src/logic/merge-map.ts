export type Level = number

// 等级映射：1→6，6为最大等级（不可再合并）
const MERGE_MAP: Record<number, number | null> = {
  1: 2,
  2: 3,
  3: 4,
  4: 5,
  5: 6,
  6: null
}

export function getNextLevel(level: number): number | null {
  return MERGE_MAP[level] ?? null
}

export function isMaxLevel(level: number): boolean {
  return MERGE_MAP[level] == null
}

export interface LevelSpec { radius: number; color: string; image: string }

// 等级规格（半径随等级递增，颜色区分，并绑定素材图片）
const LEVEL_SPEC: Record<number, LevelSpec> = {
  1: { radius: 30, color: '#3498db', image: new URL('../assets/image/1.png', import.meta.url).href },
  2: { radius: 36, color: '#e67e22', image: new URL('../assets/image/2.png', import.meta.url).href },
  3: { radius: 42, color: '#9b59b6', image: new URL('../assets/image/3.png', import.meta.url).href },
  4: { radius: 46, color: '#16a085', image: new URL('../assets/image/4.png', import.meta.url).href },
  5: { radius: 54, color: '#e74c3c', image: new URL('../assets/image/5.png', import.meta.url).href },
  6: { radius: 65, color: '#f1c40f', image: new URL('../assets/image/6.png', import.meta.url).href }
}

export function getSpecForLevel(level: number): LevelSpec {
  return LEVEL_SPEC[level] ?? LEVEL_SPEC[1]!
}