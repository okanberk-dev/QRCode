import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { CreditCard, Crown, MessageSquare, Store } from 'lucide-react';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  BarChart,
  Eyebrow,
  PageHeader,
  ProgressBar,
  StatCard,
} from '@/components/ui';
import AdminOverviewWidgets from '@/components/admin/AdminOverviewWidgets';

export const metadata: Metadata = {
  title: 'Panel — Buaze Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

// Plan tier sentinel prices used by the MRR estimation. Same source-of-truth
// the /admin/plans page uses for its own MRR widget — when Iyzico billing
// lands the prices move out of code.
const PLAN_PRICES: Record<string, number> = {
  pro: 1499,
  growth: 899,
  starter: 499,
  monthly: 499,
  yearly: 416, // 4990 / 12 (yearly equivalent monthly)
  enterprise: 0,
};

function bucketByWeek(dates: Date[], weeks: number, now: Date): { label: string; value: number }[] {
  const buckets: { label: string; value: number }[] = [];
  const msInWeek = 7 * 24 * 60 * 60 * 1000;
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(now.getTime() - (i + 1) * msInWeek);
    const end = new Date(now.getTime() - i * msInWeek);
    const count = dates.filter((d) => d >= start && d < end).length;
    buckets.push({ label: `H${weeks - i}`, value: count });
  }
  return buckets;
}

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value || cookieStore.get('user_token')?.value;
  if (!token) redirect('/admin');
  const payload = await verifyJwt(token);
  if (!payload || !isAdminRole(payload.role as string | undefined)) redirect('/admin');

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const twelveWeeksAgo = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);

  // Aggregate queries — kept narrow so the dashboard stays a strategic
  // overview (review-monitoring lives on /admin/reviews).
  const [
    totalBusinesses,
    monthlyReviews,
    owners,
    restaurantsForGrowth,
  ] = await Promise.all([
    prisma.restaurant.count(),
    prisma.feedback.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.user.findMany({
      where: { role: 'restaurant_owner' },
      select: { plan: true, trialEndsAt: true, isActive: true },
    }),
    prisma.restaurant.findMany({
      where: { createdAt: { gte: twelveWeeksAgo } },
      select: { createdAt: true },
    }),
  ]);

  const activeTrials = owners.filter(
    (o) => o.plan === 'trial' && o.trialEndsAt && o.trialEndsAt > now,
  ).length;

  // Estimated MRR — sum of plan prices for non-trial owners.
  // Iyzico bağlantısı geldiğinde gerçek invoice toplamı kullanılır.
  const mrr = owners.reduce((acc, o) => {
    const plan = (o.plan || 'trial').toLowerCase();
    if (plan === 'trial' || plan === 'free') return acc;
    const matched = Object.keys(PLAN_PRICES).find((k) => plan.includes(k));
    return acc + (matched ? PLAN_PRICES[matched] : 0);
  }, 0);

  // Plan distribution — 4 buckets per design AdminDashboard.
  const totalOwners = owners.length;
  const planBuckets: Array<{ key: string; label: string; color: string; count: number }> = [
    { key: 'pro', label: 'Pro', color: '#0A0A0A', count: 0 },
    { key: 'growth', label: 'Growth', color: '#525252', count: 0 },
    { key: 'starter', label: 'Starter', color: '#A3A3A3', count: 0 },
    { key: 'trial', label: 'Trial', color: '#C6F24E', count: 0 },
  ];
  for (const o of owners) {
    const plan = (o.plan || 'trial').toLowerCase();
    const bucket =
      planBuckets.find((b) => plan.includes(b.key)) ??
      // fall through to trial for monthly/yearly/free/unknown values
      (plan === 'monthly' || plan === 'yearly'
        ? planBuckets.find((b) => b.key === 'starter')
        : planBuckets[planBuckets.length - 1]);
    if (bucket) bucket.count += 1;
  }

  const businessGrowthData = bucketByWeek(
    restaurantsForGrowth.map((r) => r.createdAt),
    12,
    now,
  );

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-7 py-6 lg:py-8 space-y-3.5">
      <PageHeader
        eyebrow="SUPERADMIN"
        eyebrowColor="#C6F24E"
        title="Sistem genel görünümü"
        description="Buaze platformunun strateji panosu. Operasyonel günlük yorum izleme için Yorumlar sekmesine geç."
      />

      {/* 4-stat KPI grid (1:1 design AdminDashboard) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          label="Toplam işletme"
          value={totalBusinesses}
          delta={`${totalOwners} sahip`}
          deltaKind="neutral"
          icon={<Store size={14} strokeWidth={2} />}
        />
        <StatCard
          label="Aylık MRR"
          value={`₺${mrr.toLocaleString('tr-TR')}`}
          delta="Iyzico bağlantısı bekleniyor"
          deltaKind="neutral"
          icon={<CreditCard size={14} strokeWidth={2} />}
          accent="#C6F24E"
        />
        <StatCard
          label="Aktif denemeler"
          value={activeTrials}
          delta="14 gün ort."
          deltaKind="neutral"
          icon={<Crown size={14} strokeWidth={2} />}
        />
        <StatCard
          label="Aylık yorum"
          value={monthlyReviews.toLocaleString('tr-TR')}
          delta="Son 30 gün"
          deltaKind="neutral"
          icon={<MessageSquare size={14} strokeWidth={2} />}
        />
      </div>

      {/* Business growth + Plan distribution (1:1 design 2fr 1fr split) */}
      <div className="grid gap-3.5 lg:grid-cols-[2fr_1fr]">
        <div className="bz-card p-5 sm:p-6">
          <Eyebrow>İşletme büyümesi</Eyebrow>
          <div className="bz-h-tight mt-1 mb-4" style={{ fontSize: 18 }}>
            Son 12 hafta
          </div>
          <BarChart data={businessGrowthData} height={160} />
        </div>
        <div className="bz-card p-5 sm:p-6">
          <Eyebrow>Plan dağılımı</Eyebrow>
          <div className="bz-h-tight mt-1 mb-3.5" style={{ fontSize: 18 }}>
            {totalOwners} işletme
          </div>
          <div className="flex flex-col gap-2.5">
            {planBuckets.map((b) => {
              const pct = totalOwners ? (b.count / totalOwners) * 100 : 0;
              return (
                <div key={b.key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ fontWeight: 500 }}>{b.label}</span>
                    <span className="bz-mono" style={{ color: '#525252' }}>
                      {b.count}
                    </span>
                  </div>
                  <ProgressBar
                    value={pct}
                    max={100}
                    color={b.color}
                    ariaLabel={`${b.label} plan ${b.count}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recently joined + Needs attention (Phase 3.3 — already 1:1 design) */}
      <AdminOverviewWidgets locale="tr" />
    </div>
  );
}
