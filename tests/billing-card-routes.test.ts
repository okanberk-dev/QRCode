import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PanelActor } from '../src/lib/auth';
import { buildPaymentMethodResponse, deleteCardCore, paymentMethodCore, type CardApiDeps } from '../src/lib/billing/card-api';
import { getOrCreateCustomerKey } from '../src/lib/billing/card-vault';
import { evaluateOwnerGuard } from '../src/lib/billing/owner-guard';
import { cardFlags, fakeCardProvider, testVaultDeps } from './fixtures/card-provider';
import { fakePrisma } from './fixtures/fake-prisma';
import { fixedClock } from './fixtures/paynkolay-fakes';

// billing spec §15.2 `billing-card-routes.test.ts` (the saved-card subset): IDOR, handle format, owner guard,
// delete verified by re-list, bound-card removal turns auto-renew off, and no secret in any response.

const ROOT = join(__dirname, '..');

function owner(id: string, over: Partial<PanelActor> = {}): PanelActor {
  return { id, role: 'restaurant_owner', restaurantId: null, username: null, email: null, plan: null, source: 'user', ...over };
}

async function setup() {
  const clock = fixedClock('2026-12-10T10:00:00Z');
  const db = fakePrisma(clock);
  const provider = fakeCardProvider();
  const vault = testVaultDeps(db, provider, clock);
  const optOuts: string[] = [];
  const deps: CardApiDeps = {
    db: db.client,
    flags: cardFlags(),
    vault,
    store: {
      disableAutoRenew: async (userId, reason) => {
        optOuts.push(`${userId}:${reason}`);
        return { changed: true, chargeInProgress: false };
      },
    },
    now: clock,
    rateLimit: async () => ({ allowed: true }),
  };
  for (const id of ['uA', 'uB']) {
    await db.user.create({ data: { id, email: `${id}@example.test`, createdAt: new Date('2026-01-01T00:00:00Z') } });
  }
  const keyA = (await getOrCreateCustomerKey(vault, 'uA')).reveal();
  const keyB = (await getOrCreateCustomerKey(vault, 'uB')).reveal();
  provider.seed(keyA, { Token: 'TOKEN-A-1', CARD_ALIACE: 'Buaze-AAAAAA', Maskedpan: '411111******1111' });
  provider.seed(keyB, { Token: 'TOKEN-B-1', CARD_ALIACE: 'Buaze-BBBBBB', Maskedpan: '545616******5454' });
  return { clock, db, provider, vault, deps, keyA, keyB, optOuts };
}

async function handleOf(t: Awaited<ReturnType<typeof setup>>, userId: string): Promise<string> {
  const res = await paymentMethodCore(t.deps, { userId, canManage: true }, { refresh: true });
  assert.equal(res.status, 200);
  const body = res.body as ReturnType<typeof buildPaymentMethodResponse>;
  const all = [body.card, ...body.otherCards].filter(Boolean);
  assert.equal(all.length, 1);
  return all[0]!.handle;
}

