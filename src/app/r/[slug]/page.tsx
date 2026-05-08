'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useParams, useSearchParams, notFound } from 'next/navigation';
import { Star, Check, Loader2 } from 'lucide-react';
import { getTranslations, Locale, locales } from '@/lib/translations';
import { SYSTEM_FEEDBACK } from '@/lib/constants';
import { buildGoogleReviewUrl } from '@/lib/google-review';
import { resolveBestRedirectPlatform } from '@/lib/platform-redirect-resolver';
import { getRecaptchaToken } from '@/lib/recaptcha-client';
import RecaptchaNotice from '@/components/RecaptchaNotice';
import { PlatformChip } from '@/components/ui';

interface RestaurantData {
  id: string;
  slug: string;
  name: string;
  category: string;
  address: string | null;
  phone: string | null;
  googlePlaceId: string | null;
  getirYemekUrl: string | null;
  yemekSepetiUrl: string | null;
  trendyolYemekUrl: string | null;
  tripAdvisorUrl: string | null;
  airbnbUrl: string | null;
  bookingUrl: string | null;
  yandexUrl: string | null;
  // Stage 10 — Yelp + Foursquare resolver chain (CLAUDE.md §38.80).
  yelpUrl?: string | null;
  foursquareUrl?: string | null;
  // Per-platform enabled toggles — `resolveBestRedirectPlatform` (CLAUDE.md
  // §19.4.3) bunları saygı gösterir. Owner panelden toggle off edilen bir
  // platform `/r/[slug]` redirect zincirinde atlanır.
  googleEnabled?: boolean;
  yemekSepetiEnabled?: boolean;
  getirEnabled?: boolean;
  trendyolEnabled?: boolean;
  tripAdvisorEnabled?: boolean;
  airbnbEnabled?: boolean;
  bookingEnabled?: boolean;
  yandexEnabled?: boolean;
  yelpEnabled?: boolean;
  foursquareEnabled?: boolean;
  externalPlatformsEnabled?: boolean;
  // Wave 4 broken-skip downstream (CLAUDE.md §19.4.5). Slug GET endpoint
  // son 24 saatlik PlatformLinkCheck'lerden provider başına latest sonucu
  // attach eder; resolver `latestChecks` Map'i ile broken provider'ı
  // atlar. Boş veya undefined ise legacy davranış (broken-skip yok).
  latestChecks?: Record<string, { ok: boolean; checkedAt: string }>;
  primaryColor: string;
  isActive: boolean;
  // Phase 12.6 — owner-picked fallback when QR has no `?platform=` param.
  // NULL → resolver Google → sektör priority → any active (CLAUDE.md §19.4.3).
  defaultRedirectPlatform?: string | null;
}

// §38.130 Stage 49 — HANDOFF feedback-flow.jsx birebir parity. 5 rating
// label + hint metinleri locale-aware. Hint metni rating'e göre müşteriye
// bağlam sağlar (tone-coded pill'in üstünde gösterilir).
const RATING_LABELS: Record<Locale, string[]> = {
  tr: ['Çok kötüydü', 'İdare ederdi', 'Ortalama', 'Güzeldi', 'Mükemmel!'],
  en: ['Terrible', 'Poor', 'Okay', 'Good', 'Excellent!'],
};

const RATING_HINTS: Record<Locale, string[]> = {
  tr: [
    'Bize anlat, düzeltelim',
    'Eksiklerimizi söyle',
    'Birkaç notunu alalım',
    'Google\'da paylaşır mısın?',
    'Google\'da paylaşır mısın?',
  ],
  en: [
    'Tell us, we\'ll fix it',
    'What was off?',
    'A short note will help',
    'Share it on Google?',
    'Share it on Google?',
  ],
};

// §38.130 Stage 49 — public review surface tag chip picker.
// Locale-agnostic ENUM key'leri (frontend label'ları locale'e göre map eder).
// Backend whitelist (`/api/feedback/route.ts:VALID_ASPECT_TAGS`) bu key'leri
// enforce eder; bilinmeyen key'ler silent drop edilir. Yeni aspect eklerken
// 3 nokta drift disipline: bu const + ASPECT_TAG_LABELS + backend whitelist.
const ASPECT_TAG_KEYS = [
  'food_taste',
  'service_speed',
  'temperature',
  'portion',
  'price',
  'cleanliness',
  'atmosphere',
  'staff',
  'music',
  'wait_time',
] as const;

const ASPECT_TAG_LABELS: Record<Locale, Record<(typeof ASPECT_TAG_KEYS)[number], string>> = {
  tr: {
    food_taste: 'Yemek tadı',
    service_speed: 'Servis hızı',
    temperature: 'Sıcaklık',
    portion: 'Porsiyon',
    price: 'Fiyat',
    cleanliness: 'Temizlik',
    atmosphere: 'Atmosfer',
    staff: 'Personel ilgisi',
    music: 'Müzik',
    wait_time: 'Bekleme',
  },
  en: {
    food_taste: 'Food taste',
    service_speed: 'Service speed',
    temperature: 'Temperature',
    portion: 'Portion',
    price: 'Price',
    cleanliness: 'Cleanliness',
    atmosphere: 'Atmosphere',
    staff: 'Staff',
    music: 'Music',
    wait_time: 'Wait time',
  },
};

