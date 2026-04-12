'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
      const googleUrl = process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL || 'https://search.google.com/local/writereview?placeid=YOUR_PLACE_ID';
      
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
        
        {/* Google-style Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100">
             <svg className="w-10 h-10 text-[var(--color-primary-500)]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-medium text-[#202124] mb-1">
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
