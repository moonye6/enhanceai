/**
 * Cloudflare Workers / Pages type declarations
 * Used by edge runtime routes to type-check KV and env bindings
 */

import type { KVStore } from '@/lib/proStatus';
import type { R2Bucket } from '@/lib/r2';

export interface CloudflareEnv {
  ENHANCEAI_KV: KVStore;
  ENHANCEAI_R2?: R2Bucket;
  R2_PUBLIC_URL?: string;
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
      // Google OAuth
      GOOGLE_CLIENT_ID?: string;
      GOOGLE_CLIENT_SECRET?: string;
      // PayPal
      PAYPAL_CLIENT_ID?: string;
      PAYPAL_CLIENT_SECRET?: string;
      PAYPAL_WEBHOOK_ID?: string;
      PAYPAL_ENV?: 'sandbox' | 'live';
      // Site
      NEXT_PUBLIC_SITE_URL?: string;
      // AI service
      FAL_AI_API_KEY?: string;
      // R2 public URL base (e.g. https://pub-xxx.r2.dev or custom domain)
      R2_PUBLIC_URL?: string;
    }
  }
}
