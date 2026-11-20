import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * Server-only billing code never reaches the browser, and secrets leave a
 * `Sensitive` wrapper only in the three places that build provider requests
 * (billing spec §14.3, §15.2; pattern from three-boundary.test.ts).
 */

const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|mts|cts|js|jsx|mjs)$/.test(name)) out.push(full);
  }
  return out;
}

const files = walk(SRC).map((full) => ({ rel: relative(ROOT, full).split(sep).join('/'), text: readFileSync(full, 'utf8') }));
const rootFiles = ['instrumentation.ts', 'instrumentation-client.ts', 'sentry.server.config.ts', 'sentry.edge.config.ts', 'next.config.ts'].map(
  (name) => ({ rel: name, text: readFileSync(join(ROOT, name), 'utf8') }),
);

const SERVER_ONLY_MODULES =
  /['"](?:@\/lib|(?:\.\.?\/)+(?:[\w-]+\/)*lib)\/(?:billing\/(?:vault-crypto|card-vault|renewal-engine|renewal-store-prisma|retention)|payment\/paynkolay-cards)['"]/;
const RELATIVE_SERVER_ONLY = /['"]\.\.?\/(?:[\w-]+\/)*(?:vault-crypto|card-vault|renewal-engine|renewal-store-prisma|retention|paynkolay-cards)['"]/;

test('1. no client file and nothing under src/components imports server-only billing modules', () => {
  const offenders: string[] = [];
  for (const { rel, text } of files) {
    const isClient = /^\s*['"]use client['"]/m.test(text);
    const isComponent = rel.startsWith('src/components/');
    if (!isClient && !isComponent) continue;
    if (SERVER_ONLY_MODULES.test(text) || RELATIVE_SERVER_ONLY.test(text)) offenders.push(rel);
  }
  assert.deepEqual(offenders, [], `server-only billing modules imported from client code: ${offenders.join(', ')}`);
});

test('2. .reveal() appears only in the PayNKolay request builders, the hosted form and vault crypto', () => {
  const allowed = new Set([
    'src/lib/payment/paynkolay-cards.ts',
    'src/lib/payment/paynkolay.ts',
    'src/lib/billing/vault-crypto.ts',
    // The definition of the method itself.
    'src/lib/billing/sensitive.ts',
  ]);
  const offenders = files.filter(({ rel, text }) => /\.reveal\(\)/.test(text) && !allowed.has(rel)).map((f) => f.rel);
  assert.deepEqual(offenders, [], `.reveal() outside the allow-list: ${offenders.join(', ')}`);
});

test('3. no NEXT_PUBLIC_PAYNKOLAY* or NEXT_PUBLIC_BILLING* env name is referenced', () => {
  const offenders = [...files, ...rootFiles]
    .filter(({ text }) => /NEXT_PUBLIC_(?:PAYNKOLAY|BILLING)/.test(text))
    .map((f) => f.rel);
  assert.deepEqual(offenders, []);
  for (const name of ['.env.example']) {
    assert.ok(!/NEXT_PUBLIC_(?:PAYNKOLAY|BILLING)/.test(readFileSync(join(ROOT, name), 'utf8')), name);
  }
});

test('billing never reads ENCRYPTION_KEY (Google-only key)', () => {
  const offenders = files
    .filter(({ rel }) => rel.startsWith('src/lib/billing/') || rel.startsWith('src/lib/payment/'))
    .filter(({ text }) => /process\.env\.ENCRYPTION_KEY|from\s+['"][^'"]*google-token-crypto['"]/.test(text))
    .map((f) => f.rel);
  assert.deepEqual(offenders, []);
});

test('production Sentry config keeps local variables off and the scrubbers on', () => {
  const server = readFileSync(join(ROOT, 'sentry.server.config.ts'), 'utf8');
  assert.match(server, /includeLocalVariables:\s*process\.env\.NODE_ENV !== 'production'/);
  assert.match(server, /beforeSendLog:\s*scrubSentryLog/);
  assert.match(server, /scrubSentryEvent\(event\)/);
  const edge = readFileSync(join(ROOT, 'sentry.edge.config.ts'), 'utf8');
  assert.match(edge, /beforeSendLog:\s*scrubSentryLog/);
});
