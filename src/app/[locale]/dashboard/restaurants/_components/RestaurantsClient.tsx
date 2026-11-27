'use client';

// Owner "İşletmelerim" — franchise management table (§49).
//
// One row per business with the numbers an owner of several branches checks
// every day: reviews and average rating over 30 days, low ratings still
// waiting, review-platform link health and the newest review. "Panele geç"
// makes the business the active one and opens its dashboard; the row menu
// reaches settings, platforms, menu, QR and the public page. A "Dikkat"
// tab lists only the active businesses that need a look.
//
// The page is scope-blind (§22): every business the user owns or manages is
// listed; the shell's active business does not filter this list.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ExternalLink,
  MessageSquareText,
  MoreHorizontal,
  Pause,
  Play,
  Plug,
  Plus,
  QrCode,
  Search,
  Settings,
  Star,
  Store,
  UtensilsCrossed,
} from 'lucide-react';
import CopyUrlButton from '@/components/dashboard/CopyUrlButton';
import {
  AlertBanner,
  Badge,
  EmptyState,
  PageHeader,
  PulseMenu,
  PulseMenuDivider,
  PulseMenuItem,
  StatCard,
  Tabs,
  type TabItem,
} from '@/components/ui';
import {
  isSuspendedByAdminError,
  restaurantSaveErrorMessage,
  suspendedByAdminMessage,
} from '@/components/dashboard/settings/restaurant-status';
import { PlatformStateIcon } from '@/components/dashboard/platforms/PlatformStatusPill';
import { ACTIVE_BUSINESS_STORAGE_KEY } from '@/lib/active-business';
import {
  attentionReasons,
  portfolioTotals,
  sortPortfolioRows,
  type AttentionReason,
  type PortfolioRow,
  type PortfolioSortKey,
} from '@/lib/business-overview';
import {
  parseRecentBusinesses,
  pushRecentBusiness,
  RECENT_BUSINESS_STORAGE_KEY,
} from '@/lib/business-switcher';
import { formatRelativeTime, type PlatformLinkSummary } from '@/lib/platform-link-status';
import { getSectorByLabel } from '@/lib/sectors';
import type { Locale } from '@/lib/translations';

interface Restaurant {
  id: string;
  slug: string;
  name: string;
  category: string;
  notificationEmail: string | null;
  primaryColor: string;
  isActive: boolean;
  /** Superadmin pause (`Restaurant.suspendedByAdmin`) — owner cannot re-activate. */
  suspendedByAdmin?: boolean;
  createdAt: string;
  _count: { feedbacks: number };
  reviews30d: number;
  avgRating30d: number | null;
  /** Low ratings (≤3) nobody has opened yet — notification bell definition. */
  lowUnread: number;
  lastFeedbackAt: string | null;
  platforms: PlatformLinkSummary;
}

interface RestaurantsClientProps {
  locale: Locale;
  initialRestaurants: Restaurant[];
  initialNotificationEmail: string;
  /** Server render time — relative "2 sa önce" text hydrates identically. */
  serverNow: number;
  /**
   * §22 franchise — `team_member` (area manager) sees the locations assigned
   * to them; "Yeni İşletme" is hidden (backend `canWriteRestaurant` rejects).
   */
  role?: string;
  /** §22 viewer-mode — pause / reactivate actions are hidden. */
  viewerMode?: boolean;
}

type StatusFilter = 'active' | 'attention' | 'all' | 'passive';

const REASON_COPY: Record<AttentionReason, { tr: string; en: string; kind: 'danger' | 'warn' | 'off' | 'info' }> = {
  paused: { tr: 'Devre dışı', en: 'Disabled', kind: 'off' },
  platform_issue: { tr: 'Platform linki sorunlu', en: 'Platform link issue', kind: 'danger' },
  no_platform: { tr: 'Yorum platformu yok', en: 'No review platform', kind: 'warn' },
  unread: { tr: 'Bekleyen düşük puan', en: 'Low ratings waiting', kind: 'warn' },
  quiet: { tr: '30 gündür yorum yok', en: 'No reviews in 30 days', kind: 'info' },
};

