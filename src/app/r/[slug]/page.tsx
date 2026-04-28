'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useParams, useSearchParams, notFound } from 'next/navigation';
import { Star, ChevronRight, X } from 'lucide-react';
import StarRating from '@/components/StarRating';
import FeedbackForm, { FeedbackFormHandle } from '@/components/FeedbackForm';
import ThankYou from '@/components/ThankYou';
import { getTranslations, Locale, locales } from '@/lib/translations';
import { SYSTEM_FEEDBACK } from '@/lib/constants';
import { buildGoogleReviewUrl } from '@/lib/google-review';

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
  const platformParam = searchParams.get('platform') || 'google';

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

  // Accepts: raw Place ID (ChIJ…), g.page/r/… link, search.google.com
  // writereview link, or a /maps/place/ URL — see buildGoogleReviewUrl.
  const googleUrl = buildGoogleReviewUrl(restaurant?.googlePlaceId ?? null);

  // Build available review platforms
  const platforms: ReviewPlatform[] = [];
  if (googleUrl) platforms.push({ name: 'Google', url: googleUrl, color: '#4285F4', icon: 'G' });
  if (restaurant?.getirYemekUrl) platforms.push({ name: 'Getir Yemek', url: restaurant.getirYemekUrl, color: '#5D3EBC', icon: '🛵' });
  if (restaurant?.yemekSepetiUrl) platforms.push({ name: 'Yemek Sepeti', url: restaurant.yemekSepetiUrl, color: '#FA0050', icon: '🍽️' });
  if (restaurant?.trendyolYemekUrl) platforms.push({ name: 'Trendyol Yemek', url: restaurant.trendyolYemekUrl, color: '#F27A1A', icon: '🧡' });

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
            comment: SYSTEM_FEEDBACK.HIGH_RATING_REDIRECT,
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
      
      // Auto-redirect to first available platform or show thank you
      if (platforms.length >= 1) {
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

  const showForm = rating > 0 && rating <= 3 && !formSubmitted;
  const showThankYou = formSubmitted;

  // --- Loading State ---
  if (loading) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-[#FFFFFF] border-t-[#C6F24E] animate-spin" />
            <div className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                <Star className="text-[#0A0A0A] w-4 h-4 fill-[#C6F24E]" />
            </div>
          </div>
          <p className="text-sm font-bold text-[#6B7280] tracking-widest uppercase animate-pulse">BUAZE</p>
        </div>
      </div>
    );
  }

  // --- Not Found State ---
  if (isNotFound || !restaurant) {
    return notFound();
  }

  return (
    <main className="flex flex-col min-h-[100dvh] bg-white text-[#0A0A0A] selection:bg-blue-100 selection:text-blue-900">
      
      {/* ═══════ High Rating Redirect Overlay ═══════ */}
      {isRedirecting && (
        <div className="fixed inset-0 bg-white z-60 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
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
              <h2 className="text-2xl font-bold text-[#0A0A0A]">{t('feedback_redirecting')}</h2>
              <p className="text-sm text-[#6B7280] font-medium px-4">{t('feedback_redirect_sub')}</p>
            </div>
          </div>
          
          <div className="w-[min(100%,16rem)] h-1.5 bg-[#EDEDED] rounded-full overflow-hidden mb-4">
            <div className="h-full bg-[#C6F24E] rounded-full animate-[progressBar_2s_linear_forwards]" />
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
      <div className="sticky top-0 bg-white border-b border-[#EDEDED] z-50">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => rating > 0 ? (formSubmitted ? window.location.reload() : setRating(0)) : window.history.back()}
              aria-label="Kapat"
              className="inline-flex items-center justify-center h-11 w-11 -ml-2 text-[#6B7280] hover:bg-[#EDEDED] rounded-full focus:outline-none focus:ring-2 focus:ring-[#0A0A0A]/25 transition-all"
            >
              <X size={22} strokeWidth={2} />
            </button>
            <div className="flex flex-col">
               <h1 className="text-[14px] font-bold text-[#0A0A0A] tracking-tight leading-tight">{t('feedback_post_title') || 'Yorum Yaz'}</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {!showForm && !showThankYou && (
               <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0A0A0A] to-[#1A1A1A] flex items-center justify-center text-white text-xs font-bold border border-[#EDEDED] shadow-sm ring-1 ring-[#EDEDED]">
                  {restaurant.name.charAt(0).toUpperCase()}
               </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════ Main Content Area ═══════ */}
      <div className="max-w-xl mx-auto w-full px-6 py-6 flex-1">
        
        {!showThankYou && (
          <div className="mb-8">
            <StarRating 
              rating={rating} 
              onRatingChange={handleRatingChange} 
              t={t} 
              platform={platformParam || 'google'} 
            />
          </div>
        )}

        {showForm && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <FeedbackForm
              ref={formRef}
              rating={Number(rating)}
              onSuccess={() => setFormSubmitted(true)}
              restaurantSlug={slug}
              restaurantName={restaurant.name}
              platform={platformParam || 'google'}
              t={t}
            />
          </div>
        )}

        {showThankYou && (
            <ThankYou rating={rating} googleReviewUrl={googleUrl} t={t} />
        )}
      </div>

      {/* ═══════ Footer ═══════ */}
      <footer className="py-10 px-6 mt-auto bg-[#FFFFFF]/30">
        <div className="max-w-xl mx-auto flex flex-col items-center gap-6">
          <div className="flex gap-6">
            <a href="/tr/privacy" className="text-[10px] font-bold text-[#A3A3A3] hover:text-[#0A0A0A] transition-colors tracking-widest uppercase">GİZLİLİK</a>
            <a href="/tr/terms" className="text-[10px] font-bold text-[#A3A3A3] hover:text-[#0A0A0A] transition-colors tracking-widest uppercase">KULLANIM</a>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-[#A3A3A3] tracking-[0.2em]">POWERED BY</span>
            <a href="https://buaze.com" className="text-[10px] font-semibold text-[#6B7280] hover:text-[#0A0A0A] transition-colors tracking-tighter uppercase">BUAZE</a>
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
          <div className="w-16 h-16 rounded-full border-4 border-[#FFFFFF] border-t-[#C6F24E] animate-spin" />
        </div>
      </div>
    }>
      <SlugContent />
    </Suspense>
  );
}
