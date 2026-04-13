'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Send, Lock } from 'lucide-react';

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
    <div className="w-full">
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 border border-red-100 flex items-center gap-2 animate-in fade-in zoom-in duration-300">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        <div className="relative group">
          <textarea
            id="comment"
            rows={5}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('feedback_placeholder')}
            className="w-full px-5 py-4 rounded-2xl border border-gray-100 focus:border-[#1a73e8] focus:ring-4 focus:ring-blue-50/50 outline-none text-[16px] text-gray-800 bg-gray-50/30 resize-none placeholder-gray-400 transition-all min-h-[140px] shadow-sm group-hover:bg-white"
          />
        </div>

        {/* Photo Upload - More Refined Design */}
        <div className="pt-2">
          <div className="border-2 border-dashed border-gray-100 rounded-[24px] p-8 flex flex-col items-center justify-center gap-3 hover:border-blue-200 hover:bg-blue-50/20 transition-all cursor-pointer bg-gray-50/50 group">
            <div className="w-14 h-14 rounded-full bg-white shadow-md flex items-center justify-center text-gray-400 group-hover:text-blue-500 group-hover:scale-110 transition-all">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </div>
            <div className="text-center">
              <span className="block text-sm font-bold text-gray-700 group-hover:text-gray-900">{t('feedback_add_photo')}</span>
              <span className="text-[11px] text-gray-400 mt-1 block">{t('feedback_photo_hint')}</span>
            </div>
          </div>
        </div>

        <div className="space-y-6 pt-4">
          <div className="flex items-start gap-3">
             <div className="mt-0.5 p-1 bg-blue-50 rounded-md">
               <Lock size={12} className="text-blue-600" />
             </div>
             <p className="text-[11px] text-gray-500 leading-relaxed italic">
               {t('feedback_disclaimer')}
             </p>
          </div>
          
          <div className="flex items-center justify-end gap-3 border-t border-gray-50 pt-6">
            <button
              type="button"
              onClick={onSuccess}
              className="px-6 py-3 text-sm font-bold text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all"
            >
              {t('feedback_cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !comment.trim()}
              className="px-8 py-3 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-200/50 hover:shadow-xl hover:shadow-blue-300/50 transition-all disabled:opacity-30 disabled:shadow-none flex items-center gap-2 active:scale-95"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  <Send size={16} />
                  {t('feedback_post')}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

