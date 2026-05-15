/**
 * Idempotent seed for `mail_templates`. Reads the inline-default registry
 * (single source of truth shared with the admin API GET fallback) and
 * upserts a row per (key, locale). Safe to re-run after every schema/copy
 * update — `upsert` on `(key, locale)` unique pair overwrites existing rows.
 *
 * Stage 96 (CLAUDE.md §38): the inline defaults previously lived inline in
 * this file. They were moved to `src/lib/email/templates/mail-template-defaults.ts`
 * so the same content powers (a) DB seed, (b) admin API GET fallback so the
 * editor renders pre-filled inputs even when DB is empty, and (c) the
 * lifecycle templates' render fns (which already imported from
 * `lifecycle-defaults.ts`). One source of truth, no transcription drift.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/seed-mail-templates.ts
 *
 * Note: this seed mirrors the registry copy. Admin-edited rows are
 * overwritten on re-run — operator should treat seed as "reset to code
 * defaults". To preserve customisations, upgrade the loop to fetch
 * existing content first and only fill missing fields.
 */

import { PrismaClient } from '@prisma/client';
import { MAIL_INLINE_DEFAULTS } from '../src/lib/email/templates/mail-template-defaults';

type Copy = Record<string, unknown>;

const SEEDS: Array<{ key: string; locale: string; content: Copy }> = Object.entries(
  MAIL_INLINE_DEFAULTS,
).flatMap(([key, byLocale]) =>
  Object.entries(byLocale).map(([locale, content]) => ({
    key,
    locale,
    content: content as Copy,
  })),
);

async function main() {
  // Audit fix (final audit, post Wave A-F): guard against accidental
  // production execution. Seed force-upserts every MailTemplate row,
  // overwriting any admin-customized copy. The CI / Vercel build never
  // invokes this script (only `prisma migrate deploy`), but a curl-paste
  // accident or a misrun `npm run` shouldn't be able to wipe live
  // edits. Operators who genuinely need to reset prod templates set
  // ALLOW_SEED_IN_PROD=true and accept the consequences.
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED_IN_PROD !== 'true') {
    console.error('[seed] Refusing to run in production. Set ALLOW_SEED_IN_PROD=true to override.');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    let upserted = 0;
    for (const row of SEEDS) {
      await prisma.mailTemplate.upsert({
        where: { key_locale: { key: row.key, locale: row.locale } },
        create: { key: row.key, locale: row.locale, content: row.content as object },
        update: { content: row.content as object },
      });
      upserted++;
      console.log(`[seed] upserted ${row.key}:${row.locale}`);
    }
    console.log(`[seed] done. ${upserted} rows.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[seed] failed', err);
  process.exit(1);
});
