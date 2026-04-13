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
      <div className="w-full mt-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
        <div className="space-y-6">
          {/* Experience Input Section */}
          <div className="bg-white rounded-2xl border-2 border-gray-100 p-6 focus-within:border-blue-500 transition-all duration-300 shadow-sm">
            <textarea
              id="comment"
              rows={5}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('feedback_placeholder') || 'Deneyiminizi paylaşın...'}
              className="w-full px-0 py-0 bg-transparent border-none focus:ring-0 text-[16px] text-gray-800 placeholder-gray-400 resize-none min-h-[140px] leading-relaxed"
            />
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
