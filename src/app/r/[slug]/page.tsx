'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useParams, useSearchParams, notFound } from 'next/navigation';
import { Star, Check, Loader2, Copy, Share2, Utensils, ExternalLink } from 'lucide-react';
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
  // Stage 57 §38.138 — thanks screen "Menüye geri dön" conditional render.
  // Yalnızca `menuEnabled && menuPublished` ise CTA görünür (`/menu/[slug]`
  // 404 önleme). Mevcut owner publish toggle akışı intact (CLAUDE.md §12).
  menuEnabled?: boolean;
  menuPublished?: boolean;
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
  // Stage 57 §38.138 — Reference number "Kopyala" button feedback state.
  // Click sonrası 1.6sn "Kopyalandı" görünür, sonra reset. Clipboard API
  // başarısız olursa selectable text fallback (input.select()).
  const [refCopied, setRefCopied] = useState(false);
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

  // Stage 57 §38.138 — Reference number "Kopyala" button. Clipboard API
  // (HTTPS context'te async) → fallback document.execCommand (legacy).
  // Başarılı → 1.6sn "Kopyalandı" feedback (refCopied state). Hata sessiz
  // yutulur (kullanıcı yine reference numarasını manuel okuyabilir).
  const copyReferenceNumber = async () => {
    if (!feedbackId) return;
    const ref = formatReferenceNumber(feedbackId);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(ref);
      } else {
        // Legacy fallback (HTTP context veya eski browser)
        const ta = document.createElement('textarea');
        ta.value = ref;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setRefCopied(true);
      setTimeout(() => setRefCopied(false), 1600);
    } catch {
      // Silent — clipboard yetkisi reddedildi veya context fail.
    }
  };

  // Stage 57 §38.138 — Web Share API (mobile native share sheet).
  // Browser support: iOS Safari 12+, Android Chrome 89+. Desktop Chrome
  // sınırlı. Fallback: link clipboard'a kopyalanır + alert göster.
  const shareReview = async () => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/${locale}/r/${slug}`;
    const title = restaurant?.name
      ? `${restaurant.name} · ${locale === 'tr' ? 'Görüşünü paylaş' : 'Share your review'}`
      : 'Buaze';
    const text =
      locale === 'tr'
        ? `${restaurant?.name ?? 'Buaze'} hakkında deneyimini paylaş`
        : `Share your experience about ${restaurant?.name ?? 'Buaze'}`;
    try {
      if (typeof navigator === 'undefined') return;
      // Stage 60 §38.141 — TypeScript `'share' in nav` narrowing sonrası
      // negative branch'te `nav` tipinden `clipboard` property'si düşürülüyor
      // (TS5+ daha agresif narrowing). Defansif cast: Navigator interface
      // çoğu modern browser'da `clipboard` taşır, runtime check ile guard.
      const nav: Navigator = navigator;
      if ('share' in nav && typeof nav.share === 'function') {
        await nav.share({ title, text, url });
        return;
      }
      // Web Share API yok → URL clipboard fallback
      const clipboard: Clipboard | undefined = (nav as Navigator & { clipboard?: Clipboard }).clipboard;
      if (clipboard?.writeText) {
        await clipboard.writeText(url);
      }
    } catch {
      // User canceled or fail — silent.
    }
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
              {/* Stage 57 §38.138 — HANDOFF feedback-flow.jsx greeting eyebrow
                  (lime pulse dot + "MERHABA!" / "HELLO!") + question h2 +
                  sub copy. ADIM 1/3 ile arasına nefes alma satırı. */}
              <div
                className="mt-3 inline-flex items-center gap-1.5 pulse-eyebrow text-[#A8D62E] text-[10px]"
                aria-hidden
              >
                <span
                  className="h-1.5 w-1.5 rounded-full bg-[#C6F24E]"
                  style={{ boxShadow: '0 0 10px #C6F24E' }}
                />
                {locale === 'tr' ? 'MERHABA!' : 'HELLO!'}
              </div>
              <h2
                className="bz-h-tight-2 mt-2 text-[22px] leading-[1.15]"
                style={{ textWrap: 'balance' }}
              >
                {locale === 'tr'
                  ? 'Bugünkü deneyimini nasıl puanlardın?'
                  : 'How was your experience today?'}
              </h2>
              <p className="mt-2 text-[13px] leading-[1.55] text-[#525252]">
                {locale === 'tr'
                  ? 'Yıldızlara dokun · görüşün anında işletmeye iletilir.'
                  : 'Tap a star · sent directly to the venue.'}
              </p>

              {/* Stage 57 §38.138 — HANDOFF star row card. Yıldız grid +
                  tone-coded label + hint, off-white card içinde subtle
                  separation. Hover state lime tint (desktop UX); active
                  scale press feedback intact. Mobile-first 56×56 button
                  area (Apple HIG WCAG 2.5.5 ≥44px tap target zaten karşılanıyor:
                  42px icon + p-1.5 12px = 54px button). */}
              <div className="mt-4 rounded-[18px] border border-[#ECECEC] bg-[#FAFAFA] px-3 py-4">
                <div className="flex items-center justify-center gap-1" style={{ paddingBottom: 14 }}>
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
                        className="bz-motion-spring rounded-2xl p-1.5 hover:bg-[#EAF9B8]/40 active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAFAFA]"
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
                    §38.130 Stage 49 — hint metni eklendi (rating'e göre).
                    Stage 57 §38.138 — placeholder "← seç →" empty state. */}
                <div
                  className="flex flex-col items-center justify-center gap-1.5"
                  style={{ minHeight: 50 }}
                  aria-live="polite"
                >
                  {visibleRating > 0 ? (
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
                  ) : (
                    <span
                      className="text-[12px] text-[#A3A3A3]"
                      style={{ fontFamily: 'var(--font-heading)', fontStyle: 'italic' }}
                      aria-hidden
                    >
                      ← {locale === 'tr' ? 'seç' : 'pick'} →
                    </span>
                  )}
                </div>
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

              {/* §38.141 Stage 60 — HANDOFF feedback-flow.jsx contact card
                  layout (left-label "AD"/"E-POSTA" pattern). Email field
                  highlight: graphite border + lime sol-stripe (mandatory
                  visual hint, ulaşılabilirlik için kritik). Backend kontrat
                  intact: name + email POST body field'ları aynı. */}
              <div className="flex flex-col gap-2" style={{ marginBottom: 14 }}>
                <div
                  className="flex items-center gap-2.5 rounded-[12px] border border-[#ECECEC] bg-white"
                  style={{ padding: '12px 14px' }}
                >
                  <span
                    className="pulse-eyebrow shrink-0 text-[#A3A3A3]"
                    style={{ width: 56, fontSize: 9.5 }}
                  >
                    {locale === 'tr' ? 'AD' : 'NAME'}
                  </span>
                  <input
                    className="min-w-0 flex-1 border-none bg-transparent text-[13.5px] font-medium text-[#0A0A0A] outline-none placeholder:text-[#A3A3A3]"
                    placeholder={locale === 'tr' ? 'Adın' : 'Your name'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    autoCapitalize="words"
                    enterKeyHint="next"
                    style={{ fontSize: 16 }}
                  />
                  <span
                    className="pulse-eyebrow shrink-0 text-[#A3A3A3]"
                    style={{ fontSize: 9 }}
                  >
                    {locale === 'tr' ? 'OPSİYONEL' : 'OPTIONAL'}
                  </span>
                </div>
                <div
                  className="relative flex items-center gap-2.5 rounded-[12px] border-[1.5px] border-[#0A0A0A] bg-white"
                  style={{ padding: '12px 14px' }}
                >
                  <span
                    className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-[#C6F24E]"
                    aria-hidden
                  />
                  <span
                    className="pulse-eyebrow shrink-0 text-[#A3A3A3]"
                    style={{ width: 56, fontSize: 9.5 }}
                  >
                    {locale === 'tr' ? 'E-POSTA' : 'EMAIL'}
                  </span>
                  <input
                    className="min-w-0 flex-1 border-none bg-transparent text-[13.5px] font-medium text-[#0A0A0A] outline-none placeholder:text-[#A3A3A3]"
                    type="email"
                    placeholder={locale === 'tr' ? 'ulaşmamız için' : 'so we can reach you'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    inputMode="email"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="next"
                    style={{ fontSize: 16 }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2.5">

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

              {/* §38.141 Stage 60 — HANDOFF feedback-flow.jsx `DoneHigh/DoneLow`
                  visual scale: 96×96 lime circle + halo lime gradient blur +
                  2 concentric pulse rings + 6 deterministik confetti dot
                  (Math.random YOK — SSR + reduced-motion friendly). Stage 48
                  §38.129'daki 80×80'den HANDOFF spec birebir 96×96'ya scale.
                  Reduced-motion blanket [style*='bz-done-ring-pulse'] selector
                  ile yakalanır (CLAUDE.md §38.61 paterni). */}
              <div className="relative mx-auto" style={{ width: 96, height: 96 }}>
                {/* Halo lime gradient blur — subtle radial glow background */}
                <span
                  className="pointer-events-none absolute rounded-full"
                  style={{
                    inset: -18,
                    background:
                      'radial-gradient(circle, rgba(198,242,78,0.55) 0%, transparent 70%)',
                    filter: 'blur(12px)',
                  }}
                  aria-hidden
                />
                {/* Concentric pulse rings */}
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
                {/* Center check badge — 96×96 lime circle + drop shadow */}
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-[#C6F24E] shadow-[0_12px_30px_-8px_rgba(198,242,78,0.6)]">
                  <Check
                    size={44}
                    strokeWidth={3.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-[#0A0A0A]"
                  />
                </div>
                {/* 6 deterministik confetti dot — radial scatter, SSR-safe.
                    HANDOFF spec birebir position + size + color. */}
                <span
                  className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-[#C6F24E]"
                  style={{ top: -8, left: -4 }}
                  aria-hidden
                />
                <span
                  className="pointer-events-none absolute h-1 w-1 rounded-full bg-[#0A0A0A]"
                  style={{ top: 5, left: 96 }}
                  aria-hidden
                />
                <span
                  className="pointer-events-none absolute h-2 w-2 rounded-full bg-[#C6F24E]"
                  style={{ top: 80, left: -8 }}
                  aria-hidden
                />
                <span
                  className="pointer-events-none absolute rounded-full bg-[#C6F24E]"
                  style={{ top: 88, left: 100, width: 5, height: 5 }}
                  aria-hidden
                />
                <span
                  className="pointer-events-none absolute h-1 w-1 rounded-full bg-[#0A0A0A]"
                  style={{ top: 50, left: 110 }}
                  aria-hidden
                />
                <span
                  className="pointer-events-none absolute rounded-full bg-[#C6F24E]"
                  style={{ top: 30, left: -14, width: 5, height: 5 }}
                  aria-hidden
                />
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
                  iletişimde bu numarayı paylaşabilir.
                  Stage 57 §38.138 — "Kopyala" button (clipboard API) +
                  low-rating durumunda 24h follow-up footer. */}
              {feedbackId && (
                <div
                  className="relative mx-auto mt-5 overflow-hidden rounded-[14px] border border-[#ECECEC] bg-white text-left"
                  style={{ padding: '14px 16px', maxWidth: 320 }}
                >
                  <span
                    className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-[#C6F24E]"
                    aria-hidden
                  />
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div
                        className="pulse-eyebrow text-[#737373] text-[9px]"
                        style={{ marginBottom: 4 }}
                      >
                        {locale === 'tr' ? 'TALEP NO' : 'REFERENCE'}
                      </div>
                      <div
                        className="text-[15px] font-bold tracking-[0.04em] text-[#0A0A0A]"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {formatReferenceNumber(feedbackId)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={copyReferenceNumber}
                      className="bz-motion-spring inline-flex shrink-0 items-center gap-1 rounded-[10px] bg-[#0A0A0A] px-3 py-2 text-[11px] font-semibold text-white hover:bg-[#1A1A1A] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
                      aria-live="polite"
                      aria-label={
                        refCopied
                          ? locale === 'tr'
                            ? 'Talep numarası kopyalandı'
                            : 'Reference number copied'
                          : locale === 'tr'
                            ? 'Talep numarasını kopyala'
                            : 'Copy reference number'
                      }
                    >
                      {refCopied ? (
                        <>
                          <Check size={11} strokeWidth={2.6} className="text-[#C6F24E]" />
                          {locale === 'tr' ? 'Kopyalandı' : 'Copied'}
                        </>
                      ) : (
                        <>
                          <Copy size={11} strokeWidth={2} />
                          {locale === 'tr' ? 'Kopyala' : 'Copy'}
                        </>
                      )}
                    </button>
                  </div>
                  {/* Low rating 24h follow-up footer — yalnızca düşük puan'da
                      görünür (rating ≤ 3). Müşteriye doğrudan beklenti yönetimi:
                      "yönetim 24 saat içinde dönüş yapacak". Yüksek puan
                      durumda redirect overlay sırasında external platforma
                      gidiyor, thanks ekranı görmüyor (no-platform-URL hariç). */}
                  {rating <= 3 && (
                    <div
                      className="mt-3 flex items-center gap-2.5 border-t border-[#F5F5F5] pt-3 text-[11.5px] text-[#525252]"
                    >
                      <span
                        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5]"
                        aria-hidden
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#0A0A0A" strokeWidth="1.5">
                          <circle cx="6" cy="6" r="4.5" />
                          <path d="M6 4v2.5l1.5 1" />
                        </svg>
                      </span>
                      <span>
                        <strong className="text-[#0A0A0A]">
                          {locale === 'tr' ? '24 saat' : '24 hours'}
                        </strong>
                        {locale === 'tr'
                          ? ' içinde işletme yönetimi seninle iletişime geçecek.'
                          : ' — management will get back to you.'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Stage 57 §38.138 — Cross-platform share thanks ekranı.
                  Restaurant.tripAdvisorUrl + yandexUrl + per-platform enable
                  flag (Stage 10 §38.80 + earlier) — owner panelden URL
                  girilmiş + enable edilmiş + externalPlatformsEnabled true
                  ise CTA'lar render. Müşteri yorumunu external community
                  platformlarda da paylaşabilir. Yüksek puan veya thanks
                  ekranında her durumda görünür (low rating'de bile owner
                  isteyebilir → kullanıcı agency'sine saygı). */}
              {(() => {
                const externalEnabled = restaurant.externalPlatformsEnabled !== false;
                const showTripadvisor =
                  externalEnabled &&
                  restaurant.tripAdvisorUrl &&
                  restaurant.tripAdvisorEnabled !== false;
                const showYandex =
                  externalEnabled &&
                  restaurant.yandexUrl &&
                  restaurant.yandexEnabled !== false;
                if (!showTripadvisor && !showYandex) return null;
                return (
                  <div
                    className="mx-auto mt-3 overflow-hidden rounded-[14px] border border-[#ECECEC] bg-white text-left"
                    style={{ padding: '14px 16px', maxWidth: 320 }}
                  >
                    <div
                      className="pulse-eyebrow text-[#737373] text-[9px]"
                      style={{ marginBottom: 10 }}
                    >
                      {locale === 'tr' ? 'DAHA FAZLASI' : 'MORE WAYS'}
                    </div>
                    {showTripadvisor && (
                      <a
                        href={restaurant.tripAdvisorUrl ?? '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bz-motion-spring flex items-center gap-3 border-b border-[#F5F5F5] py-2.5 last:border-b-0 hover:bg-[#FAFAFA]"
                      >
                        <span
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-white"
                          style={{ background: '#34E0A1' }}
                          aria-hidden
                        >
                          <span
                            className="text-[15px] font-bold leading-none"
                            style={{ fontFamily: 'var(--font-heading)' }}
                          >
                            t
                          </span>
                        </span>
                        <span className="flex-1 text-[13px] font-medium text-[#0A0A0A]">
                          {locale === 'tr'
                            ? "Tripadvisor'da da paylaş"
                            : 'Share on Tripadvisor'}
                        </span>
                        <ExternalLink size={14} className="text-[#A3A3A3]" />
                      </a>
                    )}
                    {showYandex && (
                      <a
                        href={restaurant.yandexUrl ?? '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bz-motion-spring flex items-center gap-3 border-b border-[#F5F5F5] py-2.5 last:border-b-0 hover:bg-[#FAFAFA]"
                      >
                        <span
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-[#0A0A0A]"
                          style={{ background: '#FFCC00' }}
                          aria-hidden
                        >
                          <span
                            className="text-[15px] font-bold leading-none"
                            style={{ fontFamily: 'var(--font-heading)' }}
                          >
                            y
                          </span>
                        </span>
                        <span className="flex-1 text-[13px] font-medium text-[#0A0A0A]">
                          {locale === 'tr'
                            ? 'Yandex Haritalarda paylaş'
                            : 'Share on Yandex Maps'}
                        </span>
                        <ExternalLink size={14} className="text-[#A3A3A3]" />
                      </a>
                    )}
                  </div>
                );
              })()}

              {/* Stage 57 §38.138 — Bottom action grid (Menüye geri dön +
                  Yorumu paylaş Web Share API). "Menüye geri dön" yalnızca
                  Restaurant.menuEnabled && menuPublished iken render edilir
                  (404 önleme). Web Share API mobile native sheet, fallback
                  URL clipboard kopyala (CLAUDE.md §25 mobile patterns). */}
              <div
                className="mx-auto mt-4 grid grid-cols-2 gap-2"
                style={{ maxWidth: 320 }}
              >
                {restaurant.menuEnabled && restaurant.menuPublished ? (
                  <a
                    href={`/menu/${slug}`}
                    className="bz-motion-spring inline-flex items-center justify-center gap-1.5 rounded-[14px] border border-[#ECECEC] bg-white py-3 text-[13px] font-semibold text-[#0A0A0A] hover:bg-[#FAFAFA] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
                  >
                    <Utensils size={14} strokeWidth={1.8} />
                    {locale === 'tr' ? 'Menüye geri dön' : 'Back to menu'}
                  </a>
                ) : (
                  <span aria-hidden />
                )}
                <button
                  type="button"
                  onClick={shareReview}
                  className="bz-motion-spring inline-flex items-center justify-center gap-1.5 rounded-[14px] bg-[#0A0A0A] py-3 text-[13px] font-semibold text-white hover:bg-[#1A1A1A] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
                  style={
                    !restaurant.menuEnabled || !restaurant.menuPublished
                      ? { gridColumn: '1 / -1' }
                      : undefined
                  }
                >
                  <Share2 size={14} strokeWidth={1.8} className="text-[#C6F24E]" />
                  {locale === 'tr' ? 'Yorumu paylaş' : 'Share review'}
                </button>
              </div>
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
  // Stage 57 §38.138 — HANDOFF redirecting overlay polish. Halo (lime
  // gradient blur) + restaurant initial card + 3-dot stagger arrow +
  // platform chip card stack + 5-star eyebrow + status row + bottom
  // jenerik thanks card. Compliance: owner ismi YOK (jenerik "İşletme
  // yönetimi"); müşteri formu doldurmadığı için (high rating direct
  // redirect) name field yok — generic "Şimdiden teşekkürler".
  const initial = restaurantName.charAt(0).toLowerCase();
  return (
    <div className="bz-fade-in fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden bg-[#0A0A0A] px-6 text-center">
      {/* Halo lime gradient — pointer-events-none decorative */}
      <span
        className="pointer-events-none absolute h-[280px] w-[280px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(198,242,78,0.33) 0%, transparent 70%)',
          filter: 'blur(40px)',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
        aria-hidden
      />

      {/* Restaurant initial → 3-dot stagger arrow → platform chip stack */}
      <div className="relative mb-10 flex items-center gap-3">
        <div
          className="flex h-[72px] w-[72px] items-center justify-center rounded-[18px] bg-white shadow-[0_12px_30px_-8px_rgba(0,0,0,0.5)]"
          aria-hidden
        >
          <span
            className="text-[36px] font-medium text-[#0A0A0A]"
            style={{
              fontFamily: 'var(--font-heading)',
              fontStyle: 'italic',
              letterSpacing: '-0.02em',
            }}
          >
            {initial}
          </span>
        </div>
        <div className="flex flex-col items-center gap-0.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-[#C6F24E]"
              style={{
                opacity: 0.4 - i * 0.1,
                animation: `bz-rr-dot 1.2s ease-in-out infinite ${i * 0.15}s`,
              }}
            />
          ))}
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="#C6F24E"
            strokeWidth="2"
            className="mt-1"
            aria-hidden
          >
            <path d="M5 10h10m-3-4l4 4-4 4" />
          </svg>
        </div>
        <div
          className="flex h-[72px] w-[72px] items-center justify-center rounded-[18px] bg-white shadow-[0_12px_30px_-8px_rgba(0,0,0,0.5)]"
          aria-hidden
        >
          <PlatformChip id={platformId} size={42} />
        </div>
      </div>

      {/* "★★★★★ MÜKEMMEL" eyebrow — visual decoration, lime accent */}
      <div className="pulse-eyebrow mb-3 inline-flex items-center gap-2 text-[10px] text-[#A8D62E]">
        <span
          className="h-1.5 w-1.5 rounded-full bg-[#C6F24E]"
          style={{ boxShadow: '0 0 10px #C6F24E' }}
          aria-hidden
        />
        <span aria-hidden>★ ★ ★ ★ ★</span>{' '}
        {locale === 'tr' ? 'MÜKEMMEL' : 'EXCELLENT'}
      </div>

      <h2
        className="bz-h-tight-2 mb-2 text-[24px] text-white"
        style={{ letterSpacing: '-0.02em' }}
      >
        {locale === 'tr' ? 'Yönlendiriliyorsun' : 'Redirecting'}
      </h2>
      <p className="mb-6 max-w-[280px] text-[13px] leading-[1.55] text-white/55">
        {locale === 'tr'
          ? 'Yorumun başkalarına yardımcı olacak. Sayfayı kapatma!'
          : "Your review helps others. Don't close this page!"}
      </p>

      {/* Progress ring + status row — Stage 52 §38.133 1.5s timeout ile
          aligned (eski 2.2s'den keskin transition). bzProgress keyframe
          duration arbitrary class'tan gelir; globals.css tanımı sabit. */}
      <div className="w-[200px]">
        <div className="h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-[#C6F24E] animate-[bzProgress_1.5s_linear_forwards]"
            style={{ width: 0, boxShadow: '0 0 12px #C6F24E' }}
            aria-hidden
          />
        </div>
        <div className="mt-2.5 flex items-center justify-between">
          <span className="pulse-eyebrow text-[9.5px] text-white/40">
            {locale === 'tr' ? 'HAZIRLANIYOR' : 'PREPARING'}
          </span>
          <span className="pulse-eyebrow text-[9.5px] text-[#A8D62E]">
            1.5sn
          </span>
        </div>
      </div>

      {/* Bottom jenerik thanks card. Compliance: owner ismi YOK ("Ahmet"
          hardcoded değil — §38.130 paterni intact). Müşteri form'u
          doldurmadığı için ad da yok — generic "Şimdiden teşekkürler".
          Restaurant initial avatar + label + jenerik İşletme yönetimi. */}
      <div
        className="absolute left-6 right-6 inline-flex items-center gap-2.5 rounded-[16px] border border-white/10 bg-white/5 px-3.5 py-3 backdrop-blur-md"
        style={{ bottom: 'max(36px, calc(env(safe-area-inset-bottom, 0px) + 20px))' }}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#C6F24E]">
          <span
            className="text-[15px] font-medium text-[#0A0A0A]"
            style={{
              fontFamily: 'var(--font-heading)',
              fontStyle: 'italic',
            }}
            aria-hidden
          >
            {initial}
          </span>
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="text-[11.5px] font-semibold text-white">
            {locale === 'tr' ? 'Şimdiden teşekkürler' : 'Thanks in advance'}
          </div>
          <div className="text-[10px] text-white/50">
            {locale === 'tr' ? '— İşletme yönetimi' : '— Management'}
          </div>
        </div>
      </div>
      {/* CSS Performance §38.61 — `@keyframes bzProgress` + `bz-rr-dot`
          globals.css'te tanımlı; reduced-motion blanket selector'leri
          [style*='bz-rr-dot'] + [class*='animate-[bzProgress_'] yakalar. */}
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
