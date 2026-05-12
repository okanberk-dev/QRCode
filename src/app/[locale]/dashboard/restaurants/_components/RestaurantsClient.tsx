'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, ExternalLink, Info, Loader2, MapPin, Palette, Plus, Search, ShieldCheck, Sparkles, Store } from 'lucide-react';
import CopyUrlButton from '@/components/dashboard/CopyUrlButton';
import { AlertBanner, Badge, EmptyState, ErrorState, Modal, PageHeader, PlatformChip, Tabs, type TabItem } from '@/components/ui';
import { getSectorPlatforms } from '@/lib/sector-platforms';
import { getSectorByLabel, SECTORS } from '@/lib/sectors';
import { ACTIVE_BUSINESS_STORAGE_KEY } from '@/lib/active-business';
import { isValidBusinessSlug } from '@/lib/create-business-wizard';
import type { Locale } from '@/lib/translations';

interface Restaurant {
  id: string;
  slug: string;
  name: string;
  category: string;
  notificationEmail: string | null;
  primaryColor: string;
  isActive: boolean;
  createdAt: string;
  _count: { feedbacks: number };
}

interface RestaurantsClientProps {
  locale: Locale;
  initialRestaurants: Restaurant[];
  initialNotificationEmail: string;
  selectedRestaurantId?: string | null;
  hasMultipleRestaurants?: boolean;
}

type CreateStep = 0 | 1 | 2;

const CREATE_STEPS = [
  { tr: 'Kimlik', en: 'Identity' },
  { tr: 'Kanallar', en: 'Channels' },
  { tr: 'Önizleme', en: 'Preview' },
] as const;

const PLATFORM_INPUTS = [
  {
    id: 'google',
    field: 'googlePlaceId',
    label: 'Google',
    placeholder: 'https://maps.google.com/... veya Place ID',
  },
  {
    id: 'yandex',
    field: 'yandexUrl',
    label: 'Yandex',
    placeholder: 'https://yandex.com/maps/...',
  },
  {
    id: 'getir',
    field: 'getirYemekUrl',
    label: 'Getir Yemek',
    placeholder: 'https://getir.com/yemek/...',
  },
  {
    id: 'yemeksepeti',
    field: 'yemekSepetiUrl',
    label: 'Yemeksepeti',
    placeholder: 'https://www.yemeksepeti.com/...',
  },
  {
    id: 'trendyol',
    field: 'trendyolYemekUrl',
    label: 'Trendyol Yemek',
    placeholder: 'https://www.trendyol.com/...',
  },
  {
    id: 'tripadvisor',
    field: 'tripAdvisorUrl',
    label: 'Tripadvisor',
    placeholder: 'https://www.tripadvisor.com/...',
  },
  {
    id: 'booking',
    field: 'bookingUrl',
    label: 'Booking',
    placeholder: 'https://www.booking.com/...',
  },
  {
    id: 'airbnb',
    field: 'airbnbUrl',
    label: 'Airbnb',
    placeholder: 'https://www.airbnb.com/...',
  },
] as const;

function createEmptyForm(notificationEmail: string) {
  return {
    name: '',
    slug: '',
    category: 'Restoran',
    notificationEmail,
    googlePlaceId: '',
    getirYemekUrl: '',
    yemekSepetiUrl: '',
    trendyolYemekUrl: '',
    tripAdvisorUrl: '',
    airbnbUrl: '',
    bookingUrl: '',
    yandexUrl: '',
    address: '',
    phone: '',
    primaryColor: '#C6F24E',
  };
}

type CreateFormData = ReturnType<typeof createEmptyForm>;
type CreateFormField = keyof CreateFormData;

