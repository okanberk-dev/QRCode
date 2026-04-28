'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ExternalLink, Info, Loader2, MapPin, Plus, Search, Store } from 'lucide-react';
import CopyUrlButton from '@/components/dashboard/CopyUrlButton';
import { AlertBanner, Badge, EmptyState, ErrorState, Modal, PageHeader, Tabs, type TabItem } from '@/components/ui';

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

export default function DashboardRestaurantsPage() {
  const params = useParams();
  const locale = params.locale === 'en' ? 'en' : 'tr';
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'all' | 'passive'>('active');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [createError, setCreateError] = useState('');
  const [notice, setNotice] = useState<{ kind: 'success' | 'danger'; text: string } | null>(null);
  const [isManualSlug, setIsManualSlug] = useState(false);
  const [showGoogleInfo, setShowGoogleInfo] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    category: 'Restoran',
    notificationEmail: '',
    googlePlaceId: '',
    getirYemekUrl: '',
    yemekSepetiUrl: '',
    trendyolYemekUrl: '',
    address: '',
    phone: '',
    primaryColor: '#C6F24E',
  });

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
      }
    : {
        title: 'My Locations',
        subtitle: 'Manage your restaurants, branches, or stores from one panel.',
        add: 'New Location',
        emptyTitle: 'No location yet',
        emptyText: 'Create your first location to start collecting feedback.',
        manage: 'Manage',
        qr: 'QR Code',
        category: 'Category',
        reviews: 'Reviews',
        search: 'Search locations',
        active: 'Active',
        all: 'All',
        inactive: 'Disabled',
        inactiveEmptyTitle: 'No disabled location',
        inactiveEmptyText: 'Disabled locations appear here. You can reactivate them from this list.',
        activate: 'Reactivate',
        deactivate: 'Disable',
        activeStatus: 'Active',
        inactiveStatus: 'Disabled',
      };

  const fetchRestaurants = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const response = await fetch(`/api/restaurants?status=${statusFilter}`);
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
    fetchRestaurants();
  }, [statusFilter]);

  useEffect(() => {
    // Fetch user profile to default the notification email
    fetch('/api/user/profile')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.email) {
          setUserEmail(data.email);
          setFormData((prev) => ({ ...prev, notificationEmail: data.email }));
        }
      })
      .catch(console.error);
  }, []);

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
      setFormData({
        name: '',
        slug: '',
        category: 'Restoran',
        notificationEmail: userEmail,
        googlePlaceId: '',
        getirYemekUrl: '',
        yemekSepetiUrl: '',
        trendyolYemekUrl: '',
        address: '',
        phone: '',
        primaryColor: '#C6F24E',
      });
      setIsManualSlug(false);
      fetchRestaurants();
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

  const filtered = restaurants.filter(
    (r) =>
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.category.toLowerCase().includes(searchTerm.toLowerCase()),
  );
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
        eyebrow={locale === 'tr' ? 'KONUMLAR' : 'LOCATIONS'}
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

      <div className="bz-card flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          items={statusTabs}
          active={statusFilter}
          onChange={(id) => setStatusFilter(id as 'active' | 'all' | 'passive')}
          ariaLabel={locale === 'tr' ? 'İşletme durum filtresi' : 'Location status filter'}
          className="overflow-x-auto"
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
              active: { bg: 'bg-[#EAF9B8]', fg: 'text-[#0A0A0A]', label: locale === 'tr' ? '↑ CANLI' : '↑ LIVE' },
              new: { bg: 'bg-[#F5F5F5]', fg: 'text-[#525252]', label: locale === 'tr' ? '→ YENİ' : '→ NEW' },
              inactive: { bg: 'bg-[#FEF2F2]', fg: 'text-[#991B1B]', label: locale === 'tr' ? '· DEVRE DIŞI' : '· DISABLED' },
            }[trend];
            return (
              <div
                key={restaurant.id}
                className={`overflow-hidden bz-card transition-colors ${!restaurant.isActive ? 'border-[#FECACA] bg-[#FFFBFB]' : 'hover:border-[#C6F24E]'}`}
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

                  {/* Full-width "Detay aç" pill — matches AdminLocations §741 */}
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Link
                      href={`/${locale}/dashboard/restaurants/${restaurant.id}`}
                      className="rounded-full bg-[#FAFAFA] border border-[#EDEDED] px-4 py-2.5 text-center text-[12px] font-medium text-[#525252] hover:bg-[#0A0A0A] hover:text-white hover:border-[#0A0A0A] transition-colors"
                    >
                      {locale === 'tr' ? 'Detay aç' : 'Open details'} →
                    </Link>
                    <Link
                      href={`/${locale}/dashboard/qr?restaurant=${restaurant.id}`}
                      className="rounded-full border border-[#0A0A0A] px-4 py-2.5 text-center text-[12px] font-medium text-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white transition-colors"
                    >
                    {copy.qr}
                  </Link>
                  <button
                    type="button"
                    disabled={actionLoadingId === restaurant.id}
                    onClick={() => toggleActive(restaurant.id, restaurant.isActive)}
                    className={`rounded-full px-4 py-2.5 text-center text-[12px] font-medium transition-colors disabled:opacity-60 ${
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
                    className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#EDEDED] bg-white px-4 py-2.5 text-[12px] font-medium text-[#0A0A0A] hover:border-[#C6F24E] transition-colors"
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
        <Modal
          size={680}
          onClose={() => { setShowCreateModal(false); setCreateError(''); }}
          title={copy.add}
        >
            <form onSubmit={handleCreate} className="space-y-5">
              {createError && (
                <AlertBanner kind="danger" onDismiss={() => setCreateError('')}>
                  {createError}
                </AlertBanner>
              )}

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <label className="space-y-2 sm:col-span-2">
                  <span className="ml-1 pulse-eyebrow text-[#737373]">İşletme Adı</span>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(event) => handleNameChange(event.target.value)}
                    className="w-full rounded-xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all focus:border-[#C6F24E]"
                  />
                </label>

                <label className="space-y-2 sm:col-span-2">
                  <span className="ml-1 pulse-eyebrow text-[#737373]">URL Slug</span>
                  <div className="flex items-center gap-2 sm:gap-3 rounded-2xl border border-[#EDEDED] bg-[#FFFFFF] px-3 sm:px-4">
                    <span className="shrink-0 font-mono text-[11px] sm:text-xs text-[#737373]">buaze.com/r/</span>
                    <input
                      type="text"
                      required
                      value={formData.slug}
                      onChange={(event) => {
                        setFormData((prev) => ({ ...prev, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }));
                        setIsManualSlug(true);
                      }}
                      className="min-w-0 w-full bg-transparent py-3.5 sm:py-4 text-sm font-bold text-[#0A0A0A] outline-none"
                    />
                  </div>
                </label>

                {/* ── Google Review Link — emphasized ── */}
                <div className="sm:col-span-2 rounded-2xl border-2 border-[#C6F24E]/50 bg-gradient-to-br from-[#C6F24E]/15 via-[#C6F24E]/8 to-white p-4 sm:p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#C6F24E] shadow-sm">
                        <MapPin size={15} strokeWidth={2} className="text-[#0A0A0A]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[#0A0A0A] leading-tight">
                          {locale === 'tr' ? 'Google yorum bağlantısı' : 'Google review link'}
                          <span className="ml-1 text-[#A8D62E]">*</span>
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#737373] leading-snug">
                          {locale === 'tr' ? 'Olumlu yorumlar bu bağlantıya yönlendirilir' : 'Positive reviews are redirected to this link'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowGoogleInfo((v) => !v)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#EDEDED] bg-white text-[#0A0A0A] transition-all hover:bg-[#C6F24E]/20 active:scale-95"
                      aria-label="Info"
                    >
                      <Info size={15} strokeWidth={2} />
                    </button>
                  </div>

                  {showGoogleInfo && (
                    <div className="mb-3 rounded-xl border border-[#EDEDED] bg-white p-3.5 text-[12px] text-[#525252] leading-relaxed">
                      <p className="pulse-eyebrow mb-2 text-[#0A0A0A]">
                        {locale === 'tr' ? 'Nasıl alınır?' : 'How to get it?'}
                      </p>
                      <ol className="ml-4 list-decimal space-y-1">
                        <li>{locale === 'tr' ? "Google Haritalar'ı açın ve işletmenizi aratın." : 'Open Google Maps and search your business.'}</li>
                        <li>{locale === 'tr' ? 'İşletmeye tıklayın, "Paylaş" butonuna basın.' : 'Click the business, then tap "Share".'}</li>
                        <li>{locale === 'tr' ? 'Bağlantıyı kopyalayın ve aşağıya yapıştırın.' : 'Copy the link and paste it below.'}</li>
                      </ol>
                      <a
                        href="https://www.google.com/maps"
                        target="_blank"
                        rel="noreferrer"
                        className="pulse-eyebrow mt-3 inline-flex items-center gap-1.5 text-[#0A0A0A] underline underline-offset-2"
                      >
                        <ExternalLink size={12} strokeWidth={2} />
                        {locale === 'tr' ? "Google Haritalar'ı Aç" : 'Open Google Maps'}
                      </a>
                    </div>
                  )}

                  <input
                    type="text"
                    value={formData.googlePlaceId}
                    onChange={(event) => setFormData((prev) => ({ ...prev, googlePlaceId: event.target.value }))}
                    placeholder={locale === 'tr' ? 'https://maps.google.com/... veya Place ID' : 'https://maps.google.com/... or Place ID'}
                    className="w-full rounded-xl border border-[#EDEDED] bg-white px-4 py-3.5 text-sm font-bold text-[#0A0A0A] outline-none transition-all placeholder:text-[#6B7280] focus:ring-2 focus:ring-[#C6F24E]"
                  />
                </div>

                <label className="space-y-2 sm:col-span-2">
                  <span className="ml-1 pulse-eyebrow text-[#737373]">Getir Yemek URL</span>
                  <input
                    type="url"
                    value={formData.getirYemekUrl}
                    onChange={(event) => setFormData((prev) => ({ ...prev, getirYemekUrl: event.target.value }))}
                    placeholder="https://getir.com/yemek/..."
                    className="w-full rounded-2xl border border-[#EDEDED] bg-[#FFFFFF] px-4 sm:px-5 py-3.5 sm:py-4 text-sm font-bold text-[#0A0A0A] outline-none transition-all focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E]/40"
                  />
                </label>

                <label className="space-y-2">
                  <span className="ml-1 pulse-eyebrow text-[#737373]">Yemek Sepeti URL</span>
                  <input
                    type="url"
                    value={formData.yemekSepetiUrl}
                    onChange={(event) => setFormData((prev) => ({ ...prev, yemekSepetiUrl: event.target.value }))}
                    placeholder="https://www.yemeksepeti.com/..."
                    className="w-full rounded-2xl border border-[#EDEDED] bg-[#FFFFFF] px-4 sm:px-5 py-3.5 sm:py-4 text-sm font-bold text-[#0A0A0A] outline-none transition-all focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E]/40"
                  />
                </label>

                <label className="space-y-2">
                  <span className="ml-1 pulse-eyebrow text-[#737373]">Trendyol Yemek URL</span>
                  <input
                    type="url"
                    value={formData.trendyolYemekUrl}
                    onChange={(event) => setFormData((prev) => ({ ...prev, trendyolYemekUrl: event.target.value }))}
                    placeholder="https://www.trendyol.com/..."
                    className="w-full rounded-2xl border border-[#EDEDED] bg-[#FFFFFF] px-4 sm:px-5 py-3.5 sm:py-4 text-sm font-bold text-[#0A0A0A] outline-none transition-all focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E]/40"
                  />
                </label>

                <label className="space-y-2">
                  <span className="ml-1 pulse-eyebrow text-[#737373]">Kategori</span>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(event) => setFormData((prev) => ({ ...prev, category: event.target.value }))}
                    className="w-full rounded-xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all focus:border-[#C6F24E]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="ml-1 pulse-eyebrow text-[#737373]">Bildirim E-postası</span>
                  <input
                    type="email"
                    value={formData.notificationEmail}
                    onChange={(event) => setFormData((prev) => ({ ...prev, notificationEmail: event.target.value }))}
                    className="w-full rounded-xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all focus:border-[#C6F24E]"
                  />
                </label>

                <label className="space-y-2 sm:col-span-2">
                  <span className="ml-1 pulse-eyebrow text-[#737373]">Adres</span>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(event) => setFormData((prev) => ({ ...prev, address: event.target.value }))}
                    className="w-full rounded-xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all focus:border-[#C6F24E]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="ml-1 pulse-eyebrow text-[#737373]">Telefon</span>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
                    className="w-full rounded-xl border border-[#EDEDED] bg-white px-4 py-3 text-[14px] text-[#0A0A0A] outline-none transition-all focus:border-[#C6F24E]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="ml-1 pulse-eyebrow text-[#737373]">Tema Rengi</span>
                  <div className="flex h-[54px] items-center gap-3 rounded-2xl border border-[#EDEDED] bg-[#FFFFFF] px-4">
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(event) => setFormData((prev) => ({ ...prev, primaryColor: event.target.value }))}
                      className="h-10 w-12 cursor-pointer rounded-xl border-0 bg-transparent"
                    />
                    <span className="font-mono text-sm text-[#0A0A0A]">{formData.primaryColor}</span>
                  </div>
                </label>
              </div>

              <div className="flex flex-col gap-2 border-t border-[#EDEDED] pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-full border border-[#EDEDED] bg-white px-5 py-2.5 text-[13px] font-medium text-[#0A0A0A] hover:border-[#0A0A0A] transition-colors"
                >
                  {locale === 'tr' ? 'İptal' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#0A0A0A] px-5 py-2.5 text-[13px] font-medium text-white hover:bg-[#1A1A1A] disabled:opacity-60 transition-colors"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus size={14} strokeWidth={2} />}
                  {copy.add}
                </button>
              </div>
            </form>
        </Modal>
      )}
    </div>
  );
}
