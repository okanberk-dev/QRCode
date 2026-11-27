'use client';

import { usePathname } from 'next/navigation';
import nextDynamic from 'next/dynamic';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { LogOut, User } from 'lucide-react';
import Link from '@/components/navigation/IntentLink';
import BuazeLogo from '@/components/marketing/BuazeLogo';
import ViewportMount from '@/components/ui/ViewportMount';
import { SearchTrigger } from '@/components/panel/search/SearchTrigger';
import { PanelTopNav, type PanoNavEntry } from '@/components/panel/pano/PanelTopNav';
import { PanelMobileNav } from '@/components/panel/pano/PanelMobileNav';
import { PanelRail, RailLink } from '@/components/panel/pano/PanelRail';
import type { ReactNode } from 'react';
import type { DashboardAnnouncement } from '@/components/dashboard/AnnouncementBanner';
import type { AdminPanelProfile } from '@/lib/admin-profile';
import { useAdminTranslation } from './AdminTranslationProvider';
import { adminRoleLabel, getActiveAdminHref, getAdminNav, toAdminNavRole } from './admin-nav';

const NotificationBell = nextDynamic(() => import('@/components/notifications/NotificationBell'), {
  ssr: false,
  loading: () => <span aria-hidden className="inline-flex h-[46px] w-[46px] shrink-0" />,
});
const AdminCommandPalette = nextDynamic(() => import('@/components/admin/AdminCommandPalette'), {
  ssr: false,
  loading: () => null,
});

/** Top-level tabs promoted out of the "Operasyon" group (daily pages). */
const PROMOTED = new Set(['/admin/reviews', '/admin/restaurants']);
const PROFILE_HREF = '/admin/profile';

interface AdminPanoChromeProps {
  announcements?: DashboardAnnouncement[];
  profile: AdminPanelProfile | null;
  role: string;
  permissions: string[];
  /** The page column (scroll container + main) that sits right of the rail. */
  children: ReactNode;
}

/**
 * Admin panel chrome in the Pano design (docs/design/DASHBOARD_DESIGN.md §5.1,
 * §7): single pages as pill tabs on top, page groups as round buttons in the
 * left rail (each opens its menu), the white bar + full-screen drawer below
 * 1024px. Navigation comes from `admin-nav.ts` (role + staff grants already
 * applied); the profile page lives in the avatar menu and the rail footer.
 */
