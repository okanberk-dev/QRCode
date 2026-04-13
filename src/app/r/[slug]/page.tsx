'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Star, Loader2, MapPin, ChevronRight, Lock } from 'lucide-react';
import StarRating from '@/components/StarRating';
import FeedbackForm from '@/components/FeedbackForm';
import ThankYou from '@/components/ThankYou';
import BusinessSummary from '@/components/BusinessSummary';
import { getTranslations, Locale, locales } from '@/lib/translations';

interface RestaurantData {
  id: string;
  slug: string;
  name: string;
  category: string;
  address: string | null;
  phone: string | null;
  googlePlaceId: string | null;
  primaryColor: string;
  isActive: boolean;
}

function SlugContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;

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
  const [notFound, setNotFound] = useState(false);

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
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
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

  const handleRatingChange = async (newRating: number) => {
    if (!restaurant) return;
    setRating(newRating);

    if (newRating >= 4) {
      setIsRedirecting(true);

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
          })
        });
      } catch (e) {
        console.error('Failed to log high rating', e);
      }

      if (googleUrl) {
        setTimeout(() => {
          window.location.href = googleUrl;
        }, 2200);
      } else {
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
      <div className="flex h-[100dvh] w-full items-center justify-center bg-gradient-to-b from-white to-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 animate-pulse" />
            <Loader2 className="absolute inset-0 m-auto animate-spin text-gray-400 w-6 h-6" />
          </div>
          <div className="h-2 w-20 bg-gray-100 rounded-full animate-pulse" />
        </div>
      </div>
    );
  }

  // --- Not Found State ---
  if (notFound || !restaurant) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-gradient-to-b from-white to-gray-50 px-6">
        <div className="text-center max-w-xs">
          <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Star size={36} className="text-gray-300" />
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Sayfa Bulunamadı</h1>
          <p className="text-sm text-gray-400 leading-relaxed">
            Bu işletme sayfası mevcut değil veya kaldırılmış olabilir.
          </p>
        </div>
      </div>
    );
  }

  // --- Get initial letter for avatar ---
  const initial = restaurant.name.charAt(0).toUpperCase();

  return (
    <main className="flex flex-col min-h-[100dvh] bg-white font-sans text-gray-900">
      
      {/* ═══════ High Rating Redirect Overlay ═══════ */}
      {isRedirecting && (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-6 text-center">
          <div className="mb-8 relative">
            <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 48 48" className="w-10 h-10">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-medium text-gray-900">{t('feedback_redirecting')}</h2>
              <p className="text-sm text-gray-500">{t('feedback_redirect_sub')}</p>
            </div>
          </div>
          
          <div className="w-48 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#1a73e8] rounded-full animate-[progressBar_2s_linear_forwards]" />
          </div>
          
          <style jsx>{`
            @keyframes progressBar {
              0% { width: 0%; }
              100% { width: 100%; }
            }
          `}</style>
        </div>
      )}

      {/* ═══════ Google-Style Header ═══════ */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-10 transition-all">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <button 
              onClick={() => rating > 0 ? setRating(0) : window.history.back()}
              className="p-2 -ml-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all active:scale-90"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate tracking-tight">{restaurant.name}</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="flex gap-0.5">
                   {[1,2,3,4,5].map(i => <Star key={i} size={10} className="fill-[#fbbc04] text-[#fbbc04]" />)}
                </div>
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-widest">{t('feedback_via_google')}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-black shadow-lg shadow-blue-200">
              {initial}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ Main Content Area ═══════ */}
      <div className="max-w-2xl mx-auto w-full px-4 py-10 flex-1">
        
        {!showThankYou && !showForm && (
          <div className="mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="flex flex-col items-center text-center space-y-4">
               <div className="w-20 h-20 rounded-[28px] bg-gray-50 flex items-center justify-center text-3xl shadow-inner border border-gray-100/50">
                 🍽️
               </div>
               <div>
                 <h2 className="text-2xl font-black text-gray-900 tracking-tight">{t('feedback_welcome_title') || 'Deneyiminizi Paylaşın'}</h2>
                 <p className="text-gray-500 text-sm mt-1 max-w-[280px] mx-auto leading-relaxed">
                   {restaurant.name} işletmesi için görüşleriniz bizim için çok değerli.
                 </p>
               </div>
            </div>
          </div>
        )}

        {!showThankYou && (
          <div className="space-y-10">
            {/* User Profile Info - Clean & Modern */}
            <div className="flex items-center gap-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50">
              <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-xl border border-gray-100">
                👤
              </div>
              <div className="flex flex-col">
                <span className="text-[14px] font-bold text-gray-900">{t('feedback_anonymous')}</span>
                <span className="text-[12px] text-gray-400 font-medium flex items-center gap-1.5">
                   <Lock size={10} /> {t('feedback_public')}
                </span>
              </div>
            </div>

            {/* Star Rating Section */}
            {!showForm ? (
              <div className="py-6 scale-110 origin-top flex justify-center">
                <StarRating rating={rating} onRatingChange={handleRatingChange} t={t} />
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map(s => (
                      <Star 
                        key={s} 
                        size={32} 
                        onClick={() => setRating(s)}
                        className={`cursor-pointer transition-all active:scale-90 ${s <= rating ? 'fill-[#fbbc04] text-[#fbbc04] drop-shadow-[0_0_8px_rgba(251,188,4,0.3)]' : 'text-gray-100 fill-gray-100'}`} 
                        strokeWidth={1} 
                      />
                    ))}
                  </div>
                  <p className="text-sm font-bold text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full uppercase tracking-widest">
                    {rating} {t('feedback_rating_stars')}
                  </p>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-gray-100 to-transparent" />

                <FeedbackForm 
                  rating={rating} 
                  onSuccess={() => setFormSubmitted(true)}
                  restaurantSlug={slug}
                  restaurantName={restaurant.name}
                  t={t}
                />
              </div>
            )}
          </div>
        )}

        {showThankYou && (
            <ThankYou rating={rating} googleReviewUrl={googleUrl} t={t} />
        )}


        {/* ── Google Reviews Direct CTA ── */}
        {!showThankYou && !showForm && !isRedirecting && googleUrl && (
          <div className="mt-4">
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100/80 shadow-[0_1px_8px_-2px_rgba(0,0,0,0.04)] px-5 py-4 group hover:shadow-md transition-all active:scale-[0.99]"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-700">Google&apos;da Yorum Yap</p>
                <p className="text-[11px] text-gray-400">Doğrudan Google üzerinden değerlendirin</p>
              </div>
              <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-400 transition-colors flex-shrink-0" />
            </a>
          </div>
        )}
      </div>

      {/* ═══════ Footer ═══════ */}
      <footer className="mt-auto py-8 px-4 border-t border-gray-50">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-4">
          <div className="flex gap-4 text-xs text-gray-400">
            <a href="/tr/privacy" className="hover:text-gray-600 underline">{t('footer_privacy')}</a>
            <a href="/tr/terms" className="hover:text-gray-600 underline">{t('footer_terms')}</a>
          </div>
          <p className="text-[10px] text-gray-300">
            Powered by <a href="https://buaze.com" className="font-bold hover:text-blue-500">Buaze</a>
          </p>
        </div>
      </footer>
    </main>
  );
}

export default function SlugPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[100dvh] w-full items-center justify-center bg-gradient-to-b from-white to-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 animate-pulse" />
          </div>
          <div className="h-2 w-20 bg-gray-100 rounded-full animate-pulse" />
        </div>
      </div>
    }>
      <SlugContent />
    </Suspense>
  );
}
