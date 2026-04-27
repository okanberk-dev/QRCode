'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Bell, BookOpen, ChevronDown, ChevronRight, Crown, LayoutDashboard, Link2, LogOut, Megaphone, MessageSquareText, MoreHorizontal, QrCode, Search, Settings, Store, UtensilsCrossed, X, UsersRound } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import AnnouncementBanner, { type DashboardAnnouncement } from './AnnouncementBanner';
import BuazeLogo from '@/components/marketing/BuazeLogo';

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

function useTopBar(locale: Locale, pathname: string | null) {
  const isTr = locale === 'tr';
  if (!pathname) return null;
  const rest = pathname.replace(`/${locale}/dashboard`, '') || '/';
  if (rest === '/') return { breadcrumb: isTr ? 'PANEL / GENEL BAKIŞ' : 'PANEL / OVERVIEW', title: isTr ? 'Genel bakış' : 'Overview' };
  if (rest.startsWith('/feedbacks')) return { breadcrumb: isTr ? 'PANEL / YORUMLAR' : 'PANEL / REVIEWS', title: isTr ? 'Yorum gelen kutusu' : 'Review inbox' };
  if (rest.startsWith('/qr')) return { breadcrumb: isTr ? 'QR OLUŞTUR / YENİ KAMPANYA' : 'QR / NEW CAMPAIGN', title: isTr ? 'QR kodu oluştur' : 'Create QR code' };
  if (rest.startsWith('/analytics')) return { breadcrumb: isTr ? 'ANALİTİK / GENEL' : 'ANALYTICS / OVERVIEW', title: isTr ? 'Analitik' : 'Analytics' };
  if (rest.startsWith('/restaurants')) return { breadcrumb: isTr ? 'PANEL / KONUMLAR' : 'PANEL / LOCATIONS', title: isTr ? 'Konumlar' : 'Locations' };
  if (rest.startsWith('/menu')) return { breadcrumb: isTr ? 'PANEL / MENÜ' : 'PANEL / MENU', title: isTr ? 'Menü' : 'Menu' };
  if (rest.startsWith('/leads')) return { breadcrumb: isTr ? 'PANEL / MÜŞTERİLER' : 'PANEL / CUSTOMERS', title: isTr ? 'Müşteriler' : 'Customers' };
  if (rest.startsWith('/platforms')) return { breadcrumb: isTr ? 'PANEL / PLATFORMLAR' : 'PANEL / PLATFORMS', title: isTr ? 'Platform bağlantıları' : 'Review platforms' };
  if (rest.startsWith('/announcements')) return { breadcrumb: isTr ? 'PANEL / DUYURULAR' : 'PANEL / ANNOUNCEMENTS', title: isTr ? 'Duyurular' : 'Announcements' };
  if (rest.startsWith('/guide')) return { breadcrumb: isTr ? 'PANEL / KILAVUZ' : 'PANEL / GUIDE', title: isTr ? 'Kılavuz' : 'Guide' };
  if (rest.startsWith('/profile')) return { breadcrumb: isTr ? 'AYARLAR / HESAP' : 'SETTINGS / ACCOUNT', title: isTr ? 'Ayarlar' : 'Settings' };
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  // Collapsible group state — persists across navigations via localStorage.
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  useEffect(() => {
    setExpandedGroups(loadGroupState());
  }, []);
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
  const topBar = useTopBar(locale, pathname);

  const copy = useMemo(() => {
    const isTr = locale === 'tr';
    return {
      dashboard: isTr ? 'Panel' : 'Dashboard',
      feedbacks: isTr ? 'Yorumlar' : 'Feedbacks',
      analytics: isTr ? 'Analitik' : 'Analytics',
      restaurants: isTr ? 'İşletmeler' : 'Locations',
      qr: 'QR',
      menu: isTr ? 'Menü' : 'Menu',
      guide: isTr ? 'Kılavuz' : 'Guide',
      profile: isTr ? 'Ayarlar' : 'Settings',
      logout: isTr ? 'Çıkış' : 'Logout',
      plan: isTr ? 'Plan' : 'Plan',
      trialLeft: isTr ? 'gün kaldı' : 'days left',
      more: isTr ? 'Daha fazla' : 'More',
      leads: isTr ? 'Müşteri Listesi' : 'Customer List',
      platforms: isTr ? 'Platform bağlantıları' : 'Review platforms',
      announcements: isTr ? 'Duyurular' : 'Announcements',
      notifications: isTr ? 'Bildirimler' : 'Notifications',
      groupSetup: isTr ? 'Yapılandırma' : 'Setup',
      groupInsight: isTr ? 'İçgörü' : 'Insight',
      groupInfo: isTr ? 'Bilgi' : 'Info',
    };
  }, [locale]);

  // Sidebar navigation — flat top primary actions, then 3 collapsible groups
  // for setup / insight / info, then a flat profile entry. Reduces visible
  // surface from 11 items to ~7 (3 flat + 3 group headers + 1 flat).
  type LucideIcon = typeof LayoutDashboard;
  type NavItem = { type: 'item'; href: string; icon: LucideIcon; label: string; badge?: number };
  type NavChild = { href: string; icon: LucideIcon; label: string };
  type NavGroup = { type: 'group'; id: string; icon: LucideIcon; label: string; children: NavChild[] };
  type Nav = NavItem | NavGroup;

  const feedbackBadge =
    workspace?.feedbackCount && workspace.feedbackCount > 0 ? workspace.feedbackCount : undefined;

  // Flat 10-item nav (Pulse 2026-04 design ownerNav 1:1, shell.jsx line 12-23).
  // Previously grouped Setup/Insight/Info — flattened for design parity.
  // `restaurants` (multi-location yönetim) design'da explicit yok; flat list
  // sonuna ek item olarak korunur (11 toplam).
  const navItems: Nav[] = [
    { type: 'item', href: `/${locale}/dashboard`, icon: LayoutDashboard, label: copy.dashboard },
    { type: 'item', href: `/${locale}/dashboard/feedbacks`, icon: MessageSquareText, label: copy.feedbacks, badge: feedbackBadge },
    { type: 'item', href: `/${locale}/dashboard/qr`, icon: QrCode, label: copy.qr },
    { type: 'item', href: `/${locale}/dashboard/platforms`, icon: Link2, label: copy.platforms },
    { type: 'item', href: `/${locale}/dashboard/analytics`, icon: BarChart3, label: copy.analytics },
    { type: 'item', href: `/${locale}/dashboard/menu`, icon: UtensilsCrossed, label: copy.menu },
    { type: 'item', href: `/${locale}/dashboard/restaurants`, icon: Store, label: copy.restaurants },
    { type: 'item', href: `/${locale}/dashboard/leads`, icon: UsersRound, label: copy.leads },
    { type: 'item', href: `/${locale}/dashboard/announcements`, icon: Megaphone, label: copy.announcements },
    { type: 'item', href: `/${locale}/dashboard/guide`, icon: BookOpen, label: copy.guide },
    { type: 'item', href: `/${locale}/dashboard/profile`, icon: Settings, label: copy.profile },
  ];

  // Mobile bottom nav: 4 primary tabs + "More" sheet for the rest.
  const bottomNavItems = [
    { href: `/${locale}/dashboard`, icon: LayoutDashboard, label: copy.dashboard },
    { href: `/${locale}/dashboard/feedbacks`, icon: MessageSquareText, label: copy.feedbacks },
    { href: `/${locale}/dashboard/menu`, icon: UtensilsCrossed, label: copy.menu },
    { href: `/${locale}/dashboard/qr`, icon: QrCode, label: copy.qr },
  ];
  const moreSheetItems = [
    { href: `/${locale}/dashboard/analytics`, icon: BarChart3, label: copy.analytics },
    { href: `/${locale}/dashboard/platforms`, icon: Link2, label: copy.platforms },
    { href: `/${locale}/dashboard/restaurants`, icon: Store, label: copy.restaurants },
    { href: `/${locale}/dashboard/leads`, icon: UsersRound, label: copy.leads },
    { href: `/${locale}/dashboard/announcements`, icon: Megaphone, label: copy.announcements },
    { href: `/${locale}/dashboard/guide`, icon: BookOpen, label: copy.guide },
    { href: `/${locale}/dashboard/profile`, icon: Settings, label: copy.profile },
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

  const quotaLabel = locale === 'tr' ? 'Yorum kotan' : 'Review quota';
  const quotaValue =
    user.plan === 'trial' && trialDaysLeft !== null
      ? `${trialDaysLeft} ${locale === 'tr' ? 'gün deneme' : 'day trial'}`
      : `${workspace?.feedbackCount ?? 0} / ∞`;
  const planLabel =
    user.plan === 'trial'
      ? locale === 'tr'
        ? 'TRIAL'
        : 'TRIAL'
      : (user.plan || 'growth').toUpperCase() + (locale === 'tr' ? ' PLAN' : ' PLAN');
  const upgradeLabel = user.plan === 'trial'
    ? (locale === 'tr' ? 'Yükselt' : 'Upgrade')
    : (locale === 'tr' ? 'Planı yönet' : 'Manage plan');

  const SidebarContent = ({ navRef: forwardedNavRef }: { navRef?: React.MutableRefObject<HTMLElement | null> } = {}) => (
    <div className="flex h-full flex-col bg-[#0A0A0A] text-white">
      {/* Logo */}
      <div className="px-4 pt-5 pb-3">
        <Link href={`/${locale}/dashboard`} className="flex items-center gap-2.5">
          <BuazeLogo size={32} variant="on-dark" imageUrl={logoUrl} />
          <span
            className="text-[18px] font-medium tracking-[-0.03em] text-white leading-none bz-h-tight"
          >
            buaze<span className="text-[#C6F24E]">.</span>
          </span>
        </Link>
      </div>

      {/* Workspace switcher */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2.5 rounded-lg bg-[#1A1A1A] px-3 py-2.5">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#C6F24E] text-[#0A0A0A] text-[12px] font-semibold bz-h-tight"
          >
            {primaryInitial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-white leading-tight">{primaryName}</p>
            <p className="pulse-eyebrow text-white/50 mt-0.5">
              {locationCount} {locale === 'tr' ? 'KONUM' : 'LOCATIONS'}
            </p>
          </div>
          <ChevronDown size={14} className="text-white/40 shrink-0" strokeWidth={2} />
        </div>
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
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-all ${
                  isActive
                    ? 'bg-[#C6F24E] text-[#0A0A0A] font-semibold shadow-[0_2px_8px_-2px_rgba(198,242,78,0.4)]'
                    : 'text-white/70 hover:bg-white/5 hover:text-white font-medium'
                }`}
              >
                <Icon size={16} strokeWidth={2} />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge !== undefined && item.badge !== 0 && (
                  <span
                    className="text-[10px] font-semibold rounded-full px-2 py-0.5"
                    style={{
                      background: isActive ? 'rgba(10,10,10,0.1)' : 'rgba(198,242,78,0.2)',
                      color: isActive ? '#0A0A0A' : '#C6F24E',
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
          const Icon = item.icon;
          const childActive = item.children.some(
            (c) => pathname === c.href || pathname?.startsWith(`${c.href}/`),
          );
          const isExpanded = childActive || expandedGroups[item.id] === true;
          return (
            <div key={item.id}>
              {showDividerBefore && (
                <div aria-hidden className="my-2 mx-3 h-px bg-white/5" />
              )}
              <button
                type="button"
                onClick={() => toggleGroup(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-all ${
                  childActive
                    ? 'bg-white/[0.07] text-white font-semibold'
                    : 'text-white/70 hover:bg-white/5 hover:text-white font-medium'
                }`}
                aria-expanded={isExpanded}
              >
                <Icon size={16} strokeWidth={2} />
                <span className="flex-1 truncate text-left">{item.label}</span>
                <ChevronRight
                  size={14}
                  strokeWidth={2}
                  className={`text-white/50 transition-transform duration-200 ${
                    isExpanded ? 'rotate-90' : ''
                  }`}
                />
              </button>
              {isExpanded && (
                <div className="mt-1 ml-5 space-y-0.5 border-l border-white/10 pl-3 pb-1">
                  {item.children.map((child) => {
                    const ChildIcon = child.icon;
                    const isActive =
                      pathname === child.href || pathname?.startsWith(`${child.href}/`);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={handleNavClick}
                        aria-current={isActive ? 'page' : undefined}
                        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] transition-all ${
                          isActive
                            ? 'bg-[#C6F24E] text-[#0A0A0A] font-semibold'
                            : 'text-white/60 hover:bg-white/5 hover:text-white font-medium'
                        }`}
                      >
                        <ChildIcon size={14} strokeWidth={2} />
                        <span className="truncate">{child.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Plan card */}
      <div className="mx-3 my-3 rounded-lg bg-[#1A1A1A] p-3.5">
        <div className="flex items-center gap-1.5">
          {user.plan === 'trial' && <Crown size={11} strokeWidth={2} className="text-[#C6F24E]" />}
          <span className="pulse-eyebrow text-[#C6F24E]">{planLabel}</span>
        </div>
        <p className="mt-2 text-[12px] text-white/70 leading-[1.45]">
          {quotaLabel}:{' '}
          <span
            className="font-semibold text-white bz-h-tight"
          >
            {quotaValue}
          </span>
        </p>
        <Link
          href={`/${locale}/pricing`}
          className="mt-2.5 block rounded-full bg-[#C6F24E] px-3 py-1.5 text-center text-[12px] font-semibold text-[#0A0A0A] hover:bg-[#A8D62E] transition-colors"
        >
          {upgradeLabel}
        </Link>
      </div>

      {/* User row + logout */}
      <div className="border-t border-white/10 bg-black/20 p-3">
        <div className="mb-2 flex items-center gap-2.5 rounded-xl bg-white/5 px-2.5 py-2">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0A0A0A] text-[12px] font-semibold text-[#C6F24E] border border-white/10 bz-h-tight"
          >
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-medium text-white">{displayName}</p>
            <p className="truncate text-[10px] text-white/50">{user.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-[12px] font-medium text-white/60 transition-all hover:bg-white/5 hover:text-red-300"
        >
          <LogOut size={13} strokeWidth={2} />
          {copy.logout}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FFFFFF] lg:flex lg:h-screen lg:overflow-hidden relative">
      <a href="#panel-main-content" className="bz-skip-link">
        {locale === 'tr' ? 'İçeriğe atla' : 'Skip to content'}
      </a>
      {/* Desktop sidebar */}
      <aside className="hidden h-full w-64 shrink-0 border-r border-white/5 lg:flex">
        <SidebarContent navRef={navRef} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:h-full lg:overflow-y-auto">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-40 flex items-center justify-between border-b border-[#EDEDED] bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
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
            <button
              onClick={() => setDrawerOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0A0A0A] text-[13px] font-semibold text-[#C6F24E] bz-h-tight"
            >
              {drawerOpen ? <X size={18} strokeWidth={2} /> : <span>{initial}</span>}
            </button>
          </div>
        </div>

        {/* Desktop top bar (breadcrumb + title + search pill + avatar) */}
        {topBar && (
          <div className="hidden lg:flex items-center justify-between gap-4 border-b border-[#EDEDED] bg-white px-7 py-3.5">
            <div className="min-w-0">
              <p className="pulse-eyebrow text-[#737373]">{topBar.breadcrumb}</p>
              <h1
                className="mt-1 text-[22px] font-medium text-[#0A0A0A] tracking-[-0.02em] leading-none truncate bz-h-tight"
              >
                {topBar.title}
              </h1>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <div
                className="hidden xl:flex items-center gap-2 rounded-full border border-[#EDEDED] bg-white px-3.5 py-2 text-[12px] text-[#737373] cursor-not-allowed select-none"
                aria-hidden
                title={locale === 'tr' ? 'Yakında: komut paleti' : 'Coming soon: command palette'}
              >
                <Search size={12} strokeWidth={2} />
                <span>{locale === 'tr' ? 'Yorum, konum, ekip ara…' : 'Search reviews, locations, team…'}</span>
                <span
                  className="ml-1 rounded bg-[#F5F5F5] px-1.5 py-0.5 text-[10px] font-medium text-[#525252] bz-mono"
                >
                  ⌘K
                </span>
              </div>
              <Link
                href={`/${locale}/dashboard/announcements`}
                aria-label={copy.notifications}
                className="bz-btn-icon"
              >
                <Bell size={16} strokeWidth={2} />
              </Link>
              <Link
                href={`/${locale}/dashboard/profile`}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A0A0A] text-[12px] font-semibold text-[#C6F24E] hover:bg-[#1A1A1A] transition-colors bz-h-tight"
                aria-label={displayName}
              >
                {initial}
              </Link>
            </div>
          </div>
        )}

        <main
          id="panel-main-content"
          tabIndex={-1}
          className="min-w-0 flex-1 overflow-x-hidden pb-24 lg:pb-0"
        >
          {announcements.length > 0 && (
            <AnnouncementBanner announcements={announcements} locale={locale} />
          )}
          {children}
        </main>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="h-full w-72 max-w-[85vw] shadow-2xl">
            <SidebarContent />
          </div>
          <button
            className="flex-1 bg-black/50 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
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
                    <Icon size={16} strokeWidth={isActive ? 2.25 : 2} />
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
                <MoreHorizontal size={16} strokeWidth={moreActive ? 2.25 : 2} />
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
            className="absolute bottom-0 left-0 right-0 bg-[#0A0A0A] rounded-t-3xl border-t border-white/10 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] text-white shadow-2xl"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
            <div className="mb-3 flex items-center justify-between px-2">
              <p className="pulse-eyebrow text-white/60">{copy.more}</p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="close"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white/60 hover:bg-white/5 hover:text-white"
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
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-[13px] transition-colors ${
                        isActive
                          ? 'bg-[#C6F24E] text-[#0A0A0A] font-semibold'
                          : 'text-white/80 hover:bg-white/5 hover:text-white font-medium'
                      }`}
                    >
                      <Icon size={16} strokeWidth={2} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
              <li className="pt-2 mt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[13px] font-medium text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                >
                  <LogOut size={16} strokeWidth={2} />
                  <span>{copy.logout}</span>
                </button>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
