# EnhanceAI

一键 AI 图片增强工具

## ✨ 功能特性

- 🚀 **一键增强** - 上传即可获得 2x 放大 + 去噪 + 锐化
- 📱 **拖拽上传** - 支持 JPG, PNG, WebP，最大 5MB
- ⏳ **实时进度** - 可视化处理进度
- 🆓 **免费使用** - 每日 3 次免费额度
- 💳 **Pro 升级** - 解锁 100次/天，最高 8x 放大

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| **Frontend** | Next.js 14 + React 18 + Tailwind CSS |
| **Backend** | Next.js API Routes (Edge Runtime) |
| **AI Service** | fal.ai - Real-ESRGAN |
| **Deployment** | Cloudflare Pages |
| **Language** | TypeScript 5 |

## 📁 项目结构

```
enhanceai/
├── src/
│   ├── app/
│   │   ├── api/enhance/route.ts  # API 路由
│   │   ├── page.tsx               # 主页
│   │   ├── layout.tsx             # 布局
│   │   ├── error.tsx              # 错误边界
│   │   ├── global-error.tsx       # 全局错误
│   │   └── loading.tsx            # 加载状态
│   └── lib/
│       └── rateLimit.ts           # 限流逻辑
├── public/
├── .env.example                   # 环境变量模板
├── next.config.js                 # Next.js 配置
├── wrangler.toml                  # Cloudflare 配置
├── DEPLOYMENT.md                  # 部署指南
├── GSTACK_REVIEW.md               # G-Stack 开发记录
└── CHANGELOG.md                   # 更新日志
```

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local`，添加你的 fal.ai API Key：

```env
FAL_AI_API_KEY=fal_xxxxxxxxxx
```

> 获取 API Key: https://fal.ai/dashboard/keys

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 4. 构建生产版本

```bash
npm run build
npm start
```

## 📦 部署

详见 [DEPLOYMENT.md](./DEPLOYMENT.md)

### Cloudflare Pages 快速部署

```bash
# 构建
npm run build

# 部署
npx wrangler pages deploy .next --project-name=enhanceai
```

## 🔌 API 文档

### POST /api/enhance

上传图片进行 AI 增强

**Request:**
```
Content-Type: multipart/form-data

image: <File>  // 图片文件
```

**Response (成功):**
```json
{
  "enhancedUrl": "https://...",
  "remaining": 2,
  "resetAt": "2024-01-02T00:00:00.000Z"
}
```

**Response (错误):**
```json
{
  "error": "错误描述",
  "code": "ERROR_CODE"
}
```

**错误码:**

| Code | 说明 |
|------|------|
| `NO_IMAGE` | 未提供图片 |
| `INVALID_FILE_TYPE` | 文件类型不支持 |
| `FILE_TOO_LARGE` | 文件超过 5MB |
| `RATE_LIMIT_EXCEEDED` | 超出每日限制 |
| `SERVICE_BUSY` | 服务繁忙 |
| `INTERNAL_ERROR` | 内部错误 |

### GET /api/enhance

健康检查

```json
{
  "status": "ok",
  "hasApiKey": true,
  "demoMode": false,
  "version": "1.0.0"
}
```

## 💰 定价

| 方案 | 价格 | 额度 | 功能 |
|------|------|------|------|
| **Free** | $0 | 3次/天 | 最大 2x 放大 |
| **Pro** | $4.9/月 | 100次/天 | 最大 8x，批量处理 |
| **Lifetime** | $49 | 永久 Pro | 一次付费 |

## 🔐 安全特性

- 文件类型验证 (JPG/PNG/WebP)
- 文件大小限制 (5MB)
- IP 限流防护
- 安全 Headers (X-Frame-Options, CSP)
- 环境变量隔离

## 📝 开发日志

- [GSTACK_REVIEW.md](./GSTACK_REVIEW.md) - G-Stack 开发流程记录
- [CHANGELOG.md](./CHANGELOG.md) - 版本更新日志

## 📄 License

MIT

---

Built with ❤️ using fal.ai Real-ESRGAN
