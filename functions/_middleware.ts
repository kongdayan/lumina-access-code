// Pages Functions 全局中间件：令牌授权门禁（机主访问控制）。
//
// 工作方式：
// - 访问令牌来自环境变量 ACCESS_TOKEN：
//     · 线上：`npx wrangler pages secret put ACCESS_TOKEN`（或 Cloudflare 面板环境变量）
//     · 本地联调：项目根目录 .dev.vars（已 gitignore，不进仓库）
// - 未配置 ACCESS_TOKEN 时不拦截（纯静态 / vite dev 场景照常可用）
// - POST /__auth：校验表单令牌，通过后下发 httpOnly cookie（7 天有效）
// - 其余请求：校验 cookie，未通过直接返回内联登录页（403，不暴露任何站点资源；
//   登录页完全内联，被门禁挡住时也能正常渲染）
//
// 说明：令牌为高强度随机串，直等比较即可；未做登录限流，令牌本身即攻击面，
// 线上务必使用足够长的随机令牌（如 `openssl rand -hex 32`）。

interface MiddlewareContext {
  request: Request
  env: Record<string, string | undefined>
  next: () => Promise<Response>
}

const COOKIE_NAME = 'access_token'
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60

const LOGIN_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>访问验证</title>
<style>
  body {
    margin: 0;
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #10182f;
    font-family: system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
  }
  .card {
    background: #f7faff;
    border-radius: 16px;
    padding: 40px 32px;
    width: min(90vw, 360px);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  }
  h1 { font-size: 20px; color: #1f2937; margin: 0 0 8px; }
  p { font-size: 14px; color: #99999b; margin: 0 0 24px; }
  input {
    width: 100%;
    box-sizing: border-box;
    padding: 12px 14px;
    border: 1px solid #ccc;
    border-radius: 8px;
    font-size: 15px;
    outline: none;
  }
  input:focus { border-color: #2549b4; }
  button {
    width: 100%;
    margin-top: 16px;
    padding: 12px;
    border: none;
    border-radius: 8px;
    background: #2549b4;
    color: #fff;
    font-size: 15px;
    cursor: pointer;
  }
  .err { display: none; color: #e33; font-size: 13px; margin-top: 12px; }
</style>
</head>
<body>
<div class="card">
  <h1>访问验证</h1>
  <p>请输入访问令牌以继续</p>
  <form id="f">
    <input id="t" type="password" placeholder="访问令牌" autocomplete="off" />
    <button type="submit">验证</button>
    <div class="err" id="e">令牌无效，请重试</div>
  </form>
</div>
<script>
  document.getElementById('f').addEventListener('submit', async function (ev) {
    ev.preventDefault()
    var token = document.getElementById('t').value
    try {
      var res = await fetch('/__auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'token=' + encodeURIComponent(token),
      })
      if (res.ok) location.reload()
      else document.getElementById('e').style.display = 'block'
    } catch (err) {
      document.getElementById('e').style.display = 'block'
    }
  })
</script>
</body>
</html>`

function cookieMatches(request: Request, token: string): boolean {
  const cookies = request.headers.get('Cookie') ?? ''
  return cookies.split(';').some((part) => part.trim() === `${COOKIE_NAME}=${token}`)
}

export const onRequest = async (context: MiddlewareContext): Promise<Response> => {
  const token = context.env.ACCESS_TOKEN
  if (!token) return context.next()

  const url = new URL(context.request.url)

  // 登录校验：表单令牌正确 → 下发 httpOnly cookie
  if (url.pathname === '/__auth' && context.request.method === 'POST') {
    const body = new URLSearchParams(await context.request.text())
    if (body.get('token') === token) {
      return new Response('ok', {
        headers: {
          'Set-Cookie': `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}`,
        },
      })
    }
    return new Response('invalid token', { status: 403 })
  }

  if (cookieMatches(context.request, token)) return context.next()

  // 未授权：返回内联登录页（同时挡住静态资源与页面）
  return new Response(LOGIN_HTML, {
    status: 403,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