// §38.130 Stage 49 — AI preset chips (kullanıcı kararı: cosmetic decoration).
// Comment textarea'sına tek tıkla ekleyici visual yardım. Backend AI
// feature ile bağlı değil; "AI YARDIMCI HAZIR" badge purely visual.
const PRESET_CHIPS: Record<Locale, string[]> = {
  tr: ['Yemek soğuktu', 'Çok bekledim', 'Sipariş yanlış geldi', 'Personel ilgisizdi', 'Hesap hatalıydı'],
  en: ['Food was cold', 'Long wait', 'Wrong order', 'Inattentive staff', 'Bill error'],
};

// §38.130 Stage 49 — Reference number formatter. Feedback CUID'den derive
// edilir; "BZ-XXX-YYY" pattern. İlk 3 + son 3 char uppercase. Müşteri
// thanks screen'de görür → ileride owner ile iletişimde kayıp önleme.
function formatReferenceNumber(feedbackId: string): string {
  if (feedbackId.length < 6) {
    return `BZ-${feedbackId.toUpperCase()}`;
  }
  const head = feedbackId.slice(0, 3).toUpperCase();
  const tail = feedbackId.slice(-3).toUpperCase();
  return `BZ-${head}-${tail}`;
}

function ReviewContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;

  // The QR's `?platform=` overrides everything; if not present, the
  // restaurant's owner-picked `defaultRedirectPlatform` is used; if neither
  // is set, fall back to Google (legacy default).
  const explicitPlatform = searchParams.get('platform');
  const sourceParam = searchParams.get('source') || 'qr';
  const tableParam = searchParams.get('table') || '';

  const [locale, setLocale] = useState<Locale>('tr');
  useEffect(() => {
    const hl = searchParams.get('hl') as Locale;
    if (hl && locales.includes(hl)) {
      setLocale(hl);
      return;
    }
    const browserLang = navigator.language.split('-')[0] as Locale;
    if (locales.includes(browserLang)) setLocale(browserLang);
  }, [searchParams]);

  const t = useCallback(
    (key: string): string => {
      const trans = getTranslations(locale) as Record<string, string>;
      return trans[key] || key;
    },
    [locale],
  );

  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [comment, setComment] = useState('');
  // §38.130 Stage 49 — selected tag chips ENUM key array.
  // Whitelist `ASPECT_TAG_KEYS`'den seçilenler; backend `aspectTags` POST
  // body field'ına gönderilir + DB `aspectsJson` field'ında saklanır.
  const [selectedAspectTags, setSelectedAspectTags] = useState<string[]>([]);
  // KVKK işareti default true — submit-gate olarak işlev görür ("kullanıcı
  // formu submitliyorsa veri işleme rızası action implies consent doktrinine
  // göre verilmiş sayılır" + UI submit'i KVKK işaretsizse kilitler).
  // Marketing (iletişim) izni KVKK + GDPR gereği **opt-in zorunlu** — default
  // false olmalı. Pre-checked marketing onayı Açık Rıza ihlal riski taşır.
  const [kvkk, setKvkk] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [website, setWebsite] = useState(''); // honeypot

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState<{ url: string; platformId: string } | null>(null);
  // §38.130 Stage 49 — POST /api/feedback success response'undan gelen
  // feedback ID. Step 3 (thanks) reference number için kullanılır.
  const [feedbackId, setFeedbackId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/restaurants?slug=${slug}`);
        if (cancelled) return;
        if (res.ok) {
          setRestaurant(await res.json());
        } else {
          setIsNotFound(true);
        }
      } catch {
        if (!cancelled) setIsNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // QR scan tracking — restaurant load sonrası fire-and-forget. SessionStorage
  // dedupe (30dk window) refresh abuse'a karşı; aynı (slug, table, platform)
  // tuple'ı 30dk'da bir kez sayılır. Hata sessizce yutulur — public surface
  // müşteri akışını kesintiye uğratmaz.
  useEffect(() => {
    if (!restaurant?.slug || !restaurant.isActive) return;
    if (typeof window === 'undefined') return;
    const dedupeKey = `bz_qr_scan:${restaurant.slug}:${tableParam || ''}:${explicitPlatform || ''}`;
    try {
      const last = window.sessionStorage.getItem(dedupeKey);
      if (last && Date.now() - parseInt(last, 10) < 30 * 60 * 1000) return;
      window.sessionStorage.setItem(dedupeKey, String(Date.now()));
    } catch {
      // sessionStorage disabled (private mode) — devam, server dedupe yok
      // ama ek hit kabul edilir (rate limit zaten 30/dk koruyor).
    }
    let sid: string | null = null;
    try {
      sid = window.sessionStorage.getItem('bz_qr_scan_sid');
      if (!sid) {
        sid = typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        window.sessionStorage.setItem('bz_qr_scan_sid', sid);
      }
    } catch {
      sid = null;
    }
    fetch('/api/qr-scan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        slug: restaurant.slug,
        tableNumber: tableParam || null,
        platform: explicitPlatform || null,
        source: sourceParam,
        sessionId: sid,
      }),
      keepalive: true,
    }).catch(() => {
      // Silent — scan tracking optional, müşteri akışı engellenmez.
    });
  }, [restaurant?.slug, restaurant?.isActive, tableParam, explicitPlatform, sourceParam]);

  if (loading) return <DarkLoader locale={locale} />;
  if (isNotFound || !restaurant) return notFound();

  // Accepts: raw Place ID (ChIJ…), g.page/r/… link, search.google.com
  // writereview link, or a /maps/place/ URL — see buildGoogleReviewUrl.
  const googleUrl = buildGoogleReviewUrl(restaurant.googlePlaceId);

  // Wave 4 broken-skip — slug GET'ten gelen son 24 saatlik test sonuçlarını
  // resolver'ın beklediği Map<provider, { ok, checkedAt: Date }> formatına
  // dönüştür. `latestChecks` undefined/boş ise resolver legacy davranış
  // (broken-skip yok, sadece sektör fallback).
  const latestChecksMap = restaurant.latestChecks
    ? new Map(
        Object.entries(restaurant.latestChecks).map(([provider, info]) => [
          provider,
          { ok: info.ok, checkedAt: new Date(info.checkedAt) },
        ]),
      )
    : undefined;

  // Resolver chain (CLAUDE.md §19.4.3): requested → default → sector
  // priority → any active → null. Saf fonksiyon, deterministik.
  const resolution = resolveBestRedirectPlatform({
    restaurant: {
      category: restaurant.category,
      defaultRedirectPlatform: restaurant.defaultRedirectPlatform ?? null,
      googleReviewUrl: googleUrl,
      yemekSepetiUrl: restaurant.yemekSepetiUrl,
      getirYemekUrl: restaurant.getirYemekUrl,
      trendyolYemekUrl: restaurant.trendyolYemekUrl,
      tripAdvisorUrl: restaurant.tripAdvisorUrl,
      airbnbUrl: restaurant.airbnbUrl,
      bookingUrl: restaurant.bookingUrl,
      yandexUrl: restaurant.yandexUrl,
      yelpUrl: restaurant.yelpUrl ?? null,
      foursquareUrl: restaurant.foursquareUrl ?? null,
      googleEnabled: restaurant.googleEnabled ?? true,
      yemekSepetiEnabled: restaurant.yemekSepetiEnabled ?? true,
      getirEnabled: restaurant.getirEnabled ?? true,
      trendyolEnabled: restaurant.trendyolEnabled ?? true,
      tripAdvisorEnabled: restaurant.tripAdvisorEnabled ?? true,
      airbnbEnabled: restaurant.airbnbEnabled ?? true,
      bookingEnabled: restaurant.bookingEnabled ?? true,
      yandexEnabled: restaurant.yandexEnabled ?? true,
      yelpEnabled: restaurant.yelpEnabled ?? true,
      foursquareEnabled: restaurant.foursquareEnabled ?? true,
      externalPlatformsEnabled: restaurant.externalPlatformsEnabled ?? true,
    },
    requestedProvider: explicitPlatform,
    latestChecks: latestChecksMap,
  });

  const targetPlatformUrl = resolution.url;
  // PlatformChip için UI vocabulary: trendyol_go → trendyol mapping mevcut
  // <PlatformChip>'in PLATFORMS const'ında var; storage key'i 'trendyol_go'
  // kabul ediyor (CLAUDE.md §5). Provider null ise legacy 'google' fallback
  // — overlay görsel için nötr placeholder.
  const fallbackPlatformId = resolution.provider ?? 'google';

  const isLow = rating > 0 && rating <= 3;
  const visibleRating = hover || rating;
  const labels = RATING_LABELS[locale] ?? RATING_LABELS.tr;
  const hints = RATING_HINTS[locale] ?? RATING_HINTS.tr;
  const aspectLabels = ASPECT_TAG_LABELS[locale] ?? ASPECT_TAG_LABELS.tr;
  const presetChips = PRESET_CHIPS[locale] ?? PRESET_CHIPS.tr;

  // High-rating handler factored out so it can be triggered both from a
  // direct star tap (4-5 → instant redirect, design 1:1) and defensively from
  // the "Devam et" button. Accepts the selected rating explicitly so it works
  // before React state has flushed.
  const triggerHighRedirect = (selectedRating: number) => {
    // Log the high rating (fire-and-forget) — preserves analytics & redirect attribution
    try {
      fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: selectedRating,
          source: sourceParam,
          branch: restaurant.name,
          tableNumber: tableParam,
          comment: SYSTEM_FEEDBACK.HIGH_RATING_REDIRECT,
          restaurantSlug: slug,
          platform: resolution.provider || null,
        }),
      });
    } catch (e) {
      console.error('Failed to log high rating', e);
    }

    if (targetPlatformUrl) {
      // Platform redirect tracking — fire-and-forget POST, owner panel
      // "Platform Yönlendirmeleri" analytics section'ı bunu tüketir
      // (CLAUDE.md §19.4.2 + §23.7 Phase 11.24). Server'a 302 değil; client
      // window.location korunur, open-redirect imkansız (target URL request
      // body'de yok, restaurant kaydından okunur).
      fetch('/api/platform-redirect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          provider: fallbackPlatformId,
          source: sourceParam,
        }),
        keepalive: true,
      }).catch(() => {
        // Silent — tracking optional, müşteri redirect akışı engellenmez.
      });

      setRedirecting({ url: targetPlatformUrl, platformId: fallbackPlatformId });
      // §38.133 Stage 52 — overlay timeout 2200ms → 1500ms. Mobile bekleme
      // hissi azalır; `bzProgress` keyframe (2.2s sabit) overlay'in kendi
      // animation'ı, JS timeout daha kısa = daha keskin transition. Görsel
      // progress bar bittiğini görmeden redirect olur, kasıtlı.
      setTimeout(() => {
        window.location.href = targetPlatformUrl;
      }, 1500);
      return;
    }
    // No platform URL configured — drop straight to thanks
    setStep(3);
  };

  const handleStarClick = (star: number) => {
    setRating(star);
    // §38.133 Stage 52 — auto-advance her iki tarafta da tetikleniyor:
    // 4-5 yıldız → 200ms delay (animasyon) → triggerHighRedirect platform
    //   yönlendirmesi (mevcut Stage 48 davranışı intact).
    // 1-3 yıldız → 300ms delay → setStep(2) form ekranı (yeni). Rating
    //   fill animasyonu + tone-coded pill `bz-fade-in` görünür kalır,
    //   sonra smooth geçer. Manuel "Devam et" butonu silindi.
    if (star >= 4 && !redirecting) {
      setTimeout(() => triggerHighRedirect(star), 200);
    } else if (star <= 3) {
      setTimeout(() => setStep(2), 300);
    }
  };

  // §38.130 Stage 49 — tag chip toggle. Click ekler/çıkarır; max 10 cap
  // backend whitelist ile aynı (ASPECT_TAG_KEYS.length === 10).
  const toggleAspectTag = (key: string) => {
    setSelectedAspectTags((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  // §38.130 Stage 49 — preset chip click. Comment textarea'sına ekler;
  // mevcut text varsa "\n+ {preset}" formatla. Pure UI yardım, backend AI
  // feature ile bağlı değil (kullanıcı kararı: cosmetic decoration).
  const appendPresetToComment = (preset: string) => {
    setComment((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return preset;
      // Aynı preset zaten eklenmişse skip
      if (trimmed.includes(preset)) return prev;
      return `${trimmed}\n+ ${preset}`;
    });
  };

  const handleLowSubmit = async () => {
    if (!comment.trim()) {
      setError(
        locale === 'tr'
          ? 'Lütfen deneyimini birkaç cümleyle anlat.'
          : 'Please describe your experience in a few words.',
      );
      return;
    }
    if (!kvkk) {
      setError(t('feedback_error_kvkk'));
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const recaptchaToken = await getRecaptchaToken('feedback_submit');
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || null,
          email: email.trim() || null,
          phone: null,
          comment: comment.trim(),
          hasKvkkConsent: kvkk,
          hasMarketingConsent: marketing,
          rating,
          source: sourceParam,
          branch: restaurant.name,
          tableNumber: tableParam,
          restaurantSlug: slug,
          platform: resolution.provider || null,
          aspects: null,
          // §38.130 Stage 49 — tag chip ENUM key array. Backend
          // `aspectTags` whitelist filter eder + `aspectsJson` JSONB
          // field'ında saklar.
          aspectTags: selectedAspectTags,
          website,
          recaptchaToken,
          locale,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || t('feedback_error_comment'));
        setSubmitting(false);
        return;
      }
      // §38.130 Stage 49 — feedback ID'yi sakla; thanks screen reference
      // number için `formatReferenceNumber` ile derive eder.
      if (result.id) setFeedbackId(result.id);
      setStep(3);
    } catch {
      setError(locale === 'tr' ? 'Bağlantı hatası. İnternetinizi kontrol edin.' : 'Connection error. Check your internet.');
    } finally {
      setSubmitting(false);
    }
  };

  const initial = restaurant.name.charAt(0).toUpperCase();

  return (
    <main className="min-h-[100dvh] bg-[#0A0A0A] text-white">
      {redirecting && (
        <RedirectingOverlay
          locale={locale}
          platformId={redirecting.platformId}
          restaurantName={restaurant.name}
        />
      )}

      <div
        className="mx-auto flex min-h-[100dvh] max-w-[360px] flex-col px-6 pt-2"
        style={{
          // Stage 48 §38.129 — iOS notch + home-indicator safe-area inset.
          // Mevcut `pb-10` (40px) tablet/desktop tabanı; mobil ekranlarda
          // home-indicator overlap'i önlemek için env() ile clamp.
          paddingBottom: 'max(40px, calc(env(safe-area-inset-bottom, 0px) + 24px))',
          // 300ms tap delay'ini iOS Safari'da kapatır; double-tap zoom yine çalışır.
          touchAction: 'manipulation',
        }}
      >
        {/* Brand header — design padding 32/0/28 */}
        <header className="text-center" style={{ padding: '32px 0 28px' }}>
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-[26px] font-bold text-[#0A0A0A]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {initial}
          </div>
          <h1
            className="text-[22px] font-bold text-white"
            style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em', marginTop: 14 }}
          >
            {restaurant.name}
          </h1>
          {restaurant.address && (
            <p className="text-[12px] text-white/55" style={{ marginTop: 4 }}>{restaurant.address}</p>
          )}
        </header>

        {/* White card */}
        <section
          key={step}
          className="bz-fade-in rounded-[24px] bg-white p-6 text-[#0A0A0A] shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
        >
          {step === 1 && (
            <div>
              {/* §38.130 Stage 49 — HANDOFF feedback-flow.jsx 3-step
                  segmented progress (ADIM 1/3). Loading screen sayılmaz,
                  rate → form → thanks 3-step görünür. */}
              <div className="flex items-center justify-between">
                <span className="pulse-eyebrow text-[#737373]">
                  {locale === 'tr' ? 'ADIM 1 / 3' : 'STEP 1 OF 3'}
                </span>
                <div className="flex gap-1.5" aria-hidden>
                  <span className="h-1 w-6 rounded-full bg-[#0A0A0A]" />
                  <span className="h-1 w-6 rounded-full bg-[#E5E5E5]" />
                  <span className="h-1 w-6 rounded-full bg-[#E5E5E5]" />
                </div>
              </div>
              <h2 className="bz-h-tight-2 mt-2 text-[22px]">
                {locale === 'tr' ? 'Deneyimini puanla' : 'Rate your experience'}
              </h2>
              <p className="mt-2 text-[13px] leading-[1.55] text-[#525252]">
                {locale === 'tr'
                  ? 'Senin görüşün önemli. Birkaç saniyeni alıyoruz.'
                  : 'Your opinion matters. Just a few seconds.'}
              </p>

              <div className="flex items-center justify-center gap-1.5" style={{ padding: '16px 0' }}>
                {[1, 2, 3, 4, 5].map((s) => {
                  const active = s <= visibleRating;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleStarClick(s)}
                      onMouseEnter={() => setHover(s)}
                      onMouseLeave={() => setHover(0)}
                      aria-label={`${s} ${locale === 'tr' ? 'yıldız' : 'star'}`}
                      aria-pressed={rating === s}
                      className="rounded-full p-1.5 transition-transform active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                    >
                      <Star
                        size={42}
                        strokeWidth={0}
                        fill={active ? '#C6F24E' : '#E5E5E5'}
                        className={active ? 'text-[#C6F24E]' : 'text-[#E5E5E5]'}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Stage 48 §38.129 — HANDOFF feedback-flow.jsx tone-coded
                  rating label. ≥4 lime-soft + graphite ink, =3 amber-soft +
                  amber ink, ≤2 red-soft + danger ink. Pill shape + dot
                  prefix, müşteriye yıldız anlamını anında görselleştirir.
                  §38.130 Stage 49 — hint metni eklendi (rating'e göre). */}
              <div
                className="mb-2 flex flex-col items-center justify-center gap-1.5"
                style={{ minHeight: 50 }}
                aria-live="polite"
              >
                {visibleRating > 0 && (
                  <>
                    <span
                      className={`bz-fade-in inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium ${
                        visibleRating >= 4
                          ? 'bg-[#EAF9B8] text-[#0A0A0A]'
                          : visibleRating === 3
                            ? 'bg-[#FFFBEB] text-[#92400E]'
                            : 'bg-[#FEF2F2] text-[#991B1B]'
                      }`}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-current opacity-70"
                        aria-hidden
                      />
                      {labels[visibleRating - 1]}
                    </span>
                    <span className="text-[11.5px] text-[#737373]">
                      {hints[visibleRating - 1]}
                    </span>
                  </>
                )}
              </div>

              {/* §38.133 Stage 52 — "Devam et" butonu silindi. Auto-advance
                  handleStarClick içinde deterministik (rating ≥4 → 200ms
                  redirect, rating ≤3 → 300ms setStep(2)). Manuel button
                  confusing UX yaratıyordu; rating verir vermez akış sürer. */}
            </div>
          )}

          {/* 4-5 yıldız "Çok teşekkürler" ara ekranı KASTEN kaldırıldı —
              tasarım UX'ine göre yıldız tap'inde doğrudan platforma yönlendir.
              triggerHighRedirect() bunu yapar; redirecting overlay görünür. */}

          {step === 2 && isLow && (
            <div>
              {/* §38.130 Stage 49 — eyebrow + 3-step progress rail (1+2 dolu, 3 boş). */}
              <div className="flex items-center justify-between">
                <span className="pulse-eyebrow text-[#737373]">
                  {locale === 'tr' ? 'ADIM 2 / 3' : 'STEP 2 OF 3'}
                </span>
                <div className="flex gap-1.5" aria-hidden>
                  <span className="h-1 w-6 rounded-full bg-[#0A0A0A]" />
                  <span className="h-1 w-6 rounded-full bg-[#0A0A0A]" />
                  <span className="h-1 w-6 rounded-full bg-[#E5E5E5]" />
                </div>
              </div>

              {/* §38.130 Stage 49 — HANDOFF feedback-flow.jsx owner
                  acknowledgment card. Compliance variation: jenerik
                  "İşletme yönetimi" (kullanıcı kararı, "Kardeş Ahmet"
                  hardcoded değil — owner PII expose etmez). Italic
                  Space Grotesk quote (synthetic italic §38.112 paterni). */}
              <div
                className="relative mt-4 overflow-hidden rounded-[18px] bg-[#0A0A0A] px-4 py-4 text-white"
                style={{ marginBottom: 18 }}
              >
                <span
                  className="pointer-events-none absolute -top-8 -right-6 h-28 w-28 rounded-full"
                  style={{ background: 'rgba(198,242,78,0.18)', filter: 'blur(40px)' }}
                  aria-hidden
                />
                <div className="relative">
                  <div className="pulse-eyebrow text-[#C6F24E]" style={{ marginBottom: 6 }}>
                    {locale === 'tr' ? 'ÜZGÜNÜZ · İŞLETME YÖNETİMİ' : 'WE\'RE SORRY · MANAGEMENT'}
                  </div>
                  <div
                    className="text-[16px] font-medium leading-[1.3]"
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontStyle: 'italic',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {locale === 'tr'
                      ? '"Söyle, neyi yanlış yaptık?"'
                      : '"Tell us, what did we get wrong?"'}
                  </div>
                  <div className="text-[11.5px] text-white/55" style={{ marginTop: 6 }}>
                    {locale === 'tr'
                      ? 'Geri bildirimin doğrudan işletme yönetimine ulaşacak.'
                      : 'Your feedback goes directly to the team.'}
                  </div>
                </div>
              </div>

              {/* §38.130 Stage 49 — 10 tag chip picker. ENUM key'leri
                  whitelist; locale-aware label render. */}
              <div style={{ marginBottom: 16 }}>
                <div className="flex items-baseline justify-between" style={{ marginBottom: 10 }}>
                  <h3
                    className="text-[15px] font-medium"
                    style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.01em' }}
                  >
                    {locale === 'tr' ? 'Hangi konularda iyileşmemizi istersin?' : 'What should we work on?'}
                  </h3>
                  <span className="pulse-eyebrow text-[#737373] text-[9px]">
                    {locale === 'tr' ? 'BİRDEN FAZLA' : 'PICK ANY'}
                  </span>
                </div>
                <div
                  className="flex flex-wrap gap-1.5"
                  role="group"
                  aria-label={
                    locale === 'tr' ? 'İyileştirilecek konular' : 'Improvement areas'
                  }
                >
                  {ASPECT_TAG_KEYS.map((key) => {
                    const selected = selectedAspectTags.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleAspectTag(key)}
                        aria-pressed={selected}
                        className={`bz-motion-spring inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[12.5px] font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-1 ${
                          selected
                            ? 'bg-[#0A0A0A] text-white shadow-[0_4px_12px_-6px_rgba(10,10,10,0.4)]'
                            : 'border border-[#E5E5E5] bg-white text-[#0A0A0A] hover:border-[#A3A3A3]'
                        }`}
                      >
                        {selected && (
                          <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#C6F24E]">
                            <Check size={9} strokeWidth={3} className="text-[#0A0A0A]" />
                          </span>
                        )}
                        {aspectLabels[key]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* §38.130 Stage 49 — comment textarea + AI badge cosmetic +
                  preset chips. AI badge KULLANICI KARARI: visual decoration
                  (gerçek AI feature ile bağlı değil). */}
              <div style={{ marginBottom: 16 }}>
                <div className="flex items-baseline justify-between" style={{ marginBottom: 8 }}>
                  <label
                    htmlFor="review-comment"
                    className="text-[15px] font-medium"
                    style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.01em' }}
                  >
                    {locale === 'tr' ? 'Detayları paylaşır mısın?' : 'Tell us a bit more'}
                  </label>
                  <span className="pulse-eyebrow text-[#737373] text-[9px]">
                    {comment.length} / 500
                  </span>
                </div>
                <div className="relative">
                  <textarea
                    id="review-comment"
                    className="bz-input w-full"
                    placeholder={
                      locale === 'tr'
                        ? 'Yaşadığın durumu birkaç cümleyle anlat — yönetim seninle ilgilenecek.'
                        : 'Describe what happened — management will reach out.'
                    }
                    rows={4}
                    maxLength={500}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onFocus={(event) => {
                      // §38.133 Stage 52 — mobile keyboard avoidance.
                      // iOS Safari + Android Chrome focus event'inde
                      // textarea'yı viewport center'a scroll'la → keyboard
                      // açıldığında submit button + KVKK checkbox altında
                      // kaybolmasın. CLAUDE.md §38.61 reduced-motion: smooth
                      // → auto fallback (instant scroll).
                      const target = event.currentTarget;
                      const reduceMotion =
                        typeof window !== 'undefined' &&
                        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                      window.requestAnimationFrame(() => {
                        target.scrollIntoView({
                          block: 'center',
                          behavior: reduceMotion ? 'auto' : 'smooth',
                        });
                      });
                    }}
                    style={{ resize: 'none', fontFamily: 'inherit', paddingBottom: 28 }}
                    enterKeyHint="enter"
                  />
                  {/* AI badge — cosmetic decoration. `bz-rr-pulse` keyframe
                      lime dot animation. Kullanıcı kabul etti: visual only. */}
                  <div
                    className="pointer-events-none absolute bottom-2 right-3 inline-flex items-center gap-1.5"
                    aria-hidden
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-[#C6F24E]"
                      style={{ animation: 'bz-rr-pulse 1.5s ease-in-out infinite' }}
                    />
                    <span className="pulse-eyebrow text-[#A8D62E] text-[9px]">
                      {locale === 'tr' ? 'AI YARDIMCI HAZIR' : 'AI ASSIST READY'}
                    </span>
                  </div>
                </div>
                {/* Preset chips horizontal scroll */}
                <div
                  className="no-scrollbar -mx-1 mt-2.5 flex gap-1.5 overflow-x-auto pb-1"
                  style={{ scrollSnapType: 'x mandatory' }}
                  role="group"
                  aria-label={locale === 'tr' ? 'Hızlı seçimler' : 'Quick picks'}
                >
                  {presetChips.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => appendPresetToComment(preset)}
                      className="bz-motion-spring inline-flex shrink-0 items-center gap-1 rounded-full border border-[#C6F24E] bg-[#EAF9B8] px-2.5 py-2 text-[11.5px] font-medium text-[#0A0A0A] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A8D62E]"
                      style={{ scrollSnapAlign: 'start' }}
                    >
                      <span aria-hidden>+</span>
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <input
                  className="bz-input"
                  placeholder={locale === 'tr' ? 'Adın (opsiyonel)' : 'Your name (optional)'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  autoCapitalize="words"
                  enterKeyHint="next"
                />
                <input
                  className="bz-input"
                  type="email"
                  placeholder={locale === 'tr' ? 'E-posta · ulaşmamız için' : 'Email · so we can reach you'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                />

                {/* KVKK aydınlatma — submit gate; metin admin paneli yönetiminde */}
                <label
                  className="flex cursor-pointer gap-2"
                  style={{ fontSize: 11.5, color: '#525252', lineHeight: 1.5, alignItems: 'flex-start' }}
                >
                  <input
                    type="checkbox"
                    checked={kvkk}
                    onChange={(e) => setKvkk(e.target.checked)}
                    style={{ marginTop: 2 }}
                    aria-required="true"
                  />
                  <span>
                    {locale === 'tr' ? 'Okudum, anladım — ' : 'I have read and understood the '}
                    <a
                      href={`/${locale}/kvkk`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0A0A0A] underline hover:text-[#A8D62E]"
                    >
                      {locale === 'tr' ? 'KVKK Aydınlatma Metni' : 'KVKK Privacy Notice'}
                    </a>
                    {locale === 'tr' ? ' ve ' : ' and '}
                    <a
                      href={`/${locale}/acik-riza`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0A0A0A] underline hover:text-[#A8D62E]"
                    >
                      {locale === 'tr' ? 'Açık Rıza Metni' : 'Explicit Consent'}
                    </a>
                    {locale === 'tr'
                      ? ' kapsamında verilerimin işlenmesine açık rıza veriyorum.'
                      : ' and grant explicit consent for processing.'}
                  </span>
                </label>
                {/* Pazarlama izni — opt-in zorunlu (KVKK Açık Rıza + ETK m.6) */}
                <label
                  className="flex cursor-pointer gap-2"
                  style={{ fontSize: 11.5, color: '#525252', lineHeight: 1.5, alignItems: 'flex-start' }}
                >
                  <input
                    type="checkbox"
                    checked={marketing}
                    onChange={(e) => setMarketing(e.target.checked)}
                    style={{ marginTop: 2 }}
                  />
                  <span>
                    {locale === 'tr' ? 'Kampanya ve duyurular için ' : 'For campaigns and announcements I accept the '}
                    <a
                      href={`/${locale}/ticari-ileti`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0A0A0A] underline hover:text-[#A8D62E]"
                    >
                      {locale === 'tr' ? 'Ticari Elektronik İleti İzni' : 'Commercial Electronic Message Consent'}
                    </a>
                    {locale === 'tr' ? ' kapsamında iletişim onayı veriyorum (opsiyonel).' : ' (optional).'}
                  </span>
                </label>

                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="pointer-events-none absolute -z-10 opacity-0"
                  aria-hidden="true"
                />

                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[12px] text-[#991B1B]">
                    <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#991B1B]" />
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleLowSubmit}
                  disabled={submitting || !kvkk}
                  className="bz-btn-primary mt-1 w-full justify-center py-3.5 text-[14px]"
                >
                  {submitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-[#C6F24E]"
                        style={{ boxShadow: '0 0 8px #C6F24E' }}
                        aria-hidden
                      />
                      {locale === 'tr' ? 'Geri bildirimi gönder' : 'Submit feedback'}
                    </>
                  )}
                </button>

                <RecaptchaNotice locale={locale} className="mt-2 text-center text-[10px]" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="bz-fade-in text-center" style={{ padding: '20px 0' }}>
              {/* §38.130 Stage 49 — eyebrow + 3-step progress rail (hepsi dolu). */}
              <div className="flex items-center justify-between" style={{ marginBottom: 18 }}>
                <span className="pulse-eyebrow text-[#737373]">
                  {locale === 'tr' ? 'ADIM 3 / 3' : 'STEP 3 OF 3'}
                </span>
                <div className="flex gap-1.5" aria-hidden>
                  <span className="h-1 w-6 rounded-full bg-[#0A0A0A]" />
                  <span className="h-1 w-6 rounded-full bg-[#0A0A0A]" />
                  <span className="h-1 w-6 rounded-full bg-[#0A0A0A]" />
                </div>
              </div>

              {/* Stage 48 §38.129 — HANDOFF feedback-flow.jsx `DoneHigh/DoneLow`
                  radial pulse rays. 2 concentric lime ring expand outward +
                  fade out (1.6s ease-out, infinite); ortada lime check badge
                  shadow ile kalır. Reduced-motion blanket [style*='bz-done-ring-pulse']
                  selector ile yakalanır (CLAUDE.md §38.61 paterni). */}
              <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
                <span
                  className="absolute inset-0 rounded-full bg-[#C6F24E]"
                  style={{
                    animation: 'bz-done-ring-pulse 1.6s ease-out infinite',
                    transformOrigin: 'center',
                  }}
                  aria-hidden
                />
                <span
                  className="absolute inset-2 rounded-full bg-[#C6F24E]"
                  style={{
                    animation: 'bz-done-ring-pulse 1.6s ease-out 0.4s infinite',
                    transformOrigin: 'center',
                  }}
                  aria-hidden
                />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#C6F24E] shadow-[0_8px_24px_-8px_rgba(198,242,78,0.6)]">
                  <Check size={28} strokeWidth={3} className="text-[#0A0A0A]" />
                </div>
              </div>
              <h2 className="bz-h-tight-2 text-[22px]" style={{ marginTop: 22 }}>
                {locale === 'tr' ? 'Sesin bize ulaştı' : 'We hear you'}
              </h2>
              <p className="text-[13px] leading-[1.6] text-[#525252]" style={{ margin: '10px 0 0' }}>
                {locale === 'tr'
                  ? 'Geri bildirimin doğrudan işletme yönetiminin paneline ulaştırıldı.'
                  : 'Your feedback was delivered directly to the management dashboard.'}
              </p>

              {/* §38.130 Stage 49 — Reference number card. Feedback ID'den
                  derive (BZ-XXX-YYY format). Müşteri ileride yönetim ile
                  iletişimde bu numarayı paylaşabilir. */}
              {feedbackId && (
                <div
                  className="relative mx-auto mt-5 overflow-hidden rounded-[14px] border border-[#ECECEC] bg-white text-left"
                  style={{ padding: '14px 16px', maxWidth: 280 }}
                >
                  <span
                    className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-[#C6F24E]"
                    aria-hidden
                  />
                  <div className="pulse-eyebrow text-[#737373] text-[9px]" style={{ marginBottom: 4 }}>
                    {locale === 'tr' ? 'TALEP NO' : 'REFERENCE'}
                  </div>
                  <div
                    className="text-[15px] font-bold tracking-[0.04em] text-[#0A0A0A]"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {formatReferenceNumber(feedbackId)}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Buaze badge — design 1:1 sade tek satır */}
        <footer
          className="text-center text-white/40"
          style={{
            marginTop: 22,
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          POWERED BY BUAZE
        </footer>
      </div>

    </main>
  );
}

// §38.130 Stage 49 — HANDOFF ReviewLoading birebir parity. 80×80 ring +
// lime spinner border + center BUAZE wordmark dot. Restaurant data fetch
// öncesi render edildiği için restaurant.name yok — generic Buaze brand.
function DarkLoader({ locale = 'tr' as Locale }: { locale?: Locale }) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#0A0A0A] px-10 text-white">
      <div className="flex flex-col items-center gap-5">
        {/* 80×80 ring container + spinning lime border arc */}
        <div className="relative h-20 w-20">
          <div
            className="absolute inset-0 rounded-3xl"
            style={{ border: '2px solid rgba(255,255,255,0.1)' }}
            aria-hidden
          />
          <div
            className="absolute inset-0 rounded-3xl"
            style={{
              border: '2px solid transparent',
              borderTopColor: '#C6F24E',
              animation: 'bz-rr-spin 1.1s linear infinite',
            }}
            aria-hidden
          />
          <div
            className="absolute inset-[22px] flex items-center justify-center text-[28px] font-medium text-white"
            style={{
              fontFamily: 'var(--font-heading)',
              fontStyle: 'italic',
              letterSpacing: '-0.02em',
            }}
            aria-hidden
          >
            b
          </div>
        </div>
        <div className="text-center">
          <div
            className="text-[24px] font-medium text-white"
            style={{
              fontFamily: 'var(--font-heading)',
              fontStyle: 'italic',
              letterSpacing: '-0.02em',
              marginBottom: 6,
            }}
          >
            {locale === 'tr' ? 'Hazırlanıyor…' : 'Loading…'}
          </div>
          <div className="pulse-eyebrow text-white/45 text-[10px]">BUAZE</div>
        </div>
      </div>
    </main>
  );
}

function RedirectingOverlay({
  locale,
  platformId,
  restaurantName,
}: {
  locale: Locale;
  platformId: string;
  restaurantName: string;
}) {
  return (
    <div className="bz-fade-in fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[#0A0A0A] px-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
        <PlatformChip id={platformId} size={48} />
      </div>
      <h2 className="bz-h-tight-2 mb-2 text-[22px] text-white">
        {locale === 'tr' ? 'Yönlendiriliyorsun…' : 'Redirecting…'}
      </h2>
      <p className="mb-6 max-w-[280px] text-[13px] text-white/60">
        {locale === 'tr'
          ? `${restaurantName} için değerlendirmeni paylaşmak üzeresin.`
          : `You're about to share your review for ${restaurantName}.`}
      </p>
      <div className="h-1 w-[180px] overflow-hidden rounded-full bg-white/10">
        <div className="h-full bg-[#C6F24E] animate-[bzProgress_2.2s_linear_forwards]" style={{ width: 0 }} />
      </div>
      {/* CSS Performance §38.61 — `@keyframes bzProgress` styled-jsx block'undan
          globals.css'e taşındı. `animate-[bzProgress_2.2s_linear_forwards]`
          Tailwind arbitrary class'ı keyframe ismini referans verdiği için
          tanım nereden gelirse gelsin animation çalışır; reduced-motion blanket
          arbitrary class selector'unu da yakalar. */}
    </div>
  );
}

export default function SlugPage() {
  return (
    <Suspense fallback={<DarkLoader />}>
      <ReviewContent />
    </Suspense>
  );
}
