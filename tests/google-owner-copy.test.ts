/**
 * Owner-safe Google copy tests.
 *
 * The owner panel maps a machine key (failure code, warning, `?google=` flash
 * status) through `ownerGoogleMessage` and never renders `data.error` /
 * `data.message` verbatim (CLAUDE.md §38.233). These tests pin three things:
 *
 *   1. every string the owner can see is free of developer vocabulary,
 *   2. unknown keys can never echo attacker- or Google-controlled text,
 *   3. the server-side fallbacks (`googleFailureMessage`, the rate-limited
 *      response, `googleOwnerErrorResponse`) follow the same rules.
 *
 * Run: npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  OWNER_GOOGLE_GENERIC,
  OWNER_GOOGLE_MESSAGE_KEYS,
  ownerGoogleFlash,
  ownerGoogleMessage,
  ownerGoogleMessageForBody,
  type OwnerGoogleLocale,
} from '../src/lib/google-owner-copy';
import {
  GoogleBusinessApiError,
  googleFailureMessage,
  type GoogleBusinessFailureCode,
} from '../src/lib/google-business';
import { googleBusinessErrorResponse, googleOwnerErrorResponse } from '../src/lib/google-business-response';

const LOCALES: OwnerGoogleLocale[] = ['tr', 'en'];

/**
 * Developer vocabulary an owner must never read. `API` is matched
 * case-sensitively on purpose ("api" is a substring of ordinary Turkish
 * words); everything else is case-insensitive.
 */
const JARGON: Array<[string, RegExp]> = [
  ['quota / kota / oauth / vercel / cloud console / GOOGLE_*', /kota|quota|oauth|vercel|cloud console|GOOGLE_[A-Z]/i],
  ['env', /\benv\b/i],
  ['API', /\bAPI\b/],
  ['sunucu / server', /sunucu|\bserver\b/i],
  ['plumbing words', /\btoken\b|client[ _-]?id|redirect|callback|\bscope\b|\bwebhook\b|\bcron\b|\bendpoint\b/i],
];

/** Review-gating wording is forbidden everywhere (CLAUDE.md §19.1.1, §35.9). */
const GATING = /filtrele|filtering|\bfilter\b|sızm|\bleak|stay off/i;

// Real (colour) emoji only: the rating glyph "★" is the product's normal text symbol.
const EMOJI = /\p{Emoji_Presentation}|\uFE0F/u;

function assertOwnerSafe(text: string, label: string) {
  assert.equal(typeof text, 'string', label);
  assert.ok(text.trim().length > 0, `${label}: empty`);
  assert.equal(text, text.trim(), `${label}: untrimmed`);
  assert.doesNotMatch(text, /\s{2,}/, `${label}: double space`);
  assert.doesNotMatch(text, EMOJI, `${label}: emoji`);
  assert.doesNotMatch(text, /\d/, `${label}: invented number`);
  assert.doesNotMatch(text, GATING, `${label}: review-gating wording`);
  for (const [name, re] of JARGON) assert.doesNotMatch(text, re, `${label}: contains ${name} -> "${text}"`);
}

const FAILURE_CODES: GoogleBusinessFailureCode[] = [
  'GOOGLE_REAUTH_REQUIRED',
  'GOOGLE_RATE_LIMITED',
  'GOOGLE_API_NOT_PROVISIONED',
  'GOOGLE_SERVER_ERROR',
  'GOOGLE_NETWORK_ERROR',
  'GOOGLE_API_ERROR',
  'GOOGLE_NOT_CONFIGURED',
];

/** Keys that intentionally map to the generic message. */
const GENERIC_BY_DESIGN = new Set(['validation_error', 'INTERNAL_SERVER_ERROR', 'error:foo']);

