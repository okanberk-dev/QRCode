'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Star } from 'lucide-react';
import StarRating from '@/components/StarRating';
import FeedbackForm from '@/components/FeedbackForm';
import ThankYou from '@/components/ThankYou';
import GoogleReviewLink from '@/components/GoogleReviewLink';
import ReviewList from '@/components/ReviewList';
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
    <main className={`flex flex-col items-center min-h-screen px-4 py-8 sm:py-12 ${isRtl ? 'dir-rtl' : ''} bg-[#f8f9fa]`} dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-lg mx-auto flex flex-col items-center">
        
        {/* Brand Header with Google Rating Summary */}
        <div className="text-center mb-8">
          <div className="relative w-28 h-28 mx-auto mb-4 drop-shadow-sm">
            <Image 
              src="https://www.mamasburger.com.tr/assets/site/img/logo-mini.png" 
              alt="Mamma's Burger Logo" 
              fill 
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-[#202124] mb-1">
            {t.restaurant_name}
          </h1>
          
          {/* Google Maps Style Rating Summary */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-sm font-bold text-[#202124]">4.9</span>
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} className="fill-[#fbbc04] text-[#fbbc04]" />
              ))}
            </div>
            <span className="text-xs text-[#70757a] hover:text-[#1a73e8] cursor-pointer">(48 Yorum)</span>
          </div>

          <p className="text-[#5f6368] text-sm italic">
            {t.subtitle}
          </p>
        </div>

        {/* Rating Selector Card */}
        {!showThankYouLow && !showThankYouHigh && (
          <div className="w-full bg-white p-6 sm:p-8 rounded-2xl shadow-[0_1px_2px_0_rgba(60,64,67,.3),0_1px_3px_1px_rgba(60,64,67,.15)] mb-10 transition-all border border-gray-100">
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

        {/* Real Reviews Section - Appears only on landing page or after low feedback */}
        {!showForm && <ReviewList />}

        {/* GoogleReviewLink compliance footer */}
        <div className="mt-4 w-full">
           <GoogleReviewLink />
        </div>
        
        {/* Footer */}
        <footer className="mt-12 mb-8 flex gap-6 text-[10px] text-[#70757a] w-full justify-center opacity-60">
          <a href="/gizlilik" className="hover:text-[#202124] transition-colors whitespace-nowrap">{t.privacy}</a>
          <a href="/kvkk" className="hover:text-[#202124] transition-colors whitespace-nowrap">{t.kvkk}</a>
          <a href="/acik-riza" className="hover:text-[#202124] transition-colors whitespace-nowrap">Açık Rıza</a>
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
