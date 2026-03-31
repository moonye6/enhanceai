/**
 * 客户端限流工具（仅用于 UI 展示）
 *
 * ⚠️ 重要：客户端限流不可信，实际限流由服务端 (API /api/enhance) 通过 KV 实现。
 * 此模块仅作为 UI 提示，帮助用户了解大致的剩余次数。
 * 服务端返回的 remaining 值会覆盖客户端计数。
 */

import { FREE_TIER_LIMIT, PRO_TIER_LIMIT } from '@/lib/fal-config';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  total: number;
  resetAt: string;  // 免费用户为空，Pro 用户为下月重置时间
}
const STORAGE_KEY = 'enhanceai_usage';

interface UsageData {
  count: number;
  // 免费用户：无日期（永久计数）
  // Pro 用户：月份 YYYY-MM
  period?: string;
}

function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);  // YYYY-MM
}

function getNextMonth(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString();
}

function getUsage(isPro = false): UsageData {
  if (typeof window === 'undefined') {
    return { count: 0 };
  }

  const stored = localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return { count: 0 };
  }

  const usage: UsageData = JSON.parse(stored);

  // Pro 用户：跨月自动重置
  if (isPro && usage.period && usage.period !== getCurrentMonth()) {
    return { count: 0 };
  }

  return usage;
}

/**
 * 查询客户端缓存的限流状态（仅用于 UI 展示）
 */
export function checkRateLimit(isPro = false): RateLimitResult {
  const limit = isPro ? PRO_TIER_LIMIT : FREE_TIER_LIMIT;
  const usage = getUsage(isPro);
  const remaining = Math.max(0, limit - usage.count);

  return {
    allowed: usage.count < limit,
    remaining,
    total: limit,
    resetAt: isPro ? getNextMonth() : '',  // 免费用户不重置
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
  const usage = getUsage(isPro);
  usage.count += 1;

  // Pro 用户记录当前月份
  if (isPro) {
    usage.period = getCurrentMonth();
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));

  const remaining = Math.max(0, limit - usage.count);

  return {
    allowed: usage.count < limit,
    remaining,
    total: limit,
    resetAt: isPro ? getNextMonth() : '',
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
  const count = Math.max(0, limit - serverRemaining);

  const usage: UsageData = { count };
  if (isPro) {
    usage.period = getCurrentMonth();
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));

  return {
    allowed: serverRemaining > 0,
    remaining: serverRemaining,
    total: limit,
    resetAt: isPro ? getNextMonth() : '',
  };
}

/**
 * 获取使用信息
 */
export function getUsageInfo(): { count: number; period?: string } {
  return getUsage(false);
}
