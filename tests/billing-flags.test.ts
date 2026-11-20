/**
 * Billing flags, environment binding and the PayNKolay host allow-list
 * (src/lib/billing/flags.ts, src/lib/payment/paynkolay.ts,
 * scripts/validate-env.js — billing spec §5, §15.2). Every env here is a
 * plain object with placeholder or runtime-random values.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  checkBillingRuntime,
  hostedPaymentEnvCheck,
  isLiveDatabase,
  platformHosts,
  readBillingFlags,
  readOnOff,
} from '../src/lib/billing/flags';
import { returnEnvGate } from '../src/lib/billing/return-flow';
import {
  getPaynkolayConfig,
  paynkolayAdvertised,
  PAYNKOLAY_LIVE_BASE_URL,
  PAYNKOLAY_TEST_BASE_URL,
} from '../src/lib/payment/paynkolay';
import { randomTestKey } from './fixtures/paynkolay-fakes';

const VAULT = randomTestKey();
const HMAC = randomTestKey();

/** Everything needed for card storage on a bound live production site. */
const READY: Record<string, string | undefined> = {
  NODE_ENV: 'production',
  NEXT_PUBLIC_SITE_URL: 'https://www.buaze.com',
  BILLING_ALLOWED_HOSTS: 'www.buaze.com,buaze.com',
  PAYNKOLAY_ENV: 'live',
  PAYNKOLAY_SX: 'SX',
  PAYNKOLAY_SX_LIST: 'SXL',
  PAYNKOLAY_MERCHANT_SECRET_KEY: 'SECRET',
  BILLING_VAULT_KEY: VAULT,
  BILLING_HMAC_KEY: HMAC,
  PAYNKOLAY_CARD_STORAGE: 'on',
};
const AUTO = {
  ...READY,
  PAYNKOLAY_AUTO_CHARGE: 'on',
  PAYNKOLAY_NON3D_LIMIT_TRY: '1000',
  PAYNKOLAY_MIT_CARDHOLDER_IP: '203.0.113.10',
  PAYNKOLAY_MIT_SX: 'MITSX',
  PAYNKOLAY_MIT_SECRET_KEY: 'MITSECRET',
};
const LIVE = { providerEnv: 'live' };

describe('dry run fails safe', () => {
  it('1. unset, "true", "1", "ON" → dry run; only exactly "off" → live', () => {
    for (const value of [undefined, '', 'true', '1', 'ON', 'Off', 'no']) {
      assert.equal(readBillingFlags({ ...READY, PAYNKOLAY_AUTO_CHARGE_DRY_RUN: value }, LIVE).dryRun, true, String(value));
    }
    assert.equal(readBillingFlags({ ...READY, PAYNKOLAY_AUTO_CHARGE_DRY_RUN: 'off' }, LIVE).dryRun, false);
    assert.equal(readBillingFlags({ PAYNKOLAY_AUTO_CHARGE_DRY_RUN: 'off' }, null).dryRun, false);
  });

  it('every flag defaults to off', () => {
    const flags = readBillingFlags({}, null);
    assert.equal(flags.cardStorageIntent, false);
    assert.equal(flags.cardStorage, false);
    assert.equal(flags.hostedCardSelect, false);
    assert.equal(flags.autoCharge, false);
    assert.equal(flags.dryRun, true);
    assert.equal(flags.binding.ok, false);
    assert.equal(flags.binding.reason, 'no_config');
  });

  it('unknown values mean off and are reported by name', () => {
    const flags = readBillingFlags({ ...READY, PAYNKOLAY_CARD_STORAGE: 'ON', PAYNKOLAY_AUTO_CHARGE: 'yes' }, LIVE);
    assert.equal(flags.cardStorageIntent, false);
    assert.equal(flags.cardStorage, false);
    assert.deepEqual(flags.unknownValues.sort(), ['PAYNKOLAY_AUTO_CHARGE', 'PAYNKOLAY_CARD_STORAGE']);
    assert.equal(readOnOff(' on '), 'on');
    assert.equal(readOnOff('On'), 'unknown');
  });
});

