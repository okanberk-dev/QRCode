import { randomUUID } from 'node:crypto';
import { isIPv4, isIPv6 } from 'node:net';
import { Prisma, type PrismaClient } from '@prisma/client';
import { purgeProviderCards, type VaultDeps } from './card-vault';
import type { BillingEnv } from './flags';
import { billingLog } from './redact';
import { TERMINAL_STATES } from './renewal-policy';

/**
 * Retention and data minimisation (billing spec §4.4), run once per Istanbul
 * day by phase 8 of the renewal engine. DB-only steps always run; provider
 * deletions need the PayNKolay config, the environment binding and the vault
 * keys (`vault`), and retention notices need a mailer.
 *
 *  - consent IP / user agent: truncated (IPv4 /24, IPv6 /48) and nulled once
 *    `ip_purge_after` (consent or last successful charge + 540 d) has passed;
 *  - consent rows: `purge_after` = contract end + 10 years once the
 *    subscription has ended (cleared again if it restarts), deleted after it;
 *  - soft-deleted card mirror rows: deleted 30 days after `deleted_at`;
 *  - renewal rows: deleted 2 years after `ended_at`;
 *  - stored cards at PayNKolay: notice at end + 166 d, provider purge at
 *    end + 180 d (verified by re-list; tombstone on failure), mirror rows
 *    soft-deleted 'retention', customer row deleted.
 */

const DAY_MS = 24 * 60 * 60_000;
export const RETENTION = {
  /** Contract end + 10 years (TBK general limitation); also hard-coded in the SQL below. */
  consentYears: 10,
  cardRowDays: 30,
  renewalYears: 2,
  cardNoticeDays: 166,
  cardPurgeDays: 180,
  /** Purge even without a delivered notice this long after the period end (no mailer, or it kept failing). */
  cardPurgeWithoutNoticeDays: 194,
  noticeLeadDays: 14,
  batch: 500,
  customerBatch: 50,
} as const;

export interface MailTarget {
  email: string;
  locale: 'tr' | 'en';
}

export interface RetentionMailer {
  cardRetention(to: MailTarget, v: { last4: string | null; deleteOn: Date }): Promise<boolean>;
}

export interface RetentionDeps {
  db: PrismaClient;
  env: BillingEnv;
  vault: VaultDeps | null;
  mailer: RetentionMailer | null;
}

export interface RetentionSummary {
  ipsTruncated: number;
  consentsScheduled: number;
  consentsUnscheduled: number;
  consentsDeleted: number;
  cardRowsDeleted: number;
  renewalsDeleted: number;
  retentionNotices: number;
  providerPurged: number;
  providerTombstoned: number;
  providerSkipped: number;
}

/** IPv4 → /24 ("a.b.c.0"), IPv6 → /48 ("x:y:z::"); anything else → null. */
export function truncateIp(ip: string | null | undefined): string | null {
  const value = (ip ?? '').trim();
  if (isIPv4(value)) {
    const parts = value.split('.');
    return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  }
  if (isIPv6(value)) {
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(value);
    if (mapped) return truncateIp(mapped[1]);
    const [head, tail = ''] = value.split('::');
    const headParts = head ? head.split(':') : [];
    const tailParts = tail ? tail.split(':') : [];
    const missing = value.includes('::') ? 8 - headParts.length - tailParts.length : 0;
    const full = [...headParts, ...Array<string>(Math.max(0, missing)).fill('0'), ...tailParts];
    const first3 = full.slice(0, 3).map((p) => (p || '0').toLowerCase().replace(/^0+(?=.)/, ''));
    return `${first3.join(':')}::`;
  }
  return null;
}

function utc(at: Date): Prisma.Sql {
  return Prisma.sql`(${at.toISOString()}::timestamptz AT TIME ZONE 'UTC')`;
}

function addYears(d: Date, years: number): Date {
  const out = new Date(d.getTime());
  out.setUTCFullYear(out.getUTCFullYear() + years);
  return out;
}