function toPortfolioRow(restaurant: Restaurant): PortfolioRow {
  return {
    id: restaurant.id,
    name: restaurant.name,
    category: restaurant.category,
    isActive: restaurant.isActive,
    suspendedByAdmin: restaurant.suspendedByAdmin,
    reviewsTotal: restaurant._count.feedbacks,
    reviews30d: restaurant.reviews30d,
    avgRating30d: restaurant.avgRating30d,
    unread: restaurant.lowUnread,
    lastFeedbackAt: restaurant.lastFeedbackAt,
    platforms: restaurant.platforms,
  };
}

export default function RestaurantsClient({
  locale,
  initialRestaurants,
  serverNow,
  role = 'restaurant_owner',
  viewerMode = false,
}: RestaurantsClientProps) {
  const isTr = locale === 'tr';
  const isTeamMember = role === 'team_member';
  const canMutate = !viewerMode;
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>(initialRestaurants);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [sortKey, setSortKey] = useState<PortfolioSortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'success' | 'danger'; text: string } | null>(null);
  const [nowMs, setNowMs] = useState(serverNow);

  useEffect(() => setRestaurants(initialRestaurants), [initialRestaurants]);
  useEffect(() => setNowMs(Date.now()), []);

  const copy = isTr
    ? {
        eyebrow: isTeamMember ? 'YÖNETTİĞİN LOKASYONLAR' : 'İŞLETMELER',
        title: isTeamMember ? 'Yönettiğin lokasyonlar' : 'İşletmelerim',
        subtitle: isTeamMember
          ? 'Sahibin sana atadığı lokasyonlar. Erişimin bu listeyle sınırlıdır.'
          : 'Tüm şubelerini tek tabloda izle; bir işletmeye geçmek için "Panele geç"e bas.',
        add: 'Yeni İşletme',
        emptyTitle: isTeamMember ? 'Henüz lokasyon atanmamış' : 'Henüz işletme yok',
        emptyText: isTeamMember
          ? 'İşletme sahibinden bir lokasyon yetkisi bekliyorsun. Atama yapıldığında burada görünür.'
          : 'İlk işletmenizi ekleyerek QR ve yorum toplamaya başlayın.',
        search: isTeamMember ? 'Lokasyon ara' : 'İşletme ara',
        active: 'Aktif',
        attention: 'Dikkat',
        all: 'Tümü',
        inactive: 'Devre dışı',
        inactiveEmptyTitle: 'Devre dışı işletme yok',
        inactiveEmptyText: 'Pasife alınan işletmeler burada görünür. Aktifleştirme işlemini bu listeden yapabilirsin.',
        attentionEmptyTitle: 'Her şey yolunda',
        attentionEmptyText: 'Aktif işletmelerinde sorunlu link, bekleyen düşük puan ya da sessiz kalan şube yok.',
        activate: 'Aktifleştir',
        deactivate: 'Devre dışı bırak',
        activeStatus: 'Aktif',
        inactiveStatus: 'Devre dışı',
        pausedByAdmin: 'Buaze tarafından duraklatıldı',
        open: 'Panele geç',
      }
    : {
        eyebrow: isTeamMember ? 'LOCATIONS YOU MANAGE' : 'BUSINESSES',
        title: isTeamMember ? 'Locations you manage' : 'My businesses',
        subtitle: isTeamMember
          ? 'Locations assigned to you by the owner. Your access is scoped to this list.'
          : 'Watch every branch in one table; press "Open dashboard" to switch to a business.',
        add: 'New Business',
        emptyTitle: isTeamMember ? 'No locations assigned yet' : 'No business yet',
        emptyText: isTeamMember
          ? 'Waiting for the owner to grant access to a location. Assignments appear here.'
          : 'Create your first business to start collecting feedback.',
        search: isTeamMember ? 'Search locations' : 'Search businesses',
        active: 'Active',
        attention: 'Needs a look',
        all: 'All',
        inactive: 'Disabled',
        inactiveEmptyTitle: 'No disabled business',
        inactiveEmptyText: 'Disabled businesses appear here. You can reactivate them from this list.',
        attentionEmptyTitle: 'All good',
        attentionEmptyText: 'No broken links, waiting low ratings or quiet branches among your active businesses.',
        activate: 'Reactivate',
        deactivate: 'Disable',
        activeStatus: 'Active',
        inactiveStatus: 'Disabled',
        pausedByAdmin: 'Paused by Buaze',
        open: 'Open dashboard',
      };

  const rows = useMemo(() => restaurants.map(toPortfolioRow), [restaurants]);
  const totals = useMemo(() => portfolioTotals(rows), [rows]);
  const byId = useMemo(() => new Map(restaurants.map((r) => [r.id, r])), [restaurants]);

  const statusFiltered = rows.filter((row) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'passive') return !row.isActive;
    if (statusFilter === 'attention') return row.isActive && attentionReasons(row).length > 0;
    return row.isActive;
  });
  const collatorLocale = isTr ? 'tr-TR' : 'en-US';
  const query = searchTerm.trim().toLocaleLowerCase(collatorLocale);
  const filtered = statusFiltered.filter(
    (row) =>
      !query ||
      row.name.toLocaleLowerCase(collatorLocale).includes(query) ||
      row.category.toLocaleLowerCase(collatorLocale).includes(query) ||
      (byId.get(row.id)?.slug ?? '').includes(query),
  );
  const visible = sortKey ? sortPortfolioRows(filtered, sortKey, sortDir, locale) : filtered;

  const toggleSort = (key: PortfolioSortKey) => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  };

  const categoryLabel = (category: string) =>
    isTr ? category : getSectorByLabel(category)?.display.en ?? category;

  const toggleActive = async (id: string, currentStatus: boolean) => {
    setActionLoadingId(id);
    setNotice(null);
    try {
      const response = await fetch(`/api/restaurants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (isSuspendedByAdminError(data)) {
          setRestaurants((prev) => prev.map((r) => (r.id === id ? { ...r, suspendedByAdmin: true } : r)));
        }
        setNotice({
          kind: 'danger',
          text: restaurantSaveErrorMessage(data, locale, isTr ? 'Durum güncellenemedi.' : 'Status could not be updated.'),
        });
        return;
      }
      setNotice({
        kind: 'success',
        text: !currentStatus
          ? isTr ? 'İşletme tekrar aktifleştirildi.' : 'Location reactivated.'
          : isTr ? 'İşletme devre dışı bırakıldı.' : 'Location disabled.',
      });
      setRestaurants((prev) => prev.map((r) => (r.id === id ? { ...r, isActive: !currentStatus } : r)));
      router.refresh();
    } catch (error) {
      console.error(error);
      setNotice({ kind: 'danger', text: isTr ? 'Bağlantı hatası oluştu.' : 'Connection error.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Make the business the active one (shell switcher + pages agree via the
  // URL and the remembered id) and open its dashboard.
  const openDashboard = (id: string) => {
    try {
      window.localStorage.setItem(ACTIVE_BUSINESS_STORAGE_KEY, id);
      const recent = parseRecentBusinesses(window.localStorage.getItem(RECENT_BUSINESS_STORAGE_KEY));
      window.localStorage.setItem(RECENT_BUSINESS_STORAGE_KEY, JSON.stringify(pushRecentBusiness(recent, id)));
    } catch {
      /* storage blocked — the URL carries the selection */
    }
    router.push(`/${locale}/dashboard?restaurantId=${encodeURIComponent(id)}`);
  };

  const newBusinessHref = `/${locale}/dashboard/restaurants/new`;
  const envAppUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim().replace(/\/+$/, '');
  const publicBase =
    envAppUrl && !/localhost|127\.0\.0\.1/i.test(envAppUrl) ? envAppUrl : 'https://www.buaze.com';
  const attentionCount = totals.needsAttention;
  const statusTabs: TabItem[] = [
    { id: 'active', label: copy.active, count: totals.active },
    { id: 'attention', label: copy.attention, count: attentionCount },
    { id: 'all', label: copy.all, count: totals.businesses },
    { id: 'passive', label: copy.inactive, count: totals.businesses - totals.active },
  ];
  const number = (value: number) => value.toLocaleString(collatorLocale);

  const emptyTitle =
    statusFilter === 'passive'
      ? copy.inactiveEmptyTitle
      : statusFilter === 'attention'
        ? copy.attentionEmptyTitle
        : copy.emptyTitle;
  const emptyText =
    statusFilter === 'passive'
      ? copy.inactiveEmptyText
      : statusFilter === 'attention'
        ? copy.attentionEmptyText
        : copy.emptyText;

  const rating = (value: number | null) =>
    value === null ? (
      <span className="text-[#A3A3A3]">—</span>
    ) : (
      <span className="inline-flex items-center gap-1 tabular-nums">
        <Star size={12} strokeWidth={0} className="fill-[#F5B400]" aria-hidden="true" />
        {value.toLocaleString(collatorLocale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
      </span>
    );

  const platformCell = (row: PortfolioRow) => {
    const { connected, issue, missing } = row.platforms;
    const href = `/${locale}/dashboard/platforms?restaurantId=${encodeURIComponent(row.id)}`;
    return (
      <Link
        href={href}
        className="inline-flex items-center gap-2.5 rounded-full px-1 py-0.5 text-[13px] text-[#525252] transition-colors hover:bg-pn-canvas hover:text-pn-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent"
        aria-label={
          isTr
            ? `${row.name} platform linkleri: ${connected} bağlı, ${issue} sorunlu, ${missing} eksik`
            : `${row.name} platform links: ${connected} connected, ${issue} need attention, ${missing} not added`
        }
      >
        <span className={`inline-flex items-center gap-1 tabular-nums ${connected > 0 ? 'text-[#15803D]' : 'text-[#737373]'}`}>
          <PlatformStateIcon state="connected" size={12} />
          {connected}
        </span>
        {issue > 0 && (
          <span className="inline-flex items-center gap-1 tabular-nums text-[#991B1B]">
            <PlatformStateIcon state="issue" size={12} />
            {issue}
          </span>
        )}
        {/* "Not added" only matters while nothing works yet — a restaurant
            rarely needs every in-sector platform. */}
        {missing > 0 && connected === 0 && issue === 0 && (
          <span className="inline-flex items-center gap-1 tabular-nums text-[#737373]">
            <PlatformStateIcon state="missing" size={12} />
            {missing}
          </span>
        )}
      </Link>
    );
  };

  const statusBadge = (restaurant: Restaurant) =>
    restaurant.suspendedByAdmin ? (
      <Badge kind="danger">{copy.pausedByAdmin}</Badge>
    ) : restaurant.isActive ? (
      <Badge kind="ok">{copy.activeStatus}</Badge>
    ) : (
      <Badge kind="off">{copy.inactiveStatus}</Badge>
    );

  const reasonsLine = (row: PortfolioRow) => {
    const reasons = attentionReasons(row).filter((reason) => reason !== 'paused');
    if (reasons.length === 0) return null;
    return (
      <span className="mt-1 flex flex-wrap gap-1">
        {reasons.map((reason) => (
          <Badge key={reason} kind={REASON_COPY[reason].kind} dot={false} className="!h-5 !px-1.5 !text-[12px]">
            {isTr ? REASON_COPY[reason].tr : REASON_COPY[reason].en}
          </Badge>
        ))}
      </span>
    );
  };

  const rowMenu = (restaurant: Restaurant) => {
    const suspended = restaurant.suspendedByAdmin === true;
    return (
      <PulseMenu
        trigger={
          <button
            type="button"
            className="bz-btn-icon"
            aria-label={isTr ? `${restaurant.name} işlemleri` : `${restaurant.name} actions`}
          >
            <MoreHorizontal size={16} strokeWidth={2} />
          </button>
        }
        className="min-w-[220px]"
      >
        <PulseMenuItem icon={<Settings size={14} />} onSelect={() => router.push(`/${locale}/dashboard/restaurants/${restaurant.id}/settings`)}>
          {isTr ? 'İşletme ayarları' : 'Business settings'}
        </PulseMenuItem>
        <PulseMenuItem icon={<Plug size={14} />} onSelect={() => router.push(`/${locale}/dashboard/platforms?restaurantId=${restaurant.id}`)}>
          {isTr ? 'Platform bağlantıları' : 'Platform links'}
        </PulseMenuItem>
        <PulseMenuItem icon={<UtensilsCrossed size={14} />} onSelect={() => router.push(`/${locale}/dashboard/restaurants/${restaurant.id}/menu`)}>
          {isTr ? 'Menü' : 'Menu'}
        </PulseMenuItem>
        <PulseMenuItem icon={<QrCode size={14} />} onSelect={() => router.push(`/${locale}/dashboard/qr?restaurantId=${restaurant.id}`)}>
          {isTr ? 'QR kodları' : 'QR codes'}
        </PulseMenuItem>
        <PulseMenuItem icon={<ExternalLink size={14} />} onSelect={() => window.open(`/r/${restaurant.slug}`, '_blank', 'noopener')}>
          {isTr ? 'Müşteri sayfasını aç' : 'Open customer page'}
        </PulseMenuItem>
        <PulseMenuItem icon={<Store size={14} />} onSelect={() => router.push(`/${locale}/dashboard/restaurants/${restaurant.id}`)}>
          {isTr ? 'İşletme detayı' : 'Business details'}
        </PulseMenuItem>
        {canMutate && (
          <>
            <PulseMenuDivider />
            <PulseMenuItem
              icon={restaurant.isActive ? <Pause size={14} /> : <Play size={14} />}
              danger={restaurant.isActive}
              disabled={suspended || actionLoadingId === restaurant.id}
              onSelect={() => toggleActive(restaurant.id, restaurant.isActive)}
            >
              {suspended ? copy.pausedByAdmin : restaurant.isActive ? copy.deactivate : copy.activate}
            </PulseMenuItem>
          </>
        )}
      </PulseMenu>
    );
  };

  const sortHeader = (key: PortfolioSortKey, label: string, align: 'left' | 'right' = 'left') => {
    const activeSort = sortKey === key;
    const Icon = !activeSort ? ArrowUpDown : sortDir === 'asc' ? ArrowUp : ArrowDown;
    return (
      <th
        scope="col"
        aria-sort={activeSort ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
        className={align === 'right' ? 'text-right' : undefined}
      >
        <button
          type="button"
          onClick={() => toggleSort(key)}
          className={`-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 hover:text-pn-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent ${activeSort ? 'text-pn-ink' : ''}`}
        >
          {label}
          <Icon size={12} aria-hidden="true" className={activeSort ? '' : 'opacity-50'} />
        </button>
      </th>
    );
  };

  const nameCell = (restaurant: Restaurant, row: PortfolioRow) => (
    <div className="flex min-w-0 items-start gap-3">
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[14px] text-[12px] font-medium text-pn-ink"
        style={{ background: restaurant.primaryColor || '#D7FE03' }}
      >
        {restaurant.name.trim().charAt(0).toLocaleUpperCase(collatorLocale)}
      </span>
      <div className="min-w-0">
        <Link
          href={`/${locale}/dashboard/restaurants/${restaurant.id}`}
          className="block truncate text-[14px] font-medium text-pn-ink hover:underline underline-offset-2"
        >
          {restaurant.name}
        </Link>
        <span className="flex min-w-0 items-center gap-1 text-[12px] text-[#737373]">
          <span className="truncate">{categoryLabel(restaurant.category)}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate tabular-nums text-[12px]">/r/{restaurant.slug}</span>
          <CopyUrlButton url={`${publicBase}/r/${restaurant.slug}`} locale={locale} className="!h-6 !w-6 shrink-0" />
        </span>
        {reasonsLine(row)}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1440px] space-y-4 px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.subtitle}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {rows.length > 1 && (
              <Link href={`/${locale}/dashboard/restaurants/report`} className="bz-btn-ghost">
                {isTr ? 'Şube raporu' : 'Branch report'}
              </Link>
            )}
            {!isTeamMember && (
              <Link href={newBusinessHref} className="bz-btn-primary">
                <Plus size={14} strokeWidth={2} />
                {copy.add}
              </Link>
            )}
          </div>
        }
      />

      {notice && (
        <AlertBanner kind={notice.kind} onDismiss={() => setNotice(null)}>
          {notice.text}
        </AlertBanner>
      )}

      {rows.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label={isTr ? 'Aktif işletme' : 'Active businesses'}
            value={`${number(totals.active)}/${number(totals.businesses)}`}
            icon={<Store size={14} />}
          />
          <StatCard
            label={isTr ? 'Yorum · 30 gün' : 'Reviews · 30 days'}
            value={number(totals.reviews30d)}
            icon={<MessageSquareText size={14} />}
          />
          <StatCard
            label={isTr ? 'Ortalama puan · 30 gün' : 'Avg rating · 30 days'}
            value={totals.avgRating30d === null ? '—' : totals.avgRating30d.toLocaleString(collatorLocale, { minimumFractionDigits: 1 })}
            icon={<Star size={14} />}
          />
          <StatCard
            label={isTr ? 'Dikkat gereken' : 'Need a look'}
            value={number(attentionCount)}
            delta={totals.unread > 0 ? (isTr ? `${number(totals.unread)} bekleyen düşük puan` : `${number(totals.unread)} low ratings waiting`) : undefined}
            deltaKind="neutral"
            icon={<AlertTriangle size={14} />}
          />
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          items={statusTabs}
          active={statusFilter}
          onChange={(id) => setStatusFilter(id as StatusFilter)}
          ariaLabel={isTr ? 'İşletme filtresi' : 'Business filter'}
          className="overflow-x-auto no-scrollbar"
        />
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#737373]" aria-hidden="true" />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={copy.search}
            aria-label={copy.search}
            className="bz-input"
            style={{ paddingLeft: 36 }}
          />
        </div>
      </div>

      {statusFiltered.length === 0 ? (
        <div className="bz-card">
          <EmptyState
            icon={<Store size={22} />}
            title={emptyTitle}
            body={emptyText}
            action={
              statusFilter !== 'passive' && statusFilter !== 'attention' && !isTeamMember ? (
                <Link href={newBusinessHref} className="bz-btn-primary">
                  <Plus size={14} strokeWidth={2} />
                  {copy.add}
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bz-card">
          <EmptyState
            icon={<Search size={22} />}
            title={isTr ? 'Sonuç bulunamadı' : 'No results'}
            body={isTr ? 'Arama kriterlerini değiştirerek tekrar dene.' : 'Try changing the search term.'}
          />
        </div>
      ) : (
        <>
          {/* Desktop table (§23.6 — card list below lg). */}
          <div className="bz-card hidden overflow-x-auto lg:block">
            <table className="bz-table">
              <thead>
                <tr>
                  {sortHeader('name', isTr ? 'İşletme' : 'Business')}
                  <th scope="col">{isTr ? 'Durum' : 'Status'}</th>
                  {sortHeader('reviews30d', isTr ? 'Yorum (30g)' : 'Reviews (30d)', 'right')}
                  {sortHeader('rating', isTr ? 'Puan (30g)' : 'Rating (30d)', 'right')}
                  {sortHeader('unread', isTr ? 'Bekleyen' : 'Waiting', 'right')}
                  <th scope="col">{isTr ? 'Platformlar' : 'Platforms'}</th>
                  <th scope="col">{isTr ? 'Son yorum' : 'Last review'}</th>
                  <th scope="col" className="text-right">
                    <span className="sr-only">{isTr ? 'İşlemler' : 'Actions'}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => {
                  const restaurant = byId.get(row.id);
                  if (!restaurant) return null;
                  return (
                    <tr key={row.id} className={!row.isActive ? 'bg-[#FCFCFC] text-[#737373]' : undefined}>
                      <td className="max-w-[340px]">{nameCell(restaurant, row)}</td>
                      <td>{statusBadge(restaurant)}</td>
                      <td className="text-right tabular-nums">
                        <span className="font-medium text-pn-ink">{number(row.reviews30d)}</span>
                        <span className="block text-[12px] text-[#A3A3A3]">
                          {isTr ? `toplam ${number(row.reviewsTotal)}` : `${number(row.reviewsTotal)} total`}
                        </span>
                      </td>
                      <td className="text-right">{rating(row.avgRating30d)}</td>
                      <td className="text-right tabular-nums">
                        {row.unread > 0 ? (
                          <Link
                            href={`/${locale}/dashboard/feedbacks?restaurantId=${encodeURIComponent(row.id)}`}
                            className="font-medium text-[#B45309] hover:underline underline-offset-2"
                          >
                            {number(row.unread)}
                          </Link>
                        ) : (
                          <span className="text-[#A3A3A3]">0</span>
                        )}
                      </td>
                      <td>{platformCell(row)}</td>
                      <td className="whitespace-nowrap text-[13px] text-[#525252]">
                        {row.lastFeedbackAt ? formatRelativeTime(row.lastFeedbackAt, locale, nowMs) : '—'}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openDashboard(row.id)}
                            disabled={!row.isActive}
                            title={!row.isActive ? copy.inactiveStatus : undefined}
                            className="bz-btn-ghost bz-btn-sm whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {copy.open}
                          </button>
                          {rowMenu(restaurant)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile / tablet cards. */}
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden" role="list">
            {visible.map((row) => {
              const restaurant = byId.get(row.id);
              if (!restaurant) return null;
              return (
                <li key={row.id} className={`bz-card p-4 ${!row.isActive ? 'bg-[#FCFCFC]' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    {nameCell(restaurant, row)}
                    {rowMenu(restaurant)}
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-pn-line pt-3 text-[12px]">
                    <div>
                      <dt className="text-[#737373]">{isTr ? 'Yorum (30g)' : 'Reviews (30d)'}</dt>
                      <dd className="mt-0.5 font-medium tabular-nums text-pn-ink">{number(row.reviews30d)}</dd>
                    </div>
                    <div>
                      <dt className="text-[#737373]">{isTr ? 'Puan' : 'Rating'}</dt>
                      <dd className="mt-0.5 font-medium text-pn-ink">{rating(row.avgRating30d)}</dd>
                    </div>
                    <div>
                      <dt className="text-[#737373]">{isTr ? 'Bekleyen' : 'Waiting'}</dt>
                      <dd className={`mt-0.5 font-medium tabular-nums ${row.unread > 0 ? 'text-[#B45309]' : 'text-pn-ink'}`}>
                        {number(row.unread)}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      {statusBadge(restaurant)}
                      {platformCell(row)}
                    </div>
                    <button
                      type="button"
                      onClick={() => openDashboard(row.id)}
                      disabled={!row.isActive}
                      className="bz-btn-primary bz-btn-sm shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {copy.open}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          {statusFilter === 'passive' && canMutate && (
            <p className="text-[12px] text-[#737373]">
              {isTr
                ? 'Bir işletmeyi yeniden açmak için satırdaki ••• menüsünden "Aktifleştir"i seç.'
                : 'To reopen a business, choose "Reactivate" from the row ••• menu.'}
              {visible.some((row) => byId.get(row.id)?.suspendedByAdmin) ? ` ${suspendedByAdminMessage(locale)}` : ''}
            </p>
          )}
        </>
      )}
    </div>
  );
}