describe('getPaynkolayConfig host allow-list', () => {
  const secrets = { PAYNKOLAY_SX: 'SX', PAYNKOLAY_SX_LIST: 'SXL', PAYNKOLAY_MERCHANT_SECRET_KEY: 'SECRET' };

  it('2. needs an explicit PAYNKOLAY_ENV; never defaults to the test host', () => {
    assert.equal(getPaynkolayConfig({ ...secrets, NODE_ENV: 'production' }), null);
    assert.equal(getPaynkolayConfig({ ...secrets, NODE_ENV: 'development' }), null);
    assert.equal(getPaynkolayConfig({ ...secrets, PAYNKOLAY_BASE_URL: PAYNKOLAY_TEST_BASE_URL }), null);
    assert.equal(getPaynkolayConfig({ ...secrets, PAYNKOLAY_ENV: 'staging' }), null);
    assert.equal(getPaynkolayConfig({ ...secrets, PAYNKOLAY_ENV: 'live' })?.baseUrl, PAYNKOLAY_LIVE_BASE_URL);
    assert.equal(getPaynkolayConfig({ ...secrets, PAYNKOLAY_ENV: 'test' })?.baseUrl, PAYNKOLAY_TEST_BASE_URL);
  });

  it('2. PAYNKOLAY_BASE_URL must be exactly the allow-listed https host of PAYNKOLAY_ENV', () => {
    const live = { ...secrets, PAYNKOLAY_ENV: 'live' };
    assert.equal(getPaynkolayConfig({ ...live, PAYNKOLAY_BASE_URL: 'http://paynkolay.nkolayislem.com.tr' }), null);
    assert.equal(getPaynkolayConfig({ ...live, PAYNKOLAY_BASE_URL: 'https://evil.example' }), null);
    assert.equal(getPaynkolayConfig({ ...live, PAYNKOLAY_BASE_URL: PAYNKOLAY_TEST_BASE_URL }), null);
    assert.equal(getPaynkolayConfig({ ...live, PAYNKOLAY_BASE_URL: `${PAYNKOLAY_LIVE_BASE_URL}/Vpos` }), null);
    assert.equal(getPaynkolayConfig({ ...live, PAYNKOLAY_BASE_URL: `${PAYNKOLAY_LIVE_BASE_URL}/` })?.baseUrl, PAYNKOLAY_LIVE_BASE_URL);
    assert.equal(getPaynkolayConfig({ ...live, PAYNKOLAY_BASE_URL: PAYNKOLAY_LIVE_BASE_URL })?.env, 'live');
  });

  it('secrets are still required; MIT terminal only when both values are set', () => {
    assert.equal(getPaynkolayConfig({ PAYNKOLAY_ENV: 'live', PAYNKOLAY_SX: 'SX' }), null);
    const base = { ...secrets, PAYNKOLAY_ENV: 'live' };
    assert.equal(getPaynkolayConfig({ ...base, PAYNKOLAY_MIT_SX: 'MITSX' })?.mit, null);
    assert.deepEqual(getPaynkolayConfig({ ...base, PAYNKOLAY_MIT_SX: 'MITSX', PAYNKOLAY_MIT_SECRET_KEY: 'MITSECRET' })?.mit, {
      sx: 'MITSX',
      secret: 'MITSECRET',
    });
    assert.equal(getPaynkolayConfig({ ...base, PAYNKOLAY_HOSTED_3D_ENFORCED: 'confirmed' })?.hosted3dEnforced, true);
    assert.equal(getPaynkolayConfig({ ...base, PAYNKOLAY_HOSTED_3D_ENFORCED: 'yes' })?.hosted3dEnforced, false);
  });

  it('paynkolayAdvertised needs only the non-secret PAYNKOLAY_ENV', () => {
    assert.equal(paynkolayAdvertised({ PAYNKOLAY_ENV: 'live' }), true);
    assert.equal(paynkolayAdvertised({}), false);
    assert.equal(paynkolayAdvertised({ PAYNKOLAY_ENV: 'live', PAYNKOLAY_BASE_URL: 'https://evil.example' }), false);
  });
});

