# EnhanceAI 更新日志

## [1.0.0] - 2026-03-27

### ✨ 新增功能

#### 环境变量配置
- 创建 `.env.example` 模板文件
- API 支持 demo 模式（无 API_KEY 时返回原图）
- 清晰的环境变量提示和文档

#### 免费用户限流
- **前端限流** (`src/lib/rateLimit.ts`)
  - localStorage 存储每日使用次数
  - 自动重置（每日 0:00）
  - 实时显示剩余次数
  
- **服务端限流** (`src/app/api/enhance/route.ts`)
  - IP 限流（支持 Cloudflare Headers）
  - 内存存储（可升级到 KV）
  - 每日 3 次免费限制

- **UI 改进**
  - Header 显示剩余次数
  - 次数用尽时显示升级弹窗
  - 引导用户升级 Pro

#### Cloudflare Pages 部署
- `next.config.js` - 生产配置（安全 Headers、图片优化）
- `wrangler.toml` - Cloudflare 配置模板
- `DEPLOYMENT.md` - 详细部署指南

#### 错误处理增强
- **API 错误码标准化**
  - `NO_IMAGE` - 未提供图片
  - `INVALID_FILE_TYPE` - 文件类型不支持
  - `FILE_TOO_LARGE` - 文件过大
  - `RATE_LIMIT_EXCEEDED` - 超出限制
  - `SERVICE_BUSY` - 服务繁忙
  - `INTERNAL_ERROR` - 内部错误

- **前端错误处理**
  - `error.tsx` - 页面级错误边界
  - `global-error.tsx` - 全局错误处理
  - `loading.tsx` - 加载状态组件
  - 友好的错误提示和图标

### 🔧 改进

- API 增加详细日志记录
- 错误响应包含更多上下文信息
- UI 显示服务重置时间
- 支持 Cloudflare 真实 IP 获取

### 📝 文档

- `GSTACK_REVIEW.md` - G-Stack 开发流程记录
- `DEPLOYMENT.md` - 部署指南
- `CHANGELOG.md` - 更新日志

### 🧪 测试

- ✅ 构建测试通过 (`npm run build`)
- ✅ TypeScript 类型检查通过
- ✅ 静态页面生成成功

---

## 待办事项

### P2 - 后续迭代
- [ ] 集成支付系统（Stripe/LemonSqueezy）
- [ ] 用户认证系统（NextAuth.js / Clerk）
- [ ] KV 存储替代内存限流
- [ ] 批量处理功能
- [ ] 老照片修复功能
- [ ] 错误监控（Sentry）

---

## 技术栈

- **Framework**: Next.js 14.2.3
- **Styling**: Tailwind CSS
- **AI Service**: fal.ai (Real-ESRGAN)
- **Deployment**: Cloudflare Pages
- **Language**: TypeScript 5
