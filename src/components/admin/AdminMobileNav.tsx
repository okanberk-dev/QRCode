'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Store, QrCode, UsersRound, Menu } from 'lucide-react';
import Link from 'next/link';
import { useAdminTranslation } from './AdminTranslationProvider';

export default function AdminMobileNav() {
  const pathname = usePathname();
  const { t } = useAdminTranslation();
  const [role, setRole] = useState('manager');
  useEffect(() => {
    fetch('/api/admin/me')
      .then(res => res.ok ? res.json() : { role: 'manager' })
      .then(data => setRole(data.role || 'manager'))
      .catch(() => setRole('manager'));
  }, []);

  const navItems = [
    { href: '/admin/dashboard', icon: LayoutDashboard, label: t('dashboard'), roles: ['superadmin', 'manager', 'restaurant_owner'] },
    { href: '/admin/restaurants', icon: Store, label: t('restaurants'), roles: ['superadmin', 'restaurant_owner'] },
    { href: '/admin/qr', icon: QrCode, label: t('qr_codes'), roles: ['superadmin', 'manager', 'restaurant_owner'] },
    { href: '/admin/customers', icon: UsersRound, label: t('customers'), roles: ['superadmin'] },
  ];

  const filteredItems = navItems.filter(item => item.roles.includes(role));

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error', e);
    }
    window.location.href = '/admin';
  };

  return (
    <div
      className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#111827] border-t border-white/10 z-50 flex items-center justify-around px-2 pt-2 shadow-[0_-4px_20px_0_rgba(0,0,0,0.4)] backdrop-blur-md bg-opacity-95"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)' }}
    >
      {filteredItems.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 transition-all flex-1 min-w-0 ${
              isActive ? 'text-[#FDBF1D]' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <div className={`p-1.5 rounded-lg transition-all ${isActive ? 'bg-[#FDBF1D]/10' : ''}`}>
              <Icon size={20} strokeWidth={isActive ? 3 : 2} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-tight truncate max-w-full">{item.label}</span>
          </Link>
        );
      })}

      <button
        onClick={handleLogout}
        className="flex flex-col items-center gap-0.5 transition-all text-red-500/80 hover:text-red-400 flex-1 min-w-0"
      >
        <div className="p-1.5 rounded-lg transition-all">
          <Menu size={20} strokeWidth={2} />
        </div>
        <span className="text-[9px] font-black uppercase tracking-tight truncate max-w-full">{t('logout') || 'Çıkış'}</span>
      </button>
    </div>
  );
}
