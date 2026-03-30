/**
 * Image processing utilities for enhanceai
 */

// Max preview ~500KB to keep JSON response fast
export const MAX_PREVIEW_BYTES = 500 * 1024;

// Max preview dimension (longest side) for fast rendering
export const MAX_PREVIEW_DIM = 1200;

/**
 * Fast base64 encoding for ArrayBuffer.
 * Uses chunked btoa to avoid stack overflow on large buffers.
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }
  return btoa(binary);
}

/**
 * Compress image to JPEG via OffscreenCanvas.
 * - Max longest side: MAX_PREVIEW_DIM (1200px)
 * - Progressively lowers JPEG quality to hit byte budget (500KB)
 * - Falls back to smaller dimensions if still too large
 */
export async function compressToJpeg(
  inputBytes: ArrayBuffer,
  contentType: string,
  maxBytes: number = MAX_PREVIEW_BYTES,
): Promise<{ blob: Blob; width: number; height: number }> {
  const sourceBlob = new Blob([inputBytes], { type: contentType });
  const bitmap = await createImageBitmap(sourceBlob);

  let targetWidth = bitmap.width;
  let targetHeight = bitmap.height;

  // Scale down for preview — max 1200px longest side
  if (targetWidth > MAX_PREVIEW_DIM || targetHeight > MAX_PREVIEW_DIM) {
    const ratio = Math.min(MAX_PREVIEW_DIM / targetWidth, MAX_PREVIEW_DIM / targetHeight);
    targetWidth = Math.round(targetWidth * ratio);
    targetHeight = Math.round(targetHeight * ratio);
  }

  const canvas = new OffscreenCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2d context');
  }

  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

  // Progressive compression: try multiple quality levels
  let quality = 0.85;
  let blob: Blob;

  for (let attempt = 0; attempt < 5; attempt++) {
    blob = await canvas.convertToBlob({
      type: 'image/jpeg',
      quality,
    });

    if (blob.size <= maxBytes) {
      bitmap.close();
      return { blob, width: targetWidth, height: targetHeight };
    }

    // Reduce quality progressively
    quality -= 0.15;
    if (quality < 0.3) break;
  }

  // If still too large, reduce dimensions further
  const scale = Math.sqrt(maxBytes / blob!.size) * 0.9;
  targetWidth = Math.round(targetWidth * scale);
  targetHeight = Math.round(targetHeight * scale);

  const smallerCanvas = new OffscreenCanvas(targetWidth, targetHeight);
  const smallerCtx = smallerCanvas.getContext('2d');
  if (!smallerCtx) {
    throw new Error('Failed to get 2d context');
  }

  smallerCtx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close();

  blob = await smallerCanvas.convertToBlob({
    type: 'image/jpeg',
    quality: 0.6,
  });

  return { blob, width: targetWidth, height: targetHeight };
}
