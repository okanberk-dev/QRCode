import { buildGoogleReviewUrl } from '@/lib/google-review';

export interface NormalizedGoogleInput {
  googlePlaceId: string | null;
  googleReviewUrl: string | null;
}

export function normalizeGoogleReviewInput(
  input: string | null | undefined,
): NormalizedGoogleInput {
  const raw = typeof input === 'string' ? input.trim() : '';
  if (!raw) {
    return { googlePlaceId: null, googleReviewUrl: null };
  }

  return {
    // Keep the owner-entered value. Public `/r/[slug]` already accepts raw
    // Place IDs, Maps URLs, and write-review URLs through buildGoogleReviewUrl.
    googlePlaceId: raw,
    googleReviewUrl: buildGoogleReviewUrl(raw),
  };
}

