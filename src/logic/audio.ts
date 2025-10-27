let bgAudio: HTMLAudioElement | null = null
let prepared = false
let sfxUrls: string[] = []
let bgmUrls: string[] = []
let bgFallbackUrl: string | null = null

let listenersBound = false

function ensurePrepared() {
  if (prepared) return
  // 背景音乐集合：从 assets/bgmusic 下加载全部音频文件为 URL
  const bgmModules = import.meta.glob('../assets/bgmusic/*.{mp3,ogg,wav}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
  bgmUrls = Object.values(bgmModules)
  // 回退音频：若目录为空，使用单曲 background_C32kbps.mp3（存在于 bgmusic 目录）
  bgFallbackUrl = new URL('../assets/bgmusic/background_C32kbps.mp3', import.meta.url).href

  // 合成音效：从 assets/poping 下加载全部音频文件为 URL
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
      bgAudio.volume = 0.5
      bgAudio.currentTime = 0
    }
    // 绑定持久播放事件：可见时自动恢复，播放结束自动重启
    bgAudio.onpause = () => {
      try {
        if (document.visibilityState === 'visible' && bgAudio && !bgAudio.ended) {
          bgAudio.play().catch(() => {})
        }
      } catch {}
    }
    bgAudio.onended = () => {
      try { startBgLoop() } catch {}
    }
    // 确保音量即时应用（即使未更换曲目）
    bgAudio.volume = 0.5
    bgAudio.play().catch(() => { /* ignore autoplay block */ })
  } catch {
    // ignore
  }
}

export function pauseBgLoop() {
  if (bgAudio) bgAudio.pause()
}

export function initBgMusicPersistence() {
  if (listenersBound) return
  listenersBound = true
  try {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        startBgLoop()
      }
    })
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
    a.volume = 0.8
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
  } catch {
    // ignore
  }
}