// Win-back e-mail, opt-out link and card notification rules (CLAUDE.md §61).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isWinbackDue, winbackStatusLine, WINBACK_REPEAT_DAYS } from '../src/lib/loyalty-winback';
import { loyaltyUnsubscribeSignature, verifyLoyaltyUnsubscribe } from '../src/lib/loyalty-unsubscribe';
import { renderLoyaltyWinbackMail } from '../src/lib/email/templates/loyalty-winback';
import { rewardsBecameReady } from '../src/lib/loyalty-push';

const DAY = 24 * 3600_000;
const now = new Date('2026-12-01T09:00:00Z');
const ago = (d: number) => new Date(now.getTime() - d * DAY);
const member = { email: 'a@example.com', marketingConsent: true, lastVisitAt: ago(40), createdAt: ago(200), winbackSentAt: null as Date | null };

test('isWinbackDue: e-mail + consent + absence, once per 90 days', () => {
  assert.equal(isWinbackDue(member, 30, now), true);
  assert.equal(isWinbackDue(member, 45, now), false);
  assert.equal(isWinbackDue({ ...member, email: null }, 30, now), false);
  assert.equal(isWinbackDue({ ...member, marketingConsent: false }, 30, now), false);
  assert.equal(isWinbackDue({ ...member, lastVisitAt: null, createdAt: ago(31) }, 30, now), true);
  assert.equal(isWinbackDue({ ...member, lastVisitAt: null, createdAt: ago(10) }, 30, now), false);
  assert.equal(isWinbackDue({ ...member, winbackSentAt: ago(WINBACK_REPEAT_DAYS - 1) }, 30, now), false);
  assert.equal(isWinbackDue({ ...member, winbackSentAt: ago(WINBACK_REPEAT_DAYS + 1) }, 30, now), true);
});

test('winbackStatusLine: ready reward first, then progress', () => {
  const rewards = [{ title: 'Ücretsiz kahve', cost: 9 }];
  assert.equal(winbackStatusLine('stamps', 9, rewards, 'tr'), 'Ödülünüz hazır: Ücretsiz kahve. Kasada isteyin.');
  assert.equal(winbackStatusLine('stamps', 4, rewards, 'tr'), 'Kartınızda 4 damga var — 5 damga sonra: Ücretsiz kahve');
  assert.equal(winbackStatusLine('stamps', 0, rewards, 'tr'), null);
  assert.match(winbackStatusLine('points', 120, [{ title: 'Tatlı', cost: 200 }], 'en') ?? '', /120 points — 80 points more for Tatlı/);
});

test('opt-out link: signed per member, cannot be reused for another', () => {
  const key = Buffer.alloc(32, 7);
  const sig = loyaltyUnsubscribeSignature('cmember123456', key)!;
  assert.equal(verifyLoyaltyUnsubscribe('cmember123456', sig, key), true);
  assert.equal(verifyLoyaltyUnsubscribe('cmember999999', sig, key), false);
  assert.equal(verifyLoyaltyUnsubscribe('cmember123456', sig.replace(/^./, sig[0] === 'A' ? 'B' : 'A'), key), false);
  assert.equal(verifyLoyaltyUnsubscribe('cmember123456', sig, Buffer.alloc(32, 8)), false);
  assert.equal(verifyLoyaltyUnsubscribe('../etc', sig, key), false);
  assert.equal(loyaltyUnsubscribeSignature('x', null), null);
});

test('win-back mail names the sender, carries the opt-out and escapes the owner text', () => {
  const mail = renderLoyaltyWinbackMail({
    businessName: 'Moda Kahve',
    programName: 'Kahve kartı',
    customerName: 'Ayşe',
    message: 'Yeni <b>menümüz</b> hazır',
    statusLine: 'Kartınızda 4 damga var',
    cardUrl: 'https://www.buaze.com/l/moda/k/abc',
    unsubscribeUrl: 'https://www.buaze.com/api/public/loyalty/unsubscribe?m=1&s=2',
    senderLine: 'Moda Kahve Ltd. · Kadıköy',
  });
  assert.match(mail.subject, /Moda Kahve/);
  assert.ok(mail.html.includes('Yeni &lt;b&gt;menümüz&lt;/b&gt; hazır'));
  assert.ok(!mail.html.includes('<b>menümüz</b>'));
  assert.ok(mail.html.includes('Moda Kahve Ltd. · Kadıköy adına Buaze gönderdi'));
  assert.ok(mail.html.includes('unsubscribe?m=1&amp;s=2'));
  assert.ok(mail.text.includes('https://www.buaze.com/api/public/loyalty/unsubscribe?m=1&s=2'));
});

test('rewardsBecameReady: only rewards this change made reachable', () => {
  const rewards = [
    { title: 'Kahve', cost: 5 },
    { title: 'Tatlı', cost: 9 },
    { title: 'Kapalı', cost: 6, isActive: false },
  ];
  assert.deepEqual(rewardsBecameReady(4, 5, rewards), ['Kahve']);
  assert.deepEqual(rewardsBecameReady(5, 6, rewards), []);
  assert.deepEqual(rewardsBecameReady(4, 9, rewards), ['Kahve', 'Tatlı']);
  assert.deepEqual(rewardsBecameReady(9, 3, rewards), []);
});