export default function RestaurantsClient({
  locale,
  initialRestaurants,
  initialNotificationEmail,
  selectedRestaurantId = null,
  hasMultipleRestaurants = false,
}: RestaurantsClientProps) {
  const router = useRouter();
  const didBootstrapRef = useRef(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>(initialRestaurants);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'all' | 'passive'>('active');
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [createError, setCreateError] = useState('');
  const [notice, setNotice] = useState<{ kind: 'success' | 'danger'; text: string } | null>(null);
  const [isManualSlug, setIsManualSlug] = useState(false);
  const [showGoogleInfo, setShowGoogleInfo] = useState(false);
  const [createStep, setCreateStep] = useState<CreateStep>(0);
  const [formData, setFormData] = useState<CreateFormData>(() =>
    createEmptyForm(initialNotificationEmail),
  );

  useEffect(() => {
    setRestaurants(initialRestaurants);
  }, [initialRestaurants]);

  const copy = locale === 'tr'
    ? {
        title: 'İşletmelerim',
        subtitle: 'Restoranlarınızı, şubelerinizi veya mağazalarınızı tek panelden yönetin.',
        add: 'Yeni İşletme',
        emptyTitle: 'Henüz işletme yok',
        emptyText: 'İlk işletmenizi ekleyerek QR ve yorum toplamaya başlayın.',
        manage: 'Yönet',
        qr: 'QR Kod',
        category: 'Kategori',
        reviews: 'Yorum',
        search: 'İşletme ara',
        active: 'Aktif',
        all: 'Tümü',
        inactive: 'Devre Dışı Bırakılanlar',
        inactiveEmptyTitle: 'Devre dışı işletme yok',
        inactiveEmptyText: 'Pasife alınan işletmeler burada görünür. Aktifleştirme işlemini bu listeden yapabilirsin.',
        activate: 'Aktifleştir',
        deactivate: 'Devre dışı bırak',
        activeStatus: 'Aktif',
        inactiveStatus: 'Devre dışı',
        scopeHint: 'Diğer işletmeleri görüntülemek için sol üstten işletme seçin.',
      }
    : {
        title: 'My Businesses',
        subtitle: 'Manage your restaurants, branches, or stores from one panel.',
        add: 'New Business',
        emptyTitle: 'No business yet',
        emptyText: 'Create your first business to start collecting feedback.',
        manage: 'Manage',
        qr: 'QR Code',
        category: 'Category',
        reviews: 'Reviews',
        search: 'Search businesses',
        active: 'Active',
        all: 'All',
        inactive: 'Disabled',
        inactiveEmptyTitle: 'No disabled business',
        inactiveEmptyText: 'Disabled businesses appear here. You can reactivate them from this list.',
        activate: 'Reactivate',
        deactivate: 'Disable',
        activeStatus: 'Active',
        inactiveStatus: 'Disabled',
        scopeHint: 'To view other businesses, choose them from the top-left business selector.',
      };

  const fetchRestaurants = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const params = new URLSearchParams({ status: statusFilter });
      if (selectedRestaurantId) params.set('restaurantId', selectedRestaurantId);
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
    // fetchRestaurants captures status + selectedRestaurantId; both should
    // refresh the scoped owner list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, selectedRestaurantId]);

  const handleNameChange = (name: string) => {
    if (isManualSlug) {
      setFormData((prev) => ({ ...prev, name }));
      return;
    }

    const slug = name
      .toLowerCase()
      .replace(/[çÇ]/g, 'c')
      .replace(/[ğĞ]/g, 'g')
      .replace(/[ıİ]/g, 'i')
      .replace(/[öÖ]/g, 'o')
      .replace(/[şŞ]/g, 's')
      .replace(/[üÜ]/g, 'u')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    setFormData((prev) => ({ ...prev, name, slug }));
  };

  const setFormField = (field: CreateFormField, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetCreateForm = () => {
    setFormData(createEmptyForm(initialNotificationEmail));
    setCreateStep(0);
    setCreateError('');
    setIsManualSlug(false);
    setShowGoogleInfo(false);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    resetCreateForm();
  };

  const slugValid = isValidBusinessSlug(formData.slug);
  const canContinueIdentity = formData.name.trim().length > 1 && slugValid;
  const selectedSector = getSectorByLabel(formData.category);
  const isClinic = selectedSector?.sectorKey === 'clinic';

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setCreateError('');

    try {
      const response = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          googleReviewUrl: formData.googlePlaceId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setCreateError(data.error || 'İşletme oluşturulamadı.');
        return;
      }

      setShowCreateModal(false);
      resetCreateForm();
      if (typeof data?.id === 'string' && typeof window !== 'undefined') {
        window.localStorage.setItem(ACTIVE_BUSINESS_STORAGE_KEY, data.id);
      }
      router.push(
        typeof data?.id === 'string'
          ? `/${locale}/dashboard?restaurantId=${data.id}`
          : `/${locale}/dashboard/restaurants`,
      );
      router.refresh();
    } catch (err) {
      console.error(err);
      setCreateError(locale === 'tr' ? 'Bağlantı hatası oluştu.' : 'Connection error.');
    } finally {
      setCreating(false);
    }
  };

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
        setNotice({
          kind: 'danger',
          text: data.error || (locale === 'tr' ? 'Durum güncellenemedi.' : 'Status could not be updated.'),
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
      <div className="mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8">
        <ErrorState
          title={locale === 'tr' ? 'Hata' : 'Error'}
          body={fetchError}
          onRetry={fetchRestaurants}
          retryLabel={locale === 'tr' ? 'Tekrar dene' : 'Retry'}
        />
      </div>
    );
  }

  const scopedRestaurants = selectedRestaurantId
    ? restaurants.filter((restaurant) => restaurant.id === selectedRestaurantId)
    : restaurants;

  const filtered = scopedRestaurants.filter(
    (r) =>
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.category.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  // Sector → platform whitelist for the "Yeni İşletme" modal — filters which
  // platform inputs the owner sees while the modal is open. Live on
  // formData.category (default 'Restoran' → food sector).
  const allowedPlatforms = getSectorPlatforms(formData.category);
  const statusTabs: TabItem[] = [
    { id: 'active', label: copy.active },
    { id: 'all', label: copy.all },
    { id: 'passive', label: copy.inactive },
  ];
  const emptyTitle = statusFilter === 'passive' ? copy.inactiveEmptyTitle : copy.emptyTitle;
  const emptyText = statusFilter === 'passive' ? copy.inactiveEmptyText : copy.emptyText;

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow={locale === 'tr' ? 'İŞLETMELER' : 'BUSINESSES'}
        title={copy.title}
        description={copy.subtitle}
        actions={
          <button onClick={() => setShowCreateModal(true)} className="bz-btn-primary">
            <Plus size={14} strokeWidth={2} />
            {copy.add}
          </button>
        }
      />

      {notice && (
        <AlertBanner kind={notice.kind} onDismiss={() => setNotice(null)}>
          {notice.text}
        </AlertBanner>
      )}

      {hasMultipleRestaurants && selectedRestaurantId && (
        <AlertBanner kind="info">
          {copy.scopeHint}
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

      {scopedRestaurants.length === 0 ? (
        <EmptyState
          icon={<Store size={22} />}
          title={emptyTitle}
          body={emptyText}
          action={
            statusFilter !== 'passive' ? (
              <button onClick={() => setShowCreateModal(true)} className="bz-btn-primary">
                <Plus size={14} strokeWidth={2} />
                {copy.add}
              </button>
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
            const trend: 'active' | 'new' | 'inactive' = !restaurant.isActive
              ? 'inactive'
              : restaurant._count.feedbacks >= 10
                ? 'active'
                : 'new';
            const trendStyle = {
              active: { bg: 'bg-[#EAF9B8]', fg: 'text-[#0A0A0A]', label: locale === 'tr' ? '↑ AKTİF' : '↑ ACTIVE' },
              new: { bg: 'bg-[#F5F5F5]', fg: 'text-[#525252]', label: locale === 'tr' ? '→ YENİ' : '→ NEW' },
              inactive: { bg: 'bg-[#FEF2F2]', fg: 'text-[#991B1B]', label: locale === 'tr' ? '· DEVRE DIŞI' : '· DISABLED' },
            }[trend];
            return (
              <div
                key={restaurant.id}
                className={`overflow-hidden bz-card bz-motion-spring ${!restaurant.isActive ? 'border-[#FECACA] bg-[#FFFBFB]' : 'hover:border-[#C6F24E] hover:bz-elev-2 bz-lift'}`}
              >
                <div className="p-5 sm:p-6">
                  {/* Header — name + address + trend badge (AdminLocations design) */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3
                        className="truncate text-[20px] sm:text-[22px] font-semibold text-[#0A0A0A] tracking-[-0.02em] leading-tight bz-h-tight"
                      >
                        {restaurant.name}
                      </h3>
                      <p className="mt-1 text-[12px] text-[#737373] truncate">{restaurant.category}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className={`${trendStyle.bg} ${trendStyle.fg} shrink-0 pulse-eyebrow rounded px-2 py-1`}>
                        {trendStyle.label}
                      </span>
                      <Badge kind={restaurant.isActive ? 'ok' : 'danger'}>
                        {restaurant.isActive ? copy.activeStatus : copy.inactiveStatus}
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

                  {/* 4-col stat grid (AdminLocations §727-739) */}
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { l: locale === 'tr' ? 'PUAN' : 'RATING', v: '—', star: true },
                      { l: locale === 'tr' ? 'YORUM' : 'REVIEWS', v: String(restaurant._count.feedbacks) },
                      {
                        l: locale === 'tr' ? 'DURUM' : 'STATUS',
                        v: restaurant.isActive ? copy.activeStatus : copy.inactiveStatus,
                      },
                      { l: 'URL', v: `/${restaurant.slug}`, mono: true },
                    ].map((x) => (
                      <div key={x.l} className="min-w-0">
                        <div className="pulse-eyebrow text-[#737373]">{x.l}</div>
                        <div
                          className={`mt-1.5 text-[16px] sm:text-[18px] font-semibold text-[#0A0A0A] tracking-[-0.015em] truncate ${x.mono ? 'font-mono text-[13px] sm:text-[13px]' : 'font-heading'}`}
                        >
                          {x.v}
                          {x.star && <span className="text-[#C6F24E] ml-1 text-[12px]"> ★</span>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* URL row + copy */}
                  <div className="mt-4 flex items-center gap-1.5">
                    <CopyUrlButton
                      url={`${typeof window !== 'undefined' ? window.location.origin : ''}/r/${restaurant.slug}`}
                      className="h-5 w-5 shrink-0"
                    />
                    <p className="pulse-eyebrow text-[#737373] truncate">/r/{restaurant.slug}</p>
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
                  <div className="mt-4 grid grid-cols-2 gap-2">
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
                    <button
                      type="button"
                      disabled={actionLoadingId === restaurant.id}
                      onClick={() => toggleActive(restaurant.id, restaurant.isActive)}
                      className={`inline-flex items-center justify-center bz-touch-target sm:min-h-0 sm:min-w-0 rounded-full px-4 py-2.5 text-center text-[12px] font-medium bz-motion-spring disabled:opacity-60 ${
                        restaurant.isActive
                          ? 'border border-[#FECACA] bg-white text-[#991B1B] hover:bg-[#FEF2F2]'
                          : 'border border-[#C6F24E] bg-[#C6F24E] text-[#0A0A0A] hover:bg-[#A8D62E]'
                      }`}
                    >
                      {actionLoadingId === restaurant.id
                        ? locale === 'tr' ? 'İşleniyor...' : 'Working...'
                        : restaurant.isActive ? copy.deactivate : copy.activate}
                    </button>
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

      {showCreateModal && (
        <CreateBusinessWizard
          locale={locale}
          copyAdd={copy.add}
          formData={formData}
          createStep={createStep}
          setCreateStep={setCreateStep}
          createError={createError}
          setCreateError={setCreateError}
          creating={creating}
          slugValid={slugValid}
          canContinueIdentity={canContinueIdentity}
          selectedSector={selectedSector}
          isClinic={isClinic}
          allowedPlatforms={allowedPlatforms}
          showGoogleInfo={showGoogleInfo}
          setShowGoogleInfo={setShowGoogleInfo}
          onNameChange={handleNameChange}
          onFieldChange={setFormField}
          onClose={closeCreateModal}
          onSubmit={handleCreate}
          onManualSlug={() => setIsManualSlug(true)}
        />
      )}

    </div>
  );
}

function CreateBusinessWizard({
  locale,
  copyAdd,
  formData,
  createStep,
  setCreateStep,
  createError,
  setCreateError,
  creating,
  slugValid,
  canContinueIdentity,
  selectedSector,
  isClinic,
  allowedPlatforms,
  showGoogleInfo,
  setShowGoogleInfo,
  onNameChange,
  onFieldChange,
  onClose,
  onSubmit,
  onManualSlug,
}: {
  locale: Locale;
  copyAdd: string;
  formData: CreateFormData;
  createStep: CreateStep;
  setCreateStep: (step: CreateStep) => void;
  createError: string;
  setCreateError: (value: string) => void;
  creating: boolean;
  slugValid: boolean;
  canContinueIdentity: boolean;
  selectedSector: ReturnType<typeof getSectorByLabel>;
  isClinic: boolean;
  allowedPlatforms: ReturnType<typeof getSectorPlatforms>;
  showGoogleInfo: boolean;
  setShowGoogleInfo: (value: boolean | ((current: boolean) => boolean)) => void;
  onNameChange: (name: string) => void;
  onFieldChange: (field: CreateFormField, value: string) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  onManualSlug: () => void;
}) {
  const isTr = locale === 'tr';
  const stepLabel = CREATE_STEPS[createStep][locale];
  const platformInputs = PLATFORM_INPUTS.filter((input) =>
    allowedPlatforms.has(input.id as Parameters<typeof allowedPlatforms.has>[0]),
  );

  const continueTo = (step: CreateStep) => {
    if (createStep === 0 && !canContinueIdentity) {
      setCreateError(
        isTr
          ? 'İşletme adı ve geçerli URL slug alanlarını doldurun.'
          : 'Add a business name and valid URL slug.',
      );
      return;
    }
    setCreateError('');
    setCreateStep(step);
  };

  const handleWizardSubmit = (event: React.FormEvent) => {
    if (createStep < 2) {
      event.preventDefault();
      continueTo((createStep + 1) as CreateStep);
      return;
    }
    onSubmit(event);
  };

  return (
    <Modal
      size={920}
      onClose={onClose}
      title={
        <div>
          <p className="text-[17px] font-semibold text-[#0A0A0A]">{copyAdd}</p>
          <p className="mt-1 text-[12px] font-normal text-[#737373]">
            {isTr
              ? `${stepLabel} adımı · hızlı ve sektörüne uygun kurulum`
              : `${stepLabel} step · fast setup matched to your sector`}
          </p>
        </div>
      }
    >
      <form onSubmit={handleWizardSubmit} className="space-y-5">
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[#F5F5F5] p-1.5">
          {CREATE_STEPS.map((step, index) => {
            const active = index === createStep;
            const complete = index < createStep;
            return (
              <button
                key={step.tr}
                type="button"
                onClick={() => {
                  if (index <= createStep || canContinueIdentity) {
                    setCreateError('');
                    setCreateStep(index as CreateStep);
                  }
                }}
                className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-2 text-[12px] font-semibold transition-all ${
                  active
                    ? 'bg-white text-[#0A0A0A] shadow-sm'
                    : complete
                      ? 'text-[#0A0A0A]'
                      : 'text-[#737373]'
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                    active || complete ? 'bg-[#C6F24E] text-[#0A0A0A]' : 'bg-white text-[#737373]'
                  }`}
                >
                  {complete ? <Check size={12} strokeWidth={2.4} /> : index + 1}
                </span>
                <span className="truncate">{step[locale]}</span>
              </button>
            );
          })}
        </div>

        {createError && (
          <AlertBanner kind="danger" onDismiss={() => setCreateError('')}>
            {createError}
          </AlertBanner>
        )}

        {createStep === 0 && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C6F24E] text-[#0A0A0A]">
                  <Store size={18} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-[#0A0A0A]">
                    {isTr ? 'İşletme kimliği' : 'Business identity'}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-[1.55] text-[#525252]">
                    {isTr
                      ? 'Panel dili, platformlar ve ilk kurulum önerileri seçtiğin sektöre göre şekillenir.'
                      : 'Panel language, platforms, and setup hints adapt to the sector you choose.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="space-y-2 sm:col-span-2">
                <span className="ml-1 pulse-eyebrow text-[#737373]">
                  {isTr ? 'İşletme adı' : 'Business name'}
                </span>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(event) => onNameChange(event.target.value)}
                  className="bz-input"
                  placeholder={isTr ? 'Örn. Maya Klinik' : 'Ex. Maya Clinic'}
                />
              </label>

              <label className="space-y-2 sm:col-span-2">
                <span className="ml-1 pulse-eyebrow text-[#737373]">URL Slug</span>
                <div
                  className={`flex items-center gap-2 rounded-2xl border bg-white px-4 transition-colors ${
                    formData.slug && !slugValid ? 'border-[#FCA5A5]' : 'border-[#EDEDED] focus-within:border-[#C6F24E]'
                  }`}
                >
                  <span className="shrink-0 font-mono text-[11px] text-[#737373]">buaze.com/r/</span>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(event) => {
                      onFieldChange('slug', event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                      onManualSlug();
                    }}
                    className="min-w-0 w-full bg-transparent py-3.5 text-sm font-medium text-[#0A0A0A] outline-none"
                    placeholder="maya-klinik"
                  />
                </div>
                {formData.slug && !slugValid ? (
                  <p className="ml-1 text-[11.5px] text-[#B91C1C]">
                    {isTr
                      ? 'Slug küçük harf, rakam ve tek tire gruplarından oluşmalı.'
                      : 'Use lowercase letters, numbers, and hyphen groups only.'}
                  </p>
                ) : null}
              </label>
            </div>

            <div className="space-y-2">
              <span className="ml-1 pulse-eyebrow text-[#737373]">
                {isTr ? 'Sektör' : 'Sector'}
              </span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SECTORS.map((sector) => {
                  const active = formData.category === sector.label;
                  return (
                    <button
                      key={sector.id}
                      type="button"
                      onClick={() => onFieldChange('category', sector.label)}
                      className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-all ${
                        active
                          ? 'border-[#C6F24E] bg-[#F7FAEF] shadow-[0_10px_30px_-24px_rgba(10,10,10,0.35)]'
                          : 'border-[#EDEDED] bg-white hover:border-[#C6F24E]/70'
                      }`}
                    >
                      <span className={`mt-0.5 h-3 w-3 shrink-0 rounded-full ${active ? 'bg-[#C6F24E]' : 'bg-[#E5E5E5]'}`} />
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold text-[#0A0A0A]">
                          {sector.display[locale]}
                        </span>
                        <span className="mt-1 block text-[11.5px] leading-[1.45] text-[#737373]">
                          {sector.sub[locale]}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {createStep === 1 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#EAF9B8] bg-[#F7FAEF] p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C6F24E] text-[#0A0A0A]">
                  {isClinic ? <ShieldCheck size={18} strokeWidth={2} /> : <MapPin size={18} strokeWidth={2} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-[#0A0A0A]">
                    {isClinic
                      ? isTr ? 'Klinik yorum kanalları' : 'Clinic review channels'
                      : isTr ? 'Yorum ve sipariş kanalları' : 'Review and order channels'}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-[1.55] text-[#525252]">
                    {isClinic
                      ? isTr
                        ? 'Klinikler için Google ve Yandex görünür; yemek sipariş platformları bu kurulumda gizlenir.'
                        : 'Clinics show Google and Yandex; food delivery platforms stay hidden in this setup.'
                      : isTr
                        ? 'Google önerilir. Yemek platformlarını şimdi ekleyebilir veya sonradan bağlayabilirsin.'
                        : 'Google is recommended. Add food platforms now or connect them later.'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {Array.from(allowedPlatforms).map((platform) => (
                      <PlatformChip key={platform} id={platform} size={20} withLabel />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {platformInputs.map((input) => {
              const isGoogle = input.id === 'google';
              const field = input.field as CreateFormField;
              return (
                <div
                  key={input.id}
                  className={
                    isGoogle
                      ? 'rounded-2xl border-2 border-[#C6F24E]/60 bg-gradient-to-br from-[#C6F24E]/15 via-[#F7FAEF] to-white p-4 shadow-sm'
                      : 'rounded-2xl border border-[#EDEDED] bg-white p-4'
                  }
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${isGoogle ? 'bg-[#C6F24E]' : 'bg-[#F5F5F5]'}`}>
                        <MapPin size={15} strokeWidth={2} className="text-[#0A0A0A]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#0A0A0A]">
                          {input.label}
                          {isGoogle ? <span className="ml-1 text-[#A8D62E]">{isTr ? 'önerilir' : 'recommended'}</span> : null}
                        </p>
                        <p className="mt-0.5 text-[11.5px] leading-snug text-[#737373]">
                          {isGoogle
                            ? isTr
                              ? 'Place ID, Maps linki veya doğrudan yorum linki kabul edilir.'
                              : 'Place ID, Maps link, or direct review URL all work.'
                            : isTr
                              ? 'Boş bırakabilirsin; sonradan Platform Bağlantıları ekranından eklenir.'
                              : 'Optional now; you can add it later from Platform Links.'}
                        </p>
                      </div>
                    </div>
                    {isGoogle ? (
                      <button
                        type="button"
                        onClick={() => setShowGoogleInfo((current) => !current)}
                        className="bz-btn-icon shrink-0"
                        aria-label="Info"
                      >
                        <Info size={15} strokeWidth={2} />
                      </button>
                    ) : null}
                  </div>

                  {isGoogle && showGoogleInfo ? (
                    <div className="mb-3 rounded-xl border border-[#EDEDED] bg-white p-3.5 text-[12px] leading-relaxed text-[#525252]">
                      <p className="pulse-eyebrow mb-2 text-[#0A0A0A]">
                        {isTr ? 'Nasıl alınır?' : 'How to get it?'}
                      </p>
                      <ol className="ml-4 list-decimal space-y-1">
                        <li>{isTr ? "Google Haritalar'da işletmeni aç." : 'Open your business on Google Maps.'}</li>
                        <li>{isTr ? 'Paylaş bağlantısını kopyala veya Place ID kullan.' : 'Copy the share link or use the Place ID.'}</li>
                        <li>{isTr ? 'Buraya yapıştır; Buaze doğru yorum URL’sini üretir.' : 'Paste it here; Buaze builds the correct review URL.'}</li>
                      </ol>
                    </div>
                  ) : null}

                  <input
                    type={isGoogle ? 'text' : 'url'}
                    value={formData[field]}
                    onChange={(event) => onFieldChange(field, event.target.value)}
                    placeholder={isTr ? input.placeholder : input.placeholder.replace('veya', 'or')}
                    className="bz-input"
                  />
                </div>
              );
            })}
          </div>
        )}

        {createStep === 2 && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              <label className="space-y-2">
                <span className="ml-1 pulse-eyebrow text-[#737373]">
                  {isTr ? 'Bildirim e-postası' : 'Notification email'}
                </span>
                <input
                  type="email"
                  value={formData.notificationEmail}
                  onChange={(event) => onFieldChange('notificationEmail', event.target.value)}
                  className="bz-input"
                />
              </label>

              <label className="space-y-2">
                <span className="ml-1 pulse-eyebrow text-[#737373]">
                  {isTr ? 'Adres' : 'Address'}
                </span>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(event) => onFieldChange('address', event.target.value)}
                  className="bz-input"
                  placeholder={isClinic && isTr ? 'Klinik adresi' : undefined}
                />
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="ml-1 pulse-eyebrow text-[#737373]">
                    {isTr ? 'Telefon' : 'Phone'}
                  </span>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(event) => onFieldChange('phone', event.target.value)}
                    className="bz-input"
                  />
                </label>

                <label className="space-y-2">
                  <span className="ml-1 pulse-eyebrow text-[#737373]">
                    {isTr ? 'Tema rengi' : 'Theme color'}
                  </span>
                  <div className="flex h-[46px] items-center gap-3 rounded-2xl border border-[#EDEDED] bg-white px-4">
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(event) => onFieldChange('primaryColor', event.target.value)}
                      className="h-9 w-11 cursor-pointer rounded-xl border-0 bg-transparent"
                    />
                    <span className="font-mono text-sm text-[#0A0A0A]">{formData.primaryColor}</span>
                  </div>
                </label>
              </div>
            </div>

            <aside className="rounded-2xl border border-[#EDEDED] bg-[#0A0A0A] p-4 text-white">
              <div className="flex items-center justify-between gap-3">
                <span className="pulse-eyebrow text-white/60">
                  {isTr ? 'PANEL ÖNİZLEME' : 'PANEL PREVIEW'}
                </span>
                <Sparkles size={15} className="text-[#C6F24E]" />
              </div>
              <div className="mt-5 flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-[16px] font-semibold text-[#0A0A0A]"
                  style={{ background: formData.primaryColor || '#C6F24E' }}
                >
                  {(formData.name || 'B').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-semibold">{formData.name || (isTr ? 'Yeni işletme' : 'New business')}</p>
                  <p className="mt-1 text-[12px] text-white/55">
                    {selectedSector?.display[locale] ?? formData.category}
                  </p>
                </div>
              </div>
              <div className="mt-5 space-y-2 rounded-2xl bg-white/8 p-3">
                <div className="flex items-center justify-between gap-2 text-[12px]">
                  <span className="text-white/55">{isClinic ? (isTr ? 'Hasta geri bildirimi' : 'Patient feedback') : (isTr ? 'Yorum akışı' : 'Review flow')}</span>
                  <span className="font-semibold text-[#C6F24E]">{isTr ? 'Hazır' : 'Ready'}</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-[12px]">
                  <span className="text-white/55">{isTr ? 'Public URL' : 'Public URL'}</span>
                  <span className="truncate font-mono text-white">/r/{formData.slug || 'slug'}</span>
                </div>
              </div>
              <p className="mt-4 text-[12px] leading-[1.55] text-white/60">
                {isClinic
                  ? isTr
                    ? 'Klinik modu; hasta deneyimi, KVKK hassasiyeti ve sektör platformlarıyla açılır.'
                    : 'Clinic mode opens with patient-experience wording, privacy sensitivity, and sector platforms.'
                  : isTr
                    ? 'Oluşturunca bu işletme aktif seçilir ve panele bu kapsamla dönersin.'
                    : 'After creation this business becomes active and the panel opens in that scope.'}
              </p>
            </aside>
          </div>
        )}

        <div className="sticky bottom-0 -mx-6 flex flex-col gap-2 border-t border-[#EDEDED] bg-white/95 px-6 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={onClose} className="bz-btn-ghost order-2 sm:order-1">
            {isTr ? 'İptal' : 'Cancel'}
          </button>
          <div className="order-1 flex gap-2 sm:order-2">
            {createStep > 0 ? (
              <button
                type="button"
                onClick={() => setCreateStep((createStep - 1) as CreateStep)}
                className="bz-btn-ghost flex-1 sm:flex-none"
              >
                <ArrowLeft size={14} strokeWidth={2} />
                {isTr ? 'Geri' : 'Back'}
              </button>
            ) : null}
            {createStep < 2 ? (
              <button
                type="submit"
                disabled={createStep === 0 && !canContinueIdentity}
                className="bz-btn-primary flex-1 disabled:opacity-50 sm:flex-none"
              >
                {isTr ? 'Devam' : 'Continue'}
                <ArrowRight size={14} strokeWidth={2} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={creating || !canContinueIdentity}
                className="bz-btn-primary flex-1 disabled:opacity-60 sm:flex-none"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Palette size={14} strokeWidth={2} />}
                {copyAdd}
              </button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}
