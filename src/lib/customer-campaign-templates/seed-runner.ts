// Stage 119 §38.199 — Shared helper consumed by both the CLI seed script
// (scripts/seed-customer-campaign-templates.ts) and the admin trigger
// endpoint (/api/admin/customer-campaign-templates/seed). Idempotent upsert
// keyed on `customer_campaign_templates.key`. Owner-saved templates
// (restaurantId !== null, key === null) are NEVER touched.

import { prisma } from '@/lib/prisma';
import { CAMPAIGN_TEMPLATE_SEEDS } from './seed-data';

export type SeedRunResult = {
  upserted: number;
  total: number;
};

export async function runCampaignTemplateSeed({
  actorId,
}: {
  actorId?: string;
} = {}): Promise<SeedRunResult> {
  let upserted = 0;
  for (const row of CAMPAIGN_TEMPLATE_SEEDS) {
    await prisma.customerCampaignTemplate.upsert({
      where: { key: row.key },
      create: {
        key: row.key,
        title: row.title,
        description: row.description,
        sector: row.sector,
        locale: row.locale,
        category: row.category,
        subject: row.subject,
        body: row.body,
        isPublished: true,
        restaurantId: null,
        createdById: actorId ?? null,
        updatedById: actorId ?? null,
      },
      update: {
        title: row.title,
        description: row.description,
        sector: row.sector,
        locale: row.locale,
        category: row.category,
        subject: row.subject,
        body: row.body,
        updatedById: actorId ?? null,
        // isPublished left untouched — admin may have unpublished a row.
      },
    });
    upserted++;
  }
  return { upserted, total: CAMPAIGN_TEMPLATE_SEEDS.length };
}
