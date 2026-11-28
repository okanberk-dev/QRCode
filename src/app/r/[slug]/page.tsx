'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useParams, useSearchParams, notFound } from 'next/navigation';
import { Star, Check, Loader2, Copy, MessageCircle, Share2, Utensils, ExternalLink } from 'lucide-react';
import { getTranslations, Locale, locales } from '@/lib/translations';
import { normalizeRedirectMinRating } from '@/lib/constants';
import { buildGoogleReviewUrl } from '@/lib/google-review';
import { resolveBestRedirectPlatform } from '@/lib/platform-redirect-resolver';
import { getRecaptchaToken } from '@/lib/recaptcha-client';
import {
  appendWhatsAppText,
  buildWhatsAppMessage,
  normalizeWhatsAppUrl,
  WHATSAPP_BRAND_GREEN,
} from '@/lib/whatsapp';
import RecaptchaNotice from '@/components/RecaptchaNotice';
import { PlatformChip, PLATFORMS } from '@/components/ui';

// Yüksek puan akışında reCAPTCHA token'ı için üst sınır. Redirect timeout'u
// 1500 ms; token bu süre içinde gelmezse feedback POST'u token'sız (backend
// soft-pass) başlatılır ki kayıt kaybolmasın.
const HIGH_RATING_RECAPTCHA_TIMEOUT_MS = 700;

interface RestaurantData {
  id: string;
  slug: string;
  name: string;
  temporarilyClosed?: boolean;
  closedReason?: string | null;
  category: string;
  address: string | null;
  phone: string | null;
  googlePlaceId: string | null;
  /** Owner'ın panelden elle kaydettiği Google yorum linki. */
  googleReviewUrl?: string | null;
  /** Bu puan ve üstü herkese açık platforma yönlendirilir (4 | 5, default 5). */
  redirectMinRating?: number | null;
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
  // Stage 97 — opt-in WhatsApp channel for low-rating customers
  // (CLAUDE.md §19.1). When `whatsappReviewEnabled === true` AND
  // `whatsappUrl` normalises cleanly, the thanks step (rating ≤ 3)
  // surfaces a "Message us on WhatsApp" button. Always silent-fail:
  // missing/invalid URL hides the button even when the toggle is on.
  whatsappUrl?: string | null;
  whatsappReviewEnabled?: boolean;
  whatsappReviewMessage?: string | null;
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

  // The /r root layout serves lang="tr"; this page picks its language on the
  // client, so keep <html lang> in step (screen readers, CSS uppercase).
  useEffect(() => {
    document.documentElement.lang = locale;
    return () => {
      document.documentElement.lang = 'tr';
    };
  }, [locale]);

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

  if (loading) return <ReviewLoader locale={locale} tableNumber={tableParam} />;
  if (isNotFound || !restaurant) return notFound();

  // Accepts: raw Place ID (ChIJ…), g.page/r/… link, search.google.com
  // writereview link, or a /maps/place/ URL — see buildGoogleReviewUrl.
  //
  // `googleReviewUrl` önce gelir: owner Ayarlar > Platform Bağlantıları'ndan
  // linki elle güncellediğinde SADECE bu alan yazılır (`googlePlaceId` Places
  // doğrulamasına ait ve kasıtlı olarak dokunulmaz). Eskiden burada yalnızca
  // `googlePlaceId` okunuyordu → elle kaydedilen link public akışta hiç
  // kullanılmıyor, müşteri Google yerine başka platforma (veya hiçbir yere)
  // yönlendiriliyordu. Place ID fallback olarak korunur.
  const googleUrl =
    buildGoogleReviewUrl(restaurant.googleReviewUrl ?? null) ??
    buildGoogleReviewUrl(restaurant.googlePlaceId);

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

