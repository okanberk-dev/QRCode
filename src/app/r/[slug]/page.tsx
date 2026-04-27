'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useParams, useSearchParams, notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Star,
  ArrowRight,
  ArrowUpRight,
  Check,
  X,
  ShieldCheck,
  Mail,
  Loader2,
} from 'lucide-react';
import { getTranslations, Locale, locales } from '@/lib/translations';
import { SYSTEM_FEEDBACK } from '@/lib/constants';
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
  const [phone, setPhone] = useState('');
  const [comment, setComment] = useState('');
  // KVKK ve iletişim izni varsayılan olarak işaretli — kullanıcı isteği üzerine.
  // Kullanıcı isterse manuel olarak kaldırabilir; KVKK işaretsizse submit kilitlidir.
  const [kvkk, setKvkk] = useState(true);
  const [marketing, setMarketing] = useState(true);
  const [website, setWebsite] = useState(''); // honeypot

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState<{ url: string; platformId: string } | null>(null);
  const [showLegal, setShowLegal] = useState<'kvkk' | 'marketing' | null>(null);

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

  useEffect(() => {
    if (showLegal) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [showLegal]);

  if (loading) return <DarkLoader />;
  if (isNotFound || !restaurant) return notFound();

  const googleUrl = restaurant.googlePlaceId
    ? restaurant.googlePlaceId.startsWith('http')
      ? restaurant.googlePlaceId
      : `https://search.google.com/local/writereview?placeid=${restaurant.googlePlaceId}`
    : null;

  const platformUrls: Record<string, string | null> = {
    google: googleUrl,
    yemeksepeti: restaurant.yemekSepetiUrl,
    getir: restaurant.getirYemekUrl,
    trendyol_go: restaurant.trendyolYemekUrl,
  };

  // Resolve the platform: explicit `?platform=` wins, then owner-picked
  // default on the restaurant, finally Google.
  const platformParam =
    explicitPlatform || restaurant.defaultRedirectPlatform || 'google';

  const targetPlatformUrl = platformUrls[platformParam] || googleUrl;
  const fallbackPlatformId = platformParam in platformUrls ? platformParam : 'google';

  const isHigh = rating >= 4;
  const isLow = rating > 0 && rating <= 3;
  const visibleRating = hover || rating;
  const labels = RATING_LABELS[locale] ?? RATING_LABELS.tr;

  const handleStarClick = (star: number) => {
    setRating(star);
  };

  const handleContinue = async () => {
    if (rating === 0) return;

    if (isHigh) {
      // Log the high rating (fire-and-forget) — preserves analytics & redirect attribution
      try {
        fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rating,
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
      return;
    }

    setStep(2);
  };

  const handleLowSubmit = async () => {
    if (!comment.trim()) {
      setError(t('feedback_error_comment'));
      return;
    }
    if (!name.trim()) {
      setError(t('feedback_error_name'));
      return;
    }
    if (!phone.trim() && !email.trim()) {
      setError(t('feedback_error_contact'));
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
          phone: phone.trim() || null,
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

      <div className="mx-auto flex min-h-[100dvh] max-w-[420px] flex-col px-6 pb-10 pt-8 sm:px-4">
        {/* Brand header */}
        <header className="mb-6 text-center sm:mb-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-[26px] font-bold text-[#0A0A0A] shadow-[0_8px_24px_rgba(0,0,0,0.35)]" style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.03em' }}>
            {initial}
          </div>
          <h1 className="mt-4 text-[22px] font-bold text-white" style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}>{restaurant.name}</h1>
          {restaurant.address && (
            <p className="mt-1 text-[12px] text-white/55">{restaurant.address}</p>
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

              <div className="flex items-center justify-center gap-1.5 py-4">
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
                        strokeWidth={1.5}
                        className={
                          active
                            ? 'fill-[#C6F24E] text-[#C6F24E]'
                            : 'fill-transparent text-[#E5E5E5]'
                        }
                      />
                    </button>
                  );
                })}
              </div>

              <div className="mb-4 min-h-[20px] text-center text-[13px] text-[#525252]">
                {visibleRating > 0 ? labels[visibleRating - 1] : ''}
              </div>

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

          {step === 2 && isHigh && (
            <div className="text-center">
              <div className="mb-2 text-[48px] leading-none">🎉</div>
              <h2 className="bz-h-tight-2 text-[22px]">
                {locale === 'tr' ? 'Çok teşekkürler!' : 'Thank you so much!'}
              </h2>
              <p className="mx-auto mt-2 mb-4 max-w-[300px] text-[13px] leading-[1.6] text-[#525252]">
                {locale === 'tr'
                  ? "Yorumunu Google'da paylaşır mısın? Diğer müşterilerin de görmesi bizim için çok değerli."
                  : 'Would you share your review on Google? It really helps other customers find us.'}
              </p>
              {googleUrl ? (
                <a
                  href={googleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    // If the user manually clicks Google, log the high rating
                    try {
                      fetch('/api/feedback', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          rating,
                          source: sourceParam,
                          branch: restaurant.name,
                          tableNumber: tableParam,
                          comment: SYSTEM_FEEDBACK.HIGH_RATING_REDIRECT,
                          restaurantSlug: slug,
                          platform: 'google',
                        }),
                      });
                    } catch {}
                  }}
                  className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#0A0A0A] px-4 py-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#1A1A1A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
                >
                  <PlatformChip id="google" size={20} />
                  {locale === 'tr' ? "Google'da yorum bırak" : 'Review on Google'}
                  <ArrowUpRight size={14} />
                </a>
              ) : (
                <p className="rounded-xl bg-[#FAFAFA] px-4 py-3 text-[12px] text-[#737373]">
                  {locale === 'tr'
                    ? 'Yönlendirilebilecek bir platform bulunamadı.'
                    : 'No platform link is available.'}
                </p>
              )}
              <button
                type="button"
                onClick={() => setStep(3)}
                className="mt-3 cursor-pointer border-0 bg-transparent text-[12px] text-[#737373] hover:text-[#0A0A0A]"
              >
                {locale === 'tr' ? 'Belki sonra' : 'Maybe later'}
              </button>
            </div>
          )}

          {step === 2 && isLow && (
            <div>
              <span className="pulse-eyebrow text-[#737373]">
                {locale === 'tr' ? '2. ADIM' : 'STEP 2'}
              </span>
              <h2 className="bz-h-tight-2 mt-1.5 text-[20px]">
                {locale === 'tr' ? 'Bize biraz daha anlatır mısın?' : 'Tell us a little more'}
              </h2>
              <p className="mt-2 mb-4 text-[12.5px] leading-[1.55] text-[#525252]">
                {locale === 'tr'
                  ? 'Geri bildirimin yalnızca işletme yönetimine iletilecek. Daha iyisini sunabilmemiz için yardım et.'
                  : 'Your feedback goes directly to management — help us do better.'}
              </p>

              <div className="flex flex-col gap-2.5">
                <input
                  className="bz-input"
                  placeholder={t('feedback_name_placeholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
                <input
                  className="bz-input"
                  type="email"
                  placeholder={t('feedback_email_placeholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                <input
                  className="bz-input"
                  type="tel"
                  placeholder={t('feedback_phone_placeholder')}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                />
                <textarea
                  className="bz-input"
                  placeholder={
                    locale === 'tr' ? 'Deneyimini bizimle paylaş…' : 'Share your experience…'
                  }
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  style={{ resize: 'none' }}
                />

                <ConsentRow
                  checked={kvkk}
                  onToggle={() => setKvkk((v) => !v)}
                  required
                  onOpenLegal={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowLegal('kvkk');
                  }}
                  label={
                    locale === 'tr'
                      ? 'KVKK kapsamında verilerimin işletmeyle paylaşılmasını kabul ediyorum.'
                      : 'I consent to sharing my data with the business under KVKK.'
                  }
                  legalLabel={locale === 'tr' ? 'Aydınlatma metnini oku' : 'Read the privacy notice'}
                />
                <ConsentRow
                  checked={marketing}
                  onToggle={() => setMarketing((v) => !v)}
                  onOpenLegal={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowLegal('marketing');
                  }}
                  label={
                    locale === 'tr'
                      ? 'Kampanya ve duyurulardan haberdar olmak istiyorum (opsiyonel).'
                      : "I'd like to receive promotions and announcements (optional)."
                  }
                  legalLabel={locale === 'tr' ? 'İletişim iznini oku' : 'Read marketing consent'}
                />

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
            <div className="py-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#C6F24E]">
                <Check size={28} strokeWidth={3} className="text-[#0A0A0A]" />
              </div>
              <h2 className="bz-h-tight-2 mt-4 text-[22px]">{t('feedback_thank_you')}</h2>
              <p className="mx-auto mt-2 max-w-[280px] text-[13px] leading-[1.6] text-[#525252]">
                {locale === 'tr'
                  ? 'Geri bildirimin alındı. Tekrar görüşmek üzere.'
                  : 'Your feedback has been received. See you soon.'}
              </p>
            </div>
          )}
        </section>

        {/* Buaze badge + legal links */}
        <footer className="mt-auto pt-8 text-center">
          <div className="flex items-center justify-center gap-4 text-[10px] text-white/40" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            <Link href={`/${locale}/privacy`} className="transition-colors hover:text-white/70">
              {locale === 'tr' ? 'Gizlilik' : 'Privacy'}
            </Link>
            <span aria-hidden="true">·</span>
            <Link href={`/${locale}/terms`} className="transition-colors hover:text-white/70">
              {locale === 'tr' ? 'Kullanım' : 'Terms'}
            </Link>
          </div>
          <div className="mt-3 text-[10px] text-white/40" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Powered by Buaze
          </div>
        </footer>
      </div>

      {showLegal && (
        <LegalModal kind={showLegal} t={t} onClose={() => setShowLegal(null)} locale={locale} />
      )}
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

function ConsentRow({
  checked,
  onToggle,
  label,
  legalLabel,
  onOpenLegal,
  required = false,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  legalLabel: string;
  onOpenLegal: (e: React.MouseEvent) => void;
  required?: boolean;
}) {
  return (
    <div
      onClick={onToggle}
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onToggle();
        }
      }}
      className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-[11.5px] leading-[1.5] text-[#525252] transition-colors focus:outline-none focus-visible:border-[#0A0A0A] ${
        checked
          ? 'border-[#C6F24E] bg-[#EAF9B8]/30'
          : 'border-[#EDEDED] bg-white hover:border-[#D4D4D4]'
      }`}
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors ${
          checked ? 'border-[#0A0A0A] bg-[#0A0A0A]' : 'border-[#D4D4D4] bg-white'
        }`}
      >
        {checked && <Check size={11} strokeWidth={3} className="text-white" />}
      </span>
      <span className="flex-1">
        {required && (
          <span className="mr-1 inline-block rounded bg-[#0A0A0A] px-1 py-[1px] align-middle text-[8px] font-semibold uppercase tracking-wider text-white">
            *
          </span>
        )}
        {label}{' '}
        <button
          type="button"
          onClick={onOpenLegal}
          className="font-medium text-[#0A0A0A] underline underline-offset-2 hover:text-[#525252]"
        >
          {legalLabel}
        </button>
      </span>
    </div>
  );
}

