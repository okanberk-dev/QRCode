'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import nextDynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { BarChart3, Bell, BookOpen, Building2, Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, ClipboardList, CreditCard, Crown, LayoutDashboard, LogOut, MessageSquareText, MoreHorizontal, Plug, Plus, QrCode, Search, Store, UserCircle, UtensilsCrossed, X, UsersRound } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import AnnouncementBanner, { type DashboardAnnouncement } from './AnnouncementBanner';
import TrialBanner from './TrialBanner';
import ImpersonationBanner from './ImpersonationBanner';
import BuazeLogo from '@/components/marketing/BuazeLogo';
import { PulseSelect } from '@/components/ui';
import ViewportMount from '@/components/ui/ViewportMount';
import { detectSector } from '@/lib/sector-platforms';
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
  children: React.ReactNode;
}

function getDaysLeft(trialEndsAt: string | null) {
  if (!trialEndsAt) return null;
  const now = new Date();
  const end = new Date(trialEndsAt);
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

const TOP_BAR_MAP: Record<string, { breadcrumb: string; title: string } | undefined> = undefined as never;

// §38.72 — Account section deeplink subtitles (?section=billing →
// "PANEL / HESABIM > FATURALAMA"). matchHref helper section query'yi tüketir;
// breadcrumb da aynı param'ı okuyarak alt-section konteksti gösterir.
const ACCOUNT_SECTION_SUFFIX: Record<string, { tr: string; en: string }> = {
  billing: { tr: 'FATURALAMA', en: 'BILLING' },
  notifications: { tr: 'BİLDİRİMLER', en: 'NOTIFICATIONS' },
  profile: { tr: 'PROFİL', en: 'PROFILE' },
  security: { tr: 'GÜVENLİK', en: 'SECURITY' },
  team: { tr: 'EKİP', en: 'TEAM' },
  ai: { tr: 'PULSE AI', en: 'PULSE AI' },
  legal: { tr: 'KVKK & YASAL', en: 'PRIVACY & LEGAL' },
};

function useTopBar(locale: Locale, pathname: string | null, section?: string | null) {
  const isTr = locale === 'tr';
  if (!pathname) return null;
  const rest = pathname.replace(`/${locale}/dashboard`, '') || '/';
  if (rest === '/') return { breadcrumb: isTr ? 'PANEL / GENEL BAKIŞ' : 'PANEL / OVERVIEW', title: isTr ? 'Genel bakış' : 'Overview' };
  if (rest.startsWith('/feedbacks')) return { breadcrumb: isTr ? 'PANEL / YORUMLAR' : 'PANEL / REVIEWS', title: isTr ? 'Yorum gelen kutusu' : 'Review inbox' };
  if (rest.startsWith('/google-reviews')) return { breadcrumb: isTr ? 'PANEL / GOOGLE YORUMLARI' : 'PANEL / GOOGLE REVIEWS', title: isTr ? 'Google\'a Yapılan Yorumlar' : 'Google Reviews' };
  if (rest.startsWith('/qr')) return { breadcrumb: isTr ? 'QR OLUŞTUR / YENİ KAMPANYA' : 'QR / NEW CAMPAIGN', title: isTr ? 'QR kodu oluştur' : 'Create QR code' };
  if (rest.startsWith('/analytics')) return { breadcrumb: isTr ? 'ANALİTİK / GENEL' : 'ANALYTICS / OVERVIEW', title: isTr ? 'Analitik' : 'Analytics' };
  if (rest.startsWith('/restaurants')) return { breadcrumb: isTr ? 'PANEL / İŞLETMELER' : 'PANEL / BUSINESSES', title: isTr ? 'İşletmeler' : 'Businesses' };
  if (rest.startsWith('/menu')) return { breadcrumb: isTr ? 'PANEL / MENÜ' : 'PANEL / MENU', title: isTr ? 'Menü' : 'Menu' };
  if (rest.startsWith('/integrations')) return { breadcrumb: isTr ? 'PANEL / PLATFORM BAĞLANTILARI' : 'PANEL / PLATFORM LINKS', title: isTr ? 'Platform Bağlantıları' : 'Platform Links' };
  if (rest.startsWith('/customers')) return { breadcrumb: isTr ? 'CRM / MÜŞTERİLER' : 'CRM / CUSTOMERS', title: isTr ? 'Müşteriler' : 'Customers' };
  if (rest.startsWith('/platforms')) return { breadcrumb: isTr ? 'PANEL / PLATFORMLAR' : 'PANEL / PLATFORMS', title: isTr ? 'Platform bağlantıları' : 'Review platforms' };
  if (rest.startsWith('/announcements')) return { breadcrumb: isTr ? 'PANEL / DUYURULAR' : 'PANEL / ANNOUNCEMENTS', title: isTr ? 'Duyurular' : 'Announcements' };
  if (rest.startsWith('/guide')) return { breadcrumb: isTr ? 'PANEL / KILAVUZ' : 'PANEL / GUIDE', title: isTr ? 'Kılavuz' : 'Guide' };
  if (rest.startsWith('/account')) {
    // §38.72 — section=X aktifken breadcrumb'a > ALT BAŞLIK ekle.
    const suffix = section ? ACCOUNT_SECTION_SUFFIX[section] : undefined;
    const baseCrumb = isTr ? 'PANEL / HESABIM' : 'PANEL / ACCOUNT';
    return {
      breadcrumb: suffix ? `${baseCrumb} > ${isTr ? suffix.tr : suffix.en}` : baseCrumb,
      title: isTr ? 'Hesabım' : 'Account',
    };
  }
  // /profile redirects to /account; breadcrumb retained for the brief hop.
  if (rest.startsWith('/profile')) return { breadcrumb: isTr ? 'PANEL / HESABIM' : 'PANEL / ACCOUNT', title: isTr ? 'Hesabım' : 'Account' };
  return null;
}

const SIDEBAR_GROUP_STATE_KEY = 'buaze.owner.sidebarGroups';
const SIDEBAR_SCROLL_KEY = 'buaze.owner.sidebarScroll';

function loadGroupState(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(SIDEBAR_GROUP_STATE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
function saveGroupState(state: Record<string, boolean>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SIDEBAR_GROUP_STATE_KEY, JSON.stringify(state));
  } catch {
    /* swallow */
  }
}
function loadSidebarScroll(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.sessionStorage.getItem(SIDEBAR_SCROLL_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}
function saveSidebarScroll(scrollTop: number) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(scrollTop));
  } catch {
    /* swallow */
  }
}

