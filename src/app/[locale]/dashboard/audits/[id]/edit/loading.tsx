import AuditBuilderSkeleton from '@/components/audits/AuditBuilderSkeleton';

/**
 * Denetimi düzenle (tek sayfa builder) — sarmalayıcı sayfayla birebir aynı
 * (`max-w-[920px] space-y-5`, CLS=0, CLAUDE.md §40.10). Oluşturma ekranıyla
 * aynı iskeleti paylaşır.
 */
export default function Loading() {
  return <AuditBuilderSkeleton />;
}
