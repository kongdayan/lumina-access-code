# QR 通行码演示（lumina-access-code）

复刻恒隆小程序「通行码弹窗」UI 的 TypeScript 演示，部署于 Cloudflare Pages：

- **真实通行凭证**：页面通过 Pages Functions 签名代理（`/api/credential`）实时调用
  恒隆 API `getUserPassCredential`，把真实 `data.value` 渲染为二维码（凭证有效期 5 分钟，
  页面 30 秒自动刷新）
- **canvas 渲染**：前端用 npm `qrcode` 库编码（无图片元素，无下载/保存交互）
- **令牌门禁**：整站（含 API 与静态资源）受 `ACCESS_TOKEN` cookie 校验保护，
  只有机主本人可访问

> ⚠️ 用途边界：本项目为**机主本人**的通行码演示/研究（签名方案见上级目录
> `access-code-analysis.md`）。机主的真实个人信息只存于服务端 secret（`CRED_BODY`），
> 静态产物中不含任何真实数据。

## 目录结构

```
lumina-access-code/
├── functions/
│   ├── _middleware.ts          # 令牌门禁（cookie 校验 + 内联登录页）
│   └── api/credential.ts       # 真实凭证签名代理（MD5 签名 → 恒隆 API）
├── src/
│   ├── main.ts                 # 状态机：Tab / 30s 倒计时 / 刷新防重入 / 离屏 canvas 缓存
│   ├── api.ts                  # fetch /api/credential → 提取 data.value
│   ├── ui.ts                   # DOM 骨架 + 交互函数
│   ├── qr.ts                   # toCanvas 编码（v4-M，溢出自动升版重试）
│   ├── mock.ts                 # 会员二维码 Tab 的 mock 常量
│   └── style.css               # rpx 仿原版 UI（750rpx = 100vw，宽屏定格 ~600px 卡片）
├── .env.example                # 可安全提交的占位模板（VITE_*，当前前端不再使用）
├── .dev.vars.example           # 本地门禁令牌 + 凭证请求体模板（复制为 .dev.vars，已 gitignore）
└── .env / .dev.vars            # 本地私有配置（gitignore，不进仓库）
```

## 本地开发

```bash
npm install
npm run dev          # http://localhost:5173（无 Functions，凭证拉取会失败并显示错误）
```

## 本地联调（完整还原线上行为，含门禁 + 真实凭证）

```bash
cp .dev.vars.example .dev.vars   # 填入 ACCESS_TOKEN 与 CRED_BODY（真实值仅本地）
npm run build
npx wrangler pages dev dist --port 8788 --compatibility-date=2026-04-16
# 打开 http://localhost:8788 → 输入令牌 → 页面 30s 自动刷新真实凭证二维码
```

> `--compatibility-date` 固定为内置 workerd 运行时支持的日期（2026-04-16），
> 否则本地 dev 会因默认取当天日期而启动失败。

## 部署到 Cloudflare Pages

```bash
npm run build

# 首次：登录 + 建项目（非交互）
npx wrangler login
npx wrangler pages project create lumina-access-code --production-branch main

# 1. 先配 secret（必须在部署之前，否则旧部署不绑定新 secret）
npx wrangler pages secret put ACCESS_TOKEN --project-name lumina-access-code
npx wrangler pages secret put CRED_BODY --project-name lumina-access-code   # 机主凭证请求体 JSON

# 2. 再部署
npx wrangler pages deploy dist --project-name lumina-access-code
```

部署后访问 `https://lumina-access-code.pages.dev`：未登录看到令牌登录页；
验证通过后下发 httpOnly cookie（7 天），页面/API/静态资源均受门禁保护。
未配置 `ACCESS_TOKEN` 时不拦截（便于预览）。

## 隐私与安全

- `.env`（历史抓包存档）、`.dev.vars`（门禁令牌 + 真实凭证体）均已 gitignore
- 前端静态产物**不含任何真实个人信息**（真实值只在服务端 secret 中，经门禁保护）
- 门禁令牌即攻击面：生产令牌用足够长的随机值（`openssl rand -hex 32`），不要用可猜测的值
- `/api/credential` 为机主本人凭证的出网代理：服务端固定目标地址、无注入面，
  且必须先过令牌门禁