describe('ownerGoogleMessage — every key, both languages', () => {
  it('knows the keys the spec lists', () => {
    for (const key of [
      'GOOGLE_REAUTH_REQUIRED',
      'GOOGLE_RATE_LIMITED',
      'GOOGLE_API_NOT_PROVISIONED',
      'GOOGLE_SERVER_ERROR',
      'GOOGLE_NETWORK_ERROR',
      'GOOGLE_API_ERROR',
      'GOOGLE_NOT_CONFIGURED',
      'missing_google_client_id',
      'CLIENT_THROTTLED',
      'GOOGLE_CLIENT_THROTTLED',
      'GOOGLE_NOT_CONNECTED',
      'GOOGLE_LOCATION_NOT_SELECTED',
      'GOOGLE_REVIEW_MANAGEMENT_DISABLED',
      'CONTENT_BLOCKED',
      'PULSE_AI_DISABLED',
      'GOOGLE_PLACES_NOT_CONFIGURED',
      'GOOGLE_PLACES_BUSY',
      'DAILY_LIMIT',
      'places_search_failed',
      'PLACE_NOT_FOUND',
      'GOOGLE_UNAVAILABLE',
      'profile_not_found',
      'profile_unavailable',
      'profile_upstream',
      'profile_limit_restaurant',
      'profile_limit_global',
      'reply_badge_unavailable',
      'reply_unavailable',
      'reply_plan_off',
      'reply_plan_off_cta',
      'reply_feature_off',
      'reply_connect_hint',
      'reply_connected_not_provisioned',
      'reply_busy',
      'RATE_LIMITED',
      'TOO_MANY_REQUESTS',
      'UNAUTHORIZED',
      'FORBIDDEN',
      'connected',
      'cancelled',
      'state-mismatch',
      'state-invalid',
      'state-missing',
      'state-expired',
      'state-actor-mismatch',
      'token-error',
      'token-missing',
      'missing-config',
      'unauthorized',
      'error:access_denied',
    ]) {
      assert.ok(OWNER_GOOGLE_MESSAGE_KEYS.includes(key), `missing key ${key}`);
    }
  });

  it('has no duplicate keys', () => {
    assert.equal(new Set(OWNER_GOOGLE_MESSAGE_KEYS).size, OWNER_GOOGLE_MESSAGE_KEYS.length);
  });

  it('every message is jargon-free, trimmed, number-free and emoji-free in TR and EN', () => {
    for (const key of OWNER_GOOGLE_MESSAGE_KEYS) {
      for (const locale of LOCALES) assertOwnerSafe(ownerGoogleMessage(key, locale), `${key}/${locale}`);
    }
    for (const locale of LOCALES) assertOwnerSafe(OWNER_GOOGLE_GENERIC[locale], `generic/${locale}`);
  });

  it('every key has a distinct English text (no Turkish copy left in EN)', () => {
    for (const key of OWNER_GOOGLE_MESSAGE_KEYS) {
      assert.notEqual(ownerGoogleMessage(key, 'tr'), ownerGoogleMessage(key, 'en'), key);
    }
  });

  it('only the documented keys fall back to the generic message', () => {
    for (const key of OWNER_GOOGLE_MESSAGE_KEYS) {
      const isGeneric = ownerGoogleMessage(key, 'tr') === OWNER_GOOGLE_GENERIC.tr;
      assert.equal(isGeneric, GENERIC_BY_DESIGN.has(key), `${key} generic=${isGeneric}`);
    }
  });

  it('defaults to Turkish', () => {
    assert.equal(ownerGoogleMessage('GOOGLE_RATE_LIMITED'), 'Google şu an yoğun. Birkaç dakika sonra tekrar dene.');
    assert.equal(
      ownerGoogleMessage('GOOGLE_RATE_LIMITED', 'en'),
      'Google is busy right now. Please try again in a few minutes.',
    );
  });

  it('pins the copy of the messages that replaced the old jargon', () => {
    assert.equal(
      ownerGoogleMessage('GOOGLE_API_NOT_PROVISIONED', 'tr'),
      'Google, yorum yanıtlama erişimini Buaze için henüz açmadı. Hesabın doğru bağlı; Google erişimi açtığında konumların burada listelenecek. Profil analizin bundan etkilenmez.',
    );
    assert.equal(
      ownerGoogleMessage('missing_google_client_id', 'tr'),
      'Google hesabı bağlama şu an kullanılamıyor. Lütfen daha sonra tekrar dene.',
    );
    assert.equal(
      ownerGoogleMessage('GOOGLE_PLACES_NOT_CONFIGURED', 'tr'),
      'Google araması şu an kullanılamıyor. Linkini elle ekleyebilirsin.',
    );
  });

  it('keeps "bağla" for the Google account sign-in; Places wording never uses it', () => {
    const placesKeys = [
      'GOOGLE_PLACES_NOT_CONFIGURED',
      'GOOGLE_PLACES_BUSY',
      'DAILY_LIMIT',
      'places_search_failed',
      'PLACE_NOT_FOUND',
      'GOOGLE_UNAVAILABLE',
      'profile_not_found',
      'profile_unavailable',
      'profile_upstream',
      'profile_limit_restaurant',
      'profile_limit_global',
    ];
    for (const key of placesKeys) {
      assert.doesNotMatch(ownerGoogleMessage(key, 'tr'), /bağla/i, `${key}/tr`);
      assert.doesNotMatch(ownerGoogleMessage(key, 'en'), /\bconnect/i, `${key}/en`);
    }
  });

  it('addresses the owner informally (sen), never with "-yın / -yiniz / -ınız" forms', () => {
    // \w is ASCII-only, so the Unicode letter class is needed to see "bağlayın".
    const formal = /\p{L}+(?:yın|yin|yiniz|yınız|ınız|iniz|unuz|ünüz)(?!\p{L})/iu;
    assert.match('Hesabı yeniden bağlayın', formal, 'the pattern itself must catch the formal voice');
    assert.match('Tekrar deneyin', formal);
    assert.match('Yorumunuz', formal);
    for (const key of OWNER_GOOGLE_MESSAGE_KEYS) {
      const tr = ownerGoogleMessage(key, 'tr');
      assert.doesNotMatch(tr, formal, `${key}: formal voice -> "${tr}"`);
    }
  });
});

