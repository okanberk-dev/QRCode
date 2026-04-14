'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Crown, LayoutDashboard, LogOut, Menu, MessageSquareText, QrCode, Store, User, X } from 'lucide-react';
import type { Locale } from '@/lib/translations';

interface DashboardUser {
  name: string | null;
  email: string;
  plan: string;
  trialEndsAt: string | null;
}

interface UserDashboardShellProps {
  locale: Locale;
  user: DashboardUser;
  children: React.ReactNode;
}

function getDaysLeft(trialEndsAt: string | null) {
  if (!trialEndsAt) return null;

  const now = new Date();
  const end = new Date(trialEndsAt);
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

export default function UserDashboardShell({ locale, user, children }: UserDashboardShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const trialDaysLeft = getDaysLeft(user.trialEndsAt);

  const copy = useMemo(() => {
    const isTr = locale === 'tr';
    return {
      dashboard: isTr ? 'Panel' : 'Dashboard',
      feedbacks: isTr ? 'Yorumlar' : 'Feedbacks',
      restaurants: isTr ? 'İşletmeler' : 'Locations',
      qr: 'QR',
      guide: isTr ? 'Kılavuz' : 'Guide',
      profile: isTr ? 'Profil' : 'Profile',
      logout: isTr ? 'Çıkış' : 'Logout',
      plan: isTr ? 'Plan' : 'Plan',
      trialLeft: isTr ? 'gün kaldı' : 'days left',
      menu: isTr ? 'Menü' : 'Menu',
    };
  }, [locale]);

  const navItems = [
    { href: `/${locale}/dashboard`, icon: LayoutDashboard, label: copy.dashboard },
    { href: `/${locale}/dashboard/feedbacks`, icon: MessageSquareText, label: copy.feedbacks },
    { href: `/${locale}/dashboard/restaurants`, icon: Store, label: copy.restaurants },
    { href: `/${locale}/dashboard/qr`, icon: QrCode, label: copy.qr },
    { href: `/${locale}/dashboard/guide`, icon: BookOpen, label: copy.guide },
    { href: `/${locale}/dashboard/profile`, icon: User, label: copy.profile },
  ];

  const primaryMobileItems = navItems.slice(0, 5);
  const displayName = user.name?.trim() || user.email.split('@')[0];

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error', error);
    }

    window.location.href = `/${locale}/auth/login`;
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-[#111827]">
      <div className="border-b border-white/10 px-5 py-5">
        <Link href={`/${locale}/dashboard`} className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FDBF1D] text-2xl font-black text-[#111827]">
            B
          </div>
          <div className="min-w-0">
            <p className="text-lg font-black tracking-tight text-white">Buaze</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500">{copy.dashboard}</p>
          </div>
        </Link>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
        <div className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-black transition-all ${
                  isActive
                    ? 'border-[#FDBF1D] bg-[#FDBF1D] text-[#111827]'
                    : 'border-transparent text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={18} strokeWidth={2.75} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {user.plan === 'trial' && trialDaysLeft !== null && (
          <div className="rounded-3xl border border-orange-500/20 bg-orange-500/10 p-4">
            <div className="mb-2 flex items-center gap-2 text-orange-400">
              <Crown size={14} strokeWidth={2.75} />
              <span className="text-[11px] font-black uppercase tracking-[0.25em]">{copy.plan}</span>
            </div>
            <p className="text-sm font-black text-white">{trialDaysLeft} {copy.trialLeft}</p>
          </div>
        )}
      </div>

      <div className="border-t border-white/10 bg-black/20 p-4">
        <div className="mb-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
          <p className="truncate text-sm font-black text-white">{displayName}</p>
          <p className="truncate text-xs font-bold text-gray-500">{user.email}</p>
        </div>

        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-3 rounded-2xl px-4 py-3 text-sm font-black text-red-400 transition-all hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut size={16} strokeWidth={2.75} />
          {copy.logout}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FCFBF7] lg:flex">
      <aside className="hidden h-screen w-72 shrink-0 border-r border-white/5 lg:flex">
        <SidebarContent />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-40 flex items-center justify-between border-b border-white/60 bg-[#FCFBF7]/95 px-4 py-4 backdrop-blur lg:hidden">
          <Link href={`/${locale}/dashboard`} className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#111827] text-xl font-black text-[#FDBF1D]">
              B
            </div>
            <div className="min-w-0">
              <p className="text-base font-black tracking-tight text-[#111827]">Buaze</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#6b6760]">{copy.menu}</p>
            </div>
          </Link>

          <button
            onClick={() => setMobileOpen((open) => !open)}
            className="rounded-2xl border border-[#111827]/10 bg-white p-3 text-[#111827] shadow-sm"
          >
            {mobileOpen ? <X size={20} strokeWidth={2.75} /> : <Menu size={20} strokeWidth={2.75} />}
          </button>
        </div>

        <main className="min-w-0 flex-1 overflow-x-hidden pb-24 lg:pb-0">
          {children}
        </main>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="h-full w-[88vw] max-w-sm">
            <SidebarContent />
          </div>
          <button className="flex-1 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/60 bg-[#111827]/95 px-2 py-2 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-1">
          {primaryMobileItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-2 text-center transition-all ${
                  isActive ? 'bg-[#FDBF1D]/15 text-[#FDBF1D]' : 'text-gray-400'
                }`}
              >
                <Icon size={18} strokeWidth={isActive ? 3 : 2.5} />
                <span className="truncate text-[9px] font-black uppercase tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
