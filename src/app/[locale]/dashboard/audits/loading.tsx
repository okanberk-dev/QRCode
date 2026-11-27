import { SkBox, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';

/**
 * Denetim Merkezi listesi — başlık ("Yeni denetim" mobilde başlığın altında) +
 * tek araç çubuğu (sekme segmenti; arama / süzgeç yalnız 8+ denetimde ya da dolu
 * katalogda görünür) + denetim kartı ızgarası. Sayfa sarmalayıcısı
 * (`max-w-[1440px] space-y-4`) ve bölüm yükseklikleri gerçek sayfayla aynı
 * (CLS=0, CLAUDE.md §40.10).
 */
export default function Loading() {
  return (
    <SkPageShell max={1440} space={4}>
      {/* PageHeader ile aynı kalıp: mobilde eylem başlığın altında. */}
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end md:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex h-[23px] items-center">
            <SkBox className="h-3 w-24" />
          </div>
          <div className="mt-1 flex h-[26px] items-center sm:h-[33px]">
            <SkBox className="h-6 w-44 sm:h-7" />
          </div>
          <div className="mt-2 flex h-10 flex-col justify-center gap-2 sm:h-5">
            <SkBox className="h-3.5 w-full max-w-[460px]" />
            <SkBox className="h-3.5 w-24 sm:hidden" />
          </div>
        </div>
        <SkBox className="h-11 w-[132px] shrink-0 sm:h-10" />
      </div>

      {/* Araç çubuğu: sekmeler. İkinci öğe (arama / süzgeç) çoğu durumda yok;
          mobilde yer ayırmak kartları ~52px zıplatırdı. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <SkBox className="h-[50px] w-full rounded-[10px] sm:h-[38px] sm:w-[251px]" />
        <SkBox className="hidden h-[38px] w-[260px] rounded-[14px] sm:block" />
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="bz-card flex h-full flex-col gap-3 p-4">
            <div>
              <div className="flex h-[22px] items-center">
                <SkBox className="h-4 w-44 max-w-full" />
              </div>
              <div className="mt-2 flex gap-1.5">
                <SkBox className="h-[22px] w-24" />
                <SkBox className="h-[22px] w-20" />
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="flex h-5 items-center">
                <SkBox className="h-3 w-32" />
              </div>
              <div className="flex h-[18px] items-center">
                <SkBox className="h-3 w-24" />
              </div>
            </div>
            <div className="mt-auto flex items-center gap-2 pt-1">
              <SkBox className="h-11 w-40 sm:h-10" />
              <SkBox className="ml-auto h-11 w-11 sm:h-9 sm:w-9" />
            </div>
          </li>
        ))}
      </ul>
    </SkPageShell>
  );
}
