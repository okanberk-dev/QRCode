'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Store, QrCode, UsersRound, Crown } from 'lucide-react';
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
    { href: '/admin/members', icon: Crown, label: 'Üyeler', roles: ['superadmin'] },
    { href: '/admin/customers', icon: UsersRound, label: t('customers'), roles: ['superadmin'] },
  ];

  const filteredItems = navItems.filter(item => item.roles.includes(role));

  return (
    <nav
      aria-label="Mobil navigasyon"
      className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0A0A0A]/95 border-t border-white/10 z-50 shadow-[0_-4px_20px_0_rgba(0,0,0,0.4)] backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex items-stretch justify-around px-2 pt-2 pb-1.5">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <li key={item.href} className="flex-1 min-w-0">
              <Link
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex flex-col items-center gap-1 px-1 py-1.5 rounded-xl transition-colors ${
                  isActive ? 'text-[#C6F24E]' : 'text-[#EDEDED]/70 hover:text-white'
                }`}
              >
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#C6F24E] rounded-b-full"
                  />
                )}
                <span className={`p-2 rounded-xl transition-colors ${isActive ? 'bg-[#C6F24E]/15' : ''}`}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-tight truncate max-w-full leading-none">
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
