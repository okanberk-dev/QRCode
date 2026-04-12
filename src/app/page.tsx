'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import StarRating from '@/components/StarRating';
import FeedbackForm from '@/components/FeedbackForm';
import ThankYou from '@/components/ThankYou';
import GoogleReviewLink from '@/components/GoogleReviewLink';
import { useTranslation } from '@/lib/i18n';

function RatingContent() {
  const [rating, setRating] = useState<number>(0);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const { t, isRtl } = useTranslation();
  const searchParams = useSearchParams();

  const handleRatingChange = async (newRating: number) => {
    setRating(newRating);

    // If 4 or 5 stars, log to DB and redirect to Google Review directly
    if (newRating >= 4) {
      const googleUrl = process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL || 'https://search.google.com/local/writereview?placeid=ChIJlQUiOdtH0xQR-Wad-yR4a0I';
      
      // Log the high rating in background (optional, but good for analytics)
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

      // Small delay for UX feel, then redirect
      setTimeout(() => {
        window.location.href = googleUrl;
      }, 600);
    }
  };

  const showForm = rating > 0 && rating <= 3 && !formSubmitted;
  const showThankYouLow = formSubmitted;
  const showThankYouHigh = false; // Never show high rating thank you page anymore as per user request

  return (
    <main className={`flex flex-col items-center min-h-screen px-4 py-8 sm:py-16 ${isRtl ? 'dir-rtl' : ''} bg-[#f8f9fa]`} dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-lg mx-auto flex flex-col items-center">
        
        {/* Mamma's Burger Brand Header */}
        <div className="text-center mb-8">
          <div className="relative w-28 h-28 mx-auto mb-4 drop-shadow-sm">
            <Image 
              src="/logo.png" 
              alt="Mamma's Burger Logo" 
              fill 
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-[#202124] mb-1">
            {t.restaurant_name}
          </h1>
          <p className="text-[#5f6368] text-base">
            {t.subtitle}
          </p>
        </div>

        {/* Rating Selector Card */}
        {!showThankYouLow && !showThankYouHigh && (
          <div className="w-full bg-white p-6 sm:p-8 rounded-2xl shadow-[0_1px_2px_0_rgba(60,64,67,.3),0_1px_3px_1px_rgba(60,64,67,.15)] mb-8 transition-all">
            <h2 className="text-lg font-medium text-[#202124] mb-6 text-center">{t.how_was_it}</h2>
            <StarRating rating={rating} onRatingChange={handleRatingChange} />
          </div>
        )}

        {/* Conditional Sections */}
        {showForm && (
          <FeedbackForm rating={rating} onSuccess={() => setFormSubmitted(true)} />
        )}

        {showThankYouLow && <ThankYou rating={rating} />}
        {showThankYouHigh && <ThankYou rating={rating} />}
        {/* Marketplace - Order Online Section */}
        {!showForm && !showThankYouLow && (
          <div className="w-full bg-white p-6 rounded-2xl shadow-[0_1px_2px_0_rgba(60,64,67,.3),0_1px_3px_1px_rgba(60,64,67,.15)] border border-gray-100 mb-8 animate-slide-up">
            <h3 className="text-center font-bold text-[#202124] mb-4 flex items-center justify-center gap-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
              {t.order_online}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <a 
                href="https://www.yemeksepeti.com/search?q=mamas+burger" 
                target="_blank" 
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-red-50 hover:border-red-100 transition-all group"
              >
                <span className="text-[10px] text-gray-400 group-hover:text-red-400 font-medium uppercase mb-1">Yemeksepeti</span>
                <span className="text-xs font-bold text-gray-700">Sipariş Ver</span>
              </a>
              <a 
                href="https://getir.com/yemek/arama/?q=mamas+burger" 
                target="_blank" 
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-purple-50 hover:border-purple-100 transition-all group"
              >
                <span className="text-[10px] text-gray-400 group-hover:text-purple-400 font-medium uppercase mb-1">GetirYemek</span>
                <span className="text-xs font-bold text-gray-700">Sipariş Ver</span>
              </a>
              <a 
                href="https://www.trendyol.com/sr?q=mamas%20burger" 
                target="_blank" 
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-orange-50 hover:border-orange-100 transition-all group"
              >
                <span className="text-[10px] text-gray-400 group-hover:text-orange-400 font-medium uppercase mb-1">Trendyol Yemek</span>
                <span className="text-xs font-bold text-gray-700">Sipariş Ver</span>
              </a>
              <a 
                href="https://mamasburger.com.tr" 
                target="_blank" 
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-yellow-50 hover:border-yellow-200 transition-all group"
              >
                <span className="text-[10px] text-gray-400 group-hover:text-yellow-600 font-medium uppercase mb-1">Web Site</span>
                <span className="text-xs font-bold text-gray-700">İncele</span>
              </a>
            </div>
          </div>
        )}

        {/* GoogleReviewLink is our always-visible compliance footer */}
        <GoogleReviewLink />
        
        {/* Footer */}
        <footer className="mt-12 pt-8 flex gap-6 text-xs text-[#70757a] w-full justify-center">
          <a href="/gizlilik" className="hover:text-[#202124] transition-colors">{t.privacy}</a>
          <a href="/kvkk" className="hover:text-[#202124] transition-colors">{t.kvkk}</a>
        </footer>
      </div>
    </main>
  );
}

export default function RatingPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-[#f8f9fa]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-gray-200 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    }>
      <RatingContent />
    </Suspense>
  );
}
