'use client';

import { useState, useImperativeHandle, forwardRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Camera } from 'lucide-react';

interface FeedbackFormProps {
  rating: number;
  onSuccess: () => void;
  restaurantSlug?: string;
  restaurantName?: string;
  t: (key: any) => string;
}

export interface FeedbackFormHandle {
  submit: () => void;
  isSubmitting: boolean;
  canSubmit: boolean;
}

const FeedbackForm = forwardRef<FeedbackFormHandle, FeedbackFormProps>(
  ({ rating, onSuccess, restaurantSlug, restaurantName, t }, ref) => {
    const searchParams = useSearchParams();
    const source = searchParams.get('source') || 'qr';
    const branch = restaurantName || searchParams.get('branch') || '';
    const tableNumber = searchParams.get('table') || '';

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [comment, setComment] = useState('');

    const handleSubmit = async () => {
      if (!comment.trim()) {
        setError('Lütfen deneyiminizi paylaşın.');
        return;
      }
      
      setError('');
      setIsSubmitting(true);

      try {
        const response = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: null,
            email: null,
            phone: null,
            comment: comment.trim(),
            hasKvkkConsent: true,
            hasMarketingConsent: false,
            rating,
            source,
            branch,
            tableNumber,
            restaurantSlug,
            serviceType: null,
            aspects: null,
          })
        });

        const result = await response.json();

        if (!response.ok) {
          setError(result.error || 'Bir hata oluştu, lütfen tekrar deneyin.');
          setIsSubmitting(false);
          return;
        }

        onSuccess();
      } catch {
        setError('Bağlantı hatası. Lütfen internetinizi kontrol edin.');
        setIsSubmitting(false);
      }
    };

    useImperativeHandle(ref, () => ({
      submit: handleSubmit,
      isSubmitting,
      canSubmit: comment.trim().length > 0,
    }));

    return (
      <div className="w-full mt-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="space-y-6">
          {/* Experience Input Section */}
          <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-4 focus-within:border-blue-200 focus-within:bg-white transition-all duration-300">
            <textarea
              id="comment"
              rows={5}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('feedback_placeholder')}
              className="w-full px-0 py-1 bg-transparent border-none focus:ring-0 text-base text-gray-800 placeholder-gray-400 resize-none min-h-[160px]"
            />
            
            <div className="flex items-center justify-between pt-3 border-t border-gray-100/50">
               <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors group"
                  >
                    <Camera size={20} className="group-hover:text-blue-500" />
                    <span className="text-xs font-bold">{t('feedback_add_photo')}</span>
                  </button>
               </div>
               <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  {comment.length} / 4000
               </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 animate-in fade-in slide-in-from-top-1">
              {error}
            </div>
          )}

          {/* Guidelines/Privacy Text */}
          <div className="flex items-start gap-3 px-2 mt-4">
            <div className="p-1 px-1.5 rounded-md bg-blue-50 text-blue-500">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <p className="text-[11px] text-gray-400 leading-tight font-medium">
              {t('feedback_disclaimer')} Bu yorum Google Haritalar standartlarında anonim olarak işlenmektedir.
            </p>
          </div>
        </div>
      </div>
    );
  }
);

FeedbackForm.displayName = 'FeedbackForm';

export default FeedbackForm;
