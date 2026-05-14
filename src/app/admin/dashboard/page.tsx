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
import AdminOverviewWidgets, {
  type AttentionRow,
  type RecentMember,
} from '@/components/admin/AdminOverviewWidgets';
import AdminOperationalSignals, {
  type OperationalSignalRow,
} from '@/components/admin/AdminOperationalSignals';

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
  const token = cookieStore.get('admin_token')?.value || cookieStore.get('user_token')?.value;
  if (!token) redirect('/admin');
  const payload = await verifyJwt(token);
  if (!payload || !isAdminRole(payload.role as string | undefined)) redirect('/admin');

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const twelveWeeksAgo = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);

  // Aggregate queries — kept narrow so the dashboard stays a strategic
  // overview (review-monitoring lives on /admin/reviews).
  const [
    totalBusinesses,
    newBusinesses24h,
    last7Reviews,
    prev7Reviews,
    monthlyReviews,
    owners,
    ownersThirtyDaysAgo,
    restaurantsForGrowth,
    recentRestaurants,
    menusEnabledCount,
    menusPublishedCount,
  ] = await prisma.$transaction([
    prisma.restaurant.count(),
    prisma.restaurant.count({ where: { createdAt: { gte: oneDayAgo } } }),
    prisma.feedback.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.feedback.count({ where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }),
    prisma.feedback.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.user.findMany({
      where: { role: 'restaurant_owner' },
      select: { plan: true, trialEndsAt: true, isActive: true },
    }),
    // 30-day-old MRR snapshot proxy (bkz. CLAUDE.md §14 — plan-switch history
    // tracking yok, today's plan ≈ past plan kabul edilir).
    prisma.user.findMany({
      where: { role: 'restaurant_owner', createdAt: { lt: thirtyDaysAgo } },
      select: { plan: true },
    }),
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

  // 7-day review delta (design uniform "son 7 gün" suffix uses W-1 → W % change).
  const reviewsDeltaPct = prev7Reviews > 0
    ? Math.round(((last7Reviews - prev7Reviews) / prev7Reviews) * 1000) / 10
    : last7Reviews > 0 ? 100 : 0;
  const reviewsDeltaKind: 'up' | 'down' | 'neutral' =
    reviewsDeltaPct > 0 ? 'up' : reviewsDeltaPct < 0 ? 'down' : 'neutral';

  const activeTrials = owners.filter(
    (o) => o.plan === 'trial' && o.trialEndsAt && o.trialEndsAt > now,
  ).length;

  // Estimated MRR (sentinel prices). Iyzico billing geldiğinde gerçek invoice
  // toplamı kullanılır.
  const computeMrr = (rows: { plan: string | null }[]) =>
    rows.reduce((acc, o) => {
      const plan = (o.plan || 'trial').toLowerCase();
      if (plan === 'trial' || plan === 'free') return acc;
      const matched = Object.keys(PLAN_PRICES).find((k) => plan.includes(k));
      return acc + (matched ? PLAN_PRICES[matched] : 0);
    }, 0);
  const mrr = computeMrr(owners);
  const mrrThirtyDaysAgo = computeMrr(ownersThirtyDaysAgo);
  const mrrDeltaPct = mrrThirtyDaysAgo > 0
    ? Math.round(((mrr - mrrThirtyDaysAgo) / mrrThirtyDaysAgo) * 1000) / 10
    : mrr > 0 ? 100 : 0;
  const mrrDeltaKind: 'up' | 'down' | 'neutral' =
    mrrDeltaPct > 0 ? 'up' : mrrDeltaPct < 0 ? 'down' : 'neutral';

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
  const auditActorIds = Array.from(
    new Set([...bulkAuditRaw, ...destructiveAuditRaw].map((r) => r.actorId)),
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
      actorName: actorNameMap.get(row.actorId) || null,
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
    <div className="mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8 space-y-3.5">
      <PageHeader
        eyebrow="SİSTEM YÖNETİMİ"
        title="Panel"
      />

      {/* Mobile-only "SİSTEM NABZI" hero (mobile-screens-2.jsx MAdminHome line 419-435 1:1) */}
      <section className="md:hidden rounded-[20px] bg-[#0A0A0A] p-[18px] text-white">
        <span className="pulse-eyebrow text-[#C6F24E]" style={{ fontSize: 9 }}>SİSTEM NABZI</span>
        <div className="bz-h-tight-2 mt-2" style={{ fontSize: 32 }}>
          ₺{mrr.toLocaleString('tr-TR')}
        </div>
        <div className="text-[12px] text-white/60">
          Aylık tekrarlayan gelir
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

      {/* Desktop-only 4-stat KPI grid — 'son 7 gün' uniform suffix per design */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          label="Toplam işletme"
          value={totalBusinesses}
          delta={`+${newBusinesses24h} (24s)`}
          deltaKind={newBusinesses24h > 0 ? 'up' : 'neutral'}
          deltaSuffix="son 7 gün"
          icon={<Store size={14} strokeWidth={2} />}
        />
        <StatCard
          label="Aylık MRR"
          value={`₺${mrr.toLocaleString('tr-TR')}`}
          delta={mrrThirtyDaysAgo > 0 ? `${mrrDeltaPct >= 0 ? '+' : ''}${mrrDeltaPct}%` : 'Yeni'}
          deltaKind={mrrDeltaKind}
          deltaSuffix="son 7 gün"
          icon={<CreditCard size={14} strokeWidth={2} />}
          accent="#C6F24E"
        />
        <StatCard
          label="Aktif denemeler"
          value={activeTrials}
          delta="14 gün ort."
          deltaKind="neutral"
          deltaSuffix="son 7 gün"
          icon={<Crown size={14} strokeWidth={2} />}
        />
        <StatCard
          label="Aylık yorum"
          value={monthlyReviews.toLocaleString('tr-TR')}
          delta={`${reviewsDeltaPct >= 0 ? '+' : ''}${reviewsDeltaPct}%`}
          deltaKind={reviewsDeltaKind}
          deltaSuffix="son 7 gün"
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
                  <a
                    href="/admin/restaurants?menuStatus=draft"
                    className="font-medium text-[#0A0A0A] underline-offset-2 hover:underline"
                  >
                    Taslakta bekleyen {menusEnabledCount - menusPublishedCount}
                  </a>
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
