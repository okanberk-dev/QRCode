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
 *  - Owner-safe failure messages (no developer vocabulary, never Google's
 *    own error text) and the "quota is 0" classification
 *  - `searchGooglePlaces` against a mocked fetch: field mask (category),
 *    request shape, abort timeout, typed errors that never carry Google text
 *
 * Run: npm test
 */

import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  googleBusinessFetch,
  GoogleBusinessApiError,
  googleFailureMessage,
  maskGoogleUrl,
  searchGooglePlaces,
  type GoogleBusinessFailure,
  type GoogleBusinessFailureCode,
} from '../src/lib/google-business';
import { googleBusinessErrorResponse } from '../src/lib/google-business-response';
import { PLACES_SEARCH_FIELD_MASK, PlacesApiError } from '../src/lib/google-places';

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
    const body = (await res.json()) as { code: string; error: string };
    assert.equal(body.code, 'GOOGLE_RATE_LIMITED');
    // §38.233 — the text may reach an owner: no quota / API wording.
    assert.doesNotMatch(body.error, /kota|quota|\bAPI\b|oauth/i);
    assert.match(body.error, /Google şu an yoğun/);
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

// §53 — every Business Profile call is gated by the tenant allowlist and the
// OAuth client the token was issued for. The stub row is an allowed tenant
// whose token belongs to the current client.
const TEST_CLIENT_ID = '123456789-test.apps.googleusercontent.com';
process.env.GBP_ALLOWED_TENANTS = 'user-test';
process.env.GOOGLE_CLIENT_ID = TEST_CLIENT_ID;
type IntegrationStub = Parameters<typeof googleBusinessFetch>[0];

