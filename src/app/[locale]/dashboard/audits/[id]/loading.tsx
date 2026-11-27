import { SkBox, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Denetim detayı — geri bağlantısı + başlık + paylaşım kartı + özet + maddeler +
 * son yanıtlar. Sayfa sarmalayıcısı (`max-w-[1280px] space-y-4`) ile birebir aynı
 * (CLS=0, CLAUDE.md §40.10).
 */
export default function Loading() {
  return (
    <SkPageShell max={1280} space={4}>
      <div className="flex min-h-11 items-center sm:min-h-[18px]">
        <SkBox className="h-3 w-32" />
      </div>

      {/* Başlık: sağda "Sonuçlar" + "Diğer" (mobilde başlığın altında). */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <SkBox className="h-8 w-72 max-w-full" />
          <div className="flex gap-1.5">
            <SkBox className="h-5 w-24" />
            <SkBox className="h-5 w-20" />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SkBox className="h-11 w-32 sm:h-9 sm:w-28" />
          <SkBox className="h-11 w-11 sm:h-9 sm:w-20" />
        </div>
      </div>

      <div className="bz-card space-y-3 p-4 sm:p-5">
        <SkBox className="h-5 w-32" />
        <div className="space-y-3 rounded-[10px] border border-pn-line bg-pn-canvas p-3 sm:p-4">
          <SkBox className="h-11 w-full" />
          <SkBox className="h-9 w-2/3" />
        </div>
      </div>

      <SkBox className="h-4 w-64 max-w-full" />

      <div className="space-y-2">
        <SkBox className="h-5 w-24" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-[20px] border border-pn-line bg-white px-3 py-3">
            <SkBox className="h-4 w-2/3" />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <SkBox className="h-5 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-[20px] border border-pn-line bg-white px-3 py-3">
            <SkBox className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </SkPageShell>
  );
}
