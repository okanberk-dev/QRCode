'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import nextDynamic from 'next/dynamic';
import { Search as SearchIcon } from 'lucide-react';
import { useAdminTranslation } from '@/components/admin/AdminTranslationProvider';
import ViewportMount from '@/components/ui/ViewportMount';
import type { DashboardAnnouncement } from '@/components/dashboard/AnnouncementBanner';

const NotificationBell = nextDynamic(() => import('@/components/notifications/NotificationBell'), {
  ssr: false,
  loading: () => <span aria-hidden className="inline-flex h-9 w-9 shrink-0" />,
});
// §38.219 Stage 139 — Cmd+K command palette. ssr:false because the
// palette uses window listeners + lazy fetches /api/admin/* on open.
// Modal is mounted at the topbar level so a single instance handles both
// desktop topbar trigger + mobile sidebar trigger (CustomEvent broadcast).
const AdminCommandPalette = nextDynamic(() => import('@/components/admin/AdminCommandPalette'), {
  ssr: false,
  loading: () => null,
});

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
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
  }, []);

  const openPalette = () => {
    window.dispatchEvent(new CustomEvent('buaze:admin-search-open'));
  };

  // CLAUDE.md §38.164 (Stage 84): z-40 → z-30 — owner UserDashboardShell ile parity (§38.158 hierarchy:
  // z-30 desktop sticky topbar < z-40 mobile sticky/bottom nav < z-[45] notification backdrop modal hint).
  return (
    <>
      {/* §38.219 Stage 139 — Palette mount OUTSIDE the hidden lg:flex div so
          it's available on mobile too (mobile sidebar drawer dispatches
          'buaze:admin-search-open' CustomEvent which the palette listens for). */}
      <AdminCommandPalette />
    <div className="hidden lg:flex sticky top-0 z-30 h-14 shrink-0 items-center gap-2 border-b border-[#EDEDED] bg-white/95 px-4 backdrop-blur sm:px-6">
      {/* §38.219 Stage 139 — Search trigger (Cmd+K). Visual cue + click also
          opens the palette for mouse users. AdminCommandPalette listens for
          both Cmd+K shortcut + 'buaze:admin-search-open' CustomEvent. */}
      <button
        type="button"
        onClick={openPalette}
        className="flex h-9 flex-1 max-w-[420px] items-center gap-2 rounded-lg border border-[#E5E5E5] bg-white px-3 text-left text-[13px] text-[#737373] shadow-[0_1px_2px_rgba(10,10,10,0.05)] transition-colors hover:bg-[#F5F5F5] hover:text-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]"
        aria-label="Admin arama (Cmd+K)"
      >
        <SearchIcon size={14} className="text-[#737373]" aria-hidden />
        <span className="flex-1">Sayfa, işletme veya müşteri ara…</span>
        <kbd className="hidden xl:inline-flex items-center gap-0.5 rounded border border-[#E5E5E5] bg-[#FAFAFA] px-1.5 py-0.5 bz-mono text-[10px] uppercase text-[#525252]">
          {isMac ? '⌘' : 'Ctrl'} K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
      <ViewportMount
        query="(min-width: 1024px)"
        fallback={<span aria-hidden className="inline-flex h-9 w-9 shrink-0" />}
      >
        <NotificationBell
          locale={locale === 'en' ? 'en' : 'tr'}
          announcements={announcements}
          panelBase="/admin"
          notificationsSettingsHref={null}
        />
      </ViewportMount>
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
    </div>
    </>
  );
}
