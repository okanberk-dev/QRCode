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
  ['RESEND_API_KEY', 'mail send disabled, sendResendEmail returns false'],
  ['OPENAI_API_KEY', 'AI suggest-reply falls back to deterministic template'],
  ['SUPABASE_URL', 'careers attachment uploads return 503'],
  ['SUPABASE_SERVICE_ROLE_KEY', 'careers attachment uploads return 503'],
  ['SUPABASE_STORAGE_BUCKET', 'careers attachment uploads return 503'],
  ['KV_REST_API_URL', 'rate limiter falls back to per-instance in-memory mode'],
  ['KV_REST_API_TOKEN', 'rate limiter falls back to per-instance in-memory mode'],
  // Cron endpoints (/api/cron/*) reject every request with 401 when this is
  // missing — fail-closed. That hides silently broken automation: weekly
  // digest, lifecycle emails, platform link retest, etc. all stop without
  // any user-facing signal. Surface it at build time so a fresh deploy
  // notices before the first Monday cron tick.
  ['CRON_SECRET', 'every /api/cron/* endpoint returns 401, all batch jobs (digest, lifecycle, platform-link-retest, ...) stop running'],
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
