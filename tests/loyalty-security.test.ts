import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isCrossSiteRequest, requestOrigin } from '../src/lib/request-origin';
import { plainLegalValue, businessLegalVars } from '../src/lib/legal/loyalty-legal';
import { toMemberDto } from '../src/lib/loyalty-server';
import { cardCookieName, readCardCookie } from '../src/lib/loyalty-device';
import { SOUND_NOTES, playSound, soundSupported, haptic, isSoundOn } from '../src/lib/loyalty-sound';

const SITE = 'https://www.buaze.com';
const h = (init: Record<string, string>) => new Headers(init);

test('cross-site guard: browser same-origin requests pass', () => {
  assert.equal(isCrossSiteRequest(h({ origin: SITE, 'sec-fetch-site': 'same-origin', host: 'www.buaze.com' }), SITE), false);
  // no-referrer pages send Origin: null for same-origin POSTs
  assert.equal(isCrossSiteRequest(h({ origin: 'null', 'sec-fetch-site': 'same-origin', host: 'www.buaze.com' }), SITE), false);
  // local dev / preview host: the request's own origin
  assert.equal(isCrossSiteRequest(h({ origin: 'http://localhost:3100', host: 'localhost:3100', 'x-forwarded-proto': 'http' }), SITE), false);
  // non-browser client (no Origin, no Sec-Fetch-Site)
  assert.equal(isCrossSiteRequest(h({ host: 'www.buaze.com' }), SITE), false);
});

test('cross-site guard: other sites are refused', () => {
  assert.equal(isCrossSiteRequest(h({ origin: 'https://evil.example', 'sec-fetch-site': 'cross-site', host: 'www.buaze.com' }), SITE), true);
  assert.equal(isCrossSiteRequest(h({ origin: 'https://evil.example', host: 'www.buaze.com' }), SITE), true);
  assert.equal(isCrossSiteRequest(h({ 'sec-fetch-site': 'cross-site', host: 'www.buaze.com' }), SITE), true);
  // Origin: null from a sandboxed / cross-site context
  assert.equal(isCrossSiteRequest(h({ origin: 'null', 'sec-fetch-site': 'cross-site', host: 'www.buaze.com' }), SITE), true);
  assert.equal(isCrossSiteRequest(h({ origin: 'null', host: 'www.buaze.com' }), SITE), true);
});

test('requestOrigin uses forwarded host and proto', () => {
  assert.equal(requestOrigin(h({ host: 'internal:3000', 'x-forwarded-host': 'www.buaze.com', 'x-forwarded-proto': 'https' })), 'https://www.buaze.com');
  assert.equal(requestOrigin(h({})), null);
});

test('business details in legal texts lose markup and line breaks', () => {
  assert.equal(plainLegalValue('Kafe **Lale** [tıkla](/x)\n## Başlık'), 'Kafe Lale tıkla(/x) Başlık');
  assert.equal(plainLegalValue(null), '');
  const vars = businessLegalVars(
    { name: 'Kafe Lale', address: null, phone: null, portal: { legalName: '  ', legalAddress: null, legalEmail: null } },
    'tr',
  );
  assert.equal(vars.ISLETME_ADI, 'Kafe Lale');
  assert.ok(vars.ISLETME_ADRESI.length > 0);
});

const row = {
  id: 'm1',
  code: 'ABC123',
  name: 'Ayşe Yılmaz',
  firstName: 'Ayşe',
  lastName: 'Yılmaz',
  customerAccountId: 'acc1',
  phone: '+905321234567',
  email: 'ayse@example.com',
  birthMonth: 4,
  birthDay: 12,
  marketingConsent: false,
  balance: 3,
  lifetimeEarned: 3,
  visits: 3,
  rewardsRedeemed: 0,
  lastVisitAt: new Date('2026-11-01T10:00:00Z'),
  lastBirthdayRewardYear: null,
  joinedVia: 'qr',
  createdAt: new Date('2026-10-01T10:00:00Z'),
};

test('member DTO: staff and viewers never get the whole phone or the e-mail', () => {
  const staff = toMemberDto(row);
  assert.equal(staff.phone, null);
  assert.equal(staff.email, null);
  assert.equal(staff.phoneMasked, '+90 532 *** ** 67');
  assert.equal(staff.hasEmail, true);
  assert.equal(staff.hasAccount, true);
  assert.equal('customerAccountId' in staff, false);
  const manager = toMemberDto(row, { full: true });
  assert.equal(manager.phone, '+905321234567');
  assert.equal(manager.email, 'ayse@example.com');
});

test('device card cookie: scoped name, token-shaped values only', () => {
  assert.equal(cardCookieName('kafe-lale'), 'bzc_kafe-lale');
  assert.equal(readCardCookie('AbCdEfGhIjKlMnOpQrStUvWx12'), 'AbCdEfGhIjKlMnOpQrStUvWx12');
  assert.equal(readCardCookie('short'), null);
  assert.equal(readCardCookie('x'.repeat(30) + ';drop'), null);
  assert.equal(readCardCookie(undefined), null);
});

test('sound module is inert on the server and has a tune for every sound', () => {
  assert.equal(soundSupported(), false);
  assert.equal(isSoundOn(), false);
  assert.doesNotThrow(() => playSound('welcome'));
  assert.doesNotThrow(() => haptic(10));
  for (const notes of Object.values(SOUND_NOTES)) {
    assert.ok(notes.length >= 1);
    for (const f of notes) assert.ok(f > 200 && f < 4000, `audible ${f}`);
  }
});
