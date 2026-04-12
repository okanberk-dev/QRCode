'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Star, Loader2, MapPin, Phone, ChevronDown } from 'lucide-react';
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
        }, 1800);
      } else {
        setTimeout(() => {
          setIsRedirecting(false);
          setFormSubmitted(true);
        }, 1800);
      }
    }
  };

  const showForm = rating > 0 && rating <= 3 && !formSubmitted;
  const showThankYou = formSubmitted;

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <Loader2 className="animate-spin text-gray-300 w-8 h-8" />
      </div>
    );
  }

  if (notFound || !restaurant) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star size={32} className="text-gray-300" />
          </div>
          <h1 className="text-xl font-semibold text-gray-700 mb-2">Sayfa Bulunamadı</h1>
          <p className="text-sm text-gray-400">Bu restoran sayfası mevcut değil veya kaldırılmış olabilir.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex flex-col min-h-screen bg-[#f5f5f5] font-sans">
      {/* High Rating Redirect Overlay */}
      {isRedirecting && (
        <div className="fixed inset-0 bg-[#111827]/96 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 mb-7 bg-white rounded-2xl shadow-2xl flex items-center justify-center">
            <svg viewBox="0 0 48 48" className="w-10 h-10">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Harika! Teşekkürler 🎉</h2>
          <p className="text-gray-400 text-sm max-w-[280px] leading-relaxed">
            Memnuniyetinizi Google&apos;da paylaşmanız için yönlendiriliyorsunuz...
          </p>
          <div className="mt-8 flex items-center gap-2 bg-white/10 px-5 py-2.5 rounded-full border border-white/10">
            <span className="w-2 h-2 rounded-full animate-pulse bg-[#FDBF1D]"></span>
            <span className="text-xs font-semibold uppercase tracking-widest text-white">Lütfen Bekleyin</span>
          </div>
        </div>
      )}

      {/* ─── Google Reviews style Header ─── */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-lg mx-auto px-5 py-5">
          {/* Restaurant Name & Category */}
          <div className="flex flex-col gap-1 mb-4">
            <h1 className="text-2xl font-bold text-[#111827] tracking-tight">{restaurant.name}</h1>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 font-medium">{restaurant.category}</span>
              {restaurant.address && (
                <>
                  <span className="text-gray-200">·</span>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <MapPin size={13} className="text-gray-400" />
                    <span className="truncate max-w-[200px]">{restaurant.address}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 -mx-5" />

          {/* CTA header */}
          <div className="pt-4">
            <p className="text-base font-semibold text-[#111827] text-center">
              Ziyaretinizi nasıl değerlendirdiniz?
            </p>
            <p className="text-xs text-center text-gray-400 mt-1">
              Görüşünüz iyileşmemize yardımcı olur
            </p>
          </div>
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <div className="flex-1 max-w-lg mx-auto w-full px-5 py-8">

        {/* Star Rating */}
        {!showThankYou && !showForm && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col items-center">
            <StarRating rating={rating} onRatingChange={handleRatingChange} />

            <p className="text-xs text-gray-400 mt-6 text-center">
              Puanınızı seçtikten sonra bir sonraki adıma geçeceksiniz
            </p>
          </div>
        )}

        {/* Low Rating Form */}
        {showForm && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            {/* Selected rating display */}
            <div className="flex items-center gap-2 mb-5 pb-5 border-b border-gray-100">
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={16} className={s <= rating ? 'fill-[#FDBF1D] text-[#FDBF1D]' : 'text-gray-200 fill-gray-100'} strokeWidth={1} />
                ))}
              </div>
              <span className="text-sm font-semibold text-gray-700">{rating}/5</span>
            </div>
            <FeedbackForm
              rating={rating}
              onSuccess={() => setFormSubmitted(true)}
              restaurantSlug={slug}
              restaurantName={restaurant.name}
            />
          </div>
        )}

        {/* Thank You */}
        {showThankYou && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <ThankYou rating={rating} googleReviewUrl={googleUrl} />
          </div>
        )}

        {/* Google Reviews CTA (always visible when there's a URL and not redirecting/ended) */}
        {!showThankYou && !showForm && !isRedirecting && googleUrl && (
          <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500 flex-1">Doğrudan Google&apos;da yorum yapmak ister misiniz?</p>
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 border border-gray-200 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors whitespace-nowrap flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google&apos;da Yorum Yap
            </a>
          </div>
        )}
      </div>

      {/* ─── KVKK Footer ─── */}
      <footer className="max-w-lg mx-auto w-full px-5 pb-8 pt-2">
        <div className="border-t border-gray-200 pt-5 text-center">
          <p className="text-xs text-gray-400 leading-relaxed">
            Bu form 6698 sayılı KVKK kapsamında kişisel veri toplamaz. Değerlendirmeler anonim olarak işlenir.{' '}
            <a href="/gizlilik" target="_blank" className="underline hover:text-gray-600">Gizlilik Politikası</a>
            {' · '}
            <a href="/kullanim-kosullari" target="_blank" className="underline hover:text-gray-600">Kullanım Koşulları</a>
          </p>
          <p className="text-xs text-gray-300 mt-2 font-medium">
            Powerd by{' '}
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
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-full"></div>
          <div className="h-3 w-28 bg-gray-100 rounded"></div>
        </div>
      </div>
    }>
      <SlugContent />
    </Suspense>
  );
}
