/**
 * Idempotent seed for `customer_campaign_templates` (global catalog).
 * Stage 119 §38.199.
 *
 * Thin CLI wrapper around `runCampaignTemplateSeed()` so both the manual
 * `npx tsx` invocation and the admin trigger endpoint share one source of
 * truth (CLAUDE.md §21.13 — no self-fetch antipattern).
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/seed-customer-campaign-templates.ts
 */

import { PrismaClient } from '@prisma/client';
import { runCampaignTemplateSeed } from '../src/lib/customer-campaign-templates/seed-runner';

async function main() {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.ALLOW_SEED_IN_PROD !== 'true'
  ) {
    console.error(
      '[seed] Refusing to run in production. Set ALLOW_SEED_IN_PROD=true to override.',
    );
    process.exit(1);
  }

  try {
    const result = await runCampaignTemplateSeed();
    console.log(`[seed] ${result.upserted} customer campaign templates upserted (of ${result.total}).`);
  } catch (err) {
    console.error('[seed] failed:', err);
    process.exitCode = 1;
  } finally {
    // Helper uses the singleton; disconnect for clean CLI exit.
    const prisma = new PrismaClient();
    await prisma.$disconnect();
  }
}

void main();