export default function AdminPanoChrome({ announcements = [], profile, role, permissions, children }: AdminPanoChromeProps) {
  const pathname = usePathname();
  const { t, locale } = useAdminTranslation();
  const navLocale = locale === 'en' ? 'en' : 'tr';
  const isEn = navLocale === 'en';
  const navRole = toAdminNavRole(role);
  const tree = getAdminNav(navRole, new Set(permissions));
  const activeHref = getActiveAdminHref(
    pathname,
    tree.flatMap((entry) => (entry.type === 'item' ? [entry.href] : entry.children.map((child) => child.href))),
  );

  const entries: PanoNavEntry[] = [];
  for (const entry of tree) {
    if (entry.type === 'item') {
      if (entry.href === PROFILE_HREF) continue;
      entries.push({
        type: 'link',
        href: entry.href,
        label: entry.label[navLocale],
        icon: entry.icon,
        active: entry.href === activeHref,
      });
      continue;
    }
    const promoted = entry.children.filter((child) => PROMOTED.has(child.href));
    for (const child of promoted) {
      entries.push({
        type: 'link',
        href: child.href,
        label: child.label[navLocale],
        icon: child.icon,
        active: child.href === activeHref,
        secondary: true,
      });
    }
    const rest = entry.children.filter((child) => !PROMOTED.has(child.href));
    if (rest.length === 0) continue;
    entries.push({
      type: 'group',
      id: entry.id,
      label: entry.label[navLocale],
      icon: entry.icon,
      children: rest.map((child) => ({
        href: child.href,
        label: child.label[navLocale],
        icon: child.icon,
        active: child.href === activeHref,
      })),
    });
  }

  const displayName =
    profile?.name || profile?.username || profile?.email?.split('@')[0] || (isEn ? 'User' : 'Kullanıcı');
  const initial = displayName.trim().charAt(0).toUpperCase() || '·';
  const roleLabel = adminRoleLabel(navRole, navLocale);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error', error);
    }
    window.location.href = '/admin';
  };
  const openSearch = () => window.dispatchEvent(new CustomEvent('buaze:admin-search-open'));

  const topEntries = entries.filter((entry) => entry.type === 'link');
  const railEntries = entries.filter((entry) => entry.type === 'group');
  const profileLabel = isEn ? 'Profile' : 'Profilim';
  const railBrand = (
    <Link href="/admin/dashboard" className="pn-brand" aria-label="Buaze" title="Buaze">
      <BuazeLogo size={42} variant="default" imageUrl={profile?.logoUrl} className="shrink-0" />
    </Link>
  );
  const brand = (
    <Link href="/admin/dashboard" className="pn-brand" aria-label="Buaze">
      <BuazeLogo size={34} variant="default" imageUrl={profile?.logoUrl} className="shrink-0" />
      <span className="pn-brand-word">buaze</span>
    </Link>
  );


  return (
    <>
      <AdminCommandPalette role={role} permissions={permissions} />
      <div className="flex min-h-0 flex-1">
      <PanelRail
        brand={railBrand}
        entries={railEntries}
        ariaLabel={isEn ? 'Admin sections' : 'Yönetim bölümleri'}
        footer={<RailLink entry={{ href: PROFILE_HREF, label: profileLabel, icon: User, active: pathname === PROFILE_HREF }} />}
      />
      <div className="flex min-w-0 flex-1 flex-col lg:min-h-0">
      <PanelTopNav
        entries={topEntries}
        ariaLabel={isEn ? 'Admin menu' : 'Yönetim menüsü'}
        moreLabel={isEn ? 'More' : 'Diğer'}
        actions={
          <>
            <SearchTrigger locale={navLocale} variant="pill" onOpen={openSearch} />
            <ViewportMount query="(min-width: 1024px)" fallback={<span aria-hidden className="inline-flex h-[46px] w-[46px] shrink-0" />}>
              <NotificationBell locale={navLocale} announcements={announcements} panelBase="/admin" notificationsSettingsHref={null} />
            </ViewportMount>
            <DropdownMenu.Root modal={false}>
              <DropdownMenu.Trigger asChild>
                <button type="button" className="pn-avatar-btn" aria-label={`${displayName} — ${isEn ? 'account menu' : 'hesap menüsü'}`}>
                  {initial}
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content align="end" sideOffset={14} collisionPadding={12} className="bz-menu z-[70] min-w-[240px] focus:outline-none">
                  <div className="px-3.5 pb-2 pt-2.5">
                    <p className="truncate text-[15px] font-medium text-pn-ink">{displayName}</p>
                    <p className="truncate text-[13px] text-[#9A9A9A]">{roleLabel}</p>
                  </div>
                  <DropdownMenu.Separator className="bz-menu-divider" />
                  <DropdownMenu.Item asChild>
                    <Link href={PROFILE_HREF} className="bz-menu-item">
                      <User size={17} aria-hidden="true" />
                      <span className="flex-1">{isEn ? 'Profile' : 'Profilim'}</span>
                    </Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="bz-menu-divider" />
                  <DropdownMenu.Item className="bz-menu-item danger" onSelect={() => void handleLogout()}>
                    <LogOut size={17} aria-hidden="true" />
                    <span className="flex-1">{t('logout')}</span>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </>
        }
      />
      <PanelMobileNav
        brand={brand}
        entries={entries}
        labels={{
          open: isEn ? 'Open menu' : 'Menüyü aç',
          close: isEn ? 'Close menu' : 'Menüyü kapat',
          dialog: isEn ? 'Admin menu' : 'Yönetim menüsü',
        }}
        actions={
          <>
            <SearchTrigger locale={navLocale} variant="icon" onOpen={openSearch} />
            <ViewportMount query="(max-width: 1023.98px)" fallback={<span aria-hidden className="inline-flex h-11 w-11 shrink-0" />}>
              <NotificationBell locale={navLocale} announcements={announcements} panelBase="/admin" notificationsSettingsHref={null} />
            </ViewportMount>
          </>
        }
        drawerFooter={
          <div className="flex flex-col gap-1 border-t border-pn-line pt-4">
            <div className="flex items-center gap-3 px-4 pb-3">
              <span className="pn-avatar-btn !h-11 !w-11" aria-hidden="true">{initial}</span>
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-medium text-pn-ink">{displayName}</span>
                <span className="block truncate text-[13px] text-[#9A9A9A]">{roleLabel}</span>
              </span>
            </div>
            <Link href={PROFILE_HREF} aria-current={pathname === PROFILE_HREF ? 'page' : undefined} className="pn-drawer-link">
              <User size={20} aria-hidden="true" />
              {isEn ? 'Profile' : 'Profilim'}
            </Link>
            <button type="button" onClick={() => void handleLogout()} className="pn-drawer-link text-[#D92D20]">
              <LogOut size={20} aria-hidden="true" />
              {t('logout')}
            </button>
          </div>
        }
      />
      {children}
      </div>
      </div>
    </>
  );
}
