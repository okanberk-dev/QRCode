'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { BarChart3, Bell, BookOpen, ChevronDown, ChevronLeft, ChevronRight, CreditCard, Crown, LayoutDashboard, LogOut, MessageSquareText, MoreHorizontal, Plug, Plus, QrCode, Search, Settings, Store, UserCircle, UtensilsCrossed, X, UsersRound } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import AnnouncementBanner, { type DashboardAnnouncement } from './AnnouncementBanner';
import TrialBanner from './TrialBanner';
import BuazeLogo from '@/components/marketing/BuazeLogo';
import NotificationBell from '@/components/notifications/NotificationBell';
import CommandPalette from '@/components/dashboard/CommandPalette';

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
}

interface UserDashboardShellProps {
  locale: Locale;
  user: DashboardUser;
  workspace?: DashboardWorkspace;
  announcements?: DashboardAnnouncement[];
  logoUrl?: string | null;
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
  // §38.72 — Campaigns sidebar item (CRM grup §38.56) için breadcrumb entry.
  if (rest.startsWith('/campaigns')) return { breadcrumb: isTr ? 'CRM / KAMPANYALAR' : 'CRM / CAMPAIGNS', title: isTr ? 'Kampanyalar' : 'Campaigns' };
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

export default function UserDashboardShell({ locale, user, workspace, announcements = [], logoUrl, children }: UserDashboardShellProps) {
  void TOP_BAR_MAP;
  const pathname = usePathname();
  // §38.58 — Faturalama nav item href'i `?section=billing` query taşır
  // (Account içinde billing subtab'a deeplink). Active state hesabı search
  // param'ı tüketir; aksi halde Account ve Faturalama her ikisi de active
  // görünür (aynı pathname).
  const searchParams = useSearchParams();
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
      feedbacks: isTr ? 'Yorumlar' : 'Feedbacks',
      googleReviews: isTr ? 'Google Yorumları' : 'Google Reviews',
      analytics: isTr ? 'Analitik' : 'Analytics',
      restaurants: isTr ? 'İşletmeler' : 'Locations',
      qr: 'QR',
      menu: isTr ? 'Menü' : 'Menu',
      integrations: isTr ? 'Platform Bağlantıları' : 'Platform Links',
      guide: isTr ? 'Kılavuz' : 'Guide',
      account: isTr ? 'Hesabım' : 'Account',
      logout: isTr ? 'Çıkış' : 'Logout',
      plan: isTr ? 'Plan' : 'Plan',
      trialLeft: isTr ? 'gün kaldı' : 'days left',
      more: isTr ? 'Daha fazla' : 'More',
      customers: isTr ? 'Müşteriler' : 'Customers',
      platforms: isTr ? 'Platform bağlantıları' : 'Review platforms',
      announcements: isTr ? 'Duyurular' : 'Announcements',
      notifications: isTr ? 'Bildirimler' : 'Notifications',
      groupSetup: isTr ? 'Yapılandırma' : 'Setup',
      groupInsight: isTr ? 'İçgörü' : 'Insight',
      groupInfo: isTr ? 'Bilgi' : 'Info',
      workspace: isTr ? 'BUAZE PANELİ' : 'BUAZE PANEL',
    };
  }, [locale]);

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
      // §38.56 — tasarım a/shell.jsx CRM grup birebir: Müşteriler / Analitik /
      // Kampanyalar (Yeni badge). Analitik mevcut /dashboard/analytics route'u
      // kullanır (eskiden GENEL'deydi); Kampanyalar şu an placeholder route
      // (`/dashboard/campaigns` 404 dönecek — sayfa açılana kadar "Yeni" badge
      // hint olarak görünür).
      children: [
        { href: `/${locale}/dashboard/customers`, icon: UsersRound, label: copy.customers },
        { href: `/${locale}/dashboard/analytics`, icon: BarChart3, label: copy.analytics },
        {
          href: `/${locale}/dashboard/campaigns`,
          icon: MessageSquareText,
          label: locale === 'tr' ? 'Kampanyalar' : 'Campaigns',
          isNew: true,
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
        { href: `/${locale}/dashboard/menu`, icon: UtensilsCrossed, label: copy.menu },
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
    { href: `/${locale}/dashboard/menu`, icon: UtensilsCrossed, label: copy.menu },
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

  const primaryName = workspace?.primaryName ?? (locale === 'tr' ? 'İşletmen' : 'Your workspace');
  const locationCount = workspace?.locationCount ?? 0;
  const primaryInitial = (workspace?.primaryName || displayName).charAt(0).toUpperCase();

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
        <Link href={`/${locale}/dashboard`} className="flex items-center gap-2.5">
          <BuazeLogo size={32} variant="on-dark" imageUrl={logoUrl} />
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
      <div className="px-3 pb-3">
        <div className={`flex items-center gap-2.5 rounded-lg bg-[#FAFAFA] border border-[#EDEDED] ${isCollapsed ? 'px-2 py-2 justify-center' : 'px-3 py-2.5'}`}>
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#C6F24E] text-[#0A0A0A] text-[12px] font-semibold bz-h-tight"
          >
            {primaryInitial}
          </div>
          {!isCollapsed && (
            <>
              <div className="min-w-0 flex-1 animate-in fade-in slide-in-from-left-2 duration-300">
                <p className="truncate text-[13px] font-semibold text-[#0A0A0A] leading-tight">{primaryName}</p>
                <p className="pulse-eyebrow text-[#525252] mt-0.5">
                  {locationCount} {locale === 'tr' ? 'KONUM' : 'LOCATIONS'}
                </p>
              </div>
              <ChevronDown size={14} className="text-[#737373] shrink-0" strokeWidth={2} />
            </>
          )}
        </div>
      </div>

      {/* §38.59 — Sidebar search button kaldırıldı (kullanıcı kararı). Cmd+K
          palette hâlâ topbar'da + global keyboard shortcut ile erişilebilir;
          sidebar görsel sadeleşti. Eski search button kapsamı: paletteOpen
          state intact, sadece sidebar tetikleyicisi UI'dan çıkarıldı. */}

      {/* §38.39 — Primary CTA tasarım birebir: "Yorum İste" (tasarım kaynağı
          .design-owner-2026/shell.jsx). Owner panel'de birincil aksiyon yorum
          talep akışı. href intact (/dashboard/qr) — QR distribution yorum
          isteme'nin operasyonel yöntemi. Phase 1'de eklenen .bz-side-cta +
          --mini class'larını kullanır. */}
      <div className="px-3 pb-3">
        <Link
          href={`/${locale}/dashboard/qr`}
          className={`bz-side-cta ${isCollapsed ? 'bz-side-cta--mini' : ''}`}
          title={isCollapsed ? (locale === 'tr' ? 'Yorum İste' : 'Request review') : undefined}
          onClick={handleNavClick}
        >
          <Plus size={14} strokeWidth={2.2} />
          <span>{locale === 'tr' ? 'Yorum İste' : 'Request review'}</span>
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
                href={item.href}
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
                          href={child.href}
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
              <span className="font-semibold text-[#0A0A0A] underline">
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
            style={{ left: 12, right: 12 }}
          >
            {!isCollapsed && (
              <div className="px-2.5 py-2">
                <p className="truncate text-[12px] font-semibold text-[#0A0A0A]">{displayName}</p>
                <p className="truncate text-[10px] text-[#525252] mt-0.5">{user.email}</p>
              </div>
            )}
            {!isCollapsed && <div className="bz-user-menu-divider" />}
            <Link
              href={`/${locale}/dashboard/account?section=profile`}
              className="bz-user-menu-item"
              role="menuitem"
              onClick={() => setUserMenuOpen(false)}
            >
              <UserCircle size={14} strokeWidth={2} />
              {locale === 'tr' ? 'Profilim' : 'Profile'}
            </Link>
            <Link
              href={`/${locale}/dashboard/account`}
              className="bz-user-menu-item"
              role="menuitem"
              onClick={() => setUserMenuOpen(false)}
            >
              <Settings size={14} strokeWidth={2} />
              {locale === 'tr' ? 'Ayarlar' : 'Settings'}
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
    <div className="min-h-screen bg-[#FFFFFF] lg:flex lg:h-screen lg:overflow-hidden relative">
      <a href="#panel-main-content" className="bz-skip-link">
        {locale === 'tr' ? 'İçeriğe atla' : 'Skip to content'}
      </a>
      {/* Desktop sidebar */}
      <aside className={`relative hidden h-full shrink-0 border-r border-[#EDEDED] lg:flex transition-all duration-300 ease-in-out ${isCollapsed ? 'w-[68px]' : 'w-[248px]'}`}>
        {renderSidebar(navRef)}
        {/* Floating toggle button */}
        <button
          onClick={toggleSidebar}
          aria-label={isCollapsed ? (locale === 'tr' ? 'Menüyü genişlet' : 'Expand menu') : (locale === 'tr' ? 'Menüyü daralt' : 'Collapse menu')}
          className="absolute -right-3 top-7 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-[#EDEDED] bg-white text-[#525252] shadow-sm hover:text-[#0A0A0A] hover:bg-[#FAFAFA] transition-all"
        >
          {isCollapsed ? <ChevronRight size={13} strokeWidth={2.5} /> : <ChevronLeft size={13} strokeWidth={2.5} />}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:h-full lg:overflow-y-auto">
        {/* Mobile top bar — §38.65 backdrop-blur-xl Apple "frosted glass" tier upgrade
            (kullanıcı kararı: sticky header only). Önceki `backdrop-blur` (8px) →
            `backdrop-blur-xl` (24px) Liquid Glass referansı; sadece header katmanında. */}
        <div className="sticky top-0 z-40 flex items-center justify-between border-b border-[#EDEDED] bg-white/95 px-4 py-3 backdrop-blur-xl lg:hidden">
          <Link href={`/${locale}/dashboard`} className="flex items-center gap-2">
            <BuazeLogo size={28} variant="default" imageUrl={logoUrl} />
            <span
              className="text-[18px] font-medium tracking-[-0.03em] text-[#0A0A0A] bz-h-tight"
            >
              buaze<span className="text-[#C6F24E]">.</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {user.plan === 'trial' && trialDaysLeft !== null && trialDaysLeft <= 5 && (
              <span className="hidden sm:flex items-center gap-1.5 rounded-full bg-[#EAF9B8] px-3 py-1 pulse-eyebrow text-[#0A0A0A]">
                <Crown size={10} /> {trialDaysLeft}g
              </span>
            )}
            <NotificationBell
              locale={locale}
              announcements={announcements}
              panelBase={`/${locale}/dashboard`}
              reviewsHref={`/${locale}/dashboard/feedbacks`}
              notificationsSettingsHref={`/${locale}/dashboard/notifications`}
            />
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
            başlık taşır; topBar slot SSR breadcrumb için. */}
        <div className="hidden lg:flex items-center justify-between gap-4 border-b border-[#EDEDED] bg-white px-7 py-3.5">
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
              className="xl:hidden flex h-9 w-9 items-center justify-center rounded-full border border-[#EDEDED] bg-white text-[#0A0A0A] hover:border-[#0A0A0A] hover:bg-[#EAF9B8]/40 active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-1"
            >
              <Search size={15} strokeWidth={2.25} />
            </button>
            <NotificationBell
              locale={locale}
              announcements={announcements}
              panelBase={`/${locale}/dashboard`}
              reviewsHref={`/${locale}/dashboard/feedbacks`}
              notificationsSettingsHref={`/${locale}/dashboard/notifications`}
            />
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
          className="min-w-0 flex-1 overflow-x-hidden bg-[#FAFAFA] pb-24 lg:pb-0"
        >
          {user.plan === 'trial' && trialDaysLeft !== null && trialDaysLeft <= 7 && (
            <TrialBanner locale={locale} daysLeft={trialDaysLeft} />
          )}
          {announcements.length > 0 && (
            <AnnouncementBanner announcements={announcements} locale={locale} />
          )}
          {children}
        </main>
      </div>

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
              animation: 'bz-mob-drawer-in 220ms cubic-bezier(0.4, 0, 0.2, 1)',
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

      {/* Mobile bottom nav — 4 primary tabs + More (1:1 mobile-screens-1.jsx MBottomNav) */}
      <nav
        aria-label={copy.dashboard}
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#EDEDED] backdrop-blur-md shadow-[0_-4px_20px_0_rgba(10,10,10,0.06)] lg:hidden"
        style={{
          background: 'rgba(255,255,255,0.94)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <ul className="flex items-stretch px-2 pt-2 pb-1.5">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <li key={item.href} className="flex-1 min-w-0">
                <Link
                  href={item.href}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative flex flex-col items-center gap-1 px-1 py-1.5 rounded-lg transition-colors ${
                    isActive ? 'text-[#0A0A0A]' : 'text-[#737373] hover:text-[#0A0A0A]'
                  }`}
                >
                  <span
                    className={`flex h-7 w-[38px] items-center justify-center rounded-full transition-colors ${
                      isActive ? 'bg-[#0A0A0A] text-[#C6F24E]' : 'text-[#737373]'
                    }`}
                  >
                    <Icon size={16} strokeWidth={2} />
                  </span>
                  <span className="pulse-eyebrow truncate max-w-full" style={{ fontSize: 9.5 }}>{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li className="flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-label={copy.more}
              aria-expanded={moreOpen}
              aria-haspopup="dialog"
              className={`relative flex w-full flex-col items-center gap-1 px-1 py-1.5 rounded-lg transition-colors ${
                moreActive ? 'text-[#0A0A0A]' : 'text-[#737373] hover:text-[#0A0A0A]'
              }`}
            >
              <span
                className={`flex h-7 w-[38px] items-center justify-center rounded-full transition-colors ${
                  moreActive ? 'bg-[#0A0A0A] text-[#C6F24E]' : 'text-[#737373]'
                }`}
              >
                <MoreHorizontal size={16} strokeWidth={2} />
              </span>
              <span className="pulse-eyebrow truncate max-w-full" style={{ fontSize: 9.5 }}>{copy.more}</span>
            </button>
          </li>
        </ul>
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
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl border-t border-[#EDEDED] px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] bz-elev-3"
            style={{
              animation: 'bz-mob-sheet-in 240ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#D4D4D4]" />
            <div className="mb-3 flex items-center justify-between px-2">
              <p className="pulse-eyebrow text-[#525252]">{copy.more}</p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="close"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#525252] hover:bg-[#FAFAFA] hover:text-[#0A0A0A]"
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
                      href={item.href}
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
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[13px] font-medium text-[#DC2626] bz-motion-spring hover:bg-[#FEF2F2] hover:text-[#DC2626]"
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
          { href: `/${locale}/dashboard/campaigns`, label: locale === 'tr' ? 'Kampanyalar' : 'Campaigns', keywords: ['kampanya', 'campaign', 'mail', 'segment'] },
          { href: `/${locale}/dashboard/restaurants`, label: copy.restaurants, keywords: ['işletme', 'konum', 'lokasyon', 'restoran', 'location'] },
          { href: `/${locale}/dashboard/menu`, label: copy.menu, keywords: ['menü', 'menu', 'ürün', 'item'] },
          { href: `/${locale}/dashboard/platforms`, label: copy.integrations, keywords: ['entegrasyon', 'integration', 'google', 'yemeksepeti', 'getir', 'trendyol', 'platform', 'url'] },
          { href: `/${locale}/dashboard/customers`, label: copy.customers, keywords: ['müşteri', 'customer', 'crm'] },
          { href: `/${locale}/dashboard/guide`, label: copy.guide, keywords: ['kılavuz', 'guide', 'help', 'yardım'] },
          { href: `/${locale}/dashboard/account`, label: copy.account, keywords: ['ayar', 'settings', 'profil', 'profile', 'hesap', 'account', 'şifre', 'password', '2fa', 'güvenlik', 'security', 'ekip', 'team', 'kvkk', 'legal', 'bildirim', 'notification'] },
          // §38.58 — Faturalama ayrı palette entry'si (Account base'inden
          // ayrılmış; tasarım a/shell.jsx:125 sidebar nav birebir).
          { href: `/${locale}/dashboard/account?section=billing`, label: locale === 'tr' ? 'Faturalama' : 'Billing', keywords: ['fatura', 'billing', 'invoice', 'plan', 'ödeme', 'payment', 'abonelik', 'subscription'] },
        ]}
      />
    </div>
  );
}
