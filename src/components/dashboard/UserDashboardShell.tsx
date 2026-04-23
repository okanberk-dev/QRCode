'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Crown, LayoutDashboard, LogOut, MessageSquareText, MoreHorizontal, QrCode, Store, User, UtensilsCrossed, X, UsersRound } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import AnnouncementBanner, { type DashboardAnnouncement } from './AnnouncementBanner';
import BuazeLogo from '@/components/marketing/BuazeLogo';

interface DashboardUser {
  name: string | null;
  email: string;
  plan: string;
  trialEndsAt: string | null;
}

interface UserDashboardShellProps {
  locale: Locale;
  user: DashboardUser;
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

export default function UserDashboardShell({ locale, user, announcements = [], logoUrl, children }: UserDashboardShellProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const trialDaysLeft = getDaysLeft(user.trialEndsAt);

  const copy = useMemo(() => {
    const isTr = locale === 'tr';
    return {
      dashboard: isTr ? 'Panel' : 'Dashboard',
      feedbacks: isTr ? 'Yorumlar' : 'Feedbacks',
      restaurants: isTr ? 'İşletmeler' : 'Locations',
      qr: 'QR',
      menu: isTr ? 'Menü' : 'Menu',
      guide: isTr ? 'Kılavuz' : 'Guide',
      profile: isTr ? 'Profil' : 'Profile',
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
    { href: `/${locale}/dashboard/restaurants`, icon: Store, label: copy.restaurants },
    { href: `/${locale}/dashboard/menu`, icon: UtensilsCrossed, label: copy.menu },
    { href: `/${locale}/dashboard/qr`, icon: QrCode, label: copy.qr },
    { href: `/${locale}/dashboard/leads`, icon: UsersRound, label: copy.leads },
    { href: `/${locale}/dashboard/guide`, icon: BookOpen, label: copy.guide },
    { href: `/${locale}/dashboard/profile`, icon: User, label: copy.profile },
  ];

  // Mobile bottom nav: 4 primary tabs + "More" sheet for the rest.
  const bottomNavItems = [
    { href: `/${locale}/dashboard`, icon: LayoutDashboard, label: copy.dashboard },
    { href: `/${locale}/dashboard/feedbacks`, icon: MessageSquareText, label: copy.feedbacks },
    { href: `/${locale}/dashboard/menu`, icon: UtensilsCrossed, label: copy.menu },
    { href: `/${locale}/dashboard/qr`, icon: QrCode, label: copy.qr },
  ];
  const moreSheetItems = [
    { href: `/${locale}/dashboard/restaurants`, icon: Store, label: copy.restaurants },
    { href: `/${locale}/dashboard/leads`, icon: UsersRound, label: copy.leads },
    { href: `/${locale}/dashboard/guide`, icon: BookOpen, label: copy.guide },
    { href: `/${locale}/dashboard/profile`, icon: User, label: copy.profile },
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

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-[#0A0A0A]">
      {/* Logo */}
      <div className="border-b border-white/10 px-5 py-5">
        <Link href={`/${locale}/dashboard`} className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center flex-shrink-0"><BuazeLogo size={40} variant="on-dark" imageUrl={logoUrl} /></div>
          <div className="min-w-0">
            <p
              className="text-[18px] font-medium tracking-[-0.03em] text-white leading-none"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              buaze<span className="text-[#C6F24E]">.</span>
            </p>
            <p className="pulse-eyebrow text-white/50 mt-1.5">{copy.dashboard}</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <div className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
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

      {/* Trial banner */}
      {user.plan === 'trial' && trialDaysLeft !== null && (
        <div className="mx-3 mb-3 rounded-xl bg-[#1A1A1A] p-4">
          <div className="flex items-center gap-1.5 text-[#C6F24E]">
            <Crown size={12} strokeWidth={2} />
            <span className="pulse-eyebrow text-[#C6F24E]">{copy.plan}</span>
          </div>
          <p className="mt-2 text-[14px] font-medium text-white">
            <span
              style={{ fontFamily: 'var(--font-heading)' }}
              className="text-[22px] tracking-[-0.02em] leading-none"
            >
              {trialDaysLeft}
            </span>{' '}
            <span className="text-white/60 text-[12px]">{copy.trialLeft}</span>
          </p>
        </div>
      )}

      {/* User footer */}
      <div className="border-t border-white/10 bg-black/20 p-3">
        <div className="mb-2 flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#C6F24E] text-[13px] font-semibold text-[#0A0A0A]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-white">{displayName}</p>
            <p className="truncate text-[11px] text-white/50">{user.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-medium text-white/60 transition-all hover:bg-white/5 hover:text-red-300"
        >
          <LogOut size={14} strokeWidth={2} />
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
            <button
              onClick={() => setDrawerOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0A0A0A] text-[13px] font-semibold text-[#C6F24E]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {drawerOpen ? <X size={18} strokeWidth={2} /> : <span>{initial}</span>}
            </button>
          </div>
        </div>

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
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#0A0A0A]/95 border-t border-white/10 backdrop-blur-md shadow-[0_-4px_20px_0_rgba(0,0,0,0.35)] lg:hidden"
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
            className="absolute bottom-0 left-0 right-0 bg-[#0A0A0A] rounded-t-3xl border-t border-white/10 shadow-2xl px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
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
