/**
 * Lemon Squeezy environment configuration (CLAUDE.md §44).
 *
 * Single source of truth for env access — no `process.env.LEMON_SQUEEZY_*`
 * scattered across the codebase. Boot-time mode + key prefix sanity check
 * (test_xxx in production mode would silently send live payments to test
 * accounts, or vice versa — fail closed with Sentry warn).
 *
 * **Yapma**: bu helper'ı çağıran callsite `config.apiKey` undefined olabilir
 * varsayımıyla yazılmalı — env yoksa `enabled: false` döner ve caller
 * 503 veya graceful no-op uygulamalı. Mevcut manuel admin akışı bu helper'a
 * bakmaz (sadece `paymentProvider='lemon_squeezy'` tier'lar bakar).
 */

import * as Sentry from '@sentry/nextjs';

export type LemonSqueezyMode = 'test' | 'production';

export interface LemonSqueezyConfig {
  /** True when all 3 critical env vars set + mode/key prefix match. */
  enabled: boolean;
  /** Raw API key. Empty string if not configured. */
  apiKey: string;
  /** Lemon Squeezy store ID. Empty string if not configured. */
  storeId: string;
  /** HMAC secret for webhook signature verification. */
  webhookSecret: string;
  /** 'test' | 'production'. Defaults to 'test' if unset. */
  mode: LemonSqueezyMode;
  /** Diagnostic reason if `enabled: false`. */
  disabledReason?:
    | 'missing_api_key'
    | 'missing_store_id'
    | 'missing_webhook_secret'
    | 'mode_key_mismatch';
}

let cached: LemonSqueezyConfig | null = null;
let warnedMismatch = false;

export function getLemonSqueezyConfig(): LemonSqueezyConfig {
  if (cached) return cached;

  const apiKey = (process.env.LEMON_SQUEEZY_API_KEY ?? '').trim();
  const storeId = (process.env.LEMON_SQUEEZY_STORE_ID ?? '').trim();
  const webhookSecret = (process.env.LEMON_SQUEEZY_WEBHOOK_SECRET ?? '').trim();
  const rawMode = (process.env.LEMON_SQUEEZY_MODE ?? 'test').trim().toLowerCase();
  const mode: LemonSqueezyMode = rawMode === 'production' ? 'production' : 'test';

  let disabledReason: LemonSqueezyConfig['disabledReason'];

  if (!apiKey) disabledReason = 'missing_api_key';
  else if (!storeId) disabledReason = 'missing_store_id';
  else if (!webhookSecret) disabledReason = 'missing_webhook_secret';
  else {
    // Key prefix sanity check — test_xxx must pair with mode='test',
    // live_xxx must pair with mode='production'. Mismatch indicates
    // operator error (most common: forgot to update env after rotating
    // keys). Fail-closed prevents accidental live charges in test mode.
    const isTestKey = apiKey.startsWith('test_');
    const isLiveKey = apiKey.startsWith('live_');
    const expectedTest = mode === 'test';

    if (isTestKey && !expectedTest) disabledReason = 'mode_key_mismatch';
    else if (isLiveKey && expectedTest) disabledReason = 'mode_key_mismatch';
    // If key has neither prefix (e.g. legacy format), accept silently —
    // some Lemon Squeezy accounts predate the prefix convention.
  }

  if (disabledReason === 'mode_key_mismatch' && !warnedMismatch) {
    warnedMismatch = true;
    Sentry.captureMessage('Lemon Squeezy mode/key mismatch', {
      level: 'error',
      tags: { integration: 'lemon-squeezy', reason: 'mode_key_mismatch' },
      extra: {
        mode,
        apiKeyPrefix: apiKey.slice(0, 5),
      },
    });
    console.error(
      '[lemon-squeezy] mode/key mismatch — LEMON_SQUEEZY_MODE=%s but API key prefix=%s. Integration disabled.',
      mode,
      apiKey.slice(0, 5),
    );
  }

  cached = {
    enabled: !disabledReason,
    apiKey,
    storeId,
    webhookSecret,
    mode,
    disabledReason,
  };

  return cached;
}

/** Test-only: clear cached config (Node test runner each test isolation). */
export function __resetLemonSqueezyConfigForTests(): void {
  cached = null;
  warnedMismatch = false;
}
