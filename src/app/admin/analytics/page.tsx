'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Loader2, Star, TrendingUp } from 'lucide-react';
import { useAdminTranslation } from '@/components/admin/AdminTranslationProvider';
import ExportReportButton from '@/components/dashboard/ExportReportButton';

interface StatsResp {
  total?: number;
  avg?: number;
  byRating?: Record<string, number>;
  byPlatform?: Record<string, number>;
}

const PLATFORM_COLORS: Record<string, string> = {
  google: '#4285F4',
  yemeksepeti: '#FA0050',
  getir: '#5D3EBC',
  trendyol_go: '#F27A1A',
  unknown: '#737373',
};

const PLATFORM_LABELS: Record<string, string> = {
  google: 'Google',
  yemeksepeti: 'Yemeksepeti',
  getir: 'Getir',
  trendyol_go: 'Trendyol GO',
  unknown: 'Diğer',
};

export default function AdminAnalyticsPage() {
  const { locale } = useAdminTranslation();
  const isTr = locale === 'tr';
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [stats, setStats] = useState<StatsResp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/feedback/stats?days=${range.replace('d', '')}`);
        if (res.ok) setStats(await res.json());
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, [range]);

  const total = stats?.total ?? 0;
  const avg = stats?.avg ?? 0;
  const nps = (() => {
    if (!stats?.byRating) return 0;
    const sum = Object.values(stats.byRating).reduce((a, b) => a + b, 0) || 1;
    const prom = (stats.byRating['5'] ?? 0) / sum;
    const det = ((stats.byRating['1'] ?? 0) + (stats.byRating['2'] ?? 0)) / sum;
    return Math.round((prom - det) * 100);
  })();

  const ratingRows = [5, 4, 3, 2, 1].map((r) => {
    const count = stats?.byRating?.[String(r)] ?? 0;
    const pct = total === 0 ? 0 : Math.round((count / total) * 100);
    return { r, count, pct };
  });

  const platformRows = Object.entries(stats?.byPlatform ?? {})
    .map(([key, count]) => ({
      key,
      count: count as number,
      label: PLATFORM_LABELS[key] || key,
      color: PLATFORM_COLORS[key] || PLATFORM_COLORS.unknown,
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="pulse-eyebrow text-[#737373]">{isTr ? 'PANEL / ANALİZ' : 'PANEL / ANALYTICS'}</p>
          <h1 className="mt-1 text-[22px] font-medium tracking-tight text-[#0A0A0A]" style={{ fontFamily: 'var(--font-heading)' }}>
            {isTr ? 'Analitik & raporlama' : 'Analytics & reporting'}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-[#EDEDED] bg-white p-0.5">
            {(['7d', '30d', '90d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`pulse-eyebrow rounded-md px-3 py-1.5 transition-colors ${
                  range === r ? 'bg-[#0A0A0A] text-white' : 'text-[#525252] hover:bg-[#F5F5F5]'
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
          <ExportReportButton
            label={isTr ? 'CSV indir' : 'Export CSV'}
            format="csv"
            range={range}
          />
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-[#EDEDED] bg-white p-20 text-[#737373]">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label={isTr ? 'TOPLAM YORUM' : 'TOTAL REVIEWS'}
              value={total.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
              icon={<BarChart3 size={14} />}
            />
            <StatCard
              label={isTr ? 'ORTALAMA PUAN' : 'AVERAGE RATING'}
              value={avg.toFixed(1)}
              icon={<Star size={14} className="fill-[#C6F24E] text-[#C6F24E]" />}
            />
            <StatCard
              label="NPS"
              value={nps.toString()}
              accent={nps >= 50 ? 'lime' : nps >= 0 ? 'neutral' : 'red'}
              icon={<TrendingUp size={14} />}
            />
            <StatCard
              label={isTr ? 'DÖNEM' : 'PERIOD'}
              value={range.toUpperCase()}
              icon={<BarChart3 size={14} />}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-[#EDEDED] bg-white p-5">
              <h2 className="pulse-eyebrow text-[#737373]">{isTr ? 'PUAN DAĞILIMI' : 'RATING DISTRIBUTION'}</h2>
              <div className="mt-4 space-y-2">
                {ratingRows.map((row) => (
                  <div key={row.r} className="flex items-center gap-3">
                    <span className="w-10 text-[13px] font-medium text-[#0A0A0A]">{row.r} ★</span>
                    <div className="relative h-7 flex-1 overflow-hidden rounded-lg bg-[#F5F5F5]">
                      <div
                        className="absolute inset-y-0 left-0 rounded-lg bg-[#C6F24E]"
                        style={{ width: `${row.pct}%` }}
                      />
                    </div>
                    <span className="w-16 text-right text-[12px] text-[#525252]">{row.count} · {row.pct}%</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[#EDEDED] bg-white p-5">
              <h2 className="pulse-eyebrow text-[#737373]">{isTr ? 'PLATFORM DAĞILIMI' : 'PLATFORM SPLIT'}</h2>
              {platformRows.length === 0 ? (
                <p className="mt-6 text-[13px] text-[#737373]">{isTr ? 'Veri yok' : 'No data'}</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {platformRows.map((p) => {
                    const pct = total === 0 ? 0 : Math.round((p.count / total) * 100);
                    return (
                      <div key={p.key} className="flex items-center gap-3">
                        <span className="w-28 truncate text-[13px] font-medium text-[#0A0A0A]">{p.label}</span>
                        <div className="relative h-7 flex-1 overflow-hidden rounded-lg bg-[#F5F5F5]">
                          <div
                            className="absolute inset-y-0 left-0 rounded-lg"
                            style={{ width: `${pct}%`, backgroundColor: p.color }}
                          />
                        </div>
                        <span className="w-16 text-right text-[12px] text-[#525252]">{p.count} · {pct}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <div className="rounded-2xl border border-dashed border-[#EDEDED] bg-[#FAFAFA] p-5 text-[12px] text-[#737373]">
            {isTr
              ? 'Konum performansı & NPS trend grafikleri için backend aggregation eklendikten sonra aktif olacak. Şu an için CSV indir butonuyla dönemsel rapor alabilirsiniz.'
              : 'Location performance & NPS trend charts will activate once backend aggregation lands. For now use the CSV export for period snapshots.'}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  accent?: 'lime' | 'neutral' | 'red';
}) {
  const tone =
    accent === 'lime'
      ? 'bg-[#EAF9B8] text-[#0A0A0A]'
      : accent === 'red'
        ? 'bg-red-50 text-red-700'
        : 'bg-[#F5F5F5] text-[#0A0A0A]';
  return (
    <div className="rounded-2xl border border-[#EDEDED] bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="pulse-eyebrow text-[#737373]">{label}</p>
        {icon && <span className={`flex h-7 w-7 items-center justify-center rounded-full ${tone}`}>{icon}</span>}
      </div>
      <p className="mt-3 text-[28px] font-medium tracking-tight text-[#0A0A0A]" style={{ fontFamily: 'var(--font-heading)' }}>
        {value}
      </p>
    </div>
  );
}
