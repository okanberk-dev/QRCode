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
  Info,
  Loader2,
  MapPin,
  Palette,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { AlertBanner, PageHeader, WizardSteps } from '@/components/ui';
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

// Visible field label (sentence case, not a mono eyebrow).
const FIELD_LABEL_CLASS = 'text-[13px] font-medium text-pn-ink';
const FIELD_ERROR_CLASS = 'text-[12px] text-[#B91C1C]';

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
  const otherPlatformInputs = platformInputs.filter((input) => input.id !== 'google');

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
    if (code === 'PLAN_BUSINESS_LIMIT') {
      const message = isTr ? data?.error : data?.errorEn;
      setCreateError(
        typeof message === 'string' && message
          ? message
          : isTr
            ? 'Planınızın işletme sınırına ulaştınız. Yeni işletme eklemek için planınızı yükseltin.'
            : 'You have reached your plan’s business limit. Upgrade your plan to add another.',
      );
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

  const goBack = () => {
    setCreateError('');
    setCreateStep((createStep - 1) as CreateStep);
  };

  return (
    <div className="mx-auto max-w-[920px] px-4 sm:px-7 py-6 lg:py-8">
      <Link
        href={`/${locale}/dashboard/restaurants`}
        className="mb-3 inline-flex min-h-[44px] items-center gap-1.5 rounded text-[13px] font-medium text-[#737373] transition-colors hover:text-pn-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-ink sm:min-h-[32px]"
      >
        <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" />
        {isTr ? 'İşletmelere dön' : 'Back to businesses'}
      </Link>

      <PageHeader
        title={isTr ? 'İşletme oluştur' : 'Create a business'}
        description={
          isTr
            ? 'Üç kısa adım. Bilgilerin hepsini sonradan ayarlardan değiştirebilirsin.'
            : 'Three short steps. You can change everything later in the settings.'
        }
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <WizardSteps
          ariaLabel={isTr ? 'Kurulum adımları' : 'Setup steps'}
          steps={CREATE_STEPS.map((step) => ({ label: step[locale] }))}
          current={createStep}
          canSelect={(index) => index <= createStep || canContinueIdentity}
          onSelect={(index) => {
            setCreateError('');
            setCreateStep(index as CreateStep);
          }}
        />

        {createError && (
          <AlertBanner kind="danger" onDismiss={() => setCreateError('')}>
            {createError}
          </AlertBanner>
        )}

        {/* STEP 0 — Identity */}
        {createStep === 0 && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="cb-name" className={FIELD_LABEL_CLASS}>
                  {isTr ? 'İşletme adı' : 'Business name'}
                </label>
                <input
                  id="cb-name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(event) => handleNameChange(event.target.value)}
                  className="bz-input"
                  placeholder={isTr ? 'Örn. Maya Klinik' : 'Ex. Maya Clinic'}
                  autoCapitalize="words"
                  enterKeyHint="next"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="cb-slug" className={FIELD_LABEL_CLASS}>
                  {isTr ? 'Sayfa adresi' : 'URL slug'}
                </label>
                <div
                  className={`flex items-center gap-2 rounded-[14px] border bg-white px-3 transition-colors ${
                    formData.slug && !slugValid ? 'border-[#FCA5A5]' : 'border-pn-line focus-within:border-pn-accent'
                  }`}
                >
                  <span className="shrink-0 font-mono text-[12px] text-[#737373]" aria-hidden="true">
                    buaze.com/r/
                  </span>
                  <input
                    id="cb-slug"
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(event) => {
                      setFormField('slug', event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                      setIsManualSlug(true);
                    }}
                    // 16px below sm stops iOS Safari zooming into the field.
                    className="min-w-0 w-full bg-transparent py-3 text-[16px] sm:text-[14px] font-medium text-pn-ink outline-none"
                    placeholder="maya-klinik"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    aria-invalid={formData.slug && !slugValid ? true : undefined}
                    aria-describedby="cb-slug-help"
                  />
                </div>
                {/* The field already shows "buaze.com/r/<slug>" (its prefix is
                    aria-hidden), so the address is only read out for screen
                    readers; the error stays visible under the field. */}
                <p
                  id="cb-slug-help"
                  className={formData.slug && !slugValid ? FIELD_ERROR_CLASS : 'sr-only'}
                >
                  {formData.slug && !slugValid
                    ? isTr
                      ? 'Adres yalnız küçük harf, rakam ve tire içerebilir.'
                      : 'Use lowercase letters, numbers, and hyphen groups only.'
                    : isTr
                      ? `Müşteri sayfan: buaze.com/r/${formData.slug || '…'}`
                      : `Customer page: buaze.com/r/${formData.slug || '…'}`}
                </p>
              </div>
            </div>

            <fieldset className="space-y-2">
              <legend className={FIELD_LABEL_CLASS}>{isTr ? 'Sektör' : 'Sector'}</legend>
              <p className="text-[12px] leading-[1.5] text-[#737373]">
                {isTr
                  ? 'Önerilen platformlar ve kurulum ipuçları sektöre göre değişir.'
                  : 'Suggested platforms and setup hints follow the sector.'}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SECTORS.map((sector) => {
                  const active = formData.category === sector.label;
                  return (
                    <button
                      key={sector.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setFormField('category', sector.label)}
                      className={`flex items-start gap-3 rounded-[20px] border p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-ink focus-visible:ring-offset-2 ${
                        active
                          ? 'border-pn-accent-hover bg-pn-accent-soft'
                          : 'border-pn-line bg-white hover:border-pn-accent'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                          active ? 'border-pn-ink bg-pn-accent' : 'border-pn-line-strong bg-white'
                        }`}
                      >
                        {active && <Check size={10} strokeWidth={3} className="text-pn-ink" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-medium text-pn-ink">{sector.display[locale]}</span>
                        <span className="mt-0.5 block text-[12px] leading-[1.45] text-[#737373]">{sector.sub[locale]}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>
        )}

        {/* STEP 1 — Channels (with Google Places search) */}
        {createStep === 1 && (
          <div className="space-y-4">
            <p className="text-[13px] leading-[1.55] text-[#525252]">
              {isClinic
                ? isTr
                  ? 'Klinikler için Google ve Yandex gösterilir; yemek sipariş platformları bu kurulumda yer almaz. Hepsi isteğe bağlı.'
                  : 'Clinics show Google and Yandex; food delivery platforms are left out of this setup. All optional.'
                : isTr
                  ? 'Hepsi isteğe bağlı; linkleri sonradan Platform bağlantıları sayfasından da ekleyebilirsin.'
                  : 'All optional; you can also add links later on the Platform links page.'}
            </p>

            {/* Google Places search panel */}
            {googleAllowed && (
              <section aria-labelledby="cb-google-title" className="bz-card p-4 sm:p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[14px] bg-pn-accent" aria-hidden="true">
                      <Search size={15} strokeWidth={2} className="text-pn-ink" />
                    </div>
                    <div className="min-w-0">
                      <h2 id="cb-google-title" className="text-[14px] font-medium text-pn-ink">
                        {isTr ? "Google'da işletmeni bul" : 'Find your business on Google'}
                        <span className="ml-1.5 rounded-full bg-pn-accent-soft px-1.5 py-0.5 align-middle text-[12px] font-medium text-[#3F6212]">
                          {isTr ? 'önerilir' : 'recommended'}
                        </span>
                      </h2>
                      <p className="mt-0.5 text-[12px] leading-snug text-[#737373]">
                        {isTr
                          ? 'İşletme adını yaz, listeden seç; yorum linkini biz oluştururuz.'
                          : 'Type your name, pick from the list; we build the review link.'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowGoogleInfo((v) => !v)}
                    className="bz-btn-icon h-11 w-11 shrink-0 sm:h-8 sm:w-8"
                    aria-label={isTr ? 'Google araması hakkında ipucu' : 'Tip about Google search'}
                    aria-expanded={showGoogleInfo}
                  >
                    <Info size={15} strokeWidth={2} />
                  </button>
                </div>

                {showGoogleInfo && (
                  <ul className="mb-3 ml-4 list-disc space-y-1 rounded-[14px] bg-pn-canvas py-2.5 pl-4 pr-3 text-[12px] leading-relaxed text-[#525252]">
                    <li>{isTr ? 'İşletme adını + şehir yazarsan sonuç daha isabetli olur.' : 'Add the city for more accurate results.'}</li>
                    <li>{isTr ? 'Bulamazsan Place ID veya yorum linkini elle yapıştırabilirsin.' : 'Not found? Paste the Place ID or review link manually.'}</li>
                  </ul>
                )}

                {/* Selected place chip */}
                {selectedPlace ? (
                  <div className="flex items-start justify-between gap-3 rounded-[14px] border border-pn-accent-hover bg-pn-accent-soft p-3">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pn-accent" aria-hidden="true">
                        <Check size={13} strokeWidth={2.5} className="text-pn-ink" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-pn-ink">{selectedPlace.displayName}</p>
                        {selectedPlace.formattedAddress && (
                          <p className="mt-0.5 truncate text-[12px] text-[#737373]">{selectedPlace.formattedAddress}</p>
                        )}
                        <p className="mt-1 truncate font-mono text-[12px] text-[#3F6212]">
                          {isTr ? 'Yorum linki hazır' : 'Review link ready'} · {selectedPlace.placeId}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearSelectedPlace}
                      className="bz-btn-icon h-11 w-11 shrink-0 sm:h-8 sm:w-8"
                      aria-label={isTr ? 'Seçimi kaldır' : 'Remove selection'}
                    >
                      <X size={15} strokeWidth={2} />
                    </button>
                  </div>
                ) : (
                  <>
                    <label htmlFor="cb-place-query" className="sr-only">
                      {isTr ? 'Google’da aranacak işletme adı' : 'Business name to search on Google'}
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="cb-place-query"
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
                        aria-busy={placesLoading || undefined}
                        className="bz-btn-primary min-h-[44px] shrink-0 disabled:opacity-50 sm:min-h-[36px]"
                      >
                        {placesLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Search size={14} strokeWidth={2} aria-hidden="true" />}
                        {isTr ? 'Ara' : 'Search'}
                      </button>
                    </div>

                    {placesError && (
                      <p className="mt-2 text-[12px] leading-snug text-[#92400E]" role="status">
                        {placesError}
                      </p>
                    )}

                    {placeResults && placeResults.length > 0 && (
                      <ul className="mt-3 space-y-1.5" aria-label={isTr ? 'Arama sonuçları' : 'Search results'}>
                        {placeResults.map((place) => (
                          <li key={place.placeId}>
                            <button
                              type="button"
                              onClick={() => selectPlace(place)}
                              className="flex min-h-[44px] w-full items-start gap-2.5 rounded-[14px] border border-pn-line bg-white p-3 text-left transition-colors hover:border-pn-accent hover:bg-pn-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-ink"
                            >
                              <MapPin size={15} strokeWidth={2} className="mt-0.5 shrink-0 text-[#737373]" aria-hidden="true" />
                              <span className="min-w-0">
                                <span className="block truncate text-[13px] font-medium text-pn-ink">{place.displayName}</span>
                                {place.formattedAddress && (
                                  <span className="mt-0.5 block truncate text-[12px] text-[#737373]">{place.formattedAddress}</span>
                                )}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Manual fallback */}
                    <div className="mt-3 flex flex-col gap-1.5">
                      <label htmlFor="cb-google-manual" className={FIELD_LABEL_CLASS}>
                        {isTr ? 'Ya da linki elle yapıştır' : 'Or paste the link'}
                      </label>
                      <input
                        id="cb-google-manual"
                        type="text"
                        value={formData.googlePlaceId}
                        onChange={(event) => setFormField('googlePlaceId', event.target.value)}
                        placeholder={isTr ? PLATFORM_INPUTS[0].placeholder : PLATFORM_INPUTS[0].placeholder.replace('veya', 'or')}
                        className={`bz-input ${fieldErrors.googlePlaceId ? 'border-[#FCA5A5]' : ''}`}
                        aria-invalid={fieldErrors.googlePlaceId ? true : undefined}
                        aria-describedby={fieldErrors.googlePlaceId ? 'cb-google-manual-error' : undefined}
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck={false}
                      />
                      {fieldErrors.googlePlaceId && (
                        <p id="cb-google-manual-error" className={FIELD_ERROR_CLASS} role="alert">
                          {fieldErrors.googlePlaceId}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </section>
            )}

            {/* Other platform links — one card, one labelled field each. */}
            {otherPlatformInputs.length > 0 && (
              <section aria-labelledby="cb-other-title" className="bz-card space-y-4 p-4 sm:p-5">
                <h2 id="cb-other-title" className="text-[14px] font-medium text-pn-ink">
                  {isTr ? 'Diğer platformlar' : 'Other platforms'}
                </h2>
                {otherPlatformInputs.map((input) => {
                  const field = input.field as CreateFormField;
                  const inputId = `cb-${input.id}`;
                  return (
                    <div key={input.id} className="flex flex-col gap-1.5">
                      <label htmlFor={inputId} className={FIELD_LABEL_CLASS}>
                        {input.label}
                      </label>
                      <input
                        id={inputId}
                        type="url"
                        inputMode="url"
                        value={formData[field]}
                        onChange={(event) => setFormField(field, event.target.value)}
                        placeholder={isTr ? input.placeholder : input.placeholder.replace('veya', 'or')}
                        className={`bz-input ${fieldErrors[field] ? 'border-[#FCA5A5]' : ''}`}
                        aria-invalid={fieldErrors[field] ? true : undefined}
                        aria-describedby={fieldErrors[field] ? `${inputId}-error` : undefined}
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck={false}
                      />
                      {fieldErrors[field] && (
                        <p id={`${inputId}-error`} className={FIELD_ERROR_CLASS} role="alert">
                          {fieldErrors[field]}
                        </p>
                      )}
                    </div>
                  );
                })}
              </section>
            )}
          </div>
        )}

        {/* STEP 2 — Preview */}
        {createStep === 2 && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="cb-email" className={FIELD_LABEL_CLASS}>
                  {isTr ? 'Bildirim e-postası' : 'Notification email'}
                </label>
                <input
                  id="cb-email"
                  type="email"
                  value={formData.notificationEmail}
                  onChange={(event) => setFormField('notificationEmail', event.target.value)}
                  className={`bz-input ${fieldErrors.notificationEmail ? 'border-[#FCA5A5]' : ''}`}
                  aria-invalid={fieldErrors.notificationEmail ? true : undefined}
                  aria-describedby={fieldErrors.notificationEmail ? 'cb-email-error' : 'cb-email-help'}
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                />
                {fieldErrors.notificationEmail ? (
                  <p id="cb-email-error" className={FIELD_ERROR_CLASS} role="alert">
                    {fieldErrors.notificationEmail}
                  </p>
                ) : (
                  <p id="cb-email-help" className="text-[12px] text-[#737373]">
                    {isTr ? 'Yeni yorum ve düşük puan bildirimleri bu adrese gelir.' : 'New review and low-rating alerts go here.'}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="cb-address" className={FIELD_LABEL_CLASS}>
                  {isTr ? 'Adres' : 'Address'}
                </label>
                <input
                  id="cb-address"
                  type="text"
                  value={formData.address}
                  onChange={(event) => setFormField('address', event.target.value)}
                  className="bz-input"
                  placeholder={isClinic && isTr ? 'Klinik adresi' : undefined}
                  autoComplete="street-address"
                  enterKeyHint="next"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="cb-phone" className={FIELD_LABEL_CLASS}>
                    {isTr ? 'Telefon' : 'Phone'}
                  </label>
                  <input
                    id="cb-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={(event) => setFormField('phone', event.target.value)}
                    className="bz-input"
                    enterKeyHint="done"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="cb-color" className={FIELD_LABEL_CLASS}>
                    {isTr ? 'Tema rengi' : 'Theme color'}
                  </label>
                  {/* flex-1 + sm:min-h-0: on sm+ the box stretches to the
                      phone field next to it (same grid row), so both line up. */}
                  <div className="flex min-h-[44px] flex-1 items-center gap-3 rounded-[14px] border border-pn-line-strong bg-white px-3 shadow-[var(--bz-shadow-xs)] sm:min-h-0">
                    <input
                      id="cb-color"
                      type="color"
                      value={formData.primaryColor}
                      onChange={(event) => setFormField('primaryColor', event.target.value)}
                      className="h-8 w-10 cursor-pointer rounded-[10px] border-0 bg-transparent"
                    />
                    <span className="font-mono text-[13px] text-pn-ink">{formData.primaryColor}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dark summary card — stays dark (§38.202). */}
            <aside
              aria-label={isTr ? 'Özet' : 'Summary'}
              className="rounded-[20px] border border-pn-line bg-pn-ink p-4 text-white"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12px] font-medium text-white/70">{isTr ? 'Özet' : 'Summary'}</span>
                <Sparkles size={15} className="text-pn-accent" aria-hidden="true" />
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-[20px] text-[16px] font-medium text-pn-ink"
                  style={{ background: formData.primaryColor || '#C6F24E' }}
                  aria-hidden="true"
                >
                  {(formData.name || 'B').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-medium">{formData.name || (isTr ? 'Yeni işletme' : 'New business')}</p>
                  <p className="mt-1 text-[12px] text-white/70">{selectedSector?.display[locale] ?? formData.category}</p>
                </div>
              </div>
              <dl className="mt-4 space-y-2 rounded-[20px] bg-white/[0.08] p-3 text-[12px]">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-white/70">{isClinic ? (isTr ? 'Hasta geri bildirimi' : 'Patient feedback') : isTr ? 'Yorum akışı' : 'Review flow'}</dt>
                  <dd className="font-medium text-pn-accent">{isTr ? 'Hazır' : 'Ready'}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-white/70">{isTr ? 'Google bağlantısı' : 'Google link'}</dt>
                  <dd className="font-medium text-pn-accent">
                    {formData.googlePlaceId ? (isTr ? 'Bağlı' : 'Linked') : (isTr ? 'Yok' : 'None')}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-white/70">{isTr ? 'Müşteri sayfası' : 'Customer page'}</dt>
                  <dd className="truncate font-mono text-white">/r/{formData.slug || 'slug'}</dd>
                </div>
              </dl>
              <p className="mt-4 text-[12px] leading-[1.55] text-white/70">
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

        {/* Footer nav — one row. Below lg it sits above the shell's floating
            bottom nav (`--dash-bottom-nav-h`, safe-area included); the white
            shadow fills the 12px gap so the form does not show through. On phones
            the first step shows "İptal", later steps "Geri" (the back link at
            the top still leaves the wizard). */}
        <div className="sticky bottom-[calc(var(--dash-bottom-nav-h,96px)+12px)] lg:bottom-0 -mx-4 flex items-center gap-2 border-t border-pn-line bg-white px-4 py-3 max-lg:shadow-[0_12px_0_0_#FFFFFF] sm:-mx-7 sm:px-7">
          <Link
            href={`/${locale}/dashboard/restaurants`}
            className={`bz-btn-ghost min-h-[44px] justify-center sm:min-h-[36px] ${createStep > 0 ? 'hidden sm:inline-flex' : ''}`}
          >
            {isTr ? 'İptal' : 'Cancel'}
          </Link>
          <div className="flex flex-1 justify-end gap-2">
            {createStep > 0 ? (
              <button type="button" onClick={goBack} className="bz-btn-ghost min-h-[44px] sm:min-h-[36px]">
                <ArrowLeft size={14} strokeWidth={2} aria-hidden="true" />
                {isTr ? 'Geri' : 'Back'}
              </button>
            ) : null}
            {createStep < 2 ? (
              <button
                type="submit"
                disabled={createStep === 0 && !canContinueIdentity}
                className="bz-btn-primary min-h-[44px] flex-1 disabled:opacity-50 sm:min-h-[36px] sm:flex-none"
              >
                {isTr ? 'Devam' : 'Continue'}
                <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={creating || !canContinueIdentity}
                aria-busy={creating || undefined}
                className="bz-btn-primary min-h-[44px] flex-1 disabled:opacity-60 sm:min-h-[36px] sm:flex-none"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Palette size={14} strokeWidth={2} aria-hidden="true" />}
                {isTr ? 'İşletmeyi oluştur' : 'Create business'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
