import { Skeleton, StatCardSkeleton, CardSkeleton } from '@/components/ui';

// §38.75 — Admin dashboard loading skeleton (CLAUDE.md §11.17 content-shape).
// Owner Stage 1 §38.71 + Stage 3 §38.73 paterni admin'e port. Server fetch
// sırasında otomatik mount; root admin/loading.tsx generic fallback yerine
// page-specific anatomi (KPI 4-stat + business growth + plan distribution +
// recently joined + needs attention). CLAUDE.md §11.4 dashboard rewrite ref.

export default function AdminDashboardLoading() {
  return (
    <div
      // Matches `admin/dashboard/page.tsx:328` exactly: `max-w-[1200px] px-4
      // sm:px-7 py-6 lg:py-8 space-y-3.5`. Previously `space-y-6` (24px) caused
      // ~10px CLS per section gap when the real page mounted.
      className="mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8 space-y-3.5 animate-in fade-in duration-200"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <span className="sr-only">Yükleniyor…</span>

      {/* PageHeader skeleton — SUPERADMIN eyebrow + title + description */}
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2 flex-1 min-w-0">
          <Skeleton width={88} height={10} />
          <Skeleton width="36%" height={28} />
          <Skeleton width="58%" height={12} />
        </div>
        <Skeleton width={120} height={36} rounded={999} className="hidden sm:block" />
      </div>

      {/* KPI 4-stat */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* 2-col: business growth chart + plan distribution */}
      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <div className="bz-card p-5 sm:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton width={140} height={13} />
            <Skeleton width={64} height={11} />
          </div>
          <Skeleton height={220} rounded={12} />
        </div>
        <div className="bz-card p-5 space-y-3">
          <Skeleton width={120} height={13} />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Skeleton width="40%" height={11} />
                <Skeleton width={32} height={11} />
              </div>
              <Skeleton height={6} rounded={999} />
            </div>
          ))}
        </div>
      </div>

      {/* 2-col: recently joined + needs attention widgets */}
      <div className="grid gap-3 lg:grid-cols-2">
        <CardSkeleton height={280} />
        <CardSkeleton height={280} />
      </div>
    </div>
  );
}
