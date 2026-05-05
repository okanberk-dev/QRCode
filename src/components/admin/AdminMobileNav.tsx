'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Store, QrCode, Inbox, BarChart3 } from 'lucide-react';
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
    { href: '/admin/reviews', icon: Inbox, label: 'Yorumlar', roles: ['superadmin', 'manager', 'restaurant_owner'] },
    { href: '/admin/qr', icon: QrCode, label: t('qr_codes'), roles: ['superadmin', 'manager', 'restaurant_owner'] },
    { href: '/admin/analytics', icon: BarChart3, label: 'Analitik', roles: ['superadmin', 'manager', 'restaurant_owner'] },
  ];

  const filteredItems = navItems.filter(item => item.roles.includes(role));

  return (
    <nav
      aria-label="Mobil navigasyon"
      className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#EDEDED] z-50 text-[#0A0A0A] shadow-[0_-4px_20px_0_rgba(0,0,0,0.04)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid grid-cols-5 items-center px-2 pt-2 pb-1.5">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex flex-col items-center gap-[3px] px-1 pt-1.5 pb-1 transition-colors ${
                  isActive
                    ? 'text-[#0A0A0A] font-semibold'
                    : 'text-[#A3A3A3] font-medium hover:text-[#0A0A0A]'
                }`}
              >
                <Icon size={18} strokeWidth={2} />
                <span className="text-[10px] leading-none truncate max-w-full">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
