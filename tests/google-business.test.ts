/**
 * Google Business API helper tests — pure helpers (URL masking, typed
 * error class) + the response mapper that converts a `GoogleBusinessApiError`
 * into a controlled HTTP response.
 *
 * These exercise the boundaries that owner UI + cron rely on without
 * touching Prisma / Sentry / network. The retry + refresh chain inside
 * `googleBusinessFetch` is exercised manually against the real Google API
 * during preview deploys (see PR test plan).
 *
 * Run: npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  GoogleBusinessApiError,
  maskGoogleUrl,
  type GoogleBusinessFailure,
} from '../src/lib/google-business';
import { googleBusinessErrorResponse } from '../src/lib/google-business-response';

describe('maskGoogleUrl', () => {
  it('drops query strings (pageToken etc.) but keeps host + path', () => {
    const masked = maskGoogleUrl(
      'https://mybusiness.googleapis.com/v4/accounts/123456/locations/789012/reviews?pageSize=50&pageToken=ABC',
    );
    assert.equal(masked, 'mybusiness.googleapis.com/v4/accounts/:id/locations/:id/reviews');
  });

  it('replaces uuid-shaped segments', () => {
    const masked = maskGoogleUrl(
      'https://mybusinessbusinessinformation.googleapis.com/v1/accounts/00000000-0000-0000-0000-000000000000/locations',
    );
    assert.equal(
      masked,
      'mybusinessbusinessinformation.googleapis.com/v1/accounts/:id/locations',
    );
  });

  it('replaces long alphanumeric resource ids (Google ChIJ-style)', () => {
    const masked = maskGoogleUrl(
      'https://places.googleapis.com/v1/places/ChIJN1t_tDeuEmsRUsoyG83frY4',
    );
    assert.equal(masked, 'places.googleapis.com/v1/places/:id');
  });

  it('preserves short well-known segments like "v1", "accounts", "locations"', () => {
    const masked = maskGoogleUrl('https://oauth2.googleapis.com/token');
    assert.equal(masked, 'oauth2.googleapis.com/token');
  });

  it('returns "invalid-url" for unparseable input rather than throwing', () => {
    assert.equal(maskGoogleUrl('not-a-url'), 'invalid-url');
    assert.equal(maskGoogleUrl(''), 'invalid-url');
  });
});

describe('GoogleBusinessApiError', () => {
  it('captures the failure code, status, and message from the source failure', () => {
    const failure: GoogleBusinessFailure = {
      ok: false,
      status: 429,
      code: 'GOOGLE_RATE_LIMITED',
      message: 'rate limited',
    };
    const err = new GoogleBusinessApiError(failure);
    assert.equal(err.status, 429);
    assert.equal(err.code, 'GOOGLE_RATE_LIMITED');
    assert.equal(err.message, 'rate limited');
    assert.equal(err.requiresReauth, false);
    assert.ok(err instanceof Error);
    assert.ok(err instanceof GoogleBusinessApiError);
  });

  it('marks requiresReauth=true when the source failure says so', () => {
    const failure: GoogleBusinessFailure = {
      ok: false,
      status: 401,
      code: 'GOOGLE_REAUTH_REQUIRED',
      message: 'reauth',
      requiresReauth: true,
    };
    const err = new GoogleBusinessApiError(failure);
    assert.equal(err.requiresReauth, true);
  });
});

describe('googleBusinessErrorResponse — controlled HTTP mapping (no 500 chain)', () => {
  function buildError(
    code: GoogleBusinessFailure['code'],
    requiresReauth = false,
    status = 502,
  ): GoogleBusinessApiError {
    return new GoogleBusinessApiError({
      ok: false,
      status,
      code,
      message: 'fail',
      requiresReauth,
    });
  }

  it('returns 401 + requiresReauth:true for an expired refresh token', async () => {
    const err = buildError('GOOGLE_REAUTH_REQUIRED', true, 401);
    const res = googleBusinessErrorResponse(err, 'fallback');
    assert.equal(res.status, 401);
    const body = (await res.json()) as { code: string; requiresReauth: boolean; error: string };
    assert.equal(body.code, 'GOOGLE_REAUTH_REQUIRED');
    assert.equal(body.requiresReauth, true);
    assert.match(body.error, /yeniden bağla/i);
  });

  it('returns 429 for GOOGLE_RATE_LIMITED so callers do not see a generic 500', async () => {
    const err = buildError('GOOGLE_RATE_LIMITED', false, 429);
    const res = googleBusinessErrorResponse(err, 'fallback');
    assert.equal(res.status, 429);
    const body = (await res.json()) as { code: string };
    assert.equal(body.code, 'GOOGLE_RATE_LIMITED');
  });

  it('returns 502 with the failure code for upstream Google errors', async () => {
    for (const code of ['GOOGLE_SERVER_ERROR', 'GOOGLE_NETWORK_ERROR', 'GOOGLE_API_ERROR'] as const) {
      const err = buildError(code, false, 502);
      const res = googleBusinessErrorResponse(err, 'işletme konumları alınamadı.');
      assert.equal(res.status, 502, `expected 502 for ${code}`);
      const body = (await res.json()) as { code: string; error: string };
      assert.equal(body.code, code);
      assert.equal(body.error, 'işletme konumları alınamadı.');
    }
  });

  it('never returns 500 — the whole point of the controlled mapping', async () => {
    const codes: GoogleBusinessFailure['code'][] = [
      'GOOGLE_REAUTH_REQUIRED',
      'GOOGLE_RATE_LIMITED',
      'GOOGLE_SERVER_ERROR',
      'GOOGLE_NETWORK_ERROR',
      'GOOGLE_API_ERROR',
      'GOOGLE_NOT_CONFIGURED',
    ];
    for (const code of codes) {
      const err = buildError(code, code === 'GOOGLE_REAUTH_REQUIRED');
      const res = googleBusinessErrorResponse(err, 'fallback');
      assert.notEqual(res.status, 500, `${code} should not return 500`);
    }
  });
});
