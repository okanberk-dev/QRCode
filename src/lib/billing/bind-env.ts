import { Prisma, type PrismaClient } from '@prisma/client';
import type { PaynkolayEnv } from '@/lib/payment/paynkolay';
import { SETTINGS_ID } from './billing-settings';

/**
 * Core of `scripts/billing-bind-env.ts` (billing spec §4.5): binds a database
 * to one PayNKolay environment by inserting the `billing_settings` singleton.
 *  - Inserts only when the row does not exist.
 *  - Never changes an existing binding, unless `rebind` AND `confirmHost`
 *    equals the host of the database URL (the operator types it).
 *  - Refuses `test` when the database URL contains `BILLING_LIVE_DB_REF`
 *    (a test environment must never touch the production database).
 * Never prints or returns the database URL itself — only its host.
 */

export interface BindEnvInput {
  env: string;
  rebind: boolean;
  confirmHost: string | null;
  databaseUrl: string | undefined;
  liveDbRef: string | undefined;
}

export type BindEnvResult =
  | { status: 'created' | 'unchanged'; env: PaynkolayEnv; host: string; warning?: 'live_without_live_db_ref' }
  | { status: 'rebound'; env: PaynkolayEnv; previousEnv: string; host: string }
  | {
      status: 'refused';
      reason: 'invalid_env' | 'no_database_url' | 'test_on_live_db' | 'already_bound' | 'host_mismatch';
      boundEnv?: string;
    };

/** Host of a postgres URL (no credentials), or null. */
export function databaseHost(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname || null;
  } catch {
    return null;
  }
}

type BindDb = Pick<PrismaClient, 'billingSettings'>;

export async function bindBillingEnv(db: BindDb, input: BindEnvInput): Promise<BindEnvResult> {
  if (input.env !== 'live' && input.env !== 'test') return { status: 'refused', reason: 'invalid_env' };
  const env: PaynkolayEnv = input.env;
  const host = databaseHost(input.databaseUrl);
  if (!input.databaseUrl || !host) return { status: 'refused', reason: 'no_database_url' };
  const liveRef = input.liveDbRef?.trim();
  if (env === 'test' && liveRef && input.databaseUrl.includes(liveRef)) {
    return { status: 'refused', reason: 'test_on_live_db' };
  }
  const warning = env === 'live' && liveRef && !input.databaseUrl.includes(liveRef) ? 'live_without_live_db_ref' : undefined;

  const read = () => db.billingSettings.findUnique({ where: { id: SETTINGS_ID }, select: { providerEnv: true } });
  let existing = await read();
  if (!existing) {
    try {
      await db.billingSettings.create({ data: { id: SETTINGS_ID, providerEnv: env }, select: { id: true } });
      return warning ? { status: 'created', env, host, warning } : { status: 'created', env, host };
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err;
      existing = await read();
      if (!existing) throw err;
    }
  }
  if (existing.providerEnv === env) {
    return warning ? { status: 'unchanged', env, host, warning } : { status: 'unchanged', env, host };
  }
  if (!input.rebind) return { status: 'refused', reason: 'already_bound', boundEnv: existing.providerEnv };
  if (!input.confirmHost || input.confirmHost.trim() !== host) {
    return { status: 'refused', reason: 'host_mismatch', boundEnv: existing.providerEnv };
  }
  const res = await db.billingSettings.updateMany({
    where: { id: SETTINGS_ID, providerEnv: existing.providerEnv },
    data: { providerEnv: env },
  });
  if (res.count !== 1) return { status: 'refused', reason: 'already_bound', boundEnv: existing.providerEnv };
  return { status: 'rebound', env, previousEnv: existing.providerEnv, host };
}
