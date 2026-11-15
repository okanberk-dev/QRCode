'use client';

// Stage A5 §38.97 — cross-workspace BI section.
//
// Mount: /admin/analytics page sonu (sm:hidden olmadan, sadece desktop +
// tablet'ta görünür — mobile owner-relevant değil). 4 chart + kurulum hunisi:
//   1. MRR trend AreaChart (last N month, plan-stacked)
//   2. Churn rate BarChart (last N month, ratePct line + churned count bar)
//   3. NPS distribution PieChart (promoters / passives / detractors)
//   4. Cohort retention BarChart (last N month signup, retainedActive +
//      retainedTrial stacked)
//   5. Setup funnel (signup → business → QR → first rating, from DB rows)
//
// Filter: dateRange chip (30d/90d/1y) + Export CSV button.
// Server fetch: /api/admin/analytics/bi.

import { useEffect, useState } from 'react';
import { Download, Loader2, TrendingDown, TrendingUp, Users } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Eyebrow } from '@/components/ui';

type Range = '30d' | '90d' | '1y';

interface MrrPoint {
  month: string;
  total: number;
  byPlan: Record<string, number>;
}
interface ChurnPoint {
  month: string;
  churned: number;
  active: number;
  ratePct: number;
}
interface NpsBucket {
  promoters: number;
  passives: number;
  detractors: number;
  total: number;
  score: number;
  /** Window length in days (older cached snapshots may omit it). */
  windowDays?: number;
}
interface CohortPoint {
  cohortMonth: string;
  signups: number;
  retainedActive: number;
  retainedTrial: number;
  retentionPct: number;
}

interface FunnelStep {
  key: 'signup' | 'business' | 'qr' | 'feedback';
  label: string;
  count: number;
  pctOfSignups: number;
}

interface BiSnapshot {
  range: Range;
  months: number;
  mrr: MrrPoint[];
  churn: ChurnPoint[];
  nps: NpsBucket;
  cohort: CohortPoint[];
  /** Setup funnel (src/lib/activation-funnel.ts). */
  funnel: { windowDays: number; steps: FunnelStep[] };
  generatedAt: string;
}

const RANGE_LABELS: Record<Range, string> = {
  '30d': '30G',
  '90d': '90G',
  '1y': '1Y',
};

// Tier palette — stacked area order follows the snapshot keys (tier sort
// order from the server), `other` = paid subscriptions without a tier link.
const TIER_AREA_COLORS = ['#0A0A0A', '#525252', '#A3A3A3', '#C6F24E', '#737373', '#D4D4D4'];

const NPS_PIE_COLORS = {
  promoters: '#A8D62E',
  passives: '#A3A3A3',
  detractors: '#FB7185',
};

type MrrFlatRow = { month: string; total: number } & Record<string, number | string>;

/** Stable tier key order across the whole window (first appearance wins). */
function mrrPlanKeys(rows: MrrPoint[]): string[] {
  const keys: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row.byPlan)) {
      if (!keys.includes(key)) keys.push(key);
    }
  }
  // Untiered revenue last so tier stacks stay at the bottom.
  return [...keys.filter((k) => k !== 'other'), ...keys.filter((k) => k === 'other')];
}

function mrrPlanLabel(key: string): string {
  if (key === 'other') return 'Diğer';
  return key.charAt(0).toLocaleUpperCase('tr-TR') + key.slice(1);
}

function flattenMrr(rows: MrrPoint[], keys: string[]): MrrFlatRow[] {
  return rows.map((r) => {
    const flat: MrrFlatRow = { month: r.month, total: r.total };
    for (const key of keys) flat[key] = r.byPlan[key] || 0;
    return flat;
  });
}

function formatUsd(value: number): string {
  const whole = Math.abs(value - Math.round(value)) < 0.005;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(value);
}

