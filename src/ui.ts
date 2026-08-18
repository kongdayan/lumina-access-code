// 内联 SVG 图标（stroke=currentColor，颜色由 CSS 控制）
const FLOOR_GLYPH = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
  <path d="M16 9h2a2 2 0 0 1 2 2v10" />
  <path d="M2 21h20" />
  <path d="M8 7h2M12 7h2M8 11h2M12 11h2" />
  <path d="M10 21v-4h4v4" />
</svg>`

const CARD_GLYPH = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <rect x="3" y="5" width="18" height="14" rx="2" />
  <path d="M3 10h18" />
  <path d="M7 15h4" />
</svg>`

const RELOAD_GLYPH = `
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M21 12a9 9 0 1 1-2.64-6.36" />
  <path d="M21 3v6h-6" />
</svg>`

export interface DomRefs {
  tabs: HTMLDivElement[]
  qrCanvas: HTMLCanvasElement
  countdown: HTMLDivElement
  refreshBtn: HTMLButtonElement
  reloadIcon: HTMLSpanElement
  memberCodeText: HTMLDivElement
  errorMsg: HTMLDivElement
}

/** 构建 DOM 骨架（全部为静态内容，无用户输入拼接） */
export function buildDom(root: HTMLElement): DomRefs {
  root.innerHTML = `
    <div class="page-backdrop">
      <div class="sheet">
        <div class="sheet-icon">${FLOOR_GLYPH}</div>
        <div class="tabs">
          <div class="tab tab-active" data-tab="0">
            <span class="tab-icon">${FLOOR_GLYPH}</span>
            <span class="tab-label">进入楼宇二维码</span>
          </div>
          <div class="tab" data-tab="1">
            <span class="tab-icon">${CARD_GLYPH}</span>
            <span class="tab-label">会员二维码</span>
          </div>
        </div>
        <div class="code-container">
          <div class="code-text" hidden></div>
          <div class="code-card">
            <canvas class="qr-canvas" aria-label="二维码"></canvas>
            <div class="error-msg" hidden></div>
          </div>
          <div class="countdown"></div>
          <button class="refresh-row" type="button">
            <span class="icon-reload">${RELOAD_GLYPH}</span>
            <span class="refresh-label">刷新</span>
          </button>
        </div>
      </div>
    </div>
  `

  const tabs = Array.from(root.querySelectorAll<HTMLDivElement>('.tab'))
  return {
    tabs,
    qrCanvas: root.querySelector<HTMLCanvasElement>('.qr-canvas')!,
    countdown: root.querySelector<HTMLDivElement>('.countdown')!,
    refreshBtn: root.querySelector<HTMLButtonElement>('.refresh-row')!,
    reloadIcon: root.querySelector<HTMLSpanElement>('.icon-reload')!,
    memberCodeText: root.querySelector<HTMLDivElement>('.code-text')!,
    errorMsg: root.querySelector<HTMLDivElement>('.error-msg')!,
  }
}

/** 切换 Tab：激活态 + 按 Tab 显隐倒计时/刷新/会员文字 */
export function setActiveTab(refs: DomRefs, which: 0 | 1): void {
  refs.tabs.forEach((el, i) => el.classList.toggle('tab-active', i === which))
  refs.countdown.hidden = which !== 0
  refs.refreshBtn.hidden = which !== 0
  refs.memberCodeText.hidden = which !== 1
}

/** 把离屏 canvas 贴到页面 canvas 上（canvas 无图片保存/下载交互） */
export function setQrCanvas(refs: DomRefs, source: HTMLCanvasElement): void {
  const target = refs.qrCanvas
  target.width = source.width
  target.height = source.height
  target.getContext('2d')?.drawImage(source, 0, 0)
}

/** 刷新中：图标加旋转类（原版 .icon-reload-anima），按钮禁用防连点 */
export function setRefreshing(refs: DomRefs, on: boolean): void {
  refs.reloadIcon.classList.toggle('icon-reload-anima', on)
  refs.refreshBtn.disabled = on
}

export function updateCountdown(refs: DomRefs, seconds: number): void {
  refs.countdown.textContent = `${seconds}秒后刷新`
}

export function showError(refs: DomRefs, message: string): void {
  refs.errorMsg.textContent = message
  refs.errorMsg.hidden = false
}

export function hideError(refs: DomRefs): void {
  refs.errorMsg.hidden = true
}
