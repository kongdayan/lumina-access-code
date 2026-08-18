# lumina-access-code

> **Lumina 小程序 · 通行码 Web 演示**
> 本项目的核心是 Lumina 小程序（微信小程序，恒隆物业楼宇通行码能力）。
> 本仓库将其「通行码弹窗」能力搬到 Web：机主本人经令牌验证后，页面实时拉取
> 与小程序同款的真实通行凭证并渲染二维码，支持 30 秒自动刷新。

---

- [中文说明](#中文说明)
- [English](#english)

---

# 中文说明

## 它是什么

Lumina 小程序（微信小程序）的通行码页面，原本只能在微信客户端内使用。
本仓库是它的 Web 演示版：**凭证获取链路、二维码内容、刷新节奏、弹窗 UI 均对齐小程序**
，让机主在手机浏览器里也能出示同款通行码。

```
┌─────────────┐  access_token cookie  ┌────────────────────────────┐
│   浏览器     │ ─────────────────────▶ │  Pages Functions 门禁      │
│  (机主本人)  │                       │  (_middleware)             │
└─────────────┘                       └───────────┬────────────────┘
                                                  │ 放行
                                     /api/credential
                                                  ▼
                                   ┌────────────────────────────┐
                                   │ 签名代理（还原的小程序签名方案）│
                                   │ MD5 实时签名 → getUserPass-  │
                                   │ Credential → 真实 data.value │
                                   └────────────┬───────────────┘
                                                │
                                                ▼
                                   qrcode 库 canvas 渲染 → 扫码通行
```

## 功能特性

- **真实凭证**：每次刷新都向小程序同款 API（`getUserPassCredential`）实时签名请求，
  渲染服务器签发的真实 `data.value`（凭证窗口 5 分钟，30 秒自动刷新远小于有效期）
- **令牌门禁**：`ACCESS_TOKEN` cookie 校验覆盖整站——页面、API、静态资源，
  只有机主本人可访问；未登录只见内联登录页
- **复刻小程序 UI**：「进入楼宇二维码 / 会员二维码」双 Tab、倒计时「N秒后刷新」、
  刷新旋转动画、rpx 自适应缩放（宽屏定格 ~600px 卡片）
- **canvas 渲染二维码**：无图片元素，无点击下载 / 长按保存交互
- **零框架**：vanilla TypeScript + Vite，无运行时外部依赖（除二维码内容本身）

## 目录结构

```
lumina-access-code/
├── functions/
│   ├── _middleware.ts          # 令牌门禁（cookie 校验 + 内联登录页）
│   └── api/credential.ts       # 真实凭证签名代理（MD5 签名 → 小程序同款 API）
├── src/
│   ├── main.ts                 # 状态机：Tab / 30s 倒计时 / 刷新防重入 / 离屏 canvas 缓存
│   ├── api.ts                  # fetch /api/credential → 提取 data.value
│   ├── ui.ts                   # DOM 骨架 + 交互函数
│   ├── qr.ts                   # toCanvas 编码（v4-M，溢出自动升版重试）
│   ├── mock.ts                 # 会员二维码 Tab 的 mock 常量
│   └── style.css               # rpx 仿原版 UI（750rpx = 100vw）
├── .env.example                # 占位模板（VITE_*，历史存档，当前前端不使用）
├── .dev.vars.example           # 门禁令牌 + 凭证请求体模板（复制为 .dev.vars，已 gitignore）
└── .env / .dev.vars            # 本地私有配置（gitignore，不进仓库）
```

## 快速开始

### 本地开发（仅页面，无凭证链路）

```bash
npm install
npm run dev          # http://localhost:5173（无 Functions，凭证拉取会失败并显示错误）
```

### 本地联调（完整还原线上行为：门禁 + 真实凭证）

```bash
cp .dev.vars.example .dev.vars   # 填入 ACCESS_TOKEN 与 CRED_BODY（真实值仅本机）
npm run build
npx wrangler pages dev dist --port 8788 --compatibility-date=2026-04-16
# 打开 http://localhost:8788 → 输入令牌 → 页面 30s 自动刷新真实凭证二维码
```

> `--compatibility-date` 固定为内置 workerd 运行时支持的日期（2026-04-16），
> 否则本地 dev 会因默认取当天日期而启动失败。

### 部署到 Cloudflare Pages

```bash
npm run build

# 首次：登录 + 建项目（非交互）
npx wrangler login
npx wrangler pages project create lumina-access-code --production-branch main

# 1. 先配 secret（必须在部署之前，否则旧部署不绑定新 secret，门禁会静默放行）
npx wrangler pages secret put ACCESS_TOKEN --project-name lumina-access-code
npx wrangler pages secret put CRED_BODY --project-name lumina-access-code

# 2. 再部署
npx wrangler pages deploy dist --project-name lumina-access-code
```

## 配置项

| 变量 | 用途 | 存放位置 |
|---|---|---|
| `ACCESS_TOKEN` | 页面门禁令牌（登录页输入，下发 httpOnly cookie 7 天） | CF secret / 本地 `.dev.vars` |
| `CRED_BODY` | 机主凭证请求体 JSON（tenantId/orgId/userId/userMobile/openId 等） | CF secret / 本地 `.dev.vars` |

未配置 `ACCESS_TOKEN` 时不拦截（便于预览）；未配置 `CRED_BODY` 时使用占位请求体（仅本地演示）。

## 安全与隐私

- `.env`（历史抓包存档）、`.dev.vars`（门禁令牌 + 真实凭证体）均已 gitignore
- 前端静态产物**不含任何真实个人信息**：真实值只在服务端 secret 中，且必须先过令牌门禁
- `/api/credential` 为机主本人凭证的出网代理：目标地址固定、无注入面、受门禁保护
- 门禁令牌即攻击面：生产令牌请用足够长的随机值（`openssl rand -hex 32`）

## 背景

- 签名方案的完整还原过程（双样本验证）见分析文档 `access-code-analysis.md`
  （位于本机仓库上级目录，未随本仓库发布）；核心结论：MD5 无密钥方案、
  nonce 硬编码、secretP = appid，可实时生成合法签名
- 本项目只面向**机主本人**的通行码使用与研究，不对他人账户或系统发起任何请求

---

# English

## What it is

The access-code screen of the **Lumina mini-program** (a WeChat mini-program providing
building access codes) normally only works inside WeChat. This repository is its web
counterpart: the credential pipeline, QR content, refresh cadence, and popup UI all
mirror the mini-program, so the owner can present the same access code from a mobile browser.

```
┌─────────────┐  access_token cookie  ┌────────────────────────────┐
│   Browser   │ ─────────────────────▶ │  Pages Functions gate      │
│   (owner)   │                       │  (_middleware)             │
└─────────────┘                       └───────────┬────────────────┘
                                                  │ allowed
                                     /api/credential
                                                  ▼
                                   ┌────────────────────────────┐
                                   │ Signing proxy (recovered    │
                                   │ mini-program scheme)        │
                                   │ fresh MD5 signature →       │
                                   │ getUserPassCredential →     │
                                   │ real data.value             │
                                   └────────────┬───────────────┘
                                                │
                                                ▼
                                   qrcode canvas rendering → scan & enter
```

## Features

- **Real credentials**: every refresh signs a live request to the same API the
  mini-program uses (`getUserPassCredential`) and renders the server-issued
  `data.value` (5-minute window; 30-second auto-refresh is well within it)
- **Token gate**: `ACCESS_TOKEN` cookie check covers everything — pages, API, static
  assets. Only the owner can get in; everyone else sees an inline login page
- **Mini-program UI replica**: dual tabs (building access / membership QR),
  "N秒后刷新" countdown, spinning refresh icon, rpx-based responsive scaling
  (~600px card on wide screens)
- **Canvas-rendered QR**: no `<img>` element, so no tap-to-download / long-press-save
- **Zero framework**: vanilla TypeScript + Vite, no runtime dependencies besides the
  QR content itself

## Directory layout

```
lumina-access-code/
├── functions/
│   ├── _middleware.ts          # token gate (cookie check + inline login page)
│   └── api/credential.ts       # real-credential signing proxy (MD5 → mini-program API)
├── src/
│   ├── main.ts                 # state machine: tabs / 30s countdown / refresh guard / offscreen canvas cache
│   ├── api.ts                  # fetch /api/credential → extract data.value
│   ├── ui.ts                   # DOM skeleton + interaction helpers
│   ├── qr.ts                   # toCanvas encoding (v4-M, auto version bump on overflow)
│   ├── mock.ts                 # membership-tab mock constants
│   └── style.css               # rpx-based replica UI (750rpx = 100vw)
├── .env.example                # placeholder template (VITE_*, archival; unused by the frontend now)
├── .dev.vars.example           # token + credential-body template (copy to .dev.vars, gitignored)
└── .env / .dev.vars            # local private config (gitignored)
```

## Quick start

### Local dev (page only, no credential pipeline)

```bash
npm install
npm run dev          # http://localhost:5173 (no Functions; credential fetch fails and shows an error)
```

### Local full-stack (replicates production: gate + real credentials)

```bash
cp .dev.vars.example .dev.vars   # fill ACCESS_TOKEN and CRED_BODY (real values stay on your machine)
npm run build
npx wrangler pages dev dist --port 8788 --compatibility-date=2026-04-16
# open http://localhost:8788 → enter the token → page auto-refreshes a real credential QR every 30s
```

> `--compatibility-date` pins to the newest date supported by the bundled workerd
> runtime (2026-04-16); otherwise local dev fails because it defaults to today's date.

### Deploy to Cloudflare Pages

```bash
npm run build

# first time: log in and create the project (non-interactive)
npx wrangler login
npx wrangler pages project create lumina-access-code --production-branch main

# 1. set secrets FIRST (must precede deployment, or the old deployment won't bind
#    the new secret and the gate silently lets everyone in)
npx wrangler pages secret put ACCESS_TOKEN --project-name lumina-access-code
npx wrangler pages secret put CRED_BODY --project-name lumina-access-code

# 2. then deploy
npx wrangler pages deploy dist --project-name lumina-access-code
```

## Configuration

| Variable | Purpose | Where |
|---|---|---|
| `ACCESS_TOKEN` | Gate token (login page input; issues a 7-day httpOnly cookie) | CF secret / local `.dev.vars` |
| `CRED_BODY` | Owner credential request body JSON (tenantId/orgId/userId/userMobile/openId, …) | CF secret / local `.dev.vars` |

No `ACCESS_TOKEN` configured → no gating (useful for previews). No `CRED_BODY`
configured → placeholder request body (local demo only).

## Security & privacy

- `.env` (archival capture data) and `.dev.vars` (gate token + real credential body)
  are gitignored
- The static bundle contains **no real personal data**: real values live only in
  server-side secrets, behind the token gate
- `/api/credential` is an egress proxy for the owner's own credential: fixed target
  URL, no injection surface, gated
- The gate token is the attack surface: use a long random value in production
  (`openssl rand -hex 32`)

## Background

- The full reverse-engineering of the signing scheme (verified against two captured
  samples) lives in `access-code-analysis.md`, in the parent directory of this repo
  on the author's machine (not published with this repo). Bottom line: MD5 scheme
  with no real secret, hardcoded nonce, secretP = appid — signatures can be generated
  on the fly
- This project serves **the owner's own** access code only; no requests are ever made
  on behalf of other accounts or systems
