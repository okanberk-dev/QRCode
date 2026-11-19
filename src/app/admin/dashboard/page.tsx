import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { CreditCard, Crown, MessageSquare, Store } from 'lucide-react';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/rbac';
import { adminLandingPath } from '@/lib/admin-landing';
import {
  BarChart,
  Eyebrow,
  PageHeader,
  ProgressBar,
  StatCard,
} from '@/components/ui';
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
  ] = await prisma.$transaction([
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
  const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const nowDate = now;

  // Stage 26 §38.102 — attention metrics (Batch 2) + operational signals
  // (Batch 3) tek transaction'a merge edildi. CLAUDE.md §14.1
  // connection_limit=1 disipline: 2 ayrı transaction yerine 7 query tek
  // connection üstünden serial; sequential connection açma overhead'i
  // (~50-100ms per round-trip) ortadan kalkar. Query'ler bağımsız (Batch 2
  // attention metric counts, Batch 3 audit log findMany) — merge safe.
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
  const [
    trialExpiringSoon,
    trialExpired,
    staleAccounts,
    restaurantsForQuota,
    unverifiedPlatform,
    bulkAuditRaw,
    destructiveAuditRaw,
  ] = await prisma.$transaction([
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
  ]);
  const quotaNearFull = restaurantsForQuota.filter(
    (r) => r._count.feedbacks >= TRIAL_QUOTA * 0.9,
  ).length;

  // Resolve actor names (admin usernames). Both bulk + destructive actor IDs.
  // Stage A — null actorId (KVKK hard-delete anonimizasyon) filter dışı.
  const auditActorIds = Array.from(
    new Set(
      [...bulkAuditRaw, ...destructiveAuditRaw]
        .map((r) => r.actorId)
        .filter((id): id is string => typeof id === 'string'),
    ),
  );
  const auditActors =
    auditActorIds.length > 0
      ? await prisma.adminUser.findMany({
          where: { id: { in: auditActorIds } },
          select: { id: true, username: true },
        })
      : [];
  const actorNameMap = new Map(auditActors.map((a) => [a.id, a.username]));

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

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8 space-y-3.5">
      <PageHeader
        eyebrow="SİSTEM YÖNETİMİ"
        title="Panel"
      />

      {/* Mobile-only "SİSTEM NABZI" hero (mobile-screens-2.jsx MAdminHome line 419-435 1:1) */}
      <section className="md:hidden rounded-[20px] bg-[#0A0A0A] p-[18px] text-white">
        <span className="pulse-eyebrow text-[#C6F24E]" style={{ fontSize: 9 }}>SİSTEM NABZI</span>
        <div className="bz-h-tight-2 mt-2" style={{ fontSize: 32 }}>
          {formatUsd(mrr)}
        </div>
        <div className="text-[12px] text-white/60">
          Aylık tekrarlayan gelir (tahmini)
          {mrrThirtyDaysAgo > 0 && (
            <>
              {' · '}
              <span className={mrrDeltaKind === 'up' ? 'text-[#C6F24E]' : mrrDeltaKind === 'down' ? 'text-[#FB7185]' : ''}>
                {mrrDeltaPct >= 0 ? '+' : ''}
                {mrrDeltaPct}%
              </span>
            </>
          )}
        </div>
        <div className="mt-3.5 grid grid-cols-2 gap-2.5">
          <div className="rounded-[10px] bg-white/[0.04] p-3">
            <div className="pulse-eyebrow text-[10px] text-white/45">İŞLETME</div>
            <div className="bz-h-tight mt-1 text-[18px]">{totalBusinesses}</div>
          </div>
          <div className="rounded-[10px] bg-white/[0.04] p-3">
            <div className="pulse-eyebrow text-[10px] text-white/45">AKTİF DENEMELER</div>
            <div className="bz-h-tight mt-1 text-[18px]">{activeTrials}</div>
          </div>
        </div>
      </section>

      {/* Desktop-only 4-stat KPI grid — each delta suffix names its own window */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          label="Toplam işletme"
          value={totalBusinesses}
          delta={`+${newBusinesses24h}`}
          deltaKind={newBusinesses24h > 0 ? 'up' : 'neutral'}
          deltaSuffix="son 24 saatte"
          icon={<Store size={14} strokeWidth={2} />}
        />
        <StatCard
          label="Aylık MRR (tahmini)"
          value={formatUsd(mrr)}
          delta={mrrDelta}
          deltaKind={mrrDeltaKind}
          deltaSuffix={mrrDeltaSuffix}
          icon={<CreditCard size={14} strokeWidth={2} />}
          accent={mrr > 0 ? '#C6F24E' : undefined}
        />
        <StatCard
          label="Aktif denemeler"
          value={activeTrials}
          delta={avgTrialDaysLeft != null ? `ort. ${avgTrialDaysLeft} gün kaldı` : undefined}
          deltaKind="neutral"
          icon={<Crown size={14} strokeWidth={2} />}
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
          icon={<MessageSquare size={14} strokeWidth={2} />}
        />
      </div>

      {/* Stage 109 §A1 — Menu yayın akışı strip. Desktop ve mobile'da görünür.
          Operator'a "kaç işletmenin menüsü canlı?" sinyalini KPI grid altında
          tek satırda verir. Publish rate = published/enabled (0-100). Detail
          link: /admin/restaurants?menuStatus=draft → operator çıkışı.
          Card chrome bz-card, lime accent (Pulse §11). */}
      <div className="bz-card p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <Eyebrow>MENÜ YAYIN AKIŞI</Eyebrow>
            <div className="bz-h-tight mt-1" style={{ fontSize: 18 }}>
              {menusPublishedCount} / {menusEnabledCount} canlı
            </div>
            <p className="mt-1 text-[12px] text-[#737373]">
              Menü özelliği açık {menusEnabledCount} işletmenin {menusPublishedCount}&apos;si yayında.
              {menusEnabledCount > menusPublishedCount && (
                <>
                  {' '}
                  <Link
                    href="/admin/restaurants?menuStatus=draft"
                    className="font-medium text-[#0A0A0A] underline-offset-2 hover:underline"
                  >
                    Taslakta bekleyen {menusEnabledCount - menusPublishedCount}
                  </Link>
                  {' '}işletme var.
                </>
              )}
            </p>
          </div>
          <div className="flex flex-col items-end shrink-0">
            <div
              className="bz-h-tight tabular-nums"
              style={{ fontSize: 28, color: '#0A0A0A' }}
            >
              {menusEnabledCount > 0
                ? Math.round((menusPublishedCount / menusEnabledCount) * 100)
                : 0}
              <span className="text-[14px] text-[#737373]">%</span>
            </div>
            <div className="pulse-eyebrow text-[#737373]">YAYIN ORANI</div>
          </div>
        </div>
        {menusEnabledCount > 0 && (
          <div className="mt-4">
            <ProgressBar
              value={menusPublishedCount}
              max={menusEnabledCount}
              ariaLabel={`${menusPublishedCount} / ${menusEnabledCount} menü yayında`}
            />
          </div>
        )}
      </div>

      {/* Desktop-only: Business growth + Plan distribution (1:1 design 2fr 1fr split) */}
      <div className="hidden md:grid gap-3.5 lg:grid-cols-[2fr_1fr]">
        <div className="bz-card p-5 sm:p-6">
          <Eyebrow>İŞLETME BÜYÜMESİ</Eyebrow>
          <div className="bz-h-tight mt-1 mb-4" style={{ fontSize: 18 }}>
            Son 12 hafta
          </div>
          <BarChart data={businessGrowthData} height={160} showValues />
        </div>
        <div className="bz-card p-5 sm:p-6">
          <Eyebrow>PLAN DAĞILIMI</Eyebrow>
          <div className="bz-h-tight mt-1 mb-3.5" style={{ fontSize: 18 }}>
            {totalOwners} işletme sahibi
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