describe('binding', () => {
  it('ok only with config, allowed host, production (or test env) and a matching settings row', () => {
    assert.deepEqual(readBillingFlags(READY, LIVE).binding, { ok: true, env: 'live', reason: null });
    assert.equal(readBillingFlags({ ...READY, BILLING_ALLOWED_HOSTS: undefined }, LIVE).binding.reason, 'host_not_allowed');
    assert.equal(readBillingFlags({ ...READY, NEXT_PUBLIC_SITE_URL: 'https://preview.example.app' }, LIVE).binding.reason, 'host_not_allowed');
    assert.equal(readBillingFlags({ ...READY, NODE_ENV: 'development' }, LIVE).binding.reason, 'not_production');
    assert.equal(readBillingFlags(READY, null).binding.reason, 'no_binding_row');
    assert.equal(readBillingFlags(READY, { providerEnv: 'test' }).binding.reason, 'env_mismatch');
    const sandbox = { ...READY, NODE_ENV: 'development', PAYNKOLAY_ENV: 'test' };
    assert.equal(readBillingFlags(sandbox, { providerEnv: 'test' }).binding.ok, true);
    assert.equal(readBillingFlags(sandbox, LIVE).binding.reason, 'env_mismatch');
    for (const flags of [readBillingFlags(READY, null), readBillingFlags(READY, { providerEnv: 'test' })]) {
      assert.equal(flags.cardStorage, false);
      assert.equal(flags.autoCharge, false);
    }
  });

  it('the site host must be configured explicitly: no fallback to the production default', () => {
    // a deployment that copied the production env but not NEXT_PUBLIC_SITE_URL
    assert.equal(readBillingFlags({ ...READY, NEXT_PUBLIC_SITE_URL: undefined }, LIVE).binding.reason, 'host_not_allowed');
    assert.equal(readBillingFlags({ ...READY, NEXT_PUBLIC_SITE_URL: '  ' }, LIVE).binding.reason, 'host_not_allowed');
    assert.equal(readBillingFlags({ ...READY, NEXT_PUBLIC_SITE_URL: undefined }, LIVE).cardStorage, false);
  });

  it('a deployment the platform identifies as a preview never binds, even with a copied production env', () => {
    assert.equal(readBillingFlags({ ...READY, VERCEL_ENV: 'preview' }, LIVE).binding.reason, 'not_production');
    assert.equal(readBillingFlags({ ...READY, VERCEL_ENV: 'development' }, LIVE).binding.reason, 'not_production');
    assert.equal(readBillingFlags({ ...READY, VERCEL_ENV: 'production' }, LIVE).binding.ok, true);
    // Coolify sets the deployment's own domains; they must include an allow-listed host
    assert.equal(readBillingFlags({ ...READY, COOLIFY_FQDN: 'https://pr-12.buaze.dev' }, LIVE).binding.reason, 'host_not_allowed');
    assert.equal(readBillingFlags({ ...READY, COOLIFY_URL: 'pr-12.buaze.dev' }, LIVE).binding.reason, 'host_not_allowed');
    assert.equal(readBillingFlags({ ...READY, COOLIFY_FQDN: 'https://www.buaze.com,https://buaze.com' }, LIVE).binding.ok, true);
    assert.equal(readBillingFlags({ ...READY, COOLIFY_FQDN: 'www.buaze.com', COOLIFY_URL: 'https://www.buaze.com:3000' }, LIVE).binding.ok, true);
    assert.deepEqual(platformHosts({ COOLIFY_FQDN: 'https://www.buaze.com:3000, buaze.com', COOLIFY_URL: '' }), ['www.buaze.com', 'buaze.com']);
    assert.equal(platformHosts({}), null);
    // a sandbox (test env) on a preview with its own test-bound database stays possible
    const sandbox = { ...READY, PAYNKOLAY_ENV: 'test', VERCEL_ENV: 'preview' };
    assert.equal(readBillingFlags(sandbox, { providerEnv: 'test' }).binding.ok, true);
  });
});

