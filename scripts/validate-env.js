// Fail-fast env validation. Runs before `prisma migrate deploy` and `next build`.
// Vercel injects production env vars before running the build script, so a
// missing required value here means the deploy is misconfigured.
//
// Local dev: copy .env.example to .env.local and fill in values, then
// `npm run build` will pass.

const fs = require('node:fs');
const path = require('node:path');

function loadDotenvFile(file) {
  const fullPath = path.join(process.cwd(), file);
  if (!fs.existsSync(fullPath)) return;

  const lines = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;

    let value = rawValue.trim();
    const quoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));
    if (quoted) {
      value = value.slice(1, -1);
      if (rawValue.trim().startsWith('"')) value = value.replace(/\\n/g, '\n');
    } else {
      value = value.replace(/\s+#.*$/, '').trim();
    }
    process.env[key] = value;
  }
}

loadDotenvFile('.env');
loadDotenvFile('.env.local');

const required = [
  ['DATABASE_URL', 'Supabase pooled connection (port 6543)'],
  ['DIRECT_URL', 'Supabase direct connection (port 5432) — required for Prisma migrations'],
  ['JWT_SECRET', 'Auth token signing — set in production for any real deploy'],
  ['NEXT_PUBLIC_APP_URL', 'Used to build QR + email deeplinks'],
];

const optional = [
  ['NEXT_PUBLIC_SITE_URL', "canonical/hreflang/sitemap origin; defaults to https://www.buaze.com"],
  ['RESEND_API_KEY', 'mail send disabled, sendResendEmail returns false'],
  ['OPENAI_API_KEY', 'AI suggest-reply falls back to deterministic template'],
  ['SUPABASE_URL', 'careers attachment uploads return 503'],
  ['SUPABASE_SERVICE_ROLE_KEY', 'careers attachment uploads return 503'],
  ['SUPABASE_STORAGE_BUCKET', 'careers attachment uploads return 503'],
  ['KV_REST_API_URL', 'rate limiter falls back to per-instance in-memory mode'],
  ['KV_REST_API_TOKEN', 'rate limiter falls back to per-instance in-memory mode'],
  // CLAUDE.md §38 audit Fix #2 — Google OAuth env'leri. Eksikse owner
  // panelde "Google hesabını bağla" butonu config error döner, callback
  // çalışmaz. Build-time warn ile operatör fresh deploy'da fark eder.
  ['GOOGLE_CLIENT_ID', 'Google OAuth — owner "Google hesabını bağla" returns 200+configured:false, button silently fails'],
  ['GOOGLE_CLIENT_SECRET', 'Google OAuth callback — token exchange impossible, callback returns ?google=token-error'],
  ['GOOGLE_REDIRECT_URI', 'Google OAuth callback — fallback to request origin which may not match Cloud Console authorized URI'],
  ['GOOGLE_MAPS_API_KEY', 'Google Places API search — owner cannot search business name in Platform Bağlantıları panel'],
  // CLAUDE.md §38 audit Fix #6 — AES-256-GCM at-rest token encryption.
  // Eksikse Google access/refresh tokens plain text storage'a graceful
  // degrade eder (feature çalışır ama at-rest encryption disipline aktif değil).
  ['ENCRYPTION_KEY', 'Google token at-rest encryption disabled, falls back to plain text (backward-compat mode). Generate: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'],
  // Cron endpoints (/api/cron/*) reject every request with 401 when this is
  // missing — fail-closed. That hides silently broken automation: weekly
  // digest, lifecycle emails, platform link retest, etc. all stop without
  // any user-facing signal. Surface it at build time so a fresh deploy
  // notices before the first Monday cron tick.
  ['CRON_SECRET', 'every /api/cron/* endpoint returns 401, all batch jobs (digest, lifecycle, platform-link-retest, ...) stop running'],
  // reCAPTCHA Enterprise hard-block toggle (CLAUDE.md §38.2 + §38.79). Default
  // 'false' = monitor mode (Sentry breadcrumb only). Set to 'true' in Vercel
  // Production after Sentry `tags.reason:low score` rate is healthy. Surface
  // here so operators see it on fresh deploys.
  ['RECAPTCHA_ENFORCE', 'reCAPTCHA stays in monitor mode — low scores logged to Sentry but not blocked. Set "true" to enforce.'],
  // Stage 16 §38.86 — Supabase Realtime push for ActivityFeed. All three
  // must be set together; missing any one disables realtime gracefully
  // (page reload mode korunur, CLAUDE.md §38.31). Surface here so a fresh
  // deploy notices before the first dashboard open.
  ['NEXT_PUBLIC_SUPABASE_URL', 'ActivityFeed realtime push disabled, falls back to page-reload mode'],
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'ActivityFeed realtime push disabled, falls back to page-reload mode'],
  ['SUPABASE_JWT_SECRET', '/api/realtime/token endpoint returns 503, ActivityFeed falls back to page-reload mode'],
  // CLAUDE.md §44 — PayNKolay virtual POS. Missing values only turn off
  // card checkout; admin-managed (manual) billing keeps working.
  // PayNKolay secrets are runtime-only (Coolify: untick "Available at
  // Buildtime"), so "not set" here is expected on Coolify builds; the
  // runtime startup check (instrumentation.ts) validates them.
  ['PAYNKOLAY_ENV', 'Card checkout disabled: "live" or "test" selects the allow-listed PayNKolay host (required whenever any PAYNKOLAY_* is set; no default).'],
  ['PAYNKOLAY_SX', 'Card checkout disabled (PayNKolay "sx (Token)"). Runtime-only secret.'],
  ['PAYNKOLAY_SX_LIST', 'Card checkout disabled: payments cannot be verified (PayNKolay "sx List"). Runtime-only secret.'],
  ['PAYNKOLAY_MERCHANT_SECRET_KEY', 'Card checkout disabled (PayNKolay merchant secret key). Runtime-only secret.'],
  ['PAYNKOLAY_BASE_URL', 'Optional; when set it must equal the allow-listed host of PAYNKOLAY_ENV.'],
  ['PAYNKOLAY_MERCHANT_NO', 'Merchant number for the PayNKolay check scripts and the daily scan.'],
  ['PAYNKOLAY_MIT_SX', 'No separate merchant-initiated terminal; auto-charge stays off unless PAYNKOLAY_HOSTED_3D_ENFORCED=confirmed. Runtime-only secret.'],
  ['PAYNKOLAY_MIT_SECRET_KEY', 'No separate merchant-initiated terminal (see PAYNKOLAY_MIT_SX). Runtime-only secret.'],
  ['PAYNKOLAY_HOSTED_3D_ENFORCED', 'Unset: the hosted sx is never used for merchant-initiated charges.'],
  ['PAYNKOLAY_CARD_STORAGE', 'Saved cards off (default).'],
  ['PAYNKOLAY_HOSTED_CARD_SELECT', 'customerKey is sent only on payments that save a card (default).'],
  ['PAYNKOLAY_AUTO_CHARGE', 'Auto-renew charging off (default).'],
  ['PAYNKOLAY_AUTO_CHARGE_DRY_RUN', 'Dry run ON (default; only the exact value "off" disables it).'],
  ['PAYNKOLAY_NON3D_LIMIT_TRY', 'Auto-charge stays off (no non-3D limit).'],
  ['PAYNKOLAY_MIT_CARDHOLDER_IP', 'Auto-charge stays off (no cardHolderIP for merchant-initiated charges).'],
  ['BILLING_VAULT_KEY', 'Saved cards stay off (seal key for PayNKolay customer keys). Runtime-only secret.'],
  ['BILLING_VAULT_KEY_PREVIOUS', 'Only during a vault-key rotation. Runtime-only secret.'],
  ['BILLING_HMAC_KEY', 'Saved cards stay off (HMAC key for handles and fingerprints). Runtime-only secret.'],
  ['BILLING_HMAC_KEY_PREVIOUS', 'Only after an HMAC-key compromise. Runtime-only secret.'],
  ['BILLING_ALLOWED_HOSTS', 'Every billing flag stays off (site host must be listed, e.g. www.buaze.com,buaze.com).'],
  ['BILLING_LIVE_DB_REF', 'No guard against binding the production database to the PayNKolay test environment.'],
  ['TRUSTED_PROXIES', 'Billing client IP uses the default private ranges as trusted proxies.'],
];

