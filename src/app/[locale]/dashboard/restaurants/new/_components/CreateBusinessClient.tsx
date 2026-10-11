'use client';

// Dedicated "Yeni İşletme" creation page (replaces the old in-list modal).
// Same 3-step wizard (Identity → Channels → Preview) rendered inline on its
// own route, plus a Google Places search box in the Channels step so the owner
// can find their business and auto-fill the Google review link instead of
// hunting for a Place ID. (CLAUDE.md §42.3 narrow form tier)

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  Info,
  Loader2,
  MapPin,
  Palette,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  X,
} from 'lucide-react';
import { AlertBanner, PlatformChip } from '@/components/ui';
import { getSectorPlatforms } from '@/lib/sector-platforms';
import { getSectorByLabel, SECTORS } from '@/lib/sectors';
import { ACTIVE_BUSINESS_STORAGE_KEY } from '@/lib/active-business';
import { isValidBusinessSlug } from '@/lib/create-business-wizard';
import {
  checkProviderUrl,
  describeDomainError,
  PROVIDER_DOMAINS,
  PROVIDER_LABELS,
  type DomainCheckReason,
  type IntegrationProvider,
} from '@/lib/integration-domains';
import type { Locale } from '@/lib/translations';

interface Props {
  locale: Locale;
  initialNotificationEmail: string;
}

type CreateStep = 0 | 1 | 2;

const CREATE_STEPS = [
  { tr: 'Kimlik', en: 'Identity' },
  { tr: 'Kanallar', en: 'Channels' },
  { tr: 'Önizleme', en: 'Preview' },
] as const;

