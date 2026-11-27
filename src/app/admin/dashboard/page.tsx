import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { CreditCard, Crown, MessageSquare, Store } from 'lucide-react';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readAll } from '@/lib/db-batch';
import { hasPermission } from '@/lib/rbac';
import { adminLandingPath } from '@/lib/admin-landing';
import {
  BarChart,
  PageHeader,
  StatCard,
} from '@/components/ui';
import { PanoNumber } from '@/components/panel/pano/PanoNumber';
import AdminOverviewWidgets, {
  type AttentionRow,
  type RecentMember,
} from '@/components/admin/AdminOverviewWidgets';
import AdminOperationalSignals, {
  type OperationalSignalRow,
} from '@/components/admin/AdminOperationalSignals';
import {
  REVENUE_SUBSCRIPTION_SELECT,
  buildPlanDistribution,
  formatUsd,
  summarizeRevenue,
} from '@/lib/admin-bi';
import { toAdminRow } from '@/lib/subscription-plans';

export const metadata: Metadata = {
  title: 'Panel — Buaze Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const DAY_MS = 24 * 60 * 60 * 1000;

// Plan trial quota (review count) — used by the "Kota %90+ doldu" attention
// metric. Aligned with CLAUDE.md GROWTH plan note (default trial = 2000).
const TRIAL_QUOTA = 2000;

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
  const token = cookieStore.get('admin_token')?.value;
  if (!token) redirect('/admin');
  const payload = await verifyJwt(token);
  if (!payload || !isAdminRole(payload.role as string | undefined)) redirect('/admin');

  // Platform-wide overview (MRR, plan mix, every tenant's name). Superadmin,
  // or staff holding `analytics:read` (same rule as the BI API). A manager is
  // scoped to one business and lands on its first page instead.
  const role = String(payload.role);
  if (role !== 'superadmin') {
    const adminId = typeof payload.id === 'string' ? payload.id : '';
    const canSeeOverview = role === 'staff' && (await hasPermission(adminId, 'analytics', 'read'));
    if (!canSeeOverview) redirect(await adminLandingPath(adminId, role, '/admin/dashboard'));
  }

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const twelveWeeksAgo = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
  const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nowDate = now;
  const thirtyDaysAuditAgo = thirtyDaysAgo;
  const BULK_ACTIONS = [
    'admin.restaurants.bulk.activate',
    'admin.restaurants.bulk.deactivate',
    'admin.restaurants.bulk.feature_override',
    'admin.owners.bulk.send_email',
  ];
  const DESTRUCTIVE_ACTIONS = [
    'admin.users.delete',
    'admin.members.deactivate',
    'admin.restaurants.delete',
    // What DELETE /api/restaurants/[id] actually writes.
    'restaurant.delete',
    'admin.impersonate.start',
    'admin.permission.revoke',
  ];

  // Every read on this page in one bounded-parallel batch (readAll, CLAUDE.md
  // §14.1; was one sequential $transaction): the overview aggregates (batch 1), the attention
  // metrics + operational signals (batch 2) and the admin usernames the
  // audit rows resolve against. The batches never depended on each other;
  // running them as separate transactions only added BEGIN/COMMIT round-trips.
  //
  // Aggregate queries — kept narrow so the dashboard stays a strategic
  // overview (review-monitoring lives on /admin/reviews).
  const [
    totalBusinesses,
    newBusinesses24h,
    prev30Reviews,
    monthlyReviews,
    owners,
    subscriptions,
    tierRows,
    restaurantsForGrowth,
    recentRestaurants,
    menusEnabledCount,
    menusPublishedCount,
    trialExpiringSoon,
    trialExpired,
    staleAccounts,
    restaurantsForQuota,
    unverifiedPlatform,
    bulkAuditRaw,
    destructiveAuditRaw,
    adminUsers,
  ] = await readAll([
    prisma.restaurant.count(),
    prisma.restaurant.count({ where: { createdAt: { gte: oneDayAgo } } }),
    prisma.feedback.count({ where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),
    prisma.feedback.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.user.findMany({
      where: { role: 'restaurant_owner' },
      select: { id: true, plan: true, trialEndsAt: true, isActive: true, createdAt: true },
    }),
    // §15.2 canonical billing — MRR + plan distribution come from
    // BillingSubscription + SubscriptionPlan tiers (USD-only, §38.225), the
    // same source /admin/plans and the analytics BI section use.
    prisma.billingSubscription.findMany({ select: REVENUE_SUBSCRIPTION_SELECT }),
    prisma.subscriptionPlan.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
    prisma.restaurant.findMany({
      where: { createdAt: { gte: twelveWeeksAgo } },
      select: { createdAt: true },
    }),
    // Recent businesses for "SON KATILAN İŞLETMELER" widget — design pattern
    // gösteriyor: name + city + relative date + owner plan badge.
    prisma.restaurant.findMany({
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: {
        id: true,
        name: true,
        address: true,
        createdAt: true,
        user: { select: { plan: true } },
      },
    }),
    // Stage 109 §A1 — menu publish funnel metric (Yayında menü sayısı +
    // publish rate). menuEnabled=true but menuPublished=false → "draft"
    // bucket (operator için aksiyon edilebilir sinyal). admin/restaurants
    // list'in menuStatus filter'ı ile birebir parity.
    prisma.restaurant.count({ where: { menuEnabled: true } }),
    prisma.restaurant.count({ where: { menuEnabled: true, menuPublished: true } }),
    // Batch 2 — attention metrics (CLAUDE.md §11.36 needs-attention deeplink)
    prisma.user.count({
      where: { plan: 'trial', trialEndsAt: { gt: nowDate, lte: sevenDaysAhead } },
    }),
    prisma.user.count({
      where: { plan: 'trial', trialEndsAt: { lte: nowDate } },
    }),
    prisma.user.count({
      where: { role: 'restaurant_owner', updatedAt: { lt: fourteenDaysAgo } },
    }),
    prisma.restaurant.findMany({
      where: { user: { plan: 'trial' } },
      select: { id: true, _count: { select: { feedbacks: true } } },
    }),
    prisma.restaurant.count({
      where: { googleReviewUrl: { not: null }, googlePlaceId: null },
    }),
    // Batch 3 — operational signals (CLAUDE.md §38.97 Stage A5)
    prisma.adminAuditLog.findMany({
      where: { action: { in: BULK_ACTIONS }, createdAt: { gte: thirtyDaysAuditAgo } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, action: true, actorId: true, actorSource: true, targetId: true, createdAt: true, payload: true },
    }),
    prisma.adminAuditLog.findMany({
      where: { action: { in: DESTRUCTIVE_ACTIONS }, createdAt: { gte: thirtyDaysAuditAgo } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, action: true, actorId: true, actorSource: true, targetId: true, createdAt: true, payload: true },
    }),
    // Admin usernames for the audit rows' actor column. AdminUser is a small
    // table (Buaze team + operator accounts), so one unfiltered read here
    // replaces the dependent lookup that used to wait for the audit rows.
    prisma.adminUser.findMany({ select: { id: true, username: true } }),
  ]);

  // 30-day review volume vs the previous 30 days (same window as the value).
  const reviewsDeltaPct = prev30Reviews > 0
    ? Math.round(((monthlyReviews - prev30Reviews) / prev30Reviews) * 1000) / 10
    : 0;
  const reviewsDeltaKind: 'up' | 'down' | 'neutral' =
    prev30Reviews === 0
      ? monthlyReviews > 0 ? 'up' : 'neutral'
      : reviewsDeltaPct > 0 ? 'up' : reviewsDeltaPct < 0 ? 'down' : 'neutral';

  const tiers = tierRows.map(toAdminRow);
  const tiersById = new Map(tiers.map((t) => [t.id, t]));

  // Plan distribution + lifecycle counts — paid / trial / trial expired / free.
  const totalOwners = owners.length;
  const { buckets: planBuckets, counts: planCounts } = buildPlanDistribution({
    owners,
    subscriptions,
    tiers,
    now,
  });
  const activeTrials = planCounts.trial;
  const trialDaysLeft = owners
    .filter((o) => o.plan === 'trial' && o.trialEndsAt && o.trialEndsAt > now)
    .map((o) => Math.ceil(((o.trialEndsAt as Date).getTime() - now.getTime()) / DAY_MS));
  const avgTrialDaysLeft = trialDaysLeft.length
    ? Math.round(trialDaysLeft.reduce((a, b) => a + b, 0) / trialDaysLeft.length)
    : null;

  // MRR (USD) — canonical tier price / admin override per active subscription.
  // 30-day comparison is a proxy: subscriptions of owners that already existed
  // 30 days ago (no subscription start history — same assumption as before).
  const mrr = summarizeRevenue(subscriptions, tiersById).mrrUsd;
  const ownerCreatedAt = new Map(owners.map((o) => [o.id, o.createdAt]));
  const mrrThirtyDaysAgo = summarizeRevenue(
    subscriptions.filter((s) => {
      const created = ownerCreatedAt.get(s.userId);
      return created ? created < thirtyDaysAgo : false;
    }),
    tiersById,
  ).mrrUsd;
  const mrrDeltaPct = mrrThirtyDaysAgo > 0
    ? Math.round(((mrr - mrrThirtyDaysAgo) / mrrThirtyDaysAgo) * 1000) / 10
    : 0;
  const mrrDeltaKind: 'up' | 'down' | 'neutral' =
    mrrThirtyDaysAgo === 0
      ? mrr > 0 ? 'up' : 'neutral'
      : mrrDeltaPct > 0 ? 'up' : mrrDeltaPct < 0 ? 'down' : 'neutral';
  const mrrDelta =
    mrr === 0 && mrrThirtyDaysAgo === 0
      ? 'Henüz ödeyen yok'
      : mrrThirtyDaysAgo === 0
        ? `+${formatUsd(mrr)}`
        : `${mrrDeltaPct >= 0 ? '+' : ''}${mrrDeltaPct}%`;
  const mrrDeltaSuffix =
    mrr === 0 && mrrThirtyDaysAgo === 0
      ? undefined
      : mrrThirtyDaysAgo === 0
        ? 'son 30 günde'
        : 'son 30 güne göre';

  const businessGrowthData = bucketByWeek(
    restaurantsForGrowth.map((r) => r.createdAt),
    12,
    now,
  );

  // Recently joined → design pattern: business name + "city · joined date" + owner plan
  const recentMembers: RecentMember[] = recentRestaurants.map((r) => {
    const city = (r.address || '').split(',').slice(-1)[0]?.trim() || '—';
    const joined = new Date(r.createdAt).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    return {
      id: r.id,
      name: r.name,
      subline: `${city} · ${joined}`,
      plan: r.user?.plan || 'trial',
    };
  });

  // Attention metrics — design 1:1 + PR2 trial signals.
  //  1. Trial yakında bitiyor    → User.plan='trial' AND trialEndsAt within 7d  (PR2)
  //  2. Trial süresi bitti        → User.plan='trial' AND trialEndsAt < now      (PR2)
  //  3. 14+ gün giriş yapılmadı   → User.updatedAt (proxy, lastLoginAt yok)
  //  4. Kota %90+ doldu           → Trial restaurants whose feedback count ≥ 90% of TRIAL_QUOTA
  //  5. Doğrulanmamış platform    → Restaurant has googleReviewUrl but googlePlaceId null
  const quotaNearFull = restaurantsForQuota.filter(
    (r) => r._count.feedbacks >= TRIAL_QUOTA * 0.9,
  ).length;

  // Resolve actor names (admin usernames) for bulk + destructive rows.
  // Stage A — null actorId (KVKK hard-delete anonimizasyon) resolves to null.
  const actorNameMap = new Map(adminUsers.map((a) => [a.id, a.username]));

  function mapAuditRow(row: typeof bulkAuditRaw[0]): OperationalSignalRow {
    const payload = (row.payload as { count?: number } | null) || null;
    const count = typeof payload?.count === 'number' ? payload.count : null;
    return {
      id: row.id,
      action: row.action,
      actorId: row.actorId,
      actorSource: row.actorSource,
      targetId: row.targetId,
      createdAt: row.createdAt,
      actorName: row.actorId ? actorNameMap.get(row.actorId) || null : null,
      count,
    };
  }

  const bulkSignals = bulkAuditRaw.map(mapAuditRow);
  const destructiveSignals = destructiveAuditRaw.map(mapAuditRow);

  // Each row deeplinks to the corresponding admin list with the matching
  // attention filter preset (CLAUDE.md §11.36). Backend mirrors these
  // attention values in /api/admin/members + /api/restaurants.
  const attention: AttentionRow[] = [
    {
      k: 'Trial 7 gün içinde bitiyor',
      n: trialExpiringSoon,
      kind: 'warn',
      href: '/admin/members?attention=trial_expiring',
    },
    {
      k: 'Trial süresi bitti',
      n: trialExpired,
      kind: 'danger',
      href: '/admin/members?attention=trial_expired',
    },
    {
      k: '14+ gün giriş yapılmadı',
      n: staleAccounts,
      kind: 'warn',
      href: '/admin/members?attention=stale',
    },
    {
      k: 'Kota %90+ doldu',
      n: quotaNearFull,
      kind: 'warn',
      href: '/admin/restaurants?attention=quota_full',
    },
    {
      k: 'Doğrulanmamış platform',
      n: unverifiedPlatform,
      kind: 'warn',
      href: '/admin/restaurants?attention=unverified_platform',
    },
  ];

  const publishRate = menusEnabledCount > 0 ? Math.round((menusPublishedCount / menusEnabledCount) * 100) : 0;

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8 space-y-3">
      <PageHeader
        crumb="Genel bakış"
        title="Panel"
      />

      {/* Fintora KPI row — every size (two by two on phones); each change
          pill names its own window. */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <StatCard
          label="Toplam işletme"
          value={totalBusinesses}
          delta={`+${newBusinesses24h}`}
          deltaKind={newBusinesses24h > 0 ? 'up' : 'neutral'}
          deltaSuffix="son 24 saatte"
          icon={<Store size={18} />}
        />
        <StatCard
          label="Aylık MRR (tahmini)"
          value={formatUsd(mrr)}
          delta={mrrDelta}
          deltaKind={mrrDeltaKind}
          deltaSuffix={mrrDeltaSuffix}
          icon={<CreditCard size={18} />}
        />
        <StatCard
          label="Aktif denemeler"
          value={activeTrials}
          delta={avgTrialDaysLeft != null ? `ort. ${avgTrialDaysLeft} gün kaldı` : undefined}
          deltaKind="neutral"
          icon={<Crown size={18} />}
        />
        <StatCard
          label="Aylık yorum"
          value={monthlyReviews.toLocaleString('tr-TR')}
          delta={
            prev30Reviews === 0
              ? monthlyReviews > 0
                ? `+${monthlyReviews.toLocaleString('tr-TR')}`
                : undefined
              : `${reviewsDeltaPct >= 0 ? '+' : ''}${reviewsDeltaPct.toLocaleString('tr-TR')}%`
          }
          deltaKind={reviewsDeltaKind}
          deltaSuffix={prev30Reviews === 0 ? 'önceki 30 günde yorum yoktu' : 'önceki 30 güne göre'}
          icon={<MessageSquare size={18} />}
        />
      </div>

      {/* Stage 109 §A1 — Menu publish card: how many businesses with the menu
          feature have it live. Fintora meter: black fill, hatched remainder.
          Detail link: /admin/restaurants?menuStatus=draft. */}
      <div className="bz-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="pn-card-title text-pn-ink">Menü yayını</h2>
            <p className="mt-1 text-[13px] text-[#9A9A9A]">
              Menü özelliği açık {menusEnabledCount} işletmenin {menusPublishedCount}&apos;si yayında.
              {menusEnabledCount > menusPublishedCount && (
                <>
                  {' '}
                  <Link
                    href="/admin/restaurants?menuStatus=draft"
                    className="font-medium text-pn-ink underline decoration-pn-accent decoration-2 underline-offset-4 hover:text-pn-accent"
                  >
                    Taslakta bekleyen {menusEnabledCount - menusPublishedCount}
                  </Link>
                  {' '}işletme var.
                </>
              )}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end">
            <span className="text-[32px] leading-none text-pn-ink">
              <PanoNumber value={`%${publishRate}`} />
            </span>
            <span className="mt-1.5 text-[13px] text-[#9A9A9A]">Yayın oranı · {menusPublishedCount} / {menusEnabledCount}</span>
          </div>
        </div>
        {menusEnabledCount > 0 && (
          <div
            className="pn-hatch mt-5 h-2.5 overflow-hidden rounded-full"
            role="progressbar"
            aria-valuenow={publishRate}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${menusPublishedCount} / ${menusEnabledCount} menü yayında`}
          >
            {publishRate > 0 && (
              <div className="h-full rounded-full bg-pn-accent" style={{ width: `${Math.max(publishRate, 4)}%` }} />
            )}
          </div>
        )}
      </div>

      {/* Business growth + plan distribution (2fr 1fr on lg, stacked below). */}
      <div className="grid gap-2.5 lg:grid-cols-[2fr_1fr]">
        <div className="bz-card p-5 sm:p-6">
          <h2 className="pn-card-title text-pn-ink">İşletme büyümesi</h2>
          <p className="mb-5 mt-1 text-[13px] text-[#9A9A9A]">Son 12 hafta · haftalık yeni işletme</p>
          <BarChart data={businessGrowthData} height={168} showValues />
        </div>
        <div className="bz-card p-5 sm:p-6">
          <h2 className="pn-card-title text-pn-ink">Plan dağılımı</h2>
          <p className="mb-4 mt-1 text-[13px] text-[#9A9A9A]">{totalOwners} işletme sahibi</p>
          <ul className="flex flex-col gap-2">
            {planBuckets.map((b) => {
              const pct = totalOwners ? (b.count / totalOwners) * 100 : 0;
              return (
                <li key={b.key} className="pn-row flex-col items-stretch gap-2 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex min-w-0 items-center gap-2 text-[14px] font-medium text-pn-ink">
                      <span aria-hidden="true" className="pn-legend-dot" style={{ background: b.color }} />
                      <span className="truncate">{b.label}</span>
                    </span>
                    <span className="shrink-0 text-[14px] font-medium tabular-nums text-pn-ink">
                      {b.count}
                      <span className="ml-1.5 text-[13px] font-normal text-[#9A9A9A]">%{Math.round(pct)}</span>
                    </span>
                  </div>
                  <div
                    className="pn-hatch h-2 overflow-hidden rounded-full"
                    role="progressbar"
                    aria-valuenow={Math.round(pct)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${b.label} plan ${b.count}`}
                  >
                    {pct > 0 && (
                      <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 3)}%`, background: b.color }} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Recently joined + Needs attention — server-computed metrics (design 1:1).
          Mobile: stacks vertically (matches MAdminHome). Desktop: 2-col. */}
      <AdminOverviewWidgets locale="tr" members={recentMembers} attention={attention} />

      {/* Stage A5 §38.97 — Operasyonel sinyaller: son 5 bulk + son 5 destructive
          audit event. Cross-link Audit Log Viewer'a (Stage A3 §38.95). */}
      <AdminOperationalSignals
        bulkRows={bulkSignals}
        destructiveRows={destructiveSignals}
      />
    </div>
  );
}
