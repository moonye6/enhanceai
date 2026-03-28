// Rate limiting utility

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  total: number;
  resetAt: string;
}

const FREE_TIER_LIMIT = 3; // 3 times per day
const PRO_TIER_LIMIT = 100; // 100 times per day for Pro users
const STORAGE_KEY = 'enhanceai_usage';

interface UsageData {
  count: number;
  date: string; // YYYY-MM-DD
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export function checkRateLimit(isPro = false): RateLimitResult {
  if (typeof window === 'undefined') {
    return { allowed: true, remaining: FREE_TIER_LIMIT, total: FREE_TIER_LIMIT, resetAt: '' };
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  const today = getToday();
  const limit = isPro ? PRO_TIER_LIMIT : FREE_TIER_LIMIT;
  
  let usage: UsageData;
  
  if (!stored) {
    usage = { count: 0, date: today };
  } else {
    usage = JSON.parse(stored);
    // Reset count on new day
    if (usage.date !== today) {
      usage = { count: 0, date: today };
    }
  }

  const remaining = Math.max(0, limit - usage.count);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  return {
    allowed: usage.count < limit,
    remaining,
    total: limit,
    resetAt: tomorrow.toISOString(),
  };
}

export function incrementUsage(isPro = false): RateLimitResult {
  if (typeof window === 'undefined') {
    return { allowed: true, remaining: FREE_TIER_LIMIT, total: FREE_TIER_LIMIT, resetAt: '' };
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  const today = getToday();
  const limit = isPro ? PRO_TIER_LIMIT : FREE_TIER_LIMIT;
  
  let usage: UsageData;
  
  if (!stored) {
    usage = { count: 0, date: today };
  } else {
    usage = JSON.parse(stored);
    if (usage.date !== today) {
      usage = { count: 0, date: today };
    }
  }

  usage.count += 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));

  const remaining = Math.max(0, limit - usage.count);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  return {
    allowed: usage.count < limit,
    remaining,
    total: limit,
    resetAt: tomorrow.toISOString(),
  };
}

export function getUsageInfo(): { count: number; date: string } {
  if (typeof window === 'undefined') {
    return { count: 0, date: getToday() };
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  const today = getToday();
  
  if (!stored) {
    return { count: 0, date: today };
  }

  const usage: UsageData = JSON.parse(stored);
  if (usage.date !== today) {
    return { count: 0, date: today };
  }

  return usage;
}
