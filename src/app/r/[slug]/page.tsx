'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useParams, useSearchParams, notFound } from 'next/navigation';
import { Star, ArrowRight, Check, Loader2 } from 'lucide-react';
import { getTranslations, Locale, locales } from '@/lib/translations';
import { SYSTEM_FEEDBACK } from '@/lib/constants';
import { buildGoogleReviewUrl } from '@/lib/google-review';
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
  primaryColor: string;
  isActive: boolean;
  // Phase 12.6 — owner-picked fallback when QR has no `?platform=` param.
  // NULL → Google fallback (legacy default).
  defaultRedirectPlatform?: string | null;
}

const RATING_LABELS: Record<Locale, string[]> = {
  tr: ['Çok kötü', 'Kötü', 'İdare eder', 'İyi', 'Mükemmel'],
  en: ['Terrible', 'Poor', 'Okay', 'Good', 'Excellent'],
};

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

  if (loading) return <DarkLoader />;
  if (isNotFound || !restaurant) return notFound();

  // Accepts: raw Place ID (ChIJ…), g.page/r/… link, search.google.com
  // writereview link, or a /maps/place/ URL — see buildGoogleReviewUrl.
  const googleUrl = buildGoogleReviewUrl(restaurant.googlePlaceId);

  const platformUrls: Record<string, string | null> = {
    google: googleUrl,
    yemeksepeti: restaurant.yemekSepetiUrl,
    getir: restaurant.getirYemekUrl,
    trendyol_go: restaurant.trendyolYemekUrl,
    tripadvisor: restaurant.tripAdvisorUrl,
    airbnb: restaurant.airbnbUrl,
  };

  // Resolve the platform: explicit `?platform=` wins, then owner-picked
  // default on the restaurant, finally Google.
  const platformParam =
    explicitPlatform || restaurant.defaultRedirectPlatform || 'google';

  const targetPlatformUrl = platformUrls[platformParam] || googleUrl;
  const fallbackPlatformId = platformParam in platformUrls ? platformParam : 'google';

  const isLow = rating > 0 && rating <= 3;
  const visibleRating = hover || rating;
  const labels = RATING_LABELS[locale] ?? RATING_LABELS.tr;

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
          platform: platformParam || null,
        }),
      });
    } catch (e) {
      console.error('Failed to log high rating', e);
    }

    if (targetPlatformUrl) {
      setRedirecting({ url: targetPlatformUrl, platformId: fallbackPlatformId });
      setTimeout(() => {
        window.location.href = targetPlatformUrl;
      }, 2200);
      return;
    }
    // No platform URL configured — drop straight to thanks
    setStep(3);
  };

  const handleStarClick = (star: number) => {
    setRating(star);
    // 4-5 yıldız tap → tasarım UX'i: doğrudan platforma yönlendir, "Devam et"
    // gerekmez. 200ms delay yıldız fill animasyonunu görmek için.
    if (star >= 4 && !redirecting) {
      setTimeout(() => triggerHighRedirect(star), 200);
    }
  };

  const handleContinue = async () => {
    if (rating === 0) return;
    if (rating >= 4) {
      // Defensive — star tap handler should have triggered this already.
      if (!redirecting) triggerHighRedirect(rating);
      return;
    }
    setStep(2);
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
          platform: platformParam || null,
          aspects: null,
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

      <div className="mx-auto flex min-h-[100dvh] max-w-[360px] flex-col px-6 pb-10 pt-2">
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
              <span className="pulse-eyebrow text-[#737373]">
                {locale === 'tr' ? '1. ADIM' : 'STEP 1'}
              </span>
              <h2 className="bz-h-tight-2 mt-1.5 text-[22px]">
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

              {/* Rating label — design 1:1: yalnızca rating > 0 iken render edilir */}
              {visibleRating > 0 && (
                <div className="bz-fade-in mb-4 text-center text-[13px] text-[#525252]" style={{ minHeight: 20 }}>
                  {labels[visibleRating - 1]}
                </div>
              )}

              {/* Devam et: 1-3 yıldız akışı için. 4-5 yıldız tap doğrudan
                  redirect'i tetikler; bu buton onlar için redundant ama
                  tasarımda görünür kalıyor (aria-disabled rating === 0). */}
              <button
                type="button"
                onClick={handleContinue}
                disabled={rating === 0}
                className="bz-btn-primary w-full justify-center py-3.5 text-[14px]"
              >
                {locale === 'tr' ? 'Devam et' : 'Continue'}
                <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* 4-5 yıldız "Çok teşekkürler" ara ekranı KASTEN kaldırıldı —
              tasarım UX'ine göre yıldız tap'inde doğrudan platforma yönlendir.
              triggerHighRedirect() bunu yapar; redirecting overlay görünür. */}

          {step === 2 && isLow && (
            <div>
              <span className="pulse-eyebrow text-[#737373]">
                {locale === 'tr' ? '2. ADIM' : 'STEP 2'}
              </span>
              <h2 className="bz-h-tight-2 text-[20px]" style={{ marginTop: 6 }}>
                {locale === 'tr' ? 'Bize biraz daha anlatır mısın?' : 'Tell us a little more'}
              </h2>
              <p className="text-[12.5px] leading-[1.55] text-[#525252]" style={{ margin: '8px 0 18px' }}>
                {locale === 'tr'
                  ? 'Geri bildirimin yalnızca işletme yönetimine iletilecek.'
                  : 'Your feedback goes directly to management.'}
              </p>

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
                  placeholder={locale === 'tr' ? 'E-posta (opsiyonel)' : 'Email (optional)'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                />
                <textarea
                  className="bz-input"
                  placeholder={
                    locale === 'tr' ? 'Deneyimini bizimle paylaş…' : 'Share your experience…'
                  }
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  style={{ resize: 'none', fontFamily: 'inherit' }}
                  enterKeyHint="enter"
                />

                {/* KVKK aydınlatma — submit gate; metin admin paneli yönetiminde */}
                <label
                  className="flex gap-2 cursor-pointer"
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
                      className="underline text-[#0A0A0A] hover:text-[#A8D62E]"
                    >
                      {locale === 'tr' ? 'KVKK Aydınlatma Metni' : 'KVKK Privacy Notice'}
                    </a>
                    {locale === 'tr' ? ' ve ' : ' and '}
                    <a
                      href={`/${locale}/acik-riza`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-[#0A0A0A] hover:text-[#A8D62E]"
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
                  className="flex gap-2 cursor-pointer"
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
                      className="underline text-[#0A0A0A] hover:text-[#A8D62E]"
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
                      {locale === 'tr' ? 'Geri bildirimi gönder' : 'Submit feedback'}
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>

                <RecaptchaNotice locale={locale} className="mt-2 text-center text-[10px]" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="bz-fade-in text-center" style={{ padding: '20px 0' }}>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#C6F24E]">
                <Check size={28} strokeWidth={3} className="text-[#0A0A0A]" />
              </div>
              <h2 className="bz-h-tight-2 text-[22px]" style={{ marginTop: 18 }}>
                {locale === 'tr' ? 'Teşekkürler!' : 'Thank you!'}
              </h2>
              <p className="text-[13px] leading-[1.6] text-[#525252]" style={{ margin: '8px 0 0' }}>
                {locale === 'tr'
                  ? 'Geri bildirimin alındı.'
                  : 'Your feedback has been received.'}
              </p>
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

function DarkLoader() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#0A0A0A] text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-full border-2 border-white/15 border-t-[#C6F24E] animate-spin" />
        <span
          className="text-[10px] text-white/40"
          style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}
        >
          Buaze
        </span>
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
      <style jsx>{`
        @keyframes bzProgress {
          from {
            width: 0;
          }
          to {
            width: 100%;
          }
        }
      `}</style>
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
