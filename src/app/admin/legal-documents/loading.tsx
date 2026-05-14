import { Skeleton, CardSkeleton } from '@/components/ui';

// §40.10 — admin legal-documents loading. Wrapper birebir page.tsx:77
// (`mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8`).

export default function AdminLegalDocumentsLoading() {
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
        <Skeleton width="36%" height={28} />
        <Skeleton width="62%" height={12} />
      </div>

      {/* Locale toggle */}
      <div className="flex items-center gap-2">
        <Skeleton width={64} height={32} rounded={999} />
        <Skeleton width={64} height={32} rounded={999} />
      </div>

      {/* Document type cards (KVKK / Terms / Cookie / DPA, vb.) */}
      <div className="grid gap-3 lg:grid-cols-2">
        <CardSkeleton height={200} />
        <CardSkeleton height={200} />
        <CardSkeleton height={200} />
        <CardSkeleton height={200} />
      </div>
    </div>
  );
}
