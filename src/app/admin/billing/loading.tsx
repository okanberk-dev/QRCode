import { Skeleton, StatCardSkeleton, CardSkeleton, TableSkeleton } from '@/components/ui';

// §40.10 — admin billing loading. Wrapper birebir page.tsx:64
// (`mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8 space-y-4`).

export default function AdminBillingLoading() {
  return (
    <div
      className="mx-auto max-w-[1200px] space-y-4 px-4 sm:px-7 py-6 lg:py-8 animate-in fade-in duration-200"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <span className="sr-only">Yükleniyor…</span>

      {/* PageHeader */}
      <div className="space-y-2">
        <Skeleton width={56} height={10} />
        <Skeleton width="28%" height={28} />
        <Skeleton width="58%" height={12} />
      </div>

      {/* 4-stat KPI (revenue / MRR / paying / churn) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Payment methods + Iyzico stub */}
      <CardSkeleton height={180} />

      {/* Invoices table */}
      <div className="hidden lg:block">
        <TableSkeleton rows={6} cols={5} />
      </div>
      <div className="grid gap-3 lg:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bz-card p-4 space-y-2">
            <Skeleton width="50%" height={13} />
            <Skeleton width="38%" height={11} />
            <Skeleton width={72} height={22} rounded={6} />
          </div>
        ))}
      </div>
    </div>
  );
}
