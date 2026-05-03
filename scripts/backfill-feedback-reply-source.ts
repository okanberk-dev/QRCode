// One-shot data migration: backfill `FeedbackReply.source` for rows that
// pre-date the column.
//
// Why: `source String? @default("manual")` only fills the default on NEW
// inserts. Existing rows stay NULL after the schema migration. The trial cron's
// AI count filter (`source: 'ai_copilot'`) ignores NULLs anyway, but admin
// reports that GROUP BY source will surface a phantom "Unknown" bucket
// unless we backfill.
//
// Usage (local or one-off prod shell):
//   DATABASE_URL=... npx tsx scripts/backfill-feedback-reply-source.ts
//
// Idempotent — re-runs are no-ops since we only touch NULL rows.

import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const beforeNull = await prisma.feedbackReply.count({ where: { source: null } });
    if (beforeNull === 0) {
      console.log('[backfill] No NULL source rows. Nothing to do.');
      return;
    }

    console.log(`[backfill] Updating ${beforeNull} rows where source IS NULL → 'manual'`);
    const result = await prisma.feedbackReply.updateMany({
      where: { source: null },
      data: { source: 'manual' },
    });
    console.log(`[backfill] Updated ${result.count} rows.`);

    const afterNull = await prisma.feedbackReply.count({ where: { source: null } });
    if (afterNull > 0) {
      console.warn(`[backfill] WARN: ${afterNull} rows still NULL after update — investigate.`);
    } else {
      console.log('[backfill] Done. All rows have a non-null source.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[backfill] Failed:', err);
  process.exit(1);
});
