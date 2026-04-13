'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Star, Loader2, MapPin, ChevronRight, X } from 'lucide-react';
import StarRating from '@/components/StarRating';
import FeedbackForm, { FeedbackFormHandle } from '@/components/FeedbackForm';
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
  const formRef = useRef<FeedbackFormHandle>(null);

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
  if (notFound || !restaurant) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-gray-50 px-6">
        <div className="text-center max-w-xs p-8 bg-white rounded-[2rem] shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-red-50 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <X size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Sayfa Bulunamadı</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Bu işletme aktif değil veya bağlantı hatalı.
          </p>
        </div>
      </div>
    );
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
          
          <div className="w-64 h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
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
            {showForm && (
              <button 
                onClick={() => formRef.current?.submit()}
                disabled={formRef.current?.isSubmitting}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  formRef.current?.isSubmitting 
                    ? 'bg-gray-100 text-gray-400' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                }`}
              >
                {formRef.current?.isSubmitting ? <Loader2 size={16} className="animate-spin" /> : t('feedback_post')}
              </button>
            )}
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
        
        {!showThankYou && !showForm && (
            <div className="mt-4">
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
              t={t}
            />
          </div>
        )}

        {showThankYou && (
            <ThankYou rating={rating} googleReviewUrl={googleUrl} t={t} />
        )}

        {/* ── Google Direct CTA - Only show on landing state ── */}
        {!showThankYou && !showForm && !isRedirecting && googleUrl && (
          <div className="mt-12 pt-10 border-t border-gray-50">
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 bg-gray-50/50 rounded-2xl border border-gray-100 p-5 group hover:bg-white hover:border-blue-100 hover:shadow-md transition-all active:scale-[0.99]"
            >
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 group-hover:text-blue-500 transition-colors uppercase tracking-tight">Doğrudan Google&apos;da Yorum Yap</p>
                <p className="text-[11px] text-gray-400 font-medium">İşletmeyi haritalar üzerinden destekleyin</p>
              </div>
              <ChevronRight size={18} className="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
            </a>
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
border-4 border-gray-50 border-t-blue-500 animate-spin" />
        </div>
      </div>
    }>
      <SlugContent />
    </Suspense>
  );
}
