import { toCanvas } from 'qrcode'
import type { QRCodeRenderersOptions } from 'qrcode'

// 对齐小程序 access-code 组件 drawImg 参数：
//   typeNumber: 4         → npm 包只读 version，必须写 version: 4
//   errorCorrectLevel: M  → errorCorrectionLevel: 'M'
//   size: 350             → width: 350
// margin: 1（单位是模块）：v4 = 33 模块，scale = 350 / 35 = 10.0px 整，
// 留白 = 10px，与原版 qrcode-generator 的 quiet zone 计算（floor((350-330)/2)=10）一致。
const BASE_OPTIONS: QRCodeRenderersOptions = {
  version: 4,
  errorCorrectionLevel: 'M',
  width: 350,
  margin: 1,
}

/**
 * 将文本编码为 QR 码并渲染到离屏 canvas 上（无图片元素，避免浏览器
 * 内置的「长按保存 / 点击下载」交互）。返回的 canvas 直接 drawImage 到页面。
 */
export async function renderQr(text: string): Promise<HTMLCanvasElement> {
  try {
    return await toCanvas(text, BASE_OPTIONS)
  } catch (err) {
    // v4-M 容量 62 字节，超出时去掉固定 version 自动重试（与原版 drawImg 的
    // catch 块中 typeNumber+1 自动升版重试的行为一致）。
    if (err instanceof Error && /cannot contain|too big/i.test(err.message)) {
      console.warn('[qr] v4 overflow, using auto version:', err.message)
      return await toCanvas(text, { errorCorrectionLevel: 'M', width: 350, margin: 1 })
    }
    throw err
  }
}
