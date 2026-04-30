/**
 * Idempotent seed for `legal_documents`. 7 belge × 2 dil = 14 satır.
 *
 *   DATABASE_URL=... DIRECT_URL=... npx tsx scripts/seed-legal-documents.ts
 *
 * Pattern: MailTemplate seed (CLAUDE.md §21.26) ile aynı. Admin-edited
 * içeriği korumak için bu script DB'de zaten satır varsa **dokunmaz**.
 * Bu yüzden her deploy'da güvenle koşturulabilir; ilk seed dışında
 * admin override'larını bozmaz. "Kod default'larına geri dön" istenirse
 * admin panelden tek tek "Varsayılana dön" tıklanır.
 */

import { PrismaClient } from '@prisma/client';
import {
  LEGAL_DOCUMENT_KEYS,
  LEGAL_LOCALES,
  LEGAL_DOCUMENT_DESCRIPTIONS,
} from '../src/lib/legal/keys';
import { LEGAL_TEMPLATE_DEFAULTS } from '../src/lib/legal/templates';

async function main() {
  const prisma = new PrismaClient();
  let created = 0;
  let skipped = 0;

  try {
    for (const key of LEGAL_DOCUMENT_KEYS) {
      for (const locale of LEGAL_LOCALES) {
        const tmpl = LEGAL_TEMPLATE_DEFAULTS[key][locale];
        const existing = await prisma.legalDocument.findUnique({
          where: { key_locale: { key, locale } },
          select: { id: true, version: true },
        });
        if (existing) {
          skipped++;
          continue;
        }
        const doc = await prisma.legalDocument.create({
          data: {
            key,
            locale,
            title: tmpl.title,
            content: tmpl.content,
            description: LEGAL_DOCUMENT_DESCRIPTIONS[key][locale],
            version: 1,
            isActive: true,
            effectiveAt: new Date(),
          },
        });
        await prisma.legalDocumentRevision.create({
          data: {
            documentId: doc.id,
            documentKey: key,
            locale,
            version: 1,
            editType: 'created',
            title: doc.title,
            content: doc.content,
            isActive: true,
            effectiveAt: doc.effectiveAt,
          },
        });
        created++;
        console.log(`  [seed] created ${key}:${locale} v1`);
      }
    }
    console.log(`Done — created ${created}, skipped (already present) ${skipped}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