describe('ownerGoogleMessage — unknown keys never echo anything', () => {
  const HOSTILE = [
    '',
    null,
    undefined,
    'constructor',
    '__proto__',
    'toString',
    'hasOwnProperty',
    'valueOf',
    'prototype',
    'nope',
    'google_reauth_required',
    'GOOGLE_REAUTH_REQUIRED ',
    ' GOOGLE_REAUTH_REQUIRED',
    'error:server_error',
    'error:<script>alert(1)</script>',
    'error:access_denied ',
    'error:',
    'Places API (New) has not been used in project 000000000000 before',
    'GOOGLE_CLIENT_ID env var is not configured.',
  ];

  it('returns the generic message in both languages', () => {
    for (const key of HOSTILE) {
      for (const locale of LOCALES) {
        assert.equal(ownerGoogleMessage(key, locale), OWNER_GOOGLE_GENERIC[locale], JSON.stringify(key));
      }
    }
  });

  it('error:access_denied is the only specific error:* reason', () => {
    assert.notEqual(ownerGoogleMessage('error:access_denied', 'tr'), OWNER_GOOGLE_GENERIC.tr);
    assert.equal(ownerGoogleMessage('error:access_denied', 'tr'), "Google'da izin vermedin. İstersen tekrar deneyebilirsin.");
    assert.equal(ownerGoogleMessage('error:access_denied', 'en'), "You didn't allow access on Google. You can try again.");
    assert.equal(ownerGoogleMessage('error:invalid_grant', 'tr'), OWNER_GOOGLE_GENERIC.tr);
    assert.equal(ownerGoogleMessage('error:redirect_uri_mismatch', 'en'), OWNER_GOOGLE_GENERIC.en);
  });
});

describe('ownerGoogleFlash', () => {
  it('returns null for an empty status', () => {
    for (const s of ['', null, undefined]) assert.equal(ownerGoogleFlash(s), null);
  });

  it('assigns a tone to each known status', () => {
    assert.equal(ownerGoogleFlash('connected')?.kind, 'success');
    assert.equal(ownerGoogleFlash('cancelled')?.kind, 'info');
    assert.equal(ownerGoogleFlash('state-expired')?.kind, 'warn');
    assert.equal(ownerGoogleFlash('unauthorized')?.kind, 'warn');
    for (const s of ['state-mismatch', 'state-invalid', 'state-missing', 'state-actor-mismatch', 'token-error', 'token-missing', 'missing-config']) {
      assert.equal(ownerGoogleFlash(s)?.kind, 'danger', s);
    }
    assert.equal(ownerGoogleFlash('error:access_denied')?.kind, 'warn');
  });

  it('message equals ownerGoogleMessage for every known status, both languages', () => {
    for (const s of ['connected', 'cancelled', 'state-mismatch', 'state-invalid', 'state-missing', 'state-expired', 'state-actor-mismatch', 'token-error', 'token-missing', 'missing-config', 'unauthorized', 'error:access_denied']) {
      for (const locale of LOCALES) {
        assert.equal(ownerGoogleFlash(s, locale)?.message, ownerGoogleMessage(s, locale), `${s}/${locale}`);
      }
    }
  });

  it('turns an unknown status into a generic danger banner without echoing the reason', () => {
    for (const s of ['error:<script>alert(1)</script>', 'error:server_error', 'wat', 'constructor', '__proto__']) {
      const flash = ownerGoogleFlash(s, 'tr');
      assert.deepEqual(flash, { kind: 'danger', message: OWNER_GOOGLE_GENERIC.tr }, s);
      assert.doesNotMatch(flash!.message, /script|server_error|wat/i);
    }
    assert.deepEqual(ownerGoogleFlash('error:x', 'en'), { kind: 'danger', message: OWNER_GOOGLE_GENERIC.en });
  });
});

