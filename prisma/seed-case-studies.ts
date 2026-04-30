import { PrismaClient } from '@prisma/client';
import { CASE_STUDY_SEEDS } from '../src/lib/seed/case-studies';

const prisma = new PrismaClient();

async function main() {
  for (const study of CASE_STUDY_SEEDS) {
    await prisma.caseStudy.upsert({
      where: { slug: study.slug },
      create: study,
      update: study,
    });
    console.log(`✓ upserted ${study.slug}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
