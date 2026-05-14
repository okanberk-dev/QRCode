import { Skeleton } from "@/components/ui";

// §38.71 — QR segment loading skeleton. Wrapper (max-w/padding/spacing)
// tracks `dashboard/qr/page.tsx:426` exactly (max-w-[1280px], space-y-4,
// px-4 sm:px-7 py-6 lg:py-8). Content shape mirrors the real loaded page:
// PageHeader → filter chip strip → mobile aggregate 3-stat (md:hidden) →
// 3-col QR card grid. The QR generator is a MODAL (not a section), so the
// previous inline form/preview block was a phantom layout that caused a
// massive CLS spike when the real page mounted with grid-only content.

export default function QrLoading() {
  return (
    <div
      className="mx-auto max-w-[1280px] px-4 sm:px-7 py-6 lg:py-8 space-y-4 animate-in fade-in duration-200"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <span className="sr-only">Yükleniyor…</span>

      {/* PageHeader — eyebrow + title + description + 2 actions (Yeni / Grid/List toggle) */}
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2 flex-1 min-w-0">
          <Skeleton width={84} height={10} />
          <Skeleton width="36%" height={28} />
          <Skeleton width="68%" height={12} />
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <Skeleton width={64} height={32} rounded={999} />
          <Skeleton width={96} height={32} rounded={999} />
        </div>
      </div>

      {/* Filter chip strip — branch select + platform select (PulseSelect ~36px) */}
      <div className="flex flex-wrap gap-2">
        <Skeleton width={170} height={36} rounded={10} />
        <Skeleton width={200} height={36} rounded={10} />
      </div>

      {/* Mobile-only aggregate stats (md:hidden 3-col bz-card grid p-3.5) */}
      <div className="md:hidden bz-card grid grid-cols-3 gap-2.5 p-3.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={i ? "border-l border-[#EDEDED] pl-3" : ""}>
            <Skeleton width={48} height={9} />
            <Skeleton width={32} height={18} className="mt-1" />
          </div>
        ))}
      </div>

      {/* 3-col QR card grid — matches grid gap-3.5 grid-cols-1 sm:grid-cols-2
          lg:grid-cols-3. Each card mirrors `QRCard` (bz-card p-[18px] →
          header + 160px preview + platform row + 2-col stats + 2-col actions). */}
      <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bz-card p-[18px] space-y-3.5">
            {/* Header: title + branch + Active badge */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0 space-y-1">
                <Skeleton width="68%" height={15} />
                <Skeleton width="44%" height={11} />
              </div>
              <Skeleton width={56} height={22} rounded={6} />
            </div>
            {/* Inline QR preview — rounded-xl border bg-white p-3 with 160x160 inside */}
            <div className="flex justify-center rounded-xl border border-[#EDEDED] bg-white p-3">
              <Skeleton width={160} height={160} rounded={8} />
            </div>
            {/* Platform binding row — rounded-lg bg-[#FAFAFA] px-2.5 py-2 */}
            <div className="flex items-center gap-2 rounded-lg bg-[#FAFAFA] px-2.5 py-2">
              <Skeleton width={12} height={12} rounded={3} />
              <Skeleton width={16} height={16} rounded={4} />
              <Skeleton width="40%" height={12} />
            </div>
            {/* Stats 2-col: Target + Created */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Skeleton width={48} height={10} />
                <Skeleton width="56%" height={14} />
              </div>
              <div className="space-y-1">
                <Skeleton width={64} height={10} />
                <Skeleton width="68%" height={12} />
              </div>
            </div>
            {/* Action row — border-t pt-3 + 2-col h-10 buttons */}
            <div className="border-t border-[#EDEDED] pt-3 grid grid-cols-2 gap-2">
              <Skeleton height={40} rounded={10} />
              <Skeleton height={40} rounded={10} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
