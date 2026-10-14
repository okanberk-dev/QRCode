import { SkBox, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Denetim detayı — geri bağlantısı + başlık + paylaşım kartı + özet + maddeler +
 * son yanıtlar. Sayfa sarmalayıcısı (`max-w-[1280px] space-y-4`) ile birebir aynı
 * (CLS=0, CLAUDE.md §40.10).
 */
export default function Loading() {
  return (
    <SkPageShell max={1280} space={4}>
      <SkBox className="h-3 w-32" />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <SkBox className="h-8 w-72 max-w-full" />
          <div className="flex gap-1.5">
            <SkBox className="h-5 w-24" />
            <SkBox className="h-5 w-20" />
          </div>
        </div>
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <SkBox className="h-9 w-32" />
          <SkBox className="h-9 w-24" />
          <SkBox className="h-9 w-9" />
        </div>
      </div>

      <div className="bz-card space-y-3 p-4 sm:p-5">
        <SkBox className="h-5 w-32" />
        <div className="space-y-3 rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-3 sm:p-4">
          <SkBox className="h-11 w-full" />
          <SkBox className="h-9 w-2/3" />
        </div>
      </div>

      <SkBox className="h-4 w-64 max-w-full" />

      <div className="space-y-2">
        <SkBox className="h-5 w-24" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[#EDEDED] bg-white px-3 py-3">
            <SkBox className="h-4 w-2/3" />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <SkBox className="h-5 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[#EDEDED] bg-white px-3 py-3">
            <SkBox className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </SkPageShell>
  );
}
