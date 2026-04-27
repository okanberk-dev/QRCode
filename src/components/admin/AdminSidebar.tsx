'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Bell,
  BookOpen,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Crown,
  FileEdit,
  Globe,
  Inbox,
  LayoutDashboard,
  LogOut,
  Mail,
  Megaphone,
  QrCode,
  Settings,
  Sparkles,
  Store,
  User,
  Users,
  UsersRound,
} from 'lucide-react';
import Link from 'next/link';
import { useAdminTranslation } from './AdminTranslationProvider';
import BuazeLogo from '@/components/marketing/BuazeLogo';

interface AdminProfile {
  id: string;
  username: string;
  role: string;
  restaurantId: string | null;
  name?: string | null;
  email?: string | null;
  plan?: string | null;
  trialEndsAt?: string | null;
  logoUrl?: string | null;
  workspaceName?: string | null;
  locationCount?: number | null;
}

function getTrialInfo(trialEndsAt: string | null | undefined): { daysLeft: number; isExpired: boolean } | null {
  if (!trialEndsAt) return null;
  const now = new Date();
  const end = new Date(trialEndsAt);
  const msLeft = end.getTime() - now.getTime();
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  return { daysLeft, isExpired: daysLeft <= 0 };
}

const SIDEBAR_GROUP_STATE_KEY = 'buaze.admin.sidebarGroups';

