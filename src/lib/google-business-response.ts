import { NextResponse } from 'next/server';
import { ApiErrors } from '@/lib/api-errors';
import type { GoogleBusinessApiError } from '@/lib/google-business';

/**
 * Translate a `GoogleBusinessApiError` into a controlled HTTP response.
 *
 * - `GOOGLE_REAUTH_REQUIRED` → 401 + `requiresReauth: true` so owner UI
 *   can show a "reconnect Google" CTA instead of a generic 500.
 * - `GOOGLE_RATE_LIMITED` → 429 (Retry-After hint left to caller of
 *   ApiErrors.tooManyRequests if needed; default ok).
 * - All other failures (`GOOGLE_SERVER_ERROR`, `GOOGLE_NETWORK_ERROR`,
 *   `GOOGLE_API_ERROR`, `GOOGLE_NOT_CONFIGURED`) → 502 with the typed
 *   code so clients can branch without parsing strings.
 *
 * The Sentry capture has already happened inside `googleBusinessFetch`;
 * this layer is purely about response shape — no extra event fired.
 */
export function googleBusinessErrorResponse(
  error: GoogleBusinessApiError,
  fallbackMessage: string,
): NextResponse {
  if (error.requiresReauth) {
    return NextResponse.json(
      {
        error: 'Google bağlantısı süresi doldu. Hesabı yeniden bağlayın.',
        code: 'GOOGLE_REAUTH_REQUIRED',
        requiresReauth: true,
      },
      { status: 401 },
    );
  }
  if (error.code === 'GOOGLE_RATE_LIMITED') {
    return ApiErrors.tooManyRequests(
      'Google API rate limit. Birkaç dakika sonra tekrar deneyin.',
      'GOOGLE_RATE_LIMITED',
    );
  }
  return NextResponse.json(
    { error: fallbackMessage, code: error.code },
    { status: 502 },
  );
}
