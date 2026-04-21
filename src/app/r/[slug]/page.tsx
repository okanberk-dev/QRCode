'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useParams, useSearchParams, notFound } from 'next/navigation';
import { Star, Loader2, MapPin, ChevronRight, X, UtensilsCrossed } from 'lucide-react';
import StarRating from '@/components/StarRating';
import FeedbackForm, { FeedbackFormHandle } from '@/components/FeedbackForm';
import ThankYou from '@/components/ThankYou';
import BusinessSummary from '@/components/BusinessSummary';
import Link from 'next/link';
import { getTranslations, Locale, locales } from '@/lib/translations';

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
}

interface ReviewPlatform {
  name: string;
  url: string;
  color: string;
  icon: string;
}

function SlugContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const formRef = useRef<FeedbackFormHandle>(null);

  // --- Platform from QR ---
  const platformParam = searchParams.get('platform') || '';

  // --- Locale Handling ---
  const [locale, setLocale] = useState<Locale>('tr');
  useEffect(() => {
    const hl = searchParams.get('hl') as Locale;
    if (hl && locales.includes(hl)) {
      setLocale(hl);
    } else {
      const browserLang = navigator.language.split('-')[0] as Locale;
      if (locales.includes(browserLang)) {
        setLocale(browserLang);
      }
    }
  }, [searchParams]);

  const t = (key: any) => {
    const trans = getTranslations(locale);
    return (trans as any)[key] || key;
  };

  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);

  const [rating, setRating] = useState<number>(0);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        const res = await fetch(`/api/restaurants?slug=${slug}`);
        if (res.ok) {
          const data = await res.json();
          setRestaurant(data);
        } else {
          setIsNotFound(true);
        }
      } catch {
        setIsNotFound(true);
      }
      setLoading(false);
    };
    fetchRestaurant();
  }, [slug]);

  const googleUrl = restaurant?.googlePlaceId
    ? restaurant.googlePlaceId.startsWith('http')
      ? restaurant.googlePlaceId
      : `https://search.google.com/local/writereview?placeid=${restaurant.googlePlaceId}`
    : null;

  // Build available review platforms
  const platforms: ReviewPlatform[] = [];
  if (googleUrl) platforms.push({ name: 'Google', url: googleUrl, color: '#4285F4', icon: 'G' });
  if (restaurant?.getirYemekUrl) platforms.push({ name: 'Getir Yemek', url: restaurant.getirYemekUrl, color: '#5D3EBC', icon: '🛵' });
  if (restaurant?.yemekSepetiUrl) platforms.push({ name: 'Yemek Sepeti', url: restaurant.yemekSepetiUrl, color: '#FA0050', icon: '🍽️' });
  if (restaurant?.trendyolYemekUrl) platforms.push({ name: 'Trendyol Yemek', url: restaurant.trendyolYemekUrl, color: '#F27A1A', icon: '🧡' });

  const [showPlatformPicker, setShowPlatformPicker] = useState(false);

  const handleRatingChange = async (newRating: number) => {
    if (!restaurant) return;
    setRating(newRating);

    if (newRating >= 4) {
      // Log the high rating
      try {
        fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rating: newRating,
            source: searchParams.get('source') || 'qr',
            branch: restaurant.name,
            tableNumber: searchParams.get('table') || '',
            comment: 'High Rating Redirect',
            restaurantSlug: slug,
            platform: platformParam || null,
          })
        });
      } catch (e) {
        console.error('Failed to log high rating', e);
      }

      // If platform is specified from QR, redirect directly to that platform
      if (platformParam) {
        const platformUrls: Record<string, string | null> = {
          google: googleUrl,
          yemeksepeti: restaurant.yemekSepetiUrl,
          getir: restaurant.getirYemekUrl,
          trendyol_go: restaurant.trendyolYemekUrl,
        };
        const targetUrl = platformUrls[platformParam];
        if (targetUrl) {
          setIsRedirecting(true);
          setTimeout(() => {
            window.location.href = targetUrl;
          }, 2200);
          return;
        }
      }

      // If multiple platforms → show picker, if single → auto redirect, if none → thank you
      if (platforms.length > 1) {
        setShowPlatformPicker(true);
      } else if (platforms.length === 1) {
        setIsRedirecting(true);
        setTimeout(() => {
          window.location.href = platforms[0].url;
        }, 2200);
      } else {
        setIsRedirecting(true);
        setTimeout(() => {
          setIsRedirecting(false);
          setFormSubmitted(true);
        }, 2200);
      }
    }
  };

  const showForm = rating > 0 && rating <= 3 && !formSubmitted && !showPlatformPicker;
  const showThankYou = formSubmitted && !showPlatformPicker;

  // --- Loading State ---
  if (loading) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-gray-50 border-t-blue-500 animate-spin" />
            <div className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                <Star className="text-blue-500 w-4 h-4 fill-blue-500" />
            </div>
          </div>
          <p className="text-sm font-bold text-gray-400 tracking-widest uppercase animate-pulse">BUAZE</p>
        </div>
      </div>
    );
  }

  // --- Not Found State ---
  if (isNotFound || !restaurant) {
    return notFound();
  }

  return (
    <main className="flex flex-col min-h-[100dvh] bg-white text-gray-900 selection:bg-blue-100 selection:text-blue-900">
      
      {/* ═══════ High Rating Redirect Overlay ═══════ */}
      {isRedirecting && (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
          <div className="mb-10 scale-125">
            <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-6 relative">
              <svg viewBox="0 0 48 48" className="w-12 h-12 relative z-10 animate-in zoom-in-50 duration-700">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-20" />
            </div>
            <div className="flex flex-col gap-3">
              <h2 className="text-2xl font-bold text-gray-900">{t('feedback_redirecting')}</h2>
              <p className="text-sm text-gray-500 font-medium px-4">{t('feedback_redirect_sub')}</p>
            </div>
          </div>
          
          <div className="w-[min(100%,16rem)] h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-blue-500 rounded-full animate-[progressBar_2s_linear_forwards]" />
          </div>
          
          <style jsx>{`
            @keyframes progressBar {
              0% { width: 0%; }
              100% { width: 100%; }
            }
          `}</style>
        </div>
      )}

      {/* ═══════ Google-Style Sticky Header ═══════ */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-50">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => rating > 0 ? (formSubmitted ? window.location.reload() : setRating(0)) : window.history.back()}
              className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full transition-all"
            >
              <X size={22} strokeWidth={2} />
            </button>
            <div className="flex flex-col">
               <h1 className="text-[14px] font-bold text-gray-900 tracking-tight leading-tight">{t('feedback_post_title') || 'Yorum Yaz'}</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {!showForm && !showThankYou && (
               <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-sm ring-1 ring-gray-100">
                  {restaurant.name.charAt(0).toUpperCase()}
               </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════ Main Content Area ═══════ */}
      <div className="max-w-xl mx-auto w-full px-6 py-6 flex-1">
        
        {!showThankYou && !showForm && !showPlatformPicker && (
            <div className="space-y-10 mt-4">
               {/* ── Menu CTA ── */}
               <Link 
                 href={`/r/${slug}/menu${searchParams.toString() ? '?' + searchParams.toString() : ''}`}
                 className="flex items-center justify-between p-5 rounded-[28px] border-2 border-[#111827] bg-[#111827] text-white shadow-xl shadow-gray-200 active:scale-95 transition-all group"
               >
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-[#FDBF1D]">
                      <UtensilsCrossed size={24} strokeWidth={2.75} />
                   </div>
                   <div>
                     <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#FDBF1D] opacity-80">DİJİTAL MENÜ</p>
                     <p className="text-lg font-black tracking-tight">{locale === 'tr' ? 'Menüyü İncele' : 'View Menu'}</p>
                   </div>
                 </div>
                 <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                    <ChevronRight size={20} strokeWidth={3} />
                 </div>
               </Link>

               <div className="relative py-2 text-center">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-gray-100"></div>
                  </div>
                  <span className="relative z-10 px-4 bg-white text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">{locale === 'tr' ? 'VEYA' : 'OR'}</span>
               </div>

               <StarRating rating={rating} onRatingChange={handleRatingChange} t={t} />
            </div>
        )}

        {showForm && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="mb-6 scale-90 -mt-2">
              <StarRating rating={rating} onRatingChange={handleRatingChange} t={t} />
            </div>
            <FeedbackForm 
              ref={formRef}
              rating={rating} 
              onSuccess={() => setFormSubmitted(true)}
              restaurantSlug={slug}
              restaurantName={restaurant.name}
              platform={platformParam || undefined}
              t={t}
            />
          </div>
        )}

        {showThankYou && (
            <ThankYou rating={rating} googleReviewUrl={googleUrl} t={t} />
        )}

        {/* ═══════ Platform Picker (High Rating + Multiple Platforms) ═══════ */}
        {showPlatformPicker && !isRedirecting && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 mt-4">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-green-500 fill-green-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                {locale === 'tr' ? 'Harika! Teşekkürler 🎉' : 'Awesome! Thank you 🎉'}
              </h2>
              <p className="text-sm text-gray-500 font-medium mt-2 px-4">
                {locale === 'tr'
                  ? 'Deneyiminizi bir platformda da paylaşmak ister misiniz?'
                  : 'Would you like to share your experience on a platform?'}
              </p>
            </div>

            <div className="space-y-3">
              {platforms.map((platform) => (
                <a
                  key={platform.name}
                  href={platform.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 w-full p-4 rounded-2xl border-2 border-gray-100 bg-white hover:border-gray-300 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm group"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold shrink-0 shadow-sm"
                    style={{ backgroundColor: platform.color }}
                  >
                    {platform.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-[15px]">{platform.name}</p>
                    <p className="text-xs text-gray-400 font-medium truncate">
                      {locale === 'tr' ? 'Değerlendirmenizi paylaşın' : 'Share your review'}
                    </p>
                  </div>
                  <ChevronRight size={20} className="text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
                </a>
              ))}
            </div>

            <button
              onClick={() => {
                setShowPlatformPicker(false);
                setFormSubmitted(true);
              }}
              className="w-full mt-6 py-3 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
            >
              {locale === 'tr' ? 'Şimdi değil, teşekkürler' : 'Not now, thanks'}
            </button>
          </div>
        )}

        {!showThankYou && !showForm && !showPlatformPicker && rating === 0 && (
            <div className="mt-4">
               <StarRating rating={rating} onRatingChange={handleRatingChange} t={t} />
            </div>
        )}


      </div>

      {/* ═══════ Footer ═══════ */}
      <footer className="py-10 px-6 mt-auto bg-gray-50/30">
        <div className="max-w-xl mx-auto flex flex-col items-center gap-6">
          <div className="flex gap-6">
            <a href="/tr/privacy" className="text-[10px] font-bold text-gray-300 hover:text-gray-900 transition-colors tracking-widest uppercase">GİZLİLİK</a>
            <a href="/tr/terms" className="text-[10px] font-bold text-gray-300 hover:text-gray-900 transition-colors tracking-widest uppercase">KULLANIM</a>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-gray-300 tracking-[0.2em]">POWERED BY</span>
            <a href="https://buaze.com" className="text-[10px] font-black text-gray-400 hover:text-blue-500 transition-colors tracking-tighter uppercase">BUAZE</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

export default function SlugPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[100dvh] w-full items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-full border-4 border-gray-50 border-t-blue-500 animate-spin" />
        </div>
      </div>
    }>
      <SlugContent />
    </Suspense>
  );
}