  // Owner eşiği: bu puan ve üstü herkese açık platforma, altı işletmenin
  // kendi formuna. Varsayılan 5 — yalnız 5 yıldız aktarılır.
  const redirectMinRating = normalizeRedirectMinRating(restaurant.redirectMinRating);
  const isLow = rating > 0 && rating < redirectMinRating;
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
    // Log the high rating (fire-and-forget) — preserves analytics & redirect attribution.
    //
    // §38.B Stage 122 — reCAPTCHA token opportunistically obtained but
    // NOT awaited before redirect. Backend was warning `tokenType:
    // 'undefined'` on every high-rating tap because this callsite
    // never sent a token (only the `handleLowSubmit` path did). The
    // promise chain below resolves the token in the background, then
    // POSTs with `keepalive: true` so the request survives the
    // immediate `window.location.href` redirect that follows. Redirect
    // UX is untouched (no `await`); backend log noise drops.
    //
    // Ek düzeltme: token çözülmesi `fetch`'i BEKLETİYORDU. `keepalive: true`
    // yalnızca ZATEN BAŞLAMIŞ bir isteği unload'dan kurtarır — henüz
    // başlamamış olanı değil. Yavaş bir mobil bağlantıda reCAPTCHA 1500 ms'lik
    // redirect timeout'undan geç dönerse `.then()` hiç çalışmıyor ve yüksek
    // puan kaydı sessizce kayboluyordu (owner'ın yorum sayısı / ortalama puanı
    // eksik kalır, üstelik yalnızca yavaş bağlantılı müşterilerde). Token artık
    // kısa bir timeout ile yarıştırılır: hazırsa gönderilir, değilse `null`
    // gider (backend zaten token yokken soft-pass ediyor) ve POST her hâlükârda
    // redirect'ten çok önce başlatılmış olur.
    const recaptchaRace = Promise.race([
      getRecaptchaToken('feedback_submit').catch(() => null),
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), HIGH_RATING_RECAPTCHA_TIMEOUT_MS),
      ),
    ]);
    recaptchaRace
      .then((recaptchaToken) =>
        fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          body: JSON.stringify({
            rating: selectedRating,
            source: sourceParam,
            branch: restaurant.name,
            tableNumber: tableParam,
            redirected: true,
            restaurantSlug: slug,
            platform: resolution.provider || null,
            recaptchaToken,
          }),
        }),
      )
      .catch((e) => console.error('Failed to log high rating', e));

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
    if (star >= redirectMinRating && !redirecting) {
      setTimeout(() => triggerHighRedirect(star), 200);
    } else if (star > 0) {
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
  // Only the QR label the owner chose (it may be a table, a room or a desk),
  // otherwise the address; no invented context.
  const headerMeta = tableParam || restaurant.address || 'Buaze';

  return (
    <main
      className="flex min-h-[100dvh] flex-col bg-[#F6F6F6] text-[#111110]"
      // 300 ms tap delay off on iOS Safari; double-tap zoom still works.
      style={{ touchAction: 'manipulation' }}
    >
      {redirecting && (
        <RedirectingOverlay
          locale={locale}
          rating={rating}
          platformId={redirecting.platformId}
          restaurantName={restaurant.name}
        />
      )}

      <ReviewHeader initial={initial} name={restaurant.name} meta={headerMeta} />

      <ReviewSheet>
        {/* Owner's "temporarily closed" switch (business settings → Çalışma
            saatleri). Feedback stays open: a closed business can still hear
            from a customer who visited earlier. */}
        {restaurant.temporarilyClosed && (
          <div
            role="status"
            className="mb-5 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-[13px] leading-snug text-[#92400E]"
          >
            <strong className="font-semibold">
              {locale === 'tr' ? 'Geçici olarak kapalıyız.' : 'We are temporarily closed.'}
            </strong>
            {restaurant.closedReason ? ` ${restaurant.closedReason}` : ''}
          </div>
        )}

        <section key={step} className="bz-fade-in flex-1">
          {step === 1 && (
            <div>
              <StepProgress current={1} locale={locale} />

              <p className="mt-6 text-[14px] font-semibold text-[#111110]">
                {locale === 'tr' ? 'Merhaba!' : 'Hello!'}
              </p>
              <h2
                className="mt-1.5 text-[26px] font-bold leading-[1.15] text-[#111110]"
                style={{ ...HEADING_STYLE, textWrap: 'balance' }}
              >
                {locale === 'tr'
                  ? 'Bugünkü deneyimini nasıl puanlardın?'
                  : 'How was your experience today?'}
              </h2>
              <p className="mt-2.5 text-[14px] leading-[1.55] text-[#737373]">
                {locale === 'tr'
                  ? 'Yıldızlara dokun · görüşün anında işletmeye iletilir.'
                  : 'Tap a star · sent directly to the venue.'}
              </p>

              {/* Star card. Every star is a >= 52 px tap target (flex-1 of
                  the card width, h-14); rating >= threshold auto-redirects,
                  lower ratings auto-advance to the form (handleStarClick). */}
              <div className="mt-6 rounded-[24px] bg-[#F6F6F6] px-2 pb-4 pt-5 sm:px-3">
                <div className="flex items-center justify-between gap-1">
                  {[1, 2, 3, 4, 5].map((s) => {
                    const active = s <= visibleRating;
                    const isHover = s === hover && !rating;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleStarClick(s)}
                        onMouseEnter={() => setHover(s)}
                        onMouseLeave={() => setHover(0)}
                        aria-label={`${s} ${locale === 'tr' ? 'yıldız' : 'star'}`}
                        aria-pressed={rating === s}
                        className={`flex h-14 min-w-[44px] flex-1 items-center justify-center rounded-full transition-[scale,background-color] duration-200 ease-out active:scale-90 motion-reduce:transition-none ${
                          active ? 'scale-[1.06]' : ''
                        } ${isHover ? 'bg-white' : ''} ${FOCUS_RING_ON_CANVAS}`}
                      >
                        <Star
                          size={40}
                          strokeWidth={1.5}
                          strokeLinejoin="round"
                          fill={active ? '#111110' : '#D6D6D6'}
                          stroke={active ? '#111110' : '#D6D6D6'}
                          aria-hidden
                        />
                      </button>
                    );
                  })}
                </div>

                <div
                  className="mt-3 flex min-h-[48px] flex-col items-center justify-center gap-0.5 text-center"
                  aria-live="polite"
                >
                  {visibleRating > 0 ? (
                    <>
                      <span className="bz-fade-in text-[17px] font-semibold text-[#111110]">
                        {labels[visibleRating - 1]}
                      </span>
                      <span className="text-[13px] text-[#666666]">
                        {hints[visibleRating - 1]}
                      </span>
                    </>
                  ) : (
                    <span className="text-[13px] text-[#666666]" aria-hidden>
                      ← {locale === 'tr' ? 'seç' : 'pick'} →
                    </span>
                  )}
                </div>
              </div>
              {/* No "continue" button on purpose: handleStarClick advances
                  as soon as a star is chosen. */}
            </div>
          )}

          {/* 4-5 star "thank you" step intentionally removed: a high rating
              goes straight to the chosen platform (triggerHighRedirect shows
              the redirecting overlay). */}

          {step === 2 && isLow && (
            <div>
              <StepProgress current={2} locale={locale} />

              {/* Acknowledgement card. Generic "management" signature, no
                  owner name exposed. */}
              <div className="mt-5 rounded-[24px] bg-[#F4FBDC] px-5 py-4">
                <p className="text-[13px] font-semibold text-[#111110]">
                  {locale === 'tr' ? 'Üzgünüz · İşletme yönetimi' : "We're sorry · Management"}
                </p>
                <p
                  className="mt-1.5 text-[18px] font-semibold leading-[1.3] text-[#111110]"
                  style={HEADING_STYLE}
                >
                  {locale === 'tr'
                    ? '"Söyle, neyi yanlış yaptık?"'
                    : '"Tell us, what did we get wrong?"'}
                </p>
                <p className="mt-1.5 text-[13px] leading-[1.5] text-[#525252]">
                  {locale === 'tr'
                    ? 'Geri bildirimin doğrudan işletme yönetimine ulaşacak.'
                    : 'Your feedback goes directly to the team.'}
                </p>
              </div>

              {/* Improvement tags — ENUM keys whitelisted by the backend,
                  locale-aware labels. */}
              <div className="mt-7">
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <h3
                    className="text-[16px] font-semibold leading-snug text-[#111110]"
                    style={HEADING_STYLE}
                  >
                    {locale === 'tr' ? 'Hangi konularda iyileşmemizi istersin?' : 'What should we work on?'}
                  </h3>
                  <span className="shrink-0 text-[12px] text-[#737373]">
                    {locale === 'tr' ? 'Birden fazla' : 'Pick any'}
                  </span>
                </div>
                <div
                  className="flex flex-wrap gap-2"
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
                        className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-[14px] font-medium transition-colors duration-200 active:scale-95 ${FOCUS_RING} ${
                          selected
                            ? 'bg-[#111110] text-white hover:bg-[#2B2B2A]'
                            : 'bg-[#F6F6F6] text-[#111110] hover:bg-[#F4FBDC]'
                        }`}
                      >
                        {selected && <Check size={15} strokeWidth={2.6} aria-hidden />}
                        {aspectLabels[key]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Comment + quick-pick chips. */}
              <div className="mt-7">
                <div className="mb-2.5 flex items-baseline justify-between gap-3">
                  <label
                    htmlFor="review-comment"
                    className="text-[16px] font-semibold leading-snug text-[#111110]"
                    style={HEADING_STYLE}
                  >
                    {locale === 'tr' ? 'Detayları paylaşır mısın?' : 'Tell us a bit more'}
                  </label>
                  <span className="shrink-0 text-[12px] tabular-nums text-[#737373]">
                    {comment.length} / 500
                  </span>
                </div>
                <div className="relative">
                  <textarea
                    id="review-comment"
                    className="block w-full resize-none rounded-[20px] border border-[#EBEBEB] bg-[#F6F6F6] px-4 pb-9 pt-3.5 text-[16px] leading-[1.5] text-[#111110] outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-[#737373] focus:border-[#111110] focus:bg-white focus:shadow-[0_0_0_4px_rgba(17,17,16,0.14)]"
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
                      // Mobile keyboard avoidance: centre the textarea so the
                      // submit button + consent rows stay reachable once the
                      // keyboard opens. Reduced motion → instant scroll.
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
                    style={{ fontFamily: 'inherit' }}
                    enterKeyHint="enter"
                  />
                </div>
                {/* Quick picks — horizontal scroll that bleeds to the sheet
                    edges (the scroller clips, the page never overflows). */}
                <div
                  className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 py-1 sm:-mx-7 sm:px-7"
                  style={{ scrollSnapType: 'x mandatory', scrollPaddingInline: 20 }}
                  role="group"
                  aria-label={locale === 'tr' ? 'Hızlı seçimler' : 'Quick picks'}
                >
                  {presetChips.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => appendPresetToComment(preset)}
                      className="inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-full border border-[#E3F4A6] bg-white px-3.5 text-[13px] font-medium text-[#111110] transition-colors duration-200 hover:bg-[#F4FBDC] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#111110]"
                      style={{ scrollSnapAlign: 'start' }}
                    >
                      <span aria-hidden>+</span>
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact — both fields optional; POST body unchanged. */}
              <div className="mt-6 flex flex-col gap-4">
                <div>
                  <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
                    <label htmlFor="review-name" className="text-[14px] font-semibold text-[#111110]">
                      {locale === 'tr' ? 'Ad' : 'Name'}
                    </label>
                    <span className="text-[12px] text-[#737373]">
                      {locale === 'tr' ? 'İsteğe bağlı' : 'Optional'}
                    </span>
                  </div>
                  <input
                    id="review-name"
                    className={FIELD_CLASS}
                    placeholder={locale === 'tr' ? 'Adın' : 'Your name'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    autoCapitalize="words"
                    enterKeyHint="next"
                  />
                </div>
                <div>
                  <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
                    <label htmlFor="review-email" className="text-[14px] font-semibold text-[#111110]">
                      {locale === 'tr' ? 'E-posta' : 'Email'}
                    </label>
                  </div>
                  <input
                    id="review-email"
                    className={FIELD_CLASS}
                    type="email"
                    placeholder={locale === 'tr' ? 'yanıt için, isteğe bağlı' : 'for a reply, optional'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    inputMode="email"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="next"
                    aria-describedby="feedback-email-hint"
                  />
                  {/* Why leave an email (CLAUDE.md §57): only ~39% of private
                      feedback carried contact info, so the owner could not reply. */}
                  <p id="feedback-email-hint" className="mt-2 px-1 text-[12.5px] leading-[1.5] text-[#737373]">
                    {locale === 'tr'
                      ? 'E-posta bırakırsan işletme sana doğrudan yanıt verebilir. İzin vermedikçe kampanya e-postası gönderilmez.'
                      : 'Leave your email and the business can reply to you directly. No marketing emails unless you allow them.'}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-1">
                {/* KVKK notice — submit gate; text managed in the admin panel */}
                <label className="flex cursor-pointer items-start gap-3 py-1.5 text-[13px] leading-[1.5] text-[#525252]">
                  <input
                    type="checkbox"
                    checked={kvkk}
                    onChange={(e) => setKvkk(e.target.checked)}
                    className={CHECKBOX_CLASS}
                    aria-required="true"
                  />
                  <span>
                    {locale === 'tr' ? 'Okudum, anladım — ' : 'I have read and understood the '}
                    <a
                      href={`/${locale}/kvkk`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={LEGAL_LINK_CLASS}
                    >
                      {locale === 'tr' ? 'KVKK Aydınlatma Metni' : 'KVKK Privacy Notice'}
                    </a>
                    {locale === 'tr' ? ' ve ' : ' and '}
                    <a
                      href={`/${locale}/acik-riza`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={LEGAL_LINK_CLASS}
                    >
                      {locale === 'tr' ? 'Açık Rıza Metni' : 'Explicit Consent'}
                    </a>
                    {locale === 'tr'
                      ? ' kapsamında verilerimin işlenmesine açık rıza veriyorum.'
                      : ' and grant explicit consent for processing.'}
                  </span>
                </label>
                {/* Marketing consent — opt-in, unchecked by default (KVKK Açık Rıza + ETK m.6) */}
                <label className="flex cursor-pointer items-start gap-3 py-1.5 text-[13px] leading-[1.5] text-[#525252]">
                  <input
                    type="checkbox"
                    checked={marketing}
                    onChange={(e) => setMarketing(e.target.checked)}
                    className={CHECKBOX_CLASS}
                  />
                  <span>
                    {locale === 'tr' ? 'Kampanya ve duyurular için ' : 'For campaigns and announcements I accept the '}
                    <a
                      href={`/${locale}/ticari-ileti`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={LEGAL_LINK_CLASS}
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
                  <div
                    role="alert"
                    className="mt-2 flex items-start gap-2.5 rounded-2xl bg-[#FEF3F2] px-4 py-3 text-[13px] leading-[1.45] text-[#B42318]"
                  >
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#D92D20]" aria-hidden />
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleLowSubmit}
                  disabled={submitting || !kvkk}
                  aria-busy={submitting || undefined}
                  className={`mt-4 inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-full bg-[#111110] px-6 text-[16px] font-semibold text-white transition-[background-color,scale] duration-200 hover:bg-[#2B2B2A] active:scale-[0.98] disabled:cursor-not-allowed ${
                    kvkk ? 'disabled:hover:bg-[#111110]' : 'disabled:bg-[#EBEBEB] disabled:text-[#737373]'
                  } ${FOCUS_RING}`}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" aria-hidden />
                      <span className="sr-only">
                        {locale === 'tr' ? 'Gönderiliyor…' : 'Sending…'}
                      </span>
                    </>
                  ) : locale === 'tr' ? (
                    'Geri bildirimi gönder'
                  ) : (
                    'Submit feedback'
                  )}
                </button>

                <RecaptchaNotice locale={locale} className="mt-3 text-center" />

                {/* Public platform link — offered in the low-rating flow TOO.
                    Buaze's compliance stance (/google-compliance) says every
                    customer is offered the public platform links; this block
                    keeps that true and closes the Google review-gating risk
                    (CLAUDE.md §19.1.1). Deliberately secondary: the primary
                    action is private feedback; a public review is the
                    customer's own choice, no nudging. */}
                {targetPlatformUrl && (
                  <div className="mt-5 border-t border-[#EBEBEB] pt-5 text-center">
                    <p className="text-[13px] leading-[1.5] text-[#737373]">
                      {locale === 'tr'
                        ? 'Görüşünü herkese açık olarak da paylaşmak istersen:'
                        : 'If you would also like to share your feedback publicly:'}
                    </p>
                    <a
                      href={targetPlatformUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`mt-1 inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full px-3 text-[14px] font-semibold text-[#111110] underline decoration-[#E3F4A6] decoration-2 underline-offset-4 transition-colors duration-200 hover:decoration-[#111110] ${FOCUS_RING}`}
                    >
                      {locale === 'tr'
                        ? `${PLATFORMS[fallbackPlatformId]?.label ?? 'Google'} üzerinde yorum yaz`
                        : `Write a review on ${PLATFORMS[fallbackPlatformId]?.label ?? 'Google'}`}
                      <span aria-hidden>→</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="bz-fade-in text-center">
              <div className="text-left">
                <StepProgress current={3} locale={locale} />
              </div>

              {/* Success mark — purple disc + two soft rings (the rings stop
                  under prefers-reduced-motion via the global
                  [style*='bz-done-ring-pulse'] blanket). Deterministic
                  confetti dots: SSR-safe, no Math.random. */}
              <div className="relative mx-auto mt-10" style={{ width: 88, height: 88 }}>
                <span
                  className="pointer-events-none absolute rounded-full"
                  style={{
                    inset: -22,
                    background: 'radial-gradient(circle, rgba(17,17,16,0.18) 0%, transparent 70%)',
                  }}
                  aria-hidden
                />
                <span
                  className="absolute inset-0 rounded-full bg-[#E3F4A6]"
                  style={{ animation: 'bz-done-ring-pulse 1.6s ease-out infinite', transformOrigin: 'center' }}
                  aria-hidden
                />
                <span
                  className="absolute inset-2 rounded-full bg-[#E3F4A6]"
                  style={{ animation: 'bz-done-ring-pulse 1.6s ease-out 0.4s infinite', transformOrigin: 'center' }}
                  aria-hidden
                />
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-[#111110]">
                  <Check
                    size={40}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white"
                    aria-hidden
                  />
                </div>
                {CONFETTI_DOTS.map((dot, i) => (
                  <span
                    key={i}
                    className="pointer-events-none absolute rounded-full"
                    style={{ top: dot.top, left: dot.left, width: dot.size, height: dot.size, background: dot.color }}
                    aria-hidden
                  />
                ))}
              </div>
              <h2 className="mt-7 text-[24px] font-bold leading-tight text-[#111110]" style={HEADING_STYLE}>
                {locale === 'tr' ? 'Sesin bize ulaştı' : 'We hear you'}
              </h2>
              <p className="mx-auto mt-2.5 max-w-[320px] text-[14px] leading-[1.6] text-[#737373]">
                {locale === 'tr'
                  ? 'Geri bildirimin doğrudan işletme yönetiminin paneline ulaştırıldı.'
                  : 'Your feedback was delivered directly to the management dashboard.'}
              </p>

              {/* Reference number (derived from the feedback id) + copy. */}
              {feedbackId && (
                <div className="mx-auto mt-6 w-full max-w-[360px] rounded-[24px] bg-[#F6F6F6] p-4 text-left">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[12px] text-[#666666]">
                        {locale === 'tr' ? 'Talep no' : 'Reference'}
                      </div>
                      <div className="mt-0.5 truncate text-[17px] font-semibold tabular-nums tracking-[0.02em] text-[#111110]">
                        {formatReferenceNumber(feedbackId)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={copyReferenceNumber}
                      className={`inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-semibold text-[#111110] transition-colors duration-200 hover:bg-[#F4FBDC] active:scale-95 ${FOCUS_RING_ON_CANVAS}`}
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
                          <Check size={14} strokeWidth={2.6} className="text-[#23863A]" aria-hidden />
                          {locale === 'tr' ? 'Kopyalandı' : 'Copied'}
                        </>
                      ) : (
                        <>
                          <Copy size={14} strokeWidth={2} aria-hidden />
                          {locale === 'tr' ? 'Kopyala' : 'Copy'}
                        </>
                      )}
                    </button>
                  </div>
                  {/* Low-rating follow-up line — only below the redirect
                      threshold (high ratings leave for the platform). */}
                  {isLow && (
                    <div className="mt-3 flex items-center gap-2.5 border-t border-[#EBEBEB] pt-3 text-[13px] leading-[1.45] text-[#525252]">
                      <span
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white"
                        aria-hidden
                      >
                        <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="#111110" strokeWidth="1.5">
                          <circle cx="6" cy="6" r="4.5" />
                          <path d="M6 4v2.5l1.5 1" />
                        </svg>
                      </span>
                      <span>
                        {locale === 'tr'
                          ? 'Mesajın doğrudan işletme yönetimine iletildi.'
                          : 'Your message went straight to the business.'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Other community platforms the owner enabled (per-platform
                  URL + enabled flag + externalPlatformsEnabled master gate).
                  Shown in every thanks state — the customer's own choice. */}
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
                  <div className="mx-auto mt-3 w-full max-w-[360px] rounded-[24px] bg-[#F6F6F6] p-2 text-left">
                    <div className="px-3 pb-1 pt-2 text-[12px] text-[#666666]">
                      {locale === 'tr' ? 'Daha fazlası' : 'More ways'}
                    </div>
                    {showTripadvisor && (
                      <a
                        href={restaurant.tripAdvisorUrl ?? '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex min-h-[52px] items-center gap-3 rounded-2xl px-3 py-2 transition-colors duration-200 hover:bg-white ${FOCUS_RING_ON_CANVAS}`}
                      >
                        <span
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
                          style={{ background: '#34E0A1' }}
                          aria-hidden
                        >
                          <span className="text-[15px] font-bold leading-none">t</span>
                        </span>
                        <span className="flex-1 text-[14px] font-medium text-[#111110]">
                          {locale === 'tr'
                            ? "Tripadvisor'da da paylaş"
                            : 'Share on Tripadvisor'}
                        </span>
                        <ExternalLink size={15} className="text-[#737373]" aria-hidden />
                      </a>
                    )}
                    {showYandex && (
                      <a
                        href={restaurant.yandexUrl ?? '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex min-h-[52px] items-center gap-3 rounded-2xl px-3 py-2 transition-colors duration-200 hover:bg-white ${FOCUS_RING_ON_CANVAS}`}
                      >
                        <span
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#111110]"
                          style={{ background: '#FFCC00' }}
                          aria-hidden
                        >
                          <span className="text-[15px] font-bold leading-none">y</span>
                        </span>
                        <span className="flex-1 text-[14px] font-medium text-[#111110]">
                          {locale === 'tr'
                            ? 'Yandex Haritalarda paylaş'
                            : 'Share on Yandex Maps'}
                        </span>
                        <ExternalLink size={15} className="text-[#737373]" aria-hidden />
                      </a>
                    )}
                  </div>
                );
              })()}

              {/* WhatsApp opt-in for low-rating customers (CLAUDE.md §19.1).
                  The URL is re-validated here, so a bad/cleared URL hides the
                  button even with the toggle on. Opens wa.me in a new tab with
                  a pre-filled message; never auto-redirects. */}
              {(() => {
                if (!isLow) return null;
                if (!restaurant.whatsappReviewEnabled) return null;
                const normalized = normalizeWhatsAppUrl(restaurant.whatsappUrl ?? '');
                if (!normalized.ok) return null;
                const ref = feedbackId
                  ? formatReferenceNumber(feedbackId)
                  : 'BZ-NEW';
                const message = buildWhatsAppMessage({
                  template: restaurant.whatsappReviewMessage ?? null,
                  restaurantName: restaurant.name,
                  rating,
                  referenceNumber: ref,
                  locale,
                });
                const href = appendWhatsAppText(normalized.url, message);
                return (
                  <div className="mx-auto mt-4 flex w-full max-w-[360px] justify-center">
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={
                        locale === 'tr'
                          ? 'WhatsApp ile iletişime geç'
                          : 'Message us on WhatsApp'
                      }
                      className={`inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[#F6F6F6] px-5 text-[14px] font-semibold text-[#111110] transition-colors duration-200 hover:bg-[#F4FBDC] active:scale-[0.98] ${FOCUS_RING}`}
                    >
                      <MessageCircle
                        size={16}
                        strokeWidth={2.2}
                        style={{ color: WHATSAPP_BRAND_GREEN }}
                        aria-hidden
                      />
                      {locale === 'tr'
                        ? 'WhatsApp ile iletişime geç'
                        : 'Message us on WhatsApp'}
                    </a>
                  </div>
                );
              })()}

              {/* Bottom actions: "Back to menu" only when the public menu is
                  live (avoids a 404); "Share" uses the Web Share API with a
                  clipboard fallback. */}
              <div className="mx-auto mt-4 grid w-full max-w-[360px] grid-cols-2 gap-2">
                {restaurant.menuEnabled && restaurant.menuPublished ? (
                  <a
                    href={`/menu/${slug}`}
                    className={`inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-full bg-[#F6F6F6] px-3 py-2 text-center text-[14px] font-semibold leading-tight text-[#111110] transition-colors duration-200 hover:bg-[#F4FBDC] active:scale-[0.98] ${FOCUS_RING}`}
                  >
                    <Utensils size={15} strokeWidth={1.8} className="shrink-0" aria-hidden />
                    {locale === 'tr' ? 'Menüye geri dön' : 'Back to menu'}
                  </a>
                ) : (
                  <span aria-hidden />
                )}
                <button
                  type="button"
                  onClick={shareReview}
                  className={`inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-full bg-[#111110] px-3 py-2 text-center text-[14px] font-semibold leading-tight text-white transition-colors duration-200 hover:bg-[#2B2B2A] active:scale-[0.98] ${FOCUS_RING}`}
                  style={
                    !restaurant.menuEnabled || !restaurant.menuPublished
                      ? { gridColumn: '1 / -1' }
                      : undefined
                  }
                >
                  <Share2 size={15} strokeWidth={1.8} className="shrink-0" aria-hidden />
                  {locale === 'tr' ? 'Yorumu paylaş' : 'Share review'}
                </button>
              </div>
            </div>
          )}
        </section>

        <footer className="mt-8 text-center text-[12px] text-[#737373]">
          Powered by <span className="font-semibold text-[#111110]">Buaze</span>
        </footer>
      </ReviewSheet>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────
// Visual building blocks (purple + white public review design)
// ─────────────────────────────────────────────────────────────

// Headings use the body font (Inter): the business name is the owner's own
// content, and the site heading face is licensed for Buaze's own pages only
// (CLAUDE.md §11). `:where(h1..h6)` sits in @layer base, so this wins.
const HEADING_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  letterSpacing: '-0.02em',
};

// Keyboard focus — purple ring offset from white (sheet) or #F6F6F6 (cards).
const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111110] focus-visible:ring-offset-2 focus-visible:ring-offset-white';
const FOCUS_RING_ON_CANVAS =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#111110] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F6F6F6]';

// 16 px text so iOS Safari never zooms on focus.
const FIELD_CLASS =
  'block h-[52px] w-full rounded-2xl border border-[#EBEBEB] bg-[#F6F6F6] px-4 text-[16px] font-medium text-[#111110] outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:font-normal placeholder:text-[#737373] focus:border-[#111110] focus:bg-white focus:shadow-[0_0_0_4px_rgba(17,17,16,0.14)]';

const CHECKBOX_CLASS =
  'mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[#111110] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111110]';

const LEGAL_LINK_CLASS =
  'font-medium text-[#111110] underline underline-offset-2 hover:text-[#2B2B2A]';

const CONFETTI_DOTS: { top: number; left: number; size: number; color: string }[] = [
  { top: -8, left: -4, size: 6, color: '#111110' },
  { top: 4, left: 92, size: 4, color: '#000000' },
  { top: 78, left: -10, size: 8, color: '#E3F4A6' },
  { top: 86, left: 96, size: 5, color: '#111110' },
  { top: 48, left: 106, size: 4, color: '#E3F4A6' },
  { top: 28, left: -16, size: 5, color: '#000000' },
];

function StepProgress({ current, locale }: { current: 1 | 2 | 3; locale: Locale }) {
  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0 text-[13px] font-medium tabular-nums text-[#737373]">
        {locale === 'tr' ? 'Adım' : 'Step'} {current} / 3
      </span>
      <div className="flex flex-1 gap-1.5" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i <= current ? 'bg-[#111110]' : 'bg-[#EBEBEB]'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// Purple band carrying the business identity. The white sheet below overlaps
// its bottom edge (ReviewSheet -mt-6).
function ReviewHeader({
  initial,
  name,
  meta,
}: {
  initial: string;
  name: string;
  meta: string;
}) {
  return (
    <header
      className="shrink-0 bg-[#111110] text-white"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="mx-auto flex w-full max-w-[440px] items-center gap-3 px-5 pb-12 pt-5 sm:px-7 sm:pt-8">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[20px] font-bold text-[#111110]"
          aria-hidden
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[18px] font-semibold leading-tight text-white" style={HEADING_STYLE}>
            {name}
          </h1>
          <p className="mt-1 truncate text-[13px] leading-tight text-white/80">{meta}</p>
        </div>
        <span
          className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-medium text-white"
          aria-hidden
        >
          TR · EN
        </span>
      </div>
    </header>
  );
}

// White sheet: full-bleed with rounded top on phones, a floating 440 px card
// on wider screens.
function ReviewSheet({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative z-[1] -mt-6 flex w-full min-w-0 flex-1 flex-col rounded-t-[28px] bg-white px-5 pt-6 sm:mx-auto sm:mb-10 sm:max-w-[440px] sm:flex-none sm:rounded-[28px] sm:px-7 sm:pt-7 ${className}`}
      style={{ paddingBottom: 'max(28px, calc(env(safe-area-inset-bottom, 0px) + 20px))' }}
    >
      {children}
    </div>
  );
}

// Loading state (data fetch + Suspense fallback): same purple band + white
// sheet as the page, so nothing jumps when the content arrives.
function ReviewLoader({
  locale = 'tr' as Locale,
  tableNumber = '',
}: {
  locale?: Locale;
  tableNumber?: string;
}) {
  return (
    <main className="flex min-h-[100dvh] flex-col bg-[#F6F6F6]" aria-busy="true">
      <header
        className="shrink-0 bg-[#111110]"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div
          className="mx-auto flex w-full max-w-[440px] items-center gap-3 px-5 pb-12 pt-5 sm:px-7 sm:pt-8"
          aria-hidden
        >
          <div className="h-12 w-12 shrink-0 rounded-full bg-white/20" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-36 max-w-full rounded-full bg-white/25" />
            <div className="h-3 w-20 max-w-full rounded-full bg-white/15" />
          </div>
        </div>
      </header>
      <ReviewSheet className="items-center justify-center py-16 text-center">
        <div className="relative h-14 w-14" aria-hidden>
          <div className="absolute inset-0 rounded-full border-[3px] border-[#F4FBDC]" />
          <div
            className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-[#111110]"
            style={{ animation: 'bz-rr-spin 0.9s linear infinite' }}
          />
        </div>
        <p className="mt-5 text-[16px] font-semibold text-[#111110]" role="status">
          {locale === 'tr' ? 'Hazırlanıyor…' : 'Loading…'}
        </p>
        <p className="mt-1 text-[13px] text-[#737373]">{tableNumber || 'Buaze'}</p>
      </ReviewSheet>
    </main>
  );
}

function RedirectingOverlay({
  locale,
  rating,
  platformId,
  restaurantName,
}: {
  locale: Locale;
  rating: number;
  platformId: string;
  restaurantName: string;
}) {
  // High rating → platform hand-off. Business initial → animated dots →
  // official platform chip, then a short progress bar. Generic "management"
  // thanks card (no owner name; the customer filled no form, so no name).
  const initial = restaurantName.charAt(0).toUpperCase();
  return (
    <div className="bz-fade-in fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden bg-[#111110] px-6 text-center text-white">
      {/* Soft light behind the hand-off cards — decorative */}
      <span
        className="pointer-events-none absolute h-[320px] w-[320px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.16) 0%, transparent 70%)',
          top: '32%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
        aria-hidden
      />

      <div className="relative mb-10 flex items-center gap-4" aria-hidden>
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-white">
          <span className="text-[32px] font-bold text-[#111110]">{initial}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-white"
              style={{ animation: `bz-rr-dot 1.2s ease-in-out infinite ${i * 0.15}s` }}
            />
          ))}
        </div>
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-white">
          <PlatformChip id={platformId} size={42} />
        </div>
      </div>

      <div className="mb-3 inline-flex items-center gap-2 text-[13px] font-medium text-white/90">
        <span className="tracking-[0.12em]" aria-hidden>{'★'.repeat(Math.max(1, Math.min(5, rating)))}</span>
        {RATING_LABELS[locale][Math.max(1, Math.min(5, rating)) - 1]}
      </div>

      <h2 className="mb-2 text-[26px] font-bold leading-tight text-white" style={HEADING_STYLE}>
        {locale === 'tr' ? 'Yönlendiriliyorsun' : 'Redirecting'}
      </h2>
      <p className="mb-7 max-w-[300px] text-[14px] leading-[1.55] text-white/80">
        {locale === 'tr'
          ? 'Yorumun başkalarına yardımcı olacak. Sayfayı kapatma!'
          : "Your review helps others. Don't close this page!"}
      </p>

      {/* 1.5 s progress, aligned with the redirect timeout. The animate-[…]
          class is in the global reduced-motion blanket. */}
      <div className="w-[220px] max-w-full">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-white animate-[bzProgress_1.5s_linear_forwards]"
            style={{ width: 0 }}
            aria-hidden
          />
        </div>
        <div className="mt-2.5 flex items-center justify-between text-[12px] text-white/80">
          <span>{locale === 'tr' ? 'Hazırlanıyor' : 'Preparing'}</span>
          <span className="tabular-nums">1.5sn</span>
        </div>
      </div>

      <div
        className="absolute left-5 right-5 mx-auto flex max-w-[400px] items-center gap-3 rounded-[20px] bg-white/10 px-4 py-3"
        style={{ bottom: 'max(32px, calc(env(safe-area-inset-bottom, 0px) + 20px))' }}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white" aria-hidden>
          <span className="text-[15px] font-bold text-[#111110]">{initial}</span>
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="text-[13px] font-semibold text-white">
            {locale === 'tr' ? 'Şimdiden teşekkürler' : 'Thanks in advance'}
          </div>
          <div className="text-[12px] text-white/80">
            {locale === 'tr' ? '— İşletme yönetimi' : '— Management'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SlugPage() {
  return (
    <Suspense fallback={<ReviewLoader />}>
      <ReviewContent />
    </Suspense>
  );
}
