// Fail-fast env validation. Runs before `prisma db push` and `next build`.
// Vercel injects production env vars before running the build script, so a
// missing required value here means the deploy is misconfigured.
//
// Local dev: copy .env.example to .env.local and fill in values, then
// `npm run build` will pass.

const required = [
  ['DATABASE_URL', 'Supabase pooled connection (port 6543)'],
  ['DIRECT_URL', 'Supabase direct connection (port 5432) — required for prisma db push'],
  ['JWT_SECRET', 'Auth token signing — set in production for any real deploy'],
  ['NEXT_PUBLIC_APP_URL', 'Used to build QR + email deeplinks'],
];

const optional = [
  ['RESEND_API_KEY', 'mail send disabled, sendResendEmail returns false'],
  ['OPENAI_API_KEY', 'AI suggest-reply falls back to deterministic template'],
  ['SUPABASE_URL', 'careers attachment uploads return 503'],
  ['SUPABASE_SERVICE_ROLE_KEY', 'careers attachment uploads return 503'],
  ['SUPABASE_STORAGE_BUCKET', 'careers attachment uploads return 503'],
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
