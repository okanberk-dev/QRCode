import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  isAdminRole,
  verifyAdminTokenForLayout,
  verifyJwt,
  verifyUserTokenForLayout,
  type PanelActor,
} from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getScopedRestaurantIds, getTeamMemberRole } from '@/lib/panel-access';
import UserDashboardShell from '@/components/dashboard/UserDashboardShell';
import type { DashboardAnnouncement } from '@/components/dashboard/AnnouncementBanner';
import type { Locale } from '@/lib/translations';
import { getSiteSettings } from '@/lib/site-settings';

export const dynamic = 'force-dynamic';

// Stage 25 §38.101 Phase A #3 — process-local cache.
// Owner shell + admin shell her ikisi de aktif duyuruları fetch ediyordu;
// duyuru create/edit/delete frequency çok düşük. The cache is per serverless
// instance, so an admin save in /admin cannot clear it here (the old comment
// promised a `clearAnnouncementsCache()` that never existed). Keep the TTL
// short instead: an archived/critical announcement disappears from owner
// panels within a minute, while a cold query (take 5) stays cheap.
const ANNOUNCEMENTS_CACHE_TTL_MS = 60 * 1000;
const announcementsCache = new Map<Locale, { data: DashboardAnnouncement[]; expiresAt: number }>();

async function fetchActiveAnnouncements(locale: Locale): Promise<DashboardAnnouncement[]> {
  // Stage 25 §38.101 Phase A #3 — cache hit
  const cached = announcementsCache.get(locale);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  try {
    const now = new Date();
    const rows = await prisma.announcement.findMany({
      where: {
        status: 'published',
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: now } }] },
          { OR: [{ endDate: null }, { endDate: { gte: now } }] },
          { OR: [{ locale: 'all' }, { locale }] },
        ],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 5,
    });
    const data: DashboardAnnouncement[] = rows.map((a) => ({
      id: a.id,
      title: a.title,
      message: a.message,
      severity: a.severity as DashboardAnnouncement['severity'],
      priority: a.priority,
      ctaText: a.ctaText,
      ctaLink: a.ctaLink,
      isDismissible: a.isDismissible,
      updatedAt: a.updatedAt.toISOString(),
    }));
    announcementsCache.set(locale, { data, expiresAt: Date.now() + ANNOUNCEMENTS_CACHE_TTL_MS });
    return data;
  } catch (error) {
    console.error('[DashboardLayout announcements]', error);
    return [];
  }
}

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === 'en' ? 'en' : 'tr';
  const cookieStore = await cookies();

  // Admin bypass: superadmin/manager reach the menu builder and other owner
  // dashboard pages via /admin/restaurants/[id]/menu -> this route. They have
  // an admin_token (not a user_token), so we let them through with a thin
  // "Admin görünümü" bar instead of the owner shell. The underlying APIs
  // gate on requireRestaurantAccess which already allows these roles.
  //
  // CLAUDE.md §38 audit-api-401 — use the staleness-aware verifier so a
  // password-rotated admin token doesn't render this branch only for every
  // API call to 401.
  //
  // "Owner gibi gör" (impersonation) keeps admin_token alive next to a
  // user_token carrying an `impersonating` claim. Checking admin_token first
  // sent impersonating admins to this thin admin bar: no owner shell, no
  // sidebar and — worst — no ImpersonationBanner, so there was no countdown
  // and no "Çıkış". The API layer already prefers the impersonated actor
  // (getPanelActorFromRequest §38.238); the layout now matches it. The
  // session itself is re-validated on every API call, and the banner's
  // actor-context fetch fails closed if it has ended.
  const adminToken = cookieStore.get('admin_token')?.value;
  const userTokenPeek = cookieStore.get('user_token')?.value;
  const peekPayload = userTokenPeek ? await verifyJwt(userTokenPeek) : null;
  const isImpersonating =
    !!peekPayload &&
    typeof peekPayload.impersonating === 'object' &&
    peekPayload.impersonating !== null;
  if (adminToken && !isImpersonating) {
    const adminPayload = await verifyAdminTokenForLayout(adminToken);
    if (adminPayload && isAdminRole(adminPayload.role)) {
      return (
        <div className="min-h-dvh bg-[#FFFFFF]">
          <div className="border-b border-[#EDEDED] bg-[#0A0A0A] text-white">
            <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-2.5 sm:px-7">
              <p className="text-[11px] pulse-eyebrow">
                {locale === 'en' ? 'Admin view' : 'Admin görünümü'} — {typeof adminPayload.username === 'string' ? adminPayload.username : 'superadmin'}
              </p>
              <Link
                href="/admin/restaurants"
                className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-[10px] pulse-eyebrow text-white transition-colors hover:bg-white/20"
              >
                {locale === 'en' ? '← Admin panel' : '← Admin paneli'}
              </Link>
            </div>
          </div>
          {children}
        </div>
      );
    }
  }

  const token = cookieStore.get('user_token')?.value;

  if (!token) {
    redirect(`/${locale}/auth/login`);
  }

  // CLAUDE.md §38 audit-api-401 — full session check (matches API
  // `getUserFromRequest`). Bare `verifyJwt` previously admitted tokens
  // whose UserSession was revoked (logout-elsewhere, password reset,
  // post-Stage-19 missing row) — APIs rejected them and the user
  // bounced between rendering and 401 spam.
  const payload = await verifyUserTokenForLayout(token);
  if (!payload || typeof payload.userId !== 'string') {
    redirect(`/${locale}/auth/login`);
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      name: true,
      email: true,
      plan: true,
      trialEndsAt: true,
      createdAt: true,
      isActive: true,
      role: true,
    },
  });

  if (!user || !user.isActive) {
    redirect(`/${locale}/auth/login`);
  }

  const isTrialExpired = user.plan === 'trial' && user.trialEndsAt && user.trialEndsAt < new Date();
  if (isTrialExpired) {
    redirect(`/${locale}/pricing?trial=expired`);
  }

  // §22 franchise destekli scope — sidebar workspace switcher + downstream
  // page'ler doğru subset görür. Owner kendi sahip olduğu tüm restoranları,
  // team_member (franchise area manager) `TeamMember.locations` array'indeki
  // alt-küme'yi görür. Eski flat `prisma.user.findUnique({ restaurants })`
  // pattern owner-only data dönüyordu; team_member için ya boş ya da
  // owner-blind IDOR riski yaratıyordu (envanter notlarına bkz).
  const actor: PanelActor = {
    id: user.id,
    role: user.role || 'restaurant_owner',
    restaurantId: null,
    username: null,
    email: user.email,
    plan: user.plan,
    source: 'user',
  };
  // §22 viewer-mode UI gating — team_member ise TeamMember.role'u çek;
  // owner için null döner (gating uygulanmaz). Helper Owner/admin/manager için
  // erken return ile DB hit yapmaz. `getScopedRestaurantIds` ile paralel
  // (ikisi de team_member için kısa findFirst/findMany; owner için biri
  // findMany biri no-op — Promise.all güvenli).
  const [scopedIds, teamRole] = await Promise.all([
    getScopedRestaurantIds(actor),
    getTeamMemberRole(actor),
  ]);
  const viewerMode = teamRole === 'viewer';
  const restaurants =
    scopedIds && scopedIds.length > 0
      ? await prisma.restaurant.findMany({
          where: { id: { in: scopedIds } },
          select: {
            id: true,
            name: true,
            slug: true,
            category: true,
            primaryColor: true,
            isActive: true,
            menuEnabled: true,
            externalPlatformsEnabled: true,
            _count: { select: { feedbacks: true } },
          },
          orderBy: { createdAt: 'asc' },
          take: 50,
        })
      : [];

  const announcements = await fetchActiveAnnouncements(locale);
  const { logoUrl } = await getSiteSettings();
  const totalFeedbacks = restaurants.reduce((sum, r) => sum + r._count.feedbacks, 0);

  return (
    <UserDashboardShell
      locale={locale}
      announcements={announcements}
      logoUrl={logoUrl}
      viewerMode={viewerMode}
      user={{
        name: user.name,
        email: user.email,
        plan: user.plan,
        trialEndsAt: user.trialEndsAt?.toISOString() || null,
      }}
      workspace={{
        primaryName: restaurants[0]?.name ?? null,
        locationCount: restaurants.length,
        feedbackCount: totalFeedbacks,
        restaurants: restaurants.map((restaurant) => ({
          id: restaurant.id,
          name: restaurant.name,
          slug: restaurant.slug,
          category: restaurant.category,
          primaryColor: restaurant.primaryColor,
          isActive: restaurant.isActive,
          menuEnabled: restaurant.menuEnabled,
          externalPlatformsEnabled: restaurant.externalPlatformsEnabled,
          feedbackCount: restaurant._count.feedbacks,
        })),
      }}
    >
      {children}
    </UserDashboardShell>
  );
}
