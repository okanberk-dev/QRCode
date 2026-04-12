'use client';

import { CheckCircle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface ThankYouProps {
  rating?: number;
}

export default function ThankYou({ rating }: ThankYouProps) {
  const { t } = useTranslation();
  const isHighRating = rating && rating >= 4;

  return (
    <div className="w-full max-w-md mx-auto text-center animate-slide-up bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
      <div className="flex justify-center mb-6 text-[var(--color-success)]">
        <CheckCircle size={64} className="star-anim-pulse" strokeWidth={1.5} />
      </div>
      
      <h2 className="text-2xl font-bold mb-3 text-[var(--color-text-main)]">
        {t.thank_you}
      </h2>
      
      <p className="text-[var(--color-text-muted)] mb-8 text-lg">
        {isHighRating
          ? t.thank_you_high
          : t.thank_you_low}
      </p>

      {isHighRating && (
        <a 
          href={process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL || 'https://search.google.com/local/writereview?placeid=YOUR_PLACE_ID'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-[#4285F4] hover:bg-[#3367D6] text-white font-medium px-6 py-4 rounded-xl shadow-[0_4px_14px_0_rgba(66,133,244,0.39)] hover:shadow-[0_6px_20px_rgba(66,133,244,0.23)] hover:-translate-y-1 transition-all duration-200"
        >
          <svg className="w-6 h-6 bg-white rounded-full p-1 border border-white/20 mr-1" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {t.google_review_btn}
        </a>
      )}
    </div>
  );
}
