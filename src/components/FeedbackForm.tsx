'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Camera, X } from 'lucide-react';

interface FeedbackFormProps {
  rating: number;
  onSuccess: () => void;
  restaurantSlug?: string;
  restaurantName?: string;
  t: (key: any) => string;
}

export default function FeedbackForm({ rating, onSuccess, restaurantSlug, restaurantName, t }: FeedbackFormProps) {
  const searchParams = useSearchParams();
  const source = searchParams.get('source') || 'qr';
  const branch = restaurantName || searchParams.get('branch') || '';
  const tableNumber = searchParams.get('table') || '';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <div className="w-full mt-2">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Experience Input Section */}
        <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-4 focus-within:border-blue-200 focus-within:bg-white transition-all duration-300">
          <textarea
            id="comment"
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('feedback_placeholder')}
            className="w-full px-0 py-1 bg-transparent border-none focus:ring-0 text-[15px] text-gray-800 placeholder-gray-400 resize-none min-h-[120px]"
          />
          
          <div className="flex items-center justify-between pt-2 border-t border-gray-100/50">
             <div className="flex gap-2">
                <button
                  type="button"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-gray-100 text-gray-500 transition-colors group"
                >
                  <Camera size={18} className="group-hover:text-blue-500" />
                  <span className="text-xs font-semibold">{t('feedback_add_photo')}</span>
                </button>
             </div>
             <div className="text-[10px] text-gray-400 font-medium">
                {comment.length} karakter
             </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-medium border border-red-100 animate-in fade-in slide-in-from-top-1">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting || !comment.trim()}
              className="flex-1 px-6 py-3 bg-[#1a73e8] hover:bg-[#1557b0] disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-sm rounded-xl shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                t('feedback_post')
              )}
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-6 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
            >
              {t('feedback_cancel')}
            </button>
          </div>

          <div className="flex items-start gap-2 px-2">
            <div className="p-1 rounded-full bg-blue-50 text-blue-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <p className="text-[10px] text-gray-400 leading-tight">
              {t('feedback_disclaimer')}
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
