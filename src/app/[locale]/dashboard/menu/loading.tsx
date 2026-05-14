import { Skeleton } from '@/components/ui';

// §38.73 — Menu Hub loading skeleton. Single-restaurant owner redirects
// before this page renders (page.tsx:131), so this skeleton targets the
// 2+ restaurant picker case: `max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8
// space-y-6`. Each card mirrors `RestaurantMenuCard` (bz-card with header
// p-4 sm:p-5 → 12x12 logo + title + slug + status badge → 2-col stat strip
// → footer with "Last updated" + edit CTA).

export default function MenuHubLoading() {
  return (
    <div
      className="mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8 space-y-6 animate-in fade-in duration-200"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <span className="sr-only">Yükleniyor…</span>

      {/* PageHeader — eyebrow + title + description + 1 action */}
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2 flex-1 min-w-0">
          <Skeleton width={48} height={10} />
          <Skeleton width="22%" height={32} />
          <Skeleton width="58%" height={12} />
        </div>
        <Skeleton width={120} height={36} rounded={999} className="hidden sm:block" />
      </div>

      {/* Restaurant picker grid — matches gap-4 sm:grid-cols-2 lg:grid-cols-3 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bz-card overflow-hidden">
            {/* Header: 12x12 logo + title + slug + status badge */}
            <div className="flex items-start gap-3 p-4 sm:p-5">
              <Skeleton width={48} height={48} rounded={16} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <Skeleton width="62%" height={15} />
                    <Skeleton width="44%" height={11} />
                  </div>
                  <Skeleton width={64} height={22} rounded={6} />
                </div>
              </div>
            </div>
            {/* 2-col stat strip — gap-px (1px divider) */}
            <div className="grid grid-cols-2 gap-px bg-[#EDEDED]">
              <div className="bg-white px-4 py-3 sm:px-5 space-y-1">
                <Skeleton width={64} height={10} />
                <Skeleton width={32} height={18} />
              </div>
              <div className="bg-white px-4 py-3 sm:px-5 space-y-1">
                <Skeleton width={48} height={10} />
                <Skeleton width={32} height={18} />
              </div>
            </div>
            {/* Footer: "Last updated" + edit CTA */}
            <div className="flex items-center justify-between gap-3 border-t border-[#EDEDED] px-4 py-3 sm:px-5">
              <Skeleton width="48%" height={11} />
              <Skeleton width={92} height={12} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