export default function UserDashboardShell({ locale, user, workspace, announcements = [], logoUrl, viewerMode = false, children }: UserDashboardShellProps) {
  void TOP_BAR_MAP;
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
  const [activeRestaurantId, setActiveRestaurantId] = useState<string | null>(() =>
    resolveActiveRestaurantId({
      restaurants: workspaceRestaurants,
      queryRestaurantId,
      storedRestaurantId: null,
    }),
  );
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const workspaceMenuRef = useRef<HTMLDivElement | null>(null);
  const activeRestaurant = useMemo(
    () => workspaceRestaurants.find((restaurant) => restaurant.id === activeRestaurantId) ?? null,
    [workspaceRestaurants, activeRestaurantId],
  );
  const isClinicMode = activeRestaurant ? detectSector(activeRestaurant.category) === 'clinic' : false;
  const matchHref = (href: string): boolean => {
    if (!pathname) return false;
    const [hrefPath, hrefQuery] = href.split('?');
    if (!hrefQuery) {
      return pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
    }
    if (pathname !== hrefPath) return false;
    const expected = new URLSearchParams(hrefQuery);
    for (const [key, value] of expected.entries()) {
      if (searchParams.get(key) !== value) return false;
    }
    return true;
  };
  // Account base item için: query param'sız Account href'i match etsin AMA
  // section=billing aktifken active OLMASIN (Faturalama o anda lime).
  const matchAccountBase = (href: string): boolean => {
    if (!pathname) return false;
    if (!(pathname === href || pathname.startsWith(`${href}/`))) return false;
    return searchParams.get('section') !== 'billing';
  };
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  // §38.158 — Mobile drawer + More sheet açıkken body scroll lock.
  // Önceki davranış: drawer açılınca arka planda main hâlâ scroll
  // edebiliyordu (overlap UX bozulması — kullanıcı drawer ile etkileşim
  // beklerken main scroll olunca kafa karıştırıcı). Modal-tier overlay
  // pattern: `<Modal>` primitive (CLAUDE.md §11.1) zaten body scroll lock
  // uygular; aynı disipline drawer + More sheet için manuel lock.
  // CommandPalette Radix Portal kendi lock'unu yapıyor, gerek yok.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const isModalOpen = drawerOpen || moreOpen;
    if (!isModalOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [drawerOpen, moreOpen]);
  // Drawer state broadcast (CLAUDE.md §40.D Custom Event paterni).
  // Marketing MarketingNavbarClient + admin AdminSidebar ile aynı event
  // ismi (`buaze:mobile-drawer`). Owner panel'in bottom nav'ı aynı
  // component'te olduğu için doğrudan local `drawerOpen` okuyabilir; bu
  // broadcast harici listener'lar (örn. sticky CTA, marketing ribbon
  // overlay) için single channel disiplinini korur.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('buaze:mobile-drawer', { detail: { open: drawerOpen } }),
    );
  }, [drawerOpen]);

  // ESC key closes the mobile drawer + "more" sheet — a11y baseline
  // (CLAUDE.md §23.7 Phase 11.1). Workspace + user dropdown menus zaten
  // kendi ESC handler'larına sahip (line ~330, ~349). Drawer + more
  // sheet için ayrı listener — open state degiştiginde mount/unmount.
  useEffect(() => {
    if (!drawerOpen && !moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (drawerOpen) setDrawerOpen(false);
      if (moreOpen) setMoreOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen, moreOpen]);
  // Stage 60 §38.141 — Mobile bottom nav Yorumlar tab badge.
  // NotificationBell `buaze:notification-count` custom event'i ile
  // sync; tek source-of-truth NotificationBell internal poll. Mobile
  // nav ek fetch yapmaz; aynı /api/notifications poll'u reuse eder.
  const [notifUnreadCount, setNotifUnreadCount] = useState(0);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const expectedBase = `/${locale}/dashboard`;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ base: string; count: number }>).detail;
      if (detail?.base === expectedBase) {
        setNotifUnreadCount(detail.count);
      }
    };
    window.addEventListener('buaze:notification-count', handler);
    return () => window.removeEventListener('buaze:notification-count', handler);
  }, [locale]);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  // Collapsible group state — persists across navigations via localStorage.
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    // Phase 12 — yeni grup ID'leri (general/crm/business/settings) default
    // expanded. Mevcut localStorage stale eski ID'leri ('feedback'/'growth')
    // taşıyabilir; merge ile yeniler de dahil edilir, kullanıcı manuel
    // toggle yaptığında localStorage update olur.
    const loaded = loadGroupState();
    setExpandedGroups({
      general: loaded.general ?? true,
      crm: loaded.crm ?? true,
      business: loaded.business ?? true,
      settings: loaded.settings ?? true,
      ...loaded,
    });
    const collapsed = window.localStorage.getItem('buaze.owner.sidebarCollapsed') === 'true';
    setIsCollapsed(collapsed);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedRestaurantId = window.localStorage.getItem(ACTIVE_BUSINESS_STORAGE_KEY);
    const next = resolveActiveRestaurantId({
      restaurants: workspaceRestaurants,
      queryRestaurantId,
      storedRestaurantId,
    });
    setActiveRestaurantId(next);
    if (next) {
      window.localStorage.setItem(ACTIVE_BUSINESS_STORAGE_KEY, next);
      if (pathname && isBusinessScopedHref(pathname) && queryRestaurantId !== next) {
        const nextSearch = setRestaurantParam(searchParams.toString(), next);
        router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, { scroll: false });
      }
    }
    // Effect intentionally re-runs only when workspace list or ?restaurantId
    // query changes. pathname/searchParams/router are point-in-time reads —
    // adding them would re-fire on every navigation and conflict with the
    // router.replace() this effect issues (potential loop).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceRestaurants, queryRestaurantId]);

  useEffect(() => {
    if (!workspaceMenuOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (workspaceMenuRef.current && !workspaceMenuRef.current.contains(e.target as Node)) {
        setWorkspaceMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setWorkspaceMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [workspaceMenuOpen]);

  // User menu dropdown — outside click + ESC kapatır.
  useEffect(() => {
    if (!userMenuOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [userMenuOpen]);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem('buaze.owner.sidebarCollapsed', String(next));
      return next;
    });
  };
  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      saveGroupState(next);
      return next;
    });
  };
  // Sidebar scroll persistence (sessionStorage; per-tab, survives Next.js
  // navigation). Without this, navigating between groups would let the
  // hydration race reset scrollTop to 0 and bump the active item out of
  // view.
  const navRef = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const target = loadSidebarScroll();
    if (target > 0) el.scrollTop = target;
  }, [pathname]);
  const handleNavClick = () => {
    const el = navRef.current;
    if (el) saveSidebarScroll(el.scrollTop);
    setDrawerOpen(false);
  };

  const isBusinessScopedHref = (href: string) => {
    const [hrefPath] = href.split('?');
    const base = `/${locale}/dashboard`;
    if (hrefPath === base) return true;
    return [
      `${base}/feedbacks`,
      `${base}/google-reviews`,
      `${base}/analytics`,
      `${base}/customers`,
      `${base}/qr`,
      `${base}/menu`,
      `${base}/restaurants`,
      `${base}/platforms`,
    ].some((prefix) => hrefPath === prefix || hrefPath.startsWith(`${prefix}/`));
  };

  const hrefWithActiveRestaurant = (href: string) => {
    if (!activeRestaurantId || !isBusinessScopedHref(href)) return href;
    const [hrefPath, hrefQuery = ''] = href.split('?');
    const nextSearch = setRestaurantParam(hrefQuery, activeRestaurantId);
    return nextSearch ? `${hrefPath}?${nextSearch}` : hrefPath;
  };

  const selectRestaurantScope = (restaurantId: string) => {
    setActiveRestaurantId(restaurantId);
    setWorkspaceMenuOpen(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ACTIVE_BUSINESS_STORAGE_KEY, restaurantId);
      window.dispatchEvent(
        new CustomEvent('buaze:active-restaurant-change', {
          detail: { restaurantId },
        }),
      );
    }
    const currentPath = pathname || `/${locale}/dashboard`;
    const nextSearch = setRestaurantParam(searchParams.toString(), restaurantId);
    router.push(nextSearch ? `${currentPath}?${nextSearch}` : currentPath, { scroll: false });
  };

  const trialDaysLeft = getDaysLeft(user.trialEndsAt);
  // §38.72 — Search param-aware breadcrumb (?section=billing → "> FATURALAMA").
  const activeSection = searchParams.get('section');
  const topBar = useTopBar(locale, pathname, activeSection);

  // /dashboard/guide her zaman görünür. Eski "ilk 30 gün" mantığı
  // `user.createdAt` prop'una bağlıydı; layout.tsx kullanıcı tarafından
  // basitleştirildi (createdAt prop pass etmiyor) → sidebar entry kalıcı.
  const showGuide = true;

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
      feedbacks: isClinicMode ? (isTr ? 'Hasta geri bildirimleri' : 'Patient feedback') : (isTr ? 'Yorumlar' : 'Feedbacks'),
      googleReviews: isTr ? 'Google Yorumları' : 'Google Reviews',
      analytics: isTr ? 'Analitik' : 'Analytics',
      restaurants: isClinicMode ? (isTr ? 'Klinikler' : 'Clinics') : (isTr ? 'İşletmeler' : 'Locations'),
      qr: 'QR',
      menu: isClinicMode ? (isTr ? 'Hizmetler' : 'Services') : (isTr ? 'Menü' : 'Menu'),
      integrations: isTr ? 'Platform Bağlantıları' : 'Platform Links',
      guide: isTr ? 'Kılavuz' : 'Guide',
      account: isTr ? 'Hesabım' : 'Account',
      logout: isTr ? 'Çıkış' : 'Logout',
      plan: isTr ? 'Plan' : 'Plan',
      trialLeft: isTr ? 'gün kaldı' : 'days left',
      more: isTr ? 'Daha fazla' : 'More',
      customers: isClinicMode ? (isTr ? 'Hastalar' : 'Patients') : (isTr ? 'Müşteriler' : 'Customers'),
      platforms: isTr ? 'Platform bağlantıları' : 'Review platforms',
      announcements: isTr ? 'Duyurular' : 'Announcements',
      notifications: isTr ? 'Bildirimler' : 'Notifications',
      // Stage 98 — Surveys (CLAUDE.md §42). Anketler nav entry,
      // CRM group altında Customers/Analytics komşuluğunda.
      surveys: isTr ? 'Anketler' : 'Surveys',
      // CLAUDE.md §42 Phase 2 — Audit Center. CRM group altında surveys
      // komşusu (her ikisi de structured form-based veri toplama; audit
      // internal team-side, survey customer-side).
      audits: isTr ? 'Denetim Merkezi' : 'Audit Center',
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

  // Phase 12 — sidebar nav full reorganize (tasarım .design-pulse-2026
  // shell.jsx GENEL/CRM/AYARLAR paterni). 4 grup: GENEL, CRM, İŞLETME, AYARLAR.
  // Eski grup ID'leri (feedback/growth/business) localStorage stale kalır,
  // yeni ID'ler default expanded (useEffect migration).
  const navItems: Nav[] = [
    {
      type: 'group',
      id: 'general',
      icon: LayoutDashboard,
      label: locale === 'tr' ? 'Genel' : 'General',
      children: [
        { href: `/${locale}/dashboard`, icon: LayoutDashboard, label: copy.dashboard },
        { href: `/${locale}/dashboard/feedbacks`, icon: MessageSquareText, label: copy.feedbacks },
        { href: `/${locale}/dashboard/google-reviews`, icon: MessageSquareText, label: copy.googleReviews },
      ],
    },
    {
      type: 'group',
      id: 'crm',
      icon: UsersRound,
      label: 'CRM',
      // §38.56 — CRM grup: Müşteriler / Analitik / Anketler / Denetim.
      // Müşteri kampanya maili özelliği kaldırıldı (CLAUDE.md §38.241).
      children: [
        { href: `/${locale}/dashboard/customers`, icon: UsersRound, label: copy.customers },
        { href: `/${locale}/dashboard/analytics`, icon: BarChart3, label: copy.analytics },
        // Stage 98 — Surveys nav entry (CLAUDE.md §42). CRM group altında,
        // Customers + Analytics ile aynı bilgi mimarisi (hepsi hedeflenmiş
        // geri bildirim + insight kaynağı).
        {
          href: `/${locale}/dashboard/surveys`,
          icon: ClipboardList,
          label: copy.surveys,
        },
        // §42 Phase 2 — Audit Center entry. Surveys yanında: ikisi de form
        // tabanlı veri toplama. Audit = internal team/ops; survey = customer.
        {
          href: `/${locale}/dashboard/audits`,
          icon: ClipboardCheck,
          label: copy.audits,
        },
      ],
    },
    {
      type: 'group',
      id: 'business',
      icon: Store,
      label: locale === 'tr' ? 'İşletme' : 'Business',
      children: [
        { href: `/${locale}/dashboard/qr`, icon: QrCode, label: copy.qr },
        ...(!isClinicMode
          ? [{ href: `/${locale}/dashboard/menu`, icon: UtensilsCrossed, label: copy.menu }]
          : []),
        { href: `/${locale}/dashboard/restaurants`, icon: Store, label: copy.restaurants },
        // /platforms ve /integrations aynı redirect'e (settings#integrations);
        // tek menü item bırakıldı. Eski /platforms route'u backward-compat.
        { href: `/${locale}/dashboard/platforms`, icon: Plug, label: copy.integrations },
      ],
    },
    {
      type: 'group',
      id: 'settings',
      icon: UserCircle,
      label: locale === 'tr' ? 'Ayarlar' : 'Settings',
      children: [
        // Unified Settings hub: Profile + Security + Notifications + Billing +
        // Team + Legal. Per-restaurant ayarlar /restaurants/[id]/settings'te.
        { href: `/${locale}/dashboard/account`, icon: UserCircle, label: copy.account },
        // §38.58 — Faturalama nav item (tasarım a/shell.jsx:125 birebir).
        // Account içinde billing subtab var; deeplink `?section=billing`
        // ile aktiflik korunur. Tek-tık fatura erişimi (owner aylık ödeme
        // sonrası fatura indirir, profilden geçmek redundant click).
        {
          href: `/${locale}/dashboard/account?section=billing`,
          icon: CreditCard,
          label: locale === 'tr' ? 'Faturalama' : 'Billing',
        },
        // §38.72 — Bildirimler nav item (Faturalama paterni reuse).
        // /dashboard/notifications redirect-only stub; matchHref ile
        // ?section=notifications subtab'ında lime active state korunur.
        // Owner topbar bell icon'una ek olarak sidebar'da net link görür.
        {
          href: `/${locale}/dashboard/account?section=notifications`,
          icon: Bell,
          label: copy.notifications,
        },
        // /guide sadece ilk 30 gün — onboarding sonrası gereksiz.
        ...(showGuide
          ? [{ href: `/${locale}/dashboard/guide`, icon: BookOpen, label: copy.guide }]
          : []),
      ],
    },
  ];

  // Mobile bottom nav: 4 primary tabs + "More" sheet for the rest.
  const bottomNavItems = [
    { href: `/${locale}/dashboard`, icon: LayoutDashboard, label: copy.dashboard },
    { href: `/${locale}/dashboard/feedbacks`, icon: MessageSquareText, label: copy.feedbacks },
    isClinicMode
      ? { href: `/${locale}/dashboard/analytics`, icon: BarChart3, label: copy.analytics }
      : { href: `/${locale}/dashboard/menu`, icon: UtensilsCrossed, label: copy.menu },
    { href: `/${locale}/dashboard/qr`, icon: QrCode, label: copy.qr },
  ];
  const moreSheetItems = [
    { href: `/${locale}/dashboard/google-reviews`, icon: MessageSquareText, label: copy.googleReviews },
    { href: `/${locale}/dashboard/analytics`, icon: BarChart3, label: copy.analytics },
    { href: `/${locale}/dashboard/platforms`, icon: Plug, label: copy.integrations },
    { href: `/${locale}/dashboard/restaurants`, icon: Store, label: copy.restaurants },
    { href: `/${locale}/dashboard/customers`, icon: UsersRound, label: copy.customers },
    // Announcements bottom sheet'ten de kaldırıldı — banner zaten görünür.
    // Guide yalnız ilk 30 gün.
    ...(showGuide
      ? [{ href: `/${locale}/dashboard/guide`, icon: BookOpen, label: copy.guide }]
      : []),
    { href: `/${locale}/dashboard/account`, icon: UserCircle, label: copy.account },
  ];
  const moreActive = moreSheetItems.some(
    (i) => pathname === i.href || pathname?.startsWith(`${i.href}/`),
  );

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

  const primaryName =
    activeRestaurant?.name ??
    workspace?.primaryName ??
    (locale === 'tr' ? 'İşletmen' : 'Your workspace');
  const locationCount = workspace?.locationCount ?? 0;
  const primaryInitial = (activeRestaurant?.name || workspace?.primaryName || displayName).charAt(0).toUpperCase();

  // SidebarContent was previously declared as an inner function component
  // (`const SidebarContent = ({ navRef }) => …`). Every parent re-render
  // produced a fresh function reference, so React treated `<SidebarContent />`
  // as a new component type, *unmounted* the entire <nav>, and remounted it.
  // The remount reset scrollTop to 0 — the user perceived it as "the sidebar
  // jumps every time I click a link." Switching to a render helper that
  // returns JSX (not a component) keeps reconciliation in place: only the
  // active-state classes are diffed and patched.
  const renderSidebar = (forwardedNavRef?: React.MutableRefObject<HTMLElement | null>) => (
    <div className="flex h-full flex-col bg-white text-[#0A0A0A]">
      {/* Logo */}
      <div className="px-4 pt-5 pb-3">
        <Link href={hrefWithActiveRestaurant(`/${locale}/dashboard`)} className="flex items-center gap-2.5">
          <BuazeLogo size={32} variant="default" imageUrl={logoUrl} className="shrink-0" />
          {!isCollapsed && (
            <span
              className="text-[18px] font-medium tracking-[-0.03em] text-[#0A0A0A] leading-none bz-h-tight animate-in fade-in slide-in-from-left-2 duration-300"
            >
              buaze<span className="text-[#C6F24E]">.</span>
            </span>
          )}
        </Link>
      </div>

      {/* Workspace switcher */}
      <div className="relative px-3 pb-3" ref={workspaceMenuRef}>
        <button
          type="button"
          onClick={() => setWorkspaceMenuOpen((open) => !open)}
          aria-expanded={workspaceMenuOpen}
          aria-haspopup="menu"
          className={`flex w-full items-center gap-2.5 rounded-lg border border-[#EDEDED] bg-[#FAFAFA] transition-colors hover:bg-[#F2F2F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] ${isCollapsed ? 'justify-center px-2 py-2' : 'px-3 py-2.5'}`}
          title={isCollapsed ? primaryName : undefined}
        >
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[12px] font-semibold text-[#0A0A0A] bz-h-tight"
            style={{ background: activeRestaurant?.primaryColor || '#C6F24E' }}
          >
            {activeRestaurant ? primaryInitial : <Building2 size={14} strokeWidth={2} />}
          </div>
          {!isCollapsed && (
            <>
              <div className="min-w-0 flex-1 text-left animate-in fade-in slide-in-from-left-2 duration-300">
                <p className="truncate text-[13px] font-semibold text-[#0A0A0A] leading-tight">{primaryName}</p>
                <p className="pulse-eyebrow text-[#525252] mt-0.5">
                  {activeRestaurant
                    ? detectSector(activeRestaurant.category) === 'clinic'
                      ? locale === 'tr' ? 'KLİNİK MODU' : 'CLINIC MODE'
                      : activeRestaurant.category.toUpperCase()
                    : `${locationCount} ${locale === 'tr' ? 'KONUM' : 'LOCATIONS'}`}
                </p>
              </div>
              <ChevronDown
                size={14}
                className={`shrink-0 text-[#737373] transition-transform ${workspaceMenuOpen ? 'rotate-180' : ''}`}
                strokeWidth={2}
              />
            </>
          )}
        </button>

        {workspaceMenuOpen && !isCollapsed && (
          <div
            role="menu"
            className="bz-menu absolute left-3 right-3 top-[calc(100%-10px)] z-50"
          >
            {workspaceRestaurants.map((restaurant) => {
              const selected = restaurant.id === activeRestaurantId;
              const clinic = detectSector(restaurant.category) === 'clinic';
              return (
                <button
                  key={restaurant.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  onClick={() => selectRestaurantScope(restaurant.id)}
                  className={`bz-menu-item ${selected ? 'is-selected' : ''}`}
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold text-[#0A0A0A]"
                    style={{ background: restaurant.primaryColor || '#C6F24E' }}
                  >
                    {restaurant.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-[#0A0A0A]">{restaurant.name}</span>
                    <span className="pulse-eyebrow mt-0.5 block !text-[#A3A3A3]">
                      {clinic ? (locale === 'tr' ? 'KLİNİK' : 'CLINIC') : restaurant.category.toUpperCase()} · {restaurant.feedbackCount}
                    </span>
                  </span>
                  {selected && <Check size={14} strokeWidth={2.4} className="!text-[#A8D62E]" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* §38.59 — Sidebar search button kaldırıldı (kullanıcı kararı). Cmd+K
          palette hâlâ topbar'da + global keyboard shortcut ile erişilebilir;
          sidebar görsel sadeleşti. Eski search button kapsamı: paletteOpen
          state intact, sadece sidebar tetikleyicisi UI'dan çıkarıldı. */}

      {/* Primary CTA — "QR oluştur" (kullanıcı talebi, eski "Yorum İste"
          §38.39'dan rename). href intact (/dashboard/qr?new=1) — yeni
          wizard'ı doğrudan açmak için query flag taşır. .bz-side-cta +
          --mini Phase 1'den. */}
      <div className="px-3 pb-3">
        <Link
          href={hrefWithActiveRestaurant(`/${locale}/dashboard/qr?new=1`)}
          className={`bz-side-cta ${isCollapsed ? 'bz-side-cta--mini' : ''}`}
          title={isCollapsed ? (locale === 'tr' ? 'QR oluştur' : 'Create QR') : undefined}
          onClick={handleNavClick}
        >
          <Plus size={14} strokeWidth={2.2} />
          <span>{locale === 'tr' ? 'QR oluştur' : 'Create QR'}</span>
        </Link>
      </div>

      {/* Nav */}
      <nav
        ref={forwardedNavRef as React.RefObject<HTMLElement>}
        className="flex-1 space-y-0.5 overflow-y-auto px-3 py-1"
        aria-label={copy.dashboard}
      >
        {navItems.map((item, idx) => {
          // Subtle divider between flat items and the first group (visual
          // boundary between daily-core and grouped sections).
          const showDividerBefore =
            idx > 0 && item.type === 'group' && navItems[idx - 1]?.type === 'item';

          if (item.type === 'item') {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={hrefWithActiveRestaurant(item.href)}
                onClick={handleNavClick}
                aria-current={isActive ? 'page' : undefined}
                /* §38.65 — Apple HIG sidebar item polish: bz-motion-spring
                   200ms cubic-bezier easing + transform-friendly transition.
                   Önceki `transition-colors` only → renk değişimi sade ama
                   subtle motion yok. Now: hover'da bg + color + (active hariç)
                   text shift smooth animate olur. Lift `bz-lift` kasıtlı
                   eklenmedi — sidebar item'lar nav-link, lift hareket distract
                   eder; CTA + kartlar için saklı. */
                className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium bz-motion-spring ${
                  isActive
                    ? 'bg-[#0A0A0A] text-white font-semibold before:absolute before:left-[-12px] before:top-1.5 before:bottom-1.5 before:w-[3px] before:bg-[#C6F24E] before:rounded-r-sm'
                    : 'text-[#525252] hover:bg-[#F2F2F2] hover:text-[#0A0A0A]'
                }`}
              >
                <Icon size={16} strokeWidth={2} className="shrink-0" />
                {!isCollapsed && <span className="flex-1 truncate animate-in fade-in slide-in-from-left-2 duration-300">{item.label}</span>}
                {item.badge !== undefined && item.badge !== 0 && (
                  <span
                    className="text-[10px] font-semibold rounded-full px-2 py-0.5 bz-mono tabular-nums"
                    style={{
                      background: isActive ? 'rgba(198,242,78,0.22)' : '#F2F2F2',
                      color: isActive ? '#C6F24E' : '#737373',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          }

          // Group: collapsible parent with auto-expand when active route
          // lives in one of its children.
          // §38.59 — childActive mantığı matchHref ile genişledi:
          //   eski `pathname.startsWith(c.href)` Faturalama gibi query-string
          //   taşıyan child'ları (?section=billing) match edemiyordu →
          //   group expansion broken. matchHref helper Faturalama deeplink'i
          //   ve Account base ayrımını doğru handle eder.
          const Icon = item.icon;
          const childActive = item.children.some((c) => {
            const cHasQuery = c.href.includes('?');
            const cIsAccountBase = c.href.endsWith('/dashboard/account');
            if (cHasQuery) return matchHref(c.href);
            if (cIsAccountBase) return matchAccountBase(c.href);
            return pathname === c.href || pathname?.startsWith(`${c.href}/`);
          });
          const isExpanded = childActive || expandedGroups[item.id] === true;
          return (
            <div key={item.id}>
              {showDividerBefore && (
                <div aria-hidden className="my-2 mx-3 h-px bg-[#EDEDED]" />
              )}
              <button
                type="button"
                onClick={() => toggleGroup(item.id)}
                // §38.59 — Parent group button active highlight kaldırıldı:
                //   eski `childActive ? bg-[#F2F2F2]` → child item siyah zeminli
                //   ve parent group da gri — kullanıcı 2 menü "seçili" hissi
                //   yaşadı. Şimdi parent group sadece chevron rotate + child
                //   reveal animation; tek "active" görünüm child item'da.
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-[#525252] transition-colors hover:bg-[#F2F2F2] hover:text-[#0A0A0A]"
                aria-expanded={isExpanded}
              >
                <Icon size={16} strokeWidth={2} className="shrink-0" />
                {!isCollapsed && (
                  <>
                    <span
                      className="flex-1 truncate text-left text-[10.5px] font-mono uppercase tracking-[0.14em] animate-in fade-in slide-in-from-left-2 duration-300"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {item.label}
                    </span>
                    <ChevronRight
                      size={14}
                      strokeWidth={2}
                      className={`text-[#737373] transition-transform duration-200 ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    />
                  </>
                )}
              </button>
              {/* Smooth expand/collapse — grid-template-rows trick lets us
                  animate `0fr → 1fr` even though the inner content has no
                  fixed height. Falls back to instant render on browsers
                  without grid-fr animation support (rare in 2026). */}
              <div
                className="grid transition-[grid-template-rows,opacity] duration-200 ease-out"
                style={{
                  gridTemplateRows: (!isCollapsed && isExpanded) ? '1fr' : '0fr',
                  opacity: (!isCollapsed && isExpanded) ? 1 : 0,
                }}
                aria-hidden={isCollapsed || !isExpanded}
              >
                <div className="overflow-hidden">
                  <div className="mt-1 ml-5 space-y-0.5 border-l border-[#EDEDED] pl-3 pb-1">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      // §38.58 — Faturalama (Account#billing) deeplink ayrı
                      // active state'e ihtiyaç duyar; Account base item'ı
                      // section=billing aktifken kendisi active olmasın.
                      const hasQuery = child.href.includes('?');
                      const isAccountBase = child.href.endsWith('/dashboard/account');
                      const isActive = hasQuery
                        ? matchHref(child.href)
                        : isAccountBase
                          ? matchAccountBase(child.href)
                          : pathname === child.href || pathname?.startsWith(`${child.href}/`);
                      return (
                        <Link
                          key={child.href}
                          href={hrefWithActiveRestaurant(child.href)}
                          onClick={handleNavClick}
                          aria-current={isActive ? 'page' : undefined}
                          tabIndex={isExpanded ? 0 : -1}
                          className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] font-medium transition-colors ${
                            isActive
                              ? 'bg-[#0A0A0A] text-white font-semibold'
                              : 'text-[#737373] hover:bg-[#F2F2F2] hover:text-[#0A0A0A]'
                          }`}
                        >
                          <ChildIcon size={14} strokeWidth={2} className="shrink-0" />
                          {!isCollapsed && (
                            <>
                              <span className="truncate animate-in fade-in slide-in-from-left-2 duration-300">
                                {child.label}
                              </span>
                              {child.isNew && (
                                <span
                                  className="ml-auto inline-flex shrink-0 items-center rounded-full bg-[#C6F24E] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#0A0A0A]"
                                  aria-label={locale === 'tr' ? 'Yeni' : 'New'}
                                >
                                  {locale === 'tr' ? 'Yeni' : 'New'}
                                </span>
                              )}
                            </>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      {/* Plan progress card — sadece trial user + sidebar açık (collapsed durumda
          gizli, alan yetersiz). Tasarım .design-pulse-2026 shell.jsx paterni:
          PRO PLAN eyebrow + gün countdown + lime progress bar + Yükselt link. */}
      {!isCollapsed && user.plan === 'trial' && trialDaysLeft !== null && (
        <div className="px-3 pb-3 animate-in fade-in slide-in-from-left-2 duration-300">
          <div className="rounded-xl bg-[#FAFAFA] border border-[#EDEDED] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="pulse-eyebrow text-[#0A0A0A]">
                {locale === 'tr' ? 'DENEME PLANI' : 'TRIAL PLAN'}
              </span>
              <span className="bz-mono text-[10.5px] text-[#525252] tabular-nums">
                {trialDaysLeft}
                {locale === 'tr' ? 'g' : 'd'}
              </span>
            </div>
            <div className="bz-progress lime">
              <i style={{ width: `${Math.max(8, Math.min(100, (trialDaysLeft / 14) * 100))}%` }} />
            </div>
            <Link
              href={`/${locale}/dashboard/account?section=billing`}
              className="block text-[11.5px] text-[#525252] leading-[1.4]"
              onClick={handleNavClick}
            >
              {trialDaysLeft <= 5
                ? locale === 'tr'
                  ? 'Az kaldı — '
                  : 'Almost over — '
                : ''}
              <span className="font-semibold text-[#0A0A0A] hover:underline underline-offset-2">
                {locale === 'tr' ? 'Plana yükselt' : 'Upgrade plan'}
              </span>
            </Link>
          </div>
        </div>
      )}

      {/* User pill + dropdown menu — tasarım a/shell.jsx UserMenu paterni
          (Profil/Ayarlar/Yardım/Çıkış). Sidebar tek beyaz alan, user pill
          sadece border-top ile ayrılır (mevcut wrapper bg-[#FAFAFA] kaldırıldı,
          tasarım birebir). bz-user-menu CSS class'ları kullanır. */}
      <div className="relative border-t border-[#EDEDED] p-3" ref={userMenuRef}>
        <button
          type="button"
          onClick={() => setUserMenuOpen((v) => !v)}
          aria-expanded={userMenuOpen}
          aria-haspopup="menu"
          aria-label={locale === 'tr' ? 'Hesap menüsü' : 'Account menu'}
          className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors hover:bg-[#F2F2F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title={isCollapsed ? displayName : undefined}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0A0A0A] text-[12px] font-semibold text-[#C6F24E] border border-[#EDEDED] bz-h-tight">
            {initial}
          </div>
          {!isCollapsed && (
            <>
              <div className="min-w-0 flex-1 text-left animate-in fade-in slide-in-from-left-2 duration-300">
                <p className="truncate text-[12px] font-medium text-[#0A0A0A]">{displayName}</p>
                <p className="truncate text-[10px] text-[#525252]">{user.email}</p>
              </div>
              <ChevronDown
                size={14}
                strokeWidth={2}
                className={`text-[#737373] shrink-0 transition-transform duration-200 ${
                  userMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </>
          )}
        </button>

        {userMenuOpen && (
          <div
            className="bz-user-menu"
            role="menu"
          >
            {!isCollapsed && (
              <div className="px-2.5 py-2">
                <p className="truncate text-[12px] font-semibold text-[#0A0A0A]">{displayName}</p>
                <p className="truncate text-[10px] text-[#525252] mt-0.5">{user.email}</p>
              </div>
            )}
            {!isCollapsed && <div className="bz-user-menu-divider" />}
            <Link
              href={`/${locale}/dashboard/account`}
              className="bz-user-menu-item"
              role="menuitem"
              onClick={() => setUserMenuOpen(false)}
            >
              <UserCircle size={14} strokeWidth={2} />
              {locale === 'tr' ? 'Hesabım' : 'My Account'}
            </Link>
            <div className="bz-user-menu-divider" />
            <Link
              href={`/${locale}/help`}
              className="bz-user-menu-item"
              role="menuitem"
              onClick={() => setUserMenuOpen(false)}
            >
              <BookOpen size={14} strokeWidth={2} />
              {locale === 'tr' ? 'Yardım Merkezi' : 'Help Center'}
            </Link>
            <div className="bz-user-menu-divider" />
            <button
              type="button"
              onClick={() => {
                setUserMenuOpen(false);
                handleLogout();
              }}
              className="bz-user-menu-item danger w-full"
              role="menuitem"
            >
              <LogOut size={14} strokeWidth={2} />
              {copy.logout}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    /* §38.158 — Shell yapısı `flex flex-col` + inner `lg:flex` çift katman:
       Önceki tek-katman `lg:flex lg:h-screen lg:overflow-hidden` impersonation
       banner aktifken kırılıyordu — sticky banner `width:100%` + flex row
       parent → sidebar + main flex item'ları cross-axis'te overflow yapıyordu.
       Yeni yapı: outer column flex (banner sticky-friendly) + inner
       `lg:flex-1 lg:min-h-0 lg:overflow-hidden` (sidebar + main row layout
       intact). Banner null durumda görsel etki sıfır (column ile single
       flex child = sadece inner). */
    <div className="min-h-dvh bg-[#FFFFFF] flex flex-col lg:h-screen lg:overflow-hidden relative">
      {/* Stage A4 §38.96 — sticky impersonation banner. Server-side actor.realAdminId
          set ise üstte kırmızı banner + 30dk countdown + "Çıkış" CTA.
          §38.158 — banner artık outer column flex'in birinci child'ı
          (eski lg:flex parent'ında flex item olarak layout'u bozuyordu);
          banner null durumda inner container tüm yüksekliği alır. */}
      <ImpersonationBanner />
      <a href="#panel-main-content" className="bz-skip-link">
        {locale === 'tr' ? 'İçeriğe atla' : 'Skip to content'}
      </a>
      <div className="flex-1 lg:flex lg:min-h-0 lg:overflow-hidden">
      {/* Desktop sidebar */}
      <aside className={`relative hidden h-full shrink-0 border-r border-[#EDEDED] lg:flex transition-all duration-300 ease-in-out ${isCollapsed ? 'w-[68px]' : 'w-[248px]'}`}>
        {renderSidebar(navRef)}
        {/* Floating toggle button */}
        <button
          onClick={toggleSidebar}
          aria-label={isCollapsed ? (locale === 'tr' ? 'Menüyü genişlet' : 'Expand menu') : (locale === 'tr' ? 'Menüyü daralt' : 'Collapse menu')}
          className="bz-btn-icon absolute -right-3 top-7 z-50 h-6 w-6 rounded-full bg-white shadow-sm"
        >
          {isCollapsed ? <ChevronRight size={13} strokeWidth={2.5} /> : <ChevronLeft size={13} strokeWidth={2.5} />}
        </button>
      </aside>

      {/* §42 — panel scroll column. `lg:overflow-y-auto` alone leaves CSS to
          compute `overflow-x: auto` (a box can't be visible on one axis +
          scrollable on the other), which made the column horizontally
          scrollable whenever the sticky topbar tipped past the column width
          (e.g. when a vertical scrollbar shaves ~15px off clientWidth). A
          trackpad swipe or programmatic focus scroll then slid the topbar +
          page content left under the sidebar — the "panel kayması" report.
          `lg:overflow-x-hidden` makes horizontal scroll impossible; any
          residual topbar overflow is clipped on the right instead of shifting
          everything left. `lg:[scrollbar-gutter:stable]` reserves the vertical
          scrollbar lane up-front so the content width never jumps when the
          scrollbar appears (CLAUDE.md §42.5 applied to the real scroll
          container, not just <html>). */}
      <div className="flex min-w-0 flex-1 flex-col lg:h-full lg:overflow-y-auto lg:overflow-x-hidden lg:[scrollbar-gutter:stable]">
        {/* Mobile top bar — §38.65 backdrop-blur-xl Apple "frosted glass" tier upgrade
            (kullanıcı kararı: sticky header only). Önceki `backdrop-blur` (8px) →
            `backdrop-blur-xl` (24px) Liquid Glass referansı; sadece header katmanında. */}
        <div className="sticky top-0 z-40 flex items-center justify-between border-b border-[#EDEDED] bg-white/95 px-4 py-3 backdrop-blur-xl lg:hidden">
          <Link href={hrefWithActiveRestaurant(`/${locale}/dashboard`)} className="flex items-center gap-2">
            <BuazeLogo size={28} variant="default" imageUrl={logoUrl} />
            <span
              className="text-[18px] font-medium tracking-[-0.03em] text-[#0A0A0A] bz-h-tight"
            >
              buaze<span className="text-[#C6F24E]">.</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {workspaceRestaurants.length > 1 && (
              <PulseSelect
                value={activeRestaurantId ?? ''}
                onChange={selectRestaurantScope}
                options={workspaceRestaurants.map((restaurant) => ({
                  value: restaurant.id,
                  label: restaurant.name,
                }))}
                ariaLabel={copy.chooseBusiness}
                className="max-w-[132px]"
              />
            )}
            {user.plan === 'trial' && trialDaysLeft !== null && trialDaysLeft <= 5 && (
              <span className="hidden sm:flex items-center gap-1.5 rounded-full bg-[#EAF9B8] px-3 py-1 pulse-eyebrow text-[#0A0A0A]">
                <Crown size={10} /> {trialDaysLeft}g
              </span>
            )}
            <ViewportMount
              query="(max-width: 1023.98px)"
              fallback={<span aria-hidden className="inline-flex h-9 w-9 shrink-0" />}
            >
              <NotificationBell
                locale={locale}
                announcements={announcements}
                panelBase={`/${locale}/dashboard`}
                reviewsHref={hrefWithActiveRestaurant(`/${locale}/dashboard/feedbacks`)}
                notificationsSettingsHref={`/${locale}/dashboard/notifications`}
                restaurantId={activeRestaurantId}
              />
            </ViewportMount>
            <button
              onClick={() => setDrawerOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0A0A0A] text-[13px] font-semibold text-[#C6F24E] bz-h-tight"
            >
              {drawerOpen ? <X size={18} strokeWidth={2} /> : <span>{initial}</span>}
            </button>
          </div>
        </div>

        {/* Desktop top bar — always render (Pulse 2026-04 shell.jsx 1:1
            design); breadcrumb + title slot opsiyonel, search/bell/avatar
            sabit chrome. Page-level <PageHeader> primitive zaten her sayfada
            başlık taşır; topBar slot SSR breadcrumb için.

            §38.158 — `lg:sticky lg:top-0 lg:z-30` eklendi: kullanıcı raporu
            "yeni kayıt olduktan sonra side bar panelin üstüne geliyor".
            Önceki davranış: topbar scroll ile birlikte yukarı kayıyor (main
            container `lg:overflow-y-auto`); sidebar h-screen olduğu için
            sabit kalıyor → kullanıcı sidebar'ı dominant algılayıp "sidebar
            panelin üstüne geliyor" şeklinde rapor etti. Sticky topbar +
            backdrop-blur: scroll sırasında breadcrumb + arama + bell + avatar
            görünür kalır, mobile sticky pattern (z-40) ile uyumlu z-30
            (sidebar collapse toggle z-50'nin altında). bg-white/95 +
            backdrop-blur Apple "frosted glass" tier (CLAUDE.md §38.65). */}
        <div className="hidden lg:sticky lg:top-0 lg:z-30 lg:flex items-center justify-between gap-4 border-b border-[#EDEDED] bg-white/95 backdrop-blur-xl px-7 py-3.5">
          <div className="min-w-0">
            {topBar ? (
              <>
                <p className="pulse-eyebrow text-[#737373]">{topBar.breadcrumb}</p>
                <h1 className="mt-1 text-[22px] font-medium text-[#0A0A0A] tracking-[-0.02em] leading-none truncate bz-h-tight">
                  {topBar.title}
                </h1>
              </>
            ) : (
              <p className="pulse-eyebrow text-[#737373]">{copy.workspace}</p>
            )}
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            {workspaceRestaurants.length > 1 && (
              <PulseSelect
                value={activeRestaurantId ?? ''}
                onChange={selectRestaurantScope}
                options={workspaceRestaurants.map((restaurant) => ({
                  value: restaurant.id,
                  label: restaurant.name,
                }))}
                ariaLabel={copy.chooseBusiness}
                className="hidden max-w-[220px] xl:inline-block"
              />
            )}
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label={locale === 'tr' ? 'Arama paletini aç' : 'Open search palette'}
              title={locale === 'tr' ? 'Aramayı aç (⌘K)' : 'Open search (⌘K)'}
              className="hidden xl:flex items-center gap-2 rounded-full border border-[#EDEDED] bg-white px-3.5 py-2 text-[12px] text-[#525252] hover:border-[#0A0A0A] hover:text-[#0A0A0A] hover:bg-[#FAFAFA] active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-1"
            >
              <Search size={13} strokeWidth={2.25} />
              <span>{locale === 'tr' ? 'Yorum, konum, sayfa ara…' : 'Search reviews, locations, pages…'}</span>
              <span className="ml-1 rounded bg-[#F5F5F5] px-1.5 py-0.5 text-[10px] font-medium text-[#525252] bz-mono">
                ⌘K
              </span>
            </button>
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label={locale === 'tr' ? 'Aramayı aç' : 'Open search'}
              title={locale === 'tr' ? 'Aramayı aç (⌘K)' : 'Open search (⌘K)'}
              className="bz-btn-icon xl:hidden"
            >
              <Search size={15} strokeWidth={2.25} />
            </button>
            <ViewportMount
              query="(min-width: 1024px)"
              fallback={<span aria-hidden className="inline-flex h-9 w-9 shrink-0" />}
            >
              <NotificationBell
                locale={locale}
                announcements={announcements}
                panelBase={`/${locale}/dashboard`}
                reviewsHref={hrefWithActiveRestaurant(`/${locale}/dashboard/feedbacks`)}
                notificationsSettingsHref={`/${locale}/dashboard/notifications`}
                restaurantId={activeRestaurantId}
              />
            </ViewportMount>
            <Link
              href={`/${locale}/dashboard/account?section=profile`}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A0A0A] text-[12px] font-semibold text-[#C6F24E] hover:bg-[#1A1A1A] transition-colors bz-h-tight"
              aria-label={displayName}
            >
              {initial}
            </Link>
          </div>
        </div>

        <main
          id="panel-main-content"
          tabIndex={-1}
          // Stage 60 §38.141 — Floating pill mobile bottom nav 72px height
          // + 12px bottom-margin + safe-area inset. Toplam ~120px content
          // overlap önleme. lg+ desktop'ta nav görünmez (pb-0).
          // §38.238 — `overflow-x-hidden` REMOVED from <main>.
          //
          // Per the CSS Overflow spec an element with `overflow-x: hidden`
          // is a scroll container (it simply cannot be scrolled by the user),
          // and its `overflow-y` resolves to `auto` rather than `visible`.
          // That made <main> the nearest scrollport for everything inside it,
          // so every `position: sticky` descendant in the owner panel anchored
          // to a container that never scrolls — i.e. silently stopped sticking.
          // Affected the menu builder live preview (`sticky top-4`), the
          // feedbacks list filter bar and mobile detail header, the menu
          // builder toolbar, the campaign drawer header and the create-business
          // footer CTA.
          //
          // The guard is redundant anyway: `body { overflow-x: hidden }`
          // (globals.css §42.5) covers below-lg, and from lg up the parent
          // scroll column already carries `lg:overflow-x-hidden`
          // (§42.5.1, line ~1115). Dropping it here restores sticky without
          // reopening horizontal scroll.
          className="flex min-w-0 min-h-0 flex-1 flex-col bg-[#FAFAFA] pb-[calc(96px+env(safe-area-inset-bottom,0px))] lg:pb-0"
        >
          {user.plan === 'trial' && trialDaysLeft !== null && trialDaysLeft <= 7 && (
            <TrialBanner locale={locale} daysLeft={trialDaysLeft} />
          )}
          {viewerMode && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-2 border-b border-[#FDE68A] bg-[#FFFBEB] px-4 py-2 text-[12px] text-[#92400E] sm:px-7"
            >
              <span aria-hidden className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-[#D97706]" />
              <span className="font-medium">
                {locale === 'tr' ? 'Sadece okuma yetkin var.' : 'Read-only access.'}
              </span>
              <span className="text-[#92400E]/80">
                {locale === 'tr'
                  ? 'Yanıt yazma, atama ve düzenleme aksiyonları işletme sahibi tarafından kapatıldı.'
                  : 'Reply, assign and edit actions are disabled by the workspace owner.'}
              </span>
            </div>
          )}
          {announcements.length > 0 && (
            <AnnouncementBanner announcements={announcements} locale={locale} />
          )}
          {children}
        </main>
      </div>
      </div>{/* §38.158 — close new wrapper (`flex-1 lg:flex lg:min-h-0`) */}

      {/* Mobile drawer — §38.63 Admin paneli (AdminSidebar.tsx:577) paterniyle
          uyumlu hale getirildi: role="dialog" aria-modal aria-label + safe-area
          inset top/bottom + bg-white border-r. Önceki implementation a11y
          attribute'ları ve safe-area paddings eksikti. Tasarım kaynağı
          .design-owner-2026/page-mobile-v2.jsx MobileDrawer (line 3-72) +
          shell.jsx PanelShell `mobile drawer` paterniyle uyumlu. */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 flex lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={locale === 'tr' ? 'Owner navigation' : 'Owner navigation'}
        >
          <div
            className="h-full w-[280px] max-w-[85vw] bg-white border-r border-[#EDEDED] bz-elev-3 flex flex-col text-[#0A0A0A] overflow-y-auto"
            style={{
              animation: 'bz-mob-drawer-in 180ms cubic-bezier(0.4, 0, 0.2, 1)',
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            {renderSidebar()}
          </div>
          <button
            type="button"
            className="flex-1 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-label={locale === 'tr' ? 'Menüyü kapat' : 'Close menu'}
          />
        </div>
      )}

      {/* Mobile bottom nav — Stage 60 §38.141 HANDOFF floating pill paterni.
          Floating: 12px lateral margin + safe-area + 28px borderRadius.
          Glassmorphism: backdrop-blur(20px) saturate(180%) + translucent
          surface. 72px height. 4 primary tab + More + Yorumlar tab'ında
          NotificationBell unread count badge (custom event listener).

          Drawer açıkken bottom nav fade-out (admin paterni ile parity —
          AdminMobileNav `buaze:mobile-drawer` event listener'ı). Owner
          shell drawer + bottom nav aynı component'te olduğu için event
          broadcast yerine doğrudan local state okunur. `aria-hidden` +
          `pointer-events-none` a11y intact. More sheet (`moreOpen`) açıkken
          bottom nav görünür kalır — kullanıcı oradan navigate edebilsin
          (kasıtlı UX). */}
      <nav
        aria-label={copy.dashboard}
        aria-hidden={drawerOpen ? 'true' : undefined}
        // §38.238 — bottom-anchored padding instead of `bottom: calc(N + env())`
        // (CLAUDE.md §38.169). iOS Safari re-evaluates env(safe-area-inset-bottom)
        // while the toolbar collapses/expands; animating `bottom` made the pill
        // reflow and jitter mid-scroll. Anchoring the wrapper at bottom-0 and
        // moving the offset into padding keeps the visual gap identical while the
        // element itself never moves. Mirrors marketing/MobileBottomNav.
        className={`fixed bottom-0 left-3 right-3 z-40 mx-auto max-w-[520px] lg:hidden transition-[opacity,transform] duration-200 ease-out ${
          drawerOpen
            ? 'pointer-events-none translate-y-full opacity-0'
            : 'translate-y-0 opacity-100'
        }`}
        style={{
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
          willChange: 'transform, opacity',
          backfaceVisibility: 'hidden',
        }}
      >
        <div
          className="rounded-[28px] border border-[rgba(10,10,10,0.06)] shadow-[0_12px_30px_-12px_rgba(10,10,10,0.25)]"
          style={{
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          }}
        >
          <ul className="flex h-[72px] items-stretch px-2">
            {bottomNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              const isFeedbacks = item.href === `/${locale}/dashboard/feedbacks`;
              return (
                <li key={item.href} className="min-w-0 flex-1">
                  <Link
                    href={hrefWithActiveRestaurant(item.href)}
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                    className={`relative flex h-full flex-col items-center justify-center gap-1 rounded-md px-1 transition-all duration-150 active:scale-95 ${
                      isActive ? 'text-[#0A0A0A]' : 'text-[rgba(10,10,10,0.42)]'
                    }`}
                  >
                    <span className="relative">
                      <Icon
                        size={20}
                        strokeWidth={isActive ? 2 : 1.6}
                        className={`transition-colors duration-150 ${
                          isActive ? 'text-[#0A0A0A]' : 'text-[rgba(10,10,10,0.42)]'
                        }`}
                      />
                      {/* Stage 60 §38.141 — Yorumlar badge (NotificationBell
                          unreadCount custom event). 14×14 lime pill, 2-digit
                          + "99+" overflow. Visible only when count > 0. */}
                      {isFeedbacks && notifUnreadCount > 0 && (
                        <span
                          aria-hidden="true"
                          className="absolute -right-2 -top-1 inline-flex h-[14px] min-w-[14px] items-center justify-center rounded-[7px] border-2 border-white bg-[#C6F24E] px-[3px] font-mono text-[8px] font-bold text-[#0A0A0A]"
                          style={{
                            background: '#C6F24E',
                          }}
                        >
                          {notifUnreadCount > 99 ? '99+' : notifUnreadCount}
                        </span>
                      )}
                    </span>
                    <span
                      className={`text-[10px] leading-none tracking-tight transition-colors duration-150 ${
                        isActive ? 'font-bold text-[#0A0A0A]' : 'font-medium text-[rgba(10,10,10,0.42)]'
                      }`}
                    >
                      {item.label}
                    </span>
                    {/* Stage 60 §38.141 — Active dot indicator (4×4 lime, top
                        translateY -100%). Subtle modern accent. */}
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute top-1 left-1/2 h-1 w-1 -translate-x-1/2 -translate-y-full rounded-full bg-[#C6F24E] transition-opacity duration-200 ${
                        isActive ? 'opacity-100' : 'opacity-0'
                      }`}
                      style={{
                        boxShadow: isActive ? '0 0 8px rgba(198,242,78,0.8)' : 'none',
                      }}
                    />
                  </Link>
                </li>
              );
            })}
            <li className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                aria-label={copy.more}
                aria-expanded={moreOpen}
                aria-haspopup="dialog"
                className={`relative flex h-full w-full flex-col items-center justify-center gap-1 rounded-md px-1 transition-all duration-150 active:scale-95 ${
                  moreActive ? 'text-[#0A0A0A]' : 'text-[rgba(10,10,10,0.42)]'
                }`}
              >
                <MoreHorizontal
                  size={20}
                  strokeWidth={moreActive ? 2 : 1.6}
                  className={`transition-colors duration-150 ${
                    moreActive ? 'text-[#0A0A0A]' : 'text-[rgba(10,10,10,0.42)]'
                  }`}
                />
                <span
                  className={`text-[10px] leading-none tracking-tight transition-colors duration-150 ${
                    moreActive ? 'font-bold text-[#0A0A0A]' : 'font-medium text-[rgba(10,10,10,0.42)]'
                  }`}
                >
                  {copy.more}
                </span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute top-1 left-1/2 h-1 w-1 -translate-x-1/2 -translate-y-full rounded-full bg-[#C6F24E] transition-opacity duration-200 ${
                    moreActive ? 'opacity-100' : 'opacity-0'
                  }`}
                  style={{
                    boxShadow: moreActive ? '0 0 8px rgba(198,242,78,0.8)' : 'none',
                  }}
                />
              </button>
            </li>
          </ul>
        </div>
      </nav>

      {/* Mobile "More" bottom sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={copy.more}>
          <button
            type="button"
            aria-label="close"
            className="absolute inset-0 bg-[#000000]/60 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
          <div
            /* §38.69 — Mobile More sheet white theme tutarlılık (mobile drawer
               §38.68 bg-white paterni reuse). Eski bg-[#0A0A0A] + text-[#0A0A0A]
               leftover dark ile graphite text invisible bug'ına neden oluyordu;
               internals (eyebrow #525252, hover #FAFAFA, items #1A1A1A, logout
               #FEF2F2) zaten white sheet için tasarlanmış. Drag handle n300
               (bg-[#D4D4D4]) visible on white. shadow-2xl → bz-elev-3 mobile
               modal-tier (Apple-soft heavy tier, §38.65 NotificationBell + §38.68
               drawer paterni). Apple HIG bottom sheet bz-mob-drawer-in slide-in
               variant (mobile drawer ile aynı 220ms cubic-bezier easing). */
            // §38.238 — max-height + scroll guard: with enough nav entries (or a short
              // landscape viewport) the sheet grew past the screen and its last rows became
              // unreachable. overscroll-contain stops the scroll chaining to the page.
              className="absolute bottom-0 left-0 right-0 max-h-[85dvh] overflow-y-auto overscroll-contain bg-white rounded-t-3xl border-t border-[#EDEDED] px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] bz-elev-3"
            style={{
              animation: 'bz-mob-sheet-in 200ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#D4D4D4]" />
            <div className="mb-3 flex items-center justify-between px-2">
              <p className="pulse-eyebrow text-[#525252]">{copy.more}</p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="close"
                className="bz-btn-icon"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <ul className="space-y-0.5">
              {moreSheetItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={hrefWithActiveRestaurant(item.href)}
                      onClick={() => setMoreOpen(false)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-[13px] bz-motion-spring ${
                        isActive
                          ? 'bg-[#C6F24E] text-[#0A0A0A] font-semibold'
                          : 'text-[#1A1A1A] hover:bg-[#FAFAFA] hover:text-[#0A0A0A] font-medium'
                      }`}
                    >
                      <Icon size={16} strokeWidth={2} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
              <li className="pt-2 mt-2 border-t border-[#EDEDED]">
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    handleLogout();
                  }}
                  className="bz-btn-danger w-full justify-start"
                >
                  <LogOut size={16} strokeWidth={2} />
                  <span>{copy.logout}</span>
                </button>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Cmd/Ctrl+K command palette — searchable launcher across pages,
          locations, and reviews. The list of `navItems` here mirrors the
          sidebar nav so the user can jump to any tab without scrolling. */}
      {paletteOpen && (
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          locale={locale}
          base={`/${locale}/dashboard`}
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
          // Stage 98 — Surveys command palette (CLAUDE.md §42).
          { href: `/${locale}/dashboard/surveys`, label: copy.surveys, keywords: ['anket', 'survey', 'nps', 'soru', 'question', 'feedback'] },
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