describe('saved-card routes', () => {
  it('1. IDOR: owner A deleting B\'s handle → 404, no provider delete, and the list used A\'s key', async () => {
    const t = await setup();
    const hB = await handleOf(t, 'uB');
    t.provider.calls.length = 0;
    const res = await deleteCardCore(t.deps, { userId: 'uA', canManage: true }, hB);
    assert.equal(res.status, 404);
    assert.deepEqual(res.body, { error: 'card_not_found' });
    assert.equal(t.provider.deletes().length, 0);
    const lists = t.provider.lists();
    assert.ok(lists.length >= 1);
    for (const call of lists) assert.equal(call.form.customerKey, t.keyA);
    assert.equal(t.provider.cards.get(t.keyB)?.length, 1);
  });

  it('2. an invalid handle → 400 before any provider call', async () => {
    const t = await setup();
    t.provider.calls.length = 0;
    for (const handle of ['x', 'cd_short', 'cd_' + 'a'.repeat(21) + '!', '../../etc']) {
      const res = await deleteCardCore(t.deps, { userId: 'uA', canManage: true }, handle);
      assert.equal(res.status, 400);
    }
    assert.equal(t.provider.calls.length, 0);
  });

  it('3. guard: team member → owner_only; impersonation → blocked for changes, allowed to read', () => {
    const origins = ['https://www.buaze.com'];
    const base = { origin: 'https://www.buaze.com', allowedOrigins: origins, flagOk: true };
    assert.deepEqual(evaluateOwnerGuard({ ...base, actor: owner('t1', { role: 'team_member' }), mutate: false }), {
      ok: false,
      status: 403,
      error: 'owner_only',
    });
    assert.deepEqual(evaluateOwnerGuard({ ...base, actor: owner('a1', { source: 'admin', role: 'superadmin' }), mutate: false }), {
      ok: false,
      status: 403,
      error: 'owner_only',
    });
    const imp = owner('uA', { realAdminId: 'admin1' });
    assert.deepEqual(evaluateOwnerGuard({ ...base, actor: imp, mutate: true }), { ok: false, status: 403, error: 'impersonation_blocked' });
    const read = evaluateOwnerGuard({ ...base, actor: imp, mutate: false });
    assert.equal(read.ok, true);
    assert.equal(read.ok && read.canManage, false);
    assert.deepEqual(evaluateOwnerGuard({ ...base, actor: null, mutate: false }), { ok: false, status: 401, error: 'unauthorized' });
    // CSRF: a mutation from another origin (or none) is refused generically.
    assert.deepEqual(evaluateOwnerGuard({ ...base, origin: 'https://evil.example', actor: owner('uA'), mutate: true }), {
      ok: false,
      status: 403,
      error: 'owner_only',
    });
    assert.deepEqual(evaluateOwnerGuard({ ...base, origin: null, actor: owner('uA'), mutate: true }), { ok: false, status: 403, error: 'owner_only' });
    assert.deepEqual(evaluateOwnerGuard({ ...base, flagOk: false, actor: owner('uA'), mutate: true }), {
      ok: false,
      status: 503,
      error: 'unavailable',
    });
  });

  it('3b. impersonation cannot delete even if the core is reached; GET reports canManage false', async () => {
    const t = await setup();
    const hA = await handleOf(t, 'uA');
    const res = await deleteCardCore(t.deps, { userId: 'uA', canManage: false }, hA);
    assert.equal(res.status, 403);
    const pm = await paymentMethodCore(t.deps, { userId: 'uA', canManage: false }, { refresh: false });
    assert.equal(pm.status, 200);
    assert.equal((pm.body as { canManage: boolean }).canManage, false);
  });

  it('4. delete is verified by re-list: still listed → 502 delete_unconfirmed, mirror unchanged', async () => {
    const t = await setup();
    const hA = await handleOf(t, 'uA');
    t.provider.state.stickyDelete = true;
    const res = await deleteCardCore(t.deps, { userId: 'uA', canManage: true }, hA);
    assert.equal(res.status, 502);
    assert.deepEqual(res.body, { error: 'delete_unconfirmed' });
    const row = t.db.billingCard.rows.find((r) => r.handle === hA);
    assert.equal(row?.deletedAt, null);
    t.provider.state.stickyDelete = false;
    const ok = await deleteCardCore(t.deps, { userId: 'uA', canManage: true }, hA);
    assert.equal(ok.status, 200);
    assert.equal(t.db.billingCard.rows.find((r) => r.handle === hA)?.deleteReason, 'owner');
    assert.equal(t.provider.cards.get(t.keyA)?.length, 0);
    const consent = t.db.billingConsent.rows.find((r) => r.kind === 'card_delete');
    assert.equal(consent?.actor, 'owner');
    assert.equal(consent?.userId, 'uA');
  });

  it('5. deleting the bound card turns auto-renew off first (system, card_removed)', async () => {
    const t = await setup();
    const hA = await handleOf(t, 'uA');
    await t.db.billingCard.updateMany({ where: { handle: hA }, data: { boundConsentId: 'consent1' } });
    const res = await deleteCardCore(t.deps, { userId: 'uA', canManage: true }, hA);
    assert.equal(res.status, 200);
    assert.equal((res.body as { autoRenewDisabled: boolean }).autoRenewDisabled, true);
    assert.deepEqual(t.optOuts, ['uA:card_removed']);
    assert.equal(t.db.billingCard.rows.find((r) => r.handle === hA)?.boundConsentId, null);
  });

  it('6. payment-method JSON never contains a token, TranId or customer key; unverified cards are "other"', async () => {
    const t = await setup();
    const res = await paymentMethodCore(t.deps, { userId: 'uA', canManage: true }, { refresh: true });
    const json = JSON.stringify(res.body);
    for (const secret of ['TOKEN-A-1', 'T-TOKEN-A-1', t.keyA, 'TOKEN-B-1', t.keyB, '411111']) {
      assert.ok(!json.includes(secret), `leaked ${secret}`);
    }
    assert.doesNotMatch(json, /\b[A-Z0-9]{11}\b/);
    const body = res.body as ReturnType<typeof buildPaymentMethodResponse>;
    assert.equal(body.card, null, 'a card saved outside the Buaze save flow is never "the" card');
    assert.equal(body.otherCards.length, 1);
    assert.equal(body.otherCards[0].last4, '1111');
    assert.equal(body.otherCards[0].verified, false);
    // Every billing route answers private, no-store.
    for (const rel of ['src/app/api/billing/payment-method/route.ts', 'src/app/api/billing/cards/[handle]/route.ts']) {
      assert.match(readFileSync(join(ROOT, rel), 'utf8'), /BILLING_NO_STORE/);
    }
  });

  it('7. flags off → enabled false and no card at all (and nothing is listed)', async () => {
    const t = await setup();
    t.provider.calls.length = 0;
    const res = await paymentMethodCore({ ...t.deps, flags: cardFlags({ cardStorage: false }), vault: null }, { userId: 'uA', canManage: true }, { refresh: true });
    const body = res.body as ReturnType<typeof buildPaymentMethodResponse>;
    assert.equal(body.enabled, false);
    assert.equal(body.card, null);
    assert.deepEqual(body.otherCards, []);
    assert.equal(t.provider.calls.length, 0);
    const del = await deleteCardCore({ ...t.deps, flags: cardFlags({ cardStorage: false }), vault: null }, { userId: 'uA', canManage: true }, 'cd_' + 'a'.repeat(22));
    assert.equal(del.status, 503);
  });

  it('8. a provider failure on refresh → 502 provider_error with the stale mirror', async () => {
    const t = await setup();
    await handleOf(t, 'uA');
    t.provider.state.listFails = true;
    const res = await paymentMethodCore(t.deps, { userId: 'uA', canManage: true }, { refresh: true });
    assert.equal(res.status, 502);
    const body = res.body as ReturnType<typeof buildPaymentMethodResponse> & { error: string };
    assert.equal(body.error, 'provider_error');
    assert.equal(body.stale, true);
    assert.equal(body.otherCards.length, 1);
  });

  it('9. auto-renew reads paused while a consent exists (no charge phase in this release)', () => {
    const body = buildPaymentMethodResponse({
      flags: { cardStorage: true, autoCharge: true },
      canManage: true,
      saveAllowed: true,
      cards: [],
      subscription: { renewsAt: new Date('2027-01-01T00:00:00Z'), autoRenew: true, autoRenewChangedAt: new Date('2026-12-01T00:00:00Z') },
      renewal: null,
    });
    assert.equal(body.autoRenew.status, 'paused');
    assert.equal(body.autoChargeAvailable, false);
  });
});
