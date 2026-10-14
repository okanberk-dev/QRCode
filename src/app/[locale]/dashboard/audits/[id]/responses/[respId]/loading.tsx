import { SkBox, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Yanıt incelemesi — geri bağlantısı + başlık + puan kutuları + madde kartları +
 * not kartı. Sayfa sarmalayıcısı (`max-w-[920px] space-y-4`) ile birebir aynı
 * (CLS=0, CLAUDE.md §40.10).
 */
export default function Loading() {
  return (
    <SkPageShell max={920} space={4}>
      <SkBox className="h-3 w-28" />

      <div className="space-y-3">
        <SkBox className="h-3 w-24" />
        <SkBox className="h-9 w-64 max-w-full" />
        <SkBox className="h-4 w-72 max-w-full" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bz-card space-y-3 p-3">
            <SkBox className="h-3 w-14" />
            <SkBox className="h-7 w-16" />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <SkBox className="h-5 w-32" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bz-card space-y-2 p-3">
            <SkBox className="h-4 w-3/4" />
            <SkBox className="h-3 w-1/2" />
            <SkBox className="h-4 w-1/3" />
          </div>
        ))}
      </div>

      <div className="bz-card space-y-3 p-4">
        <SkBox className="h-3 w-56" />
        <SkBox className="h-20 w-full" />
        <div className="flex justify-end">
          <SkBox className="h-9 w-24" />
        </div>
      </div>
    </SkPageShell>
  );
}
