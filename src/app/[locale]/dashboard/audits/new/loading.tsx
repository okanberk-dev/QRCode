import AuditBuilderSkeleton from '@/components/audits/AuditBuilderSkeleton';

/**
 * Yeni denetim (3 adımlı sihirbaz) — sarmalayıcı sayfayla birebir aynı
 * (`max-w-[920px] space-y-5`, CLS=0, CLAUDE.md §40.10). Sayfa 1. adımda
 * ("Başla") açılır; ilk kartta "Kontrol listesi / Test" seçimi var.
 */
export default function Loading() {
  return <AuditBuilderSkeleton withKindPicker step={0} />;
}
