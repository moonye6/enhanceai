/**
 * 用户标识工具
 * 从 cookie 读取 userId，不存在则生成 UUID 并写入 Set-Cookie
 * Edge Runtime 兼容
 */

export const runtime = 'edge';

const COOKIE_NAME = 'enhanceai_uid';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 年

/**
 * 解析 Cookie 字符串中特定 key 的值
 */
function parseCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

/**
 * 生成 UUID v4（Edge Runtime 使用 crypto.randomUUID）
 */
function generateUUID(): string {
  // crypto.randomUUID() 在 Cloudflare Workers / modern browsers 均可用
  return crypto.randomUUID();
}

export interface UserIdResult {
  userId: string;
  /** 当 userId 是新生成的，需要将此 header 写入 Response */
  setCookieHeader: string | null;
}

/**
 * 获取请求中的 userId
 * - 已有 cookie：直接返回，setCookieHeader=null
 * - 没有 cookie：生成 UUID，返回 setCookieHeader 供调用方写入响应
 */
export function getUserId(request: Request): UserIdResult {
  const cookieHeader = request.headers.get('cookie');
  const existing = parseCookie(cookieHeader, COOKIE_NAME);

  if (existing) {
    return { userId: existing, setCookieHeader: null };
  }

  const userId = generateUUID();
  const setCookieHeader = [
    `${COOKIE_NAME}=${encodeURIComponent(userId)}`,
    `Max-Age=${COOKIE_MAX_AGE}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    // Secure 在生产中自动生效（HTTPS），本地 sandbox 不强制
    ...(process.env.NODE_ENV === 'production' ? ['Secure'] : []),
  ].join('; ');

  return { userId, setCookieHeader };
}
