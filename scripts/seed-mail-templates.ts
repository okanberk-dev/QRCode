/**
 * CLI seed for `mail_templates`. Reads default copy from the shared
 * `src/lib/email/seed-data.ts` module so the API endpoint
 * (`/api/admin/seed-mail-templates`) and this CLI script never drift.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/seed-mail-templates.ts
 *
 * Behaviour: full force overwrite — every (key, locale) row's content
 * is reset to the inline default. Use the admin panel button instead
 * if you want safer "seed missing only" semantics or audit log
 * integration (this CLI bypasses Phase 5 revisions).
 */

import { PrismaClient } from '@prisma/client';
import { MAIL_TEMPLATE_SEEDS } from '../src/lib/email/seed-data';

async function main() {
  const prisma = new PrismaClient();
  try {
    let upserted = 0;
    for (const row of MAIL_TEMPLATE_SEEDS) {
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