const missing = [];
for (const [name, desc] of required) {
  const value = process.env[name];
  if (!value || !value.trim()) missing.push({ name, desc });
}

if (missing.length > 0) {
  console.error('\n[validate-env] ❌ Missing required environment variables:\n');
  for (const m of missing) console.error(`  - ${m.name} (${m.desc})`);
  console.error('\nSet them in Vercel → Settings → Environment Variables, or in .env.local for local dev.\n');
  process.exit(1);
}

const missingOptional = [];
for (const [name, effect] of optional) {
  const value = process.env[name];
  if (!value || !value.trim()) missingOptional.push({ name, effect });
}

if (missingOptional.length > 0) {
  console.warn('[validate-env] ⚠️  Optional env vars not set (features degrade gracefully):');
  for (const m of missingOptional) console.warn(`  - ${m.name}: ${m.effect}`);
}

// ── Billing / PayNKolay (CLAUDE.md §44, billing spec §5.3) ────────────────
// Errors only for NON-secret inputs (they are available at build). Anything
// that needs a secret is a warning, because secrets are deliberately absent
// at build time; runtime startup (instrumentation.ts) enforces them and the
// billing flags fail closed regardless.
const PAYNKOLAY_HOSTS = {
  live: 'https://paynkolay.nkolayislem.com.tr',
  test: 'https://paynkolaytest.nkolayislem.com.tr',
};
const BILLING_FLAG_NAMES = [
  'PAYNKOLAY_CARD_STORAGE',
  'PAYNKOLAY_HOSTED_CARD_SELECT',
  'PAYNKOLAY_AUTO_CHARGE',
  'PAYNKOLAY_AUTO_CHARGE_DRY_RUN',
];
const RUNTIME_ONLY_SECRETS = [
  'PAYNKOLAY_MERCHANT_SECRET_KEY',
  'PAYNKOLAY_SX',
  'PAYNKOLAY_SX_LIST',
  'PAYNKOLAY_MIT_SX',
  'PAYNKOLAY_MIT_SECRET_KEY',
  'BILLING_VAULT_KEY',
  'BILLING_VAULT_KEY_PREVIOUS',
  'BILLING_HMAC_KEY',
  'BILLING_HMAC_KEY_PREVIOUS',
  'ENCRYPTION_KEY',
  'CRON_SECRET',
];

