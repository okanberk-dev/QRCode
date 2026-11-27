import { SkBox, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Denetim sonuçları — geri bağlantısı + başlık + 3 özet kutusu + dikkat kartı +
 * filtre satırı + yanıt listesi. Sayfa sarmalayıcısı (`max-w-[1280px] space-y-4`)
 * ile birebir aynı (CLS=0, CLAUDE.md §40.10).
 */
export default function Loading() {
  return (
    <SkPageShell max={1280} space={4}>
      <div className="flex min-h-11 items-center sm:min-h-[18px]">
        <SkBox className="h-3 w-28" />
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <SkBox className="h-3 w-20" />
          <SkBox className="h-9 w-72 max-w-full" />
          <SkBox className="h-4 w-64 max-w-full" />
        </div>
        <div className="hidden shrink-0 sm:block">
          <SkBox className="h-9 w-48" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bz-card space-y-3 px-3 py-3 sm:p-4">
            <SkBox className="h-3 w-14" />
            <SkBox className="h-6 w-12" />
          </div>
        ))}
      </div>

      <div className="bz-card space-y-4 p-4 sm:p-5">
        <SkBox className="h-5 w-52" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <SkBox className="h-4 w-3/4" />
            <SkBox className="h-1.5 w-full" />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <SkBox className="h-9 w-56" />
        <SkBox className="h-11 min-w-[180px] flex-1" />
      </div>

      <div className="space-y-2 lg:hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bz-card flex min-h-14 items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1 space-y-2">
              <SkBox className="h-4 w-1/2" />
              <SkBox className="h-3 w-1/3" />
            </div>
            <SkBox className="h-6 w-14" />
          </div>
        ))}
      </div>
      <div className="hidden lg:block">
        <div className="bz-card overflow-hidden">
          <div className="border-b border-pn-line px-4 py-3">
            <SkBox className="h-3 w-full" />
          </div>
          <div className="divide-y divide-pn-line">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-4 py-4">
                <SkBox className="h-4 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </SkPageShell>
  );
}
