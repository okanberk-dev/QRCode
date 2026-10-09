'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Loader2, Plus, Search, Store } from 'lucide-react';
import CopyUrlButton from '@/components/dashboard/CopyUrlButton';
import { AlertBanner, Badge, EmptyState, ErrorState, PageHeader, Tabs, type TabItem } from '@/components/ui';
import {
  isSuspendedByAdminError,
  restaurantSaveErrorMessage,
  suspendedByAdminMessage,
} from '@/components/dashboard/settings/restaurant-status';
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
}

interface RestaurantsClientProps {
  locale: Locale;
  initialRestaurants: Restaurant[];
  initialNotificationEmail: string;
  /**
   * §22 franchise — `team_member` rolündeki kullanıcı (area manager) kendi
   * lokasyonlarını yönetmek için bu sayfaya gelir. Başlık/alt yazı rol-aware,
   * "Yeni İşletme" CTA team_member için gizli (backend `canWriteRestaurant`
   * zaten reddediyor, UI'da gereksiz disabled state göstermiyoruz).
   */
  role?: string;
  /**
   * §22 viewer-mode — `TeamMember.role='viewer'` ise true. Deaktifleştir /
   * Aktifleştir butonu gizlenir; backend `canWriteRestaurant` zaten viewer'ı
   * reddediyor (`role !== 'viewer'`), UI sync.
   */
  viewerMode?: boolean;
}

