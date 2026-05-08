'use client';

import Link from 'next/link';
import { useAdminTranslation } from '@/components/admin/AdminTranslationProvider';
import NotificationBell from '@/components/notifications/NotificationBell';
import AdminCampaignBell from '@/components/admin/AdminCampaignBell';
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

  // CLAUDE.md §38.164 (Stage 84): z-40 → z-30 — owner UserDashboardShell ile parity (§38.158 hierarchy:
  // z-30 desktop sticky topbar < z-40 mobile sticky/bottom nav < z-[45] notification backdrop modal hint).
  return (
    <div className="hidden lg:flex sticky top-0 z-30 items-center justify-end gap-2 border-b border-[#EDEDED] bg-white/95 px-4 py-2.5 backdrop-blur sm:px-6">
      <NotificationBell
        locale={locale === 'en' ? 'en' : 'tr'}
        announcements={announcements}
        panelBase="/admin"
      />
      {/* Stage 29 §38.105 — Campaign moderation in-app bell. AdminNotification
          feed (broadcast + per-admin). RBAC `campaigns:read` permission ile
          gate'li (backend), UI'da sadece görünüyor — manager için 401/403
          fallback'inde silent kalır. */}
      <AdminCampaignBell locale={locale === 'en' ? 'en' : 'tr'} />
      {/* CLAUDE.md §38.164 (Stage 84): inline `style={{ fontFamily: 'var(--font-heading)' }}` redundancy
          kaldırıldı. Avatar `<Link>` (heading değil) — `bz-h-tight` utility ile heading semantic.
          Pulse §11 paterni: avatar initial Space Grotesk + tight tracking + weight 500. */}
      <Link
        href="/admin/profile"
        className="bz-h-tight flex h-9 w-9 items-center justify-center rounded-full bg-[#0A0A0A] text-[12px] font-semibold text-[#C6F24E] transition-colors hover:bg-[#1A1A1A]"
        aria-label={displayName || 'Profile'}
        title={displayName || 'Profile'}
      >
        {initial}
      </Link>
    </div>
  );
}
