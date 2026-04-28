'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, BookOpen, ChevronDown, Crown, LayoutDashboard, LogOut, MessageSquareText, MoreHorizontal, Plug, QrCode, Search, Settings, Store, UtensilsCrossed, X, UsersRound } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import AnnouncementBanner, { type DashboardAnnouncement } from './AnnouncementBanner';
import BuazeLogo from '@/components/marketing/BuazeLogo';
import NotificationBell from '@/components/notifications/NotificationBell';

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
  if (rest.startsWith('/integrations')) return { breadcrumb: isTr ? 'PANEL / ENTEGRASYONLAR' : 'PANEL / INTEGRATIONS', title: isTr ? 'Entegrasyonlar' : 'Integrations' };
  if (rest.startsWith('/leads')) return { breadcrumb: isTr ? 'PANEL / MÜŞTERİLER' : 'PANEL / CUSTOMERS', title: isTr ? 'Müşteriler' : 'Customers' };
  if (rest.startsWith('/guide')) return { breadcrumb: isTr ? 'PANEL / KILAVUZ' : 'PANEL / GUIDE', title: isTr ? 'Kılavuz' : 'Guide' };
  if (rest.startsWith('/profile')) return { breadcrumb: isTr ? 'AYARLAR / HESAP' : 'SETTINGS / ACCOUNT', title: isTr ? 'Ayarlar' : 'Settings' };
  return null;
}