function loadGroupState(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(SIDEBAR_GROUP_STATE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function saveGroupState(state: Record<string, boolean>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SIDEBAR_GROUP_STATE_KEY, JSON.stringify(state));
  } catch {
    // localStorage full or disabled — ignore. Group state is purely UX
    // sugar; the user will just see all groups closed by default next
    // session.
  }
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const { t, locale, setLocale } = useAdminTranslation();
  const [role, setRole] = useState('superadmin');
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Expanded-group state: { groupId: bool }. Persisted to localStorage so
  // navigating between pages doesn't collapse what the operator opened.
  // Default missing → group is closed; we auto-expand below when an
  // active route lives inside the group.
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setExpandedGroups(loadGroupState());
  }, []);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      saveGroupState(next);
      return next;
    });
  };

  useEffect(() => {
    fetch('/api/admin/me')
      .then((res) => (res.ok ? res.json() : { role: 'manager' }))
      .then((data) => {
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

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  // Sidebar nav supports two entry kinds:
  //   - 'item': flat link (Dashboard, QR vs.)
  //   - 'group': collapsible parent that hides 2-4 related items under one
  //     header (Mail / Kullanıcılar / İçerik). Click toggles expand;
  //     clicking a child auto-keeps the group open if active route is
  //     inside.
  type NavItem = {
    type: 'item';
    href: string;
    icon: typeof LayoutDashboard;
    label: string;
    roles: string[];
  };
  type NavGroup = {
    type: 'group';
    id: string;
    icon: typeof LayoutDashboard;
    label: string;
    roles: string[];
    children: Array<{ href: string; icon: typeof LayoutDashboard; label: string }>;
  };
  type Nav = NavItem | NavGroup;

  const menuItems: Nav[] = [
    { type: 'item', href: '/admin/dashboard', icon: LayoutDashboard, label: t('dashboard'), roles: ['superadmin', 'manager', 'restaurant_owner'] },
    { type: 'item', href: '/admin/restaurants', icon: Store, label: t('restaurants'), roles: ['superadmin', 'restaurant_owner'] },
    { type: 'item', href: '/admin/qr', icon: QrCode, label: t('qr_codes'), roles: ['superadmin', 'manager', 'restaurant_owner'] },
    { type: 'item', href: '/admin/reviews', icon: Inbox, label: locale === 'en' ? 'Reviews' : 'Yorumlar', roles: ['superadmin', 'manager', 'restaurant_owner'] },
    { type: 'item', href: '/admin/analytics', icon: BarChart3, label: locale === 'en' ? 'Analytics' : 'Analitik', roles: ['superadmin', 'manager', 'restaurant_owner'] },
    // Workspace-scoped features — shown only to restaurant_owner (and
    // managers where it makes sense). Superadmin manages the platform
    // globally via groups below; these workspace entries would only
    // clutter that view.
    { type: 'item', href: '/admin/campaigns', icon: Sparkles, label: locale === 'en' ? 'Campaigns' : 'Kampanyalar', roles: ['restaurant_owner'] },
    { type: 'item', href: '/admin/team', icon: Users, label: locale === 'en' ? 'Team' : 'Ekip', roles: ['restaurant_owner'] },
    { type: 'item', href: '/admin/billing', icon: CreditCard, label: locale === 'en' ? 'Billing' : 'Faturalandırma', roles: ['restaurant_owner'] },
    { type: 'item', href: '/admin/notifications', icon: Bell, label: locale === 'en' ? 'Notifications' : 'Bildirimler', roles: ['manager', 'restaurant_owner'] },
    { type: 'item', href: '/admin/settings', icon: Settings, label: locale === 'en' ? 'Settings' : 'Ayarlar', roles: ['restaurant_owner'] },
  ];

  if (role === 'superadmin') {
    // Group: Kullanıcılar — 3 user-related panels
    menuItems.push({
      type: 'group',
      id: 'users',
      icon: Users,
      label: locale === 'en' ? 'Users' : 'Kullanıcılar',
      roles: ['superadmin'],
      children: [
        { href: '/admin/members', icon: Crown, label: locale === 'en' ? 'Business Owners' : 'İşletme Sahipleri' },
        { href: '/admin/users', icon: Users, label: locale === 'en' ? 'Admins' : 'Yöneticiler' },
        { href: '/admin/customers', icon: UsersRound, label: locale === 'en' ? 'Customers' : 'Müşteriler' },
      ],
    });

    // Group: Mail — 3-4 mail-related panels (dev preview only on local)
    const mailChildren: Array<{ href: string; icon: typeof LayoutDashboard; label: string }> = [
      { href: '/admin/newsletters', icon: Mail, label: locale === 'en' ? 'Newsletter Subscribers' : 'Bülten Aboneleri' },
      { href: '/admin/newsletters/campaigns', icon: Megaphone, label: locale === 'en' ? 'Newsletter Campaigns' : 'Bülten Kampanyaları' },
      { href: '/admin/mail-templates', icon: FileEdit, label: locale === 'en' ? 'Mail Templates' : 'Mail İçerikleri' },
    ];
    if (process.env.NODE_ENV !== 'production') {
      mailChildren.push({
        href: '/admin/dev/mail-preview',
        icon: Mail,
        label: locale === 'en' ? 'Mail Preview (dev)' : 'Mail Önizleme (dev)',
      });
    }
    menuItems.push({
      type: 'group',
      id: 'mail',
      icon: Mail,
      label: locale === 'en' ? 'Mail' : 'Mail',
      roles: ['superadmin'],
      children: mailChildren,
    });

    // Group: İçerik — blog + announcements
    menuItems.push({
      type: 'group',
      id: 'content',
      icon: BookOpen,
      label: locale === 'en' ? 'Content' : 'İçerik',
      roles: ['superadmin'],
      children: [
        { href: '/admin/blog', icon: BookOpen, label: locale === 'en' ? 'Blog' : 'Blog Yönetimi' },
        { href: '/admin/announcements', icon: Megaphone, label: locale === 'en' ? 'Announcements' : 'Duyurular' },
      ],
    });

    menuItems.push({
      type: 'item',
      href: '/admin/site-settings',
      icon: Settings,
      label: locale === 'en' ? 'Site Settings' : 'Site Ayarları',
      roles: ['superadmin'],
    });
  }

  menuItems.push({
    type: 'item',
    href: '/admin/profile',
    icon: User,
    label: locale === 'en' ? 'Profile' : 'Profilim',
    roles: ['superadmin', 'manager', 'restaurant_owner'],
  });

  const roleLabel =
    role === 'superadmin'
      ? locale === 'en'
        ? 'Superadmin'
        : 'Superadmin'
      : role === 'restaurant_owner'
        ? locale === 'en'
          ? 'Owner'
          : 'İşletme Sahibi'
        : locale === 'en'
          ? 'Manager'
          : 'İşletme Yetkilisi';
  const displayName = profile?.name || profile?.username || profile?.email?.split('@')[0] || 'Kullanıcı';
  // Strip leading whitespace + non-printable chars before slicing — defends
  // against sentinel-only display names (single space, etc.) that would
  // otherwise render an empty avatar.
  const initial = displayName.trim().charAt(0).toUpperCase() || '·';
  const trialInfo = profile?.plan === 'trial' ? getTrialInfo(profile?.trialEndsAt) : null;

  const workspaceName =
    profile?.workspaceName ||
    (role === 'superadmin' ? (locale === 'en' ? 'Buaze Admin' : 'Buaze Yönetim') : displayName);
  const workspaceMeta =
    role === 'superadmin'
      ? locale === 'en'
        ? 'ADMIN WORKSPACE'
        : 'YÖNETİM PANELİ'
      : profile?.locationCount
        ? `${profile.locationCount} ${locale === 'en' ? 'LOCATIONS' : 'KONUM'}`
        : locale === 'en'
          ? 'SINGLE WORKSPACE'
          : 'TEK İŞLETME';

  const planLabel = (() => {
    if (role === 'superadmin') return locale === 'en' ? 'ADMIN' : 'ADMIN';
    if (!profile?.plan || profile.plan === 'trial') return locale === 'en' ? 'TRIAL' : 'TRIAL';
    if (profile.plan === 'monthly') return locale === 'en' ? 'MONTHLY' : 'AYLIK';
    if (profile.plan === 'yearly') return locale === 'en' ? 'YEARLY' : 'YILLIK';
    return profile.plan.toUpperCase();
  })();

  const quotaText = (() => {
    if (role === 'superadmin') {
      return locale === 'en' ? 'Full system access' : 'Tüm sistem erişimi';
    }
    if (trialInfo) {
      return `${trialInfo.daysLeft} ${locale === 'en' ? 'day trial' : 'gün deneme'}`;
    }
    return locale === 'en' ? 'Unlimited reviews' : 'Sınırsız yorum';
  })();

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0A0A0A] text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Logo */}
      <div className="px-4 pt-5 pb-3">
        <Link href="/admin/dashboard" className="flex items-center gap-2.5">
          <BuazeLogo size={32} variant="on-dark" imageUrl={profile?.logoUrl} />
          <span
            className="text-[18px] font-medium tracking-[-0.03em] text-white leading-none"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            buaze<span className="text-[#C6F24E]">.</span>
          </span>
        </Link>
      </div>

      {/* Workspace switcher */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2.5 rounded-lg bg-[#1A1A1A] px-3 py-2.5">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#C6F24E] text-[#0A0A0A] text-[12px] font-semibold"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {workspaceName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-white leading-tight">{workspaceName}</p>
            <p className="pulse-eyebrow text-white/50 mt-0.5">{workspaceMeta}</p>
          </div>
          <ChevronDown size={14} className="text-white/40 shrink-0" strokeWidth={2} />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {menuItems
          .filter((i) => i.roles.includes(role))
          .map((item) => {
            if (item.type === 'item') {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-all ${
                    isActive
                      ? 'bg-[#C6F24E] text-[#0A0A0A] font-semibold'
                      : 'text-white/70 hover:bg-white/5 hover:text-white font-medium'
                  }`}
                >
                  <Icon size={16} strokeWidth={2} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            }

            // Group: collapsible parent with children. Auto-expanded
            // when the active route lives inside one of the children
            // — operator never has to click to find where they are.
            const Icon = item.icon;
            const childActive = item.children.some(
              (c) => pathname === c.href || pathname?.startsWith(c.href + '/'),
            );
            const isExpanded = childActive || expandedGroups[item.id] === true;
            return (
              <div key={item.id}>
                <button
                  type="button"
                  onClick={() => toggleGroup(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-all ${
                    childActive
                      ? 'bg-white/10 text-white font-semibold'
                      : 'text-white/70 hover:bg-white/5 hover:text-white font-medium'
                  }`}
                  aria-expanded={isExpanded}
                >
                  <Icon size={16} strokeWidth={2} />
                  <span className="flex-1 truncate text-left">{item.label}</span>
                  {isExpanded ? (
                    <ChevronDown size={14} strokeWidth={2} className="text-white/50" />
                  ) : (
                    <ChevronRight size={14} strokeWidth={2} className="text-white/50" />
                  )}
                </button>
                {isExpanded && (
                  <div className="mt-0.5 ml-3 space-y-0.5 border-l border-white/10 pl-3">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const isActive = pathname === child.href || pathname?.startsWith(child.href + '/');
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] transition-all ${
                            isActive
                              ? 'bg-[#C6F24E] text-[#0A0A0A] font-semibold'
                              : 'text-white/60 hover:bg-white/5 hover:text-white font-medium'
                          }`}
                        >
                          <ChildIcon size={14} strokeWidth={2} />
                          <span className="truncate">{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
      </nav>

      {/* Plan card (superadmin → "admin access" info · owner → trial/quota) */}
      <div className="mx-3 my-3 rounded-lg bg-[#1A1A1A] p-3.5">
        <div className="flex items-center gap-1.5">
          {role === 'superadmin' && <Crown size={11} strokeWidth={2} className="text-[#C6F24E]" />}
          {trialInfo && <BarChart3 size={11} strokeWidth={2} className="text-[#C6F24E]" />}
          <span className="pulse-eyebrow text-[#C6F24E]">{planLabel}</span>
        </div>
        <p className="mt-2 text-[12px] text-white/70 leading-[1.45]">
          {quotaText}
        </p>
        {trialInfo && !trialInfo.isExpired && (
          <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#C6F24E] transition-all"
              style={{ width: `${Math.min(100, (trialInfo.daysLeft / 14) * 100)}%` }}
            />
          </div>
        )}
        {role !== 'superadmin' && (
          <Link
            href="/admin/profile"
            onClick={() => setMobileOpen(false)}
            className="mt-2.5 block rounded-full bg-[#C6F24E] px-3 py-1.5 text-center text-[12px] font-semibold text-[#0A0A0A] hover:bg-[#A8D62E] transition-colors"
          >
            {locale === 'en' ? 'Manage plan' : 'Planı yönet'}
          </Link>
        )}
      </div>

      {/* User card + locale switcher + logout */}
      <div className="border-t border-white/10 bg-black/20 p-3">
        <div className="mb-2 flex items-center gap-2.5 rounded-xl bg-white/5 px-2.5 py-2">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0A0A0A] border border-white/10 text-[12px] font-semibold text-[#C6F24E]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-white">{displayName}</p>
            <p className="truncate pulse-eyebrow text-white/50 mt-0.5">{roleLabel}</p>
          </div>
        </div>

        <div className="flex items-center justify-between px-1 py-2 border-t border-white/10">
          <div className="flex items-center gap-1.5">
            <Globe size={12} strokeWidth={2} className="text-white/60" />
            <span className="pulse-eyebrow text-white/60">{t('system_language')}</span>
          </div>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as 'tr' | 'en')}
            className="bg-white/10 text-white text-[11px] font-medium border-none rounded-md px-2 py-1 outline-none cursor-pointer"
          >
            <option value="tr" className="text-black">TR</option>
            <option value="en" className="text-black">EN</option>
          </select>
        </div>

        <button
          onClick={handleLogout}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-medium text-white/60 transition-all hover:bg-white/5 hover:text-red-300"
        >
          <LogOut size={13} strokeWidth={2} />
          {t('logout')}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-[#0A0A0A] border-r border-white/5 flex-col h-full z-30 text-white">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div
        className="lg:hidden sticky top-0 z-40 flex items-center justify-between bg-[#0A0A0A] border-b border-white/10 px-4 py-3 text-white"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <Link href="/admin/dashboard" className="flex items-center gap-2">
          <BuazeLogo size={26} variant="on-dark" imageUrl={profile?.logoUrl} />
          <span
            className="text-[16px] font-medium tracking-[-0.03em] text-white"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            buaze<span className="text-[#C6F24E]">.</span>
          </span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-white hover:bg-white/10 transition-colors"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
          aria-label="Admin navigation"
        >
          <div
            className="w-[280px] max-w-[85vw] h-full bg-[#0A0A0A] border-r border-white/10 shadow-2xl flex flex-col text-white"
            style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <SidebarContent />
          </div>
          <button
            type="button"
            className="flex-1 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          />
        </div>
      )}
    </>
  );
}
