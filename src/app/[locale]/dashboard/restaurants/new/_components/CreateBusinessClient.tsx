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
  BedDouble,
  Bike,
  Check,
  Dumbbell,
  Flower2,
  Globe,
  GraduationCap,
  Info,
  Link2,
  Loader2,
  MapPin,
  Palette,
  Scale,
  Search,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  Store,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from 'lucide-react';
import { AlertBanner, PageHeader } from '@/components/ui';
import {
  WIZARD_BACK_CLASS,
  WIZARD_NEXT_CLASS,
  WizardChoice,
  WizardFooter,
  WizardPanel,
  WizardSteps,
  WizardSummaryRow,
} from '@/components/ui/WizardSteps';
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

// Icon circle for each sector choice row (visual only).
const SECTOR_ICON: Record<string, LucideIcon> = {
  restoran: UtensilsCrossed,
  paket: Bike,
  otel: BedDouble,
  klinik: Stethoscope,
  hukuk: Scale,
  spa: Flower2,
  perakende: ShoppingBag,
  fitness: Dumbbell,
  egitim: GraduationCap,
  diger: Store,
};

// Visible field label (sentence case, not a mono eyebrow).
const FIELD_LABEL_CLASS = 'text-[14px] font-medium text-pn-ink';
const FIELD_ERROR_CLASS = 'text-[13px] text-[#B91C1C]';

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
    primaryColor: '#111110',
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
  const sectorIcon = (id: string) => {
    const Icon = SECTOR_ICON[id] ?? Store;
    return <Icon size={18} strokeWidth={1.8} />;
  };
  const avatarInk = readableInk(formData.primaryColor);

  return (
    <div className="mx-auto max-w-[920px] px-4 sm:px-7 py-6 lg:py-8">
      <Link
        href={`/${locale}/dashboard/restaurants`}
        className="mb-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-full text-[13px] font-medium text-[#737373] transition-colors hover:text-pn-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent sm:min-h-[32px]"
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

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <WizardSteps
          ariaLabel={isTr ? 'Kurulum adımları' : 'Setup steps'}
          locale={locale === 'en' ? 'en' : 'tr'}
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
          <div className="space-y-2.5">
            <WizardPanel
              headingId="cb-identity-title"
              title={isTr ? 'İşletme bilgileri' : 'Business details'}
              description={
                isTr
                  ? 'Adı ve müşterilerinin açacağı sayfanın adresi.'
                  : 'The name and the address of the page your customers open.'
              }
            >
              <div className="grid grid-cols-1 gap-5">
                <div className="flex flex-col gap-2">
                  <label htmlFor="cb-name" className={FIELD_LABEL_CLASS}>
                    {isTr ? 'İşletme adı' : 'Business name'}
                  </label>
                  <input
                    id="cb-name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(event) => handleNameChange(event.target.value)}
                    className="bz-input text-[16px] sm:text-[14px]"
                    placeholder={isTr ? 'Örn. Maya Klinik' : 'Ex. Maya Clinic'}
                    autoCapitalize="words"
                    enterKeyHint="next"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="cb-slug" className={FIELD_LABEL_CLASS}>
                    {isTr ? 'Sayfa adresi' : 'URL slug'}
                  </label>
                  <div
                    className={`flex min-h-[46px] items-center gap-1 rounded-full border bg-white pl-[18px] pr-2 transition-[border-color,box-shadow] duration-200 ${
                      formData.slug && !slugValid
                        ? 'border-[#FCA5A5]'
                        : 'border-pn-line focus-within:border-pn-ink focus-within:shadow-[0_0_0_4px_var(--color-pn-accent-soft)]'
                    }`}
                  >
                    <span className="shrink-0 text-[14px] text-[#9A9A9A]" aria-hidden="true">
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
            </WizardPanel>

            <WizardPanel
              headingId="cb-sector-title"
              title={isTr ? 'Sektör' : 'Sector'}
              description={
                isTr
                  ? 'Önerilen platformlar ve kurulum ipuçları sektöre göre değişir.'
                  : 'Suggested platforms and setup hints follow the sector.'
              }
            >
              <fieldset>
                <legend className="sr-only">{isTr ? 'Sektör' : 'Sector'}</legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {SECTORS.map((sector) => {
                    const active = formData.category === sector.label;
                    return (
                      <WizardChoice
                        key={sector.id}
                        aria-pressed={active}
                        selected={active}
                        onClick={() => setFormField('category', sector.label)}
                        icon={sectorIcon(sector.id)}
                        title={sector.display[locale]}
                        description={sector.sub[locale]}
                      />
                    );
                  })}
                </div>
              </fieldset>
            </WizardPanel>
          </div>
        )}

        {/* STEP 1 — Channels (with Google Places search) */}
        {createStep === 1 && (
          <div className="space-y-2.5">
            {/* Google Places search panel */}
            {googleAllowed && (
              <WizardPanel
                headingId="cb-google-title"
                icon={<Search size={17} strokeWidth={1.8} />}
                title={
                  <>
                    {isTr ? "Google'da işletmeni bul" : 'Find your business on Google'}
                    <span className="ml-2 inline-flex h-6 items-center rounded-full bg-pn-accent-soft px-2.5 align-middle text-[12px] font-medium text-pn-accent">
                      {isTr ? 'önerilir' : 'recommended'}
                    </span>
                  </>
                }
                description={
                  isClinic
                    ? isTr
                      ? 'Klinikler için Google ve Yandex gösterilir; yemek sipariş platformları bu kurulumda yer almaz. Hepsi isteğe bağlı.'
                      : 'Clinics show Google and Yandex; food delivery platforms are left out of this setup. All optional.'
                    : isTr
                      ? 'İşletme adını yaz, listeden seç; yorum linkini biz oluştururuz. Hepsi isteğe bağlı.'
                      : 'Type your name, pick from the list; we build the review link. All optional.'
                }
                actions={
                  <button
                    type="button"
                    onClick={() => setShowGoogleInfo((v) => !v)}
                    className="bz-btn-icon h-11 w-11 shrink-0"
                    aria-label={isTr ? 'Google araması hakkında ipucu' : 'Tip about Google search'}
                    aria-expanded={showGoogleInfo}
                  >
                    <Info size={16} strokeWidth={1.8} />
                  </button>
                }
              >
                {showGoogleInfo && (
                  <ul className="mb-4 list-disc space-y-1 rounded-[18px] bg-pn-canvas py-3 pl-8 pr-4 text-[13px] leading-relaxed text-[#525252]">
                    <li>{isTr ? 'İşletme adını + şehir yazarsan sonuç daha isabetli olur.' : 'Add the city for more accurate results.'}</li>
                    <li>{isTr ? 'Bulamazsan Place ID veya yorum linkini elle yapıştırabilirsin.' : 'Not found? Paste the Place ID or review link manually.'}</li>
                  </ul>
                )}

                {/* Selected place chip */}
                {selectedPlace ? (
                  <div className="flex items-center gap-3 rounded-[16px] bg-pn-accent-soft p-3 pr-2 shadow-[inset_0_0_0_1.5px_var(--color-pn-accent)]">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pn-accent text-white" aria-hidden="true">
                      <Check size={16} strokeWidth={2.4} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-pn-ink">{selectedPlace.displayName}</p>
                      {selectedPlace.formattedAddress && (
                        <p className="mt-0.5 truncate text-[13px] text-[#737373]">{selectedPlace.formattedAddress}</p>
                      )}
                      <p className="mt-0.5 truncate text-[12px] font-medium text-pn-accent">
                        {isTr ? 'Yorum linki hazır' : 'Review link ready'} · {selectedPlace.placeId}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={clearSelectedPlace}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-pn-ink transition-colors hover:bg-[#F6F6F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent"
                      aria-label={isTr ? 'Seçimi kaldır' : 'Remove selection'}
                    >
                      <X size={16} strokeWidth={1.8} />
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
                        className="bz-input min-w-0 flex-1 text-[16px] sm:text-[14px]"
                        enterKeyHint="search"
                      />
                      <button
                        type="button"
                        onClick={() => void runPlacesSearch()}
                        disabled={placesLoading || placeQuery.trim().length < 2}
                        aria-busy={placesLoading || undefined}
                        className="bz-btn-primary min-h-[46px] shrink-0 px-5"
                      >
                        {placesLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Search size={15} strokeWidth={2} aria-hidden="true" />}
                        <span className="max-[380px]:sr-only">{isTr ? 'Ara' : 'Search'}</span>
                      </button>
                    </div>

                    {placesError && (
                      <p className="mt-2.5 text-[13px] leading-snug text-[#92400E]" role="status">
                        {placesError}
                      </p>
                    )}

                    {placeResults && placeResults.length > 0 && (
                      <ul className="mt-3 space-y-2" aria-label={isTr ? 'Arama sonuçları' : 'Search results'}>
                        {placeResults.map((place) => (
                          <li key={place.placeId}>
                            <button
                              type="button"
                              onClick={() => selectPlace(place)}
                              className="group flex min-h-[64px] w-full items-center gap-3 rounded-[16px] bg-pn-canvas p-3 pr-4 text-left transition-colors hover:bg-pn-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2"
                            >
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-pn-ink transition-colors group-hover:bg-pn-accent group-hover:text-white max-sm:bg-[#F6F6F6]" aria-hidden="true">
                                <MapPin size={16} strokeWidth={1.8} />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[14px] font-medium text-pn-ink">{place.displayName}</span>
                                {place.formattedAddress && (
                                  <span className="mt-0.5 block truncate text-[13px] text-[#737373]">{place.formattedAddress}</span>
                                )}
                              </span>
                              <span className="hidden h-8 shrink-0 items-center rounded-full bg-pn-accent px-3.5 text-[13px] font-medium text-white sm:inline-flex" aria-hidden="true">
                                {isTr ? 'Seç' : 'Select'}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Manual fallback */}
                    <div className="mt-5 flex flex-col gap-2">
                      <label htmlFor="cb-google-manual" className={FIELD_LABEL_CLASS}>
                        {isTr ? 'Ya da linki elle yapıştır' : 'Or paste the link'}
                      </label>
                      <input
                        id="cb-google-manual"
                        type="text"
                        value={formData.googlePlaceId}
                        onChange={(event) => setFormField('googlePlaceId', event.target.value)}
                        placeholder={isTr ? PLATFORM_INPUTS[0].placeholder : PLATFORM_INPUTS[0].placeholder.replace('veya', 'or')}
                        className={`bz-input text-[16px] sm:text-[14px] ${fieldErrors.googlePlaceId ? 'border-[#FCA5A5]' : ''}`}
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
              </WizardPanel>
            )}

            {/* Other platform links — one card, one labelled field each. */}
            {otherPlatformInputs.length > 0 && (
              <WizardPanel
                headingId="cb-other-title"
                icon={<Link2 size={17} strokeWidth={1.8} />}
                title={isTr ? 'Diğer platformlar' : 'Other platforms'}
                description={
                  isTr
                    ? 'Hepsi isteğe bağlı; linkleri sonradan Platform bağlantıları sayfasından da ekleyebilirsin.'
                    : 'All optional; you can also add links later on the Platform links page.'
                }
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {otherPlatformInputs.map((input) => {
                    const field = input.field as CreateFormField;
                    const inputId = `cb-${input.id}`;
                    return (
                      <div key={input.id} className="flex min-w-0 flex-col gap-2">
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
                          className={`bz-input text-[16px] sm:text-[14px] ${fieldErrors[field] ? 'border-[#FCA5A5]' : ''}`}
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
                </div>
              </WizardPanel>
            )}
          </div>
        )}

        {/* STEP 2 — Preview */}
        {createStep === 2 && (
          <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <WizardPanel
              headingId="cb-contact-title"
              title={isTr ? 'İletişim ve görünüm' : 'Contact and look'}
              description={
                isTr
                  ? 'Bildirimlerin gideceği adres, iletişim bilgileri ve tema rengi.'
                  : 'Where alerts go, contact details and the theme colour.'
              }
            >
              <div className="space-y-5">
                <div className="flex flex-col gap-2">
                  <label htmlFor="cb-email" className={FIELD_LABEL_CLASS}>
                    {isTr ? 'Bildirim e-postası' : 'Notification email'}
                  </label>
                  <input
                    id="cb-email"
                    type="email"
                    value={formData.notificationEmail}
                    onChange={(event) => setFormField('notificationEmail', event.target.value)}
                    className={`bz-input text-[16px] sm:text-[14px] ${fieldErrors.notificationEmail ? 'border-[#FCA5A5]' : ''}`}
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
                    <p id="cb-email-help" className="text-[13px] text-[#737373]">
                      {isTr ? 'Yeni yorum ve düşük puan bildirimleri bu adrese gelir.' : 'New review and low-rating alerts go here.'}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="cb-address" className={FIELD_LABEL_CLASS}>
                    {isTr ? 'Adres' : 'Address'}
                  </label>
                  <input
                    id="cb-address"
                    type="text"
                    value={formData.address}
                    onChange={(event) => setFormField('address', event.target.value)}
                    className="bz-input text-[16px] sm:text-[14px]"
                    placeholder={isClinic && isTr ? 'Klinik adresi' : undefined}
                    autoComplete="street-address"
                    enterKeyHint="next"
                  />
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-4">
                  <div className="flex flex-col gap-2">
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
                      className="bz-input text-[16px] sm:text-[14px]"
                      enterKeyHint="done"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="cb-color" className={FIELD_LABEL_CLASS}>
                      {isTr ? 'Tema rengi' : 'Theme color'}
                    </label>
                    <div className="flex min-h-[46px] items-center gap-3 rounded-full border border-pn-line bg-white py-1 pl-1.5 pr-4 transition-[border-color,box-shadow] duration-200 focus-within:border-pn-ink focus-within:shadow-[0_0_0_4px_var(--color-pn-accent-soft)]">
                      <input
                        id="cb-color"
                        type="color"
                        value={formData.primaryColor}
                        onChange={(event) => setFormField('primaryColor', event.target.value)}
                        className="h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-full border-0 bg-transparent p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border-0"
                      />
                      <span className="text-[14px] tabular-nums text-pn-ink">{formData.primaryColor.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </WizardPanel>

            {/* Summary — what will be created. */}
            <aside aria-label={isTr ? 'Özet' : 'Summary'} className="bz-card p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[18px] font-medium"
                  style={{ background: formData.primaryColor || '#111110', color: avatarInk }}
                  aria-hidden="true"
                >
                  {(formData.name || 'B').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[18px] font-medium leading-6 text-pn-ink">
                    {formData.name || (isTr ? 'Yeni işletme' : 'New business')}
                  </p>
                  <p className="mt-0.5 truncate text-[13px] text-[#737373]">
                    {selectedSector?.display[locale] ?? formData.category}
                  </p>
                </div>
              </div>
              <div className="mt-5 space-y-2">
                <WizardSummaryRow
                  stack
                  icon={<Sparkles size={16} strokeWidth={1.8} />}
                  label={isClinic ? (isTr ? 'Hasta geri bildirimi' : 'Patient feedback') : isTr ? 'Yorum akışı' : 'Review flow'}
                  value={isTr ? 'Hazır' : 'Ready'}
                />
                <WizardSummaryRow
                  stack
                  icon={<MapPin size={16} strokeWidth={1.8} />}
                  label={isTr ? 'Google bağlantısı' : 'Google link'}
                  value={formData.googlePlaceId ? (isTr ? 'Bağlı' : 'Linked') : (isTr ? 'Yok' : 'None')}
                />
                <WizardSummaryRow
                  stack
                  icon={<Globe size={16} strokeWidth={1.8} />}
                  label={isTr ? 'Müşteri sayfası' : 'Customer page'}
                  value={<span className="break-all">/r/{formData.slug || 'slug'}</span>}
                />
              </div>
              <p className="mt-4 text-[13px] leading-[1.55] text-[#737373]">
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

        {/* Action bar — sticky on phones (white, hairline, safe area), a
            floating white bar from 640px. The first step shows "İptal", later
            steps "Geri" (the back link at the top still leaves the wizard). */}
        <WizardFooter>
          {createStep > 0 ? (
            <button type="button" onClick={goBack} className={`${WIZARD_BACK_CLASS} sm:mr-auto`}>
              <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" />
              {isTr ? 'Geri' : 'Back'}
            </button>
          ) : (
            <Link href={`/${locale}/dashboard/restaurants`} className={`${WIZARD_BACK_CLASS} sm:mr-auto`}>
              {isTr ? 'İptal' : 'Cancel'}
            </Link>
          )}
          {createStep < 2 ? (
            <button
              type="submit"
              disabled={createStep === 0 && !canContinueIdentity}
              className={WIZARD_NEXT_CLASS}
            >
              {isTr ? 'Devam' : 'Continue'}
              <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={creating || !canContinueIdentity}
              aria-busy={creating || undefined}
              className={WIZARD_NEXT_CLASS}
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Palette size={15} strokeWidth={2} aria-hidden="true" />}
              {isTr ? 'İşletmeyi oluştur' : 'Create business'}
            </button>
          )}
        </WizardFooter>
      </form>
    </div>
  );
}

/** Text colour that reads on the chosen brand colour (summary avatar only). */
function readableInk(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#FFFFFF';
  const n = Number.parseInt(m[1], 16);
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const lum = 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
  return lum > 0.4 ? '#111110' : '#FFFFFF';
}
