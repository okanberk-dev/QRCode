import {
  SkBox,
  SkCardGrid,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';

/**
 * Denetim Merkezi listesi — başlık + sekmeler + kart ızgarası. Sayfa sarmalayıcısı
 * (`max-w-[1440px] space-y-4`) ile birebir aynı (CLS=0, CLAUDE.md §40.10).
 */
export default function Loading() {
  return (
    <SkPageShell max={1440} space={4}>
      <SkPageHeader withActions titleWidth="w-44" />

      <div className="flex gap-2 border-b border-[#EDEDED] pb-3">
        <SkBox className="h-8 w-32" />
        <SkBox className="h-8 w-36" />
      </div>

      <SkCardGrid count={6} cols={3} />
    </SkPageShell>
  );
}
