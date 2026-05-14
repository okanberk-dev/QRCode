import { Skeleton, CardSkeleton } from '@/components/ui';

// §40.10 — admin profile loading. Wrapper birebir page.tsx:136
// (`mx-auto max-w-[1100px] px-4 sm:px-7 py-6 lg:py-8 space-y-5`).

export default function AdminProfileLoading() {
  return (
    <div
      className="mx-auto max-w-[1100px] space-y-5 px-4 sm:px-7 py-6 lg:py-8 animate-in fade-in duration-200"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <span className="sr-only">Yükleniyor…</span>

      {/* PageHeader */}
      <div className="space-y-2">
        <Skeleton width={48} height={10} />
        <Skeleton width="36%" height={28} />
        <Skeleton width="58%" height={12} />
      </div>

      {/* Identity card */}
      <CardSkeleton height={180} />

      {/* Password / security */}
      <CardSkeleton height={220} />

      {/* Sessions / 2FA */}
      <CardSkeleton height={200} />
    </div>
  );
}
