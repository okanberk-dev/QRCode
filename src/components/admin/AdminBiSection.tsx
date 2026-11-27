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
  '30d': '30 gün',
  '90d': '90 gün',
  '1y': '1 yıl',
};

// Tier palette — stacked area order follows the snapshot keys (tier sort
// order from the server), `other` = paid subscriptions without a tier link.
const TIER_AREA_COLORS = ['#78FC90', '#111110', '#111110', '#CDEFD6', '#737373', '#C4C4C8'];

const NPS_PIE_COLORS = {
  promoters: '#78FC90',
  passives: '#CDEFD6',
  detractors: '#F04438',
};

/** Shared recharts axis / grid props (Fintora: grey 12px ticks, dashed grid, no axis lines). */
const AXIS_TICK = { fontSize: 12, fill: '#9A9A9A' };

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
    <section className="hidden sm:block mt-6 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3 pt-2">
        <div className="min-w-0">
          <h2 className="text-[24px] font-medium leading-tight tracking-[-0.02em] text-pn-ink">İş zekası göstergeleri</h2>
          <p className="mt-1.5 max-w-[640px] text-[13px] text-[#9A9A9A]">
            Tüm işletmeler · aylık gelir, kayıp oranı, NPS, kayıt kohortları ve kurulum hunisi.
            Bu bölüm kendi tarih aralığını kullanır.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="BI tarih aralığı" className="inline-flex gap-0.5 rounded-full bg-white p-1">
            {(['30d', '90d', '1y'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`min-h-[36px] rounded-full px-3.5 text-[13px] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent ${
                  range === r ? 'bg-pn-accent text-white' : 'text-[#737373] hover:text-pn-ink'
                }`}
                aria-pressed={range === r}
              >
                {RANGE_LABELS[r]}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="bz-btn-ghost inline-flex items-center gap-1.5"
            disabled={loading || !snapshot}
            title="CSV indir"
          >
            <Download size={16} aria-hidden="true" />
            CSV
          </button>
        </div>
      </div>

      {loading && (
        <div className="bz-card flex items-center justify-center p-12 text-[#9A9A9A]">
          <Loader2 size={20} className="animate-spin" />
        </div>
      )}

      {error && !loading && (
        <div className="rounded-[20px] bg-[#FDECEC] px-[18px] py-[14px] text-[14px] text-[#B42318]">
          {error}
        </div>
      )}

      {snapshot && !loading && (
        <div className="grid gap-2.5 lg:grid-cols-2">
          {/* 1. MRR TREND — area chart, tier stacked (USD, §15.2 canonical billing) */}
          <div className="bz-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h3 className="pn-card-title text-pn-ink">MRR trendi</h3>
              <span className="pn-change pn-change--flat">
                {formatUsd(snapshot.mrr[snapshot.mrr.length - 1]?.total ?? 0)}
              </span>
            </div>
            <p className="mt-1 text-[13px] text-[#9A9A9A]">
              Son {snapshot.months} ay · tahmini, aktif aboneliklerin paket fiyatlarından (USD)
            </p>
            {mrrKeys.length === 0 ? (
              <div className="mt-4 flex h-[200px] w-full items-center justify-center rounded-[16px] bg-pn-canvas text-[14px] text-[#737373]">
                Henüz gelir yok
              </div>
            ) : (
              <div className="mt-4 h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={flattenMrr(snapshot.mrr, mrrKeys)} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#EBEBEB" strokeDasharray="3 5" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={AXIS_TICK}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={AXIS_TICK}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                      tickFormatter={(v) => `$${Number(v ?? 0).toLocaleString('en-US')}`}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(120,252,144,0.06)' }}
                      formatter={(v, name) => [formatUsd(Number(v ?? 0)), mrrPlanLabel(String(name ?? ''))]}
                    />
                    {mrrKeys.map((key, i) => (
                      <Area
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stackId="1"
                        stroke={TIER_AREA_COLORS[i % TIER_AREA_COLORS.length]}
                        strokeWidth={1.75}
                        fill={TIER_AREA_COLORS[i % TIER_AREA_COLORS.length]}
                        fillOpacity={0.22}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* 2. CHURN RATE — bar chart, churned + ratePct */}
          <div className="bz-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h3 className="pn-card-title text-pn-ink">Kayıp oranı</h3>
              {snapshot.churn.length > 0 && (
                <span
                  className={`pn-change ${snapshot.churn[snapshot.churn.length - 1].ratePct >= 5 ? 'pn-change--down' : 'pn-change--flat'}`}
                >
                  {snapshot.churn[snapshot.churn.length - 1].ratePct >= 5 ? (
                    <TrendingUp size={13} aria-hidden="true" />
                  ) : (
                    <TrendingDown size={13} aria-hidden="true" />
                  )}
                  %{snapshot.churn[snapshot.churn.length - 1].ratePct}
                </span>
              )}
            </div>
            <p className="mt-1 text-[13px] text-[#9A9A9A]">Aylık pasifleşen / aktif</p>
            <div className="mt-4 h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={snapshot.churn} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#EBEBEB" strokeDasharray="3 5" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(120,252,144,0.06)' }}
                    formatter={(v, name) => {
                      const numericV = typeof v === 'number' ? v : Number(v ?? 0);
                      const labelName = String(name ?? '');
                      if (labelName === 'ratePct') return [`%${numericV}`, 'Oran'];
                      if (labelName === 'churned') return [numericV, 'Pasifleşen'];
                      return [numericV, labelName];
                    }}
                  />
                  <Bar dataKey="churned" fill="#F04438" radius={[999, 999, 999, 999]} maxBarSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 3. NPS — pie chart */}
          <div className="bz-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h3 className="pn-card-title text-pn-ink">NPS dağılımı</h3>
              <span className="pn-change pn-change--flat">
                Skor: {snapshot.nps.score}
              </span>
            </div>
            <p className="mt-1 text-[13px] text-[#9A9A9A]">
              {snapshot.nps.windowDays ? `Son ${snapshot.nps.windowDays} gün · ` : ''}
              {snapshot.nps.total} yorum · tüm işletmeler
            </p>
            {snapshot.nps.total === 0 ? (
              <p className="mt-4 rounded-[16px] bg-pn-canvas px-4 py-10 text-center text-[14px] text-[#737373]">Veri yok</p>
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
                      outerRadius={74}
                      innerRadius={50}
                      paddingAngle={3}
                      cornerRadius={8}
                      stroke="none"
                    >
                      <Cell fill={NPS_PIE_COLORS.promoters} />
                      <Cell fill={NPS_PIE_COLORS.passives} />
                      <Cell fill={NPS_PIE_COLORS.detractors} />
                    </Pie>
                    <Tooltip
                      cursor={{ fill: 'rgba(120,252,144,0.06)' }}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 6, color: '#737373' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* 4. COHORT RETENTION — bar chart stacked */}
          <div className="bz-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h3 className="pn-card-title text-pn-ink">Kohort elde tutma</h3>
              <span className="pn-change pn-change--flat">
                <Users size={13} aria-hidden="true" />
                {snapshot.cohort.reduce((acc, p) => acc + p.signups, 0)}
              </span>
            </div>
            <p className="mt-1 text-[13px] text-[#9A9A9A]">Kayıt ayına göre, bugün hâlâ aktif veya denemede olanlar</p>
            <div className="mt-4 h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={snapshot.cohort} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#EBEBEB" strokeDasharray="3 5" vertical={false} />
                  <XAxis
                    dataKey="cohortMonth"
                    tick={AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(120,252,144,0.06)' }}
                  />
                  <Bar dataKey="retainedActive" stackId="a" fill="#78FC90" name="Aktif" radius={[0, 0, 6, 6]} maxBarSize={18} />
                  <Bar dataKey="retainedTrial" stackId="a" fill="#111110" name="Deneme" radius={[6, 6, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 5. SETUP FUNNEL — signup → business → QR → first rating, from
              database rows (no tracking script, so no consent or ad-blocker
              gaps). Same step definitions as the owner setup checklist. */}
          <div className="bz-card p-5 sm:p-6 lg:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="pn-card-title text-pn-ink">Kurulum hunisi</h3>
              <span className="pn-change pn-change--flat">
                <Users size={13} aria-hidden="true" />
                {snapshot.funnel.steps[0]?.count ?? 0}
              </span>
            </div>
            <p className="mt-1 text-[13px] text-[#9A9A9A]">
              Son {snapshot.funnel.windowDays} günde kaydolan işletme sahipleri, bugüne kadar
              hangi adıma ulaştı. Yeni kaydolanların bir kısmı henüz başındadır.
            </p>
            {(snapshot.funnel.steps[0]?.count ?? 0) === 0 ? (
              <p className="mt-4 rounded-[16px] bg-pn-canvas px-4 py-6 text-center text-[14px] text-[#737373]">
                Bu dönemde yeni kayıt yok
              </p>
            ) : (
              <ol className="mt-4 flex flex-col gap-2">
                {snapshot.funnel.steps.map((step, i) => {
                  const prev = i > 0 ? snapshot.funnel.steps[i - 1].count : null;
                  const stepRate =
                    prev && prev > 0 ? Math.round((step.count / prev) * 1000) / 10 : null;
                  return (
                    <li key={step.key} className="pn-row grid grid-cols-[180px_1fr_auto] items-center gap-3 px-4 py-3">
                      <span className="text-[14px] font-medium text-pn-ink">
                        {step.label}
                        {stepRate !== null && (
                          <span className="block text-[12px] font-normal text-[#9A9A9A]">
                            önceki adımdan geçiş: %{stepRate}
                          </span>
                        )}
                      </span>
                      <div
                        className="pn-hatch h-2.5 overflow-hidden rounded-full"
                        role="img"
                        aria-label={`${step.label}: kaydolanların %${step.pctOfSignups}'i`}
                      >
                        <div
                          className="h-full rounded-full bg-pn-accent"
                          style={{ width: `${Math.min(100, step.pctOfSignups)}%` }}
                        />
                      </div>
                      <span className="w-[88px] text-right text-[13px] tabular-nums text-[#737373]">
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
