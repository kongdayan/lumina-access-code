import './style.css'
import {
  buildDom,
  hideError,
  setActiveTab,
  setQrCanvas,
  setRefreshing,
  showError,
  updateCountdown,
  type DomRefs,
} from './ui'
import { renderQr } from './qr'
import { fetchCredential } from './api'
import { MEMBER_CARD_NUMBER, MEMBER_GRADE } from './mock'

const REFRESH_SECONDS = 30

let tab: 0 | 1 = 0
let countdown = REFRESH_SECONDS
let refreshing = false
const cache = new Map<0 | 1, HTMLCanvasElement>()

const app = document.getElementById('app')
if (!app) throw new Error('missing #app')

const refs: DomRefs = buildDom(app)
refs.memberCodeText.textContent = `${MEMBER_CARD_NUMBER} ${MEMBER_GRADE}`
setActiveTab(refs, 0)
updateCountdown(refs, countdown)

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function contentFor(which: 0 | 1): Promise<string> {
  // Tab 0 走真实凭证（/api/credential 签名代理，受令牌门禁保护）；Tab 1 为会员 mock
  return which === 0 ? fetchCredential() : MEMBER_CARD_NUMBER
}

async function regenerate(which: 0 | 1): Promise<void> {
  if (refreshing) return
  refreshing = true
  setRefreshing(refs, true)
  try {
    const content = await contentFor(which)
    // 与最少展示时长的 Promise.all，保证旋转动画可见
    const [qrCanvas] = await Promise.all([renderQr(content), delay(400)])
    cache.set(which, qrCanvas)
    hideError(refs)
    if (tab === which) setQrCanvas(refs, qrCanvas)
  } catch (err) {
    if (tab === which) showError(refs, err instanceof Error ? err.message : '生成二维码失败')
  } finally {
    refreshing = false
    setRefreshing(refs, false)
    countdown = REFRESH_SECONDS
    updateCountdown(refs, countdown)
  }
}

function switchTab(which: 0 | 1): void {
  tab = which
  setActiveTab(refs, which)
  const cached = cache.get(which)
  if (cached) setQrCanvas(refs, cached)
  else void regenerate(which)
}

refs.tabs.forEach((el) => {
  el.addEventListener('click', () => switchTab(el.dataset.tab === '1' ? 1 : 0))
})
refs.refreshBtn.addEventListener('click', () => void regenerate(tab))

// 每秒递减；归零立即重置显示并重新生成（对齐小程序：倒计时 + 30s 自动刷新）
setInterval(() => {
  countdown -= 1
  if (countdown <= 0) {
    countdown = REFRESH_SECONDS
    updateCountdown(refs, countdown)
    void regenerate(tab)
  } else {
    updateCountdown(refs, countdown)
  }
}, 1000)

// 初始生成
void regenerate(0)
