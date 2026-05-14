import { Skeleton } from "@/components/ui";

// §38.71 — Google Yorumları loading skeleton. Wrapper tracks the real page
// (`dashboard/google-reviews/page.tsx:911`) exactly: `max-w-[1200px] px-4
// sm:px-7 py-6 lg:py-8` — NO outer space-y (page uses scoped mb-5/mb-6/
// mt-6 between sections). Content order: PageHeader → cross-link hint →
// 2-col hero (dark sentiment + KPI grid) → 2-col body (reviews stream + side rail).

export default function GoogleReviewsLoading() {
  return (
    <div
      className="mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8 animate-in fade-in duration-200"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <span className="sr-only">Yükleniyor…</span>

      {/* PageHeader — eyebrow + title + description + 2 actions */}
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2 flex-1 min-w-0">
          <Skeleton width={132} height={10} />
          <Skeleton width="36%" height={32} />
          <Skeleton width="68%" height={12} />
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <Skeleton width={88} height={32} rounded={999} />
          <Skeleton width={132} height={32} rounded={999} />
        </div>
      </div>

      {/* Cross-link hint — mb-5 inline link */}
      <div className="mt-5 mb-5 flex items-center gap-2">
        <Skeleton width={12} height={12} rounded={3} />
        <Skeleton width="48%" height={12} />
      </div>

      {/* 2-col hero — dark sentiment + KPI grid */}
      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        {/* Dark hero card — graphite bg + lime numerals */}
        <div className="rounded-2xl bg-[#0A0A0A] p-6 space-y-4">
          <div className="h-[9px] w-16 rounded-sm bg-white/15 bz-skeleton" />
          <div className="flex items-baseline gap-3">
            <div className="h-[60px] w-[120px] rounded-md bg-white/15 bz-skeleton" />
            <div className="h-3 w-24 rounded-sm bg-white/10 bz-skeleton" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-2 w-6 rounded-sm bg-white/10 bz-skeleton" />
              <div className="flex-1 h-1.5 rounded-full bg-white/10 bz-skeleton" />
              <div className="h-2 w-8 rounded-sm bg-white/10 bz-skeleton" />
            </div>
          ))}
        </div>

        {/* KPI 4-stat grid in white card */}
        <div className="bz-card p-6 grid grid-cols-2 gap-x-6 gap-y-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton width={64} height={9} />
              <Skeleton width="60%" height={26} />
              <Skeleton width={88} height={11} />
            </div>
          ))}
        </div>
      </div>

      {/* Reviews stream + Right rail */}
      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_320px]">
        <section className="bz-card p-0">
          <div className="flex items-center justify-between border-b border-[#EDEDED] px-5 py-4">
            <Skeleton width={140} height={13} />
            <div className="flex items-center gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} width={64} height={28} rounded={999} />
              ))}
            </div>
          </div>
          <div className="divide-y divide-[#EDEDED]">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-5 space-y-2">
                <div className="flex items-center gap-3">
                  <Skeleton width={44} height={44} rounded={999} />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton width="40%" height={13} />
                    <Skeleton width="28%" height={11} />
                  </div>
                  <Skeleton width={72} height={22} rounded={6} />
                </div>
                <Skeleton width="92%" height={11} />
                <Skeleton width="76%" height={11} />
                <div className="flex gap-2 pt-2">
                  <Skeleton width={88} height={28} rounded={999} />
                  <Skeleton width={72} height={28} rounded={999} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bz-card p-5 space-y-3">
              <Skeleton width={88} height={10} />
              <Skeleton width="70%" height={14} />
              <Skeleton height={64} rounded={12} />
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
