/**
 * Cloudflare R2 helpers — persists enhanced HD images for history.
 *
 * Bucket binding: ENHANCEAI_R2 (declared in wrangler.toml)
 * Public URL base: R2_PUBLIC_URL env (e.g. https://pub-xxxxx.r2.dev or custom domain)
 *
 * 30-day retention is enforced via the bucket's lifecycle rule (set in
 * Cloudflare Dashboard → R2 → bucket → Settings → Object lifecycle rules),
 * not in code — R2's binding API has no per-object TTL.
 */

export const runtime = 'edge';

/** Minimal R2 binding surface used by this app */
export interface R2Bucket {
  put(
    key: string,
    value: ArrayBuffer | ReadableStream | string,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
}

/**
 * Upload HD enhanced image to R2 and return its public URL.
 * Returns null when R2/public URL not configured, or upload fails — caller
 * should fall back to the source URL.
 */
export async function uploadHdImage(
  r2: R2Bucket | null,
  publicBase: string | null,
  bytes: ArrayBuffer,
  contentType: string,
  userId: string,
): Promise<string | null> {
  if (!r2 || !publicBase || !userId) return null;

  const ext = (contentType.split('/')[1] || 'jpg').split(';')[0];
  const key = `hd/${userId}/${Date.now()}.${ext}`;

  try {
    await r2.put(key, bytes, {
      httpMetadata: { contentType },
    });
    return `${publicBase.replace(/\/+$/, '')}/${key}`;
  } catch (err) {
    console.warn('[r2] upload failed:', err);
    return null;
  }
}
