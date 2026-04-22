'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Crown, LayoutDashboard, LogOut, MessageSquareText, QrCode, Store, User, UtensilsCrossed, X, UsersRound } from 'lucide-react';
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
  children: React.ReactNode;
}

function getDaysLeft(trialEndsAt: string | null) {
  if (!trialEndsAt) return null;
  const now = new Date();
  const end = new Date(trialEndsAt);
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

export default function UserDashboardShell({ locale, user, announcements = [], children }: UserDashboardShellProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
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
    };
  }, [locale]);

  const navItems = [
    { href: `/${locale}/dashboard`, icon: LayoutDashboard, label: copy.dashboard },
    { href: `/${locale}/dashboard/feedbacks`, icon: MessageSquareText, label: copy.feedbacks },
    { href: `/${locale}/dashboard/restaurants`, icon: Store, label: copy.restaurants },
    { href: `/${locale}/dashboard/menu`, icon: UtensilsCrossed, label: copy.menu },
    { href: `/${locale}/dashboard/qr`, icon: QrCode, label: copy.qr },
    { href: `/${locale}/dashboard/leads`, icon: UsersRound, label: locale === 'tr' ? 'Müşteri Listesi' : 'Customer List' },
    { href: `/${locale}/dashboard/guide`, icon: BookOpen, label: copy.guide },
    { href: `/${locale}/dashboard/profile`, icon: User, label: copy.profile },
  ];

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
    <div className="flex h-full flex-col bg-[#1A2332]">
      {/* Logo */}
      <div className="border-b border-white/10 px-5 py-5">
        <Link href={`/${locale}/dashboard`} className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center flex-shrink-0"><BuazeLogo size={44} variant="on-dark" /></div>
          <div className="min-w-0">
            <p className="text-lg font-black tracking-tight text-white">Buaze</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/45">{copy.dashboard}</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <div className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setDrawerOpen(false)}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition-all ${
                isActive
                  ? 'bg-[#F4B400] text-[#1A2332]'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={18} strokeWidth={2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Trial banner */}
      {user.plan === 'trial' && trialDaysLeft !== null && (
        <div className="mx-3 mb-3 rounded-2xl border border-[#F4B400]/30 bg-[#F4B400]/10 p-4">
          <div className="mb-1.5 flex items-center gap-2 text-[#F4B400]">
            <Crown size={13} strokeWidth={2} />
            <span className="text-[10px] font-black uppercase tracking-[0.25em]">{copy.plan}</span>
          </div>
          <p className="text-sm font-black text-white">{trialDaysLeft} {copy.trialLeft}</p>
        </div>
      )}

      {/* User footer */}
      <div className="border-t border-white/10 bg-black/20 p-3">
        <div className="mb-2 flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-3 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F4B400] text-sm font-black text-[#1A2332]">{initial}</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-white">{displayName}</p>
            <p className="truncate text-[11px] font-bold text-white/45">{user.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black text-red-400 transition-all hover:bg-red-500/10 hover:text-red-300 active:scale-95"
        >
          <LogOut size={16} strokeWidth={2} />
          {copy.logout}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F6F1] lg:flex lg:h-screen lg:overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden h-full w-64 shrink-0 border-r border-white/5 lg:flex">
        <SidebarContent />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:h-full lg:overflow-y-auto">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-40 flex items-center justify-between border-b border-[#E8ECF2]/60 bg-white/95 px-4 py-3 backdrop-blur lg:hidden shadow-sm">
          <Link href={`/${locale}/dashboard`} className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center"><BuazeLogo size={36} variant="default" /></div>
            <span className="text-base font-black tracking-tight text-[#1A2332]">Buaze</span>
          </Link>

          <div className="flex items-center gap-2">
            {user.plan === 'trial' && trialDaysLeft !== null && trialDaysLeft <= 5 && (
              <span className="hidden sm:flex items-center gap-1.5 rounded-full bg-[#FFF8D6] border border-[#FFD666]/50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#D69E00]">
                <Crown size={10} /> {trialDaysLeft}g
              </span>
            )}
            <button
              onClick={() => setDrawerOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1A2332] text-sm font-black text-[#F4B400]"
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

      {/* Mobile bottom nav — all 6 items */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#1A2332]/97 border-t border-white/10 backdrop-blur-md lg:hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.25rem)' }}
      >
        <div className="flex items-stretch">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-0.5 pt-2 pb-1.5 transition-all ${
                  isActive ? 'text-[#F4B400]' : 'text-white/45 hover:text-white/75'
                }`}
              >
                <div className={`rounded-xl p-1.5 transition-all ${isActive ? 'bg-[#F4B400]/15' : ''}`}>
                  <Icon size={19} strokeWidth={isActive ? 2.75 : 2} />
                </div>
                <span className="text-[8px] font-black uppercase tracking-tight leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