describe('ownerGoogleMessageForBody', () => {
  it('prefers the warning, then the code, then a known machine key in error', () => {
    assert.equal(
      ownerGoogleMessageForBody({ warning: 'GOOGLE_RATE_LIMITED', code: 'GOOGLE_API_NOT_PROVISIONED' }, 'tr'),
      ownerGoogleMessage('GOOGLE_RATE_LIMITED', 'tr'),
    );
    assert.equal(
      ownerGoogleMessageForBody({ code: 'GOOGLE_API_NOT_PROVISIONED', error: 'GOOGLE_RATE_LIMITED' }, 'en'),
      ownerGoogleMessage('GOOGLE_API_NOT_PROVISIONED', 'en'),
    );
    assert.equal(
      ownerGoogleMessageForBody({ ok: false, error: 'missing_google_client_id' }, 'tr'),
      ownerGoogleMessage('missing_google_client_id', 'tr'),
    );
    assert.equal(
      ownerGoogleMessageForBody({ error: 'GOOGLE_CLIENT_THROTTLED' }, 'tr'),
      ownerGoogleMessage('GOOGLE_CLIENT_THROTTLED', 'tr'),
    );
  });

  it('skips an unknown warning and falls through to the code', () => {
    assert.equal(
      ownerGoogleMessageForBody({ warning: 'SOMETHING_NEW', code: 'DAILY_LIMIT' }, 'tr'),
      ownerGoogleMessage('DAILY_LIMIT', 'tr'),
    );
  });

  it('NEVER returns the body\'s own message or free-text error', () => {
    const leaks = [
      { message: 'GOOGLE_CLIENT_ID env var is not configured.' },
      { error: 'GOOGLE_MAPS_API_KEY env var tanımlı değil.' },
      { error: 'Google API kotası doldu.', message: 'Cloud Console -> Quotas' },
      { code: 'WHO_KNOWS', error: 'Places API (New) has not been used in project 000000000000', message: 'secret' },
    ];
    for (const body of leaks) {
      for (const locale of LOCALES) {
        const out = ownerGoogleMessageForBody(body, locale);
        assert.equal(out, OWNER_GOOGLE_GENERIC[locale]);
        assertOwnerSafe(out, JSON.stringify(body));
      }
    }
    // A known code wins, and the leaking free text is still not returned.
    const out = ownerGoogleMessageForBody(
      { code: 'GOOGLE_PLACES_NOT_CONFIGURED', error: 'GOOGLE_MAPS_API_KEY env var tanımlı değil.' },
      'tr',
    );
    assert.equal(out, 'Google araması şu an kullanılamıyor. Linkini elle ekleyebilirsin.');
  });

  it('maps by-design generic codes and non-objects to the generic message', () => {
    for (const body of [{ code: 'validation_error' }, { code: 'INTERNAL_SERVER_ERROR' }, null, undefined, 'str', 42, [], [{ code: 'DAILY_LIMIT' }], {}]) {
      assert.equal(ownerGoogleMessageForBody(body, 'tr'), OWNER_GOOGLE_GENERIC.tr, JSON.stringify(body));
    }
  });

  it('ignores non-string candidates', () => {
    assert.equal(
      ownerGoogleMessageForBody({ warning: 7, code: { a: 1 }, error: ['DAILY_LIMIT'] }, 'en'),
      OWNER_GOOGLE_GENERIC.en,
    );
  });
});

