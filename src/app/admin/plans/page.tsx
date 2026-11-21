import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CreditCard, Crown, TrendingUp, Users } from 'lucide-react';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  Avatar,
  Badge,
  Eyebrow,
  PageHeader,
  ProgressBar,
  StatCard,
} from '@/components/ui';
import { toAdminRow, type AdminPlanRow } from '@/lib/subscription-plans';
import {
  REVENUE_SUBSCRIPTION_SELECT,
  buildPlanDistribution,
  classifyOwnerPlan,
  formatUsd,
  summarizeRevenue,
} from '@/lib/admin-bi';
import PlansManager from '@/components/admin/PlansManager';

export const metadata: Metadata = {
  title: 'Abonelikler — Buaze Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

// Plan tier hardcoded array kaldırıldı — paketler artık DB-driven
// (SubscriptionPlan tablosu). PlansManager admin paneli üzerinden CRUD eder,
// public /pricing aynı kaynaktan fetch eder.

export default async function AdminPlansPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value || cookieStore.get('user_token')?.value;
  if (!token) redirect('/admin');
  const payload = await verifyJwt(token);
  if (!payload || !isAdminRole(payload.role as string | undefined)) redirect('/admin');

  // §38.226 Stage 146 perf optimize — 3 sequential Prisma read tek
  // $transaction batch'e alındı (CLAUDE.md §40.1 + §40.10 — Supabase pooler
  // connection_limit=1, paralel read'ler tek connection üstünde sıralı
  // çalışır). Pre-fix: 3 protocol round-trip; post-fix: 1 protocol RT
  // (~80-150ms cold load tasarrufu).
  //
  // The plans read joins the same $transaction (no Promise.all over Prisma
  // reads, §14.1). A failing plans read used to degrade to an empty tier
  // list; that is kept: on error we retry without it and use [].
  const ownersQuery = () =>
    prisma.user.findMany({
      where: { role: 'restaurant_owner' },
      select: { id: true, name: true, email: true, plan: true, trialEndsAt: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  // §15.2 canonical billing — tier usage + MRR come from BillingSubscription
  // (subscriptionPlanId + billingCycle + admin override). `User.plan` is a
  // lifecycle bucket (monthly/yearly/free…), never a tier name.
  const subscriptionsQuery = () =>
    prisma.billingSubscription.findMany({ select: REVENUE_SUBSCRIPTION_SELECT });
  let owners: Awaited<ReturnType<typeof ownersQuery>>;
  let subscriptions: Awaited<ReturnType<typeof subscriptionsQuery>>;
  let managedPlans: AdminPlanRow[];
  try {
    const [ownerRows, subscriptionRows, planRows] = await prisma.$transaction([
      ownersQuery(),
      subscriptionsQuery(),
      prisma.subscriptionPlan.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
    ]);
    owners = ownerRows;
    subscriptions = subscriptionRows;
    managedPlans = planRows.map(toAdminRow);
  } catch {
    [owners, subscriptions] = await prisma.$transaction([ownersQuery(), subscriptionsQuery()]);
    managedPlans = [];
  }
  const now = new Date();

  const totalOwners = owners.length;
  const activeOwners = owners.filter((o) => o.isActive).length;

  const { buckets: planBuckets, counts: planCounts } = buildPlanDistribution({
    owners,
    subscriptions,
    tiers: managedPlans,
    now,
    includeEmptyTiers: false,
  });
  const paidOwners = planCounts.paid;
  const paidShare = totalOwners ? Math.round((paidOwners / totalOwners) * 100) : 0;
  const trialOwners = planCounts.trial;
  const trialDaysLeft = owners
    .filter((o) => o.plan === 'trial' && o.trialEndsAt && o.trialEndsAt > now)
    .map((o) => Math.ceil(((o.trialEndsAt as Date).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
  const avgTrialDaysLeft = trialDaysLeft.length
    ? Math.round(trialDaysLeft.reduce((a, b) => a + b, 0) / trialDaysLeft.length)
    : null;

  // Per-tier usage badge (PlansManager) + USD MRR — same helper the
  // dashboard + analytics BI section use.
  const tiersById = new Map(managedPlans.map((t) => [t.id, t]));
  const revenue = summarizeRevenue(subscriptions, tiersById);
  const planUsage: Record<string, number> = {};
  for (const tier of managedPlans) planUsage[tier.id] = revenue.usageByPlanId[tier.id] ?? 0;
  const mrrUsd = revenue.mrrUsd;

  // "Son katılan ödeyen müşteriler" — same paid rule as the KPI.
  const subsByUser = new Map(subscriptions.map((s) => [s.userId, s]));
  const tierNameByUser = new Map(
    subscriptions
      .filter((s) => s.subscriptionPlanId && tiersById.has(s.subscriptionPlanId))
      .map((s) => {
        const tier = tiersById.get(s.subscriptionPlanId as string);
        return [s.userId, tier ? tier.nameTr || tier.nameEn : null] as const;
      }),
  );
  const recentPaid = owners
    .filter((o) => classifyOwnerPlan(o, subsByUser.get(o.id), now) === 'paid')
    .slice(0, 5);
  const PLAN_BADGE_LABEL: Record<string, string> = {
    monthly: 'Aylık',
    yearly: 'Yıllık',
    enterprise: 'Kurumsal',
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow="ABONELİKLER"
        title="Plan yönetimi"
        description="Müşterilerinin plan dağılımını izle, paket fiyatlarını yönet. İşletme sahipleri PayNKolay ile kartla (TL) ödeyebilir; özel anlaşmalar için planı elle düzenleyebilirsin."
      />

      <div className="grid gap-3.5 grid-cols-2 lg:grid-cols-4 mb-4">
        <StatCard
          label="Toplam müşteri"
          value={totalOwners}
          delta={`${activeOwners} aktif`}
          deltaKind="neutral"
          icon={<Users size={14} strokeWidth={2} />}
        />
        <StatCard
          label="Ödeyen müşteri"
          value={paidOwners}
          delta={`%${paidShare}`}
          deltaKind="neutral"
          deltaSuffix="tüm müşterilerin"
          icon={<TrendingUp size={14} strokeWidth={2} />}
          accent={paidOwners > 0 ? '#C6F24E' : undefined}
        />
        <StatCard
          label="Aktif denemeler"
          value={trialOwners}
          delta={avgTrialDaysLeft != null ? `ort. ${avgTrialDaysLeft} gün kaldı` : undefined}
          deltaKind="neutral"
          icon={<Crown size={14} strokeWidth={2} />}
        />
        <StatCard
          label="Aylık MRR (tahmini)"
          value={formatUsd(mrrUsd)}
          delta={
            revenue.activeSubscriptions > 0
              ? `${revenue.activeSubscriptions} aktif abonelik`
              : 'Henüz ödeyen yok'
          }
          deltaKind="neutral"
          deltaSuffix={
            revenue.unpricedSubscriptions > 0
              ? `${revenue.unpricedSubscriptions} tanesi fiyatsız`
              : undefined
          }
          icon={<CreditCard size={14} strokeWidth={2} />}
          accent={mrrUsd > 0 ? '#C6F24E' : undefined}
        />
      </div>

      {/* Plan distribution + Recently joined */}
      <div className="grid gap-3.5 mb-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="bz-card p-5 sm:p-6">
          <Eyebrow>Plan dağılımı</Eyebrow>
          <div className="bz-h-tight mt-1 mb-3.5" style={{ fontSize: 18 }}>
            {totalOwners} işletme sahibi
          </div>
          <div className="flex flex-col gap-2.5">
            {planBuckets
              .map((b) => {
                const pct = totalOwners ? (b.count / totalOwners) * 100 : 0;
                return (
                  <div key={b.key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ fontWeight: 500 }}>{b.label}</span>
                      <span className="bz-mono text-[#525252]">
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

        <div className="bz-card overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #EDEDED' }}>
            <Eyebrow>Son katılan ödeyen müşteriler</Eyebrow>
            <Link
              href="/admin/members"
              className="inline-flex items-center gap-1 text-[12px] font-medium hover:opacity-70 text-[#0A0A0A]"
            >
              Tümü
              <ArrowRight size={12} strokeWidth={2} />
            </Link>
          </div>
          {recentPaid.length === 0 ? (
            <div className="p-8 text-center" style={{ fontSize: 13, color: '#737373' }}>
              Henüz ödeyen müşteri yok.
            </div>
          ) : (
            recentPaid.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-3 px-5 py-3"
                style={{ borderBottom: '1px solid #F5F5F5' }}
              >
                <Avatar name={u.name || u.email} size={32} />
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {u.name || u.email.split('@')[0]}
                  </div>
                  <div style={{ fontSize: 11, color: '#737373' }}>
                    {u.email} ·{' '}
                    {new Date(u.createdAt).toLocaleDateString('tr-TR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                </div>
                <Badge kind="lime">
                  {tierNameByUser.get(u.id) || PLAN_BADGE_LABEL[(u.plan || '').toLowerCase()] || 'Ücretli'}
                </Badge>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Manageable plan cards — DB-driven via /api/admin/plans CRUD.
          Public /pricing fetches the same rows. §38.224: tier card pattern
          (marketing /pricing parity) + per-plan user count badge. */}
      <PlansManager initialPlans={managedPlans} initialUsage={planUsage} />

      {/* Ödeme entegrasyonu notu — sade, operatöre yönelik dil (§38.233). */}
      <div
        className="mt-4 p-4 rounded-xl flex gap-3 flex-col sm:flex-row"
        style={{ background: '#EAF9B8', border: '1px solid #C6F24E' }}
      >
        <CreditCard
          size={18}
          color="#0A0A0A"
          strokeWidth={2}
          style={{ flexShrink: 0, marginTop: 2 }}
        />
        <div style={{ fontSize: 12.5, color: '#0A0A0A', lineHeight: 1.55 }}>
          <strong>Ödeme entegrasyonu:</strong> Bir pakette ödeme sağlayıcısı olarak
          PayNKolay seçilip TL fiyatı girildiğinde, işletme sahibi
          fiyatlandırma sayfasında ve panelinde &quot;Kartla öde&quot; düğmesini görür.
          Her ödeme bir dönem açar, otomatik çekim yoktur. Manuel plan
          değişiklikleri{' '}
          <Link href="/admin/members" className="underline text-[#0A0A0A] font-medium">
            İşletme Sahipleri
          </Link>{' '}
          listesinden yapılır.
        </div>
      </div>
    </div>
  );
}
