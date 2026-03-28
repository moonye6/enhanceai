/**
 * Cloudflare Workers / Pages type declarations
 * Used by edge runtime routes to type-check KV and env bindings
 */

import type { KVStore } from '@/lib/proStatus';

export interface CloudflareEnv {
  ENHANCEAI_KV: KVStore;
  PAYPAL_CLIENT_ID: string;
  PAYPAL_CLIENT_SECRET: string;
  PAYPAL_WEBHOOK_ID: string;
  PAYPAL_ENV: 'sandbox' | 'live';
  NEXT_PUBLIC_SITE_URL: string;
}

// Augment process.env for non-edge contexts
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PAYPAL_CLIENT_ID?: string;
      PAYPAL_CLIENT_SECRET?: string;
      PAYPAL_WEBHOOK_ID?: string;
      PAYPAL_ENV?: 'sandbox' | 'live';
      NEXT_PUBLIC_SITE_URL?: string;
    }
  }
}
