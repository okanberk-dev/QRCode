'use client';

import { CheckCircle, ExternalLink, Heart } from 'lucide-react';

interface ThankYouProps {
  rating?: number;
  googleReviewUrl?: string | null;
}

interface ThankYouProps {
  rating?: number;
  googleReviewUrl?: string | null;
  t: (key: any) => string;
}

export default function ThankYou({ rating, googleReviewUrl, t }: ThankYouProps) {
  const isLowRating = rating && rating <= 3;
  const hasGoogleUrl = !!googleReviewUrl;

  return (
    <div className="w-full max-w-sm mx-auto text-center animate-in zoom-in-95 duration-500">
      {/* Success Icon */}
      <div className="flex justify-center mb-8">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-[#1a73e8]">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
      </div>

      {/* Title & Message */}
      <h2 className="text-2xl font-medium text-gray-900 mb-2">
        {t('feedback_thank_you')}
      </h2>

      <p className="text-gray-500 mb-10 text-base leading-relaxed">
        {t('feedback_thank_you_sub')}
      </p>

      {/* Google CTA */}
      {hasGoogleUrl && (
        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
          <p className="text-sm font-medium text-gray-700 mb-4">
            {t('feedback_share_google')}
          </p>
          <a
            href={googleReviewUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2.5 bg-white border border-gray-100 text-gray-800 font-bold px-6 py-3 rounded-xl shadow-sm hover:shadow-md transition-all text-sm active:scale-[0.98]"
          >
            {/* Google G Logo */}
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {t('feedback_google_btn')}
            <ExternalLink size={14} className="opacity-50" />
          </a>
        </div>
      )}
    </div>
  );
}
