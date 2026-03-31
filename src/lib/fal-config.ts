/**
 * fal.ai configuration — single source of truth
 *
 * All fal.ai related constants live here. Both the enhance API (submit)
 * and the status API (poll/result) import from this file so they can
 * never drift out of sync.
 */

// ── Model ───────────────────────────────────────────────────────────
export const FAL_MODEL_ID = 'fal-ai/aura-sr';

// ── Queue API ───────────────────────────────────────────────────────
// Submit:  POST  ${FAL_QUEUE_BASE}/${FAL_MODEL_ID}
// Status:  GET   ${FAL_QUEUE_BASE}/${FAL_MODEL_ID}/requests/{id}/status
// Result:  GET   ${FAL_QUEUE_BASE}/${FAL_MODEL_ID}/requests/{id}
export const FAL_QUEUE_BASE = 'https://queue.fal.run';
export const FAL_QUEUE_SUBMIT_URL = `${FAL_QUEUE_BASE}/${FAL_MODEL_ID}`;

// ── Model parameters ────────────────────────────────────────────────
export const UPSCALE_FACTOR = 4;           // aura-sr only supports 4
export const OVERLAPPING_TILES = false;    // false ≈ 50% faster
export const MAX_INPUT_DIMENSION = 1024;   // pre-compress inputs above this

// ── Rate limits ─────────────────────────────────────────────────────
export const FREE_TIER_LIMIT = 3;          // lifetime total (never resets)
export const PRO_TIER_LIMIT = 100;         // per calendar month
