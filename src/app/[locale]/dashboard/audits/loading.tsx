import {
  SkBox,
  SkCardGrid,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Denetim Merkezi listesi — başlık + tek araç çubuğu (sekme segmenti + süzgeç)
 * + kart ızgarası. Sayfa sarmalayıcısı (`max-w-[1440px] space-y-4`) ile birebir
 * aynı (CLS=0, CLAUDE.md §40.10).
 */
export default function Loading() {
  return (
    <SkPageShell max={1440} space={4}>
      <SkPageHeader withActions titleWidth="w-44" />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <SkBox className="h-[50px] w-full max-w-[300px] rounded-[10px] sm:h-9 sm:w-[300px]" />
        <SkBox className="h-11 w-full rounded-lg sm:h-9 sm:w-[260px]" />
      </div>

      <SkCardGrid count={6} cols={3} />
    </SkPageShell>
  );
}
