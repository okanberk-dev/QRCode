/**
 * Google Business Profile showcase + access gate (CLAUDE.md §53).
 *
 * Covers the pure, DB-free parts:
 *  - token refresh exchange classification (`requestGoogleTokenRefresh`)
 *  - access-token reuse window (`accessTokenNeedsRefresh`)
 *  - allowlist parsing + matching (`parseAllowedTenants`, `tenantMatchesAllowlist`)
 *  - client id → project number, connection state on client id mismatch
 *  - tenant + client-id gates inside `googleBusinessFetch` (no Google call)
 *  - revoke at Google (`revokeGoogleToken`)
 *  - review conversion, display selection, refresh spread and backoff
 *
 * Run: npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  accessTokenNeedsRefresh,
  gbpGlobalRequestsPerMinute,
  googleBusinessFetch,
  requestGoogleTokenRefresh,
} from '../src/lib/google-business';
import {
  APPROVED_GBP_PROJECT_NUMBER,
  googleClientProjectNumber,
  googleConnectionState,
  isGoogleTenantAllowed,
  parseAllowedTenants,
  tenantMatchesAllowlist,
} from '../src/lib/gbp-access';
import { revokeGoogleToken } from '../src/lib/google-revoke';
import {
  BACKOFF_MAX_MS,
  REFRESH_MAX_MS,
  REFRESH_MIN_MS,
  backoffDelayMs,
  isQuotaPressure,
  normalizeGoogleReview,
  normalizeGoogleReviews,
  parseStoredReviews,
  pickDisplayReviews,
  refreshIntervalMs,
  reviewsUrlFor,
  starRatingToNumber,
} from '../src/lib/google-review-showcase';

const HIZLAKIRALA_CLIENT = '899672574996-aop9j5ckdf2qj406eeqs90hgltr6oht6.apps.googleusercontent.com';
const OTHER_CLIENT = '111111111111-zzzz.apps.googleusercontent.com';

type FetchCall = { url: string; init: RequestInit };

function fakeFetch(response: Response | Error, calls: FetchCall[] = []): typeof fetch {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    if (response instanceof Error) throw response;
    return response;
  }) as typeof fetch;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

// ─── token refresh ───────────────────────────────────────────────────────

describe('requestGoogleTokenRefresh', () => {
  const params = { clientId: HIZLAKIRALA_CLIENT, clientSecret: 'secret-x', refreshToken: 'refresh-x' };

  it('returns the new access token and posts a refresh_token grant', async () => {
    const calls: FetchCall[] = [];
    const out = await requestGoogleTokenRefresh(params, {
      fetchImpl: fakeFetch(json({ access_token: 'new-access', expires_in: 3599 }), calls),
    });
    assert.deepEqual(out, { kind: 'ok', accessToken: 'new-access', expiresInSeconds: 3599 });
    assert.equal(calls[0].url, 'https://oauth2.googleapis.com/token');
    const body = new URLSearchParams(String(calls[0].init.body));
    assert.equal(body.get('grant_type'), 'refresh_token');
    assert.equal(body.get('client_id'), HIZLAKIRALA_CLIENT);
    assert.equal(body.get('refresh_token'), 'refresh-x');
    // Secrets travel only in the POST body, never in the URL.
    assert.ok(!calls[0].url.includes('secret-x'));
  });

  it('defaults a missing / tiny expires_in', async () => {
    const a = await requestGoogleTokenRefresh(params, { fetchImpl: fakeFetch(json({ access_token: 't' })) });
    assert.equal(a.kind === 'ok' && a.expiresInSeconds, 3600);
    const b = await requestGoogleTokenRefresh(params, {
      fetchImpl: fakeFetch(json({ access_token: 't', expires_in: 5 })),
    });
    assert.equal(b.kind === 'ok' && b.expiresInSeconds, 60);
  });

  it('classifies invalid_grant / invalid_client / unauthorized_client as a dead grant', async () => {
    for (const error of ['invalid_grant', 'invalid_client', 'unauthorized_client']) {
      const out = await requestGoogleTokenRefresh(params, { fetchImpl: fakeFetch(json({ error }, 400)) });
      assert.equal(out.kind, 'dead_grant', error);
    }
  });

  it('keeps the token on 429 and other 4xx', async () => {
    assert.equal(
      (await requestGoogleTokenRefresh(params, { fetchImpl: fakeFetch(json({ error: 'rate' }, 429)) })).kind,
      'rate_limited',
    );
    assert.equal(
      (await requestGoogleTokenRefresh(params, { fetchImpl: fakeFetch(json({ error: 'invalid_request' }, 400)) })).kind,
      'client_error',
    );
  });

  it('treats 5xx, network errors and unparseable success bodies as transient', async () => {
    assert.equal((await requestGoogleTokenRefresh(params, { fetchImpl: fakeFetch(json({}, 503)) })).kind, 'transient');
    assert.equal((await requestGoogleTokenRefresh(params, { fetchImpl: fakeFetch(new TypeError('boom')) })).kind, 'transient');
    assert.equal(
      (await requestGoogleTokenRefresh(params, { fetchImpl: fakeFetch(new Response('not json', { status: 200 })) })).kind,
      'transient',
    );
  });

  it('reports a 200 without access_token as missing_token', async () => {
    const out = await requestGoogleTokenRefresh(params, { fetchImpl: fakeFetch(json({ token_type: 'Bearer' })) });
    assert.equal(out.kind, 'missing_token');
  });
});

describe('accessTokenNeedsRefresh', () => {
  const now = Date.UTC(2026, 10, 24, 12, 0, 0);
  it('reuses a token with more than 60s left', () => {
    assert.equal(accessTokenNeedsRefresh(new Date(now + 61_000), now), false);
  });
  it('refreshes a token at or under 60s left, or expired', () => {
    assert.equal(accessTokenNeedsRefresh(new Date(now + 60_000), now), true);
    assert.equal(accessTokenNeedsRefresh(new Date(now - 1), now), true);
  });
});

describe('gbpGlobalRequestsPerMinute', () => {
  it('defaults to 120 and rejects typos / out-of-range values', () => {
    assert.equal(gbpGlobalRequestsPerMinute(undefined), 120);
    assert.equal(gbpGlobalRequestsPerMinute('60'), 60);
    for (const bad of ['', 'abc', '0', '-5', '301', '1.5']) assert.equal(gbpGlobalRequestsPerMinute(bad), 120, bad);
  });
});

// ─── allowlist + client id ───────────────────────────────────────────────

describe('tenant allowlist', () => {
  it('parses comma / whitespace separated entries, lowercased', () => {
    assert.deepEqual([...parseAllowedTenants(' hizlakirala, User_ABC\nother ')], ['hizlakirala', 'user_abc', 'other']);
    assert.equal(parseAllowedTenants(undefined).size, 0);
    assert.equal(parseAllowedTenants('  ,  ').size, 0);
  });

  it('matches by business slug or owner id; empty allowlist opens nobody', () => {
    const list = parseAllowedTenants('hizlakirala');
    assert.equal(tenantMatchesAllowlist(list, { ownerIds: ['u1'], slugs: ['kadikoy-cafe', 'hizlakirala'] }), true);
    assert.equal(tenantMatchesAllowlist(list, { ownerIds: ['u2'], slugs: ['other-business'] }), false);
    assert.equal(tenantMatchesAllowlist(parseAllowedTenants('U1'), { ownerIds: ['u1'], slugs: [] }), true);
    assert.equal(tenantMatchesAllowlist(new Set(), { ownerIds: ['u1'], slugs: ['hizlakirala'] }), false);
  });

  it("matches the owner's sign-in e-mail case-insensitively", () => {
    const list = parseAllowedTenants('Owner@Example.com');
    assert.equal(tenantMatchesAllowlist(list, { ownerIds: ['u1'], slugs: [], emails: ['owner@example.com'] }), true);
    assert.equal(tenantMatchesAllowlist(list, { ownerIds: ['u1'], slugs: [], emails: ['other@example.com'] }), false);
  });

  it('opens every workspace with *, but still never admin rows', async () => {
    assert.equal(tenantMatchesAllowlist(parseAllowedTenants('*'), { ownerIds: ['u9'], slugs: [] }), true);
    const saved = process.env.GBP_ALLOWED_TENANTS;
    try {
      process.env.GBP_ALLOWED_TENANTS = '*';
      assert.equal(await isGoogleTenantAllowed('any-user'), true);
      assert.equal(await isGoogleTenantAllowed('admin:a1'), false);
    } finally {
      process.env.GBP_ALLOWED_TENANTS = saved;
    }
  });

  it('never opens admin-made rows and fails closed without an allowlist', async () => {
    const saved = process.env.GBP_ALLOWED_TENANTS;
    try {
      process.env.GBP_ALLOWED_TENANTS = 'admin:a1,user-direct';
      assert.equal(await isGoogleTenantAllowed('admin:a1'), false);
      assert.equal(await isGoogleTenantAllowed('user-direct'), true);
      process.env.GBP_ALLOWED_TENANTS = '';
      assert.equal(await isGoogleTenantAllowed('user-direct'), false);
      assert.equal(await isGoogleTenantAllowed(null), false);
    } finally {
      process.env.GBP_ALLOWED_TENANTS = saved;
    }
  });
});

describe('client id', () => {
  it('extracts the Google Cloud project number', () => {
    assert.equal(googleClientProjectNumber(HIZLAKIRALA_CLIENT), APPROVED_GBP_PROJECT_NUMBER);
    assert.equal(googleClientProjectNumber(OTHER_CLIENT), '111111111111');
    assert.equal(googleClientProjectNumber('not-a-client'), null);
    assert.equal(googleClientProjectNumber(undefined), null);
  });

  it('marks a token from another client (or of unknown client) as reconnect_required', () => {
    const base = { refreshToken: 'enc', clientId: HIZLAKIRALA_CLIENT, invalidReason: null };
    assert.equal(googleConnectionState(base, HIZLAKIRALA_CLIENT), 'connected');
    assert.equal(googleConnectionState(base, OTHER_CLIENT), 'reconnect_required');
    assert.equal(googleConnectionState({ ...base, clientId: null }, HIZLAKIRALA_CLIENT), 'reconnect_required');
    assert.equal(googleConnectionState(base, undefined), 'reconnect_required');
  });

  it('marks a revoked grant as broken and a missing row as not_connected', () => {
    assert.equal(
      googleConnectionState({ refreshToken: null, clientId: HIZLAKIRALA_CLIENT, invalidReason: 'revoked' }, HIZLAKIRALA_CLIENT),
      'broken',
    );
    assert.equal(googleConnectionState(null, HIZLAKIRALA_CLIENT), 'not_connected');
  });
});

describe('googleBusinessFetch gates (no Google request is made)', () => {
  function row(overrides: Record<string, unknown>) {
    return {
      id: 'int-1',
      userId: 'tenant-open',
      clientId: HIZLAKIRALA_CLIENT,
      invalidReason: null,
      accessToken: 'plain-access',
      refreshToken: 'plain-refresh',
      expiresAt: new Date(Date.now() + 3_600_000),
      locationsJson: null,
      ...overrides,
    } as unknown as Parameters<typeof googleBusinessFetch>[0];
  }

  async function withEnv<T>(fn: (calls: FetchCall[]) => Promise<T>): Promise<T> {
    const saved = { t: process.env.GBP_ALLOWED_TENANTS, c: process.env.GOOGLE_CLIENT_ID, f: globalThis.fetch };
    const calls: FetchCall[] = [];
    process.env.GBP_ALLOWED_TENANTS = 'tenant-open';
    process.env.GOOGLE_CLIENT_ID = HIZLAKIRALA_CLIENT;
    globalThis.fetch = fakeFetch(json({ ok: true }), calls);
    try {
      return await fn(calls);
    } finally {
      process.env.GBP_ALLOWED_TENANTS = saved.t;
      process.env.GOOGLE_CLIENT_ID = saved.c;
      globalThis.fetch = saved.f;
    }
  }

  it('refuses a closed tenant with 403 GOOGLE_TENANT_NOT_ALLOWED', async () => {
    await withEnv(async (calls) => {
      const res = await googleBusinessFetch(row({ userId: 'admin:x' }), 'https://mybusiness.googleapis.com/v4/x');
      assert.equal(res.ok, false);
      if (res.ok) return;
      assert.equal(res.status, 403);
      assert.equal(res.code, 'GOOGLE_TENANT_NOT_ALLOWED');
      assert.equal(calls.length, 0);
    });
  });

  it('asks for a reconnect when the token belongs to another OAuth client', async () => {
    await withEnv(async (calls) => {
      const integration = row({ clientId: OTHER_CLIENT });
      const res = await googleBusinessFetch(integration, 'https://mybusiness.googleapis.com/v4/x');
      assert.equal(res.ok, false);
      if (res.ok) return;
      assert.equal(res.code, 'GOOGLE_REAUTH_REQUIRED');
      assert.equal(res.requiresReauth, true);
      assert.equal(calls.length, 0);
      // The row is marked in memory even if the DB write is unavailable.
      assert.equal((integration as unknown as { invalidReason: string }).invalidReason, 'client_changed');
    });
  });

  it('asks for a reconnect on a revoked (broken) connection', async () => {
    await withEnv(async (calls) => {
      const res = await googleBusinessFetch(row({ invalidReason: 'revoked' }), 'https://mybusiness.googleapis.com/v4/x');
      assert.equal(res.ok, false);
      if (!res.ok) assert.equal(res.code, 'GOOGLE_REAUTH_REQUIRED');
      assert.equal(calls.length, 0);
    });
  });

  it('lets an allowed tenant with a matching client through', async () => {
    await withEnv(async (calls) => {
      const res = await googleBusinessFetch<{ ok: boolean }>(row({}), 'https://mybusiness.googleapis.com/v4/x');
      assert.equal(res.ok, true);
      assert.equal(calls.length, 1);
      assert.equal((calls[0].init.headers as Record<string, string>).Authorization, 'Bearer plain-access');
    });
  });
});

// ─── disconnect / revoke ─────────────────────────────────────────────────

describe('revokeGoogleToken', () => {
  it('posts the token in the body to the revoke endpoint', async () => {
    const calls: FetchCall[] = [];
    assert.equal(await revokeGoogleToken('tok-1', { fetchImpl: fakeFetch(new Response('', { status: 200 }), calls) }), true);
    assert.equal(calls[0].url, 'https://oauth2.googleapis.com/revoke');
    assert.equal(calls[0].init.method, 'POST');
    assert.equal(new URLSearchParams(String(calls[0].init.body)).get('token'), 'tok-1');
    assert.ok(!calls[0].url.includes('tok-1'));
  });

  it('counts an already-revoked token (400) as done', async () => {
    assert.equal(await revokeGoogleToken('t', { fetchImpl: fakeFetch(json({ error: 'invalid_token' }, 400)) }), true);
  });

  it('reports failure on 5xx / network and never throws', async () => {
    assert.equal(await revokeGoogleToken('t', { fetchImpl: fakeFetch(new Response('', { status: 503 })) }), false);
    assert.equal(await revokeGoogleToken('t', { fetchImpl: fakeFetch(new TypeError('offline')) }), false);
    assert.equal(await revokeGoogleToken('', { fetchImpl: fakeFetch(json({})) }), false);
  });
});

// ─── review conversion ──────────────────────────────────────────────────

describe('starRatingToNumber', () => {
  it('maps ONE..FIVE to 1..5', () => {
    assert.deepEqual(['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'].map(starRatingToNumber), [1, 2, 3, 4, 5]);
    assert.equal(starRatingToNumber('five'), 5);
  });
  it('returns null for unspecified or junk', () => {
    for (const v of ['STAR_RATING_UNSPECIFIED', '', 'SIX', null, undefined, 0, 6, 4.5]) {
      assert.equal(starRatingToNumber(v), null, String(v));
    }
    assert.equal(starRatingToNumber(4), 4);
  });
});

describe('normalizeGoogleReview', () => {
  const raw = {
    name: 'accounts/1/locations/2/reviews/abc',
    reviewId: 'abc',
    reviewer: { displayName: 'Ayşe K.', profilePhotoUrl: 'https://lh3.googleusercontent.com/a/x', isAnonymous: false },
    starRating: 'FOUR',
    comment: '  Çok iyi hizmet.\n(Translated by Google) Very good service.  ',
    createTime: '2026-11-01T10:00:00Z',
    updateTime: '2026-11-02T10:00:00Z',
    reviewReply: { comment: 'Teşekkürler!', updateTime: '2026-11-03T10:00:00Z' },
    extraField: 'dropped',
  };

  it('keeps only the needed fields and leaves the comment text unchanged', () => {
    const out = normalizeGoogleReview(raw);
    assert.deepEqual(out, {
      reviewId: 'abc',
      reviewer: { displayName: 'Ayşe K.', profilePhotoUrl: 'https://lh3.googleusercontent.com/a/x', isAnonymous: false },
      rating: 4,
      comment: raw.comment,
      createTime: '2026-11-01T10:00:00Z',
      updateTime: '2026-11-02T10:00:00Z',
      reviewReply: { comment: 'Teşekkürler!', updateTime: '2026-11-03T10:00:00Z' },
    });
    assert.ok(!('extraField' in (out as object)));
  });

  it('derives the id from the resource name and handles missing parts', () => {
    const out = normalizeGoogleReview({ name: 'accounts/1/locations/2/reviews/xyz', starRating: 'FIVE' });
    assert.equal(out?.reviewId, 'xyz');
    assert.equal(out?.comment, null);
    assert.equal(out?.reviewReply, null);
    assert.deepEqual(out?.reviewer, { displayName: null, profilePhotoUrl: null, isAnonymous: false });
  });

  it('drops non-https photo URLs and unusable rows', () => {
    assert.equal(
      normalizeGoogleReview({ reviewId: 'a', reviewer: { profilePhotoUrl: 'javascript:alert(1)' } })?.reviewer.profilePhotoUrl,
      null,
    );
    assert.equal(normalizeGoogleReview({ comment: 'no id' }), null);
    assert.equal(normalizeGoogleReview(null), null);
  });

  it('dedupes by review id across pages and round-trips through JSON', () => {
    const list = normalizeGoogleReviews([raw, { ...raw, comment: 'dup' }, { reviewId: 'b', starRating: 'ONE' }]);
    assert.equal(list.length, 2);
    assert.equal(list[0].comment, raw.comment);
    assert.deepEqual(parseStoredReviews(JSON.parse(JSON.stringify(list))), list);
    assert.deepEqual(parseStoredReviews('nope'), []);
    assert.deepEqual(parseStoredReviews([{ foo: 1 }]), []);
  });
});

describe('pickDisplayReviews', () => {
  const r = (id: string, comment: string | null, updated: string, rating = 5) =>
    normalizeGoogleReview({ reviewId: id, comment, updateTime: updated, starRating: ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'][rating] })!;

  it('puts reviews with text first, newest first, without filtering by rating', () => {
    const list = [
      r('old-text', 'eski', '2026-01-01T00:00:00Z', 5),
      r('rating-only', null, '2026-11-01T00:00:00Z', 5),
      r('new-low', 'kötü', '2026-10-01T00:00:00Z', 1),
    ];
    assert.deepEqual(pickDisplayReviews(list, 3).map((x) => x.reviewId), ['new-low', 'old-text', 'rating-only']);
    assert.deepEqual(pickDisplayReviews(list, 1).map((x) => x.reviewId), ['new-low']);
    assert.equal(list[0].reviewId, 'old-text', 'input is not mutated');
  });
});

describe('reviewsUrlFor', () => {
  it('prefers the place id, falls back to an https maps link', () => {
    assert.equal(reviewsUrlFor({ placeId: 'ChIJ x', mapsUri: null }), 'https://search.google.com/local/reviews?placeid=ChIJ%20x');
    assert.equal(reviewsUrlFor({ placeId: null, mapsUri: 'https://maps.google.com/?cid=1' }), 'https://maps.google.com/?cid=1');
    assert.equal(reviewsUrlFor({ placeId: null, mapsUri: 'http://x' }), null);
    assert.equal(reviewsUrlFor(null), null);
  });
});

// ─── scheduling ──────────────────────────────────────────────────────────

describe('refreshIntervalMs', () => {
  it('stays within 6–12 hours and is stable per business', () => {
    for (const id of ['a', 'b', 'hizlakirala', 'cl0000000000000000000000']) {
      const ms = refreshIntervalMs(id);
      assert.ok(ms >= REFRESH_MIN_MS && ms < REFRESH_MAX_MS, id);
      assert.equal(refreshIntervalMs(id), ms);
    }
  });
  it('spreads different businesses', () => {
    const values = new Set(Array.from({ length: 20 }, (_, i) => refreshIntervalMs(`biz-${i}`)));
    assert.ok(values.size > 15);
  });
});

describe('backoffDelayMs', () => {
  const MIN = 60_000;
  it('doubles from 15 minutes and caps at 12 hours for 429 / 403', () => {
    assert.equal(backoffDelayMs(1, 'GOOGLE_RATE_LIMITED'), 15 * MIN);
    assert.equal(backoffDelayMs(2, 'GOOGLE_RATE_LIMITED'), 30 * MIN);
    assert.equal(backoffDelayMs(3, 'GOOGLE_FORBIDDEN'), 60 * MIN);
    assert.equal(backoffDelayMs(20, 'GOOGLE_FORBIDDEN'), BACKOFF_MAX_MS);
  });
  it("respects Google's Retry-After when longer", () => {
    assert.equal(backoffDelayMs(1, 'GOOGLE_RATE_LIMITED', 3600), 60 * MIN);
    assert.equal(backoffDelayMs(1, 'GOOGLE_RATE_LIMITED', 10), 15 * MIN);
  });
  it('waits the maximum for states that need a person', () => {
    for (const code of ['GOOGLE_REAUTH_REQUIRED', 'GOOGLE_TENANT_NOT_ALLOWED', 'GOOGLE_NO_LOCATION', 'GOOGLE_API_NOT_PROVISIONED'] as const) {
      assert.equal(backoffDelayMs(1, code), BACKOFF_MAX_MS, code);
    }
  });
  it('stops the queue only on quota pressure', () => {
    assert.equal(isQuotaPressure('GOOGLE_RATE_LIMITED'), true);
    assert.equal(isQuotaPressure('GOOGLE_FORBIDDEN'), true);
    assert.equal(isQuotaPressure('GOOGLE_REAUTH_REQUIRED'), false);
  });
});
