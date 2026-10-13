/**
 * Google Places (New) pure-library tests.
 *
 * Fixtures under tests/fixtures/google-places/ are SYNTHETIC but shape-
 * faithful (there is no outbound internet where this was written). Release
 * gate G3 (recorded real responses: one full Details payload, a 404, a 400
 * API_KEY_INVALID and a 403) replaces/augments them; until then
 * these tests pin OUR behaviour, not Google's wire format.
 *
 * Run: npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  PLACES_DETAILS_FIELD_MASK,
  PLACES_VERIFY_FIELD_MASK,
  PLACES_SEARCH_FIELD_MASK,
  PLACE_ID_RE,
  buildPlacesChecklist,
  classifyPlacesError,
  defaultPlacesSearchQuery,
  extractPlacesErrorMeta,
  fetchGooglePlaceDetails,
  hasManualReviewLink,
  isValidPlacesApiId,
  normalizePlaceDetails,
  normalizeSearchResults,
  placesOptionState,
  placesOptionStateLabel,
  placesSearchBodySchema,
  placesSelectBodySchema,
  placesWebsiteHost,
  resolvePlacesApiId,
  resolveProfileState,
  resolveRestaurantPlaceId,
  verifyPlaceId,
  type PlacesDetailsResult,
  type PlacesProfile,
  type PlacesProfileResponse,
  type ResolveProfileStateDeps,
} from '../src/lib/google-places';

function fixture<T = unknown>(name: string): T {
  return JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/google-places', name), 'utf8')) as T;
}

const ID = 'ChIJN1t_tDeuEmsRUsoyG83frY4';
const KEY = 'test-api-key-0123456789';

/** The developer vocabulary an owner must never read (same patterns as the owner-copy test). */
const JARGON = [/kota|quota|oauth|vercel|cloud console|GOOGLE_[A-Z]/i, /\benv\b/i, /\bAPI\b/];
const SECTOR_WORDS = /masa|menü|menu/i;

function allStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => allStrings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => allStrings(v, out));
  return out;
}

function res(body: unknown, status = 200): Response {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
}

// ─────────────────────────────────────────────────────────────────────────
// 1-3. normalizePlaceDetails
// ─────────────────────────────────────────────────────────────────────────

