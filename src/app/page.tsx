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
  const { t, isRtl } = useTranslation();
  const searchParams = useSearchParams();

  const handleRatingChange = async (newRating: number) => {
    setRating(newRating);

    // If 4 or 5 stars, log to DB and redirect to Google Review directly
    if (newRating >= 4) {
      const googleUrl = process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL || 'https://search.google.com/local/writereview?placeid=ChIJlQUiOdtH0xQR-Wad-yR4a0I';
      
      try {
        fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rating: newRating,
            source: searchParams.get('source') || 'qr',
            branch: searchParams.get('branch') || '',
            tableNumber: searchParams.get('table') || '',
            comment: 'High Rating Redirect'
          })
        });
      } catch (e) {
        console.error('Failed to log high rating', e);
      }

      setTimeout(() => {
        window.location.href = googleUrl;
      }, 600);
    }
  };

  const showForm = rating > 0 && rating <= 3 && !formSubmitted;
  const showThankYouLow = formSubmitted;

  // Real Google Data for Mamma's Burger Mahall Ankara
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
      {/* Google Maps Hero Header */}
      <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] bg-gray-100 overflow-hidden shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        <Image 
          src="https://www.mamasburger.com.tr/assets/site/img/logo-mini.png"
          alt="Mamma's Burger Cover"
          fill
          className="object-contain p-12 bg-[#202124]"
          priority
        />
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
          <div className="w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg cursor-pointer">
            <ChevronDown className="text-gray-700" size={20} />
          </div>
          <div className="flex gap-2">
            <div className="w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg">
              <Share2 size={18} className="text-gray-700" />
            </div>
          </div>
        </div>
        
        {/* Floating Brand Badge */}
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

      {/* Brand Info Area */}
      <div className="px-5 pt-8 pb-4">
        <h1 className="text-[22px] font-medium text-[#202124] tracking-tight">{t.restaurant_name}</h1>
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

      {/* Google Tabs */}
      <GoogleTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-grow">
        {activeTab === 'reviews' && (
          <div className="pb-24">
            {/* Rating Summary Bars */}
            {!showForm && !showThankYouLow && (
              <RatingStats 
                total={googleData.total} 
                average={googleData.average} 
                distribution={googleData.distribution} 
              />
            )}

            <div className="px-4 py-8 max-w-lg mx-auto flex flex-col items-center">
              {/* Star Input Card */}
              {!showThankYouLow && !showForm && (
                <div className="w-full bg-white p-6 rounded-2xl shadow-[0_1px_2px_0_rgba(60,64,67,.3),0_1px_3px_1px_rgba(60,64,67,.15)] mb-8 transition-all border border-gray-100">
                  <h2 className="text-base font-medium text-[#202124] mb-6 text-center">{t.how_was_it}</h2>
                  <StarRating rating={rating} onRatingChange={handleRatingChange} />
                </div>
              )}

              {/* Conditional Sections */}
              {showForm && (
                <FeedbackForm rating={rating} onSuccess={() => setFormSubmitted(true)} />
              )}

              {showThankYouLow && <ThankYou rating={rating} />}

              {/* Real Reviews List */}
              {!showForm && <ReviewList />}

              <div className="mt-8 w-full border-t border-gray-100 pt-8">
                <GoogleReviewLink />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="p-10 text-center text-gray-500 italic">
            Bu bölüm Google Haritalar'dan çekilmektedir.
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
