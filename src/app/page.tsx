'use client';

import { useSearchParams } from 'next/navigation';
import StarRating from '@/components/StarRating';
import FeedbackForm from '@/components/FeedbackForm';
import ThankYou from '@/components/ThankYou';
import GoogleReviewLink from '@/components/GoogleReviewLink';
import { useTranslation } from '@/lib/i18n';

export default function RatingPage() {
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
    <main className={`flex flex-col items-center justify-center min-h-screen px-4 py-12 ${isRtl ? 'dir-rtl' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-lg mx-auto flex flex-col items-center text-center">
        
        {/* Branding placeholder */}
        <div className="w-24 h-24 mb-6 rounded-full bg-[var(--color-primary-50)] text-[var(--color-primary-600)] flex items-center justify-center shadow-sm">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-[var(--color-text-main)] mb-2">
          {t.restaurant_name}
        </h1>
        <p className="text-[var(--color-text-muted)] text-lg mb-8">
          {t.subtitle}
        </p>

        {/* Rating Selector - Hidden if form is successfully submitted or if high rating selected */}
        {!showThankYouLow && !showThankYouHigh && (
          <div className="w-full bg-white p-6 rounded-3xl shadow-sm mb-8 border border-gray-100">
            <h2 className="text-xl font-medium text-gray-800 mb-2">{t.how_was_it}</h2>
            <StarRating rating={rating} onRatingChange={handleRatingChange} />
          </div>
        )}

        {/* Conditional Sections */}
        {showForm && (
          <FeedbackForm rating={rating} onSuccess={() => setFormSubmitted(true)} />
        )}

        {showThankYouLow && <ThankYou rating={rating} />}
        {showThankYouHigh && <ThankYou rating={rating} />}

        {/* Compliance Always-Visible Link */}
        <GoogleReviewLink />
        
        {/* Footer */}
        <footer className="mt-auto pt-8 flex gap-4 text-sm text-gray-400 border-t border-gray-100 w-full justify-center">
          <a href="/gizlilik" className="hover:text-gray-600 transition-colors">{t.privacy}</a>
          <span>&bull;</span>
          <a href="/kvkk" className="hover:text-gray-600 transition-colors">{t.kvkk}</a>
        </footer>
      </div>
    </main>
  );
}
