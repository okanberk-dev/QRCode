'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, LogOut, Store, QrCode, Users, Clock, Crown, UsersRound, Globe } from 'lucide-react';
import Link from 'next/link';
import { useAdminTranslation } from './AdminTranslationProvider';

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
  const { t, locale, setLocale } = useAdminTranslation();
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
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error', e);
    }
    window.location.href = '/admin';
  };

  const menuItems = [
    { href: '/admin/dashboard', icon: LayoutDashboard, label: t('dashboard'), roles: ['superadmin', 'manager', 'restaurant_owner'] },
    { href: '/admin/restaurants', icon: Store, label: t('restaurants'), roles: ['superadmin', 'restaurant_owner'] },
    { href: '/admin/qr', icon: QrCode, label: t('qr_codes'), roles: ['superadmin', 'manager', 'restaurant_owner'] },
    { href: `/${locale}/dashboard/guide`, icon: BookOpen, label: locale === 'tr' ? 'Kullanım Kılavuzu' : 'User Guide', roles: ['superadmin', 'manager', 'restaurant_owner'] },
  ];

  if (role === 'superadmin') {
    menuItems.push({ href: '/admin/users', icon: Users, label: t('users'), roles: ['superadmin'] } as any);
    menuItems.push({ href: '/admin/customers', icon: UsersRound, label: t('customers'), roles: ['superadmin'] } as any);
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
    <div className="flex flex-col h-full bg-[#111827]">
      {/* ─── Logo ─── */}
      <div className="p-6 border-b border-white/10 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FDBF1D] flex items-center justify-center text-[#111827] font-black text-2xl leading-none flex-shrink-0 shadow-sm">
            B
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white tracking-tight leading-none">Buaze</h1>
            <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mt-1">{roleLabel}</p>
          </div>
          {planBadge()}
        </div>
      </div>

      {/* ─── Nav ─── */}
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
        {menuItems.filter(i => i.roles.includes(role)).map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-black text-sm border border-transparent ${
                isActive
                  ? 'bg-[#FDBF1D] text-[#111827] shadow-sm'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon size={20} className={isActive ? 'text-[#111827]' : 'text-gray-500 group-hover:text-white'} strokeWidth={2.5} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* ─── Trial Warning ─── */}
      {trialInfo && !trialInfo.isExpired && trialInfo.daysLeft <= 7 && (
        <div className="mx-4 mb-4 bg-orange-500/10 border-2 border-orange-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-orange-400" strokeWidth={3} />
            <p className="text-orange-400 text-[11px] font-black uppercase tracking-wider">Deneme Süresi</p>
          </div>
          <p className="text-white text-xs font-bold leading-tight">{trialInfo.daysLeft} gün kaldı</p>
          <div className="mt-3 w-full bg-orange-900/30 rounded-full h-2 overflow-hidden border border-orange-500/10">
            <div className="h-full bg-orange-400 transition-all duration-500" style={{ width: `${(trialInfo.daysLeft / 14) * 100}%` }} />
          </div>
        </div>
      )}

      {/* ─── User Info ─── */}
      <div className="p-4 border-t border-white/10 bg-black/20">
        <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-2xl bg-white/5 border border-white/5">
          <div className="w-9 h-9 rounded-xl bg-[#FDBF1D] border border-[#1f1e1d] flex items-center justify-center text-sm font-black text-[#111827] flex-shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-white truncate">{displayName}</p>
            <p className="text-[10px] text-gray-500 font-bold truncate tracking-tight">{profile?.email || profile?.username}</p>
          </div>
        </div>

        <div className="pt-2 pb-3 mb-2 border-b border-white/10 flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-gray-400" />
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">{t('system_language')}</span>
          </div>
          <select 
            value={locale}
            onChange={(e: any) => setLocale(e.target.value)}
            className="bg-white/10 text-white text-xs border-none rounded-lg px-2 py-1 outline-none font-bold"
          >
            <option value="tr" className="text-black">TR</option>
            <option value="en" className="text-black">EN</option>
          </select>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-2xl transition-all w-full text-sm font-bold border border-transparent active:scale-95"
        >
          <LogOut size={16} strokeWidth={2.5} />
          {t('logout')}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-[#111827] border-r border-white/5 flex-col h-full z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Top Bar */}
      <div className="lg:hidden bg-[#111827] border-b border-white/10 px-5 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#FDBF1D] flex items-center justify-center text-[#111827] font-black text-lg shadow-sm">B</div>
          <span className="text-white font-black text-lg tracking-tight">Buaze</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-white p-2 hover:bg-white/5 transition-colors rounded-xl">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-72 bg-[#111827] h-full flex flex-col border-r border-white/10 shadow-2xl">
            <SidebarContent />
          </div>
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  );
}