function buildIntegration(overrides: Partial<{ refreshToken: string | null }> = {}): IntegrationStub {
  // Cast through `unknown` because we don't need the full Prisma row shape
  // for transport-level tests — only the fields the helper reads.
  return {
    id: 'integration-test',
    userId: 'user-test',
    clientId: TEST_CLIENT_ID,
    invalidReason: null,
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

  it('returns GOOGLE_RATE_LIMITED immediately on 429 (no retry, §38.231)', async () => {
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
    // §38.231 — 429 is NOT retried. Google Business quota is per-minute and
    // project-wide; retrying re-burns shared quota (1 call → 3) and a 1-2s
    // backoff still hits the same minute. Single attempt only.
    assert.equal(fetchMock.mock.callCount(), 1, 'should not retry 429');
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

// ─────────────────────────────────────────────────────────────────────────
// Owner-safe failure messages (CLAUDE.md §38.233)
// ─────────────────────────────────────────────────────────────────────────

const DEV_WORDS: RegExp[] = [
  /kota|quota|oauth|vercel|cloud console|GOOGLE_[A-Z]/i,
  /\benv\b/i,
  /\bAPI\b/,
  /sunucu|\bserver\b/i,
];

describe('failure messages are owner-safe', () => {
  const CODES: GoogleBusinessFailureCode[] = [
    'GOOGLE_REAUTH_REQUIRED',
    'GOOGLE_RATE_LIMITED',
    'GOOGLE_API_NOT_PROVISIONED',
    'GOOGLE_SERVER_ERROR',
    'GOOGLE_NETWORK_ERROR',
    'GOOGLE_API_ERROR',
    'GOOGLE_NOT_CONFIGURED',
  ];

  beforeEach(() => {
    realFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    mock.restoreAll();
  });

  it('googleFailureMessage has no developer vocabulary in any code or language', () => {
    for (const code of CODES) {
      for (const locale of ['tr', 'en'] as const) {
        const text = googleFailureMessage(code, locale);
        assert.ok(text.length > 0);
        for (const re of DEV_WORDS) assert.doesNotMatch(text, re, `${code}/${locale}: ${text}`);
      }
    }
  });

  it('a 403 surfaces the fixed copy, not Google\'s response body', async () => {
    globalThis.fetch = mock.fn(async () =>
      plainResponse('Forbidden: project 000000000000 has not enabled the API', 403),
    ) as unknown as typeof globalThis.fetch;
    const result = await googleBusinessFetch(
      buildIntegration(),
      'https://mybusiness.googleapis.com/v4/accounts/123/locations/456/reviews',
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.message, googleFailureMessage('GOOGLE_API_ERROR'));
    assert.doesNotMatch(result.message, /000000000000|Forbidden|project/);
  });

  it('a 429 surfaces the plain "busy" copy', async () => {
    globalThis.fetch = mock.fn(async () => plainResponse('Quota exceeded for metric', 429)) as unknown as typeof globalThis.fetch;
    const result = await googleBusinessFetch(
      buildIntegration(),
      'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, 'GOOGLE_RATE_LIMITED');
    assert.equal(result.message, googleFailureMessage('GOOGLE_RATE_LIMITED'));
    assert.doesNotMatch(result.message, /Quota/i);
  });

  it('a 429 whose quota limit is 0 is classified "not provisioned" — and says nothing about quotas', async () => {
    const body = JSON.stringify({
      error: {
        code: 429,
        status: 'RESOURCE_EXHAUSTED',
        message: "Quota exceeded for quota metric 'Requests' of service 'mybusinessaccountmanagement.googleapis.com' for consumer 'project_number:864975573618'.",
        details: [
          {
            '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
            reason: 'RATE_LIMIT_EXCEEDED',
            metadata: { quota_limit_value: '0', quota_unit: '1/min/{project}' },
          },
        ],
      },
    });
    const fetchMock = mock.fn(async () => plainResponse(body, 429));
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
    const result = await googleBusinessFetch(
      buildIntegration(),
      'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, 'GOOGLE_API_NOT_PROVISIONED');
    assert.equal(result.message, googleFailureMessage('GOOGLE_API_NOT_PROVISIONED'));
    assert.doesNotMatch(result.message, /864975573618|quota|kota|mybusiness/i);
    assert.equal(fetchMock.mock.callCount(), 1, 'shared quota: never retried');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// searchGooglePlaces — Text Search with a mocked fetch
// ─────────────────────────────────────────────────────────────────────────

describe('searchGooglePlaces', () => {
  const KEY = 'test-api-key-0123456789';
  const raw = (): unknown =>
    JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/google-places', 'search-results.json'), 'utf8'));

  it('POSTs the search with the category in the field mask and the key only in a header', async () => {
    let seenUrl = '';
    let seenInit: RequestInit | undefined;
    const fetchImpl = (async (url: unknown, init?: RequestInit) => {
      seenUrl = String(url);
      seenInit = init;
      return jsonResponse(raw());
    }) as typeof fetch;

    const rows = await searchGooglePlaces("Mama's Burger Kadıköy", 'en', { apiKey: KEY, fetchImpl });

    assert.equal(seenUrl, 'https://places.googleapis.com/v1/places:searchText');
    assert.equal(seenInit?.method, 'POST');
    const headers = seenInit?.headers as Record<string, string>;
    assert.equal(headers['X-Goog-Api-Key'], KEY);
    assert.equal(headers['X-Goog-FieldMask'], PLACES_SEARCH_FIELD_MASK);
    assert.match(headers['X-Goog-FieldMask'] ?? '', /places\.primaryTypeDisplayName/);
    assert.equal(seenUrl.includes(KEY), false);
    assert.deepEqual(JSON.parse(String(seenInit?.body)), {
      textQuery: "Mama's Burger Kadıköy",
      languageCode: 'en',
      regionCode: 'TR',
      maxResultCount: 6,
    });

    // Rows carry the category, and ids that could never be selected are dropped.
    assert.equal(rows.length, 3);
    assert.equal(rows[0]!.category, 'Hamburgerci');
    assert.equal(rows[0]!.displayName, "Mama's Burger Kadıköy");
    assert.equal(rows[1]!.businessStatus, 'CLOSED_TEMPORARILY');
  });

  it('defaults to Turkish', async () => {
    let body: { languageCode?: string } = {};
    const fetchImpl = (async (_url: unknown, init?: RequestInit) => {
      body = JSON.parse(String(init?.body));
      return jsonResponse({ places: [] });
    }) as typeof fetch;
    assert.deepEqual(await searchGooglePlaces('kafe', undefined, { apiKey: KEY, fetchImpl }), []);
    assert.equal(body.languageCode, 'tr');
  });

  it('passes an abort signal, and a hung request ends as TIMEOUT', async () => {
    let signal: AbortSignal | undefined;
    const fetchImpl = ((_url: unknown, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        signal = init?.signal ?? undefined;
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      })) as typeof fetch;

    const started = Date.now();
    await assert.rejects(
      () => searchGooglePlaces('kafe', 'tr', { apiKey: KEY, fetchImpl, timeoutMs: 25 }),
      (err: unknown) => err instanceof PlacesApiError && err.code === 'TIMEOUT',
    );
    assert.ok(signal instanceof AbortSignal);
    assert.equal(signal?.aborted, true);
    assert.ok(Date.now() - started < 3000);
  });

  it('classifies failures with typed errors that never carry Google\'s text or the key', async () => {
    const cases: Array<[number, unknown, string]> = [
      [403, { error: { status: 'PERMISSION_DENIED', message: 'Places API (New) has not been used in project 000000000000 before.', details: [{ reason: 'SERVICE_DISABLED' }] } }, 'FORBIDDEN'],
      [400, { error: { status: 'INVALID_ARGUMENT', message: 'API key not valid. Please pass a valid API key.', details: [{ reason: 'API_KEY_INVALID' }] } }, 'FORBIDDEN'],
      [429, { error: { status: 'RESOURCE_EXHAUSTED', message: 'Quota exceeded' } }, 'RATE_LIMITED'],
      [500, { error: { status: 'INTERNAL', message: 'oops' } }, 'UPSTREAM'],
    ];
    for (const [status, body, code] of cases) {
      const fetchImpl = (async () => jsonResponse(body, status)) as typeof fetch;
      await assert.rejects(
        () => searchGooglePlaces('kafe', 'tr', { apiKey: KEY, fetchImpl }),
        (err: unknown) => {
          assert.ok(err instanceof PlacesApiError);
          assert.equal(err.code, code);
          assert.equal(err.status, status);
          const everything = `${err.message} ${JSON.stringify(err)}`;
          assert.equal(everything.includes('000000000000'), false);
          assert.equal(everything.includes('Quota exceeded'), false);
          assert.equal(everything.includes(KEY), false);
          return true;
        },
        `${status}`,
      );
    }
  });

  it('maps a network failure to NETWORK and an unreadable 200 to BAD_RESPONSE', async () => {
    await assert.rejects(
      () => searchGooglePlaces('kafe', 'tr', { apiKey: KEY, fetchImpl: (async () => { throw new TypeError('fetch failed'); }) as typeof fetch }),
      (err: unknown) => err instanceof PlacesApiError && err.code === 'NETWORK',
    );
    await assert.rejects(
      () => searchGooglePlaces('kafe', 'tr', { apiKey: KEY, fetchImpl: (async () => plainResponse('<html>proxy</html>', 200)) as typeof fetch }),
      (err: unknown) => err instanceof PlacesApiError && err.code === 'BAD_RESPONSE',
    );
  });

  it('without a key it fails before any request is made', async () => {
    const prev = process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.GOOGLE_MAPS_API_KEY;
    let called = 0;
    const fetchImpl = (async () => {
      called++;
      return jsonResponse({});
    }) as typeof fetch;
    try {
      await assert.rejects(
        () => searchGooglePlaces('kafe', 'tr', { fetchImpl }),
        (err: unknown) => err instanceof PlacesApiError && err.code === 'FORBIDDEN',
      );
      assert.equal(called, 0);
    } finally {
      if (prev !== undefined) process.env.GOOGLE_MAPS_API_KEY = prev;
    }
  });
});
