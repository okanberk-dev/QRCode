// Denetim Merkezi — builder (oluştur + düzenle) iskeleti.
//
// `new/loading.tsx` ve `[id]/edit/loading.tsx` aynı iskeleti paylaşır. Sarmalayıcı
// gerçek sayfayla birebir aynıdır (`max-w-[920px] space-y-5 px-4 sm:px-7 py-6
// lg:py-8`, CLAUDE.md §40.10 CLS=0): geri bağlantısı + başlık + "Bilgiler" kartı +
// madde listesi + eylem çubuğu. Oluşturmada "Ne tür bir denetim?" kartları da var.

import { SkBox, SkPageHeader, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';

export default function AuditBuilderSkeleton({ withKindPicker = false }: { withKindPicker?: boolean }) {
  return (
    <SkPageShell max={920} space={5}>
      <div className="flex min-h-11 items-center sm:min-h-0">
        <SkBox className="h-3 w-32" />
      </div>

      <SkPageHeader titleWidth="w-56" />

      {/* Bilgiler */}
      <div className="bz-card space-y-4 p-4 sm:p-5">
        <SkBox className="h-5 w-24" />

        {withKindPicker && (
          <div className="space-y-1.5">
            <SkBox className="h-3 w-40" />
            <div className="grid gap-2 sm:grid-cols-2">
              <SkBox className="h-[82px] w-full" />
              <SkBox className="h-[82px] w-full" />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <SkBox className="h-3 w-16" />
          <SkBox className="h-11 w-full" />
        </div>
        <div className="space-y-2">
          <SkBox className="h-3 w-44" />
          <SkBox className="h-3 w-56 max-w-full" />
          <SkBox className="h-[84px] w-full" />
        </div>
        <div className="space-y-2">
          <SkBox className="h-3 w-10" />
          <SkBox className="h-3 w-48 max-w-full" />
          <SkBox className="h-11 w-full sm:max-w-[240px]" />
        </div>
        <div className="border-t border-[#EDEDED] pt-1">
          <SkBox className="my-2 h-5 w-36" />
        </div>
      </div>

      {/* Maddeler */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <SkBox className="h-5 w-24" />
          <SkBox className="h-5 w-28" />
        </div>
        <div className="bz-card space-y-2.5 p-3">
          <div className="flex gap-2">
            <SkBox className="h-11 min-w-0 flex-1" />
            <SkBox className="h-11 w-20" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkBox key={i} className="h-9 w-20 rounded-full sm:h-8" />
            ))}
          </div>
        </div>
        <ol className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="bz-card space-y-2 p-2.5 sm:p-3">
              <SkBox className="h-8 w-full" />
              <div className="flex gap-2 px-2">
                <SkBox className="h-5 w-20" />
                <SkBox className="h-8 w-32" />
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Eylem çubuğu */}
      <div className="-mx-4 border-t border-[#EDEDED] px-4 py-3 sm:-mx-7 sm:px-7">
        <div className="flex items-center gap-2 sm:justify-end">
          <SkBox className="h-11 flex-1 sm:h-9 sm:w-40 sm:flex-none" />
          <SkBox className="h-11 flex-1 sm:h-9 sm:w-44 sm:flex-none" />
        </div>
      </div>
    </SkPageShell>
  );
}