const PLATFORM_INPUTS = [
  { id: 'google', field: 'googlePlaceId', label: 'Google', placeholder: 'https://maps.google.com/... veya Place ID' },
  { id: 'yandex', field: 'yandexUrl', label: 'Yandex', placeholder: 'https://yandex.com/maps/...' },
  { id: 'getir', field: 'getirYemekUrl', label: 'Getir Yemek', placeholder: 'https://getir.com/yemek/...' },
  { id: 'yemeksepeti', field: 'yemekSepetiUrl', label: 'Yemeksepeti', placeholder: 'https://www.yemeksepeti.com/...' },
  { id: 'trendyol', field: 'trendyolYemekUrl', label: 'Trendyol Yemek', placeholder: 'https://www.trendyol.com/...' },
  { id: 'tripadvisor', field: 'tripAdvisorUrl', label: 'Tripadvisor', placeholder: 'https://www.tripadvisor.com/...' },
  { id: 'booking', field: 'bookingUrl', label: 'Booking', placeholder: 'https://www.booking.com/...' },
  { id: 'airbnb', field: 'airbnbUrl', label: 'Airbnb', placeholder: 'https://www.airbnb.com/...' },
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

// Platform link fields → provider used by the shared URL check. Google is
// keyed on both names: the form field is `googlePlaceId`, the API reports
// errors on `googleReviewUrl` (it accepts a Place ID or a link).
const PLATFORM_FIELD_PROVIDER: Partial<Record<string, IntegrationProvider>> = {
  googlePlaceId: 'google',
  googleReviewUrl: 'google',
  yemekSepetiUrl: 'yemeksepeti',
  getirYemekUrl: 'getir',
  trendyolYemekUrl: 'trendyol_go',
  tripAdvisorUrl: 'tripadvisor',
  airbnbUrl: 'airbnb',
  bookingUrl: 'booking',
  yandexUrl: 'yandex',
};

// Which wizard step owns each field — a server error jumps back there.
const FIELD_STEP: Partial<Record<string, CreateStep>> = {
  name: 0,
  slug: 0,
  category: 0,
  notificationEmail: 2,
  address: 2,
  phone: 2,
  primaryColor: 2,
};

const FIELD_LABEL: Partial<Record<string, { tr: string; en: string }>> = {
  name: { tr: 'İşletme adı', en: 'Business name' },
  slug: { tr: 'Sayfa adresi', en: 'URL slug' },
  category: { tr: 'Sektör', en: 'Sector' },
  notificationEmail: { tr: 'Bildirim e-postası', en: 'Notification email' },
  address: { tr: 'Adres', en: 'Address' },
  phone: { tr: 'Telefon', en: 'Phone' },
  primaryColor: { tr: 'Tema rengi', en: 'Theme color' },
};

/** Hard-error URL check for the non-Google platform fields (Google accepts a
 *  bare Place ID, which the server normalises). */
function findPlatformLinkErrors(form: CreateFormData, locale: Locale): Partial<Record<CreateFormField, string>> {
  const errors: Partial<Record<CreateFormField, string>> = {};
  for (const input of PLATFORM_INPUTS) {
    if (input.id === 'google') continue;
    const value = form[input.field as CreateFormField];
    const provider = PLATFORM_FIELD_PROVIDER[input.field];
    if (!provider || !value.trim()) continue;
    const result = checkProviderUrl(provider, value);
    if (!result.ok && result.severity === 'error') {
      errors[input.field as CreateFormField] = describeDomainError(provider, result, locale === 'en' ? 'en' : 'tr');
    }
  }
  return errors;
}

interface PlaceResult {
  placeId: string;
  displayName: string;
  formattedAddress: string | null;
}

function slugify(name: string): string {
  return name
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
}

export default function CreateBusinessClient({ locale, initialNotificationEmail }: Props) {
  const isTr = locale === 'tr';
  const router = useRouter();

  const [formData, setFormData] = useState<CreateFormData>(() => createEmptyForm(initialNotificationEmail));
  const [createStep, setCreateStep] = useState<CreateStep>(0);
  const [isManualSlug, setIsManualSlug] = useState(false);
  const [showGoogleInfo, setShowGoogleInfo] = useState(false);
  const [createError, setCreateError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<CreateFormField, string>>>({});
  const [creating, setCreating] = useState(false);

  // Google Places search (Channels step)
  const [placeQuery, setPlaceQuery] = useState('');
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState<string | null>(null);
  const [placeResults, setPlaceResults] = useState<PlaceResult[] | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);

  const slugValid = isValidBusinessSlug(formData.slug);
  const canContinueIdentity = formData.name.trim().length > 1 && slugValid;
  const selectedSector = getSectorByLabel(formData.category);
  const isClinic = selectedSector?.sectorKey === 'clinic';
  const allowedPlatforms = useMemo(() => getSectorPlatforms(formData.category), [formData.category]);
  const platformInputs = PLATFORM_INPUTS.filter((input) =>
    allowedPlatforms.has(input.id as Parameters<typeof allowedPlatforms.has>[0]),
  );
  const googleAllowed = allowedPlatforms.has('google');
  const stepLabel = CREATE_STEPS[createStep][locale];

  const handleNameChange = (name: string) => {
    if (isManualSlug) {
      setFormData((prev) => ({ ...prev, name }));
      return;
    }
    setFormData((prev) => ({ ...prev, name, slug: slugify(name) }));
  };

  const setFormField = (field: CreateFormField, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Block on wrong-domain / malformed platform links before leaving the
  // Channels step (or submitting after jumping ahead via the step tabs).
  const platformLinksValid = (): boolean => {
    const errors = findPlatformLinkErrors(formData, locale);
    if (Object.keys(errors).length === 0) return true;
    setFieldErrors((prev) => ({ ...prev, ...errors }));
    setCreateStep(1);
    setCreateError(
      isTr
        ? 'Bazı platform bağlantıları hatalı. İşaretli alanları düzelt.'
        : 'Some platform links are invalid. Fix the highlighted fields.',
    );
    return false;
  };

  // Turn an API error into owner-facing text, and jump to the step that holds
  // the offending field. The API returns field names / codes, not copy.
  const applyServerError = (status: number, data: Record<string, unknown> | null) => {
    const code = typeof data?.code === 'string' ? data.code : '';
    const lang = isTr ? 'tr' : 'en';

    if (code === 'INVALID_PLATFORM_URL') {
      const match = typeof data?.error === 'string' ? /^(\w+)\s+geçersiz:\s+(\w+)/.exec(data.error) : null;
      const apiField = match?.[1] ?? '';
      const reason = (match?.[2] ?? 'invalid_url') as DomainCheckReason;
      const provider = PLATFORM_FIELD_PROVIDER[apiField];
      const formField = (apiField === 'googleReviewUrl' ? 'googlePlaceId' : apiField) as CreateFormField;
      const message = provider
        ? describeDomainError(
            provider,
            { ok: false, severity: 'error', reason, expected: PROVIDER_DOMAINS[provider] ?? undefined },
            lang,
          )
        : isTr ? 'Bağlantı geçersiz.' : 'The link is invalid.';
      if (provider && formField in formData) setFieldErrors((prev) => ({ ...prev, [formField]: message }));
      setCreateStep(1);
      // The field itself shows the detailed reason; the banner names it.
      setCreateError(
        provider
          ? isTr
            ? `${PROVIDER_LABELS[provider]} bağlantısı geçersiz. İşaretli alanı düzelt.`
            : `The ${PROVIDER_LABELS[provider]} link is invalid. Fix the highlighted field.`
          : isTr ? 'Platform bağlantılarından biri geçersiz.' : 'One of the platform links is invalid.',
      );
      return;
    }

    if (data?.error === 'validation_error') {
      const issues = Array.isArray(data.issues) ? (data.issues as Array<{ path?: string }>) : [];
      const field = String(issues[0]?.path ?? '').split('.')[0];
      const provider = PLATFORM_FIELD_PROVIDER[field];
      const label = provider ? PROVIDER_LABELS[provider] : FIELD_LABEL[field]?.[lang];
      setCreateStep(provider ? 1 : FIELD_STEP[field] ?? createStep);
      setCreateError(
        label
          ? isTr
            ? `${label} alanı geçersiz ya da çok uzun. Kontrol edip tekrar dene.`
            : `${label} is invalid or too long. Check it and try again.`
          : isTr
            ? 'Bazı alanlar geçersiz. Kontrol edip tekrar dene.'
            : 'Some fields are invalid. Check them and try again.',
      );
      return;
    }

    if (code === 'INVALID_PRIMARY_COLOR') {
      setCreateStep(2);
      setCreateError(isTr ? 'Tema rengi geçersiz. Renk seçiciden bir renk seç.' : 'The theme color is invalid. Pick a color.');
      return;
    }
    if (code === 'INVALID_NOTIFICATION_EMAIL') {
      setCreateStep(2);
      setFieldErrors((prev) => ({
        ...prev,
        notificationEmail: isTr ? 'Geçerli bir e-posta adresi gir.' : 'Enter a valid email address.',
      }));
      setCreateError(isTr ? 'Bildirim e-postası geçersiz.' : 'The notification email is invalid.');
      return;
    }
    if (status === 409) {
      setCreateStep(0);
      setCreateError(
        isTr
          ? `buaze.com/r/${formData.slug} adresi başka bir işletmede kullanılıyor. Farklı bir sayfa adresi seç.`
          : `buaze.com/r/${formData.slug} is already taken. Choose a different URL slug.`,
      );
      return;
    }
    if (status === 403) {
      setCreateError(
        isTr ? 'Bu hesapla yeni işletme oluşturamazsın.' : 'This account cannot create businesses.',
      );
      return;
    }
    setCreateError(
      isTr ? 'İşletme oluşturulamadı. Tekrar dene.' : 'Could not create the business. Please try again.',
    );
  };

  async function runPlacesSearch() {
    const query = placeQuery.trim();
    if (query.length < 2) return;
    setPlacesLoading(true);
    setPlacesError(null);
    try {
      const res = await fetch('/api/google/places/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, locale }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPlaceResults(null);
        if (data?.code === 'GOOGLE_PLACES_NOT_CONFIGURED') {
          setPlacesError(
            isTr
              ? 'Google arama şu an kullanılamıyor. Aşağıdaki alana Place ID veya yorum linkini elle yapıştırabilirsin.'
              : 'Google search is unavailable. Paste a Place ID or review link manually below.',
          );
        } else {
          setPlacesError(
            data?.error || (isTr ? 'Arama başarısız oldu.' : 'Search failed.'),
          );
        }
        return;
      }
      const places: PlaceResult[] = Array.isArray(data?.places) ? data.places : [];
      setPlaceResults(places);
      if (places.length === 0) {
        setPlacesError(
          isTr ? 'Sonuç bulunamadı. Farklı bir arama dene.' : 'No results. Try a different search.',
        );
      }
    } catch {
      setPlaceResults(null);
      setPlacesError(isTr ? 'Bağlantı hatası.' : 'Connection error.');
    } finally {
      setPlacesLoading(false);
    }
  }

  function selectPlace(place: PlaceResult) {
    setSelectedPlace(place);
    setPlaceResults(null);
    setPlacesError(null);
    setFormData((prev) => {
      const next = { ...prev, googlePlaceId: place.placeId };
      // Convenience prefill — only fill empties so we never overwrite the
      // owner's own input.
      if (!prev.name.trim() && place.displayName) {
        next.name = place.displayName;
        if (!isManualSlug) next.slug = slugify(place.displayName);
      }
      if (!prev.address.trim() && place.formattedAddress) {
        next.address = place.formattedAddress;
      }
      return next;
    });
  }

  function clearSelectedPlace() {
    setSelectedPlace(null);
    setFormField('googlePlaceId', '');
  }

  const continueTo = (step: CreateStep) => {
    if (createStep === 0 && !canContinueIdentity) {
      setCreateError(
        isTr ? 'İşletme adı ve geçerli sayfa adresi alanlarını doldurun.' : 'Add a business name and valid URL slug.',
      );
      return;
    }
    if (createStep === 1 && !platformLinksValid()) return;
    setCreateError('');
    setCreateStep(step);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    if (createStep < 2) {
      event.preventDefault();
      continueTo((createStep + 1) as CreateStep);
      return;
    }
    event.preventDefault();
    if (!platformLinksValid()) return;
    setCreating(true);
    setCreateError('');
    try {
      const response = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, googleReviewUrl: formData.googlePlaceId }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        applyServerError(response.status, data);
        return;
      }
      if (typeof data?.id === 'string' && typeof window !== 'undefined') {
        window.localStorage.setItem(ACTIVE_BUSINESS_STORAGE_KEY, data.id);
      }
      router.push(
        typeof data?.id === 'string'
          ? `/${locale}/dashboard?restaurantId=${data.id}`
          : `/${locale}/dashboard/restaurants`,
      );
      router.refresh();
    } catch {
      setCreateError(isTr ? 'Bağlantı hatası oluştu.' : 'Connection error.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-[920px] px-4 sm:px-7 py-6 lg:py-8">
      <Link
        href={`/${locale}/dashboard/restaurants`}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#737373] transition-colors hover:text-[#0A0A0A]"
      >
        <ArrowLeft size={15} strokeWidth={2} />
        {isTr ? 'İşletmelere dön' : 'Back to businesses'}
      </Link>

      <div className="mt-4">
        <p className="pulse-eyebrow text-[#737373]">{isTr ? 'YENİ İŞLETME' : 'NEW BUSINESS'}</p>
        <h1 className="mt-1 text-[26px] sm:text-[30px] font-semibold tracking-[-0.025em] text-[#0A0A0A] bz-h-tight">
          {isTr ? 'İşletme oluştur' : 'Create a business'}
        </h1>
        <p className="mt-1.5 text-[13px] leading-[1.55] text-[#525252]">
          {isTr
            ? `${stepLabel} adımı · hızlı ve sektörüne uygun kurulum`
            : `${stepLabel} step · fast setup matched to your sector`}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        {/* Step indicator */}
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
                  active ? 'bg-white text-[#0A0A0A] shadow-sm' : complete ? 'text-[#0A0A0A]' : 'text-[#737373]'
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

        {/* STEP 0 — Identity */}
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
              <label className="flex flex-col gap-2 sm:col-span-2">
                <span className="ml-1 pulse-eyebrow text-[#737373]">{isTr ? 'İşletme adı' : 'Business name'}</span>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(event) => handleNameChange(event.target.value)}
                  className="bz-input"
                  placeholder={isTr ? 'Örn. Maya Klinik' : 'Ex. Maya Clinic'}
                />
              </label>

              <label className="flex flex-col gap-2 sm:col-span-2">
                <span className="ml-1 pulse-eyebrow text-[#737373]">{isTr ? 'Sayfa adresi' : 'URL Slug'}</span>
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
                      setFormField('slug', event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                      setIsManualSlug(true);
                    }}
                    // 16px below sm stops iOS Safari zooming into the field.
                    className="min-w-0 w-full bg-transparent py-3.5 text-[16px] sm:text-[14px] font-medium text-[#0A0A0A] outline-none"
                    placeholder="maya-klinik"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </div>
                {formData.slug && !slugValid ? (
                  <p className="ml-1 text-[11.5px] text-[#B91C1C]">
                    {isTr
                      ? 'Adres yalnız küçük harf, rakam ve tire içerebilir.'
                      : 'Use lowercase letters, numbers, and hyphen groups only.'}
                  </p>
                ) : null}
              </label>
            </div>

            <div className="space-y-2">
              <span className="ml-1 pulse-eyebrow text-[#737373]">{isTr ? 'Sektör' : 'Sector'}</span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SECTORS.map((sector) => {
                  const active = formData.category === sector.label;
                  return (
                    <button
                      key={sector.id}
                      type="button"
                      onClick={() => setFormField('category', sector.label)}
                      className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-all ${
                        active
                          ? 'border-[#C6F24E] bg-[#F7FAEF] shadow-[0_10px_30px_-24px_rgba(10,10,10,0.35)]'
                          : 'border-[#EDEDED] bg-white hover:border-[#C6F24E]/70'
                      }`}
                    >
                      <span className={`mt-0.5 h-3 w-3 shrink-0 rounded-full ${active ? 'bg-[#C6F24E]' : 'bg-[#E5E5E5]'}`} />
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold text-[#0A0A0A]">{sector.display[locale]}</span>
                        <span className="mt-1 block text-[11.5px] leading-[1.45] text-[#737373]">{sector.sub[locale]}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 1 — Channels (with Google Places search) */}
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
                        ? 'Google önerilir. İşletmeni aşağıdan arayıp tek tıkla bağlayabilirsin.'
                        : 'Google is recommended. Search your business below and link it in one click.'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {Array.from(allowedPlatforms).map((platform) => (
                      <PlatformChip key={platform} id={platform} size={20} withLabel />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Google Places search panel */}
            {googleAllowed && (
              <div className="rounded-2xl border-2 border-[#C6F24E]/60 bg-gradient-to-br from-[#C6F24E]/15 via-[#F7FAEF] to-white p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#C6F24E]">
                      <Search size={15} strokeWidth={2} className="text-[#0A0A0A]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#0A0A0A]">
                        {isTr ? "Google'da işletmeni ara" : 'Find your business on Google'}
                        <span className="ml-1 text-[#A8D62E]">{isTr ? 'önerilir' : 'recommended'}</span>
                      </p>
                      <p className="mt-0.5 text-[11.5px] leading-snug text-[#737373]">
                        {isTr
                          ? 'İşletme adını yaz, listeden seç; yorum linkini biz oluştururuz.'
                          : 'Type your name, pick from the list; we build the review link.'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGoogleInfo((v) => !v)}
                    className="bz-btn-icon shrink-0"
                    aria-label={isTr ? 'Google araması hakkında ipucu' : 'Tip about Google search'}
                    aria-expanded={showGoogleInfo}
                  >
                    <Info size={15} strokeWidth={2} />
                  </button>
                </div>

                {showGoogleInfo && (
                  <div className="mb-3 rounded-xl border border-[#EDEDED] bg-white p-3.5 text-[12px] leading-relaxed text-[#525252]">
                    <p className="pulse-eyebrow mb-2 text-[#0A0A0A]">{isTr ? 'İpucu' : 'Tip'}</p>
                    <ul className="ml-4 list-disc space-y-1">
                      <li>{isTr ? 'İşletme adını + şehir yazarsan sonuç daha isabetli olur.' : 'Add the city for more accurate results.'}</li>
                      <li>{isTr ? 'Bulamazsan Place ID veya yorum linkini elle yapıştırabilirsin.' : 'Not found? Paste the Place ID or review link manually.'}</li>
                    </ul>
                  </div>
                )}

                {/* Selected place chip */}
                {selectedPlace ? (
                  <div className="flex items-start justify-between gap-3 rounded-xl border border-[#C6F24E] bg-white p-3">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#C6F24E]">
                        <Check size={13} strokeWidth={2.5} className="text-[#0A0A0A]" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-[#0A0A0A]">{selectedPlace.displayName}</p>
                        {selectedPlace.formattedAddress && (
                          <p className="mt-0.5 truncate text-[11.5px] text-[#737373]">{selectedPlace.formattedAddress}</p>
                        )}
                        <p className="mt-1 truncate font-mono text-[10.5px] text-[#A8D62E]">
                          {isTr ? 'Yorum linki hazır' : 'Review link ready'} · {selectedPlace.placeId}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearSelectedPlace}
                      className="bz-btn-icon shrink-0"
                      aria-label={isTr ? 'Seçimi kaldır' : 'Remove selection'}
                    >
                      <X size={15} strokeWidth={2} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={placeQuery}
                        onChange={(event) => setPlaceQuery(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            void runPlacesSearch();
                          }
                        }}
                        placeholder={isTr ? 'Örn. Maya Klinik İstanbul' : 'Ex. Maya Clinic Istanbul'}
                        className="bz-input flex-1"
                        enterKeyHint="search"
                      />
                      <button
                        type="button"
                        onClick={() => void runPlacesSearch()}
                        disabled={placesLoading || placeQuery.trim().length < 2}
                        className="bz-btn-primary shrink-0 disabled:opacity-50"
                      >
                        {placesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search size={14} strokeWidth={2} />}
                        {isTr ? 'Ara' : 'Search'}
                      </button>
                    </div>

                    {placesError && (
                      <p className="mt-2 text-[12px] leading-snug text-[#92400E]">{placesError}</p>
                    )}

                    {placeResults && placeResults.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {placeResults.map((place) => (
                          <button
                            key={place.placeId}
                            type="button"
                            onClick={() => selectPlace(place)}
                            className="flex w-full items-start gap-2.5 rounded-xl border border-[#EDEDED] bg-white p-3 text-left transition-all hover:border-[#C6F24E] hover:bg-[#F7FAEF]"
                          >
                            <MapPin size={15} strokeWidth={2} className="mt-0.5 shrink-0 text-[#737373]" />
                            <span className="min-w-0">
                              <span className="block truncate text-[13px] font-semibold text-[#0A0A0A]">{place.displayName}</span>
                              {place.formattedAddress && (
                                <span className="mt-0.5 block truncate text-[11.5px] text-[#737373]">{place.formattedAddress}</span>
                              )}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Manual fallback */}
                    <div className="mt-3">
                      <span className="ml-1 pulse-eyebrow text-[#737373]">
                        {isTr ? 'veya elle yapıştır' : 'or paste manually'}
                      </span>
                      <input
                        type="text"
                        value={formData.googlePlaceId}
                        onChange={(event) => setFormField('googlePlaceId', event.target.value)}
                        placeholder={isTr ? PLATFORM_INPUTS[0].placeholder : PLATFORM_INPUTS[0].placeholder.replace('veya', 'or')}
                        className={`bz-input mt-1.5 ${fieldErrors.googlePlaceId ? 'border-[#FCA5A5]' : ''}`}
                        aria-invalid={fieldErrors.googlePlaceId ? true : undefined}
                      />
                      {fieldErrors.googlePlaceId && (
                        <p className="ml-1 mt-1.5 text-[11.5px] text-[#B91C1C]" role="alert">
                          {fieldErrors.googlePlaceId}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Non-Google platform inputs */}
            {platformInputs
              .filter((input) => input.id !== 'google')
              .map((input) => {
                const field = input.field as CreateFormField;
                return (
                  <div key={input.id} className="rounded-2xl border border-[#EDEDED] bg-white p-4">
                    <div className="mb-3 flex items-start gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F5F5F5]">
                        <MapPin size={15} strokeWidth={2} className="text-[#0A0A0A]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#0A0A0A]">{input.label}</p>
                        <p className="mt-0.5 text-[11.5px] leading-snug text-[#737373]">
                          {isTr
                            ? 'Boş bırakabilirsin; sonradan Platform Bağlantıları ekranından eklenir.'
                            : 'Optional now; you can add it later from Platform Links.'}
                        </p>
                      </div>
                    </div>
                    <input
                      type="url"
                      value={formData[field]}
                      onChange={(event) => setFormField(field, event.target.value)}
                      placeholder={isTr ? input.placeholder : input.placeholder.replace('veya', 'or')}
                      className={`bz-input ${fieldErrors[field] ? 'border-[#FCA5A5]' : ''}`}
                      aria-label={input.label}
                      aria-invalid={fieldErrors[field] ? true : undefined}
                    />
                    {fieldErrors[field] && (
                      <p className="ml-1 mt-1.5 text-[11.5px] text-[#B91C1C]" role="alert">
                        {fieldErrors[field]}
                      </p>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        {/* STEP 2 — Preview */}
        {createStep === 2 && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              <label className="flex flex-col gap-2">
                <span className="ml-1 pulse-eyebrow text-[#737373]">{isTr ? 'Bildirim e-postası' : 'Notification email'}</span>
                <input
                  type="email"
                  value={formData.notificationEmail}
                  onChange={(event) => setFormField('notificationEmail', event.target.value)}
                  className={`bz-input ${fieldErrors.notificationEmail ? 'border-[#FCA5A5]' : ''}`}
                  aria-invalid={fieldErrors.notificationEmail ? true : undefined}
                  inputMode="email"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                {fieldErrors.notificationEmail && (
                  <p className="ml-1 text-[11.5px] text-[#B91C1C]" role="alert">
                    {fieldErrors.notificationEmail}
                  </p>
                )}
              </label>

              <label className="flex flex-col gap-2">
                <span className="ml-1 pulse-eyebrow text-[#737373]">{isTr ? 'Adres' : 'Address'}</span>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(event) => setFormField('address', event.target.value)}
                  className="bz-input"
                  placeholder={isClinic && isTr ? 'Klinik adresi' : undefined}
                />
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="ml-1 pulse-eyebrow text-[#737373]">{isTr ? 'Telefon' : 'Phone'}</span>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(event) => setFormField('phone', event.target.value)}
                    className="bz-input"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="ml-1 pulse-eyebrow text-[#737373]">{isTr ? 'Tema rengi' : 'Theme color'}</span>
                  <div className="flex h-[46px] items-center gap-3 rounded-2xl border border-[#EDEDED] bg-white px-4">
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(event) => setFormField('primaryColor', event.target.value)}
                      className="h-9 w-11 cursor-pointer rounded-xl border-0 bg-transparent"
                    />
                    <span className="font-mono text-sm text-[#0A0A0A]">{formData.primaryColor}</span>
                  </div>
                </label>
              </div>
            </div>

            <aside className="rounded-2xl border border-[#EDEDED] bg-[#0A0A0A] p-4 text-white">
              <div className="flex items-center justify-between gap-3">
                <span className="pulse-eyebrow text-white/60">{isTr ? 'PANEL ÖNİZLEME' : 'PANEL PREVIEW'}</span>
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
                  <p className="mt-1 text-[12px] text-white/55">{selectedSector?.display[locale] ?? formData.category}</p>
                </div>
              </div>
              <div className="mt-5 space-y-2 rounded-2xl bg-white/8 p-3">
                <div className="flex items-center justify-between gap-2 text-[12px]">
                  <span className="text-white/55">{isClinic ? (isTr ? 'Hasta geri bildirimi' : 'Patient feedback') : isTr ? 'Yorum akışı' : 'Review flow'}</span>
                  <span className="font-semibold text-[#C6F24E]">{isTr ? 'Hazır' : 'Ready'}</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-[12px]">
                  <span className="text-white/55">{isTr ? 'Google bağlantısı' : 'Google link'}</span>
                  <span className="font-semibold text-[#C6F24E]">
                    {formData.googlePlaceId ? (isTr ? 'Bağlı' : 'Linked') : (isTr ? 'Yok' : 'None')}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-[12px]">
                  <span className="text-white/55">{isTr ? 'Müşteri sayfası' : 'Customer page'}</span>
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

        {/* Footer nav — below lg it sits above the shell's floating bottom
            nav (`--dash-bottom-nav-h`, safe-area included) instead of under it. */}
        <div className="sticky bottom-[calc(var(--dash-bottom-nav-h,96px)+12px)] lg:bottom-0 -mx-4 flex flex-col gap-2 border-t border-[#EDEDED] bg-white/95 px-4 py-4 backdrop-blur sm:-mx-7 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <Link href={`/${locale}/dashboard/restaurants`} className="bz-btn-ghost order-2 justify-center sm:order-1">
            {isTr ? 'İptal' : 'Cancel'}
          </Link>
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
              <button type="submit" disabled={creating || !canContinueIdentity} className="bz-btn-primary flex-1 disabled:opacity-60 sm:flex-none">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Palette size={14} strokeWidth={2} />}
                {isTr ? 'İşletmeyi oluştur' : 'Create business'}
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Public page preview link helper (step 2) */}
      {createStep === 2 && formData.slug && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-[#737373]">
          <ExternalLink size={13} strokeWidth={2} />
          {isTr ? 'Oluşturduktan sonra:' : 'After creation:'}{' '}
          <span className="font-mono text-[#0A0A0A]">/r/{formData.slug}</span>
        </p>
      )}
    </div>
  );
}
