'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, MessageSquare, User, LogOut } from 'lucide-react';

import type { Locale } from '@/lib/translations';

type RestaurantMobileNavProps = {
  locale: Locale;
};

export default function RestaurantMobileNav({ locale }: RestaurantMobileNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      href: `/${locale}/dashboard`,
      icon: LayoutDashboard,
      label: locale === 'tr' ? 'Panel' : 'Dashboard',
    },
    {
      href: `/${locale}/dashboard/feedbacks`,
      icon: MessageSquare,
      label: locale === 'tr' ? 'Yorumlar' : 'Feedbacks',
    },
    {
      href: `/${locale}/dashboard/profile`,
      icon: User,
      label: locale === 'tr' ? 'Profil' : 'Profile',
    },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#111827] border-t border-white/10 z-50 flex items-center justify-around px-2 py-2 pb-safe shadow-[0_-4px_20px_0_rgba(0,0,0,0.4)] backdrop-blur-md bg-opacity-95">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 transition-all ${
              isActive ? 'text-[#FDBF1D]' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <div className={`p-1 rounded-lg transition-all ${isActive ? 'bg-[#FDBF1D]/10' : ''}`}>
              <Icon size={18} strokeWidth={isActive ? 3 : 2} />
            </div>
            <span className="text-[8px] font-black uppercase tracking-tight">{item.label}</span>
          </Link>
        );
      })}

      <form action="/api/auth/logout" method="POST">
        <button
          type="submit"
          className="flex flex-col items-center gap-0.5 transition-all text-red-500/80 hover:text-red-400"
        >
          <div className="p-1 rounded-lg transition-all">
            <LogOut size={18} strokeWidth={2} />
          </div>
          <span className="text-[8px] font-black uppercase tracking-tight">
            {locale === 'tr' ? 'Çıkış' : 'Logout'}
          </span>
        </button>
      </form>
    </div>
  );
}