export async function runRetention(deps: RetentionDeps, now: Date): Promise<RetentionSummary> {
  const { db } = deps;
  const summary: RetentionSummary = {
    ipsTruncated: 0,
    consentsScheduled: 0,
    consentsUnscheduled: 0,
    consentsDeleted: 0,
    cardRowsDeleted: 0,
    renewalsDeleted: 0,
    retentionNotices: 0,
    providerPurged: 0,
    providerTombstoned: 0,
    providerSkipped: 0,
  };

  // 1. Consent IP / UA minimisation (also applies to pseudonymised rows).
  const ipRows = await db.billingConsent.findMany({
    where: {
      ipPurgeAfter: { lte: now },
      ipTruncatedAt: null,
      OR: [{ ipAddress: { not: null } }, { userAgent: { not: null } }],
    },
    select: { id: true, ipAddress: true },
    take: RETENTION.batch,
  });
  for (const row of ipRows) {
    await db.billingConsent.update({
      where: { id: row.id },
      data: { ipAddress: truncateIp(row.ipAddress), userAgent: null, ipTruncatedAt: now },
      select: { id: true },
    });
    summary.ipsTruncated += 1;
  }

  // 2. Consent rows: schedule deletion once the contract ended; unschedule if it restarted.
  summary.consentsScheduled = await db.$executeRaw`
    UPDATE "billing_consents" AS c
    SET "purge_after" = s."renews_at" + interval '10 years'
    FROM "billing_subscriptions" AS s
    WHERE c."user_id" = s."user_id" AND c."purge_after" IS NULL
      AND s."status" = 'canceled' AND s."auto_renew" = false AND s."renews_at" IS NOT NULL`;
  summary.consentsUnscheduled = await db.$executeRaw`
    UPDATE "billing_consents" AS c
    SET "purge_after" = NULL
    FROM "billing_subscriptions" AS s
    WHERE c."user_id" = s."user_id" AND c."purge_after" IS NOT NULL AND c."purge_after" > ${utc(now)}
      AND c."user_id" NOT LIKE 'del\\_%' AND s."status" IN ('active', 'past_due')`;
  summary.consentsDeleted = (await db.billingConsent.deleteMany({ where: { purgeAfter: { lte: now } } })).count;

  // 3. Soft-deleted card mirror rows (last4, expiry, issuer, alias) after 30 days.
  summary.cardRowsDeleted = (
    await db.billingCard.deleteMany({ where: { deletedAt: { lte: new Date(now.getTime() - RETENTION.cardRowDays * DAY_MS) } } })
  ).count;

  // 4. Renewal history after 2 years.
  summary.renewalsDeleted = (
    await db.billingRenewal.deleteMany({
      where: { endedAt: { lte: addYears(now, -RETENTION.renewalYears) }, state: { in: [...TERMINAL_STATES] } },
    })
  ).count;

  // 5. Stored cards of ended subscriptions.
  await db.$executeRaw`
    UPDATE "billing_customers" AS c SET "retention_notice_at" = NULL
    FROM "billing_subscriptions" AS s
    WHERE s."user_id" = c."user_id" AND c."retention_notice_at" IS NOT NULL AND s."status" IN ('active', 'past_due')`;
  const noticeCutoff = new Date(now.getTime() - RETENTION.cardNoticeDays * DAY_MS);
  const candidates = await db.$queryRaw<{ user_id: string; retention_notice_at: Date | null; renews_at: Date }[]>`
    SELECT c."user_id", c."retention_notice_at", s."renews_at"
    FROM "billing_customers" AS c
    JOIN "billing_subscriptions" AS s ON s."user_id" = c."user_id"
    WHERE c."provider_env" = ${deps.env} AND s."status" = 'canceled' AND s."auto_renew" = false
      AND s."renews_at" IS NOT NULL AND s."renews_at" <= ${utc(noticeCutoff)}
    ORDER BY s."renews_at" ASC
    LIMIT ${RETENTION.customerBatch}`;

  for (const row of candidates) {
    const userId = row.user_id;
    const end = row.renews_at.getTime();
    const purgeDue = now.getTime() >= end + RETENTION.cardPurgeDays * DAY_MS;
    const noticeOld = row.retention_notice_at && row.retention_notice_at.getTime() <= now.getTime() - RETENTION.noticeLeadDays * DAY_MS;
    const forced = now.getTime() >= end + RETENTION.cardPurgeWithoutNoticeDays * DAY_MS;

    if (!row.retention_notice_at && deps.mailer && !forced) {
      const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, locale: true } });
      const card = await db.billingCard.findFirst({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: { last4: true },
      });
      const deleteOn = new Date(Math.max(end + RETENTION.cardPurgeDays * DAY_MS, now.getTime() + RETENTION.noticeLeadDays * DAY_MS));
      const sent = user
        ? await deps.mailer.cardRetention({ email: user.email, locale: user.locale === 'en' ? 'en' : 'tr' }, { last4: card?.last4 ?? null, deleteOn })
        : false;
      if (sent) {
        await db.billingCustomer.updateMany({ where: { userId }, data: { retentionNoticeAt: now } });
        summary.retentionNotices += 1;
      }
      continue;
    }

    if (!purgeDue || !(noticeOld || forced)) continue;
    if (!deps.vault) {
      summary.providerSkipped += 1;
      continue;
    }
    let purged = false;
    try {
      purged = (await purgeProviderCards(deps.vault, userId, 'retention')).ok;
    } catch (err) {
      billingLog('warn', 'retention.purge_failed', { userId, code: err instanceof Error ? err.name : 'unknown' });
    }
    await db.$transaction(async (tx) => {
      const customer = await tx.billingCustomer.findUnique({
        where: { userId },
        select: { customerKeyEnc: true, providerEnv: true },
      });
      if (!customer) return;
      if (!purged) {
        // Provider deletion still owed: keep the verbatim sealed key until it is verified (phase 6).
        await tx.billingVaultTombstone.create({
          data: { id: `tb_${randomUUID()}`, providerEnv: customer.providerEnv, customerKeyEnc: customer.customerKeyEnc, aadUserId: userId },
          select: { id: true },
        });
      }
      await tx.billingCard.updateMany({
        where: { userId, deletedAt: null },
        data: { deletedAt: now, deleteReason: 'retention', boundConsentId: null },
      });
      await tx.billingCustomer.deleteMany({ where: { userId } });
    });
    if (purged) summary.providerPurged += 1;
    else summary.providerTombstoned += 1;
  }

  return summary;
}
