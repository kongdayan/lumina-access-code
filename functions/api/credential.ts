// 真实通行凭证代理：按已还原的签名方案（access-code-analysis.md §4.2）实时签名，
// 调用恒隆 API getUserPassCredential，返回真实 data.value 供前端渲染二维码。
//
// 安全边界：
// - 本函数位于 /api/credential，请求先经过 _middleware 令牌门禁，
//   只有持有效 access_token cookie 的访问者（机主本人）才能拉取凭证
// - 机主的真实个人信息只存在服务端环境变量 CRED_BODY（secret），不进静态产物
// - 未配置 CRED_BODY 时回退到占位值（仅本地演示，无法通过门禁扫码校验）
//
// 签名串模板（已验证）：
//   <METHOD>\n<PATH>\n<秒级时间戳>\n<NONCE>\n<BODY>\n<SECRET>\n  → MD5 小写 hex

interface FunctionContext {
  request: Request
  env: Record<string, string | undefined>
}

const BASE_URL = 'https://hddmp.hendersontouch.com.cn/hddma'
const PATH = '/api/c/wx/pass/userpass/getUserPassCredential'
const NONCE = '593BEC0C930BF1AFEB40B4A08C8FB242'
const SECRET = 'wx992c0d7ad02e24b5' // secretP = appid（无真实密钥，见分析文档）
const UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 26_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.75(0x18004b61) NetType/WIFI Language/zh_CN'

/** 未配置 CRED_BODY 时的占位请求体（本地演示用） */
const MOCK_BODY = {
  tenantId: '10000',
  orgId: '1381',
  orgCode: 'sh06',
  orgName: '星扬西岸中心',
  userId: 'mock-user-id',
  userName: 'mock-user',
  userMobile: '18800000000',
  appId: 'wx992c0d7ad02e24b5',
  openId: 'mock-open-id',
}

async function md5Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('MD5', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

export const onRequestGet = async (context: FunctionContext): Promise<Response> => {
  const raw = context.env.CRED_BODY
  const body = raw ? (JSON.parse(raw) as Record<string, string>) : { ...MOCK_BODY }
  const bodyStr = JSON.stringify(body)
  const ts = Math.floor(Date.now() / 1000)

  const sigStr = `POST\n${PATH}\n${ts}\n${NONCE}\n${bodyStr}\n${SECRET}\n`
  const signature = await md5Hex(sigStr)

  let upstream: Response
  try {
    upstream = await fetch(BASE_URL + PATH, {
      method: 'POST',
      headers: {
        'content-type': 'application/json;charset=utf-8',
        userId: body.userId,
        userName: encodeURIComponent(body.userName),
        tenantId: body.tenantId,
        orgcode: body.orgCode,
        currentPageRoute: 'pages/user/mbr/index',
        token: '',
        AuthorizationInf: `MD5 appid="${body.appId}",nonce_str="${NONCE}",signature="${signature}",timestamp="${ts}"`,
        'User-Agent': UA,
        Referer: 'https://servicewechat.com/wx992c0d7ad02e24b5/43/page-frame.html',
      },
      body: bodyStr,
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ code: -1, msg: 'upstream unreachable: ' + (err instanceof Error ? err.message : String(err)) }),
      { status: 502, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } },
    )
  }

  const text = await upstream.text()
  return new Response(text, {
    status: upstream.status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
