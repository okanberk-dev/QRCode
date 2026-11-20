import { isIPv4 } from 'node:net';
import * as Sentry from '@sentry/nextjs';
import { getPaynkolayConfig, resolvePaynkolayBaseUrl, type EnvSource, type PaynkolayEnv } from '@/lib/payment/paynkolay';
import { getBillingSettings } from './billing-settings';
import { loadHmacKeys, loadVaultKeys, VaultKeyError } from './vault-crypto';

/**
 * Billing feature flags and environment binding (billing spec §5). The only
 * reader of the billing flag env vars. Everything fails closed:
 *  - every capability is off unless the binding holds (allow-listed PayNKolay
 *    host + explicit PAYNKOLAY_ENV, an explicitly configured and allow-listed
 *    site host that the platform's own domain list agrees with, production —
 *    not a Vercel preview — or an explicit test environment, and a
 *    `billing_settings` row bound to the same environment);
 *  - unknown values for PAYNKOLAY_CARD_STORAGE / _AUTO_CHARGE /
 *    _HOSTED_CARD_SELECT mean off; for PAYNKOLAY_AUTO_CHARGE_DRY_RUN anything
 *    other than exactly "off" means dry run.
 * Flags are read on every request and cron run (settings cached 60 s), so a
 * change needs only an env update plus a restart.
 */

export type BillingEnv = PaynkolayEnv;

export interface BillingBinding {
  ok: boolean;
  env: BillingEnv | null;
  reason: null | 'no_config' | 'host_not_allowed' | 'not_production' | 'no_binding_row' | 'env_mismatch';
}

export interface BillingFlags {
  binding: BillingBinding;
  /** PAYNKOLAY_CARD_STORAGE === 'on' (operator intent). */
  cardStorageIntent: boolean;
  /** intent && binding.ok && vault keys ok && HMAC keys ok. */
  cardStorage: boolean;
  /** cardStorage && PAYNKOLAY_HOSTED_CARD_SELECT === 'on'. */
  hostedCardSelect: boolean;
  /** cardStorage && AUTO_CHARGE on && non-3D limit && MIT cardholder IP && MIT path && not on Vercel. */
  autoCharge: boolean;
  /** PAYNKOLAY_AUTO_CHARGE_DRY_RUN !== 'off'. */
  dryRun: boolean;
  non3dLimitMinor: number | null;
  mitCardholderIp: string | null;
  mitPath: 'mit_terminal' | 'hosted_3d_enforced' | null;
  /** Env names with values other than on/off → Sentry 'billing-flag-unknown' (once per process). */
  unknownValues: string[];
}

export const ON_OFF_FLAGS = [
  'PAYNKOLAY_CARD_STORAGE',
  'PAYNKOLAY_HOSTED_CARD_SELECT',
  'PAYNKOLAY_AUTO_CHARGE',
  'PAYNKOLAY_AUTO_CHARGE_DRY_RUN',
] as const;

/** 'on' | 'off' | null (unset/blank) | 'unknown'. Case-sensitive; surrounding whitespace ignored. */
export function readOnOff(raw: string | undefined): 'on' | 'off' | 'unknown' | null {
  const value = raw?.trim();
  if (!value) return null;
  return value === 'on' || value === 'off' ? value : 'unknown';
}

