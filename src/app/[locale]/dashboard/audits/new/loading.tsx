import AuditBuilderSkeleton from '@/components/audits/AuditBuilderSkeleton';

/**
 * Yeni denetim (tek sayfa builder) — sarmalayıcı sayfayla birebir aynı
 * (`max-w-[920px] space-y-5`, CLS=0, CLAUDE.md §40.10). Düzenleme ekranıyla
 * aynı iskeleti paylaşır; yalnız burada "Ne tür bir denetim?" kartları var.
 */
export default function Loading() {
  return <AuditBuilderSkeleton withKindPicker />;
}
