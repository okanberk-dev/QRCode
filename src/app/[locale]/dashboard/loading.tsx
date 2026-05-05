// §38.59 — Owner panel root skeleton (Next.js segment loading.tsx).
// Tasarım kaynağı a/page-system.jsx Sayfa Anatomisi mock'u: graphite filled
// üst row 3-card + light gray alt row 3-card + header bar + 2 buttons.
// Shell (sidebar + topbar) skeleton kapsamında değil — `loading.tsx` sadece
// children placeholder olarak render edilir; sidebar gerçek render kalır.
export default function DashboardLoading() {
  return (
    <div
      className="mx-auto max-w-[1400px] px-4 sm:px-7 py-6 lg:py-8 space-y-6 animate-in fade-in duration-200"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <span className="sr-only">Yükleniyor…</span>

      {/* PageHeader skeleton — eyebrow + uzun başlık + 2 action button. */}
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="h-2.5 w-20 rounded-sm bg-[#EDEDED] bz-skeleton" />
          <div className="h-7 w-3/5 max-w-[420px] rounded-md bg-[#0A0A0A] bz-skeleton opacity-90" />
          <div className="h-3 w-2/3 max-w-[480px] rounded-sm bg-[#EDEDED] bz-skeleton" />
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <div className="h-8 w-20 rounded-full border border-[#EDEDED] bg-[#FAFAFA] bz-skeleton" />
          <div className="h-8 w-24 rounded-full bg-[#0A0A0A] bz-skeleton opacity-90" />
        </div>
      </div>

      {/* Üst row: 3 graphite filled card (KPI / hero placeholder).
          Tasarımdaki "black filled" card row birebir. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-[88px] rounded-2xl bg-[#0A0A0A] bz-skeleton opacity-90"
          />
        ))}
      </div>

      {/* Alt row: 3 light gray card (chart / list placeholder).
          Her kart içinde küçük bullet + 3 satır placeholder bars. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-[#EDEDED] bg-white p-5 space-y-3"
          >
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[#0A0A0A] bz-skeleton" />
              <div className="h-3 w-24 rounded-sm bg-[#EDEDED] bz-skeleton" />
            </div>
            <div className="space-y-2">
              <div className="h-2.5 w-full rounded-sm bg-[#F2F2F2] bz-skeleton" />
              <div className="h-2.5 w-5/6 rounded-sm bg-[#F2F2F2] bz-skeleton" />
              <div className="h-2.5 w-2/3 rounded-sm bg-[#F2F2F2] bz-skeleton" />
            </div>
          </div>
        ))}
      </div>

      {/* En alt 2-col: large chart placeholder + side rail (activity feed). */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_minmax(0,1fr)] gap-3">
        <div className="rounded-2xl border border-[#EDEDED] bg-white p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-3 w-32 rounded-sm bg-[#EDEDED] bz-skeleton" />
            <div className="h-2 w-16 rounded-sm bg-[#EDEDED] bz-skeleton" />
          </div>
          <div className="h-[180px] rounded-xl bg-[#F2F2F2] bz-skeleton" />
        </div>
        <div className="rounded-2xl border border-[#EDEDED] bg-white p-5 space-y-3">
          <div className="h-3 w-24 rounded-sm bg-[#EDEDED] bz-skeleton" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-full bg-[#0A0A0A] bz-skeleton opacity-80" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 w-3/4 rounded-sm bg-[#F2F2F2] bz-skeleton" />
                <div className="h-2 w-1/2 rounded-sm bg-[#F2F2F2] bz-skeleton" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
