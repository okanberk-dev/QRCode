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
  ['PAYNKOLAY_SX', 'Card checkout disabled (PayNKolay "sx (Token)").'],
  ['PAYNKOLAY_SX_LIST', 'Card checkout disabled: payments cannot be verified (PayNKolay "sx List").'],
  ['PAYNKOLAY_MERCHANT_SECRET_KEY', 'Card checkout disabled (PayNKolay merchant secret key).'],
  ['PAYNKOLAY_BASE_URL', 'Defaults to the PayNKolay TEST host; production must set https://paynkolay.nkolayislem.com.tr.'],
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

console.log('[validate-env] ✅ All required environment variables are set.');
