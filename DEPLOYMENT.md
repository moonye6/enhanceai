# EnhanceAI 部署指南

## 📋 部署前准备

### 1. 环境变量

创建 `.env.local` 文件：

```bash
cp .env.example .env.local
```

编辑 `.env.local`，填入你的 fal.ai API Key：

```env
FAL_AI_API_KEY=fal_xxxxxxxxxx
```

> 获取 API Key: https://fal.ai/dashboard/keys

### 2. 本地测试

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建测试
npm run build
npm start
```

---

## 🚀 Cloudflare Pages 部署

### 方式一：Dashboard 部署（推荐）

1. **连接 GitHub 仓库**
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - 进入 Workers & Pages → Create application → Pages → Connect to Git
   - 选择你的 GitHub 仓库

2. **配置构建设置**
   ```
   Framework preset: Next.js
   Build command: npm run build
   Build output directory: .next
   ```

3. **设置环境变量**
   - Settings → Environment Variables
   - 添加 `FAL_AI_API_KEY`

4. **部署**
   - 点击 Save and Deploy
   - 等待构建完成

### 方式二：CLI 部署

```bash
# 安装 wrangler
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 部署
wrangler pages deploy .next --project-name=enhanceai
```

---

## ⚠️ 重要提示

### 关于 Cloudflare Pages + Next.js

Cloudflare Pages 对 Next.js 的支持有以下选项：

#### 选项 A: 使用 @cloudflare/next-on-pages（推荐）

```bash
npm install -D @cloudflare/next-on-pages
```

修改 `package.json`：
```json
{
  "scripts": {
    "pages:build": "next-on-pages"
  }
}
```

在 API 路由中添加 Edge Runtime：
```typescript
export const runtime = 'edge';
```

#### 选项 B: 静态导出 + 外部 API

修改 `next.config.js`：
```javascript
const nextConfig = {
  output: 'export',
  // ...
};
```

将 API 路由部署到 Cloudflare Workers 或其他后端服务。

---

## 🔧 生产环境配置

### 1. 使用 KV 存储 Rate Limit（推荐）

在 `wrangler.toml` 中配置：

```toml
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "your-kv-namespace-id"
```

创建 KV namespace：
```bash
wrangler kv:namespace create RATE_LIMIT_KV
```

### 2. 自定义域名

在 Cloudflare Dashboard：
- Pages → Settings → Custom domains
- 添加你的域名（如 enhanceai.yourdomain.com）

### 3. 监控与分析

- Cloudflare Analytics 自动启用
- 可选：集成 Sentry 错误监控

---

## 📊 部署检查清单

- [ ] 环境变量已配置（FAL_AI_API_KEY）
- [ ] 本地构建成功（npm run build）
- [ ] GitHub 仓库已推送最新代码
- [ ] Cloudflare Pages 项目已创建
- [ ] 构建配置正确
- [ ] 环境变量已添加到 Cloudflare
- [ ] 部署成功且可访问
- [ ] 图片上传功能正常
- [ ] AI 增强功能正常
- [ ] Rate Limiting 工作正常
- [ ] 自定义域名已配置（可选）

---

## 🐛 常见问题

### Q: 部署后 API 返回 500 错误
A: 检查 `FAL_AI_API_KEY` 环境变量是否正确设置

### Q: 图片上传失败
A: 检查文件大小（最大 5MB）和格式（JPG/PNG/WebP）

### Q: Rate Limit 不工作
A: localStorage 仅在客户端工作；服务端需要配置 KV 存储

### Q: Next.js 图片优化不工作
A: 在 `next.config.js` 中设置 `images.unoptimized = true` 或配置 Cloudflare Images

---

## 📞 支持

如有问题，请提交 Issue 到 GitHub 仓库。
