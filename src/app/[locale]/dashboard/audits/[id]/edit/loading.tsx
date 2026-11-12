import AuditBuilderSkeleton from '@/components/audits/AuditBuilderSkeleton';

/**
 * Denetimi düzenle (3 adımlı sihirbaz) — sarmalayıcı sayfayla birebir aynı
 * (`max-w-[920px] space-y-5`, CLS=0, CLAUDE.md §40.10). Düzenleme 2. adımda
 * ("Maddeler") açılır: hızlı ekleme kartı + madde satırları + Geri / Kaydet / İleri.
 */
export default function Loading() {
  return <AuditBuilderSkeleton step={1} />;
}
