'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Star, Loader2, MapPin, ChevronRight } from 'lucide-react';
import StarRating from '@/components/StarRating';
import FeedbackForm from '@/components/FeedbackForm';
import ThankYou from '@/components/ThankYou';

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
    <main className="flex flex-col min-h-[100dvh] bg-gradient-to-b from-[#f8f9fa] to-[#f0f1f3] font-sans">
      
      {/* ═══════ High Rating Redirect Overlay ═══════ */}
      {isRedirecting && (
        <div className="fixed inset-0 bg-[#111827]/95 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-6 text-center">
          {/* Animated Rings */}
          <div className="relative mb-8">
            <div className="absolute inset-0 w-24 h-24 rounded-full bg-[#FDBF1D]/10 animate-ping" />
            <div className="relative w-24 h-24 rounded-3xl bg-white shadow-2xl flex items-center justify-center">
              <svg viewBox="0 0 48 48" className="w-12 h-12">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
            </div>
          </div>
          
          <h2 className="text-2xl font-black text-white mb-3">Harika! Teşekkürler 🎉</h2>
          <p className="text-gray-400 text-sm max-w-[260px] leading-relaxed mb-8">
            Memnuniyetinizi Google&apos;da paylaşmanız için yönlendiriliyorsunuz...
          </p>
          
          {/* Progress Bar */}
          <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#FDBF1D] to-[#EAB308] rounded-full animate-[progressBar_2s_ease-in-out_forwards]" />
          </div>
          
          <style jsx>{`
            @keyframes progressBar {
              0% { width: 0%; }
              100% { width: 100%; }
            }
          `}</style>
        </div>
      )}

      {/* ═══════ Restaurant Header Card ═══════ */}
      <div className="bg-white">
        {/* Top accent bar */}
        <div className="h-1 bg-gradient-to-r from-[#FDBF1D] via-[#EAB308] to-[#FDBF1D]" />
        
        <div className="max-w-lg mx-auto w-full px-5 py-6 sm:py-8">
          <div className="flex items-start gap-4">
            {/* Restaurant Avatar */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#111827] to-[#1f2937] flex items-center justify-center flex-shrink-0 shadow-lg shadow-gray-200/50">
              <span className="text-xl sm:text-2xl font-black text-[#FDBF1D]">{initial}</span>
            </div>
            
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight leading-tight truncate">
                {restaurant.name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                <span className="text-sm text-gray-500 font-medium">{restaurant.category}</span>
                {restaurant.address && (
                  <>
                    <span className="text-gray-300 hidden sm:inline">·</span>
                    <div className="flex items-center gap-1 text-sm text-gray-400 w-full sm:w-auto">
                      <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                      <span className="truncate text-xs sm:text-sm">{restaurant.address}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ Main Content Area ═══════ */}
      <div className="flex-1 max-w-lg mx-auto w-full px-4 sm:px-5 py-5 sm:py-8">

        {/* ── Star Rating Card ── */}
        {!showThankYou && !showForm && (
          <div className="bg-white rounded-[28px] shadow-[0_2px_20px_-4px_rgba(0,0,0,0.06)] border border-gray-100/80 overflow-hidden">
            {/* Header */}
            <div className="px-6 sm:px-8 pt-8 sm:pt-10 pb-2 text-center">
              <div className="inline-flex items-center gap-2 bg-[#FDBF1D]/8 border border-[#FDBF1D]/15 px-3.5 py-1.5 rounded-full mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FDBF1D] animate-pulse" />
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-[#111827]/60">Değerlendirme</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-[#111827] mb-1.5">
                Deneyiminizi değerlendirin
              </h2>
              <p className="text-sm text-gray-400 max-w-[260px] mx-auto leading-relaxed">
                Görüşünüz hizmet kalitemizi iyileştirmemize yardımcı olur
              </p>
            </div>
            
            {/* Star Rating */}
            <div className="px-6 sm:px-8 py-8 sm:py-10">
              <StarRating rating={rating} onRatingChange={handleRatingChange} />
            </div>
            
            {/* Bottom hint */}
            <div className="px-6 sm:px-8 pb-6 sm:pb-8">
              <div className="bg-gray-50 rounded-2xl px-4 py-3 text-center">
                <p className="text-[11px] sm:text-xs text-gray-400">
                  ⭐ Puanınızı seçtikten sonra bir sonraki adıma geçeceksiniz
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Low Rating Feedback Form ── */}
        {showForm && (
          <div className="bg-white rounded-[28px] shadow-[0_2px_20px_-4px_rgba(0,0,0,0.06)] border border-gray-100/80 overflow-hidden">
            {/* Rating display header */}
            <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={14} className={s <= rating ? 'fill-[#FDBF1D] text-[#FDBF1D]' : 'text-gray-200 fill-gray-100'} strokeWidth={1.5} />
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-gray-600">{rating}/5</span>
                </div>
                <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg font-medium">
                  Geri Bildirim
                </span>
              </div>
            </div>
            
            {/* Form */}
            <div className="px-6 sm:px-8 py-6 sm:py-8">
              <FeedbackForm
                rating={rating}
                onSuccess={() => setFormSubmitted(true)}
                restaurantSlug={slug}
                restaurantName={restaurant.name}
              />
            </div>
          </div>
        )}

        {/* ── Thank You ── */}
        {showThankYou && (
          <div className="bg-white rounded-[28px] shadow-[0_2px_20px_-4px_rgba(0,0,0,0.06)] border border-gray-100/80 p-6 sm:p-10">
            <ThankYou rating={rating} googleReviewUrl={googleUrl} />
          </div>
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
      <footer className="max-w-lg mx-auto w-full px-5 pb-6 sm:pb-8 pt-2">
        <div className="border-t border-gray-200/60 pt-5">
          <p className="text-[10px] sm:text-[11px] text-gray-400 leading-relaxed text-center">
            Bu form anonim değerlendirme toplar. Kişisel veri işlenmemektedir.{' '}
            <a href="/tr/privacy" target="_blank" className="underline hover:text-gray-500 transition-colors">Gizlilik</a>
            {' · '}
            <a href="/tr/terms" target="_blank" className="underline hover:text-gray-500 transition-colors">Koşullar</a>
          </p>
          <p className="text-[10px] text-gray-300 mt-2 font-medium text-center">
            Powered by{' '}
            <a href="https://buaze.com" target="_blank" className="text-[#FDBF1D] font-bold hover:underline">Buaze</a>
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
