// 获取真实通行凭证：经 Pages Functions /api/credential 签名代理调用恒隆 API。
// 该代理受 _middleware 令牌门禁保护，只有持有效 cookie 的访问者能拉取。
// 本地 vite dev（无 Functions）会 404，需用 `wrangler pages dev` 或线上环境测试。

/**
 * 从响应中提取二维码内容。
 * 实测（2026-08-18）：{"status":"0000","data":{"value":"user_id=...&code=<uuid>&start=...&end=...&number_of_access=-1",...}}
 * QR 内容 = data.value；start/end 为毫秒时间戳（实测窗口 5 分钟），30s 自动刷新远小于有效期。
 */
function extractValue(payload: unknown): string {
  if (payload !== null && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>
    if (obj.status !== '0000') {
      const msg = typeof obj.message === 'string' ? obj.message : ''
      throw new Error(`凭证接口返回异常：${msg || String(obj.status)}`)
    }
    const data = obj.data
    if (data !== null && typeof data === 'object') {
      const value = (data as Record<string, unknown>).value
      if (typeof value === 'string') return value
    }
  }
  throw new Error('凭证响应结构不识别')
}

export async function fetchCredential(): Promise<string> {
  const res = await fetch('/api/credential', { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`凭证获取失败（HTTP ${res.status}）`)
  }
  const value = extractValue(await res.json())
  if (value.length === 0) throw new Error('凭证内容为空')
  return value
}