function LegalModal({
  kind,
  t,
  onClose,
  locale,
}: {
  kind: 'kvkk' | 'marketing';
  t: (key: string) => string;
  onClose: () => void;
  locale: Locale;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className="bz-fade-in fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[520px] overflow-hidden rounded-[20px] bg-white text-[#0A0A0A] shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
      >
        <header className="flex items-center justify-between border-b border-[#EDEDED] px-6 py-4">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                kind === 'kvkk' ? 'bg-[#EAF9B8] text-[#0A0A0A]' : 'bg-[#F0FDF4] text-[#166534]'
              }`}
            >
              {kind === 'kvkk' ? <ShieldCheck size={18} /> : <Mail size={18} />}
            </span>
            <div>
              <h3 id="legal-title" className="bz-h-tight text-[15px]">
                {kind === 'kvkk'
                  ? locale === 'tr'
                    ? 'KVKK Aydınlatma Metni'
                    : 'KVKK Privacy Notice'
                  : locale === 'tr'
                    ? 'İletişim İzni'
                    : 'Marketing Consent'}
              </h3>
              <p
                className="text-[9px] uppercase tracking-[0.2em] text-[#737373]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                Legal & Privacy
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={locale === 'tr' ? 'Kapat' : 'Close'}
            className="bz-btn-icon"
          >
            <X size={18} />
          </button>
        </header>
        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          <p className="whitespace-pre-wrap text-[13px] leading-[1.65] text-[#1A1A1A]">
            {kind === 'kvkk' ? t('feedback_kvkk_text') : t('feedback_marketing_text')}
          </p>
          <p
            className="mt-5 border-t border-[#EDEDED] pt-3 text-[10px] uppercase tracking-[0.2em] text-[#737373]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {kind === 'kvkk' ? t('feedback_kvkk_footer') : t('feedback_marketing_footer')}
          </p>
        </div>
        <footer className="flex justify-end border-t border-[#EDEDED] bg-[#FAFAFA] px-6 py-4">
          <button type="button" onClick={onClose} className="bz-btn-primary px-6 py-2.5 text-[13px]">
            {locale === 'tr' ? 'Kapat' : 'Close'}
          </button>
        </footer>
      </div>
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