describe('hosted payment environment (D18 on checkout → return → settle, which run without flags)', () => {
  const LIVE_DB = { BILLING_LIVE_DB_REF: 'prodref123', DATABASE_URL: 'postgresql://u@db.prodref123.example.invalid:6543/postgres' };

  it('a test payment is refused on the production database and on any database not bound to test', () => {
    assert.deepEqual(hostedPaymentEnvCheck('test', LIVE, {}), { ok: false, reason: 'env_mismatch' });
    assert.deepEqual(hostedPaymentEnvCheck('test', null, {}), { ok: false, reason: 'test_unbound' });
    assert.deepEqual(hostedPaymentEnvCheck('test', { providerEnv: 'test' }, LIVE_DB), { ok: false, reason: 'test_on_live_db' });
    assert.deepEqual(hostedPaymentEnvCheck('test', { providerEnv: 'test' }, {}), { ok: true });
  });

  it('a live payment needs no binding yet (before G0), but never runs on a test-bound database', () => {
    assert.deepEqual(hostedPaymentEnvCheck('live', null, LIVE_DB), { ok: true });
    assert.deepEqual(hostedPaymentEnvCheck(null, null, {}), { ok: true }); // NULL = created before saved cards = live
    assert.deepEqual(hostedPaymentEnvCheck('live', LIVE, LIVE_DB), { ok: true });
    assert.deepEqual(hostedPaymentEnvCheck('live', { providerEnv: 'test' }, {}), { ok: false, reason: 'env_mismatch' });
    assert.equal(isLiveDatabase({ ...LIVE_DB, DATABASE_URL: undefined, DIRECT_URL: LIVE_DB.DATABASE_URL }), true);
    assert.equal(isLiveDatabase({ DATABASE_URL: LIVE_DB.DATABASE_URL }), false);
  });

  it('the return route never settles a test payment of a test deployment on a live-bound database', () => {
    const check = hostedPaymentEnvCheck('test', LIVE, {});
    assert.equal(returnEnvGate('test', 'test', check), 'refused');
    assert.equal(returnEnvGate('test', 'live', hostedPaymentEnvCheck('test', LIVE, {})), 'other_environment');
    assert.equal(returnEnvGate(null, 'live', hostedPaymentEnvCheck(null, LIVE, {})), 'proceed');
    assert.equal(returnEnvGate('live', null, hostedPaymentEnvCheck('live', null, {})), 'proceed');
  });
});

describe('capabilities', () => {
  it('4. cardStorage needs the billing keys; ENCRYPTION_KEY alone is not enough', () => {
    assert.equal(readBillingFlags(READY, LIVE).cardStorage, true);
    const noVault = { ...READY, BILLING_VAULT_KEY: undefined, ENCRYPTION_KEY: randomTestKey() };
    assert.equal(readBillingFlags(noVault, LIVE).cardStorage, false);
    assert.equal(readBillingFlags({ ...READY, BILLING_HMAC_KEY: undefined }, LIVE).cardStorage, false);
    assert.equal(readBillingFlags({ ...READY, BILLING_VAULT_KEY: 'short' }, LIVE).cardStorage, false);
    assert.equal(readBillingFlags({ ...READY, PAYNKOLAY_HOSTED_CARD_SELECT: 'on' }, LIVE).hostedCardSelect, true);
    assert.equal(readBillingFlags({ ...READY, PAYNKOLAY_CARD_STORAGE: 'off', PAYNKOLAY_HOSTED_CARD_SELECT: 'on' }, LIVE).hostedCardSelect, false);
  });

  it('3. autoCharge needs every prerequisite', () => {
    const ok = readBillingFlags(AUTO, LIVE);
    assert.equal(ok.autoCharge, true);
    assert.equal(ok.mitPath, 'mit_terminal');
    assert.equal(ok.non3dLimitMinor, 100_000);
    assert.equal(ok.dryRun, true, 'dry run stays on by default even with auto-charge on');
    assert.equal(readBillingFlags({ ...AUTO, PAYNKOLAY_MIT_CARDHOLDER_IP: undefined }, LIVE).autoCharge, false);
    assert.equal(readBillingFlags({ ...AUTO, PAYNKOLAY_MIT_CARDHOLDER_IP: '2001:db8::1' }, LIVE).autoCharge, false);
    assert.equal(readBillingFlags({ ...AUTO, PAYNKOLAY_MIT_SX: undefined }, LIVE).autoCharge, false);
    const hosted = readBillingFlags({ ...AUTO, PAYNKOLAY_MIT_SX: undefined, PAYNKOLAY_HOSTED_3D_ENFORCED: 'confirmed' }, LIVE);
    assert.equal(hosted.autoCharge, true);
    assert.equal(hosted.mitPath, 'hosted_3d_enforced');
    assert.equal(readBillingFlags({ ...AUTO, VERCEL: '1' }, LIVE).autoCharge, false);
    assert.equal(readBillingFlags(AUTO, { providerEnv: 'test' }).autoCharge, false);
    assert.equal(readBillingFlags({ ...AUTO, PAYNKOLAY_NON3D_LIMIT_TRY: '0' }, LIVE).autoCharge, false);
    assert.equal(readBillingFlags({ ...AUTO, PAYNKOLAY_NON3D_LIMIT_TRY: '12.5' }, LIVE).autoCharge, false);
    assert.equal(readBillingFlags({ ...AUTO, PAYNKOLAY_CARD_STORAGE: 'off' }, LIVE).autoCharge, false);
  });
});

