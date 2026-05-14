// §38.59 — Admin panel root skeleton (Next.js segment loading.tsx).
// Fallback for any admin page without its own segment loading.tsx; matches
// the most-common admin layout (`max-w-[1200px] space-y-4 px-4 sm:px-7
// py-6 lg:py-8` — used by /admin/restaurants, /admin/customers, /admin/users,
// /admin/billing, etc.). Pages with different widths (dashboard 1280px,
// reviews 1400px) override this via their own loading.tsx.
export default function AdminLoading() {
  return (
    <div
      className="mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8 space-y-4 animate-in fade-in duration-200"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <span className="sr-only">Yükleniyor…</span>

      {/* PageHeader skeleton */}
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="h-2.5 w-24 rounded-sm bg-[#EDEDED] bz-skeleton" />
          <div className="h-7 w-2/5 max-w-[360px] rounded-md bg-[#0A0A0A] bz-skeleton opacity-90" />
          <div className="h-3 w-1/2 max-w-[400px] rounded-sm bg-[#EDEDED] bz-skeleton" />
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <div className="h-8 w-20 rounded-full border border-[#EDEDED] bg-[#FAFAFA] bz-skeleton" />
          <div className="h-8 w-24 rounded-full bg-[#0A0A0A] bz-skeleton opacity-90" />
        </div>
      </div>

      {/* KPI 4-card row (admin dashboards typically 4-stat grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[88px] rounded-2xl bg-[#0A0A0A] bz-skeleton opacity-90"
          />
        ))}
      </div>

      {/* Table / list placeholder — admin sayfalarının çoğu büyük tablo */}
      <div className="rounded-2xl border border-[#EDEDED] bg-white overflow-hidden">
        <div className="border-b border-[#EDEDED] px-5 py-3 flex items-center justify-between">
          <div className="h-3 w-32 rounded-sm bg-[#EDEDED] bz-skeleton" />
          <div className="h-7 w-24 rounded-md border border-[#EDEDED] bg-[#FAFAFA] bz-skeleton" />
        </div>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="border-b border-[#F2F2F2] last:border-b-0 px-5 py-4 flex items-center gap-4"
          >
            <div className="h-8 w-8 rounded-full bg-[#0A0A0A] bz-skeleton opacity-80 shrink-0" />
            <div className="flex-1 space-y-1.5 min-w-0">
              <div className="h-3 w-1/3 rounded-sm bg-[#F2F2F2] bz-skeleton" />
              <div className="h-2.5 w-1/2 rounded-sm bg-[#F2F2F2] bz-skeleton" />
            </div>
            <div className="hidden sm:block h-3 w-16 rounded-sm bg-[#F2F2F2] bz-skeleton" />
            <div className="hidden md:block h-3 w-20 rounded-sm bg-[#F2F2F2] bz-skeleton" />
            <div className="h-6 w-6 rounded-full bg-[#F2F2F2] bz-skeleton shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
