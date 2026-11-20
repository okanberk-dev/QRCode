import { isIPv4 } from 'node:net';
import * as Sentry from '@sentry/nextjs';
import { SITE_URL } from '@/lib/site';
import { getPaynkolayConfig, resolvePaynkolayBaseUrl, type EnvSource, type PaynkolayEnv } from '@/lib/payment/paynkolay';
import { getBillingSettings } from './billing-settings';
import { loadHmacKeys, loadVaultKeys, VaultKeyError } from './vault-crypto';

/**
 * Billing feature flags and environment binding (billing spec §5). The only
 * reader of the billing flag env vars. Everything fails closed:
 *  - every capability is off unless the binding holds (allow-listed PayNKolay
 *    host + explicit PAYNKOLAY_ENV, allow-listed site host, production — or an
 *    explicit test environment — and a `billing_settings` row bound to the
 *    same environment);
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

function siteHost(env: EnvSource): string | null {
  try {
    return new URL(env.NEXT_PUBLIC_SITE_URL?.trim() || SITE_URL).host.toLowerCase();
  } catch {
    return null;
  }
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
  if (!cfg) binding = { ok: false, env: null, reason: 'no_config' };
  else if (!host || !allowedSiteHosts(env).includes(host)) binding = { ok: false, env: cfg.env, reason: 'host_not_allowed' };
  else if (env.NODE_ENV !== 'production' && cfg.env !== 'test') binding = { ok: false, env: cfg.env, reason: 'not_production' };
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

  if (readOnOff(env.PAYNKOLAY_CARD_STORAGE) === 'on') {
    for (const loader of [loadVaultKeys, loadHmacKeys]) {
      try {
        loader(env);
      } catch (err) {
        const code = err instanceof VaultKeyError ? err.code : 'invalid';
        emit('error', 'billing-vault-key', `billing vault key unavailable (${loader === loadVaultKeys ? 'BILLING_VAULT_KEY' : 'BILLING_HMAC_KEY'}: ${code})`);
      }
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
