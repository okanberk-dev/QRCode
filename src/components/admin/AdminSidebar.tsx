'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, LogOut, Store, QrCode, Users } from 'lucide-react';
import Link from 'next/link';

export default function AdminSidebar() {
  const pathname = usePathname();
  const [role, setRole] = useState('superadmin'); // default to superadmin before load

  useEffect(() => {
    fetch('/api/admin/me')
      .then(res => res.ok ? res.json() : { role: 'manager' })
      .then(data => setRole(data.role))
      .catch(() => setRole('manager'));
  }, []);

  const handleLogout = async () => {
    document.cookie = 'admin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    window.location.href = '/admin';
  };

  const menuItems = [
    { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['superadmin', 'manager'] },
    { href: '/admin/restaurants', icon: Store, label: 'Restoranlar', roles: ['superadmin'] },
    { href: '/admin/qr', icon: QrCode, label: 'QR Kodlar', roles: ['superadmin', 'manager'] },
  ];
  
  if (role === 'superadmin') {
    menuItems.push({ href: '/admin/users', icon: Users, label: 'Kullanıcılar', roles: ['superadmin'] } as any);
  }

  return (
    <div className="w-full md:w-64 bg-white border-b md:border-r md:border-b-0 border-gray-200 p-4 flex flex-col justify-between shadow-sm z-50">
      <div>
        <div className="mb-8 p-2">
          <h1 className="text-xl font-bold bg-gradient-to-r from-[#1a73e8] to-[#185abc] bg-clip-text text-transparent">
            QR Platform
          </h1>
          <p className="text-[10px] text-gray-400 mt-0.5">Yönetim Paneli</p>
        </div>
        
        <nav className="space-y-1">
          {menuItems.filter(i => i.roles.includes(role)).map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-[#e8f0fe] text-[#1a73e8] font-semibold'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors w-full mt-auto"
      >
        <LogOut size={20} />
        Çıkış Yap
      </button>
    </div>
  );
}
