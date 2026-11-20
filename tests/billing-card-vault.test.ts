import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getCustomerKey, getOrCreateCustomerKey, reconcileCardsAfterSave, refreshCards, toPublicCard } from '../src/lib/billing/card-vault';
import { fakeCardProvider, testVaultDeps } from './fixtures/card-provider';
import { fakePrisma } from './fixtures/fake-prisma';
import { fixedClock } from './fixtures/paynkolay-fakes';

// card-vault orchestration (billing spec §6.1): customer key lifecycle, the display mirror (two misses ≥ 24 h
// apart before anything is removed), and the verified save after a payment (alias match, consent, D1).

const HOUR = 60 * 60_000;

async function setup() {
  const clock = fixedClock('2026-12-10T10:00:00Z');
  const db = fakePrisma(clock);
  const provider = fakeCardProvider();
  const vault = testVaultDeps(db, provider, clock);
  await db.user.create({ data: { id: 'u1', email: 'u1@example.test' } });
  return { clock, db, provider, vault };
}

describe('card vault', () => {
  it('creates one sealed customer key per owner, reuses it, and never stores plaintext', async () => {
    const t = await setup();
    const k1 = await getOrCreateCustomerKey(t.vault, 'u1');
    const k2 = await getOrCreateCustomerKey(t.vault, 'u1');
    assert.equal(k1.reveal(), k2.reveal());
    assert.match(k1.reveal(), /^[A-Z0-9]{11}$/);
    assert.equal(t.db.billingCustomer.rows.length, 1);
    const row = t.db.billingCustomer.rows[0];
    assert.match(String(row.customerKeyEnc), /^cv1\.[0-9a-f]{8}\./);
    assert.match(String(row.customerKeyFp), /^ckf1_[A-Za-z0-9_-]{32}$/);
    assert.ok(!JSON.stringify(row).includes(k1.reveal()));
    assert.equal(row.providerEnv, 'live');
    // A row of the other PayNKolay environment is never reused (D18).
    await t.db.billingCustomer.updateMany({ where: { userId: 'u1' }, data: { providerEnv: 'test' } });
    await assert.rejects(() => getOrCreateCustomerKey(t.vault, 'u1'), /another PayNKolay environment/);
    assert.equal(await getCustomerKey(t.vault, 'u1'), null);
  });

  it('mirror: one missing list marks missingSince; only a second miss ≥ 24 h later soft-deletes', async () => {
    const t = await setup();
    const key = (await getOrCreateCustomerKey(t.vault, 'u1')).reveal();
    t.provider.seed(key, { Token: 'TOK1', CARD_ALIACE: 'Buaze-X1', Maskedpan: '411111******1111' });
    let cards = await refreshCards(t.vault, 'u1');
    assert.equal(cards.length, 1);
    t.provider.cards.set(key, []);
    t.clock.advance(HOUR);
    cards = await refreshCards(t.vault, 'u1');
    assert.equal(cards.length, 1, 'one empty list never removes a card');
    assert.ok(t.db.billingCard.rows[0].missingSince instanceof Date);
    t.clock.advance(12 * HOUR);
    assert.equal((await refreshCards(t.vault, 'u1')).length, 1);
    t.clock.advance(12 * HOUR);
    assert.equal((await refreshCards(t.vault, 'u1')).length, 0);
    assert.equal(t.db.billingCard.rows[0].deleteReason, 'provider_missing');
    // Reappearing brings it back with missingSince cleared.
    t.provider.seed(key, { Token: 'TOK1', CARD_ALIACE: 'Buaze-X1', Maskedpan: '411111******1111' });
    assert.equal((await refreshCards(t.vault, 'u1')).length, 1);
    assert.equal(t.db.billingCard.rows[0].missingSince, null);
    assert.equal(t.db.billingCard.rows[0].deletedAt, null);
  });

  it('a verified save: alias match + card_save consent → saved, other unbound cards deleted (D1)', async () => {
    const t = await setup();
    const key = (await getOrCreateCustomerKey(t.vault, 'u1')).reveal();
    t.provider.seed(key, { Token: 'OLD', CARD_ALIACE: 'Buaze-OLD001', Maskedpan: '411111******1111' });
    await refreshCards(t.vault, 'u1');
    const p = await t.db.billingPayment.create({
      data: { id: 'pay_abcdef', userId: 'u1', amountMinor: 99900, billingCycle: 'monthly', status: 'succeeded', saveCard: true, cardAlias: 'Buaze-ABCDEF', cardSaveResult: 'pending', providerEnv: 'live' },
    });
    await t.db.billingConsent.create({ data: { userId: 'u1', kind: 'card_save', actor: 'owner', paymentId: p.id } });
    t.provider.seed(key, { Token: 'NEW', CARD_ALIACE: 'Buaze-ABCDEF', Maskedpan: '545616******5454' });

    assert.equal(await reconcileCardsAfterSave(t.vault, 'pay_abcdef'), 'saved');
    const live = t.db.billingCard.rows.filter((r) => r.deletedAt === null);
    assert.equal(live.length, 1);
    assert.equal(live[0].last4, '5454');
    assert.equal(live[0].savedByPaymentId, 'pay_abcdef');
    assert.equal(t.db.billingCard.rows.find((r) => r.last4 === '1111')?.deleteReason, 'replaced');
    assert.deepEqual(t.provider.cards.get(key)?.map((c) => c.Token), ['NEW']);
    assert.equal(t.db.billingPayment.rows[0].cardSaveResult, 'saved');
    assert.equal(t.db.billingConsent.rows[0].cardId, live[0].id);
    // Idempotent.
    t.provider.calls.length = 0;
    assert.equal(await reconcileCardsAfterSave(t.vault, 'pay_abcdef'), 'saved');
    assert.equal(t.provider.calls.length, 0);
    const pub = toPublicCard(
      { handle: String(live[0].handle), last4: '5454', brand: 'MASTERCARD', issuer: null, expMonth: 8, expYear: 2030, boundConsentId: null, savedByPaymentId: 'pay_abcdef' },
      t.clock(),
      null,
    );
    assert.equal(pub.verified, true);
  });

  it('no card_save consent → not_saved and nothing deleted; a list failure → pending (retried later)', async () => {
    const t = await setup();
    const key = (await getOrCreateCustomerKey(t.vault, 'u1')).reveal();
    t.provider.seed(key, { Token: 'OLD', CARD_ALIACE: 'Buaze-OLD001' });
    await refreshCards(t.vault, 'u1');
    await t.db.billingPayment.create({
      data: { id: 'pay_x00001', userId: 'u1', amountMinor: 100, billingCycle: 'monthly', status: 'succeeded', saveCard: true, cardAlias: 'Buaze-X00001', cardSaveResult: 'pending', providerEnv: 'live' },
    });
    t.provider.seed(key, { Token: 'NEW', CARD_ALIACE: 'Buaze-X00001' });
    t.provider.state.listFails = true;
    assert.equal(await reconcileCardsAfterSave(t.vault, 'pay_x00001'), 'pending');
    assert.equal(t.db.billingPayment.rows[0].cardSaveResult, 'pending');
    t.provider.state.listFails = false;
    assert.equal(await reconcileCardsAfterSave(t.vault, 'pay_x00001'), 'not_saved');
    assert.equal(t.provider.deletes().length, 0);
    assert.ok(t.db.billingCard.rows.every((r) => r.savedByPaymentId === null));
  });

  it('expiry flags follow the Istanbul calendar', () => {
    const now = new Date('2026-12-10T10:00:00Z');
    const base = { handle: 'cd_x', last4: '4242', brand: 'VISA', issuer: null, boundConsentId: null, savedByPaymentId: 'p' };
    assert.equal(toPublicCard({ ...base, expMonth: 11, expYear: 2026 }, now, null).expired, true);
    assert.equal(toPublicCard({ ...base, expMonth: 12, expYear: 2026 }, now, null).expired, false);
    assert.equal(toPublicCard({ ...base, expMonth: 12, expYear: 2026 }, now, new Date('2027-01-05T00:00:00Z')).expiresBeforeNextCharge, true);
    assert.equal(toPublicCard({ ...base, expMonth: null, expYear: null }, now, null).expired, false);
  });
});
