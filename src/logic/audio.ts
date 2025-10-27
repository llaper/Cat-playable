let bgAudio: HTMLAudioElement | null = null
let prepared = false
let sfxUrls: string[] = []
let bgmUrls: string[] = []
let bgFallbackUrl: string | null = null

let listenersBound = false
// 背景音乐基础音量（原音频的 20%），后续基于此缩放
const bgmBaseVolume = 0.2
// 主音量（0~1，作为缩放系数），默认值会在 onMounted 被设置为 1.0
let bgmMasterVolume = 0.5
let sfxMasterVolume = 0.8

function ensurePrepared() {
  if (prepared) return
  // 读取本地持久化音量设置（如存在）
  try {
    const bv = localStorage.getItem('bgm_volume')
    const sv = localStorage.getItem('sfx_volume')
    if (bv) bgmMasterVolume = Math.max(0, Math.min(1, parseFloat(bv)))
    if (sv) sfxMasterVolume = Math.max(0, Math.min(1, parseFloat(sv)))
  } catch {}
  // 背景音乐集合
  const bgmModules = import.meta.glob('../assets/bgmusic/*.{mp3,ogg,wav}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
  bgmUrls = Object.values(bgmModules)
  bgFallbackUrl = new URL('../assets/bgmusic/background_C32kbps.mp3', import.meta.url).href
  // 合成音效集合
  const modules = import.meta.glob('../assets/poping/*', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
  sfxUrls = Object.values(modules)
  prepared = true
}

export function startBgLoop() {
  ensurePrepared()
  const pickRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]
  const shouldPickNew = !bgAudio || bgAudio.currentTime === 0
  const trackUrl = shouldPickNew
    ? (bgmUrls.length ? pickRandom(bgmUrls) : (bgFallbackUrl ?? ''))
    : (bgAudio?.src ?? (bgFallbackUrl ?? ''))
  if (!trackUrl) return
  if (!bgAudio) bgAudio = new Audio()
  try {
    if (shouldPickNew) {
      bgAudio.pause()
      bgAudio.src = trackUrl
      bgAudio.loop = true
      bgAudio.preload = 'auto'
      bgAudio.currentTime = 0
    }
    // 背景音量 = 基础音量（20%）× 主音量缩放（0~1）
    bgAudio.volume = Math.max(0, Math.min(1, bgmBaseVolume * bgmMasterVolume))
    // 持久播放事件
    bgAudio.onpause = () => {
      try {
        if (document.visibilityState === 'visible' && bgAudio && !bgAudio.ended) {
          bgAudio.play().catch(() => {})
        }
      } catch {}
    }
    bgAudio.onended = () => { try { startBgLoop() } catch {} }
    bgAudio.play().catch(() => { /* autoplay block */ })
  } catch { /* ignore */ }
}

export function pauseBgLoop() { if (bgAudio) bgAudio.pause() }

export function initBgMusicPersistence() {
  if (listenersBound) return
  listenersBound = true
  try {
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') startBgLoop() })
    window.addEventListener('focus', () => { startBgLoop() })
  } catch { /* ignore */ }
}

export function playMergeSfx() {
  ensurePrepared()
  if (!sfxUrls.length) return
  const url = sfxUrls[Math.floor(Math.random() * sfxUrls.length)]
  try {
    const a = new Audio(url)
    a.preload = 'auto'
    a.volume = sfxMasterVolume
    a.playbackRate = 2.0
    const startAtPercent = 0.2
    const startPlayback = () => {
      try { if (!isNaN(a.duration) && isFinite(a.duration) && a.duration > 0) a.currentTime = a.duration * startAtPercent } catch {}
      a.play().catch(() => { /* ignore */ })
    }
    if (a.readyState >= 1) { startPlayback() } else {
      a.addEventListener('loadedmetadata', startPlayback, { once: true })
      a.addEventListener('canplay', startPlayback, { once: true })
    }
  } catch { /* ignore */ }
}

// 音量设置与读取（背景）
export function setBgmVolume(v: number) {
  bgmMasterVolume = Math.max(0, Math.min(1, v))
  try { localStorage.setItem('bgm_volume', String(bgmMasterVolume)) } catch {}
  if (bgAudio) { bgAudio.volume = Math.max(0, Math.min(1, bgmBaseVolume * bgmMasterVolume)) }
}
export function getBgmVolume(): number { return bgmMasterVolume }

// 音量设置与读取（音效）
export function setSfxVolume(v: number) {
  sfxMasterVolume = Math.max(0, Math.min(1, v))
  try { localStorage.setItem('sfx_volume', String(sfxMasterVolume)) } catch {}
}
export function getSfxVolume(): number { return sfxMasterVolume }