describe('normalizePlaceDetails — full payload', () => {
  const p = normalizePlaceDetails(fixture('details-full.json'), ID);

  it('maps every field', () => {
    assert.equal(p.v, 1);
    assert.equal(p.placeId, ID);
    assert.equal(p.name, "Mama's Burger Kadıköy");
    assert.equal(p.address, 'Caferağa Mah. Moda Cad. No:12, 34710 Kadıköy/İstanbul, Türkiye');
    assert.equal(p.mapsUri, 'https://maps.google.com/?cid=10000000000000000001');
    assert.equal(p.businessStatus, 'OPERATIONAL');
    assert.equal(p.category, 'Hamburgerci');
    assert.equal(p.rating, 4.6);
    assert.equal(p.ratingCount, 1284);
    assert.equal(p.hasOpeningHours, true);
    assert.equal(p.photoCount, 10);
  });

  it('prefers the national phone number', () => {
    assert.equal(p.phone, '0216 555 01 01');
  });

  it('keeps an http:// website and extracts the hostname without www.', () => {
    assert.equal(p.website, 'http://www.mamasburger.example/kadikoy');
    assert.equal(placesWebsiteHost(p.website), 'mamasburger.example');
  });

  it('keeps https:// websites, drops javascript: and ftp:', () => {
    const https = normalizePlaceDetails({ websiteUri: 'https://shop.example/menu' }, ID);
    assert.equal(https.website, 'https://shop.example/menu');
    assert.equal(normalizePlaceDetails({ websiteUri: 'javascript:alert(1)' }, ID).website, null);
    assert.equal(normalizePlaceDetails({ websiteUri: 'ftp://files.example/x' }, ID).website, null);
    assert.equal(normalizePlaceDetails({ websiteUri: 'data:text/html,hi' }, ID).website, null);
  });

  it('strips credentials from a website link', () => {
    const withCreds = normalizePlaceDetails({ websiteUri: 'https://user:secret@shop.example/' }, ID);
    assert.equal(withCreds.website, 'https://shop.example/');
  });

  it('returns up to 5 reviews in Google order with ISO publish times', () => {
    assert.equal(p.reviews.length, 5);
    assert.equal(p.reviews[0]!.authorName, 'Ayşe Y.');
    assert.equal(p.reviews[0]!.rating, 5);
    assert.equal(p.reviews[0]!.publishedAt, '2026-10-02T09:14:22.512Z');
    assert.equal(p.reviews[4]!.authorName, 'Can B.');
  });

  it("shows the reviewer's originalText, falling back to text only when it is absent", () => {
    assert.equal(p.reviews[1]!.text, 'Great atmosphere but a bit crowded.'); // original (en), not the translation
    assert.equal(p.reviews[3]!.text, 'Hızlı servis, lezzetli menü. Tavsiye ederim.'); // no originalText → text
  });

  it('keeps https author / photo / review links', () => {
    const r = p.reviews[0]!;
    assert.match(r.authorUri ?? '', /^https:\/\//);
    assert.match(r.authorPhotoUri ?? '', /^https:\/\//);
    assert.match(r.mapsUri ?? '', /^https:\/\//);
  });

  it('keeps attributions with https provider links', () => {
    assert.deepEqual(p.attributions, [
      { provider: 'Örnek Rehber', providerUri: 'https://rehber.example/mamas-burger-kadikoy' },
    ]);
  });

  it('carries no locale-dependent or unrequested fields', () => {
    const json = JSON.stringify(p);
    assert.doesNotMatch(json, /relativePublishTimeDescription|flagContentUri|translated|languageCode/);
  });
});

describe('normalizePlaceDetails — sparse payload', () => {
  it('returns nulls, zero and empty lists', () => {
    const p = normalizePlaceDetails(fixture('details-sparse.json'), 'ChIJsparse_demo_0000000001');
    assert.equal(p.name, 'Küçük Büfe');
    assert.equal(p.rating, null);
    assert.equal(p.ratingCount, null);
    assert.equal(p.phone, null);
    assert.equal(p.website, null);
    assert.equal(p.category, null);
    assert.equal(p.mapsUri, null);
    assert.equal(p.hasOpeningHours, false);
    assert.equal(p.photoCount, 0);
    assert.deepEqual(p.reviews, []);
    assert.deepEqual(p.attributions, []);
    assert.equal(p.businessStatus, 'UNKNOWN'); // BUSINESS_STATUS_UNSPECIFIED
  });
});

describe('normalizePlaceDetails — hostile payloads never throw and never leak', () => {
  it('survives wrong types everywhere', () => {
    const p = normalizePlaceDetails(fixture('details-hostile.json'), 'ChIJhostile________________1234');
    assert.equal(p.website, null, 'javascript: dropped');
    assert.equal(p.mapsUri, null, 'http maps link dropped');
    assert.equal(p.rating, null, 'string rating ignored');
    assert.equal(p.ratingCount, null, 'negative count ignored');
    assert.equal(p.phone, null, 'blank phone ignored');
    assert.equal(p.hasOpeningHours, false, '[] is not opening hours');
    assert.equal(p.photoCount, 0, 'photos: "x" is not a list');
    assert.deepEqual(p.reviews, [], 'reviews: "not-an-array"');
    assert.equal(p.businessStatus, 'UNKNOWN');
    assert.deepEqual(p.attributions, [{ provider: 'Bad', providerUri: null }]);
    // HTML in text is just text — React renders it escaped; we never inject it.
    assert.equal(p.name, '<script>alert(1)</script> Kafe');
  });

  it('clamps and filters hostile reviews', () => {
    const p = normalizePlaceDetails(fixture('details-hostile-reviews.json'), 'ChIJhostile_reviews_______1234');
    assert.equal(p.rating, null, 'rating 9 is out of range');
    assert.equal(p.ratingCount, 12, 'fractional count floored');
    assert.equal(p.website, null, 'ftp: dropped');
    assert.equal(p.reviews.length, 5, 'null / string / number / {} rows are skipped, then capped at 5');

    const [first, second, third] = p.reviews;
    assert.equal(first!.rating, null, 'review rating 9 → null');
    assert.equal(first!.text, 'rating out of range');
    assert.equal(first!.publishedAt, null, 'invalid date → null');
    assert.equal(first!.authorUri, null, 'javascript: author link dropped');
    assert.equal(first!.authorPhotoUri, null, 'http avatar dropped');
    assert.equal(first!.mapsUri, null, 'http review link dropped');

    assert.equal(second!.text?.length, 2000, '50 000-character review clamped to 2000');
    assert.equal(second!.authorName?.length, 200, 'author name clamped to 200');
    assert.equal(third!.text, '<script>alert("xss")</script>');
    assert.ok(p.reviews.every((r) => r.rating === null || (r.rating >= 1 && r.rating <= 5)));
  });

  it('never throws on non-object input', () => {
    for (const raw of [null, undefined, 42, 'str', [], true]) {
      const p = normalizePlaceDetails(raw, ID);
      assert.equal(p.placeId, ID);
      assert.equal(p.reviews.length, 0);
      assert.equal(p.businessStatus, 'UNKNOWN');
    }
  });

  it('accepts the 1 and 5 star bounds and rejects just outside them', () => {
    assert.equal(normalizePlaceDetails({ rating: 1 }, ID).rating, 1);
    assert.equal(normalizePlaceDetails({ rating: 5 }, ID).rating, 5);
    assert.equal(normalizePlaceDetails({ rating: 0.9 }, ID).rating, null);
    assert.equal(normalizePlaceDetails({ rating: 5.1 }, ID).rating, null);
    assert.equal(normalizePlaceDetails({ rating: Number.NaN }, ID).rating, null);
  });

  it('does not split a surrogate pair when clamping', () => {
    const text = 'a'.repeat(1999) + '😀'; // 2001 UTF-16 units: the cut would land mid-pair
    const p = normalizePlaceDetails({ reviews: [{ rating: 5, originalText: { text } }] }, ID);
    const out = p.reviews[0]!.text!;
    assert.equal(out.length, 1999);
    assert.doesNotMatch(out, /[\ud800-\udbff](?![\udc00-\udfff])/);
  });
});

describe('normalizePlaceDetails — opening hours, photos and reviews edge cases', () => {
  it('opening hours count when weekday descriptions OR periods exist, not for openNow alone', () => {
    const hours = (regularOpeningHours: unknown) => normalizePlaceDetails({ regularOpeningHours }, ID).hasOpeningHours;
    assert.equal(hours({ weekdayDescriptions: ['Pazartesi: 09:00–18:00'] }), true);
    assert.equal(hours({ periods: [{ open: { day: 1, hour: 9, minute: 0 } }] }), true);
    assert.equal(hours({ weekdayDescriptions: [], periods: [] }), false);
    assert.equal(hours({ openNow: true }), false);
    assert.equal(hours({}), false);
    assert.equal(hours(null), false);
    assert.equal(hours('Pazartesi 9-18'), false);
    assert.equal(normalizePlaceDetails({}, ID).hasOpeningHours, false);
  });

  it('photo count is the number of photos, capped at 10, and 0 for anything that is not a list', () => {
    const photos = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `places/x/photos/${i}` }));
    assert.equal(normalizePlaceDetails({ photos: photos(0) }, ID).photoCount, 0);
    assert.equal(normalizePlaceDetails({ photos: photos(3) }, ID).photoCount, 3);
    assert.equal(normalizePlaceDetails({ photos: photos(10) }, ID).photoCount, 10);
    assert.equal(normalizePlaceDetails({ photos: photos(25) }, ID).photoCount, 10);
    assert.equal(normalizePlaceDetails({ photos: 12 }, ID).photoCount, 0);
    assert.equal(normalizePlaceDetails({ photos: { length: 9 } }, ID).photoCount, 0);
  });

  it('phone falls back to the international number; blank values are ignored', () => {
    assert.equal(normalizePlaceDetails({ internationalPhoneNumber: '+90 212 555 01 01' }, ID).phone, '+90 212 555 01 01');
    assert.equal(normalizePlaceDetails({ nationalPhoneNumber: '   ', internationalPhoneNumber: '+90 212 555 01 01' }, ID).phone, '+90 212 555 01 01');
    assert.equal(normalizePlaceDetails({ nationalPhoneNumber: '0212 555 01 01', internationalPhoneNumber: '+90 212 555 01 01' }, ID).phone, '0212 555 01 01');
  });

  it('keeps a review that has only stars or only words and drops one that has neither', () => {
    const p = normalizePlaceDetails(
      {
        reviews: [
          { rating: 4 },
          { text: { text: 'Sadece yazı.' } },
          { authorAttribution: { displayName: 'Ayşe' } },
          { rating: 0, text: { text: '' } },
          { rating: 5, originalText: { text: 'Orijinal' }, text: { text: 'Translated' } },
        ],
      },
      ID,
    );
    assert.equal(p.reviews.length, 3);
    assert.equal(p.reviews[0]!.rating, 4);
    assert.equal(p.reviews[0]!.text, null);
    assert.equal(p.reviews[1]!.rating, null);
    assert.equal(p.reviews[1]!.text, 'Sadece yazı.');
    assert.equal(p.reviews[2]!.text, 'Orijinal');
  });

  it('never returns more than five reviews, whatever the input size', () => {
    const many = Array.from({ length: 200 }, (_, i) => ({ rating: 5, text: { text: `r${i}` } }));
    const p = normalizePlaceDetails({ reviews: many }, ID);
    assert.equal(p.reviews.length, 5);
    assert.deepEqual(p.reviews.map((r) => r.text), ['r0', 'r1', 'r2', 'r3', 'r4']);
  });

  it('keeps at most three attributions and only https provider links', () => {
    const p = normalizePlaceDetails(
      {
        attributions: [
          { provider: 'A', providerUri: 'https://a.example' },
          { provider: 'B', providerUri: 'http://b.example' },
          { provider: '' },
          { provider: 'C' },
          { provider: 'D', providerUri: 'https://d.example' },
          { provider: 'E', providerUri: 'https://e.example' },
        ],
      },
      ID,
    );
    assert.deepEqual(p.attributions, [
      { provider: 'A', providerUri: 'https://a.example' },
      { provider: 'B', providerUri: null },
      { provider: 'C', providerUri: null },
    ]);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 4. buildPlacesChecklist
// ─────────────────────────────────────────────────────────────────────────

function profileWith(overrides: Partial<PlacesProfile> = {}): PlacesProfile {
  return {
    v: 1,
    placeId: ID,
    name: 'Test Place',
    address: 'Somewhere',
    mapsUri: 'https://maps.google.com/?cid=1',
    businessStatus: 'OPERATIONAL',
    category: 'Cafe',
    rating: 4.5,
    ratingCount: 40,
    phone: '0212 000 00 00',
    website: 'https://www.test.example/',
    hasOpeningHours: true,
    photoCount: 6,
    attributions: [],
    reviews: [],
    ...overrides,
  };
}

const EMPTY_PROFILE = profileWith({
  category: null,
  phone: null,
  website: null,
  hasOpeningHours: false,
  photoCount: 0,
  businessStatus: 'OPERATIONAL',
});

describe('buildPlacesChecklist', () => {
  it('counts a complete profile as 6/6 and shows no tip', () => {
    const c = buildPlacesChecklist(normalizePlaceDetails(fixture('details-full.json'), ID), 'tr');
    assert.equal(c.total, 6);
    assert.equal(c.done, 6);
    assert.deepEqual(c.items.map((i) => i.id), ['phone', 'website', 'hours', 'photos', 'status', 'category']);
    assert.deepEqual(c.tips, []);
    const byId = Object.fromEntries(c.items.map((i) => [i.id, i]));
    assert.equal(byId.phone!.value, '0216 555 01 01');
    assert.equal(byId.website!.value, 'mamasburger.example');
    assert.equal(byId.website!.href, 'http://www.mamasburger.example/kadikoy');
    assert.equal(byId.hours!.value, 'Girilmiş');
    assert.equal(byId.photos!.value, '10+');
    assert.equal(byId.status!.value, 'Faaliyette');
    assert.equal(byId.category!.value, 'Hamburgerci');
    assert.ok(c.items.every((i) => i.help === null && i.state === 'done'));
  });

  it('has English parity', () => {
    const c = buildPlacesChecklist(profileWith(), 'en');
    const byId = Object.fromEntries(c.items.map((i) => [i.id, i]));
    assert.equal(byId.phone!.label, 'Phone');
    assert.equal(byId.hours!.value, 'Set');
    assert.equal(byId.status!.value, 'Operating');
    const empty = buildPlacesChecklist(EMPTY_PROFILE, 'en');
    assert.equal(
      empty.items.find((i) => i.id === 'phone')!.help,
      "Customers can't call you. Add your phone number to your Google profile.",
    );
  });

  it('applies the photo thresholds: 0 critical, 3 todo, 4 done, 10 → "10+"', () => {
    const photo = (n: number) => buildPlacesChecklist(profileWith({ photoCount: n }), 'tr').items.find((i) => i.id === 'photos')!;
    assert.equal(photo(0).state, 'critical');
    assert.equal(photo(0).help, 'Henüz fotoğraf yok. Dış cephe, iç mekan ve hizmetlerinden birkaç fotoğraf ekle.');
    assert.equal(photo(0).value, null);
    assert.equal(photo(1).state, 'todo');
    assert.equal(photo(3).state, 'todo');
    assert.equal(photo(3).value, '3');
    assert.equal(photo(3).help, 'Birkaç fotoğraf daha ekle (en az 4 öneriyoruz).');
    assert.equal(photo(4).state, 'done');
    assert.equal(photo(4).value, '4');
    assert.equal(photo(4).help, null);
    assert.equal(photo(9).value, '9');
    assert.equal(photo(10).value, '10+');
  });

  it('marks a temporarily / permanently closed business as critical', () => {
    const status = (s: PlacesProfile['businessStatus']) =>
      buildPlacesChecklist(profileWith({ businessStatus: s }), 'tr').items.find((i) => i.id === 'status')!;
    assert.equal(status('CLOSED_TEMPORARILY').state, 'critical');
    assert.match(status('CLOSED_TEMPORARILY').help!, /Geçici olarak kapalı/);
    assert.equal(status('CLOSED_PERMANENTLY').state, 'critical');
    assert.match(status('CLOSED_PERMANENTLY').help!, /Kalıcı olarak kapandı/);
    const c = buildPlacesChecklist(profileWith({ businessStatus: 'CLOSED_TEMPORARILY' }), 'tr');
    assert.equal(c.total, 6);
    assert.equal(c.done, 5, 'a closed status does not count as done');
  });

  it('leaves an unknown status out of the count', () => {
    const c = buildPlacesChecklist(profileWith({ businessStatus: 'UNKNOWN' }), 'tr');
    assert.equal(c.total, 5);
    assert.equal(c.items.some((i) => i.id === 'status'), false);
    assert.equal(c.done, 5);
  });

  it('counts an http:// site as present', () => {
    const c = buildPlacesChecklist(profileWith({ website: 'http://plain.example/' }), 'tr');
    const site = c.items.find((i) => i.id === 'website')!;
    assert.equal(site.state, 'done');
    assert.equal(site.value, 'plain.example');
  });

  it('shows the few-reviews tip for 0 and 9 reviews but not for 10', () => {
    const tips = (n: number | null) => buildPlacesChecklist(profileWith({ ratingCount: n }), 'tr').tips;
    assert.equal(tips(0).length, 1);
    assert.equal(tips(9).length, 1);
    assert.equal(tips(10).length, 0);
    assert.equal(tips(null).length, 1, 'Google omits the count when there are no ratings');
    assert.match(tips(9)[0]!.text, /Yorum sayın az \(9\)/);
    assert.equal(tips(9)[0]!.ctaHref, '/tr/dashboard/qr');
    const en = buildPlacesChecklist(profileWith({ ratingCount: 2 }), 'en').tips[0]!;
    assert.match(en.text, /You have few reviews \(2\)/);
    assert.equal(en.ctaHref, '/en/dashboard/qr');
  });

  it('contains no percentage, no jargon and no sector words in either language', () => {
    const profiles = [
      EMPTY_PROFILE,
      profileWith(),
      profileWith({ photoCount: 2, businessStatus: 'CLOSED_TEMPORARILY', ratingCount: 3 }),
      profileWith({ businessStatus: 'CLOSED_PERMANENTLY', ratingCount: 0 }),
    ];
    for (const locale of ['tr', 'en'] as const) {
      for (const profile of profiles) {
        for (const s of allStrings(buildPlacesChecklist(profile, locale))) {
          assert.doesNotMatch(s, /%/, `percentage in "${s}"`);
          assert.doesNotMatch(s, SECTOR_WORDS, `sector word in "${s}"`);
          for (const re of JARGON) assert.doesNotMatch(s, re, `jargon ${re} in "${s}"`);
        }
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 5. Place IDs
// ─────────────────────────────────────────────────────────────────────────

describe('isValidPlacesApiId / resolvePlacesApiId', () => {
  const GOOD = [
    'ChIJN1t_tDeuEmsRUsoyG83frY4',
    'GhIJQWDl0CIeQUARxks3icF8U8A',
    'EhpFdnJlbnN1ayBDYWQuLCBLYWTEsWvDtnk',
    'EiNZYWxvdmEgQ2QuLCBTdHJlZXQ',
  ];
  const BAD = [
    '',
    'ChIJ123',
    'ChIJ',
    '../x',
    'ChIJ../../../../account/secret',
    'has space in it ChIJxxxxxxxxxxxxxxxxxxxx',
    'junkjunkjunkjunkjunkjunkj', // 25 chars, valid charset, no valid prefix
    'XhIJN1t_tDeuEmsRUsoyG83frY4',
    'https://example.com/ChIJN1t_tDeuEmsRUsoyG83frY4',
    'ChIJ' + 'a'.repeat(600),
  ];

  it('accepts real-looking IDs', () => {
    for (const id of GOOD) {
      assert.equal(isValidPlacesApiId(id), true, id);
      assert.equal(PLACE_ID_RE.test(id), true, id);
    }
  });

  it('rejects junk, short ids, wrong prefixes, paths and URLs', () => {
    for (const id of BAD) assert.equal(isValidPlacesApiId(id), false, JSON.stringify(id.slice(0, 40)));
    assert.equal(isValidPlacesApiId(undefined), false);
    assert.equal(isValidPlacesApiId(42), false);
  });

  it('resolves a raw ID, trimming whitespace', () => {
    assert.equal(resolvePlacesApiId(`  ${GOOD[0]}  `), GOOD[0]);
    assert.equal(resolvePlacesApiId(GOOD[1]), GOOD[1]);
    assert.equal(resolvePlacesApiId(GOOD[2]), GOOD[2]);
  });

  it('resolves a write-review URL and a ?place_id= URL', () => {
    assert.equal(
      resolvePlacesApiId(`https://search.google.com/local/writereview?placeid=${GOOD[0]}`),
      GOOD[0],
    );
    assert.equal(
      resolvePlacesApiId(`https://www.google.com/maps/search/?api=1&query=_&place_id=${GOOD[0]}`),
      GOOD[0],
    );
    assert.equal(resolvePlacesApiId(`http://example.com/?PlaceId=${GOOD[0]}`), GOOD[0]);
  });

  it('returns null for everything we cannot PROVE is a Place ID', () => {
    for (const v of [
      'https://g.page/r/CZEa4X0Sj1D0EBM/review',
      'https://maps.app.goo.gl/AbCdEf123456',
      'https://www.google.com/maps?cid=1234567890123456789',
      'https://www.google.com/maps/place/x/data=!4m2!3m1!1s0x14cac9c0f5d3a4e3:0x3a1b6f9c2d1e5a77',
      'https://search.google.com/local/writereview?placeid=ChIJ123',
      'ChIJ123',
      'javascript:alert(1)',
      'ftp://x.example/?placeid=' + GOOD[0],
      '../x',
      '',
      '   ',
      null,
      undefined,
      12345,
    ]) {
      assert.equal(resolvePlacesApiId(v), null, String(v));
    }
  });

  it('resolveRestaurantPlaceId tries the ID field first, then the link', () => {
    assert.equal(resolveRestaurantPlaceId({ googlePlaceId: GOOD[0], googleReviewUrl: null }), GOOD[0]);
    assert.equal(
      resolveRestaurantPlaceId({
        googlePlaceId: 'https://g.page/r/abc/review',
        googleReviewUrl: `https://search.google.com/local/writereview?placeid=${GOOD[1]}`,
      }),
      GOOD[1],
    );
    assert.equal(resolveRestaurantPlaceId({ googlePlaceId: null, googleReviewUrl: null }), null);
  });
});

describe('placesSelectBodySchema (shared with the select route)', () => {
  it('accepts a valid ID and trims it', () => {
    const r = placesSelectBodySchema.safeParse({ placeId: `  ${ID} ` });
    assert.equal(r.success, true);
    if (r.success) assert.equal(r.data.placeId, ID);
  });

  it('rejects the 25-character junk string that the old charset-only check let through', () => {
    assert.equal(placesSelectBodySchema.safeParse({ placeId: 'junkjunkjunkjunkjunkjunkj' }).success, false);
  });

  it('rejects ../x, URLs, spaces, short ids and wrong prefixes', () => {
    for (const placeId of ['../x', 'https://x.example/ChIJabcdefghijklmnopqrstu', 'ChIJ with spaces in it here', 'ChIJ123', 'XYZabcdefghijklmnopqrstuvwx', '']) {
      assert.equal(placesSelectBodySchema.safeParse({ placeId }).success, false, placeId);
    }
  });

  it('is strict: extra keys and non-string ids are rejected', () => {
    assert.equal(placesSelectBodySchema.safeParse({ placeId: ID, extra: 1 }).success, false);
    assert.equal(placesSelectBodySchema.safeParse({ placeId: 42 }).success, false);
    assert.equal(placesSelectBodySchema.safeParse({}).success, false);
    assert.equal(placesSelectBodySchema.safeParse(null).success, false);
  });
});

describe('placesSearchBodySchema', () => {
  it('trims, bounds the query and is strict', () => {
    assert.equal(placesSearchBodySchema.safeParse({ query: '  ab ' }).success, true);
    assert.equal(placesSearchBodySchema.safeParse({ query: 'a' }).success, false);
    assert.equal(placesSearchBodySchema.safeParse({ query: 'x'.repeat(181) }).success, false);
    assert.equal(placesSearchBodySchema.safeParse({ query: 'ok', locale: 'de' }).success, false);
    assert.equal(placesSearchBodySchema.safeParse({ query: 'ok', locale: 'en' }).success, true);
    assert.equal(placesSearchBodySchema.safeParse({ query: 'ok', extra: true }).success, false);
  });
});

describe('option state + search query helpers', () => {
  it('maps a restaurant row to found / unmatched / not-selected', () => {
    assert.equal(placesOptionState({ googlePlaceId: ID, googleReviewUrl: null }), 'found');
    assert.equal(
      placesOptionState({
        googlePlaceId: null,
        googleReviewUrl: `https://search.google.com/local/writereview?placeid=${ID}`,
      }),
      'found',
    );
    // The demo "Mama's Burger": a manual link whose ID is not a real Place ID.
    assert.equal(
      placesOptionState({
        googlePlaceId: null,
        googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJ123',
      }),
      'unmatched',
    );
    assert.equal(placesOptionState({ googlePlaceId: null, googleReviewUrl: null }), 'not-selected');
    assert.equal(placesOptionState({ googlePlaceId: '', googleReviewUrl: '  ' }), 'not-selected');
    assert.equal(hasManualReviewLink({ googleReviewUrl: 'https://g.page/r/x/review' }), true);
    assert.equal(hasManualReviewLink({ googleReviewUrl: ' ' }), false);
  });

  it('labels the three states in both languages', () => {
    assert.equal(placesOptionStateLabel('found', 'tr'), "Google'da bulundu");
    assert.equal(placesOptionStateLabel('unmatched', 'tr'), 'Eşleşmedi');
    assert.equal(placesOptionStateLabel('not-selected', 'tr'), 'Henüz seçilmedi');
    assert.equal(placesOptionStateLabel('found', 'en'), 'Found on Google');
    assert.equal(placesOptionStateLabel('unmatched', 'en'), 'Not matched');
    assert.equal(placesOptionStateLabel('not-selected', 'en'), 'Not selected yet');
  });

  it('builds the default search text from name + city (never the street address)', () => {
    assert.equal(defaultPlacesSearchQuery("Mama's Burger", 'Kadıköy'), "Mama's Burger Kadıköy");
    assert.equal(defaultPlacesSearchQuery('  Hotel   Nora ', null), 'Hotel Nora');
    assert.equal(defaultPlacesSearchQuery(null, undefined), '');
    assert.ok(defaultPlacesSearchQuery('x'.repeat(400), 'y').length <= 180);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 6. classifyPlacesError + fetchGooglePlaceDetails / verifyPlaceId
// ─────────────────────────────────────────────────────────────────────────

describe('classifyPlacesError', () => {
  const body = (name: string) => JSON.stringify(fixture(name));

  it('classifies the documented shapes', () => {
    assert.equal(classifyPlacesError(404, body('error-404.json')), 'NOT_FOUND');
    assert.equal(classifyPlacesError(400, body('error-400-invalid-id.json')), 'NOT_FOUND');
    assert.equal(classifyPlacesError(400, body('error-400-api-key.json')), 'FORBIDDEN');
    assert.equal(classifyPlacesError(400, body('error-400-field-mask.json')), 'BAD_CONFIG');
    assert.equal(classifyPlacesError(403, body('error-403.json')), 'FORBIDDEN');
    assert.equal(classifyPlacesError(429, body('error-429.json')), 'RATE_LIMITED');
    assert.equal(classifyPlacesError(500, body('error-500.json')), 'UPSTREAM');
  });

  it('never calls a key / billing / disabled-API problem "not found"', () => {
    assert.notEqual(classifyPlacesError(400, body('error-400-api-key.json')), 'NOT_FOUND');
    assert.notEqual(classifyPlacesError(403, body('error-403.json')), 'NOT_FOUND');
    // A bad key reported with a bare "API key" message and no ErrorInfo.
    assert.equal(
      classifyPlacesError(400, JSON.stringify({ error: { status: 'INVALID_ARGUMENT', message: 'API key expired. Please renew the API key.' } })),
      'FORBIDDEN',
    );
    // Billing not enabled.
    assert.equal(
      classifyPlacesError(400, JSON.stringify({ error: { status: 'FAILED_PRECONDITION', message: 'Billing must be enabled.' } })),
      'FORBIDDEN',
    );
  });

  it('treats a wrong request shape as BAD_CONFIG, not as a missing place', () => {
    for (const message of ['Invalid FieldMask: ""', 'FieldMask is a required parameter.', 'Invalid language code.', 'Cannot find matching fields for path x']) {
      assert.equal(
        classifyPlacesError(400, JSON.stringify({ error: { status: 'INVALID_ARGUMENT', message } })),
        'BAD_CONFIG',
        message,
      );
    }
  });

  it('does not trust a 400 that is not a Google JSON error body', () => {
    assert.equal(classifyPlacesError(400, '<html>blocked by proxy</html>'), 'UPSTREAM');
    assert.equal(classifyPlacesError(400, ''), 'UPSTREAM');
    assert.equal(classifyPlacesError(503, ''), 'UPSTREAM');
    assert.equal(classifyPlacesError(418, 'teapot'), 'UPSTREAM');
  });

  it('extractPlacesErrorMeta returns machine tokens only', () => {
    assert.deepEqual(extractPlacesErrorMeta(body('error-400-api-key.json')), {
      googleStatus: 'INVALID_ARGUMENT',
      reason: 'API_KEY_INVALID',
    });
    assert.deepEqual(extractPlacesErrorMeta('not json'), {});
    const sneaky = JSON.stringify({
      error: { status: 'free text with spaces', details: [{ reason: 'please send me your password' }] },
    });
    assert.deepEqual(extractPlacesErrorMeta(sneaky), {});
  });
});

describe('fetchGooglePlaceDetails', () => {
  it('requests the Details URL with the billed mask and the key only in a header', async () => {
    let seenUrl = '';
    let seenInit: RequestInit | undefined;
    const fetchImpl: typeof fetch = async (url, init) => {
      seenUrl = String(url);
      seenInit = init;
      return res(fixture('details-full.json'));
    };
    const result = await fetchGooglePlaceDetails(ID, { apiKey: KEY, fetchImpl });

    assert.equal(seenUrl, `https://places.googleapis.com/v1/places/${ID}?languageCode=tr&regionCode=TR`);
    assert.equal(seenInit?.method, 'GET');
    assert.equal(seenInit?.body, undefined);
    const headers = seenInit?.headers as Record<string, string>;
    assert.equal(headers['X-Goog-FieldMask'], PLACES_DETAILS_FIELD_MASK);
    assert.equal(headers['X-Goog-Api-Key'], KEY);
    assert.equal(seenUrl.includes(KEY), false, 'the key never travels in the URL');
    assert.equal(Object.keys(headers).length, 2);

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.profile, normalizePlaceDetails(fixture('details-full.json'), ID));
    }
  });

  it('path-encodes the id', async () => {
    let seenUrl = '';
    const fetchImpl: typeof fetch = async (url) => {
      seenUrl = String(url);
      return res({});
    };
    await fetchGooglePlaceDetails('ChIJ/../x?y=1', { apiKey: KEY, fetchImpl });
    assert.match(seenUrl, /\/v1\/places\/ChIJ%2F\.\.%2Fx%3Fy%3D1\?languageCode=tr/);
  });

  it('uses globalThis.fetch and the env key when nothing is injected', async () => {
    const realFetch = globalThis.fetch;
    const prevKey = process.env.GOOGLE_MAPS_API_KEY;
    process.env.GOOGLE_MAPS_API_KEY = KEY;
    let called = 0;
    globalThis.fetch = (async () => {
      called++;
      return res(fixture('details-sparse.json'));
    }) as typeof fetch;
    try {
      const r = await fetchGooglePlaceDetails(ID);
      assert.equal(r.ok, true);
      assert.equal(called, 1);
    } finally {
      globalThis.fetch = realFetch;
      if (prevKey === undefined) delete process.env.GOOGLE_MAPS_API_KEY;
      else process.env.GOOGLE_MAPS_API_KEY = prevKey;
    }
  });

  const CASES: Array<[string, number, string, string, Record<string, string>]> = [
    ['404', 404, 'error-404.json', 'NOT_FOUND', {}],
    ['400 invalid id', 400, 'error-400-invalid-id.json', 'NOT_FOUND', {}],
    ['400 API_KEY_INVALID', 400, 'error-400-api-key.json', 'FORBIDDEN', { googleStatus: 'INVALID_ARGUMENT', reason: 'API_KEY_INVALID' }],
    ['400 field mask', 400, 'error-400-field-mask.json', 'BAD_CONFIG', {}],
    ['403', 403, 'error-403.json', 'FORBIDDEN', { googleStatus: 'PERMISSION_DENIED', reason: 'SERVICE_DISABLED' }],
    ['429', 429, 'error-429.json', 'RATE_LIMITED', {}],
    ['500', 500, 'error-500.json', 'UPSTREAM', {}],
  ];
  for (const [label, status, file, code, meta] of CASES) {
    it(`classifies ${label} as ${code} without leaking the key or Google's text`, async () => {
      const raw = JSON.stringify(fixture(file));
      const fetchImpl: typeof fetch = async () => res(raw, status);
      const result = await fetchGooglePlaceDetails(ID, { apiKey: KEY, fetchImpl });
      assert.equal(result.ok, false);
      if (result.ok) return;
      assert.equal(result.code, code);
      assert.equal(result.status, status);
      for (const [k, v] of Object.entries(meta)) assert.equal((result as unknown as Record<string, unknown>)[k], v);

      const serialised = JSON.stringify(result);
      assert.equal(serialised.includes(KEY), false);
      const message = (fixture<{ error: { message: string } }>(file)).error.message;
      assert.equal(serialised.includes(message), false, 'Google message must not be carried');
      assert.equal(serialised.includes('000000000000'), false);
    });
  }

  it('maps an aborted request to TIMEOUT', async () => {
    const fetchImpl: typeof fetch = async () => {
      throw new DOMException('The operation was aborted.', 'AbortError');
    };
    const r = await fetchGooglePlaceDetails(ID, { apiKey: KEY, fetchImpl });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, 'TIMEOUT');
  });

  it('really aborts a hanging request after timeoutMs', async () => {
    const fetchImpl: typeof fetch = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      });
    const started = Date.now();
    const r = await fetchGooglePlaceDetails(ID, { apiKey: KEY, fetchImpl, timeoutMs: 30 });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, 'TIMEOUT');
    assert.ok(Date.now() - started < 2000);
  });

  it('maps a thrown network error to NETWORK', async () => {
    const fetchImpl: typeof fetch = async () => {
      throw new TypeError('fetch failed');
    };
    const r = await fetchGooglePlaceDetails(ID, { apiKey: KEY, fetchImpl });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, 'NETWORK');
  });

  it('maps a 200 that is not JSON (or not an object) to BAD_RESPONSE', async () => {
    for (const body of ['<html>captive portal</html>', '[]', '"str"', '']) {
      const fetchImpl: typeof fetch = async () => res(body, 200);
      const r = await fetchGooglePlaceDetails(ID, { apiKey: KEY, fetchImpl });
      assert.equal(r.ok, false, body);
      if (!r.ok) assert.equal(r.code, 'BAD_RESPONSE', body);
    }
  });

  it('without a key it fails as FORBIDDEN and never calls fetch', async () => {
    const prevKey = process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.GOOGLE_MAPS_API_KEY;
    let called = 0;
    const fetchImpl: typeof fetch = async () => {
      called++;
      return res({});
    };
    try {
      const r = await fetchGooglePlaceDetails(ID, { fetchImpl });
      assert.equal(r.ok, false);
      if (!r.ok) assert.equal(r.code, 'FORBIDDEN');
      assert.equal(called, 0);
    } finally {
      if (prevKey !== undefined) process.env.GOOGLE_MAPS_API_KEY = prevKey;
    }
  });
});

describe('verifyPlaceId', () => {
  it('asks for the IDs-only mask', async () => {
    let seenInit: RequestInit | undefined;
    const fetchImpl: typeof fetch = async (_url, init) => {
      seenInit = init;
      return res({ id: ID });
    };
    const r = await verifyPlaceId(ID, { apiKey: KEY, fetchImpl });
    assert.equal(r.ok, true);
    assert.equal((seenInit?.headers as Record<string, string>)['X-Goog-FieldMask'], PLACES_VERIFY_FIELD_MASK);
    assert.equal(PLACES_VERIFY_FIELD_MASK, 'id');
  });

  it('only NOT_FOUND means "not a place"; everything else means "could not tell"', async () => {
    const run = async (status: number, body: unknown) => {
      const fetchImpl: typeof fetch = async () => res(body, status);
      return verifyPlaceId(ID, { apiKey: KEY, fetchImpl });
    };
    const notFound = await run(404, fixture('error-404.json'));
    assert.equal(notFound.ok === false && notFound.code, 'NOT_FOUND');
    const badId = await run(400, fixture('error-400-invalid-id.json'));
    assert.equal(badId.ok === false && badId.code, 'NOT_FOUND');
    const badKey = await run(400, fixture('error-400-api-key.json'));
    assert.equal(badKey.ok === false && badKey.code, 'FORBIDDEN');
    const limited = await run(429, fixture('error-429.json'));
    assert.equal(limited.ok === false && limited.code, 'RATE_LIMITED');
    const html = await run(200, '<html>proxy</html>');
    assert.equal(html.ok === false && html.code, 'BAD_RESPONSE');
    const noId = await run(200, { something: 'else' });
    assert.equal(noId.ok === false && noId.code, 'BAD_RESPONSE');
  });

  it('times out after timeoutMs', async () => {
    const fetchImpl: typeof fetch = (_u, init) =>
      new Promise((_r, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('a', 'AbortError'))));
    const r = await verifyPlaceId(ID, { apiKey: KEY, fetchImpl, timeoutMs: 20 });
    assert.equal(r.ok === false && r.code, 'TIMEOUT');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 7. Field-mask guard
// ─────────────────────────────────────────────────────────────────────────

describe('field masks', () => {
  it('Details mask requests reviews and attributions and nothing unbudgeted', () => {
    const fields = PLACES_DETAILS_FIELD_MASK.split(',');
    assert.ok(fields.includes('reviews'));
    assert.ok(fields.includes('attributions'));
    assert.ok(fields.includes('id'));
    assert.doesNotMatch(PLACES_DETAILS_FIELD_MASK, /editorialSummary|reviewSummary|generativeSummary|photos\./);
    assert.equal(new Set(fields).size, fields.length, 'no duplicated field');
    assert.equal(PLACES_DETAILS_FIELD_MASK.includes(' '), false);
  });

  it('Search mask adds the category and nothing from the Atmosphere tier', () => {
    assert.match(PLACES_SEARCH_FIELD_MASK, /places\.primaryTypeDisplayName/);
    assert.doesNotMatch(PLACES_SEARCH_FIELD_MASK, /reviews|rating|userRatingCount|websiteUri|photos/);
    assert.ok(PLACES_SEARCH_FIELD_MASK.split(',').every((f) => f.startsWith('places.')));
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 8. resolveProfileState with injected dependencies
// ─────────────────────────────────────────────────────────────────────────

interface Recorder {
  calls: string[];
  deps: ResolveProfileStateDeps;
}

function recorder(opts: {
  restaurant?: { allowed: boolean; systemic?: boolean };
  global?: { allowed: boolean; systemic?: boolean };
  details?: PlacesDetailsResult;
}): Recorder {
  const calls: string[] = [];
  const profile = normalizePlaceDetails(fixture('details-full.json'), ID);
  return {
    calls,
    deps: {
      reserve: async (scope) => {
        calls.push(`reserve:${scope}`);
        return (scope === 'restaurant' ? opts.restaurant : opts.global) ?? { allowed: true };
      },
      fetchDetails: async (placeId) => {
        calls.push(`fetch:${placeId}`);
        return opts.details ?? { ok: true, profile };
      },
      now: () => new Date('2026-10-13T12:00:00.000Z'),
    },
  };
}

const BASE_INPUT = { placeId: ID, hasManualLink: true, placesConfigured: true, canWrite: true };

describe('resolveProfileState', () => {
  it('not configured → unavailable with ZERO reservations and ZERO fetches', async () => {
    const r = recorder({});
    const out = await resolveProfileState({ ...BASE_INPUT, placesConfigured: false, deps: r.deps });
    assert.equal(out.body.state, 'unavailable');
    assert.equal(out.body.placesConfigured, false);
    assert.deepEqual(r.calls, []);
    assert.equal(out.failure, null);
  });

  it('no resolvable ID → not_linked with zero calls, passing hasManualLink and canWrite through', async () => {
    const r = recorder({});
    const out = await resolveProfileState({ ...BASE_INPUT, placeId: null, hasManualLink: true, canWrite: false, deps: r.deps });
    assert.equal(out.body.state, 'not_linked');
    assert.equal(out.body.hasManualLink, true);
    assert.equal(out.body.canWrite, false);
    assert.equal(out.body.placeId, null);
    assert.deepEqual(r.calls, []);
  });

  it('both reservations allowed → exactly one fetch → ok, restaurant reserved before global', async () => {
    const r = recorder({});
    const out = await resolveProfileState({ ...BASE_INPUT, deps: r.deps });
    assert.deepEqual(r.calls, ['reserve:restaurant', 'reserve:global', `fetch:${ID}`]);
    assert.equal(out.body.state, 'ok');
    assert.equal(out.body.fetchedAt, '2026-10-13T12:00:00.000Z');
    assert.equal(out.body.profile?.name, "Mama's Burger Kadıköy");
    assert.equal(out.body.error, undefined);
    assert.equal(out.failure, null);
  });

  it('restaurant reservation denied → limit_restaurant; global reserve and fetch are NOT called', async () => {
    const r = recorder({ restaurant: { allowed: false } });
    const out = await resolveProfileState({ ...BASE_INPUT, deps: r.deps });
    assert.deepEqual(r.calls, ['reserve:restaurant']);
    assert.equal(out.body.state, 'error');
    assert.deepEqual(out.body.error, { reason: 'limit_restaurant', retryAfterSeconds: null });
    assert.equal(out.body.profile, undefined);
  });

  it('global reservation denied → limit_global; fetch is NOT called', async () => {
    const r = recorder({ global: { allowed: false } });
    const out = await resolveProfileState({ ...BASE_INPUT, deps: r.deps });
    assert.deepEqual(r.calls, ['reserve:restaurant', 'reserve:global']);
    assert.deepEqual(out.body.error, { reason: 'limit_global', retryAfterSeconds: null });
  });

  it('a systemic denial (cap set to 0 / database error) is reported as the global limit', async () => {
    const r = recorder({ restaurant: { allowed: false, systemic: true } });
    const out = await resolveProfileState({ ...BASE_INPUT, deps: r.deps });
    assert.deepEqual(out.body.error, { reason: 'limit_global', retryAfterSeconds: null });
    assert.deepEqual(r.calls, ['reserve:restaurant']);
  });

  it('NOT_FOUND → not_found (not an error, nothing to report)', async () => {
    const r = recorder({ details: { ok: false, code: 'NOT_FOUND', status: 404 } });
    const out = await resolveProfileState({ ...BASE_INPUT, deps: r.deps });
    assert.equal(out.body.state, 'not_found');
    assert.equal(out.failure, null);
  });

  it('FORBIDDEN and BAD_CONFIG → unavailable, with a failure to report', async () => {
    for (const code of ['FORBIDDEN', 'BAD_CONFIG'] as const) {
      const r = recorder({ details: { ok: false, code, status: 400, googleStatus: 'INVALID_ARGUMENT', reason: 'API_KEY_INVALID' } });
      const out = await resolveProfileState({ ...BASE_INPUT, deps: r.deps });
      assert.equal(out.body.state, 'unavailable', code);
      assert.deepEqual(out.failure, { code, status: 400, googleStatus: 'INVALID_ARGUMENT', reason: 'API_KEY_INVALID' });
    }
  });

  it('every other failure → error / upstream, with a failure to report', async () => {
    for (const code of ['TIMEOUT', 'NETWORK', 'UPSTREAM', 'BAD_RESPONSE'] as const) {
      const r = recorder({ details: { ok: false, code } });
      const out = await resolveProfileState({ ...BASE_INPUT, deps: r.deps });
      assert.equal(out.body.state, 'error', code);
      assert.deepEqual(out.body.error, { reason: 'upstream', retryAfterSeconds: null }, code);
      assert.equal(out.failure?.code, code);
    }
    const limited = await resolveProfileState({
      ...BASE_INPUT,
      deps: recorder({ details: { ok: false, code: 'RATE_LIMITED', status: 429 } }).deps,
    });
    assert.deepEqual(limited.body.error, { reason: 'upstream', retryAfterSeconds: 30 });
  });

  it('never carries Google text, even if a dependency hands some back', async () => {
    const leaky = {
      ok: false,
      code: 'FORBIDDEN',
      status: 403,
      message: 'Places API (New) has not been used in project 000000000000',
      body: '{"error":{"message":"secret"}}',
    } as unknown as PlacesDetailsResult;
    const out = await resolveProfileState({ ...BASE_INPUT, deps: recorder({ details: leaky }).deps });
    const json = JSON.stringify(out);
    assert.equal(json.includes('000000000000'), false);
    assert.equal(json.includes('secret'), false);
    assert.deepEqual(out.failure, { code: 'FORBIDDEN', status: 403 });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Search normaliser + API fixtures (contract for later UI tests)
// ─────────────────────────────────────────────────────────────────────────

describe('normalizeSearchResults', () => {
  const rows = normalizeSearchResults(fixture('search-results.json'));

  it('maps rows with category and drops ids that could never be selected', () => {
    assert.equal(rows.length, 3, 'the row with an invalid ID is dropped');
    assert.deepEqual(rows[0], {
      placeId: 'ChIJsearchA_mamas_burger_kadikoy',
      displayName: "Mama's Burger Kadıköy",
      formattedAddress: 'Caferağa Mah. Moda Cad. No:12, 34710 Kadıköy/İstanbul, Türkiye',
      googleMapsUri: 'https://maps.google.com/?cid=10000000000000000001',
      businessStatus: 'OPERATIONAL',
      category: 'Hamburgerci',
    });
    assert.equal(rows[1]!.businessStatus, 'CLOSED_TEMPORARILY');
    assert.equal(rows[2]!.category, 'Fast food restoranı');
  });

  it('is defensive about the whole payload', () => {
    for (const raw of [null, undefined, 42, 'x', [], {}, { places: 'x' }, { places: [null, 1, {}] }]) {
      assert.deepEqual(normalizeSearchResults(raw), []);
    }
    const [row] = normalizeSearchResults({
      places: [{ id: ID, googleMapsUri: 'javascript:alert(1)', businessStatus: 'BUSINESS_STATUS_UNSPECIFIED' }],
    });
    assert.equal(row!.googleMapsUri, null);
    assert.equal(row!.businessStatus, null);
    assert.equal(row!.category, null);
    assert.equal(row!.displayName, 'Google işletmesi');
  });
});

describe('api-*.json fixtures match the response contract', () => {
  const profileFixtures = [
    'api-profile-ok.json',
    'api-profile-ok-partial.json',
    'api-profile-ok-closed.json',
    'api-profile-not-linked.json',
    'api-profile-not-linked-no-link.json',
    'api-profile-not-linked-read-only.json',
    'api-profile-unavailable.json',
    'api-profile-not-found.json',
    'api-profile-error-upstream.json',
    'api-profile-error-upstream-cooldown.json',
    'api-profile-error-limit-restaurant.json',
    'api-profile-error-limit-global.json',
  ];

  it('every profile fixture has the documented keys and a coherent state', () => {
    for (const name of profileFixtures) {
      const body = fixture<PlacesProfileResponse>(name);
      assert.ok(['ok', 'not_linked', 'unavailable', 'not_found', 'error'].includes(body.state), name);
      assert.equal(typeof body.canWrite, 'boolean', name);
      assert.equal(typeof body.hasManualLink, 'boolean', name);
      assert.equal(typeof body.placesConfigured, 'boolean', name);
      assert.ok(body.placeId === null || isValidPlacesApiId(body.placeId) || /^ChIJ/.test(body.placeId), name);
      if (body.state === 'ok') {
        assert.ok(body.profile && typeof body.fetchedAt === 'string', name);
        assert.equal(body.error, undefined, name);
      } else {
        assert.equal(body.profile, undefined, name);
      }
      if (body.state === 'error') {
        assert.ok(['upstream', 'limit_restaurant', 'limit_global'].includes(body.error!.reason), name);
        if (body.error!.reason !== 'upstream') assert.equal(body.error!.retryAfterSeconds, null, name);
      }
    }
  });

  it('the ok fixture is exactly what the normaliser produces from details-full.json', () => {
    const ok = fixture<PlacesProfileResponse>('api-profile-ok.json');
    assert.deepEqual(ok.profile, normalizePlaceDetails(fixture('details-full.json'), ID));
    assert.equal(buildPlacesChecklist(ok.profile!, 'tr').done, 6);
  });

  it('the partial fixture gives the "4/6 tamam" checklist the Playwright flow expects', () => {
    const partial = fixture<PlacesProfileResponse>('api-profile-ok-partial.json');
    const c = buildPlacesChecklist(partial.profile!, 'tr');
    assert.equal(`${c.done}/${c.total}`, '4/6');
  });

  it('the search fixture equals the normalised raw search payload', () => {
    assert.deepEqual(
      fixture('api-search-results.json'),
      { places: normalizeSearchResults(fixture('search-results.json')) },
    );
    assert.deepEqual(fixture('api-search-empty.json'), { places: [] });
  });

  it('error fixtures carry the machine code the UI maps by', () => {
    assert.equal(fixture<{ code: string }>('api-search-daily-limit.json').code, 'DAILY_LIMIT');
    assert.equal(fixture<{ code: string }>('api-search-busy.json').code, 'GOOGLE_PLACES_BUSY');
    assert.equal(fixture<{ code: string }>('api-search-not-configured.json').code, 'GOOGLE_PLACES_NOT_CONFIGURED');
    assert.equal(fixture<{ code: string }>('api-select-not-found.json').code, 'PLACE_NOT_FOUND');
    assert.equal(fixture<{ code: string }>('api-select-unavailable.json').code, 'GOOGLE_UNAVAILABLE');
    assert.equal(fixture<{ replaced: boolean }>('api-select-ok.json').replaced, false);
    assert.equal(fixture<{ replaced: boolean }>('api-select-replaced.json').replaced, true);
  });

  it('status fixtures expose replyAvailability', () => {
    for (const [name, value] of [
      ['api-status-not-connected-available.json', 'available'],
      ['api-status-not-connected-not-provisioned.json', 'not_provisioned'],
      ['api-status-not-connected-disabled.json', 'disabled'],
    ] as const) {
      assert.equal(fixture<{ replyAvailability: string }>(name).replyAvailability, value, name);
    }
  });

  it('no fixture of ours contains a developer word', () => {
    for (const name of [...profileFixtures, 'api-search-daily-limit.json', 'api-search-busy.json', 'api-search-not-configured.json', 'api-select-not-found.json', 'api-select-unavailable.json']) {
      for (const s of allStrings(fixture(name))) {
        if (!/\s/.test(s)) continue; // machine tokens (codes, ids, urls) are exempt; prose is not
        for (const re of JARGON) assert.doesNotMatch(s, re, `${name}: ${s}`);
      }
    }
  });
});
