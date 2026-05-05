import { Skeleton } from "@/components/ui";

// §38.71 — Google Yorumları segment loading skeleton.
// Tasarım §38.55: 2-col Hero (graphite dark) + KPI grid + 1fr/320 sağ rail
// (Reviews stream + PROFİL/KEYWORDS/QUICK). Apple-premium content-shape.

export default function GoogleReviewsLoading() {
  return (
    <div
      className="mx-auto max-w-[1280px] px-4 sm:px-7 py-6 lg:py-8 space-y-6 animate-in fade-in duration-200"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <span className="sr-only">Yükleniyor…</span>

      {/* PageHeader skeleton */}
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2 flex-1 min-w-0">
          <Skeleton width={72} height={10} />
          <Skeleton width="40%" height={32} />
          <Skeleton width="60%" height={12} />
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <Skeleton width={88} height={32} rounded={999} />
          <Skeleton width={104} height={32} rounded={999} />
        </div>
      </div>

      {/* Hero + KPI 2-col */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Dark hero card */}
        <div className="rounded-2xl bg-[#0A0A0A] p-6 space-y-4">
          <Skeleton width={64} height={9} className="opacity-40" />
          <div className="flex items-baseline gap-3">
            <div className="h-[60px] w-[120px] rounded-md bg-white/15 bz-skeleton" />
            <Skeleton width={120} height={14} className="opacity-30" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-2 w-6 rounded-sm bg-white/10 bz-skeleton" />
              <div className="flex-1 h-1.5 rounded-full bg-white/10 bz-skeleton" />
              <div className="h-2 w-8 rounded-sm bg-white/10 bz-skeleton" />
            </div>
          ))}
        </div>

        {/* KPI 4-card grid */}
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
      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
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
                  <Skeleton width={72} height={20} rounded={999} />
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
