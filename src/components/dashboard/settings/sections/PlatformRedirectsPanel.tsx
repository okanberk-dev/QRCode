"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Loader2, RefreshCw, Send } from "lucide-react";
import {
  AlertBanner,
  Eyebrow,
  PlatformChip,
  type PlatformId,
  PLATFORMS,
} from "@/components/ui";
import { SettingsCard } from "../SettingsCard";

// CLAUDE.md §19.4.2 + §23.7 Phase 11.24 — owner panel "Platform Yönlendirmeleri"
// section. Müşteri /r/[slug]'da yıldız verip dış platforma yönlendirildiğinde
// kayıt edilen `PlatformRedirectEvent`'ları aggregate gösterir.
//
// Veri kaynağı: GET /api/restaurants/[id]/redirect-stats?range=7d|30d|all
// (CLAUDE.md §19.4.2). IDOR + Promise.all aggregate.
//
// Range toggle: 7d / 30d / All. Top stat 7d + 30d sabit (toggle'dan bağımsız —
// owner gözle hızlı kıyaslayabilsin). Provider breakdown range'e göre.

interface PlatformRedirectsPanelProps {
  restaurantId: string;
  locale: "tr" | "en";
}

interface ProviderCount {
  provider: string;
  count: number;
}

interface RedirectStats {
  range: string;
  totals: { last7Days: number; last30Days: number };
  byProvider: ProviderCount[];
  topProvider: string | null;
  windowStart: string | null;
  windowEnd: string;
}

type Range = "7d" | "30d" | "all";

const STORAGE_TO_UI: Record<string, PlatformId> = {
  google: "google",
  yemeksepeti: "yemeksepeti",
  getir: "getir",
  trendyol_go: "trendyol",
  tripadvisor: "tripadvisor",
  airbnb: "airbnb",
  booking: "booking",
  yandex: "yandex",
};