function envValue(name) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : '';
}

function is32ByteKey(value) {
  return /^[A-Za-z0-9+/_-]{43}=?$/.test(value) && Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64').length === 32;
}

const billingErrors = [];
const billingWarnings = [];

for (const name of BILLING_FLAG_NAMES) {
  const value = envValue(name);
  if (value && value !== 'on' && value !== 'off') billingErrors.push(`${name} must be "on" or "off" (unknown values are treated as off; dry run stays on)`);
}

const paynkolayEnv = envValue('PAYNKOLAY_ENV');
const paynkolayAnySet = Object.keys(process.env).some((k) => k.startsWith('PAYNKOLAY_') && k !== 'PAYNKOLAY_ENV' && envValue(k));
if (paynkolayEnv && paynkolayEnv !== 'live' && paynkolayEnv !== 'test') {
  billingErrors.push('PAYNKOLAY_ENV must be "live" or "test"');
} else if (paynkolayAnySet && !paynkolayEnv) {
  billingErrors.push('PAYNKOLAY_* values are set without PAYNKOLAY_ENV ("live" or "test"); there is no default host');
}
const paynkolayBase = envValue('PAYNKOLAY_BASE_URL');
if (paynkolayBase && PAYNKOLAY_HOSTS[paynkolayEnv] && paynkolayBase.replace(/\/+$/, '') !== PAYNKOLAY_HOSTS[paynkolayEnv]) {
  billingErrors.push(`PAYNKOLAY_BASE_URL must be exactly ${PAYNKOLAY_HOSTS[paynkolayEnv]} for PAYNKOLAY_ENV=${paynkolayEnv}`);
}
const liveDbRef = envValue('BILLING_LIVE_DB_REF');
if (
  paynkolayEnv === 'test' &&
  envValue('PAYNKOLAY_CARD_STORAGE') === 'on' &&
  liveDbRef &&
  (process.env.DATABASE_URL || '').includes(liveDbRef)
) {
  billingErrors.push('PAYNKOLAY_ENV=test with PAYNKOLAY_CARD_STORAGE=on against the production database (BILLING_LIVE_DB_REF); use a separate test database');
}
if (envValue('PAYNKOLAY_AUTO_CHARGE') === 'on' && process.env.VERCEL === '1') {
  billingErrors.push('PAYNKOLAY_AUTO_CHARGE=on is not allowed on Vercel (auto-charge runs only on the Coolify server)');
}

for (const name of RUNTIME_ONLY_SECRETS) {
  if (envValue(name)) billingWarnings.push(`${name} is visible at build time: mark it runtime-only (Coolify: untick "Available at Buildtime")`);
}
if (envValue('PAYNKOLAY_CARD_STORAGE') === 'on') {
  for (const name of ['BILLING_VAULT_KEY', 'BILLING_HMAC_KEY']) {
    const value = envValue(name);
    if (value && !is32ByteKey(value)) billingWarnings.push(`${name} is not a 32-byte base64 key; saved cards will stay off`);
    else if (!value) billingWarnings.push(`${name} not visible at build (expected when runtime-only); checked again at startup`);
  }
}
if (envValue('PAYNKOLAY_AUTO_CHARGE') === 'on') {
  if (!/^\d{1,7}$/.test(envValue('PAYNKOLAY_NON3D_LIMIT_TRY'))) billingWarnings.push('auto-charge needs PAYNKOLAY_NON3D_LIMIT_TRY (integer TL)');
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(envValue('PAYNKOLAY_MIT_CARDHOLDER_IP'))) billingWarnings.push('auto-charge needs PAYNKOLAY_MIT_CARDHOLDER_IP (IPv4)');
  if (envValue('PAYNKOLAY_HOSTED_3D_ENFORCED') !== 'confirmed') {
    billingWarnings.push('auto-charge needs PAYNKOLAY_MIT_SX + PAYNKOLAY_MIT_SECRET_KEY at runtime, or PAYNKOLAY_HOSTED_3D_ENFORCED=confirmed');
  }
}

if (billingWarnings.length > 0) {
  console.warn('[validate-env] ⚠️  Billing:');
  for (const w of billingWarnings) console.warn(`  - ${w}`);
}
if (billingErrors.length > 0) {
  console.error('\n[validate-env] ❌ Invalid billing / PayNKolay configuration:\n');
  for (const e of billingErrors) console.error(`  - ${e}`);
  console.error('');
  process.exit(1);
}

console.log('[validate-env] ✅ All required environment variables are set.');
