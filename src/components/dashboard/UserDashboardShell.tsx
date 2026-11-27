'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import Link from '@/components/navigation/IntentLink';
import { useIdlePrefetch } from '@/components/navigation/useIdlePrefetch';
import nextDynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { BarChart3, Bell, BookOpen, ClipboardCheck, ClipboardList, CreditCard, Gift, Headset, LayoutDashboard, LogOut, MessageSquareText, Plug, Plus, QrCode, Store, UserCircle, UtensilsCrossed, Wrench, UsersRound } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import AnnouncementBanner, { type DashboardAnnouncement } from './AnnouncementBanner';
import TrialBanner from './TrialBanner';
import ImpersonationBanner from './ImpersonationBanner';
import BuazeLogo from '@/components/marketing/BuazeLogo';
import BusinessSwitcher from './BusinessSwitcher';
import ViewportMount from '@/components/ui/ViewportMount';
import { SearchTrigger } from '@/components/panel/search/SearchTrigger';
import { PanelTopNav, type PanoNavEntry } from '@/components/panel/pano/PanelTopNav';
import { PanelMobileNav } from '@/components/panel/pano/PanelMobileNav';
import { PanelRail, type RailSection } from '@/components/panel/pano/PanelRail';
import { detectSector } from '@/lib/sector-platforms';
import { getSectorByLabel } from '@/lib/sectors';
import {
  ACTIVE_BUSINESS_STORAGE_KEY,
  resolveActiveRestaurantId,
  setRestaurantParam,
} from '@/lib/active-business';

// CLAUDE.md §38.100 — Mobile RES (Real Experience Score) iyileştirmesi.
// NotificationBell + CommandPalette interactive bileşenler — initial dashboard
// render'ında critical path'te değiller (Bell click + Cmd+K shortcut sonrası
// mount eder). next/dynamic({ssr: false}) ile JS chunk'ı bölerek INP/FCP
// kazancı sağlar. Skeleton placeholder yok çünkü iconlar default state'de
// görünmez/no-op olarak çalışır (Bell badge mount sonrası refetch olur).
const NotificationBell = nextDynamic(() => import('@/components/notifications/NotificationBell'), {
  ssr: false,
  loading: () => (
    <span
      aria-hidden="true"
      className="bz-btn-icon"
      style={{ width: 32, height: 32 }}
    />
  ),
});
const CommandPalette = nextDynamic(() => import('@/components/dashboard/CommandPalette'), {
  ssr: false,
  // No loading placeholder — palette mount only after Cmd+K trigger; absent
  // until interactive.
});

interface DashboardUser {
  name: string | null;
  email: string;
  plan: string;
  trialEndsAt: string | null;
}

interface DashboardWorkspace {
  primaryName: string | null;
  locationCount: number;
  feedbackCount: number;
  restaurants?: Array<{
    id: string;
    name: string;
    slug: string;
    category: string;
    primaryColor: string;
    isActive: boolean;
    menuEnabled: boolean;
    externalPlatformsEnabled: boolean;
    feedbackCount: number;
  }>;
}

interface UserDashboardShellProps {
  locale: Locale;
  user: DashboardUser;
  workspace?: DashboardWorkspace;
  announcements?: DashboardAnnouncement[];
  logoUrl?: string | null;
  /**
   * §22 viewer-mode — `TeamMember.role='viewer'` ise true. Topbar altında
   * kalıcı "Sadece okuma" banner'ı görünür; downstream sayfalar (restaurants
   * list, feedbacks, vb.) bu flag ile write button'larını gizler. Backend
   * `canWriteFeedback`/`canWriteRestaurant` zaten reddediyor — UI sync.
   */
  viewerMode?: boolean;
  /** Team members cannot create businesses — hides "Yeni işletme". */
  canAddBusiness?: boolean;
  /**
   * The user_token carries an `impersonating` claim (known server-side in the
   * layout). Only then can `/api/account/actor-context` return a
   * `realAdminId`, so the banner — and its fetch — mount only in that case.
   */
  isImpersonating?: boolean;
  /**
   * Businesses for the Cmd+K palette: the active ones in scope, newest first,
   * at most 20 — the same list `GET /api/restaurants` returned to the palette
   * on every open, resolved once by the layout instead.
   */
  paletteRestaurants?: Array<{ id: string; name: string; slug: string; category: string; primaryColor?: string | null }>;
  /** §57 — secondary tools shown in the menu (feature-visibility). */
  tools?: { surveys: boolean; audits: boolean };
  children: React.ReactNode;
}

function getDaysLeft(trialEndsAt: string | null) {
  if (!trialEndsAt) return null;
  const now = new Date();
  const end = new Date(trialEndsAt);
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}


// The menu builder lives under the business it edits
// (`/restaurants/<id>/menu[/analytics]`), but in the navigation it belongs to
// "Menü", not "İşletmeler".
const MENU_BUILDER_REST_RE = /^\/restaurants\/[^/]+\/menu(\/|$)/;

