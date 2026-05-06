'use client';

// Stage A5 §38.97 — cross-workspace BI section.
//
// Mount: /admin/analytics page sonu (sm:hidden olmadan, sadece desktop +
// tablet'ta görünür — mobile owner-relevant değil). 4 chart:
//   1. MRR trend AreaChart (last N month, plan-stacked)
//   2. Churn rate BarChart (last N month, ratePct line + churned count bar)
//   3. NPS distribution PieChart (promoters / passives / detractors)
//   4. Cohort retention BarChart (last N month signup, retainedActive +
//      retainedTrial stacked)
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
}
interface CohortPoint {
  cohortMonth: string;
  signups: number;
  retainedActive: number;
  retainedTrial: number;
  retentionPct: number;
}

interface BiSnapshot {
  range: Range;
  months: number;
  mrr: MrrPoint[];
  churn: ChurnPoint[];
  nps: NpsBucket;
  cohort: CohortPoint[];
  generatedAt: string;
}

const RANGE_LABELS: Record<Range, string> = {
  '30d': '30G',
  '90d': '90G',
  '1y': '1Y',
};

const PLAN_KEYS = ['pro', 'growth', 'starter', 'monthly', 'yearly'] as const;
const PLAN_COLORS: Record<string, string> = {
  pro: '#0A0A0A',
  growth: '#525252',
  starter: '#A3A3A3',
  monthly: '#737373',
  yearly: '#C6F24E',
};

const NPS_PIE_COLORS = {
  promoters: '#A8D62E',
  passives: '#A3A3A3',
  detractors: '#FB7185',
};

interface MrrFlatRow {
  month: string;
  total: number;
  pro: number;
  growth: number;
  starter: number;
  monthly: number;
  yearly: number;
}

function flattenMrr(rows: MrrPoint[]): MrrFlatRow[] {
  return rows.map((r) => ({
    month: r.month,
    total: r.total,
    pro: r.byPlan.pro || 0,
    growth: r.byPlan.growth || 0,
    starter: r.byPlan.starter || 0,
    monthly: r.byPlan.monthly || 0,
    yearly: r.byPlan.yearly || 0,
  }));
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
          setError('Bu görünüm için yetki yok (analytics:read).');
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

  return (
    <section className="hidden sm:block mt-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EDEDED] pt-6">
        <div>
          <Eyebrow color="#525252">CROSS-WORKSPACE BI</Eyebrow>
          <h2 className="bz-h-tight mt-1 text-[18px]">İş zekası göstergeleri</h2>
          <p className="mt-1 text-[12px] text-[#737373]">
            MRR, churn, NPS ve kohort retention — tüm workspace toplamı.
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
          {/* 1. MRR TREND — area chart, plan stacked */}
          <div className="bz-card p-5">
            <div className="flex items-center justify-between gap-2">
              <Eyebrow>MRR TRENDİ</Eyebrow>
              <span className="bz-mono text-[10px] text-[#737373]">
                ₺{snapshot.mrr[snapshot.mrr.length - 1]?.total.toLocaleString('tr-TR') || 0}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[#737373]">{snapshot.months} ay (sentinel ücret)</p>
            <div className="mt-4 h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={flattenMrr(snapshot.mrr)} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
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
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #EDEDED' }}
                    formatter={(v) => `₺${Number(v ?? 0).toLocaleString('tr-TR')}`}
                  />
                  {PLAN_KEYS.map((p) => (
                    <Area
                      key={p}
                      type="monotone"
                      dataKey={p}
                      stackId="1"
                      stroke={PLAN_COLORS[p]}
                      fill={PLAN_COLORS[p]}
                      fillOpacity={0.7}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2. CHURN RATE — bar chart, churned + ratePct */}
          <div className="bz-card p-5">
            <div className="flex items-center justify-between gap-2">
              <Eyebrow>CHURN ORANI</Eyebrow>
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
            <p className="mt-1 text-[11px] text-[#737373]">{snapshot.nps.total} yorum (cross-workspace)</p>
            {snapshot.nps.total === 0 ? (
              <p className="mt-12 text-center text-[12px] text-[#737373]">Veri yok</p>
            ) : (
              <div className="mt-4 h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Destekçi (5★)', value: snapshot.nps.promoters, color: NPS_PIE_COLORS.promoters },
                        { name: 'Nötr (3-4★)', value: snapshot.nps.passives, color: NPS_PIE_COLORS.passives },
                        { name: 'Eleştiren (1-2★)', value: snapshot.nps.detractors, color: NPS_PIE_COLORS.detractors },
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
              <Eyebrow>KOHORT RETENTION</Eyebrow>
              <span className="bz-mono inline-flex items-center gap-1 text-[10px] text-[#737373]">
                <Users size={11} />
                {snapshot.cohort.reduce((acc, p) => acc + p.signups, 0)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[#737373]">Signup ayı bazlı, bugün hâlâ aktif/trial</p>
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
                  <Bar dataKey="retainedTrial" stackId="a" fill="#C6F24E" name="Trial" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default AdminBiSection;
