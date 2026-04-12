'use client';

import { CheckCircle, ExternalLink } from 'lucide-react';

interface ThankYouProps {
  rating?: number;
  googleReviewUrl?: string | null;
}

export default function ThankYou({ rating, googleReviewUrl }: ThankYouProps) {
  const isLowRating = rating && rating <= 3;
  const hasGoogleUrl = !!googleReviewUrl;

  return (
    <div className="w-full max-w-md mx-auto text-center animate-fade-in">
      {/* Success Icon */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isLowRating ? 'bg-orange-50' : 'bg-green-50'}`}>
            <CheckCircle
              size={44}
              className={isLowRating ? 'text-orange-500' : 'text-green-500'}
              strokeWidth={1.8}
            />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 text-lg">
            {isLowRating ? '🙏' : '🎉'}
          </div>
        </div>
      </div>

      {/* Title & Message */}
      <h2 className="text-2xl font-bold text-[#111827] mb-3">
        {isLowRating ? 'Görüşünüz Alındı' : 'Teşekkür Ederiz!'}
      </h2>

      <p className="text-gray-500 mb-8 text-base leading-relaxed px-4">
        {isLowRating
          ? 'Geri bildiriminiz bizim için çok değerli. Yaşadığınız sorunu en kısa sürede inceleyip iyileştireceğiz.'
          : 'Güzel puanlamanız için çok teşekkürler! Sizi tekrar ağırlamaktan mutluluk duyarız.'}
      </p>

      {/* Google CTA — shown for all ratings if google URL exists */}
      {hasGoogleUrl && (
        <div className={`rounded-2xl p-5 border ${isLowRating ? 'bg-gray-50 border-gray-100' : 'bg-[#FDBF1D]/5 border-[#FDBF1D]/20'}`}>
          <p className="text-sm font-medium text-gray-600 mb-3">
            {isLowRating
              ? 'Deneyiminizi Google\'da da paylaşmak ister misiniz?'
              : 'Yorumunuzu Google\'da da paylaşın, diğer misafirlere yardımcı olun!'}
          </p>
          <a
            href={googleReviewUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center justify-center gap-2.5 font-semibold px-6 py-3 rounded-xl shadow-sm transition-all text-sm ${
              isLowRating
                ? 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:shadow-md'
                : 'bg-white border border-gray-200 text-gray-800 hover:shadow-md'
            }`}
          >
            {/* Google G Logo */}
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google&apos;da Yorum Yap
            <ExternalLink size={13} className="opacity-60" />
          </a>
        </div>
      )}

      {/* KVKK Footer */}
      <p className="text-xs text-gray-400 mt-6 px-4 leading-relaxed">
        Bu değerlendirme anonim olarak iletilmiştir. Kişisel veri toplanmamaktadır.{' '}
        <a href="/gizlilik" target="_blank" className="underline hover:text-gray-600">Gizlilik Politikası</a>
      </p>
    </div>
  );
}
