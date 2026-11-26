/**
 * Loyalty card rules (CLAUDE.md §60) — pure functions shared by the panel,
 * the customer card page and the API.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  activeRewards,
  birthdayGiftAvailable,
  computeEarn,
  cooldownRemainingMs,
  earnRuleLine,
  expiredBalance,
  expiresAt,
  formatMemberCode,
  generateMemberCode,
  isValidBirthday,
  LOYALTY_TEMPLATES,
  MEMBER_CODE_ALPHABET,
  maskPhoneForDisplay,
  nextReward,
  nextTier,
  normalizeMemberCode,
  normalizePhone,
  parseLookupQuery,
  phoneLast4,
  readLoyaltyTiers,
  redeemableRewards,
  rewardRuleLine,
  stampCardSize,
  templateForCategory,
  tierFor,
} from '../src/lib/loyalty';
import { moderateText } from '../src/lib/loyalty-moderation';

describe('normalizePhone', () => {
  it('writes Turkish mobiles in one form', () => {
    for (const v of ['0532 123 45 67', '532 123 45 67', '+90 532 123 45 67', '0090 532 123 4567', '(0532) 123-45-67']) {
      assert.equal(normalizePhone(v), '+905321234567', v);
    }
  });
  it('keeps other countries with their code', () => {
    assert.equal(normalizePhone('+44 7700 900123'), '+447700900123');
  });
  it('rejects junk', () => {
    for (const v of ['', '123', 'abc', '+1234567890123456', null, 42]) assert.equal(normalizePhone(v as never), null);
  });
  it('masks and takes the last 4', () => {
    assert.equal(phoneLast4('+905321234567'), '4567');
    assert.equal(maskPhoneForDisplay('+905321234567'), '+90 532 *** ** 67');
    assert.equal(maskPhoneForDisplay('+447700900123'), '+44770 *** ** 23');
  });
});

describe('member codes', () => {
  it('uses only unambiguous characters', () => {
    let i = 0;
    const bytes = [0, 1, 2, 250, 251, 252, 253, 254, 255, 30, 31, 61, 62, 200];
    const code = generateMemberCode(() => bytes[i++ % bytes.length]);
    assert.equal(code.length, 6);
    for (const ch of code) assert.ok(MEMBER_CODE_ALPHABET.includes(ch));
    for (const bad of ['0', 'O', '1', 'I', 'L']) assert.ok(!MEMBER_CODE_ALPHABET.includes(bad));
  });
  it('reads typed codes loosely', () => {
    assert.equal(normalizeMemberCode('kx7-m42'), 'KX7M42');
    assert.equal(normalizeMemberCode('KX7 M42'), 'KX7M42');
    assert.equal(normalizeMemberCode('KX7M4'), null);
    assert.equal(normalizeMemberCode('KX7M40'), null); // 0 is not in the alphabet
    assert.equal(formatMemberCode('KX7M42'), 'KX7 M42');
  });
});

describe('parseLookupQuery', () => {
  it('reads a scanned card link', () => {
    const token = 'a'.repeat(32);
    assert.deepEqual(parseLookupQuery(`https://www.buaze.com/l/kahve-evi/k/${token}`), { kind: 'token', token });
    assert.deepEqual(parseLookupQuery(`https://www.buaze.com/l/kahve-evi/k/${token}?lang=en`), { kind: 'token', token });
  });
  it('tells codes, phones and names apart', () => {
    assert.deepEqual(parseLookupQuery('KX7 M42'), { kind: 'code', code: 'KX7M42' });
    assert.deepEqual(parseLookupQuery('0532 123 45 67'), { kind: 'phone', phone: '+905321234567' });
    assert.deepEqual(parseLookupQuery('Ayşe'), { kind: 'text', text: 'Ayşe' });
    assert.deepEqual(parseLookupQuery('234567'), { kind: 'code', code: '234567' });
    assert.deepEqual(parseLookupQuery(' '), { kind: 'empty' });
  });
});

describe('earning', () => {
  const stamps = { kind: 'stamps', pointsPerVisit: 0, pointsPerSpend: 0, spendStep: 0 };
  const points = { kind: 'points', pointsPerVisit: 10, pointsPerSpend: 1, spendStep: 10 };
  it('stamps: count clamped to 1..10', () => {
    assert.equal(computeEarn(stamps, {}), 1);
    assert.equal(computeEarn(stamps, { count: 3 }), 3);
    assert.equal(computeEarn(stamps, { count: 99 }), 10);
    assert.equal(computeEarn(stamps, { count: 0 }), 1);
  });
  it('points: per visit plus per full spend step', () => {
    assert.equal(computeEarn(points, { spend: 0 }), 10);
    assert.equal(computeEarn(points, { spend: 259 }), 35);
    assert.equal(computeEarn({ ...points, pointsPerVisit: 0 }, { spend: 9 }), 0);
  });
  it('cooldown', () => {
    const now = new Date('2026-11-26T12:00:00Z');
    assert.equal(cooldownRemainingMs(null, 60, now), 0);
    assert.equal(cooldownRemainingMs(new Date('2026-11-26T11:30:00Z'), 60, now), 30 * 60_000);
    assert.equal(cooldownRemainingMs(new Date('2026-11-26T10:00:00Z'), 60, now), 0);
    assert.equal(cooldownRemainingMs(new Date('2026-11-26T11:59:00Z'), 0, now), 0);
  });
  it('describes the earn rule', () => {
    assert.match(earnRuleLine(points, 'tr'), /10 puan.*10 TL/);
    assert.match(earnRuleLine(stamps, 'en'), /stamp/);
  });
});

describe('rewards and tiers', () => {
  const rewards = [
    { id: 'b', title: 'Ana yemek', cost: 400, isActive: true },
    { id: 'a', title: 'Tatlı', cost: 150, isActive: true },
    { id: 'c', title: 'Kapalı', cost: 50, isActive: false },
  ];
  it('ready and next reward', () => {
    assert.deepEqual(activeRewards(rewards).map((r) => r.id), ['a', 'b']);
    assert.deepEqual(redeemableRewards(200, rewards).map((r) => r.id), ['a']);
    assert.deepEqual(nextReward(200, rewards), { reward: rewards[0], remaining: 200 });
    assert.equal(nextReward(500, rewards), null);
    assert.equal(rewardRuleLine('stamps', { title: 'Kahve', cost: 9 }, 'tr'), '9 damga → Kahve');
  });
  it('stamp card size = largest active reward, capped at 30', () => {
    assert.equal(stampCardSize([{ title: 'x', cost: 9 }]), 9);
    assert.equal(stampCardSize([{ title: 'x', cost: 99 }]), 30);
    assert.equal(stampCardSize([]), 10);
  });
  it('tiers', () => {
    const tiers = readLoyaltyTiers([
      { name: 'Altın', minVisits: 25, perk: 'x' },
      { name: 'Gümüş', minVisits: 10, perk: '' },
      { name: '', minVisits: 5 },
      { name: 'Çift', minVisits: 10 },
      'junk',
    ]);
    assert.deepEqual(tiers.map((t) => t.name), ['Gümüş', 'Altın']);
    assert.equal(tierFor(9, tiers), null);
    assert.equal(tierFor(12, tiers)?.name, 'Gümüş');
    assert.deepEqual(nextTier(12, tiers), { tier: tiers[1], visitsLeft: 13 });
    assert.equal(nextTier(30, tiers), null);
    assert.deepEqual(readLoyaltyTiers(null), []);
  });
});

describe('expiry and birthday', () => {
  const now = new Date('2026-11-26T12:00:00Z');
  it('a balance lapses after expiryDays without a visit', () => {
    const member = { balance: 7, lastVisitAt: new Date('2026-05-01T00:00:00Z'), createdAt: new Date('2026-01-01T00:00:00Z') };
    assert.equal(expiredBalance(member, 180, now), 7);
    assert.equal(expiredBalance(member, 365, now), 0);
    assert.equal(expiredBalance(member, null, now), 0);
    assert.equal(expiredBalance({ ...member, balance: 0 }, 30, now), 0);
    assert.ok(expiresAt(member, 365) instanceof Date);
  });
  it('birthday gift: birth month, once a year, only when offered', () => {
    const program = { birthdayReward: 'Kahve' };
    assert.equal(birthdayGiftAvailable(program, { birthMonth: 11, lastBirthdayRewardYear: null }, now), true);
    assert.equal(birthdayGiftAvailable(program, { birthMonth: 11, lastBirthdayRewardYear: 2026 }, now), false);
    assert.equal(birthdayGiftAvailable(program, { birthMonth: 10, lastBirthdayRewardYear: null }, now), false);
    assert.equal(birthdayGiftAvailable({ birthdayReward: null }, { birthMonth: 11, lastBirthdayRewardYear: null }, now), false);
    // 30 Nov 22:30 UTC is already 1 December in Istanbul.
    assert.equal(
      birthdayGiftAvailable(program, { birthMonth: 12, lastBirthdayRewardYear: null }, new Date('2026-11-30T22:30:00Z')),
      true,
    );
  });
  it('validates birthdays', () => {
    assert.ok(isValidBirthday(2, 29));
    assert.ok(!isValidBirthday(2, 30));
    assert.ok(!isValidBirthday(13, 1));
  });
});

describe('templates', () => {
  it('every template is a valid program', () => {
    for (const t of LOYALTY_TEMPLATES) {
      assert.ok(t.rewards.length >= 1, t.key);
      if (t.kind === 'stamps') assert.ok(t.rewards.every((r) => r.cost <= 30), t.key);
      if (t.kind === 'points') assert.ok(t.pointsPerVisit > 0 || (t.pointsPerSpend > 0 && t.spendStep > 0), t.key);
      for (const locale of ['tr', 'en'] as const) {
        const texts = [t.name[locale], ...t.rewards.map((r) => r.title[locale]), t.birthdayReward?.[locale] ?? ''];
        assert.equal(moderateText(texts.join('\n')), null, `${t.key}/${locale}`);
      }
    }
  });
  it('picks a template from the business category', () => {
    assert.equal(templateForCategory('Kafe'), 'cafe');
    assert.equal(templateForCategory('Berber'), 'barber');
    assert.equal(templateForCategory('Kuaför'), 'barber');
    assert.equal(templateForCategory('Restoran'), 'restaurant');
    assert.equal(templateForCategory('Güzellik salonu'), 'beauty');
    assert.equal(templateForCategory(null), 'general');
  });
});

describe('moderation of card texts', () => {
  it('blocks a reward for a review (Google policy)', () => {
    assert.ok(moderateText('5 yıldız verirseniz kahve bizden'));
  });
  it('blocks links and profanity, allows ordinary rewards', () => {
    assert.ok(moderateText('Ödül için bit.ly/abc'));
    assert.equal(moderateText('Ücretsiz kahve\nHer ziyarette %5 indirim'), null);
  });
});
