// Denetim Merkezi — builder (oluştur + düzenle) iskeleti.
//
// `new/loading.tsx` ve `[id]/edit/loading.tsx` aynı iskeleti paylaşır. Sarmalayıcı
// gerçek sayfayla birebir aynıdır (`max-w-[920px] space-y-5 px-4 sm:px-7 py-6
// lg:py-8`, CLAUDE.md §40.10 CLS=0) ve sihirbazın ilk adımını taklit eder: geri
// bağlantısı + başlık + adım göstergesi + adım başlığı + ilk adım kartı + eylem
// çubuğu. Oluşturmada ilk kartta "Kontrol listesi / Test" seçimi de var.

import { SkBox, SkPageHeader, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';

export default function AuditBuilderSkeleton({ withKindPicker = false }: { withKindPicker?: boolean }) {
  return (
    <SkPageShell max={920} space={5}>
      <div className="flex min-h-11 items-center sm:min-h-0">
        <SkBox className="h-3 w-32" />
      </div>

      <SkPageHeader titleWidth="w-56" />

      {/* Adım göstergesi (WizardSteps) */}
      <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-[#F5F5F5] p-1.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex min-h-[44px] items-center justify-center sm:min-h-[40px]">
            <SkBox className="h-4 w-16 sm:w-20" />
          </div>
        ))}
      </div>

      {/* Adım 1 */}
      <div className="space-y-4">
        <div className="space-y-2">
          <SkBox className="h-6 w-60 max-w-full" />
          <SkBox className="h-4 w-80 max-w-full" />
        </div>

        <div className="bz-card space-y-4 p-4 sm:p-5">
          {withKindPicker && (
            <div className="space-y-2">
              <SkBox className="h-3 w-24" />
              <div className="grid gap-2 sm:grid-cols-2">
                <SkBox className="h-[82px] w-full" />
                <SkBox className="h-[82px] w-full" />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <SkBox className="h-3 w-28" />
            <SkBox className="h-11 w-full" />
          </div>
          <div className="space-y-2">
            <SkBox className="h-3 w-10" />
            <SkBox className="h-3 w-56 max-w-full" />
            <SkBox className="h-11 w-full sm:max-w-[240px]" />
          </div>
        </div>
      </div>

      {/* Eylem çubuğu */}
      <div className="-mx-4 border-t border-[#EDEDED] px-4 py-3 sm:-mx-7 sm:px-7">
        <div className="flex items-center gap-2 sm:justify-between">
          <SkBox className="hidden h-9 w-24 sm:block" />
          <SkBox className="h-11 flex-1 sm:h-9 sm:w-24 sm:flex-none" />
        </div>
      </div>
    </SkPageShell>
  );
}