/** BILLING_ALLOWED_HOSTS → lower-cased host list. Unset means no host is allowed. */
export function allowedSiteHosts(env: EnvSource): string[] {
  return (env.BILLING_ALLOWED_HOSTS ?? '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * The configured site host. Only an explicit NEXT_PUBLIC_SITE_URL counts: the
 * app-wide SITE_URL falls back to the production origin, which would make any
 * deployment without its own value look like production.
 */
function siteHost(env: EnvSource): string | null {
  const raw = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Host names the hosting platform says this deployment serves (Coolify's
 * COOLIFY_FQDN / COOLIFY_URL, comma-separated, with or without scheme or
 * port). Unlike NEXT_PUBLIC_SITE_URL these are set per deployment by the
 * platform, so a preview that copied the production env still reports its own
 * domain. Null when the platform does not set them.
 */
export function platformHosts(env: EnvSource): string[] | null {
  const raw = [env.COOLIFY_FQDN, env.COOLIFY_URL].filter((v) => v?.trim()).join(',');
  if (!raw) return null;
  const hosts: string[] = [];
  for (const entry of raw.split(',')) {
    const value = entry.trim();
    if (!value) continue;
    try {
      hosts.push(new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`).hostname.toLowerCase());
    } catch {
      /* not a host: ignored */
    }
  }
  return hosts;
}

/** A Vercel deployment that is not the production one (preview / development). */
function vercelNonProduction(env: EnvSource): boolean {
  const vercelEnv = env.VERCEL_ENV?.trim();
  return !!vercelEnv && vercelEnv !== 'production';
}

/** DATABASE_URL (or DIRECT_URL) is the production database: BILLING_LIVE_DB_REF is set and contained in it. */
export function isLiveDatabase(env: EnvSource): boolean {
  const ref = env.BILLING_LIVE_DB_REF?.trim();
  if (!ref) return false;
  return [env.DATABASE_URL, env.DIRECT_URL].some((url) => typeof url === 'string' && url.includes(ref));
}

export type HostedPaymentEnvCheck =
  | { ok: true }
  | { ok: false; reason: 'test_on_live_db' | 'env_mismatch' | 'test_unbound' | 'binding_unreadable' };

/**
 * D18 for the hosted card payment (checkout → return → settle), which works
 * without any billing flag. Pure. A payment of `paymentEnv` (NULL = created
 * before saved cards = live) may be created or settled against this database
 * only when:
 *  - it is not a test payment while DATABASE_URL is the production database;
 *  - the database is bound to the same environment, or — before the binding
 *    row exists (gate G0) — it is a live payment.
 * Sandbox work therefore needs a database bound to `test`
 * (`scripts/billing-bind-env.ts --env test`), and a test deployment pointed at
 * the production database can never write live billing state.
 */
export function hostedPaymentEnvCheck(
  paymentEnv: string | null,
  binding: { providerEnv: string } | null,
  env: EnvSource,
): HostedPaymentEnvCheck {
  const pe = paymentEnv ?? 'live';
  if (pe !== 'live' && isLiveDatabase(env)) return { ok: false, reason: 'test_on_live_db' };
  if (binding) return binding.providerEnv === pe ? { ok: true } : { ok: false, reason: 'env_mismatch' };
  return pe === 'live' ? { ok: true } : { ok: false, reason: 'test_unbound' };
}

/** hostedPaymentEnvCheck with the billing_settings row (cached 60 s). A DB error fails closed. */
export async function loadHostedPaymentEnvCheck(paymentEnv: string | null, env: EnvSource = process.env): Promise<HostedPaymentEnvCheck> {
  let binding: { providerEnv: string } | null;
  try {
    binding = await getBillingSettings();
  } catch {
    return { ok: false, reason: 'binding_unreadable' };
  }
  return hostedPaymentEnvCheck(paymentEnv, binding, env);
}

/** PAYNKOLAY_NON3D_LIMIT_TRY (integer TL) → kuruş, else null. */
function non3dLimitMinor(env: EnvSource): number | null {
  const raw = env.PAYNKOLAY_NON3D_LIMIT_TRY?.trim();
  if (!raw || !/^\d{1,7}$/.test(raw)) return null;
  const minor = Number(raw) * 100;
  return minor > 0 ? minor : null;
}

/** Pure. `settings` is the billing_settings row (or null). */
export function readBillingFlags(env: EnvSource, settings: { providerEnv: string } | null): BillingFlags {
  const unknownValues = ON_OFF_FLAGS.filter((name) => readOnOff(env[name]) === 'unknown');
  const cfg = getPaynkolayConfig(env);

  let binding: BillingBinding;
  const host = siteHost(env);
  const allowed = allowedSiteHosts(env);
  const served = platformHosts(env);
  if (!cfg) binding = { ok: false, env: null, reason: 'no_config' };
  else if (!host || !allowed.includes(host)) binding = { ok: false, env: cfg.env, reason: 'host_not_allowed' };
  // The platform's own domain list must agree with the configured site host.
  else if (served !== null && !served.some((h) => allowed.includes(h))) binding = { ok: false, env: cfg.env, reason: 'host_not_allowed' };
  else if ((env.NODE_ENV !== 'production' || vercelNonProduction(env)) && cfg.env !== 'test') {
    binding = { ok: false, env: cfg.env, reason: 'not_production' };
  }
  else if (!settings) binding = { ok: false, env: cfg.env, reason: 'no_binding_row' };
  else if (settings.providerEnv !== cfg.env) binding = { ok: false, env: cfg.env, reason: 'env_mismatch' };
  else binding = { ok: true, env: cfg.env, reason: null };

  const cardStorageIntent = readOnOff(env.PAYNKOLAY_CARD_STORAGE) === 'on';
  let keysOk = false;
  if (cardStorageIntent && binding.ok) {
    try {
      loadVaultKeys(env);
      loadHmacKeys(env);
      keysOk = true;
    } catch {
      keysOk = false;
    }
  }
  const cardStorage = cardStorageIntent && binding.ok && keysOk;
  const limit = non3dLimitMinor(env);
  const rawIp = env.PAYNKOLAY_MIT_CARDHOLDER_IP?.trim() ?? '';
  const mitCardholderIp = isIPv4(rawIp) ? rawIp : null;
  const mitPath = cfg?.mit ? 'mit_terminal' : cfg?.hosted3dEnforced ? 'hosted_3d_enforced' : null;
  const autoCharge =
    cardStorage &&
    readOnOff(env.PAYNKOLAY_AUTO_CHARGE) === 'on' &&
    limit !== null &&
    limit > 0 &&
    mitCardholderIp !== null &&
    mitPath !== null &&
    env.VERCEL !== '1';

  return {
    binding,
    cardStorageIntent,
    cardStorage,
    hostedCardSelect: cardStorage && readOnOff(env.PAYNKOLAY_HOSTED_CARD_SELECT) === 'on',
    autoCharge,
    dryRun: readOnOff(env.PAYNKOLAY_AUTO_CHARGE_DRY_RUN) !== 'off',
    non3dLimitMinor: limit,
    mitCardholderIp,
    mitPath,
    unknownValues,
  };
}

let unknownReported = false;

/** Reads billing_settings (cached 60 s per process) and calls readBillingFlags. A DB error fails closed. */
export async function loadBillingFlags(): Promise<BillingFlags> {
  let settings: { providerEnv: string } | null = null;
  try {
    settings = await getBillingSettings();
  } catch {
    settings = null;
  }
  const flags = readBillingFlags(process.env, settings);
  if (flags.unknownValues.length > 0 && !unknownReported) {
    unknownReported = true;
    Sentry.captureMessage('billing flag has an unknown value (treated as off; dry run stays on)', {
      level: 'warning',
      fingerprint: ['billing-flag-unknown'],
      tags: { billing: 'flags' },
      extra: { names: flags.unknownValues },
    });
  }
  return flags;
}

export interface BillingRuntimeReport {
  errors: { code: string; message: string }[];
  warnings: { code: string; message: string }[];
}

type RuntimeReporter = (level: 'error' | 'warning', code: string, message: string) => void;

const defaultReporter: RuntimeReporter = (level, code, message) => {
  if (level === 'error') console.error(`[billing] ${message}`);
  else console.warn(`[billing] ${message}`);
  Sentry.captureMessage(message, { level, fingerprint: [code], tags: { billing: 'startup' } });
};

/**
 * Runtime startup check (instrumentation.ts, nodejs). Secrets are runtime-only,
 * so this — not the build-time validate-env — is where missing or invalid
 * billing keys are caught. Reports only names and fixed codes, never values.
 * Flags fail closed regardless of what this reports.
 */
export function checkBillingRuntime(
  env: EnvSource = process.env,
  report: RuntimeReporter = defaultReporter,
): BillingRuntimeReport {
  const out: BillingRuntimeReport = { errors: [], warnings: [] };
  const emit = (level: 'error' | 'warning', code: string, message: string) => {
    (level === 'error' ? out.errors : out.warnings).push({ code, message });
    report(level, code, message);
  };

  const anyPaynkolay = Object.keys(env).some((k) => k.startsWith('PAYNKOLAY_') && k !== 'PAYNKOLAY_ENV' && env[k]?.trim());
  const base = resolvePaynkolayBaseUrl(env);
  if (anyPaynkolay && !base.ok) {
    emit(
      'error',
      'billing-config',
      base.reason === 'base_url_not_allowed'
        ? 'PAYNKOLAY_BASE_URL is not the allow-listed host of PAYNKOLAY_ENV; card checkout is disabled'
        : 'PAYNKOLAY_ENV must be "live" or "test" when PayNKolay is configured; card checkout is disabled',
    );
  }

  const unknown = ON_OFF_FLAGS.filter((name) => readOnOff(env[name]) === 'unknown');
  if (unknown.length > 0) {
    emit('warning', 'billing-flag-unknown', `billing flag has an unknown value: ${unknown.join(', ')} (off; dry run stays on)`);
  }

  // D18: a test PayNKolay environment must never run against the production database.
  if (base.ok && base.env === 'test' && isLiveDatabase(env)) {
    emit('error', 'billing-env-mismatch', 'PAYNKOLAY_ENV=test while DATABASE_URL is the production database (BILLING_LIVE_DB_REF); card payments are refused');
  }

  // Keys: a key that is set must be valid whatever the flags say. BILLING_HMAC_KEY is needed from phase 0
  // (reference fingerprints at settle, stable erasure pseudonyms), so it is required once PayNKolay is configured;
  // the vault key only with card storage.
  const cardStorageOn = readOnOff(env.PAYNKOLAY_CARD_STORAGE) === 'on';
  const paynkolayConfigured = !!env.PAYNKOLAY_ENV?.trim() || anyPaynkolay;
  const keyChecks: { name: string; set: boolean; required: boolean; load: (e: EnvSource) => unknown }[] = [
    {
      name: 'BILLING_VAULT_KEY',
      set: !!(env.BILLING_VAULT_KEY?.trim() || env.BILLING_VAULT_KEY_PREVIOUS?.trim()),
      required: cardStorageOn,
      load: loadVaultKeys,
    },
    {
      name: 'BILLING_HMAC_KEY',
      set: !!(env.BILLING_HMAC_KEY?.trim() || env.BILLING_HMAC_KEY_PREVIOUS?.trim()),
      required: cardStorageOn || paynkolayConfigured,
      load: loadHmacKeys,
    },
  ];
  for (const key of keyChecks) {
    if (!key.set && !key.required) continue;
    try {
      key.load(env);
    } catch (err) {
      const code = err instanceof VaultKeyError ? err.code : 'invalid';
      emit('error', 'billing-vault-key', `billing vault key unavailable (${key.name}: ${code})`);
    }
  }

  if (readOnOff(env.PAYNKOLAY_AUTO_CHARGE) === 'on') {
    const flags = readBillingFlags(env, base.ok ? { providerEnv: base.env } : null);
    const missing: string[] = [];
    if (flags.non3dLimitMinor === null) missing.push('PAYNKOLAY_NON3D_LIMIT_TRY');
    if (flags.mitCardholderIp === null) missing.push('PAYNKOLAY_MIT_CARDHOLDER_IP');
    if (flags.mitPath === null) missing.push('PAYNKOLAY_MIT_SX+PAYNKOLAY_MIT_SECRET_KEY or PAYNKOLAY_HOSTED_3D_ENFORCED');
    if (env.VERCEL === '1') missing.push('not on Vercel');
    if (missing.length > 0) emit('warning', 'billing-auto-charge-off', `auto-charge stays off; missing: ${missing.join(', ')}`);
  }
  return out;
}
