'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Share2, MapPin, Phone, Clock, ChevronDown, MessageSquare, Info, Camera, Star, Loader2 } from 'lucide-react';
import StarRating from '@/components/StarRating';
import FeedbackForm from '@/components/FeedbackForm';
import ThankYou from '@/components/ThankYou';
import ReviewList from '@/components/ReviewList';
import GoogleTabs from '@/components/GoogleTabs';

interface RestaurantData {
  id: string;
  slug: string;
  name: string;
  category: string;
  address: string | null;
  phone: string | null;
  workingHours: string | null;
  googleReviewUrl: string | null;
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
  const [activeTab, setActiveTab] = useState('reviews');
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

  const handleRatingChange = async (newRating: number) => {
    if (!restaurant) return;
    setRating(newRating);

    if (newRating >= 4) {
      setIsRedirecting(true);
      const googleUrl = restaurant.googleReviewUrl || '#';

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

      if (googleUrl && googleUrl !== '#') {
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
  const showThankYouLow = formSubmitted;

  // Static rating data (placeholder)
  const googleData = {
    total: 0,
    average: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <Loader2 className="animate-spin text-gray-400 w-8 h-8" />
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
          <h1 className="text-xl font-medium text-gray-800 mb-2">Sayfa Bulunamadı</h1>
          <p className="text-sm text-gray-500">Bu restoran sayfası mevcut değil veya kaldırılmış olabilir.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex flex-col min-h-screen bg-white">
      {/* Redirect Overlay */}
      {isRedirecting && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-6 animate-fade-in text-center">
          <div className="w-20 h-20 mb-8 relative">
            <svg viewBox="0 0 48 48" className="w-full h-full animate-bounce">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
          </div>
          <h2 className="text-[22px] font-medium text-[#202124] mb-2">Harika!</h2>
          <p className="text-sm text-[#5f6368] max-w-[280px]">
            Memnuniyetiniz bizim için çok değerli. Görüşlerinizi paylaşmanız için Google Haritalar&apos;a yönlendiriliyorsunuz...
          </p>
          <div className="mt-12 flex items-center justify-center gap-3">
             <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: restaurant.primaryColor }}></span>
             <span className="text-xs font-medium uppercase tracking-widest" style={{ color: restaurant.primaryColor }}>Lütfen Bekleyin</span>
          </div>
        </div>
      )}

      {/* Google Maps Hero Header */}
      <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] overflow-hidden shadow-sm" style={{ backgroundColor: '#202124' }}>
        {/* Restaurant initial as big letter */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[120px] sm:text-[160px] font-bold text-white/10 select-none">{restaurant.name.charAt(0)}</span>
        </div>

        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
          <div className="w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg">
            <ChevronDown className="text-gray-700" size={20} />
          </div>
          <div className="flex gap-2">
            <div className="w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg">
              <Share2 size={18} className="text-gray-700" />
            </div>
          </div>
        </div>
        
        <div className="absolute -bottom-6 left-5 z-30">
          <div
            className="w-16 h-16 rounded-full border-2 border-white shadow-xl overflow-hidden flex items-center justify-center text-white text-2xl font-bold"
            style={{ backgroundColor: restaurant.primaryColor }}
          >
            {restaurant.name.charAt(0)}
          </div>
        </div>
      </div>

      <div className="px-5 pt-8 pb-4">
        <h1 className="text-[22px] font-medium text-[#202124] tracking-tight">{restaurant.name}</h1>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-sm text-[#70757a]">{restaurant.category}</span>
          <Info size={14} className="ml-1" style={{ color: restaurant.primaryColor }} />
        </div>
      </div>

      <GoogleTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-grow">
        {activeTab === 'reviews' && (
          <div className="pb-24">
            <div className="px-4 py-8 max-w-lg mx-auto flex flex-col items-center">
              {!showThankYouLow && !showForm && (
                <div className="w-full bg-white p-6 rounded-2xl shadow-[0_1px_2px_0_rgba(60,64,67,.3),0_1px_3px_1px_rgba(60,64,67,.15)] mb-8 transition-all border border-gray-100">
                  <h2 className="text-base font-medium text-[#202124] mb-6 text-center">Nasıl buldunuz?</h2>
                  <StarRating rating={rating} onRatingChange={handleRatingChange} />
                </div>
              )}

              {showForm && (
                <FeedbackForm
                  rating={rating}
                  onSuccess={() => setFormSubmitted(true)}
                  restaurantSlug={slug}
                  restaurantName={restaurant.name}
                />
              )}

              {showThankYouLow && <ThankYou rating={rating} googleReviewUrl={restaurant.googleReviewUrl} />}

              {!showForm && <ReviewList />}

              <div className="mt-8 w-full border-t border-gray-100 pt-8 text-center text-xs text-[#70757a]">
                 Tüm yorumlar gerçek müşteri deneyimlerine dayanmaktadır.
              </div>
            </div>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="p-6 space-y-6">
            {restaurant.address && (
              <div className="flex items-start gap-4 p-2">
                <MapPin style={{ color: restaurant.primaryColor }} className="mt-1" size={20} />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[#202124]">Adres</span>
                  <p className="text-sm text-[#5f6368]">{restaurant.address}</p>
                </div>
              </div>
            )}
            {restaurant.workingHours && (
              <div className="flex items-start gap-4 p-2">
                <Clock style={{ color: restaurant.primaryColor }} className="mt-1" size={20} />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[#202124]">Çalışma Saatleri</span>
                  <p className="text-sm text-[#5f6368]">{restaurant.workingHours}</p>
                </div>
              </div>
            )}
            {restaurant.phone && (
              <div className="flex items-start gap-4 p-2">
                <Phone style={{ color: restaurant.primaryColor }} className="mt-1" size={20} />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[#202124]">Telefon</span>
                  <p className="text-sm text-[#5f6368]">{restaurant.phone}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* App Bar Style Footer */}
      <footer className="sticky bottom-0 bg-white border-t border-[#dadce0] px-6 py-4 flex justify-around items-center z-40 sm:hidden">
        <div className="flex flex-col items-center gap-1 opacity-40">
          <MessageSquare size={20} className="text-gray-700" />
          <span className="text-[10px] text-gray-600">Sohbet</span>
        </div>
        <div className="flex flex-col items-center gap-1" style={{ color: restaurant.primaryColor }}>
          <Star size={20} style={{ fill: restaurant.primaryColor, color: restaurant.primaryColor }} />
          <span className="text-[10px] font-medium">Değerlendir</span>
        </div>
        <div className="flex flex-col items-center gap-1 opacity-40">
          <Camera size={20} className="text-gray-700" />
          <span className="text-[10px] text-gray-600">Fotoğraf</span>
        </div>
      </footer>
    </main>
  );
}

export default function SlugPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-gray-100 rounded"></div>
        </div>
      </div>
    }>
      <SlugContent />
    </Suspense>
  );
}
