/**
 * Pro 状态管理（Cloudflare KV）
 * KV binding: ENHANCEAI_KV
 * Edge Runtime 兼容
 */

export const runtime = 'edge';

export type ProPlan = 'monthly' | 'lifetime';

export interface ProStatus {
  isPro: boolean;
  plan: ProPlan | null;
  expiresAt: string | null; // ISO 8601，lifetime 为 null
}

interface KVProRecord {
  plan: ProPlan;
  expiresAt: string | null;
  updatedAt: string;
}

/** Minimal KV interface (subset of Cloudflare KVNamespace) */
export interface KVStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

function kvKey(userId: string): string {
  return `pro:${userId}`;
}

/**
 * 读取用户 Pro 状态
 */
export async function getProStatus(
  userId: string,
  kv: KVStore,
): Promise<ProStatus> {
  const raw = await kv.get(kvKey(userId));

  if (!raw) {
    return { isPro: false, plan: null, expiresAt: null };
  }

  const record = JSON.parse(raw) as KVProRecord;

  // 检查 monthly 是否已过期
  if (record.plan === 'monthly' && record.expiresAt) {
    const expired = new Date(record.expiresAt) < new Date();
    if (expired) {
      kv.delete(kvKey(userId)).catch(() => undefined);
      return { isPro: false, plan: null, expiresAt: null };
    }
  }

  return {
    isPro: true,
    plan: record.plan,
    expiresAt: record.expiresAt,
  };
}

/**
 * 写入用户 Pro 状态
 */
export async function setProStatus(
  userId: string,
  plan: ProPlan,
  kv: KVStore,
  expiresAt?: Date,
): Promise<void> {
  const record: KVProRecord = {
    plan,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    updatedAt: new Date().toISOString(),
  };

  const ttlSeconds =
    plan === 'monthly' && expiresAt
      ? Math.floor((expiresAt.getTime() - Date.now()) / 1000) + 86400
      : undefined;

  await kv.put(kvKey(userId), JSON.stringify(record), {
    expirationTtl: ttlSeconds,
  });
}
