'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Share2, MapPin, Globe, Phone, Clock, ChevronDown, MessageSquare, Info, Camera, Star } from 'lucide-react';
import StarRating from '@/components/StarRating';
import FeedbackForm from '@/components/FeedbackForm';
import ThankYou from '@/components/ThankYou';
import GoogleReviewLink from '@/components/GoogleReviewLink';
import ReviewList from '@/components/ReviewList';
import RatingStats from '@/components/RatingStats';
import GoogleTabs from '@/components/GoogleTabs';
import { useTranslation } from '@/lib/i18n';

function RatingContent() {
  const [rating, setRating] = useState<number>(0);
  const [activeTab, setActiveTab] = useState('reviews');
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { t, isRtl } = useTranslation();
  const searchParams = useSearchParams();

  const handleRatingChange = async (newRating: number) => {
    setRating(newRating);

    // If 4 or 5 stars, show overlay and redirect to Google Review directly
    if (newRating >= 4) {
      setIsRedirecting(true);
      const googleUrl = process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL || 'https://search.google.com/local/writereview?placeid=ChIJlQUiOdtH0xQR-Wad-yR4a0I';
      
      try {
        fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rating: newRating,
            source: searchParams.get('source') || 'qr',
            branch: searchParams.get('branch') || 'Mahall Ankara',
            tableNumber: searchParams.get('table') || '',
            comment: 'High Rating Redirect'
          })
        });
      } catch (e) {
        console.error('Failed to log high rating', e);
      }

      setTimeout(() => {
        window.location.href = googleUrl;
      }, 1800);
    }
  };

  const showForm = rating > 0 && rating <= 3 && !formSubmitted;
  const showThankYouLow = formSubmitted;

  // Static Google Data for Mamma's Burger Mahall Ankara
  const googleData = {
    total: 48,
    average: 4.9,
    distribution: {
      5: 44,
      4: 4,
      3: 0,
      2: 0,
      1: 0
    }
  };

  return (
    <main className={`flex flex-col min-h-screen bg-white ${isRtl ? 'dir-rtl' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
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
            Memnuniyetiniz bizim için çok değerli. Görüşlerinizi paylaşmanız için Google Haritalar'a yönlendiriliyorsunuz...
          </p>
          <div className="mt-12 flex items-center justify-center gap-3">
             <span className="w-1.5 h-1.5 rounded-full bg-[#1a73e8] animate-pulse"></span>
             <span className="text-xs font-medium text-[#1a73e8] uppercase tracking-widest">Lütfen Bekleyin</span>
          </div>
        </div>
      )}

      {/* Google Maps Hero Header */}
      <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] bg-[#202124] overflow-hidden shadow-sm">
        <Image 
          src="https://www.mamasburger.com.tr/assets/site/img/logo-mini.png"
          alt="Mamma's Burger Cover"
          fill
          className="object-contain p-12 opacity-80"
          priority
        />
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
          <div className="w-16 h-16 rounded-full border-2 border-white bg-white shadow-xl overflow-hidden flex items-center justify-center">
            <Image 
              src="https://www.mamasburger.com.tr/assets/site/img/logo-mini.png" 
              alt="Logo" 
              width={40} 
              height={40} 
              className="object-contain"
            />
          </div>
        </div>
      </div>

      <div className="px-5 pt-8 pb-4">
        <h1 className="text-[22px] font-medium text-[#202124] tracking-tight">{t.restaurant_name ?? "Mamma's Burger Mahall Ankara"}</h1>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-sm font-medium text-[#202124]">{googleData.average}</span>
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                size={14} 
                className="fill-[#fbbc04] text-[#fbbc04]" 
              />
            ))}
          </div>
          <span className="text-sm text-[#70757a] ml-1">({googleData.total}) · Hamburger Restoranı</span>
          <Info size={14} className="text-[#1a73e8] ml-1" />
        </div>
      </div>

      <GoogleTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-grow">
        {activeTab === 'reviews' && (
          <div className="pb-24">
            {!showForm && !showThankYouLow && (
              <RatingStats 
                total={googleData.total} 
                average={googleData.average} 
                distribution={googleData.distribution} 
              />
            )}

            <div className="px-4 py-8 max-w-lg mx-auto flex flex-col items-center">
              {!showThankYouLow && !showForm && (
                <div className="w-full bg-white p-6 rounded-2xl shadow-[0_1px_2px_0_rgba(60,64,67,.3),0_1px_3px_1px_rgba(60,64,67,.15)] mb-8 transition-all border border-gray-100">
                  <h2 className="text-base font-medium text-[#202124] mb-6 text-center">{t.how_was_it}</h2>
                  <StarRating rating={rating} onRatingChange={handleRatingChange} />
                </div>
              )}

              {showForm && (
                <FeedbackForm rating={rating} onSuccess={() => setFormSubmitted(true)} />
              )}

              {showThankYouLow && <ThankYou rating={rating} />}

              {!showForm && <ReviewList />}

              <div className="mt-8 w-full border-t border-gray-100 pt-8 text-center text-xs text-[#70757a]">
                 Tüm yorumlar gerçek müşteri deneyimlerine dayanmaktadır.
              </div>
            </div>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="p-6 space-y-6">
            <div className="flex items-start gap-4 p-2">
              <MapPin className="text-[#1a73e8] mt-1" size={20} />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[#202124]">Adres</span>
                <p className="text-sm text-[#5f6368]">Mustafa Kemal, Mahall Ankara, 2112. Cd. No:4, 06510 Çankaya/Ankara</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-2">
              <Clock className="text-[#1a73e8] mt-1" size={20} />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[#202124]">Çalışma Saatleri</span>
                <p className="text-sm text-[#5f6368]">Açık · Kapanış saati: 22:00</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-2">
              <Phone className="text-[#1a73e8] mt-1" size={20} />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[#202124]">Telefon</span>
                <p className="text-sm text-[#5f6368]">(0312) 285 00 00</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* App Bar Style Footer */}
      <footer className="sticky bottom-0 bg-white border-t border-[#dadce0] px-6 py-4 flex justify-around items-center z-40 sm:hidden">
        <div className="flex flex-col items-center gap-1 opacity-40">
          <MessageSquare size={20} className="text-gray-700" />
          <span className="text-[10px] text-gray-600">Sohbet</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-[#1a73e8]">
          <Star size={20} className="fill-[#1a73e8] text-[#1a73e8]" />
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

export default function RatingPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-gray-100 rounded"></div>
        </div>
      </div>
    }>
      <RatingContent />
    </Suspense>
  );
}
