/**
 * 客户端限流工具（仅用于 UI 展示）
 *
 * ⚠️ 重要：客户端限流不可信，实际限流由服务端 (API /api/enhance) 通过 KV 实现。
 * 此模块仅作为 UI 提示，帮助用户了解大致的剩余次数。
 * 服务端返回的 remaining 值会覆盖客户端计数。
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  total: number;
  resetAt: string;
}

const FREE_TIER_LIMIT = 3;
const PRO_TIER_LIMIT = 100;
const STORAGE_KEY = 'enhanceai_usage';

interface UsageData {
  count: number;
  date: string; // YYYY-MM-DD
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getTomorrow(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

function getUsage(): UsageData {
  if (typeof window === 'undefined') {
    return { count: 0, date: getToday() };
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  const today = getToday();

  if (!stored) {
    return { count: 0, date: today };
  }

  const usage: UsageData = JSON.parse(stored);
  // 跨日自动重置
  if (usage.date !== today) {
    return { count: 0, date: today };
  }

  return usage;
}

/**
 * 查询客户端缓存的限流状态（仅用于 UI 展示）
 */
export function checkRateLimit(isPro = false): RateLimitResult {
  const limit = isPro ? PRO_TIER_LIMIT : FREE_TIER_LIMIT;
  const usage = getUsage();
  const remaining = Math.max(0, limit - usage.count);

  return {
    allowed: usage.count < limit,
    remaining,
    total: limit,
    resetAt: getTomorrow(),
  };
}

/**
 * 增加客户端计数（调用增强 API 成功后调用）
 */
export function incrementUsage(isPro = false): RateLimitResult {
  if (typeof window === 'undefined') {
    const limit = isPro ? PRO_TIER_LIMIT : FREE_TIER_LIMIT;
    return { allowed: true, remaining: limit, total: limit, resetAt: '' };
  }

  const limit = isPro ? PRO_TIER_LIMIT : FREE_TIER_LIMIT;
  const usage = getUsage();
  usage.count += 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));

  const remaining = Math.max(0, limit - usage.count);

  return {
    allowed: usage.count < limit,
    remaining,
    total: limit,
    resetAt: getTomorrow(),
  };
}

/**
 * 同步服务端返回的真实剩余次数到客户端缓存
 */
export function syncFromServer(serverRemaining: number, isPro = false): RateLimitResult {
  if (typeof window === 'undefined') {
    const limit = isPro ? PRO_TIER_LIMIT : FREE_TIER_LIMIT;
    return { allowed: true, remaining: limit, total: limit, resetAt: '' };
  }

  const limit = isPro ? PRO_TIER_LIMIT : FREE_TIER_LIMIT;
  const today = getToday();
  const count = Math.max(0, limit - serverRemaining);

  localStorage.setItem(STORAGE_KEY, JSON.stringify({ count, date: today }));

  return {
    allowed: serverRemaining > 0,
    remaining: serverRemaining,
    total: limit,
    resetAt: getTomorrow(),
  };
}

/**
 * 获取使用信息
 */
export function getUsageInfo(): { count: number; date: string } {
  return getUsage();
}
