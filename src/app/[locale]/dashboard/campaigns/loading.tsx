// CLAUDE.md §38.99 — Owner campaigns content-shape skeleton (CLAUDE.md §11.17).

import { StatCardSkeleton, Skeleton } from '@/components/ui';

export default function CampaignsLoading() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8 space-y-5">
      {/* PageHeader skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-3 w-72" />
      </div>

      {/* KPI grid 4-stat */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Filter chip strip */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Skeleton className="h-7 w-12 rounded-full" />
        <Skeleton className="h-7 w-16 rounded-full" />
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-16 rounded-full" />
      </div>

      {/* List card skeleton */}
      <div className="bz-card p-0 overflow-hidden">
        <div className="divide-y divide-[#EDEDED]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-3">
              <div className="flex-1 space-y-1.5 min-w-0">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