export default function UserDashboardShell({ locale, user, workspace, announcements = [], logoUrl, children }: UserDashboardShellProps) {
  void TOP_BAR_MAP;
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
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
      integrations: isTr ? 'Entegrasyonlar' : 'Integrations',
      guide: isTr ? 'Kılavuz' : 'Guide',
      profile: isTr ? 'Ayarlar' : 'Settings',
      logout: isTr ? 'Çıkış' : 'Logout',
      plan: isTr ? 'Plan' : 'Plan',
      trialLeft: isTr ? 'gün kaldı' : 'days left',
      more: isTr ? 'Daha fazla' : 'More',
      leads: isTr ? 'Müşteri Listesi' : 'Customer List',
    };
  }, [locale]);

  const navItems = [
    { href: `/${locale}/dashboard`, icon: LayoutDashboard, label: copy.dashboard },
    { href: `/${locale}/dashboard/feedbacks`, icon: MessageSquareText, label: copy.feedbacks },
    { href: `/${locale}/dashboard/qr`, icon: QrCode, label: copy.qr },
    { href: `/${locale}/dashboard/analytics`, icon: BarChart3, label: copy.analytics },
    { href: `/${locale}/dashboard/restaurants`, icon: Store, label: copy.restaurants },
    { href: `/${locale}/dashboard/menu`, icon: UtensilsCrossed, label: copy.menu },
    { href: `/${locale}/dashboard/integrations`, icon: Plug, label: copy.integrations },
    { href: `/${locale}/dashboard/leads`, icon: UsersRound, label: copy.leads },
    { href: `/${locale}/dashboard/profile`, icon: Settings, label: copy.profile },
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
    { href: `/${locale}/dashboard/restaurants`, icon: Store, label: copy.restaurants },
    { href: `/${locale}/dashboard/integrations`, icon: Plug, label: copy.integrations },
    { href: `/${locale}/dashboard/leads`, icon: UsersRound, label: copy.leads },
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

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-[#0A0A0A] text-white">
      {/* Logo */}
      <div className="px-4 pt-5 pb-3">
        <Link href={`/${locale}/dashboard`} className="flex items-center gap-2.5">
          <BuazeLogo size={32} variant="on-dark" imageUrl={logoUrl} />
          <span
            className="text-[18px] font-medium tracking-[-0.03em] text-white leading-none"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            buaze<span className="text-[#C6F24E]">.</span>
          </span>
        </Link>
      </div>

      {/* Workspace switcher */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2.5 rounded-lg bg-[#1A1A1A] px-3 py-2.5">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#C6F24E] text-[#0A0A0A] text-[12px] font-semibold"
            style={{ fontFamily: 'var(--font-heading)' }}
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
      <div className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setDrawerOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-all ${
                isActive
                  ? 'bg-[#C6F24E] text-[#0A0A0A] font-semibold'
                  : 'text-white/70 hover:bg-white/5 hover:text-white font-medium'
              }`}
            >
              <Icon size={16} strokeWidth={2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Plan card */}
      <div className="mx-3 my-3 rounded-lg bg-[#1A1A1A] p-3.5">
        <div className="flex items-center gap-1.5">
          {user.plan === 'trial' && <Crown size={11} strokeWidth={2} className="text-[#C6F24E]" />}
          <span className="pulse-eyebrow text-[#C6F24E]">{planLabel}</span>
        </div>
        <p className="mt-2 text-[12px] text-white/70 leading-[1.45]">
          {quotaLabel}:{' '}
          <span
            className="font-semibold text-white"
            style={{ fontFamily: 'var(--font-heading)' }}
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
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0A0A0A] text-[12px] font-semibold text-[#C6F24E] border border-white/10"
            style={{ fontFamily: 'var(--font-heading)' }}
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
    <div className="min-h-screen bg-[#FFFFFF] lg:flex lg:h-screen lg:overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden h-full w-64 shrink-0 border-r border-white/5 lg:flex">
        <SidebarContent />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:h-full lg:overflow-y-auto">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-40 flex items-center justify-between border-b border-[#EDEDED] bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <Link href={`/${locale}/dashboard`} className="flex items-center gap-2">
            <BuazeLogo size={28} variant="default" imageUrl={logoUrl} />
            <span
              className="text-[18px] font-medium tracking-[-0.03em] text-[#0A0A0A]"
              style={{ fontFamily: 'var(--font-heading)' }}
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
              notificationsSettingsHref="/admin/notifications"
            />
            <button
              onClick={() => setDrawerOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0A0A0A] text-[13px] font-semibold text-[#C6F24E]"
              style={{ fontFamily: 'var(--font-heading)' }}
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
                className="mt-1 text-[22px] font-medium text-[#0A0A0A] tracking-[-0.02em] leading-none truncate"
                style={{ fontFamily: 'var(--font-heading)' }}
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
                  className="ml-1 rounded bg-[#F5F5F5] px-1.5 py-0.5 text-[10px] font-medium text-[#525252]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  ⌘K
                </span>
              </div>
              <NotificationBell
                locale={locale}
                announcements={announcements}
                panelBase={`/${locale}/dashboard`}
              />
              <Link
                href={`/${locale}/dashboard/profile`}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A0A0A] text-[12px] font-semibold text-[#C6F24E] hover:bg-[#1A1A1A] transition-colors"
                style={{ fontFamily: 'var(--font-heading)' }}
                aria-label={displayName}
              >
                {initial}
              </Link>
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1 overflow-x-hidden pb-24 lg:pb-0">
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

      {/* Mobile bottom nav — 4 primary tabs + More */}
      <nav
        aria-label={copy.dashboard}
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#0A0A0A]/95 border-t border-white/10 text-white backdrop-blur-md shadow-[0_-4px_20px_0_rgba(0,0,0,0.35)] lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
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
                    isActive ? 'text-[#C6F24E]' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#C6F24E] rounded-b-full"
                    />
                  )}
                  <span className={`p-2 rounded-lg transition-colors ${isActive ? 'bg-[#C6F24E]/15' : ''}`}>
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                  </span>
                  <span className="pulse-eyebrow truncate max-w-full">{item.label}</span>
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
                moreActive ? 'text-[#C6F24E]' : 'text-white/60 hover:text-white'
              }`}
            >
              {moreActive && (
                <span
                  aria-hidden="true"
                  className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#C6F24E] rounded-b-full"
                />
              )}
              <span className={`p-2 rounded-lg transition-colors ${moreActive ? 'bg-[#C6F24E]/15' : ''}`}>
                <MoreHorizontal size={18} strokeWidth={moreActive ? 2.5 : 2} />
              </span>
              <span className="pulse-eyebrow truncate max-w-full">{copy.more}</span>
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
