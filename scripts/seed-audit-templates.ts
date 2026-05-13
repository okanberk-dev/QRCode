/**
 * CLAUDE.md §42 — Denetim Merkezi seed CLI thin wrapper.
 *
 * Tüm seed logic + data `src/lib/audits/seed-runner.ts`'de yaşar
 * (`@/lib/prisma` singleton ile uyumlu, admin trigger endpoint ile aynı
 * helper). Bu dosya sadece CLI entry — Node.js process'i, exit code +
 * console output.
 *
 * Usage:
 *   DATABASE_URL=... DIRECT_URL=... npx tsx scripts/seed-audit-templates.ts
 *
 * Output:
 *   - 18 AuditCategory (food/hotel/retail/health/beauty/other × 3)
 *   - 25 global AuditTemplate (restaurantId null, isPublished true)
 *   - ~120 AuditQuestion (template başına 4-6)
 */

import { runAuditSeed } from '../src/lib/audits/seed-runner';

async function main() {
  const r = await runAuditSeed();
  console.log(
    `[audit seed] OK — categories: ${r.categories}, templates: ${r.templates}, questions: ${r.questions}, ${r.durationMs}ms`,
  );
}

main()
  .catch((err) => {
    console.error('[audit seed] FAILED', err);
    process.exit(1);
  });
