'use client';

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import nextDynamic from 'next/dynamic';
import {
  BarChart3,
  Bell,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  Crown,
  FileEdit,
  Globe,
  Inbox,
  LayoutDashboard,
  LogOut,
  Mail,
  Megaphone,
  MessageSquareText,
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
import ViewportMount from '@/components/ui/ViewportMount';
import type { DashboardAnnouncement } from '@/components/dashboard/AnnouncementBanner';
import type { AdminPanelProfile } from '@/lib/admin-profile';
import type { AdminAction, AdminResource } from '@/lib/rbac';

const NotificationBell = nextDynamic(() => import('@/components/notifications/NotificationBell'), {
  ssr: false,
  loading: () => <span aria-hidden className="inline-flex h-9 w-9 shrink-0" />,
});

interface AdminSidebarProps {
  announcements?: DashboardAnnouncement[];
  initialProfile?: AdminPanelProfile | null;
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

export default function AdminSidebar({ announcements = [], initialProfile = null }: AdminSidebarProps = {}) {
  const pathname = usePathname();
  // `setLocale` lives on /admin/profile (Dil tercihi card) — sidebar
  // only consumes `locale` + `t`. Switching it from the sidebar's
  // cramped bottom row was a UX papercut (chevron clipped, touch target
  // too small on mobile drawer).
  const { t, locale } = useAdminTranslation();
  const role = initialProfile?.role || 'manager';
  const profile = initialProfile;
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

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error', e);
    }
    window.location.href = '/admin';
  };

  // Prevent body scroll when mobile drawer is open + broadcast state
  // (CLAUDE.md §40.D Custom Event paterni). AdminMobileNav listener'a
  // drawer açıkken bottom nav'ı gizlemesi için sinyal verir; marketing
  // MarketingNavbarClient ve owner UserDashboardShell ile aynı event
  // ismi (`buaze:mobile-drawer`) — tek kanal.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('buaze:mobile-drawer', { detail: { open: mobileOpen } }),
      );
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  // ESC key closes the mobile drawer — a11y baseline (CLAUDE.md §23.7
  // Phase 11.1 focus trap + ESC handler paterni). Owner shell
  // (UserDashboardShell.tsx) ve Modal primitive aynı kuralı uygular;
  // admin'de eksikti.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  // Sidebar nav supports two entry kinds. Keep only the main landing page
  // flat; related admin surfaces live under compact collapsible groups.
  //
  // `permission` (optional): granular RBAC gate for the `staff` role only.
  // Superadmin always bypasses; manager + restaurant_owner go through the
  // role array. Staff role is "blank canvas" — `roles` array does NOT
  // include 'staff' for sensitive items; instead the link/group becomes
  // visible only if the staff admin holds the matching `AdminPermission`
  // grant ({resource}:{action}, see src/lib/rbac.ts).  Empty groups are
  // hidden after child filtering so the sidebar stays tight.
  type Permission = { resource: AdminResource; action?: AdminAction };
  type NavItem = {
    type: 'item';
    href: string;
    icon: typeof LayoutDashboard;
    label: string;
    roles: string[];
    permission?: Permission;
  };
  type NavChild = {
    href: string;
    icon: typeof LayoutDashboard;
    label: string;
    permission?: Permission;
    roles?: string[];
  };
  type NavGroup = {
    type: 'group';
    id: string;
    icon: typeof LayoutDashboard;
    label: string;
    roles: string[];
    children: NavChild[];
  };
  type Nav = NavItem | NavGroup;

  // Build a O(1) lookup set from the admin's effective grants. Superadmin
  // bypasses, so this stays empty + irrelevant in their session.
  const permSet = new Set(initialProfile?.permissions ?? []);
  const permKey = (p: Permission) => `${p.resource}:${p.action ?? 'read'}`;
  const staffSees = (perm?: Permission) => !!perm && permSet.has(permKey(perm));

  const menuItems: Nav[] = [
    { type: 'item', href: '/admin/dashboard', icon: LayoutDashboard, label: t('dashboard'), roles: ['superadmin', 'manager', 'restaurant_owner', 'staff'] },
    {
      type: 'group',
      id: 'operations',
      icon: Inbox,
      label: locale === 'en' ? 'Operations' : 'Operasyon',
      roles: ['superadmin', 'manager', 'restaurant_owner', 'staff'],
      children: [
        { href: '/admin/reviews', icon: Inbox, label: locale === 'en' ? 'Reviews' : 'Yorumlar', permission: { resource: 'reviews', action: 'read' } },
        { href: '/admin/analytics', icon: BarChart3, label: locale === 'en' ? 'Analytics' : 'Analitik', permission: { resource: 'analytics', action: 'read' } },
        { href: '/admin/qr', icon: QrCode, label: t('qr_codes') },
        ...(role === 'manager' ? [] : [{ href: '/admin/restaurants', icon: Store, label: t('restaurants'), roles: ['superadmin'] }]),
        // Stage 29 §38.105 — Campaign moderation queue. Backend RBAC
        // `campaigns:read` zorunlu; superadmin bypass + grant'lı staff/manager
        // ise erişim. Sidebar `permission` annotation'ı staff için aktif;
        // superadmin direkt görür, manager için RBAC permission grant
        // durumunda admin tarafından ayrıca açılır (mevcut /admin/users/[id]/permissions paterni).
        {
          href: '/admin/campaign-approvals',
          icon: Sparkles,
          label: locale === 'en' ? 'Campaign approvals' : 'Kampanya Onayları',
          roles: ['superadmin'],
          permission: { resource: 'campaigns', action: 'read' },
        },
        // Stage 119 §38.199 — Sektör bazlı kampanya şablon kataloğu. Owner
        // panel /dashboard/campaigns'in "Şablon seç" picker'ı bu kataloğu
        // tüketir. Buaze global rows (restaurantId=null); owner-saved rows
        // (restaurantId set) admin tarafından düzenlenmez.
        {
          href: '/admin/customer-campaign-templates',
          icon: MessageSquareText,
          label: locale === 'en' ? 'Campaign templates' : 'Kampanya Şablonları',
          roles: ['superadmin'],
        },
        { href: '/admin/embed-usage', icon: Globe, label: locale === 'en' ? 'Embed usage' : 'Embed kullanımı', roles: ['superadmin'] },
        // CLAUDE.md §42 — Denetim Merkezi (superadmin). 3 alt-yüzey:
        //   1. Şablonlar (catalog + edit + question builder)
        //   2. Kategoriler (sektör taksonomisi)
        //   3. İstatistikler (sistem KPI + sektör breakdown + top templates +
        //      per-restoran kullanım)
        // Owner panel girişi `/dashboard/audits` ayrı route'tan açılır.
        { href: '/admin/audits/templates', icon: ClipboardCheck, label: locale === 'en' ? 'Audit Templates' : 'Denetim Şablonları', roles: ['superadmin'] },
        { href: '/admin/audits/categories', icon: ClipboardCheck, label: locale === 'en' ? 'Audit Categories' : 'Denetim Kategorileri', roles: ['superadmin'] },
        { href: '/admin/audits/stats', icon: ClipboardCheck, label: locale === 'en' ? 'Audit Stats' : 'Denetim İstatistikleri', roles: ['superadmin'] },
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
        { href: '/admin/settings', icon: Settings, label: locale === 'en' ? 'Settings' : 'Ayarlar' },
      ],
    },
    {
      type: 'group',
      id: 'manager-settings',
      icon: Bell,
      label: locale === 'en' ? 'Settings' : 'Ayarlar',
      roles: ['superadmin', 'manager'],
      children: [
        { href: '/admin/notifications', icon: Bell, label: locale === 'en' ? 'Notifications' : 'Bildirimler' },
      ],
    },
    {
      type: 'group',
      id: 'accounts',
      icon: Crown,
      label: locale === 'en' ? 'Accounts' : 'Hesaplar',
      roles: ['superadmin', 'staff'],
      children: [
        { href: '/admin/members', icon: Crown, label: locale === 'en' ? 'Business Owners' : 'İşletme Sahipleri', permission: { resource: 'members', action: 'read' } },
        { href: '/admin/users', icon: Users, label: locale === 'en' ? 'Admins' : 'Yöneticiler', permission: { resource: 'users', action: 'read' } },
        { href: '/admin/customers', icon: UsersRound, label: locale === 'en' ? 'Customers' : 'Müşteriler', permission: { resource: 'customers', action: 'read' } },
        { href: '/admin/plans', icon: CreditCard, label: locale === 'en' ? 'Subscriptions' : 'Abonelikler', permission: { resource: 'plans', action: 'read' } },
      ],
    },
    {
      type: 'group',
      id: 'content',
      icon: BookOpen,
      label: locale === 'en' ? 'Content' : 'İçerik',
      roles: ['superadmin', 'staff'],
      children: [
        { href: '/admin/blog', icon: BookOpen, label: locale === 'en' ? 'Blog' : 'Blog', permission: { resource: 'blog', action: 'read' } },
        { href: '/admin/announcements', icon: Megaphone, label: locale === 'en' ? 'Announcements' : 'Duyurular', permission: { resource: 'announcements', action: 'read' } },
        // Legal documents + site-settings have no `staff` granting path —
        // hardcoded superadmin-only (no AdminResource mapping defined for legal-documents).
        { href: '/admin/legal-documents', icon: ScrollText, label: locale === 'en' ? 'Legal Documents' : 'Hukuki Metinler', roles: ['superadmin'] },
        { href: '/admin/site-settings', icon: Settings, label: locale === 'en' ? 'Site Settings' : 'Site Ayarları', permission: { resource: 'site_settings', action: 'read' } },
      ],
    },
    {
      type: 'group',
      id: 'mail',
      icon: Mail,
      label: locale === 'en' ? 'Mail' : 'Mail',
      roles: ['superadmin', 'staff'],
      children: [
        { href: '/admin/newsletters', icon: Mail, label: locale === 'en' ? 'Newsletter' : 'Bülten Aboneleri', permission: { resource: 'mail_templates', action: 'read' } },
        { href: '/admin/newsletters/campaigns', icon: Megaphone, label: locale === 'en' ? 'Campaigns' : 'Bülten Kampanyaları', permission: { resource: 'mail_templates', action: 'read' } },
        { href: '/admin/mail-templates', icon: FileEdit, label: locale === 'en' ? 'Mail Templates' : 'Mail İçerikleri', permission: { resource: 'mail_templates', action: 'read' } },
        { href: '/admin/dev/lifecycle-emails', icon: Mail, label: locale === 'en' ? 'Lifecycle' : 'Yaşam Döngüsü', roles: ['superadmin'] },
      ],
    },
  ];

  if (role === 'superadmin' && process.env.NODE_ENV !== 'production') {
    const mailGroup = menuItems.find((item): item is NavGroup => item.type === 'group' && item.id === 'mail');
    mailGroup?.children.push({
      href: '/admin/dev/mail-preview',
      icon: Mail,
      label: locale === 'en' ? 'Mail Preview (dev)' : 'Mail Önizleme (dev)',
      roles: ['superadmin'],
    });
  }

  menuItems.push({
    type: 'item',
    href: '/admin/profile',
    icon: User,
    label: locale === 'en' ? 'Profile' : 'Profilim',
    roles: ['superadmin', 'manager', 'restaurant_owner', 'staff'],
  });

  // Per-child visibility: staff role hides any child without an explicit
  // permission grant OR whose `roles` array excludes them. Other roles
  // see all children of the groups they can access (legacy behaviour).
  function isChildAllowed(child: NavChild): boolean {
    if (child.roles && !child.roles.includes(role)) return false;
    if (role !== 'staff') return true;
    return staffSees(child.permission);
  }
  // After filtering children, a group with zero allowed children should
  // disappear from the sidebar entirely — empty accordions are noise.
  function isGroupVisible(group: NavGroup): boolean {
    if (!group.roles.includes(role)) return false;
    return group.children.some(isChildAllowed);
  }

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
              className="bz-h-tight text-[18px] font-medium tracking-[-0.03em] text-[#0A0A0A] leading-none animate-in fade-in slide-in-from-left-2 duration-300"
            >
              buaze<span className="text-[#C6F24E]">.</span>
            </span>
          )}
        </Link>
      </div>

      {/* Workspace switcher */}
      <div className="px-3 pb-3">
        <div className={`flex items-center gap-2.5 rounded-lg bg-[#FAFAFA] border border-[#EDEDED] ${isCollapsed ? 'px-2 py-2 justify-center' : 'px-3 py-2.5'}`}>
          {/* CLAUDE.md §38.164 (Stage 84): inline fontFamily → bz-h-tight utility (Pulse §11 disipline) */}
          <div
            className="bz-h-tight flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#C6F24E] text-[#0A0A0A] text-[12px] font-semibold"
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
          .filter((i) => {
            if (i.type === 'group') return isGroupVisible(i);
            // Flat items: role check + permission gate for staff
            if (!i.roles.includes(role)) return false;
            if (role !== 'staff' || !i.permission) return true;
            return staffSees(i.permission);
          })
          .map((item, idx, visibleItems) => {
            // Subtle separator before each top-level group (visual clarity
            // when categories sit next to flat items).
            const showDividerBefore =
              idx > 0 && item.type === 'group' && visibleItems[idx - 1]?.type === 'item';

            if (item.type === 'item') {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-all ${isActive
                      ? 'bg-[#0A0A0A] text-white font-semibold before:absolute before:left-[-12px] before:top-1.5 before:bottom-1.5 before:w-[3px] before:bg-[#C6F24E] before:rounded-r-sm'
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
            const allowedChildren = item.children.filter(isChildAllowed);
            const childActive = allowedChildren.some(
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
                    {allowedChildren.map((child) => {
                      const ChildIcon = child.icon;
                      const isActive = pathname === child.href || pathname?.startsWith(child.href + '/');
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={handleNavClick}
                          aria-current={isActive ? 'page' : undefined}
                          className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] transition-all ${isActive
                              ? 'bg-[#0A0A0A] text-white font-semibold'
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
          {/* CLAUDE.md §38.164 (Stage 84): inline fontFamily → bz-h-tight (Pulse §11 disipline). */}
          <div
            className="bz-h-tight flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0A0A0A] text-[12px] font-semibold text-[#C6F24E]"
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

        {/* Locale switcher (TR/EN) moved to /admin/profile "Dil tercihi"
            card. Sidebar bottom kept only avatar + logout — tight chrome
            for mobile drawer + collapsed-sidebar parity (CLAUDE.md §40.3:
            workspace + actions ayrımı). */}

        <div className="flex gap-1 mt-2">
          <button
            onClick={handleLogout}
            title={t('logout')}
            className="bz-btn-danger w-full"
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
          className="bz-btn-icon absolute -right-3 top-7 z-50 h-6 w-6 rounded-full bg-white shadow-sm"
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
          {/* CLAUDE.md §38.164 (Stage 84): inline fontFamily → bz-h-tight (Pulse §11 disipline). */}
          <span
            className="bz-h-tight text-[16px] font-medium tracking-[-0.03em] text-[#0A0A0A]"
          >
            buaze<span className="text-[#C6F24E]">.</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <ViewportMount
            query="(max-width: 1023.98px)"
            fallback={<span aria-hidden className="inline-flex h-9 w-9 shrink-0" />}
          >
            <NotificationBell
              locale={locale === 'en' ? 'en' : 'tr'}
              announcements={announcements}
              panelBase="/admin"
            />
          </ViewportMount>
          {/* Mobile-only logout icon. Desktop keeps the labelled `bz-btn-danger`
              button at the sidebar bottom; mobile users couldn't reach that
              without opening the hamburger drawer + scrolling, so we surface
              a direct icon here. Re-uses the same `handleLogout` POST. */}
          <button
            onClick={handleLogout}
            className="bz-btn-icon bg-[#F2F2F2] text-[#0A0A0A]"
            aria-label={locale === 'en' ? 'Sign out' : 'Çıkış yap'}
            title={locale === 'en' ? 'Sign out' : 'Çıkış yap'}
          >
            <LogOut size={16} strokeWidth={2} />
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="bz-btn-icon bg-[#F2F2F2] text-[#0A0A0A]"
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
