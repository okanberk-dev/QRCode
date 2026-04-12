'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, LogOut, Store, QrCode, Users, Clock, Crown } from 'lucide-react';
import Link from 'next/link';

interface AdminProfile {
  id: string;
  username: string;
  role: string;
  restaurantId: string | null;
  name?: string | null;
  email?: string | null;
  plan?: string | null;
  trialEndsAt?: string | null;
}

function getTrialInfo(trialEndsAt: string | null | undefined): { daysLeft: number; isExpired: boolean } | null {
  if (!trialEndsAt) return null;
  const now = new Date();
  const end = new Date(trialEndsAt);
  const msLeft = end.getTime() - now.getTime();
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  return { daysLeft, isExpired: daysLeft <= 0 };
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const [role, setRole] = useState('superadmin');
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetch('/api/admin/me')
      .then(res => res.ok ? res.json() : { role: 'manager' })
      .then(data => {
        setRole(data.role || 'manager');
        setProfile(data);
      })
      .catch(() => setRole('manager'));
  }, []);

  const handleLogout = async () => {
    document.cookie = 'admin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'user_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    window.location.href = '/admin';
  };

  const menuItems = [
    { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['superadmin', 'manager', 'restaurant_owner'] },
    { href: '/admin/restaurants', icon: Store, label: 'Restoranlar', roles: ['superadmin', 'restaurant_owner'] },
    { href: '/admin/qr', icon: QrCode, label: 'QR Kodlar', roles: ['superadmin', 'manager', 'restaurant_owner'] },
  ];

  if (role === 'superadmin') {
    menuItems.push({ href: '/admin/users', icon: Users, label: 'Kullanıcılar', roles: ['superadmin'] } as any);
  }

  const roleLabel = role === 'superadmin' ? 'Superadmin' : role === 'restaurant_owner' ? 'Restoran Sahibi' : 'Restoran Yetkilisi';
  const displayName = profile?.name || profile?.username || profile?.email?.split('@')[0] || 'Kullanıcı';
  const trialInfo = profile?.plan === 'trial' ? getTrialInfo(profile?.trialEndsAt) : null;

  const planBadge = () => {
    if (role === 'superadmin') return <span className="bg-[#FDBF1D] text-[#111827] text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1"><Crown size={9} />ADMIN</span>;
    if (!profile?.plan || profile.plan === 'trial') return <span className="bg-orange-500/20 text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded-full">DENEME</span>;
    if (profile.plan === 'monthly') return <span className="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full">AYLIK</span>;
    if (profile.plan === 'yearly') return <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-full">YILLIK</span>;
    return null;
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* ─── Logo ─── */}
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FDBF1D] flex items-center justify-center text-[#111827] font-black text-xl leading-none flex-shrink-0">
            B
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-black text-white tracking-tight leading-none">Buaze</h1>
            <p className="text-[10px] text-gray-500 font-medium tracking-wider uppercase mt-0.5">{roleLabel}</p>
          </div>
          {planBadge()}
        </div>
      </div>

      {/* ─── Nav ─── */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {menuItems.filter(i => i.roles.includes(role)).map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all font-medium text-sm ${
                isActive
                  ? 'bg-[#FDBF1D]/10 text-[#FDBF1D] border border-[#FDBF1D]/20'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon size={18} className={isActive ? 'text-[#FDBF1D]' : 'text-gray-500'} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* ─── Trial Warning ─── */}
      {trialInfo && !trialInfo.isExpired && trialInfo.daysLeft <= 7 && (
        <div className="mx-3 mb-3 bg-orange-500/10 border border-orange-500/20 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={13} className="text-orange-400" />
            <p className="text-orange-400 text-xs font-bold">Deneme Süresi</p>
          </div>
          <p className="text-orange-300 text-xs">{trialInfo.daysLeft} gün kaldı</p>
          <div className="mt-2 w-full bg-orange-900/30 rounded-full h-1.5">
            <div className="h-1.5 rounded-full bg-orange-400" style={{ width: `${(trialInfo.daysLeft / 14) * 100}%` }} />
          </div>
        </div>
      )}

      {/* ─── User Info ─── */}
      <div className="p-3 border-t border-white/5">
        <div className="flex items-center gap-3 px-2 py-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{displayName}</p>
            <p className="text-[10px] text-gray-500 truncate">{profile?.email || profile?.username}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3.5 py-2.5 text-gray-500 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-colors w-full text-sm"
        >
          <LogOut size={16} />
          Çıkış Yap
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-[#111827] border-r border-white/5 shadow-xl flex-col h-full">
        <SidebarContent />
      </aside>

      {/* Mobile Top Bar */}
      <div className="md:hidden bg-[#111827] border-b border-white/5 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#FDBF1D] flex items-center justify-center text-[#111827] font-black text-base">B</div>
          <span className="text-white font-bold text-base">Buaze</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-gray-400 p-1">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-72 bg-[#111827] h-full shadow-2xl flex flex-col">
            <SidebarContent />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  );
}
