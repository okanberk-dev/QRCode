import { prisma } from '@/lib/prisma';

const REVISION_KEEP = 50;

/**
 * Drop revisions older than the most recent `REVISION_KEEP` for a given
 * (key, locale). Called from PATCH / DELETE / revert handlers — write-time
 * pruning keeps the table bounded without an extra cron moving part.
 *
 * Tiny race if two concurrent saves both compute keepIds: the second
 * `deleteMany` could try to delete a row a parallel call just inserted
 * outside its keepIds. Acceptable for an audit log — eventually
 * consistent, no data loss matters because both calls keep the latest.
 */
export async function pruneRevisions(key: string, locale: string): Promise<void> {
  const recent = await prisma.mailTemplateRevision.findMany({
    where: { templateKey: key, locale },
    orderBy: { createdAt: 'desc' },
    take: REVISION_KEEP,
    select: { id: true },
  });
  const keepIds = recent.map((r) => r.id);
  if (keepIds.length === 0) return;
  await prisma.mailTemplateRevision.deleteMany({
    where: {
      templateKey: key,
      locale,
      id: { notIn: keepIds },
    },
  });
}