describe('server-side fallbacks follow the same rules', () => {
  it('googleFailureMessage — every code, both languages, is jargon-free', () => {
    for (const code of FAILURE_CODES) {
      for (const locale of LOCALES) {
        const text = googleFailureMessage(code, locale);
        // The re-auth text is the one pre-existing sentence ("yeniden bağla")
        // that a test elsewhere pins; it still has to be developer-word-free.
        assertOwnerSafe(text, `${code}/${locale}`);
      }
    }
  });

  it('googleFailureMessage — the previously offending codes carry the new copy', () => {
    assert.equal(googleFailureMessage('GOOGLE_RATE_LIMITED', 'tr'), 'Google şu an yoğun. Birkaç dakika sonra tekrar dene.');
    assert.equal(
      googleFailureMessage('GOOGLE_API_NOT_PROVISIONED', 'tr'),
      'Google, yorum yanıtlama erişimini Buaze için henüz açmadı. Hesabın doğru bağlı; ek bir işlem gerekmiyor.',
    );
    assert.equal(
      googleFailureMessage('GOOGLE_API_NOT_PROVISIONED', 'en'),
      "Google hasn't enabled review replies for Buaze yet. Your account is connected correctly; no action is needed.",
    );
    assert.equal(
      googleFailureMessage('GOOGLE_NOT_CONFIGURED', 'tr'),
      'Google hesabı bağlama şu an kullanılamıyor. Lütfen daha sonra tekrar dene.',
    );
  });

  it('every failure code the server can raise has a specific owner message', () => {
    for (const code of FAILURE_CODES) {
      for (const locale of LOCALES) {
        assert.notEqual(ownerGoogleMessage(code, locale), OWNER_GOOGLE_GENERIC[locale], `${code}/${locale}`);
      }
    }
  });

  it('the rate-limited response speaks plainly: seconds when known, "a few minutes" when not', async () => {
    const build = (retryAfterSeconds?: number) =>
      new GoogleBusinessApiError({
        ok: false,
        status: 429,
        code: 'GOOGLE_RATE_LIMITED',
        message: 'internal text that must not leak',
        retryAfterSeconds,
      });

    const cases: Array<[number | undefined, 'tr' | 'en', string]> = [
      [45, 'tr', 'Google şu an yoğun. 45 saniye sonra tekrar dene.'],
      [45, 'en', 'Google is busy right now. Try again in 45s.'],
      [undefined, 'tr', 'Google şu an yoğun. 60 saniye sonra tekrar dene.'],
      [0, 'tr', 'Google şu an yoğun. Birkaç dakika sonra tekrar dene.'],
      [0, 'en', 'Google is busy right now. Please try again in a few minutes.'],
    ];
    for (const [retryAfter, locale, expected] of cases) {
      const res = googleBusinessErrorResponse(build(retryAfter), 'fallback', 'fallback-en', locale);
      assert.equal(res.status, 429);
      const body = (await res.json()) as { error: string; code: string };
      assert.equal(body.code, 'GOOGLE_RATE_LIMITED');
      assert.equal(body.error, expected);
      assert.doesNotMatch(body.error, /leak/);
      for (const [name, re] of JARGON) assert.doesNotMatch(body.error, re, name);
    }
    const res = googleBusinessErrorResponse(build(45), 'fallback');
    assert.equal(res.headers.get('Retry-After'), '45');
  });

  it('googleOwnerErrorResponse returns the owner copy for the machine code, never free text', async () => {
    const res = googleOwnerErrorResponse(422, 'PLACE_NOT_FOUND', 'tr');
    assert.equal(res.status, 422);
    assert.deepEqual(await res.json(), {
      error: ownerGoogleMessage('PLACE_NOT_FOUND', 'tr'),
      code: 'PLACE_NOT_FOUND',
    });

    const busy = googleOwnerErrorResponse(503, 'GOOGLE_PLACES_BUSY', 'en', { 'Retry-After': '30' });
    assert.equal(busy.status, 503);
    assert.equal(busy.headers.get('Retry-After'), '30');
    assert.deepEqual(await busy.json(), {
      error: ownerGoogleMessage('GOOGLE_PLACES_BUSY', 'en'),
      code: 'GOOGLE_PLACES_BUSY',
    });

    const unknown = googleOwnerErrorResponse(500, 'SOMETHING_NEW');
    const unknownBody = (await unknown.json()) as { error: string };
    assert.equal(unknownBody.error, OWNER_GOOGLE_GENERIC.tr);
  });
});
