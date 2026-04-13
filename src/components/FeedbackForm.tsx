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

  const ratingLabels: Record<number, { title: string; placeholder: string }> = {
    1: { title: 'Neler yaşadığınızı öğrenebilir miyiz?', placeholder: 'Yaşadığınız sorunu kısaca anlatın...' },
    2: { title: 'Neler daha iyi olabilirdi?', placeholder: 'Beklentilerinizi karşılayamadığımız noktalar neler?' },
    3: { title: 'Sizin için neleri iyileştirebiliriz?', placeholder: 'Önerilerinizi paylaşın...' },
  };

  const label = ratingLabels[rating] || { title: 'Deneyiminizi paylaşın', placeholder: 'Yorumunuzu buraya yazabilirsiniz...' };

  return (
    <div className="w-full">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-100 italic">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="relative">
          <textarea
            id="comment"
            rows={5}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('feedback_placeholder')}
            className="w-full px-0 py-2 border-b-2 border-gray-100 focus:border-[#1a73e8] outline-none text-[15px] text-gray-800 bg-transparent resize-none placeholder-gray-400 transition-all min-h-[120px]"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-[11px] text-gray-400 leading-relaxed max-w-[60%] italic">
            {t('feedback_disclaimer')}
          </div>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSuccess}
              className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"
            >
              {t('feedback_cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold text-sm rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                </>
              ) : (
                t('feedback_post')
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