// Shell-resolved active business, published for client pages whose own data
// fetch would otherwise run before the shell has put `?restaurantId` in the
// URL (child effects run before the shell's). `undefined` = no owner shell
// mounted; `null` = the workspace has no active business.
let ownerShellActiveRestaurantId: string | null | undefined;

export function getOwnerShellActiveRestaurantId(): string | null | undefined {
  return ownerShellActiveRestaurantId;
}

export default function UserDashboardShell({ locale, user, workspace, announcements = [], logoUrl, viewerMode = false, canAddBusiness = true, isImpersonating = false, paletteRestaurants, tools, children }: UserDashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  // §38.58 — Faturalama nav item href'i `?section=billing` query taşır
  // (Account içinde billing subtab'a deeplink). Active state hesabı search
  // param'ı tüketir; aksi halde Account ve Faturalama her ikisi de active
  // görünür (aynı pathname).
  const searchParams = useSearchParams();
  const workspaceRestaurants = useMemo(
    () => workspace?.restaurants?.filter((restaurant) => restaurant.isActive) ?? [],
    [workspace?.restaurants],
  );
  const queryRestaurantId = searchParams.get('restaurantId') ?? searchParams.get('restaurant');
  // `/restaurants/<id>/…` pages are about the business in the path. That id
  // must win over `?restaurantId` and the remembered business, otherwise the
  // topbar showed business A while the page edited business B.
  // `/restaurants/new` (create-business form) is a reserved segment, not an
  // id — switching business there must keep the form and only update the query.
  const pathRestaurantIdRaw =
    pathname?.match(
      new RegExp(`^/${locale}/dashboard/restaurants/(?!new(?:/|$))([^/]+)`),
    )?.[1] ?? null;
  const pathRestaurantId =
    pathRestaurantIdRaw && workspaceRestaurants.some((restaurant) => restaurant.id === pathRestaurantIdRaw)
      ? pathRestaurantIdRaw
      : null;
  const [activeRestaurantId, setActiveRestaurantId] = useState<string | null>(() =>
    resolveActiveRestaurantId({
      restaurants: workspaceRestaurants,
      queryRestaurantId: pathRestaurantId ?? queryRestaurantId,
      storedRestaurantId: null,
    }),
  );
  const activeRestaurant = useMemo(
    () => workspaceRestaurants.find((restaurant) => restaurant.id === activeRestaurantId) ?? null,
    [workspaceRestaurants, activeRestaurantId],
  );
  const isClinicMode = activeRestaurant ? detectSector(activeRestaurant.category) === 'clinic' : false;
  // The dashboard root (`/{locale}/dashboard`) is a prefix of every panel
  // route, so prefix matching would light "Panel" up on every page next to
  // the real item. The root matches exactly; everything else matches itself
  // and its sub-routes.
  const dashboardRootHref = `/${locale}/dashboard`;
  // The menu builder (`/restaurants/<id>/menu…`) lights up "Menü"; "İşletmeler"
  // keeps it only in clinic mode, where there is no menu entry to light.
  const onMenuBuilder =
    !!pathname && !isClinicMode && MENU_BUILDER_REST_RE.test(pathname.slice(dashboardRootHref.length));
  const isPathActive = (href: string): boolean => {
    if (!pathname) return false;
    if (href === dashboardRootHref) return pathname === href;
    if (onMenuBuilder) {
      if (href === `${dashboardRootHref}/menu`) return true;
      if (href === `${dashboardRootHref}/restaurants`) return false;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };
  const [paletteOpen, setPaletteOpen] = useState(false);


  // Active business resolution: path id (`/restaurants/<id>/…`) → ?restaurantId
  // → remembered business → first business. Runs as a layout effect so the
  // switcher label and the published scope are correct before paint and
  // before any page's own (passive) fetch effect reads them.
  const resolvedScopeRef = useRef<string | null>(null);
  useLayoutEffect(() => {
    let storedRestaurantId: string | null = null;
    try {
      storedRestaurantId = window.localStorage.getItem(ACTIVE_BUSINESS_STORAGE_KEY);
    } catch {
      /* storage blocked */
    }
    const next =
      pathRestaurantId ??
      resolveActiveRestaurantId({
        restaurants: workspaceRestaurants,
        queryRestaurantId,
        storedRestaurantId,
      });
    resolvedScopeRef.current = next;
    ownerShellActiveRestaurantId = next;
    setActiveRestaurantId(next);
    try {
      if (next) window.localStorage.setItem(ACTIVE_BUSINESS_STORAGE_KEY, next);
      else window.localStorage.removeItem(ACTIVE_BUSINESS_STORAGE_KEY);
    } catch {
      /* storage blocked */
    }
  }, [workspaceRestaurants, queryRestaurantId, pathRestaurantId]);

  useEffect(() => () => {
    ownerShellActiveRestaurantId = undefined;
  }, []);

  // Keep ?restaurantId in the URL in sync so server pages render the same
  // business the shell shows.
  useEffect(() => {
    const next = resolvedScopeRef.current;
    if (!next || !pathname || !isBusinessScopedHref(pathname)) return;
    // On `/restaurants/<id>/…` the path is the source of truth and no page
    // there reads the query — only fix a query that contradicts the path.
    if (pathRestaurantIdRaw && (!queryRestaurantId || !pathRestaurantId)) return;
    if (queryRestaurantId === next) return;
    const nextSearch = setRestaurantParam(searchParams.toString(), next);
    const nextUrl = nextSearch ? `${pathname}?${nextSearch}` : pathname;
    // Without ?restaurantId every business-scoped server page already rendered
    // the first active business — the same one `next` is when nothing else
    // (a remembered business) picked another. Then only the address bar needs
    // the param: the native History API updates it (Next syncs
    // useSearchParams) without rendering the page a second time on the
    // server. Customers is the exception: its default is "all businesses".
    const customersHref = `/${locale}/dashboard/customers`;
    const serverAlreadyShowsNext =
      !queryRestaurantId &&
      next === workspaceRestaurants[0]?.id &&
      pathname !== customersHref &&
      !pathname.startsWith(`${customersHref}/`);
    if (serverAlreadyShowsNext) {
      // Deferred to the next task: on a hard load this effect runs in the
      // hydration commit before the AppRouter's own effect patches
      // window.history (child effects run first). The unpatched call would
      // replace Next's history state (`__NA` + tree) with null — the router
      // then ignores Back to this entry — and useSearchParams would not see
      // the param. Skipped when the page or its query changed meanwhile.
      const timer = window.setTimeout(() => {
        if (window.location.pathname !== pathname) return;
        const current = window.location.search.replace(/^\?/, '');
        const params = new URLSearchParams(current);
        if (params.get('restaurantId') || params.get('restaurant')) return;
        const search = setRestaurantParam(current, next);
        window.history.replaceState(null, '', search ? `${pathname}?${search}` : pathname);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    router.replace(nextUrl, { scroll: false });
    // Effect intentionally re-runs only when the workspace list, the
    // ?restaurantId query or the path business changes. pathname/
    // searchParams/router are point-in-time reads — adding them would re-fire
    // on every navigation and conflict with the router.replace() this effect
    // issues (potential loop).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceRestaurants, queryRestaurantId, pathRestaurantId]);


  const isBusinessScopedHref = (href: string) => {
    const [hrefPath] = href.split('?');
    const base = `/${locale}/dashboard`;
    if (hrefPath === base) return true;
    return [
      `${base}/feedbacks`,
      `${base}/google-reviews`,
      `${base}/analytics`,
      `${base}/customers`,
      `${base}/surveys`,
      `${base}/audits`,
      `${base}/loyalty`,
      `${base}/qr`,
      `${base}/menu`,
      `${base}/restaurants`,
      `${base}/platforms`,
    ].some((prefix) => hrefPath === prefix || hrefPath.startsWith(`${prefix}/`));
  };

  const hrefWithActiveRestaurant = (href: string) => {
    if (!activeRestaurantId || !isBusinessScopedHref(href)) return href;
    const [hrefPath, hrefQuery = ''] = href.split('?');
    // "Menü" opens the active business's menu builder directly; there is no
    // business picker in between (CLAUDE.md §49). Active state still matches
    // on the item's own `/dashboard/menu` href (see `onMenuBuilder`).
    if (hrefPath === `/${locale}/dashboard/menu`) {
      return `/${locale}/dashboard/restaurants/${activeRestaurantId}/menu`;
    }
    const nextSearch = setRestaurantParam(hrefQuery, activeRestaurantId);
    return nextSearch ? `${hrefPath}?${nextSearch}` : hrefPath;
  };

  // §56 — sidebar links prefetch on intent (IntentLink); the most used
  // sections are prefetched once the page is idle, one by one.
  useIdlePrefetch(
    ['', '/feedbacks', '/google-reviews', '/analytics']
      .map((p) => hrefWithActiveRestaurant(`/${locale}/dashboard${p}`))
      .filter((href) => href.split('?')[0] !== pathname),
  );

  const selectRestaurantScope = (restaurantId: string) => {
    setActiveRestaurantId(restaurantId);
    ownerShellActiveRestaurantId = restaurantId;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(ACTIVE_BUSINESS_STORAGE_KEY, restaurantId);
      } catch {
        /* storage blocked */
      }
      window.dispatchEvent(
        new CustomEvent('buaze:active-restaurant-change', {
          detail: { restaurantId },
        }),
      );
    }
    let currentPath = pathname || `/${locale}/dashboard`;
    // On a business's own page (settings, menu builder…) switching business
    // opens the same page for the newly picked business.
    if (pathRestaurantIdRaw) {
      currentPath = currentPath.replace(
        `/${locale}/dashboard/restaurants/${pathRestaurantIdRaw}`,
        `/${locale}/dashboard/restaurants/${restaurantId}`,
      );
    }
    const nextSearch = setRestaurantParam(searchParams.toString(), restaurantId);
    router.push(nextSearch ? `${currentPath}?${nextSearch}` : currentPath, { scroll: false });
  };

  const trialDaysLeft = getDaysLeft(user.trialEndsAt);

  // /dashboard/guide her zaman görünür. Eski "ilk 30 gün" mantığı
  // `user.createdAt` prop'una bağlıydı; layout.tsx kullanıcı tarafından
  // basitleştirildi (createdAt prop pass etmiyor) → sidebar entry kalıcı.
  const showGuide = true;
  // §57 — surveys / audits in "Araçlar"; decided from live usage below.
  const showSurveys = tools?.surveys ?? true;
  const showAudits = tools?.audits ?? true;

  // Cmd/Ctrl+K toggles the command palette anywhere in the dashboard.
  // We listen on window since the user may not have a focused input.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const copy = useMemo(() => {
    const isTr = locale === 'tr';
    return {
      dashboard: isTr ? 'Panel' : 'Dashboard',
      feedbacks: isClinicMode ? (isTr ? 'Hasta geri bildirimleri' : 'Patient feedback') : (isTr ? 'Yorumlar' : 'Reviews'),
      googleReviews: isTr ? 'Google Yorumları' : 'Google Reviews',
      analytics: isTr ? 'Analitik' : 'Analytics',
      restaurants: isClinicMode ? (isTr ? 'Klinikler' : 'Clinics') : (isTr ? 'İşletmeler' : 'Locations'),
      qr: 'QR',
      menu: isClinicMode ? (isTr ? 'Hizmetler' : 'Services') : (isTr ? 'Menü' : 'Menu'),
      integrations: isTr ? 'Platform bağlantıları' : 'Platform links',
      guide: isTr ? 'Kılavuz' : 'Guide',
      account: isTr ? 'Hesabım' : 'Account',
      logout: isTr ? 'Çıkış' : 'Logout',
      plan: isTr ? 'Plan' : 'Plan',
      trialLeft: isTr ? 'gün kaldı' : 'days left',
      more: isTr ? 'Daha fazla' : 'More',
      customers: isClinicMode ? (isTr ? 'Hastalar' : 'Patients') : (isTr ? 'Müşteriler' : 'Customers'),
      platforms: isTr ? 'Platform bağlantıları' : 'Platform links',
      announcements: isTr ? 'Duyurular' : 'Announcements',
      notifications: isTr ? 'Bildirimler' : 'Notifications',
      // Stage 98 — Surveys (CLAUDE.md §42). Anketler nav entry,
      // CRM group altında Customers/Analytics komşuluğunda.
      surveys: isTr ? 'Anketler' : 'Surveys',
      // CLAUDE.md §42 Phase 2 — Audit Center. CRM group altında surveys
      // komşusu (her ikisi de structured form-based veri toplama; audit
      // internal team-side, survey customer-side).
      audits: isTr ? 'Denetim Merkezi' : 'Audit Center',
      // CLAUDE.md §60 — stamp / points card for restaurants, cafés, barbers.
      loyalty: isTr ? 'Sadakat kartı' : 'Loyalty card',
      groupSetup: isTr ? 'Yapılandırma' : 'Setup',
      groupInsight: isTr ? 'İçgörü' : 'Insight',
      groupInfo: isTr ? 'Bilgi' : 'Info',
      workspace: isTr ? 'BUAZE PANELİ' : 'BUAZE PANEL',
      chooseBusiness: isTr ? 'İşletme değiştir' : 'Switch business',
    };
  }, [locale, isClinicMode]);

  // Sidebar navigation — keep the daily entry point flat, then collapse
  // related pages into operational groups so the sidebar stays compact.
  type LucideIcon = typeof LayoutDashboard;
  type NavItem = { type: 'item'; href: string; icon: LucideIcon; label: string; badge?: number };
  // §38.56 — `isNew` opsiyonel: tasarım a/shell.jsx Kampanyalar item'ı "Yeni"
  // badge ile gösterir. Tek-shot signal flag, badge text style "lime + 10px".
  type NavChild = { href: string; icon: LucideIcon; label: string; isNew?: boolean };
  type NavGroup = { type: 'group'; id: string; icon: LucideIcon; label: string; children: NavChild[] };
  type Nav = NavItem | NavGroup;

  // §57 — sidebar: seven core entries (the QR → rating → redirect → reply
  // loop and the businesses it runs on), then "Araçlar" for the rest.
  // Account, billing and notifications live in the account menu at the
  // bottom of the sidebar (and Hesabım's own sections).
  const toolItems: NavChild[] = [
    { href: `/${locale}/dashboard/customers`, icon: UsersRound, label: copy.customers },
    ...(!isClinicMode
      ? [{ href: `/${locale}/dashboard/menu`, icon: UtensilsCrossed, label: copy.menu }]
      : []),
    ...(!isClinicMode
      ? [{ href: `/${locale}/dashboard/loyalty`, icon: Gift, label: copy.loyalty }]
      : []),
    ...(showSurveys
      ? [{ href: `/${locale}/dashboard/surveys`, icon: ClipboardList, label: copy.surveys }]
      : []),
    ...(showAudits
      ? [{ href: `/${locale}/dashboard/audits`, icon: ClipboardCheck, label: copy.audits }]
      : []),
    ...(showGuide
      ? [{ href: `/${locale}/dashboard/guide`, icon: BookOpen, label: copy.guide }]
      : []),
  ];
  const navItems: Nav[] = [
    { type: 'item', href: `/${locale}/dashboard`, icon: LayoutDashboard, label: copy.dashboard },
    { type: 'item', href: `/${locale}/dashboard/feedbacks`, icon: MessageSquareText, label: copy.feedbacks },
    { type: 'item', href: `/${locale}/dashboard/qr`, icon: QrCode, label: copy.qr },
    { type: 'item', href: `/${locale}/dashboard/analytics`, icon: BarChart3, label: copy.analytics },
    { type: 'item', href: `/${locale}/dashboard/platforms`, icon: Plug, label: copy.integrations },
    { type: 'item', href: `/${locale}/dashboard/restaurants`, icon: Store, label: copy.restaurants },
    {
      type: 'group',
      id: 'tools',
      icon: Wrench,
      label: locale === 'tr' ? 'Araçlar' : 'Tools',
      children: toolItems,
    },
  ];


  // Business category label. `Restaurant.category` holds the Turkish label
  // ("Restoran"); English pages show the sector's English name.
  const categoryLabel = (category: string) =>
    locale === 'en' ? getSectorByLabel(category)?.display.en ?? category : category;

  const displayName = user.name?.trim() || user.email.split('@')[0];
  const initial = displayName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error', error);
    }
    window.location.href = `/${locale}/auth/login`;
  };

  const locationCount = workspace?.locationCount ?? 0;

  const isTr = locale === 'tr';
  // Google reviews are a tab of the Yorumlar page (ReviewSourceSwitch), so
  // the Yorumlar entry stays active there too.
  const navLink = (href: string) => ({
    href: hrefWithActiveRestaurant(href),
    active:
      isPathActive(href) ||
      (href.endsWith('/dashboard/feedbacks') && isPathActive(`/${locale}/dashboard/google-reviews`)),
  });
  // Pano navigation (docs/design/DASHBOARD_DESIGN.md §5.1): the core pages
  // are pill tabs in the top row, the tools are round buttons in the left
  // rail; the mobile drawer lists everything.
  const panoEntries: PanoNavEntry[] = navItems.map((item) => {
    if (item.type === 'item') {
      const isPlatforms = item.href.endsWith('/platforms');
      const isBusinesses = item.href.endsWith('/restaurants');
      return {
        type: 'link' as const,
        ...navLink(item.href),
        label: item.label,
        icon: item.icon,
        shortLabel: isPlatforms ? (isTr ? 'Platformlar' : 'Platforms') : undefined,
        secondary: isPlatforms || isBusinesses,
      };
    }
    return {
      type: 'group' as const,
      id: item.id,
      label: item.label,
      icon: item.icon,
      children: item.children.map((child) => ({
        ...navLink(child.href),
        label: child.label,
        icon: child.icon,
        isNew: child.isNew,
      })),
    };
  });

  const accountLinks = [
    { href: `/${locale}/dashboard/account`, icon: UserCircle, label: copy.account },
    { href: `/${locale}/dashboard/account?section=billing`, icon: CreditCard, label: isTr ? 'Faturalama' : 'Billing' },
    { href: `/${locale}/dashboard/account?section=notifications`, icon: Bell, label: copy.notifications },
    { href: `/${locale}/help`, icon: BookOpen, label: isTr ? 'Yardım merkezi' : 'Help center' },
  ];
  // Top row: the daily pages. Sidebar: management, tools and account, all
  // with their names visible (folds to icons below 1440px).
  const isManagePage = (href: string) => /\/dashboard\/(platforms|restaurants)(\?|$)/.test(href);
  const topEntries = panoEntries.filter((entry) => entry.type === 'link' && !isManagePage(entry.href));
  const manageItems = panoEntries.flatMap((entry) =>
    entry.type === 'link' && isManagePage(entry.href)
      ? [{ href: entry.href, label: entry.label, icon: entry.icon, active: entry.active }]
      : [],
  );
  const toolSectionItems = panoEntries.flatMap((entry) => (entry.type === 'group' ? entry.children : []));
  const accountSectionItems = [
    { href: `/${locale}/dashboard/account`, label: copy.account, icon: UserCircle, active: pathname === `/${locale}/dashboard/account` },
    { href: `/${locale}/dashboard/account?section=billing`, label: isTr ? 'Faturalama' : 'Billing', icon: CreditCard, active: false },
  ];
  const railSections: RailSection[] = [
    { id: 'manage', label: isTr ? 'Yönetim' : 'Manage', items: manageItems },
    { id: 'tools', label: isTr ? 'Araçlar' : 'Tools', items: toolSectionItems },
    { id: 'account', label: isTr ? 'Hesap' : 'Account', items: accountSectionItems },
  ].filter((section) => section.items.length > 0);
  const helpLabel = isTr ? 'Yardım merkezi' : 'Help center';
  const createQrHref = hrefWithActiveRestaurant(`/${locale}/dashboard/qr?new=1`);
  const railBrand = (
    <Link href={hrefWithActiveRestaurant(`/${locale}/dashboard`)} className="pn-brand" aria-label="Buaze" title="Buaze">
      <BuazeLogo size={40} variant="default" imageUrl={logoUrl} className="shrink-0" />
      <span className="pn-brand-word pn-side-label">buaze</span>
    </Link>
  );
  const brand = (
    <Link href={hrefWithActiveRestaurant(`/${locale}/dashboard`)} className="pn-brand" aria-label="Buaze">
      <BuazeLogo size={34} variant="default" imageUrl={logoUrl} className="shrink-0" />
      <span className="pn-brand-word">buaze</span>
    </Link>
  );
  const switcherCaption = activeRestaurant
    ? detectSector(activeRestaurant.category) === 'clinic'
      ? isTr ? 'Klinik modu' : 'Clinic mode'
      : categoryLabel(activeRestaurant.category)
    : `${locationCount} ${isTr ? 'konum' : 'locations'}`;

  // One orchestrated moment per route (§6): the page rises 8px into place.
  // Web Animations on <main> instead of a keyed wrapper, so nested layouts
  // and page state are never remounted.
  const mainRef = useRef<HTMLElement | null>(null);
  const firstRouteRef = useRef(true);
  useEffect(() => {
    if (firstRouteRef.current) {
      firstRouteRef.current = false;
      return;
    }
    const el = mainRef.current;
    if (!el || typeof el.animate !== 'function') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.animate(
      [
        { opacity: 0, transform: 'translateY(8px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 360, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
    );
  }, [pathname]);

  const desktopActions = (
    <>
      <Link href={createQrHref} className="bz-btn hidden min-h-[46px] xl:inline-flex">
        <Plus size={18} aria-hidden="true" />
        {isTr ? 'QR oluştur' : 'Create QR'}
      </Link>
      {/* Search field from xl, the round button below that. */}
      <SearchTrigger
        locale={locale}
        variant="pill-xl"
        onOpen={() => setPaletteOpen(true)}
      />
      <ViewportMount query="(min-width: 1024px)" fallback={<span aria-hidden className="inline-flex h-[46px] w-[46px] shrink-0" />}>
        <NotificationBell
          locale={locale}
          announcements={announcements}
          panelBase={`/${locale}/dashboard`}
          reviewsHref={hrefWithActiveRestaurant(`/${locale}/dashboard/feedbacks`)}
          notificationsSettingsHref={`/${locale}/dashboard/notifications`}
          restaurantId={activeRestaurantId}
        />
      </ViewportMount>
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger asChild>
          <button type="button" className="pn-avatar-btn" aria-label={`${displayName} — ${isTr ? 'hesap menüsü' : 'account menu'}`}>
            {initial}
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="end" sideOffset={14} collisionPadding={12} className="bz-menu z-[70] min-w-[260px] focus:outline-none">
            <div className="px-3.5 pb-2 pt-2.5">
              <p className="truncate text-[15px] font-medium text-pn-ink">{displayName}</p>
              <p className="truncate text-[13px] text-[#9A9A9A]">{user.email}</p>
            </div>
            <DropdownMenu.Separator className="bz-menu-divider" />
            {accountLinks.map((item) => {
              const Icon = item.icon;
              return (
                <DropdownMenu.Item key={item.href} asChild>
                  <Link href={item.href} className="bz-menu-item">
                    <Icon size={17} aria-hidden="true" />
                    <span className="flex-1 truncate">{item.label}</span>
                  </Link>
                </DropdownMenu.Item>
              );
            })}
            <DropdownMenu.Separator className="bz-menu-divider" />
            <DropdownMenu.Item className="bz-menu-item danger" onSelect={() => void handleLogout()}>
              <LogOut size={17} aria-hidden="true" />
              <span className="flex-1">{copy.logout}</span>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </>
  );

  return (
    // Pano shell: icon rail on the left, pill tabs on top, canvas background.
    // From lg up the page scrolls in its own column under the tabs, so
    // full-height pages (feedback inbox, menu studio) keep their
    // viewport-sized layout (§42.5.1: vertical scroll only, horizontal
    // clipped, stable gutter).
    <div className="bz-panel relative flex min-h-dvh flex-col bg-pn-canvas lg:h-screen lg:overflow-hidden">
      {isImpersonating && <ImpersonationBanner />}
      <a href="#panel-main-content" className="bz-skip-link">
        {isTr ? 'İçeriğe atla' : 'Skip to content'}
      </a>

      <div className="flex min-h-0 flex-1">
      <PanelRail
        brand={railBrand}
        top={
          workspaceRestaurants.length > 0 ? (
            <BusinessSwitcher
              locale={locale}
              variant="sidebar"
              businesses={workspaceRestaurants}
              activeId={activeRestaurantId}
              onSelect={selectRestaurantScope}
              caption={switcherCaption}
              categoryLabel={categoryLabel}
              manageHref={`/${locale}/dashboard/restaurants`}
              newHref={canAddBusiness ? `/${locale}/dashboard/restaurants/new` : null}
            />
          ) : null
        }
        topFolded={
          workspaceRestaurants.length > 0 ? (
            <BusinessSwitcher
              locale={locale}
              variant="collapsed"
              businesses={workspaceRestaurants}
              activeId={activeRestaurantId}
              onSelect={selectRestaurantScope}
              categoryLabel={categoryLabel}
              manageHref={`/${locale}/dashboard/restaurants`}
              newHref={canAddBusiness ? `/${locale}/dashboard/restaurants/new` : null}
            />
          ) : null
        }
        sections={railSections}
        footer={[{ href: `/${locale}/help`, label: helpLabel, icon: Headset, active: false }]}
        ariaLabel={isTr ? 'Yan menü' : 'Side menu'}
        labels={{ fold: isTr ? 'Menüyü daralt' : 'Collapse menu', unfold: isTr ? 'Menüyü genişlet' : 'Expand menu' }}
        newLabel={isTr ? 'Yeni' : 'New'}
      />
      <div className="flex min-w-0 flex-1 flex-col lg:min-h-0">
      <PanelTopNav
        entries={topEntries}
        actions={desktopActions}
        ariaLabel={isTr ? 'Panel menüsü' : 'Panel menu'}
        moreLabel={isTr ? 'Diğer' : 'More'}
        newLabel={isTr ? 'Yeni' : 'New'}
      />

      <PanelMobileNav
        brand={brand}
        entries={panoEntries}
        labels={{
          open: isTr ? 'Menüyü aç' : 'Open menu',
          close: isTr ? 'Menüyü kapat' : 'Close menu',
          dialog: isTr ? 'Panel menüsü' : 'Panel menu',
        }}
        actions={
          <>
            <SearchTrigger locale={locale} variant="icon" onOpen={() => setPaletteOpen(true)} />
            <ViewportMount query="(max-width: 1023.98px)" fallback={<span aria-hidden className="inline-flex h-11 w-11 shrink-0" />}>
              <NotificationBell
                locale={locale}
                announcements={announcements}
                panelBase={`/${locale}/dashboard`}
                reviewsHref={hrefWithActiveRestaurant(`/${locale}/dashboard/feedbacks`)}
                notificationsSettingsHref={`/${locale}/dashboard/notifications`}
                restaurantId={activeRestaurantId}
              />
            </ViewportMount>
          </>
        }
        drawerTop={
          workspaceRestaurants.length > 0 ? (
            <BusinessSwitcher
              locale={locale}
              variant="sidebar"
              businesses={workspaceRestaurants}
              activeId={activeRestaurantId}
              onSelect={selectRestaurantScope}
              caption={switcherCaption}
              categoryLabel={categoryLabel}
              manageHref={`/${locale}/dashboard/restaurants`}
              newHref={canAddBusiness ? `/${locale}/dashboard/restaurants/new` : null}
            />
          ) : null
        }
        drawerFooter={
          <div className="flex flex-col gap-1 border-t border-pn-line pt-4">
            <Link href={createQrHref} className="bz-btn-lime mb-3 w-full">
              <Plus size={18} aria-hidden="true" />
              {isTr ? 'QR oluştur' : 'Create QR'}
            </Link>
            {accountLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="pn-drawer-link">
                  <Icon size={20} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
            <button type="button" onClick={() => void handleLogout()} className="pn-drawer-link text-[#D92D20]">
              <LogOut size={20} aria-hidden="true" />
              {copy.logout}
            </button>
          </div>
        }
      />

      <div className="flex min-w-0 flex-1 flex-col lg:min-h-0 lg:overflow-y-auto lg:overflow-x-hidden lg:[scrollbar-gutter:stable]">
        <main
          ref={mainRef}
          id="panel-main-content"
          tabIndex={-1}
          // `[&>*]:w-full` — page wrappers are `mx-auto max-w-[N]` flex items;
          // without an explicit width they shrank to their content (§42.1).
          className="flex min-h-0 min-w-0 flex-1 flex-col pb-[env(safe-area-inset-bottom,0px)] lg:pt-2 [&>*]:w-full"
        >
          {user.plan === 'trial' && trialDaysLeft !== null && trialDaysLeft <= 7 && (
            <TrialBanner locale={locale} daysLeft={trialDaysLeft} />
          )}
          {viewerMode && (
            <div
              role="status"
              aria-live="polite"
              className="mx-2 mt-2 flex items-center gap-2 rounded-full bg-[#FFFAEB] px-5 py-2.5 text-[13px] text-[#93370D] lg:mx-2"
            >
              <span aria-hidden className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-[#D97706]" />
              <span className="font-medium">{isTr ? 'Sadece okuma yetkin var.' : 'Read-only access.'}</span>
              <span className="text-[#93370D]/80">
                {isTr
                  ? 'Yanıt yazma, atama ve düzenleme işletme sahibi tarafından kapatıldı.'
                  : 'Reply, assign and edit actions are disabled by the workspace owner.'}
              </span>
            </div>
          )}
          {announcements.length > 0 && <AnnouncementBanner announcements={announcements} locale={locale} />}
          {children}
        </main>
      </div>
      </div>
      </div>


      {/* Cmd/Ctrl+K command palette — searchable launcher across pages,
          locations, and reviews. The list of `navItems` here mirrors the
          sidebar nav so the user can jump to any tab without scrolling. */}
      {paletteOpen && (
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          locale={locale}
          base={`/${locale}/dashboard`}
          restaurants={paletteRestaurants}
          canAddBusiness={canAddBusiness}
          scopeHref={hrefWithActiveRestaurant}
          navItems={[
          { href: `/${locale}/dashboard`, label: copy.dashboard, keywords: ['panel', 'dashboard', 'genel'] },
          { href: `/${locale}/dashboard/feedbacks`, label: copy.feedbacks, keywords: ['yorum', 'review', 'feedback', 'inbox'] },
          { href: `/${locale}/dashboard/google-reviews`, label: copy.googleReviews, keywords: ['google', 'yorum', 'review', 'feedback'] },
          { href: `/${locale}/dashboard/qr`, label: copy.qr, keywords: ['qr', 'kod', 'code'] },
          { href: `/${locale}/dashboard/analytics`, label: copy.analytics, keywords: ['analitik', 'rapor', 'analytics', 'report'] },
          { href: `/${locale}/dashboard/restaurants`, label: copy.restaurants, keywords: ['işletme', 'konum', 'lokasyon', 'restoran', 'location'] },
          { href: `/${locale}/dashboard/menu`, label: copy.menu, keywords: ['menü', 'menu', 'ürün', 'item'] },
          { href: `/${locale}/dashboard/platforms`, label: copy.integrations, keywords: ['entegrasyon', 'integration', 'google', 'yemeksepeti', 'getir', 'trendyol', 'platform', 'url'] },
          { href: `/${locale}/dashboard/customers`, label: copy.customers, keywords: ['müşteri', 'customer', 'crm'] },
          ...(!isClinicMode
            ? [{ href: `/${locale}/dashboard/loyalty`, label: copy.loyalty, keywords: ['sadakat', 'damga', 'puan', 'kart', 'ödül', 'loyalty', 'stamp', 'points', 'reward', 'kasa'] }]
            : []),
          // Stage 98 — Surveys command palette (CLAUDE.md §42).
          ...(showSurveys
            ? [{ href: `/${locale}/dashboard/surveys`, label: copy.surveys, keywords: ['anket', 'survey', 'nps', 'soru', 'question', 'feedback'] }]
            : []),
          ...(showAudits
            ? [{ href: `/${locale}/dashboard/audits`, label: copy.audits, keywords: ['denetim', 'audit', 'kontrol', 'checklist'] }]
            : []),
          { href: `/${locale}/dashboard/guide`, label: copy.guide, keywords: ['kılavuz', 'guide', 'help', 'yardım'] },
          { href: `/${locale}/dashboard/account`, label: copy.account, keywords: ['ayar', 'settings', 'profil', 'profile', 'hesap', 'account', 'şifre', 'password', '2fa', 'güvenlik', 'security', 'ekip', 'team', 'kvkk', 'legal', 'bildirim', 'notification'] },
          // §38.58 — Faturalama ayrı palette entry'si (Account base'inden
          // ayrılmış; tasarım a/shell.jsx:125 sidebar nav birebir).
          { href: `/${locale}/dashboard/account?section=billing`, label: locale === 'tr' ? 'Faturalama' : 'Billing', keywords: ['fatura', 'billing', 'invoice', 'plan', 'ödeme', 'payment', 'abonelik', 'subscription'] },
          ]}
        />
      )}
    </div>
  );
}