export default function RestaurantsClient({
  locale,
  initialRestaurants,
  role = 'restaurant_owner',
  viewerMode = false,
}: RestaurantsClientProps) {
  const isTeamMember = role === 'team_member';
  const canMutate = !viewerMode;
  const didBootstrapRef = useRef(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>(initialRestaurants);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'all' | 'passive'>('active');
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState('');
  const [notice, setNotice] = useState<{ kind: 'success' | 'danger'; text: string } | null>(null);

  useEffect(() => {
    setRestaurants(initialRestaurants);
  }, [initialRestaurants]);

  const copy = locale === 'tr'
    ? {
        eyebrow: isTeamMember ? 'YÖNETTİĞİN LOKASYONLAR' : 'İŞLETMELER',
        title: isTeamMember ? 'Yönettiğin lokasyonlar' : 'İşletmelerim',
        subtitle: isTeamMember
          ? 'Sahibin sana atadığı lokasyonlar burada listelenir. Erişimin yalnızca bu listeyle sınırlıdır.'
          : 'Restoranlarınızı, şubelerinizi veya mağazalarınızı tek panelden yönetin.',
        add: 'Yeni İşletme',
        emptyTitle: isTeamMember ? 'Henüz lokasyon atanmamış' : 'Henüz işletme yok',
        emptyText: isTeamMember
          ? 'İşletme sahibinden bir lokasyon yetkisi bekliyorsun. Atama yapıldığında burada görünür.'
          : 'İlk işletmenizi ekleyerek QR ve yorum toplamaya başlayın.',
        manage: 'Yönet',
        qr: 'QR Kod',
        category: 'Kategori',
        reviews: 'Yorum',
        search: isTeamMember ? 'Lokasyon ara' : 'İşletme ara',
        active: 'Aktif',
        all: 'Tümü',
        inactive: 'Devre Dışı Bırakılanlar',
        inactiveEmptyTitle: 'Devre dışı işletme yok',
        inactiveEmptyText: 'Pasife alınan işletmeler burada görünür. Aktifleştirme işlemini bu listeden yapabilirsin.',
        activate: 'Aktifleştir',
        deactivate: 'Devre dışı bırak',
        activeStatus: 'Aktif',
        inactiveStatus: 'Devre dışı',
        pausedByAdmin: 'Buaze tarafından duraklatıldı',
      }
    : {
        eyebrow: isTeamMember ? 'LOCATIONS YOU MANAGE' : 'BUSINESSES',
        title: isTeamMember ? 'Locations you manage' : 'My Businesses',
        subtitle: isTeamMember
          ? 'Locations assigned to you by the owner are listed here. Your access is scoped to this list only.'
          : 'Manage your restaurants, branches, or stores from one panel.',
        add: 'New Business',
        emptyTitle: isTeamMember ? 'No locations assigned yet' : 'No business yet',
        emptyText: isTeamMember
          ? 'Waiting for the owner to grant access to a location. Assignments appear here.'
          : 'Create your first business to start collecting feedback.',
        manage: 'Manage',
        qr: 'QR Code',
        category: 'Category',
        reviews: 'Reviews',
        search: isTeamMember ? 'Search locations' : 'Search businesses',
        active: 'Active',
        all: 'All',
        inactive: 'Disabled',
        inactiveEmptyTitle: 'No disabled business',
        inactiveEmptyText: 'Disabled businesses appear here. You can reactivate them from this list.',
        activate: 'Reactivate',
        deactivate: 'Disable',
        activeStatus: 'Active',
        inactiveStatus: 'Disabled',
        pausedByAdmin: 'Paused by Buaze',
      };

  const fetchRestaurants = async () => {
    setLoading(true);
    setFetchError('');
    try {
      // §22 — Sayfa scope-blind. Switcher seçimi (?restaurantId=) bu listede
      // filter etmez; owner/team_member kendi tüm scope'unu görür. Status
      // filter (active/passive/all) tek query param.
      const params = new URLSearchParams({ status: statusFilter });
      const response = await fetch(`/api/restaurants?${params.toString()}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        setFetchError(errData.error || `Sunucu hatası (${response.status})`);
        return;
      }

      const data = await response.json();
      setRestaurants(Array.isArray(data) ? data : (data?.data || []));
    } catch (err) {
      console.error(err);
      setFetchError('Bağlantı hatası. Lütfen sayfayı yenileyin.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!didBootstrapRef.current) {
      didBootstrapRef.current = true;
      if (statusFilter === 'active') return;
    }
    fetchRestaurants();
    // fetchRestaurants captures statusFilter; sayfa scope-blind olduğu için
    // selectedRestaurantId dependency'si kaldırıldı.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

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
          // Lock this card's toggle without waiting for a refetch.
          setRestaurants((prev) =>
            prev.map((r) => (r.id === id ? { ...r, suspendedByAdmin: true } : r)),
          );
        }
        setNotice({
          kind: 'danger',
          text: restaurantSaveErrorMessage(
            data,
            locale,
            locale === 'tr' ? 'Durum güncellenemedi.' : 'Status could not be updated.',
          ),
        });
        return;
      }

      setNotice({
        kind: 'success',
        text: !currentStatus
          ? locale === 'tr' ? 'İşletme tekrar aktifleştirildi.' : 'Location reactivated.'
          : locale === 'tr' ? 'İşletme devre dışı bırakıldı.' : 'Location disabled.',
      });
      await fetchRestaurants();
    } catch (error) {
      console.error(error);
      setNotice({
        kind: 'danger',
        text: locale === 'tr' ? 'Bağlantı hatası oluştu.' : 'Connection error.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0A0A0A]" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8">
        <ErrorState
          title={locale === 'tr' ? 'Hata' : 'Error'}
          body={fetchError}
          onRetry={fetchRestaurants}
          retryLabel={locale === 'tr' ? 'Tekrar dene' : 'Retry'}
        />
      </div>
    );
  }

  // §22 — Sayfa scope-blind. Sahibi/yönettiği TÜM restoranlar her zaman
  // listelenir. Sidebar switcher seçimi (?restaurantId=) sadece downstream
  // context-scoped sayfalarda (dashboard / feedbacks / analytics) etkili;
  // bu sayfada owner tüm portföyü gözlemleyip yönetmek istediğini seçer.
  const filtered = restaurants.filter(
    (r) =>
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.category.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const newBusinessHref = `/${locale}/dashboard/restaurants/new`;
  // Absolute public link for the copy button — env app URL (stable on server
  // and client), production host when unset / localhost.
  const envAppUrl = (process.env.NEXT_PUBLIC_APP_URL || '').trim().replace(/\/+$/, '');
  const publicBase =
    envAppUrl && !/localhost|127\.0\.0\.1/i.test(envAppUrl) ? envAppUrl : 'https://www.buaze.com';
  const statusTabs: TabItem[] = [
    { id: 'active', label: copy.active },
    { id: 'all', label: copy.all },
    { id: 'passive', label: copy.inactive },
  ];
  const emptyTitle = statusFilter === 'passive' ? copy.inactiveEmptyTitle : copy.emptyTitle;
  const emptyText = statusFilter === 'passive' ? copy.inactiveEmptyText : copy.emptyText;

  return (
    <div className="mx-auto max-w-[1440px] space-y-4 px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.subtitle}
        actions={
          !isTeamMember ? (
            <Link href={newBusinessHref} className="bz-btn-primary">
              <Plus size={14} strokeWidth={2} />
              {copy.add}
            </Link>
          ) : undefined
        }
      />

      {notice && (
        <AlertBanner kind={notice.kind} onDismiss={() => setNotice(null)}>
          {notice.text}
        </AlertBanner>
      )}

      {/*
        Stage 80 §38.160 — Mobile filter toolbar sticky-on-scroll.
        Topbar h-16 (64px) altında pin'lenir; tab + arama kutusu içerik
        scroll'unda her zaman erişilebilir kalır. lg+ desktop'ta
        non-sticky (mevcut layout intact). bg-white/95 + backdrop-blur
        Apple-soft hissi (CLAUDE.md §38.46 + §38.65 paterni reuse).
      */}
      <div className="bz-card flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between md:sticky md:top-16 md:z-20 md:bg-white/95 md:backdrop-blur lg:static lg:bg-white lg:backdrop-blur-none">
        <Tabs
          items={statusTabs}
          active={statusFilter}
          onChange={(id) => setStatusFilter(id as 'active' | 'all' | 'passive')}
          ariaLabel={locale === 'tr' ? 'İşletme durum filtresi' : 'Location status filter'}
          className="overflow-x-auto no-scrollbar"
        />
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#737373]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={copy.search}
            className="bz-input"
            style={{ paddingLeft: 44 }}
          />
        </div>
      </div>

      {restaurants.length === 0 ? (
        <EmptyState
          icon={<Store size={22} />}
          title={emptyTitle}
          body={emptyText}
          action={
            statusFilter !== 'passive' && !isTeamMember ? (
              <Link href={newBusinessHref} className="bz-btn-primary">
                <Plus size={14} strokeWidth={2} />
                {copy.add}
              </Link>
            ) : undefined
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={22} />}
          title={locale === 'tr' ? 'Sonuç bulunamadı' : 'No results'}
          body={locale === 'tr' ? 'Arama kriterlerini değiştirerek tekrar dene.' : 'Try changing the search term.'}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((restaurant) => {
            const suspended = restaurant.suspendedByAdmin === true;
            const publicUrl = `${publicBase}/r/${restaurant.slug}`;
            return (
              <div
                key={restaurant.id}
                className={`overflow-hidden bz-card bz-motion-spring ${!restaurant.isActive ? 'border-[#FECACA] bg-[#FFFBFB]' : 'hover:border-[#C6F24E] hover:bz-elev-2 bz-lift'}`}
              >
                <div className="p-5 sm:p-6">
                  {/* Header — name + category + status badge (AdminLocations design) */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3
                        className="truncate text-[20px] sm:text-[22px] font-semibold text-[#0A0A0A] tracking-[-0.02em] leading-tight bz-h-tight"
                      >
                        {restaurant.name}
                      </h3>
                      <p className="mt-1 text-[12px] text-[#737373] truncate">{restaurant.category}</p>
                    </div>
                    {/* Status shown once here; the map overlay is the only other
                        mention (status used to appear four times per card). */}
                    <div className="shrink-0">
                      <Badge kind={restaurant.isActive ? 'ok' : 'danger'}>
                        {suspended
                          ? copy.pausedByAdmin
                          : restaurant.isActive
                            ? copy.activeStatus
                            : copy.inactiveStatus}
                      </Badge>
                    </div>
                  </div>

                  {/* Mini map graphic — decorative, lime accent pin (AdminLocations §716-724) */}
                  <div className="mt-4 block w-full aspect-[2/1] rounded-lg bg-[#F5F5F5] relative overflow-hidden">
                    <svg viewBox="0 0 200 100" className="w-full h-full" aria-hidden>
                      <path d="M0 50 Q30 40 60 48 Q90 55 120 42 Q150 30 200 38" stroke="#EDEDED" strokeWidth="1.5" fill="none" />
                      <path d="M20 70 Q60 60 100 65 Q140 70 180 62" stroke="#EDEDED" strokeWidth="1.5" fill="none" />
                      <path d="M0 20 Q40 25 80 18 Q120 12 160 22 Q190 30 200 22" stroke="#EDEDED" strokeWidth="1.5" fill="none" />
                      <circle cx="100" cy="50" r="18" fill={restaurant.primaryColor} opacity="0.3" />
                      <circle cx="100" cy="50" r="10" fill={restaurant.primaryColor} opacity="0.6" />
                      <circle cx="100" cy="50" r="5" fill="#0A0A0A" />
                    </svg>
                    <span className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded bg-white/85 px-2 py-1 pulse-eyebrow text-[#737373]">
                      {restaurant.isActive ? copy.activeStatus.toUpperCase() : copy.inactiveStatus.toUpperCase()}
                    </span>
                  </div>

                  {/* Review count + public link. The old 4-tile grid had a "PUAN"
                      tile hardcoded to "—" with a lime star (the SSR list carries
                      no rating), a "DURUM" tile repeating the badge and a URL
                      tile repeating this row — collapsed into one line. */}
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <div className="pulse-eyebrow text-[#737373]">{locale === 'tr' ? 'YORUM' : 'REVIEWS'}</div>
                      <div className="mt-1.5 text-[16px] sm:text-[18px] font-semibold text-[#0A0A0A] tracking-[-0.015em] font-heading">
                        {restaurant._count.feedbacks}
                      </div>
                    </div>
                    {/* Copy keeps bz-btn-icon's native 32px tap target (was
                        squeezed to 20px). */}
                    <div className="flex min-w-0 items-center gap-1">
                      <p className="pulse-eyebrow text-[#737373] truncate">/r/{restaurant.slug}</p>
                      <CopyUrlButton url={publicUrl} locale={locale} className="shrink-0" />
                    </div>
                  </div>

                  {/*
                    Stage 80 §38.160 — Action grid 4 button mobile 44px+
                    touch target garantisi (WCAG 2.5.5 AA). Mobile'da
                    `min-h-[44px]`, sm:+ desktop'ta mevcut padding intact.
                    Lime CTA + ghost dark + status toggle + public preview
                    sırası action priority hierarchy'siyle uyumlu.

                    Stage 81 §38.161 — `min-h-[44px] sm:min-h-0` inline
                    pattern → `bz-touch-target` utility migrate (CLAUDE.md
                    §38.49 dead utility class disipline, callsite adopt).
                    `sm:min-h-0 sm:min-w-0` override sm:+ desktop'ta
                    utility override eder (button compact density intact).
                  */}
                  <div
                    className={`mt-4 grid gap-2 ${
                      canMutate ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'
                    }`}
                  >
                    <Link
                      href={`/${locale}/dashboard/restaurants/${restaurant.id}`}
                      className="bz-btn-ghost justify-center text-[12px] bz-touch-target sm:min-h-0 sm:min-w-0"
                    >
                      {locale === 'tr' ? 'Detay aç' : 'Open details'} →
                    </Link>
                    <Link
                      href={`/${locale}/dashboard/qr?restaurant=${restaurant.id}`}
                      className="bz-btn-primary justify-center text-[12px] bz-touch-target sm:min-h-0 sm:min-w-0"
                    >
                      {copy.qr}
                    </Link>
                    {/* §22 viewer-mode — Deaktifleştir / Aktifleştir backend
                        `canWriteRestaurant` viewer'ı reddediyor; UI'da da
                        gizliyoruz. Grid `grid-cols-1 sm:grid-cols-3`'e düşer
                        (Detay / QR / Aç). */}
                    {canMutate && (
                      <button
                        type="button"
                        disabled={actionLoadingId === restaurant.id || suspended}
                        title={suspended ? suspendedByAdminMessage(locale) : undefined}
                        onClick={() => toggleActive(restaurant.id, restaurant.isActive)}
                        className={`inline-flex items-center justify-center bz-touch-target sm:min-h-0 sm:min-w-0 rounded-full px-4 py-2.5 text-center text-[12px] font-medium bz-motion-spring disabled:opacity-60 ${
                          restaurant.isActive
                            ? 'border border-[#FECACA] bg-white text-[#991B1B] hover:bg-[#FEF2F2]'
                            : 'border border-[#C6F24E] bg-[#C6F24E] text-[#0A0A0A] hover:bg-[#A8D62E]'
                        }`}
                      >
                        {actionLoadingId === restaurant.id
                          ? locale === 'tr' ? 'İşleniyor...' : 'Working...'
                          : suspended
                            ? copy.pausedByAdmin
                            : restaurant.isActive ? copy.deactivate : copy.activate}
                      </button>
                    )}
                    <Link
                      href={`/r/${restaurant.slug}`}
                      target="_blank"
                      className="inline-flex items-center justify-center gap-1.5 bz-touch-target sm:min-h-0 sm:min-w-0 rounded-full border border-[#EDEDED] bg-white px-4 py-2.5 text-[12px] font-medium text-[#0A0A0A] bz-motion-spring hover:border-[#C6F24E]"
                      aria-label="Open public page"
                    >
                      <ExternalLink size={14} strokeWidth={2} />
                      {locale === 'tr' ? 'Aç' : 'Open'}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