export function AdminBiSection() {
  const [range, setRange] = useState<Range>('90d');
  const [snapshot, setSnapshot] = useState<BiSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/analytics/bi?range=${range}`);
        if (cancelled) return;
        if (res.status === 403) {
          setError('Bu görünümü açma yetkiniz yok.');
          setSnapshot(null);
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as BiSnapshot;
        setSnapshot(data);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'unknown');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [range]);

  const handleExport = () => {
    window.location.href = `/api/admin/analytics/bi/export?range=${range}`;
  };

  const mrrKeys = snapshot ? mrrPlanKeys(snapshot.mrr) : [];

  return (
    <section className="hidden sm:block mt-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EDEDED] pt-6">
        <div>
          <Eyebrow color="#525252">TÜM İŞLETMELER</Eyebrow>
          <h2 className="bz-h-tight mt-1 text-[18px]">İş zekası göstergeleri</h2>
          <p className="mt-1 text-[12px] text-[#737373]">
            Aylık gelir, kayıp oranı, NPS, kayıt kohortları ve kurulum hunisi — tüm
            işletmelerin toplamı. Bu bölüm kendi tarih aralığını kullanır.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="grid grid-cols-3 rounded-lg border border-[#EDEDED] bg-white p-0.5">
            {(['30d', '90d', '1y'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`pulse-eyebrow rounded-md px-3 py-1.5 transition-colors ${
                  range === r ? 'bg-[#0A0A0A] text-white' : 'text-[#525252] hover:bg-[#F5F5F5]'
                }`}
                aria-pressed={range === r}
              >
                {RANGE_LABELS[r]}
              </button>
            ))}
          </div>
          <button
            onClick={handleExport}
            className="bz-btn-ghost"
            disabled={loading || !snapshot}
            title="CSV indir"
          >
            <Download size={14} strokeWidth={2} />
            CSV
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center rounded-2xl border border-[#EDEDED] bg-white p-12 text-[#737373]">
          <Loader2 size={20} className="animate-spin" />
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-[12px] text-[#991B1B]">
          {error}
        </div>
      )}

      {snapshot && !loading && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* 1. MRR TREND — area chart, tier stacked (USD, §15.2 canonical billing) */}
          <div className="bz-card p-5">
            <div className="flex items-center justify-between gap-2">
              <Eyebrow>MRR TRENDİ</Eyebrow>
              <span className="bz-mono text-[10px] text-[#737373]">
                {formatUsd(snapshot.mrr[snapshot.mrr.length - 1]?.total ?? 0)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[#737373]">
              Son {snapshot.months} ay · tahmini, aktif aboneliklerin paket fiyatlarından (USD)
            </p>
            {mrrKeys.length === 0 ? (
              <div className="mt-4 flex h-[200px] w-full items-center justify-center text-[12px] text-[#737373]">
                Henüz gelir yok
              </div>
            ) : (
              <div className="mt-4 h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={flattenMrr(snapshot.mrr, mrrKeys)} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#F5F5F5" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10, fill: '#737373' }}
                      axisLine={{ stroke: '#EDEDED' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#737373' }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                      tickFormatter={(v) => `$${Number(v ?? 0).toLocaleString('en-US')}`}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #EDEDED' }}
                      formatter={(v, name) => [formatUsd(Number(v ?? 0)), mrrPlanLabel(String(name ?? ''))]}
                    />
                    {mrrKeys.map((key, i) => (
                      <Area
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stackId="1"
                        stroke={TIER_AREA_COLORS[i % TIER_AREA_COLORS.length]}
                        fill={TIER_AREA_COLORS[i % TIER_AREA_COLORS.length]}
                        fillOpacity={0.7}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* 2. CHURN RATE — bar chart, churned + ratePct */}
          <div className="bz-card p-5">
            <div className="flex items-center justify-between gap-2">
              <Eyebrow>KAYIP ORANI</Eyebrow>
              {snapshot.churn.length > 0 && (
                <span className="bz-mono inline-flex items-center gap-1 text-[10px]">
                  {snapshot.churn[snapshot.churn.length - 1].ratePct >= 5 ? (
                    <TrendingUp size={11} className="text-[#FB7185]" />
                  ) : (
                    <TrendingDown size={11} className="text-[#A8D62E]" />
                  )}
                  %{snapshot.churn[snapshot.churn.length - 1].ratePct}
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] text-[#737373]">Aylık pasifleşen / aktif</p>
            <div className="mt-4 h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={snapshot.churn} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#F5F5F5" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: '#737373' }}
                    axisLine={{ stroke: '#EDEDED' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#737373' }}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #EDEDED' }}
                    formatter={(v, name) => {
                      const numericV = typeof v === 'number' ? v : Number(v ?? 0);
                      const labelName = String(name ?? '');
                      if (labelName === 'ratePct') return [`%${numericV}`, 'Oran'];
                      if (labelName === 'churned') return [numericV, 'Pasifleşen'];
                      return [numericV, labelName];
                    }}
                  />
                  <Bar dataKey="churned" fill="#FB7185" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 3. NPS — pie chart */}
          <div className="bz-card p-5">
            <div className="flex items-center justify-between gap-2">
              <Eyebrow>NPS DAĞILIMI</Eyebrow>
              <span className="bz-mono text-[10px] text-[#737373]">
                Skor: {snapshot.nps.score}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[#737373]">
              {snapshot.nps.windowDays ? `Son ${snapshot.nps.windowDays} gün · ` : ''}
              {snapshot.nps.total} yorum · tüm işletmeler
            </p>
            {snapshot.nps.total === 0 ? (
              <p className="mt-12 text-center text-[12px] text-[#737373]">Veri yok</p>
            ) : (
              <div className="mt-4 h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Destekçi (5★)', value: snapshot.nps.promoters, color: NPS_PIE_COLORS.promoters },
                        { name: 'Nötr (4★)', value: snapshot.nps.passives, color: NPS_PIE_COLORS.passives },
                        { name: 'Eleştiren (1-3★)', value: snapshot.nps.detractors, color: NPS_PIE_COLORS.detractors },
                      ]}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      innerRadius={40}
                    >
                      <Cell fill={NPS_PIE_COLORS.promoters} />
                      <Cell fill={NPS_PIE_COLORS.passives} />
                      <Cell fill={NPS_PIE_COLORS.detractors} />
                    </Pie>
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #EDEDED' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* 4. COHORT RETENTION — bar chart stacked */}
          <div className="bz-card p-5">
            <div className="flex items-center justify-between gap-2">
              <Eyebrow>KOHORT ELDE TUTMA</Eyebrow>
              <span className="bz-mono inline-flex items-center gap-1 text-[10px] text-[#737373]">
                <Users size={11} />
                {snapshot.cohort.reduce((acc, p) => acc + p.signups, 0)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[#737373]">Kayıt ayına göre, bugün hâlâ aktif veya denemede olanlar</p>
            <div className="mt-4 h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={snapshot.cohort} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#F5F5F5" vertical={false} />
                  <XAxis
                    dataKey="cohortMonth"
                    tick={{ fontSize: 10, fill: '#737373' }}
                    axisLine={{ stroke: '#EDEDED' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#737373' }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #EDEDED' }}
                  />
                  <Bar dataKey="retainedActive" stackId="a" fill="#0A0A0A" name="Aktif" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="retainedTrial" stackId="a" fill="#C6F24E" name="Deneme" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 5. SETUP FUNNEL — signup → business → QR → first rating, from
              database rows (no tracking script, so no consent or ad-blocker
              gaps). Same step definitions as the owner setup checklist. */}
          <div className="bz-card p-5 lg:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <Eyebrow>KURULUM HUNİSİ</Eyebrow>
              <span className="bz-mono inline-flex items-center gap-1 text-[10px] text-[#737373]">
                <Users size={11} />
                {snapshot.funnel.steps[0]?.count ?? 0}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[#737373]">
              Son {snapshot.funnel.windowDays} günde kaydolan işletme sahipleri, bugüne kadar
              hangi adıma ulaştı. Yeni kaydolanların bir kısmı henüz başındadır.
            </p>
            {(snapshot.funnel.steps[0]?.count ?? 0) === 0 ? (
              <p className="mt-6 text-center text-[12px] text-[#737373]">
                Bu dönemde yeni kayıt yok
              </p>
            ) : (
              <ol className="mt-4 space-y-3">
                {snapshot.funnel.steps.map((step, i) => {
                  const prev = i > 0 ? snapshot.funnel.steps[i - 1].count : null;
                  const stepRate =
                    prev && prev > 0 ? Math.round((step.count / prev) * 1000) / 10 : null;
                  return (
                    <li key={step.key} className="grid grid-cols-[180px_1fr_auto] items-center gap-3">
                      <span className="text-[12px] text-[#1A1A1A]">
                        {step.label}
                        {stepRate !== null && (
                          <span className="block text-[10px] text-[#737373]">
                            önceki adımdan geçiş: %{stepRate}
                          </span>
                        )}
                      </span>
                      <div
                        className="h-2.5 overflow-hidden rounded-full bg-[#F5F5F5]"
                        role="img"
                        aria-label={`${step.label}: kaydolanların %${step.pctOfSignups}'i`}
                      >
                        <div
                          className="h-full rounded-full bg-[#0A0A0A]"
                          style={{ width: `${Math.min(100, step.pctOfSignups)}%` }}
                        />
                      </div>
                      <span className="bz-mono w-[88px] text-right text-[11px] text-[#525252]">
                        {step.count} · %{step.pctOfSignups}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default AdminBiSection;