export function PlatformRedirectsPanel({
  restaurantId,
  locale,
}: PlatformRedirectsPanelProps) {
  const isTr = locale === "tr";
  const [range, setRange] = useState<Range>("7d");
  const [stats, setStats] = useState<RedirectStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useMemo(
    () => async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/restaurants/${restaurantId}/redirect-stats?range=${range}`,
          { signal },
        );
        if (!res.ok) {
          throw new Error(
            isTr ? "İstatistikler yüklenemedi." : "Failed to load stats.",
          );
        }
        const data = (await res.json()) as RedirectStats;
        setStats(data);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(
          err instanceof Error
            ? err.message
            : isTr
              ? "Bağlantı hatası."
              : "Connection error.",
        );
      } finally {
        setLoading(false);
      }
    },
    [restaurantId, range, isTr],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const totalInRange = stats?.byProvider.reduce((sum, p) => sum + p.count, 0) ?? 0;
  const max = stats?.byProvider[0]?.count ?? 0;
  const topProviderUi = stats?.topProvider
    ? STORAGE_TO_UI[stats.topProvider]
    : null;

  return (
    <SettingsCard
      icon={<Send size={18} />}
      title={isTr ? "Platform Yönlendirmeleri" : "Platform Redirects"}
      description={
        isTr
          ? "Müşteriler yüksek puan verdiğinde hangi platforma yönlendirildiğini takip edin."
          : "Track which platforms customers are sent to after high ratings."
      }
      actions={
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="bz-btn-icon"
          aria-label={isTr ? "Yenile" : "Refresh"}
          title={isTr ? "Yenile" : "Refresh"}
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
        </button>
      }
    >
      <div className="space-y-4">
        {error && <AlertBanner kind="danger">{error}</AlertBanner>}

        {/* Top stats: 7d + 30d + Top platform — toggle'dan bağımsız sabit */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile
            label={isTr ? "Son 7 gün" : "Last 7 days"}
            value={stats?.totals.last7Days ?? 0}
            loading={loading && !stats}
          />
          <StatTile
            label={isTr ? "Son 30 gün" : "Last 30 days"}
            value={stats?.totals.last30Days ?? 0}
            loading={loading && !stats}
          />
          <div className="rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-4 sm:p-5 col-span-2 sm:col-span-1">
            <Eyebrow className="mb-2">
              {isTr ? "Lider platform" : "Top platform"}
            </Eyebrow>
            {loading && !stats ? (
              // Mirrors the loaded row exactly: 28x28 platform chip +
              // bz-h-tight text-[15px] label, gap-2 inline-flex.
              <div className="flex items-center gap-2">
                <div className="bz-skeleton h-7 w-7 rounded-lg shrink-0" />
                <div className="bz-skeleton h-[15px] w-24 rounded" />
              </div>
            ) : topProviderUi ? (
              <div className="flex items-center gap-2">
                <PlatformChip id={topProviderUi} size={28} />
                <span className="bz-h-tight text-[15px]">
                  {PLATFORMS[topProviderUi].label}
                </span>
              </div>
            ) : (
              <span className="text-[13px] text-[#737373]">
                {isTr ? "Henüz veri yok" : "No data yet"}
              </span>
            )}
          </div>
        </div>

        {/* Range toggle */}
        <div className="flex items-center gap-1 rounded-full border border-[#EDEDED] bg-[#FAFAFA] p-1 self-start w-fit">
          {(["7d", "30d", "all"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              aria-pressed={range === r}
              className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors"
              style={{
                background: range === r ? "#0A0A0A" : "transparent",
                color: range === r ? "#fff" : "#525252",
              }}
            >
              {r === "7d"
                ? isTr
                  ? "7 gün"
                  : "7 days"
                : r === "30d"
                  ? isTr
                    ? "30 gün"
                    : "30 days"
                  : isTr
                    ? "Tümü"
                    : "All"}
            </button>
          ))}
        </div>

        {/* Provider breakdown */}
        {!stats || stats.byProvider.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#EDEDED] bg-[#FAFAFA] p-6 text-center text-[13px] text-[#737373]">
            <ArrowUpRight size={20} className="mx-auto mb-2 opacity-60" />
            {loading
              ? isTr
                ? "Yükleniyor…"
                : "Loading…"
              : isTr
                ? "Bu aralıkta yönlendirme yok. Müşteriler yüksek puan verdiğinde burada görünür."
                : "No redirects in this range. They appear here once customers leave high ratings."}
          </div>
        ) : (
          <div className="space-y-2">
            {stats.byProvider.map((row) => {
              const uiKey = STORAGE_TO_UI[row.provider];
              const label = uiKey
                ? PLATFORMS[uiKey].label
                : row.provider;
              const pct = max > 0 ? Math.round((row.count / max) * 100) : 0;
              const sharePct =
                totalInRange > 0
                  ? Math.round((row.count / totalInRange) * 100)
                  : 0;
              return (
                <div
                  key={row.provider}
                  className="flex items-center gap-3 rounded-xl border border-[#EDEDED] bg-white px-3 py-2.5"
                >
                  <div className="shrink-0">
                    {uiKey ? (
                      <PlatformChip id={uiKey} size={28} />
                    ) : (
                      <span
                        aria-hidden
                        className="inline-block w-7 h-7 rounded-md bg-[#F5F5F5]"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="bz-h-tight text-[13px] truncate">
                        {label}
                      </span>
                      <span className="bz-mono text-[12px] text-[#525252] shrink-0">
                        {row.count} · %{sharePct}
                      </span>
                    </div>
                    <div
                      className="mt-1.5 h-1.5 rounded-full bg-[#F5F5F5] overflow-hidden"
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="h-full rounded-full bg-[#C6F24E] transition-[width] duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SettingsCard>
  );
}

function StatTile({
  label,
  value,
  loading,
}: {
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-4 sm:p-5">
      <Eyebrow className="mb-2">{label}</Eyebrow>
      {loading ? (
        // Skeleton height tracks the loaded value's `fontSize: 28 *
        // lineHeight: 1.05 ≈ 29-30px` so the tile keeps the same total
        // height during loading → loaded transition (CLS = 0).
        <div className="bz-skeleton h-[29px] w-20 rounded" />
      ) : (
        <div
          className="bz-h-tight"
          style={{
            fontSize: 28,
            lineHeight: 1.05,
            fontFamily: "var(--font-mono)",
            fontWeight: 600,
          }}
        >
          {value.toLocaleString()}
        </div>
      )}
    </div>
  );
}

export default PlatformRedirectsPanel;
