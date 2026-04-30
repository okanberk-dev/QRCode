'use client';

import Link from 'next/link';
import { useAdminTranslation } from '@/components/admin/AdminTranslationProvider';
import NotificationBell from '@/components/notifications/NotificationBell';
import type { DashboardAnnouncement } from '@/components/dashboard/AnnouncementBanner';

interface AdminTopbarProps {
  announcements?: DashboardAnnouncement[];
  /** Optional admin display name / username for the avatar tooltip. */
  displayName?: string | null;
}

/**
 * Slim sticky top-right bar for the admin shell. The admin layout
 * historically had no topbar (sidebar carried the profile link), so
 * the notification bell had nowhere to live. This component only
 * renders the right-side action group; everything else (sidebar,
 * page content, mobile nav) is unchanged.
 *
 * Lives inside the content column so it scrolls with the page on
 * mobile but stays sticky-top on desktop.
 */
export default function AdminTopbar({ announcements = [], displayName }: AdminTopbarProps) {
  const { locale } = useAdminTranslation();
  const initial = (displayName?.trim()?.charAt(0) || 'A').toUpperCase();

  return (
    <div className="sticky top-0 z-40 flex items-center justify-end gap-2 border-b border-[#EDEDED] bg-white/95 px-4 py-2.5 backdrop-blur sm:px-6">
      <NotificationBell
        locale={locale === 'en' ? 'en' : 'tr'}
        announcements={announcements}
        panelBase="/admin"
      />
      <Link
        href="/admin/profile"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A0A0A] text-[12px] font-semibold text-[#C6F24E] transition-colors hover:bg-[#1A1A1A]"
        style={{ fontFamily: 'var(--font-heading)' }}
        aria-label={displayName || 'Profile'}
        title={displayName || 'Profile'}
      >
        {initial}
      </Link>
    </div>
  );
}
