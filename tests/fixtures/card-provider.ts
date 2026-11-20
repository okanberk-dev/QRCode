/**
 * A fake PayNKolay card store behind the fake transport: customerKey → cards.
 * List answers in the measured shape, delete removes by token (or keeps the
 * card when `stickyDelete` is on, to test "delete not confirmed"). Every
 * request is recorded; nothing leaves the process.
 */

import { loadHmacKeys, loadVaultKeys } from '../../src/lib/billing/vault-crypto';
import type { VaultDeps } from '../../src/lib/billing/card-vault';
import type { BillingFlags } from '../../src/lib/billing/flags';
import { cardListBody, fakeTransport, randomTestKey, testConfig, type FakeCardRow } from './paynkolay-fakes';
import type { FakePrisma } from './fake-prisma';

export function fakeCardProvider() {
  const cards = new Map<string, FakeCardRow[]>();
  const state = { stickyDelete: false, listFails: false };
  const fake = fakeTransport({
    CardStorageCardList: (form) => {
      if (state.listFails) return { status: 502, contentType: 'text/html', text: '<html>bad gateway</html>' };
      return { body: cardListBody(cards.get(form.customerKey) ?? []) };
    },
    CardStorageCardDelete: (form) => {
      if (!state.stickyDelete) {
        cards.set(form.customerKey, (cards.get(form.customerKey) ?? []).filter((c) => c.Token !== form.token));
      }
      return { body: { ProcReturnCode: '00' } };
    },
  });
  return {
    cards,
    state,
    transport: fake.transport,
    calls: fake.calls,
    seed(customerKey: string, row: Partial<FakeCardRow> & { Token: string }) {
      const list = cards.get(customerKey) ?? [];
      list.push({ Maskedpan: '545616******5454', CARDBRAND: 'MASTERCARD', CARDISSUER: 'Test Bank', EXP_DATE: '0830', TranId: `T-${row.Token}`, ...row });
      cards.set(customerKey, list);
    },
    deletes() {
      return fake.calls.filter((c) => c.url.endsWith('/CardStorageCardDelete'));
    },
    lists() {
      return fake.calls.filter((c) => c.url.endsWith('/CardStorageCardList'));
    },
  };
}

export function testVaultDeps(db: FakePrisma, provider: ReturnType<typeof fakeCardProvider>, now: () => Date): VaultDeps {
  return {
    db: db.client,
    cfg: testConfig({ env: 'live' }),
    transport: provider.transport,
    keys: loadVaultKeys({ BILLING_VAULT_KEY: randomTestKey() }),
    hmac: loadHmacKeys({ BILLING_HMAC_KEY: randomTestKey() }),
    now,
  };
}

export function cardFlags(over: Partial<BillingFlags> = {}): BillingFlags {
  return {
    binding: { ok: true, env: 'live', reason: null },
    cardStorageIntent: true,
    cardStorage: true,
    hostedCardSelect: false,
    autoCharge: false,
    dryRun: true,
    non3dLimitMinor: null,
    mitCardholderIp: null,
    mitPath: null,
    unknownValues: [],
    ...over,
  };
}
