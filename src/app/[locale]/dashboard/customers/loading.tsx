import { PageHeader, StatCardSkeleton, TableSkeleton, CardSkeleton, Skeleton } from "@/components/ui";

// §38.40 — Owner Customers loading skeleton (Next.js segment-bazlı loading.tsx
// convention). Server component fetch sırasında otomatik mount → "yükleniyor"
// spinner yerine content-shape placeholder. CLAUDE.md §11.17 paterni reuse.

export default function CustomersLoading() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="CRM"
        title="Müşteriler"
        description="Yorum bırakan müşterilerin tek listesi — e-posta veya telefonla iletişime geçilebilir."
      />

      {/* 4-stat KPI grid skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Toolbar skeleton */}
      <CardSkeleton height={56} />

      {/* Tablo skeleton — desktop */}
      <div className="hidden lg:block">
        <TableSkeleton rows={6} cols={6} />
      </div>

      {/* Mobile card list skeleton */}
      <div className="grid gap-3 lg:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bz-card p-4 space-y-2.5">
            <div className="flex items-start gap-3">
              <Skeleton width={36} height={36} rounded={999} />
              <div className="flex-1">
                <Skeleton height={14} width="60%" />
                <Skeleton height={11} width="40%" className="mt-1.5" />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Skeleton width={70} height={20} rounded={999} />
              <Skeleton width={60} height={11} />
            </div>
            <div className="border-t border-[#EDEDED] pt-2">
              <Skeleton height={11} width="50%" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
