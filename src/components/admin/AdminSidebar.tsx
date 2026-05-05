'use client';

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Bell,
  BookOpen,
  ChevronDown,
  ChevronLeft,
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
  ScrollText,
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

const SIDEBAR_GROUP_STATE_KEY = 'buaze.admin.sidebarGroups';
const SIDEBAR_SCROLL_KEY = 'buaze.admin.sidebarScroll';

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

// Sidebar scrollTop persistence — sessionStorage so it doesn't leak across
// tabs but DOES survive navigations. Without this, clicking a child link
// inside a collapsible group would let the layout shift back to scrollTop
// 0 (because Next.js' layout hydration races the saved expand state),
// jumping the active item out of view.
function loadSidebarScroll(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.sessionStorage.getItem(SIDEBAR_SCROLL_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}
function saveSidebarScroll(scrollTop: number) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(scrollTop));
  } catch {
    /* swallow */
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
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    setExpandedGroups(loadGroupState());
    const collapsed = window.localStorage.getItem('buaze.admin.sidebarCollapsed') === 'true';
    setIsCollapsed(collapsed);
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem('buaze.admin.sidebarCollapsed', String(next));
      return next;
    });
  };

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

  // Desktop nav scroll persistence. Mobile drawer remounts on every open
  // so it doesn't need this — restore on mount + save before navigation.
  const navRef = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const target = loadSidebarScroll();
    if (target > 0) el.scrollTop = target;
  }, [pathname]);
  const handleNavClick = () => {
    const el = navRef.current;
    if (el) saveSidebarScroll(el.scrollTop);
    setMobileOpen(false);
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

  // Sidebar nav supports two entry kinds. Keep only the main landing page
  // flat; related admin surfaces live under compact collapsible groups.
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
    {
      type: 'group',
      id: 'operations',
      icon: Inbox,
      label: locale === 'en' ? 'Operations' : 'Operasyon',
      roles: ['superadmin', 'manager', 'restaurant_owner'],
      children: [
        { href: '/admin/reviews', icon: Inbox, label: locale === 'en' ? 'Reviews' : 'Yorumlar' },
        { href: '/admin/analytics', icon: BarChart3, label: locale === 'en' ? 'Analytics' : 'Analitik' },
        { href: '/admin/qr', icon: QrCode, label: t('qr_codes') },
        ...(role === 'manager' ? [] : [{ href: '/admin/restaurants', icon: Store, label: t('restaurants') }]),
        ...(role === 'superadmin'
          ? [{ href: '/admin/embed-usage', icon: Globe, label: locale === 'en' ? 'Embed usage' : 'Embed kullanımı' }]
          : []),
      ],
    },
    {
      type: 'group',
      id: 'workspace',
      icon: Store,
      label: locale === 'en' ? 'Workspace' : 'İşletme',
      roles: ['restaurant_owner'],
      children: [
        { href: '/admin/campaigns', icon: Sparkles, label: locale === 'en' ? 'Campaigns' : 'Kampanyalar' },
        { href: '/admin/team', icon: Users, label: locale === 'en' ? 'Team' : 'Ekip' },
        { href: '/admin/billing', icon: CreditCard, label: locale === 'en' ? 'Billing' : 'Faturalandırma' },
        { href: '/admin/notifications', icon: Bell, label: locale === 'en' ? 'Notification settings' : 'Bildirim ayarları' },
        { href: '/admin/settings', icon: Settings, label: locale === 'en' ? 'Settings' : 'Ayarlar' },
      ],
    },
    {
      type: 'group',
      id: 'manager-settings',
      icon: Bell,
      label: locale === 'en' ? 'Settings' : 'Ayarlar',
      roles: ['manager'],
      children: [
        { href: '/admin/notifications', icon: Bell, label: locale === 'en' ? 'Notification settings' : 'Bildirim ayarları' },
      ],
    },
  ];

  if (role === 'superadmin') {
    menuItems.push(
      {
        type: 'group',
        id: 'accounts',
        icon: Crown,
        label: locale === 'en' ? 'Accounts' : 'Hesaplar',
        roles: ['superadmin'],
        children: [
          { href: '/admin/members', icon: Crown, label: locale === 'en' ? 'Business Owners' : 'İşletme Sahipleri' },
          { href: '/admin/users', icon: Users, label: locale === 'en' ? 'Admins' : 'Yöneticiler' },
          { href: '/admin/customers', icon: UsersRound, label: locale === 'en' ? 'Customers' : 'Müşteriler' },
          { href: '/admin/plans', icon: CreditCard, label: locale === 'en' ? 'Subscriptions' : 'Abonelikler' },
        ],
      },
      {
        type: 'group',
        id: 'content',
        icon: BookOpen,
        label: locale === 'en' ? 'Content' : 'İçerik',
        roles: ['superadmin'],
        children: [
          { href: '/admin/blog', icon: BookOpen, label: locale === 'en' ? 'Blog' : 'Blog' },
          { href: '/admin/announcements', icon: Megaphone, label: locale === 'en' ? 'Announcements' : 'Duyurular' },
          {
            href: '/admin/legal-documents',
            icon: ScrollText,
            label: locale === 'en' ? 'Legal Documents' : 'Hukuki Metinler',
          },
          { href: '/admin/site-settings', icon: Settings, label: locale === 'en' ? 'Site Settings' : 'Site Ayarları' },
        ],
      },
      {
        type: 'group',
        id: 'mail',
        icon: Mail,
        label: locale === 'en' ? 'Mail' : 'Mail',
        roles: ['superadmin'],
        children: [
          { href: '/admin/newsletters', icon: Mail, label: locale === 'en' ? 'Newsletter' : 'Bülten Aboneleri' },
          { href: '/admin/newsletters/campaigns', icon: Megaphone, label: locale === 'en' ? 'Campaigns' : 'Bülten Kampanyaları' },
          { href: '/admin/mail-templates', icon: FileEdit, label: locale === 'en' ? 'Mail Templates' : 'Mail İçerikleri' },
          { href: '/admin/dev/lifecycle-emails', icon: Mail, label: locale === 'en' ? 'Lifecycle' : 'Yaşam Döngüsü' },
        ],
      },
    );
    if (process.env.NODE_ENV !== 'production') {
      const mailGroup = menuItems.find((item): item is NavGroup => item.type === 'group' && item.id === 'mail');
      mailGroup?.children.push({
        href: '/admin/dev/mail-preview',
        icon: Mail,
        label: locale === 'en' ? 'Mail Preview (dev)' : 'Mail Önizleme (dev)',
      });
    }
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

  const SidebarContent = ({ navRef: forwardedNavRef }: { navRef?: React.MutableRefObject<HTMLElement | null> } = {}) => (
    <div className="flex flex-col h-full bg-white text-[#0A0A0A]" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Logo */}
      <div className="px-4 pt-5 pb-3">
        <Link href="/admin/dashboard" className="flex items-center gap-2.5">
          <BuazeLogo size={32} variant="default" imageUrl={profile?.logoUrl} />
          {!isCollapsed && (
            <span
              className="text-[18px] font-medium tracking-[-0.03em] text-[#0A0A0A] leading-none animate-in fade-in slide-in-from-left-2 duration-300"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              buaze<span className="text-[#C6F24E]">.</span>
            </span>
          )}
        </Link>
      </div>

      {/* Workspace switcher */}
      <div className="px-3 pb-3">
        <div className={`flex items-center gap-2.5 rounded-lg bg-[#FAFAFA] border border-[#EDEDED] ${isCollapsed ? 'px-2 py-2 justify-center' : 'px-3 py-2.5'}`}>
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#C6F24E] text-[#0A0A0A] text-[12px] font-semibold"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {workspaceName.charAt(0).toUpperCase()}
          </div>
          {!isCollapsed && (
            <>
              <div className="min-w-0 flex-1 animate-in fade-in slide-in-from-left-2 duration-300">
                <p className="truncate text-[13px] font-semibold text-[#0A0A0A] leading-tight">{workspaceName}</p>
                <p className="pulse-eyebrow text-[#737373] mt-0.5">{workspaceMeta}</p>
              </div>
              <ChevronDown size={14} className="text-[#A3A3A3] shrink-0" strokeWidth={2} />
            </>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav
        ref={forwardedNavRef as React.RefObject<HTMLElement>}
        className="flex-1 space-y-0.5 overflow-y-auto px-3"
      >
        {menuItems
          .filter((i) => i.roles.includes(role))
          .map((item, idx) => {
            // Subtle separator before each top-level group (visual clarity
            // when categories sit next to flat items).
            const showDividerBefore =
              idx > 0 && item.type === 'group' && menuItems[idx - 1]?.type === 'item';

            if (item.type === 'item') {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-all ${isActive
                      ? 'bg-[#C6F24E] text-[#0A0A0A] font-semibold shadow-[0_2px_8px_-2px_rgba(198,242,78,0.4)]'
                      : 'text-[#525252] hover:bg-[#F2F2F2] hover:text-[#0A0A0A] font-medium'
                    }`}
                >
                  <Icon size={16} strokeWidth={2} className="shrink-0" />
                  {!isCollapsed && <span className="truncate animate-in fade-in slide-in-from-left-2 duration-300">{item.label}</span>}
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
                {showDividerBefore && (
                  <div aria-hidden className="my-2 mx-3 h-px bg-[#EDEDED]" />
                )}
                <button
                  type="button"
                  onClick={() => toggleGroup(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-all ${childActive
                      ? 'bg-[#F2F2F2] text-[#0A0A0A] font-semibold'
                      : 'text-[#525252] hover:bg-[#F2F2F2] hover:text-[#0A0A0A] font-medium'
                    }`}
                  aria-expanded={isExpanded}
                >
                  <Icon size={16} strokeWidth={2} className="shrink-0" />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 truncate text-left animate-in fade-in slide-in-from-left-2 duration-300">{item.label}</span>
                      <ChevronRight
                        size={14}
                        strokeWidth={2}
                        className={`text-[#A3A3A3] transition-transform duration-200 ${
                          isExpanded ? 'rotate-90' : ''
                        }`}
                      />
                    </>
                  )}
                </button>
                {!isCollapsed && isExpanded && (
                  <div className="mt-1 ml-5 space-y-0.5 border-l border-[#EDEDED] pl-3 pb-1">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const isActive = pathname === child.href || pathname?.startsWith(child.href + '/');
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={handleNavClick}
                          aria-current={isActive ? 'page' : undefined}
                          className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] transition-all ${isActive
                              ? 'bg-[#C6F24E] text-[#0A0A0A] font-semibold'
                              : 'text-[#737373] hover:bg-[#F2F2F2] hover:text-[#0A0A0A] font-medium'
                            }`}
                        >
                          <ChildIcon size={14} strokeWidth={2} className="shrink-0" />
                          <span className="truncate animate-in fade-in slide-in-from-left-2 duration-300">{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
      </nav>

      {/* User card + locale switcher + logout */}
      <div className="border-t border-[#EDEDED] bg-[#FAFAFA] p-3">
        <div className="mb-2 flex items-center gap-2.5 rounded-xl bg-white border border-[#EDEDED] px-2.5 py-2">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0A0A0A] text-[12px] font-semibold text-[#C6F24E]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {initial}
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1 animate-in fade-in slide-in-from-left-2 duration-300">
              <p className="truncate text-[12px] font-medium text-[#0A0A0A]">{displayName}</p>
              <p className="truncate pulse-eyebrow text-[#737373] mt-0.5">{roleLabel}</p>
            </div>
          )}
        </div>

        {!isCollapsed && (
          <div className="flex items-center justify-between px-1 py-2 border-t border-[#EDEDED] animate-in fade-in duration-300">
            <div className="flex items-center gap-1.5">
              <Globe size={12} strokeWidth={2} className="text-[#737373]" />
              <span className="pulse-eyebrow text-[#737373]">{t('system_language')}</span>
            </div>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as 'tr' | 'en')}
              className="bg-[#F2F2F2] text-[#0A0A0A] text-[11px] font-medium border-none rounded-md px-2 py-1 outline-none cursor-pointer"
            >
              <option value="tr">TR</option>
              <option value="en">EN</option>
            </select>
          </div>
        )}

        <div className="flex gap-1 mt-2">
          <button
            onClick={handleLogout}
            title={t('logout')}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-medium text-[#737373] transition-all hover:bg-[#FEF2F2] hover:text-[#991B1B] w-full`}
          >
            <LogOut size={13} strokeWidth={2} />
            {!isCollapsed && <span>{t('logout')}</span>}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={`relative hidden lg:flex bg-white border-r border-[#EDEDED] flex-col h-full z-30 text-[#0A0A0A] transition-all duration-300 ease-in-out ${isCollapsed ? 'w-[68px]' : 'w-[248px]'}`}>
        <SidebarContent navRef={navRef} />
        {/* Floating toggle button */}
        <button
          onClick={toggleSidebar}
          aria-label={isCollapsed ? (locale === 'tr' ? 'Menüyü genişlet' : 'Expand menu') : (locale === 'tr' ? 'Menüyü daralt' : 'Collapse menu')}
          className="absolute -right-3 top-7 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-[#EDEDED] bg-white text-[#525252] shadow-sm hover:text-[#0A0A0A] hover:bg-[#FAFAFA] transition-all"
        >
          {isCollapsed ? <ChevronRight size={13} strokeWidth={2.5} /> : <ChevronLeft size={13} strokeWidth={2.5} />}
        </button>
      </aside>

      {/* Mobile top bar */}
      <div
        className="lg:hidden sticky top-0 z-40 flex items-center justify-between bg-white border-b border-[#EDEDED] px-4 py-3 text-[#0A0A0A]"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <Link href="/admin/dashboard" className="flex items-center gap-2">
          <BuazeLogo size={26} variant="default" imageUrl={profile?.logoUrl} />
          <span
            className="text-[16px] font-medium tracking-[-0.03em] text-[#0A0A0A]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            buaze<span className="text-[#C6F24E]">.</span>
          </span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F2F2F2] text-[#0A0A0A] hover:bg-[#EDEDED] transition-colors"
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
            className="w-[280px] max-w-[85vw] h-full bg-white border-r border-[#EDEDED] shadow-2xl flex flex-col text-[#0A0A0A]"
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
