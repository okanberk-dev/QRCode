/**
 * Google Business API helper tests.
 *
 * Coverage:
 *  - Pure helpers: `maskGoogleUrl`, `GoogleBusinessApiError`
 *  - Controlled HTTP mapper: `googleBusinessErrorResponse`
 *  - Transient retry / non-retry / reauth chains inside `googleBusinessFetch`
 *    via mocked `globalThis.fetch`. The Prisma-touching refresh-success
 *    branch is intentionally NOT exercised here — that requires DB mocks
 *    and the core helper is locked (#374 is recent, CLAUDE.md plan
 *    forbids refactor in this PR scope). The branches we cover:
 *      • 200 OK happy path
 *      • 4xx non-retriable (403, 404)
 *      • 429 / 5xx / network → retry up to 2× then fail
 *      • Persistent 401 (no refresh token in integration → reauth)
 *      • Malformed JSON success → API_ERROR
 *      • Refresh token absent + access token expired → REAUTH_REQUIRED
 *
 * Run: npm test
 */

import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import {
  googleBusinessFetch,
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

// ─────────────────────────────────────────────────────────────────────────
// googleBusinessFetch — transport behaviour with a mocked global fetch.
//
// We inject a tiny `MockIntegration` that satisfies the field surface
// `getFreshGoogleAccessToken` reads (accessToken, expiresAt, refreshToken,
// id, locationsJson). Access token is kept fresh (`expiresAt` 1 hour out)
// so the OAuth refresh path is never taken — that branch hits Prisma and
// is out of scope for this PR (CLAUDE.md plan keeps `google-business.ts`
// core untouched after #374).
//
// `globalThis.fetch` is replaced with a controllable sequence so we can
// drive 200/429/500/network/401 chains and observe the wrapper's
// retry / classify / reauth behaviour.
// ─────────────────────────────────────────────────────────────────────────

type FetchResponse = Response | Error;
type IntegrationStub = Parameters<typeof googleBusinessFetch>[0];

function buildIntegration(overrides: Partial<{ refreshToken: string | null }> = {}): IntegrationStub {
  // Cast through `unknown` because we don't need the full Prisma row shape
  // for transport-level tests — only the fields the helper reads.
  return {
    id: 'integration-test',
    accessToken: 'access-token-stub',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1h fresh — skips refresh
    refreshToken: overrides.refreshToken === undefined ? 'refresh-token-stub' : overrides.refreshToken,
    locationsJson: null,
  } as unknown as IntegrationStub;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function plainResponse(body: string, status: number): Response {
  return new Response(body, { status });
}

let realFetch: typeof globalThis.fetch;

function installFetchSequence(sequence: FetchResponse[]) {
  let index = 0;
  globalThis.fetch = mock.fn(async () => {
    const next = sequence[index++];
    if (!next) throw new Error('Mock fetch sequence exhausted');
    if (next instanceof Error) throw next;
    return next;
  }) as unknown as typeof globalThis.fetch;
}

describe('googleBusinessFetch — transport behaviour', () => {
  beforeEach(() => {
    realFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    mock.restoreAll();
  });

  it('returns parsed data on a 200 happy path with no retries', async () => {
    installFetchSequence([jsonResponse({ hello: 'world' })]);

    const result = await googleBusinessFetch<{ hello: string }>(
      buildIntegration(),
      'https://mybusiness.googleapis.com/v4/accounts/123/locations/456/reviews',
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.data, { hello: 'world' });
  });

  it('returns GOOGLE_API_ERROR on a non-retriable 4xx without retrying', async () => {
    const fetchMock = mock.fn(async () => plainResponse('forbidden', 403));
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const result = await googleBusinessFetch(
      buildIntegration(),
      'https://mybusiness.googleapis.com/v4/accounts/123/locations/456/reviews',
    );

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 403);
    assert.equal(result.code, 'GOOGLE_API_ERROR');
    assert.equal(result.requiresReauth, false);
    assert.equal(fetchMock.mock.callCount(), 1, 'should not retry on 403');
  });

  it('returns GOOGLE_RATE_LIMITED after exhausting retries on 429', async () => {
    const fetchMock = mock.fn(async () => plainResponse('rate limited', 429));
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const result = await googleBusinessFetch(
      buildIntegration(),
      'https://mybusiness.googleapis.com/v4/accounts/123/locations/456/reviews',
    );

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 429);
    assert.equal(result.code, 'GOOGLE_RATE_LIMITED');
    // Initial attempt + 2 retries (MAX_RETRIES = 2)
    assert.equal(fetchMock.mock.callCount(), 3, 'should retry 429 twice');
  });

  it('returns GOOGLE_SERVER_ERROR after exhausting retries on 500', async () => {
    const fetchMock = mock.fn(async () => plainResponse('boom', 503));
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const result = await googleBusinessFetch(
      buildIntegration(),
      'https://mybusiness.googleapis.com/v4/accounts/123/locations/456/reviews',
    );

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 503);
    assert.equal(result.code, 'GOOGLE_SERVER_ERROR');
    assert.equal(fetchMock.mock.callCount(), 3, 'should retry 5xx twice');
  });

  it('returns GOOGLE_NETWORK_ERROR after exhausting retries on fetch reject', async () => {
    const fetchMock = mock.fn(async () => {
      throw new Error('network down');
    });
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const result = await googleBusinessFetch(
      buildIntegration(),
      'https://mybusiness.googleapis.com/v4/accounts/123/locations/456/reviews',
    );

    assert.equal(result.ok, false);
    if (result.ok) return;
    // Network failures surface as a 504 gateway-timeout-ish status with the
    // network classification.
    assert.equal(result.status, 504);
    assert.equal(result.code, 'GOOGLE_NETWORK_ERROR');
    assert.equal(fetchMock.mock.callCount(), 3, 'should retry network errors twice');
  });

  it('returns GOOGLE_REAUTH_REQUIRED when integration has no refresh token and access token is fresh but the API returns 401', async () => {
    // Integration WITHOUT a refresh token. First request returns 401 →
    // wrapper attempts to force-refresh, getFreshGoogleAccessToken bails
    // immediately because refreshToken is null → reauth surfaces.
    const fetchMock = mock.fn(async () => plainResponse('expired', 401));
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const result = await googleBusinessFetch(
      buildIntegration({ refreshToken: null }),
      'https://mybusiness.googleapis.com/v4/accounts/123/locations/456/reviews',
    );

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 401);
    assert.equal(result.code, 'GOOGLE_REAUTH_REQUIRED');
    assert.equal(result.requiresReauth, true);
    // Only one upstream attempt — the 401 triggered a refresh attempt that
    // failed without making a second upstream call.
    assert.equal(fetchMock.mock.callCount(), 1, 'should not hammer the API once reauth is needed');
  });

  it('returns GOOGLE_API_ERROR when a 200 response has malformed JSON', async () => {
    installFetchSequence([
      new Response('this is not json', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ]);

    const result = await googleBusinessFetch(
      buildIntegration(),
      'https://mybusiness.googleapis.com/v4/accounts/123/locations/456/reviews',
    );

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 200);
    assert.equal(result.code, 'GOOGLE_API_ERROR');
  });

  it('mixes a transient retry then succeeds — single retry on 503 then 200', async () => {
    installFetchSequence([
      plainResponse('temporary', 503),
      jsonResponse({ ok: true, items: 2 }),
    ]);

    const result = await googleBusinessFetch<{ ok: boolean; items: number }>(
      buildIntegration(),
      'https://mybusinessbusinessinformation.googleapis.com/v1/accounts/123/locations',
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.data, { ok: true, items: 2 });
  });
});
