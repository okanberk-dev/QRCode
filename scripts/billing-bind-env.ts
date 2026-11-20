// Binds this database to one PayNKolay environment (billing spec §4.5, D18).
//
// Inserts the `billing_settings` singleton with provider_env = live | test.
// Until that row exists every billing flag stays off and the renewal engine
// reports `skipped: 'binding'`. The production database is bound to `live`
// as part of gate G0; a sandbox database to `test`.
//
// Usage:
//   DATABASE_URL=... npx tsx scripts/billing-bind-env.ts --env live
//   DATABASE_URL=... npx tsx scripts/billing-bind-env.ts --env test
//   # change an existing binding (rare; type the database host to confirm):
//   DATABASE_URL=... npx tsx scripts/billing-bind-env.ts --env test --rebind --confirm-host <db host>
//
// Refuses:
//   - `--env test` when DATABASE_URL contains BILLING_LIVE_DB_REF;
//   - changing an existing binding without --rebind and the matching host.
// Idempotent: binding to the env it already has is a no-op. Prints only the
// database host, never the URL or credentials.

import { PrismaClient } from '@prisma/client';
import { bindBillingEnv } from '../src/lib/billing/bind-env';

function arg(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null;
}

async function main(): Promise<number> {
  const env = arg('--env') ?? '';
  const prisma = new PrismaClient();
  try {
    const result = await bindBillingEnv(prisma, {
      env,
      rebind: process.argv.includes('--rebind'),
      confirmHost: arg('--confirm-host'),
      databaseUrl: process.env.DATABASE_URL,
      liveDbRef: process.env.BILLING_LIVE_DB_REF,
    });
    switch (result.status) {
      case 'created':
        console.log(`[billing-bind-env] bound database on ${result.host} to "${result.env}"`);
        break;
      case 'unchanged':
        console.log(`[billing-bind-env] database on ${result.host} is already bound to "${result.env}" (no change)`);
        break;
      case 'rebound':
        console.log(`[billing-bind-env] database on ${result.host} re-bound from "${result.previousEnv}" to "${result.env}"`);
        break;
      case 'refused': {
        const why: Record<typeof result.reason, string> = {
          invalid_env: 'pass --env live or --env test',
          no_database_url: 'DATABASE_URL is not set or not a URL',
          test_on_live_db: 'DATABASE_URL contains BILLING_LIVE_DB_REF; a test binding on the production database is refused',
          already_bound: `already bound to "${result.boundEnv}"; changing it needs --rebind --confirm-host <database host>`,
          host_mismatch: '--confirm-host does not match the database host',
        };
        console.error(`[billing-bind-env] refused: ${why[result.reason]}`);
        return 1;
      }
    }
    if ('warning' in result && result.warning === 'live_without_live_db_ref') {
      console.warn('[billing-bind-env] warning: bound to "live" but DATABASE_URL does not contain BILLING_LIVE_DB_REF');
    }
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    console.error('[billing-bind-env] failed:', err instanceof Error ? err.name : 'Error');
    process.exit(1);
  });
