'use client';

import { ExternalLink, CheckCircle2, Heart, MessageCircle, Sparkles, Info } from 'lucide-react';

interface ThankYouProps {
  rating?: number;
  googleReviewUrl?: string | null;
  t: (key: any) => string;
}

type Variant = {
  bubbleBg: string;
  bubbleText: string;
  Icon: typeof CheckCircle2;
  accent: string;
  titleKey: string;
  subKey: string;
  noteKey: string;
};

const VARIANTS: Record<1 | 2 | 3, Variant> = {
  1: {
    bubbleBg: 'bg-red-50',
    bubbleText: 'text-red-500',
    Icon: Heart,
    accent: 'bg-red-500',
    titleKey: 'thanks_1_title',
    subKey: 'thanks_1_sub',
    noteKey: 'thanks_1_note',
  },
  2: {
    bubbleBg: 'bg-orange-50',
    bubbleText: 'text-orange-500',
    Icon: MessageCircle,
    accent: 'bg-orange-500',
    titleKey: 'thanks_2_title',
    subKey: 'thanks_2_sub',
    noteKey: 'thanks_2_note',
  },
  3: {
    bubbleBg: 'bg-amber-50',
    bubbleText: 'text-amber-500',
    Icon: Sparkles,
    accent: 'bg-amber-500',
    titleKey: 'thanks_3_title',
    subKey: 'thanks_3_sub',
    noteKey: 'thanks_3_note',
  },
};

export default function ThankYou({ rating, googleReviewUrl, t }: ThankYouProps) {
  const hasGoogleUrl = !!googleReviewUrl && (rating === undefined || rating >= 4);
  const lowRatingVariant = rating && rating >= 1 && rating <= 3 ? VARIANTS[rating as 1 | 2 | 3] : null;

  const title = lowRatingVariant ? t(lowRatingVariant.titleKey) : t('feedback_thank_you');
  const subtitle = lowRatingVariant ? t(lowRatingVariant.subKey) : t('feedback_thank_you_sub');
  const BubbleIcon = lowRatingVariant ? lowRatingVariant.Icon : CheckCircle2;
  const bubbleBg = lowRatingVariant ? lowRatingVariant.bubbleBg : 'bg-green-50';
  const bubbleText = lowRatingVariant ? lowRatingVariant.bubbleText : 'text-green-500';

  return (
    <div className="w-full max-w-sm mx-auto text-center py-6 animate-in zoom-in-95 duration-500">
      {/* Success Animation Container */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          <div className={`w-20 h-20 ${bubbleBg} rounded-full flex items-center justify-center ${bubbleText} transition-transform hover:scale-110 duration-300`}>
            <BubbleIcon size={44} strokeWidth={1.5} />
          </div>
          {/* Decorative particles for success feel */}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-100 rounded-full animate-ping" />
          <div className="absolute -bottom-2 -left-2 w-2 h-2 bg-[#FFF8D6] rounded-full animate-bounce" />
        </div>
      </div>

      {/* Title & Message */}
      <h2 className="text-2xl font-bold text-[#1A2332] mb-3 tracking-tight">
        {title}
      </h2>

      <p className="text-[#6B7280] mb-6 text-[15px] leading-relaxed px-4">
        {subtitle}
      </p>

      {/* Rating-specific note card */}
      {lowRatingVariant && (
        <div className="mx-4 mb-8 flex items-start gap-3 text-left bg-[#F8F6F1]/60 border border-[#E8ECF2] rounded-2xl px-4 py-3">
          <div className={`mt-0.5 w-1.5 h-1.5 rounded-full ${lowRatingVariant.accent} flex-shrink-0 animate-pulse`} />
          <Info size={14} className="text-[#6B7280] flex-shrink-0 mt-0.5" />
          <p className="text-[11.5px] font-semibold text-[#2A3444] leading-snug">
            {t(lowRatingVariant.noteKey)}
          </p>
        </div>
      )}

      {/* Google CTA - Minimalist Version */}
      {hasGoogleUrl && (
        <div className="mt-8 space-y-4">
          <div className="relative py-4">
             <div className="absolute inset-0 flex items-center" aria-hidden="true">
               <div className="w-full border-t border-[#E8ECF2]"></div>
             </div>
             <div className="relative flex justify-center text-xs uppercase">
               <span className="bg-white px-3 text-[#6B7280] font-bold tracking-widest">{t('feedback_share_google')}</span>
             </div>
          </div>

          <a
            href={googleReviewUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-center gap-3 bg-white border border-[#E8ECF2] text-[#1A2332] font-bold px-8 py-4 rounded-2xl shadow-sm hover:shadow-md hover:border-[#C9D0DB] transition-all active:scale-[0.98] w-full"
          >
            {/* Google G Logo */}
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="text-[15px]">{t('feedback_google_btn')}</span>
            <ExternalLink size={16} className="text-[#C9D0DB] group-hover:text-[#6B7280] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </a>
        </div>
      )}

      <button
        onClick={() => window.location.reload()}
        className="mt-12 text-sm font-bold text-[#6B7280] hover:text-[#F4B400] transition-colors"
      >
        {t('feedback_close')}
      </button>
    </div>
  );
}
