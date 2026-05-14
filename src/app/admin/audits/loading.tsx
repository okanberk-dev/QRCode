import { Skeleton, CardSkeleton } from '@/components/ui';

// §40.10 — admin audits hub loading. Wrapper birebir page.tsx:46
// (`mx-auto max-w-[1200px] space-y-5 px-4 sm:px-7 py-6 lg:py-8`).

export default function AdminAuditsLoading() {
  return (
    <div
      className="mx-auto max-w-[1200px] space-y-5 px-4 sm:px-7 py-6 lg:py-8 animate-in fade-in duration-200"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <span className="sr-only">Yükleniyor…</span>

      {/* PageHeader */}
      <div className="space-y-2">
        <Skeleton width={88} height={10} />
        <Skeleton width="40%" height={28} />
        <Skeleton width="62%" height={12} />
      </div>

      {/* 3-card grid (Şablonlar / Kategoriler / İstatistikler) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <CardSkeleton height={200} />
        <CardSkeleton height={200} />
        <CardSkeleton height={200} />
      </div>

      {/* Quick start tip card */}
      <CardSkeleton height={140} />
    </div>
  );
}