describe('checkBillingRuntime', () => {
  function run(env: Record<string, string | undefined>) {
    const calls: { level: string; code: string; message: string }[] = [];
    const report = checkBillingRuntime(env, (level, code, message) => calls.push({ level, code, message }));
    return { report, calls };
  }

  it('reports a missing or invalid vault key when card storage is on (names only, never values)', () => {
    const { report, calls } = run({ ...READY, BILLING_VAULT_KEY: 'not-a-key' });
    assert.deepEqual(report.errors.map((e) => e.code), ['billing-vault-key']);
    assert.ok(!JSON.stringify(calls).includes(HMAC));
    assert.equal(run(READY).report.errors.length, 0);
    assert.equal(run({ ...READY, PAYNKOLAY_CARD_STORAGE: 'off', BILLING_VAULT_KEY: undefined }).report.errors.length, 0);
  });

  it('BILLING_HMAC_KEY is checked from phase 0: required once PayNKolay is configured, and any set key must be valid', () => {
    const live = { PAYNKOLAY_ENV: 'live', PAYNKOLAY_SX: 'SX', PAYNKOLAY_SX_LIST: 'SXL', PAYNKOLAY_MERCHANT_SECRET_KEY: 'SECRET' };
    // card storage off, HMAC key missing → reported (settle stores no fingerprints, erasure pseudonyms are random)
    const missing = run(live);
    assert.deepEqual(missing.report.errors.map((e) => e.code), ['billing-vault-key']);
    assert.match(missing.report.errors[0].message, /BILLING_HMAC_KEY: missing/);
    assert.equal(run({ ...live, BILLING_HMAC_KEY: HMAC }).report.errors.length, 0);
    // a malformed key (e.g. 64 hex chars from `openssl rand -hex 32`) is reported whatever the flags say
    const hex = run({ ...live, BILLING_HMAC_KEY: 'a'.repeat(64) });
    assert.deepEqual(hex.report.errors.map((e) => e.code), ['billing-vault-key']);
    assert.ok(!JSON.stringify(hex.calls).includes('a'.repeat(64)));
    assert.deepEqual(run({ BILLING_VAULT_KEY: 'not-a-key' }).report.errors.map((e) => e.code), ['billing-vault-key']);
    // nothing configured, nothing set: nothing to say
    assert.equal(run({}).report.errors.length, 0);
  });

  it('reports a test PayNKolay environment against the production database', () => {
    const env = {
      PAYNKOLAY_ENV: 'test',
      BILLING_HMAC_KEY: HMAC,
      BILLING_LIVE_DB_REF: 'prodref123',
      DATABASE_URL: 'postgresql://u@db.prodref123.example.invalid:6543/postgres',
    };
    assert.deepEqual(run(env).report.errors.map((e) => e.code), ['billing-env-mismatch']);
    assert.equal(run({ ...env, PAYNKOLAY_ENV: 'live' }).report.errors.length, 0);
  });

  it('reports PayNKolay values without a valid PAYNKOLAY_ENV, unknown flags and missing auto-charge prerequisites', () => {
    assert.deepEqual(run({ PAYNKOLAY_SX: 'SX', BILLING_HMAC_KEY: HMAC }).report.errors.map((e) => e.code), ['billing-config']);
    assert.deepEqual(
      run({ PAYNKOLAY_ENV: 'live', PAYNKOLAY_BASE_URL: 'https://evil.example', BILLING_HMAC_KEY: HMAC }).report.errors.map((e) => e.code),
      ['billing-config'],
    );
    assert.deepEqual(run({ PAYNKOLAY_AUTO_CHARGE: 'maybe' }).report.warnings.map((w) => w.code), ['billing-flag-unknown']);
    const auto = run({ ...READY, PAYNKOLAY_AUTO_CHARGE: 'on' });
    assert.deepEqual(auto.report.warnings.map((w) => w.code), ['billing-auto-charge-off']);
    assert.equal(run({}).calls.length, 0);
  });
});

