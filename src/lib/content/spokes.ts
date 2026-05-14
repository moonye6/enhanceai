import { UPSCALE_SPOKES } from '@/content/spokes/upscale';
import { RESTORE_SPOKES } from '@/content/spokes/restore';
import { COMPARE_SPOKES } from '@/content/spokes/vs';
import type {
  UpscaleSpoke,
  RestoreSpoke,
  CompareSpoke,
  SpokeType,
} from './types';

export function getAllUpscaleSpokes(): UpscaleSpoke[] {
  return UPSCALE_SPOKES;
}

export function getUpscaleSpoke(slug: string): UpscaleSpoke | undefined {
  return UPSCALE_SPOKES.find((s) => s.slug === slug);
}

export function getAllRestoreSpokes(): RestoreSpoke[] {
  return RESTORE_SPOKES;
}

export function getRestoreSpoke(slug: string): RestoreSpoke | undefined {
  return RESTORE_SPOKES.find((s) => s.slug === slug);
}

export function getAllCompareSpokes(): CompareSpoke[] {
  return COMPARE_SPOKES;
}

export function getCompareSpoke(slug: string): CompareSpoke | undefined {
  return COMPARE_SPOKES.find((s) => s.slug === slug);
}

/** All spoke slugs grouped by type — for sitemap generation. */
export function getAllSpokeSlugs(): Record<SpokeType, string[]> {
  return {
    upscale: UPSCALE_SPOKES.map((s) => s.slug),
    restore: RESTORE_SPOKES.map((s) => s.slug),
    vs: COMPARE_SPOKES.map((s) => s.slug),
  };
}