describe('scripts/validate-env.js billing rules', () => {
  const script = join(__dirname, '..', 'scripts', 'validate-env.js');
  const REQUIRED = {
    DATABASE_URL: 'postgresql://user@db.example.invalid:6543/postgres',
    DIRECT_URL: 'postgresql://user@db.example.invalid:5432/postgres',
    JWT_SECRET: 'placeholder',
    NEXT_PUBLIC_APP_URL: 'https://app.example.invalid',
  };

  function validate(extra: Record<string, string>): { code: number; out: string } {
    // Empty cwd: the script would otherwise read a developer's .env / .env.local.
    const cwd = mkdtempSync(join(tmpdir(), 'validate-env-'));
    try {
      const res = spawnSync(process.execPath, [script], {
        cwd,
        env: { PATH: process.env.PATH ?? '', ...REQUIRED, ...extra } as unknown as NodeJS.ProcessEnv,
        encoding: 'utf8',
      });
      return { code: res.status ?? -1, out: `${res.stdout}${res.stderr}` };
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  }

  it('passes with no billing configuration (flags default off)', () => {
    assert.equal(validate({}).code, 0);
  });

  it('errors on non-secret misconfiguration', () => {
    assert.match(validate({ PAYNKOLAY_SX: 'x' }).out, /without PAYNKOLAY_ENV/);
    assert.equal(validate({ PAYNKOLAY_SX: 'x' }).code, 1);
    assert.equal(validate({ PAYNKOLAY_ENV: 'prod' }).code, 1);
    assert.equal(validate({ PAYNKOLAY_ENV: 'live', PAYNKOLAY_CARD_STORAGE: 'yes' }).code, 1);
    assert.equal(validate({ PAYNKOLAY_ENV: 'live', PAYNKOLAY_BASE_URL: PAYNKOLAY_TEST_BASE_URL }).code, 1);
    assert.equal(validate({ PAYNKOLAY_ENV: 'live', PAYNKOLAY_AUTO_CHARGE: 'on', VERCEL: '1' }).code, 1);
    assert.equal(
      validate({ PAYNKOLAY_ENV: 'test', PAYNKOLAY_CARD_STORAGE: 'on', BILLING_LIVE_DB_REF: 'db.example.invalid' }).code,
      1,
    );
    // also with card storage off: a test deployment can still create and settle hosted payments
    const testOnLive = validate({ PAYNKOLAY_ENV: 'test', BILLING_LIVE_DB_REF: 'db.example.invalid' });
    assert.equal(testOnLive.code, 1);
    assert.match(testOnLive.out, /PAYNKOLAY_ENV=test against the production database/);
    assert.equal(validate({ PAYNKOLAY_ENV: 'test', BILLING_LIVE_DB_REF: 'other-ref.invalid' }).code, 0);
    assert.equal(validate({ PAYNKOLAY_ENV: 'live', PAYNKOLAY_BASE_URL: PAYNKOLAY_LIVE_BASE_URL, PAYNKOLAY_CARD_STORAGE: 'on' }).code, 0);
  });

  it('only warns about secrets, and never prints their values', () => {
    const vault = randomTestKey();
    const res = validate({ PAYNKOLAY_ENV: 'live', BILLING_VAULT_KEY: vault, PAYNKOLAY_CARD_STORAGE: 'on' });
    assert.equal(res.code, 0);
    assert.match(res.out, /BILLING_VAULT_KEY is visible at build time/);
    assert.ok(!res.out.includes(vault));
  });
});
