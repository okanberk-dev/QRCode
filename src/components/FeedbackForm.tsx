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
          serviceType,
          aspects,
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

  const [serviceType, setServiceType] = useState<string | null>(null);
  const [aspects, setAspects] = useState({ food: 0, service: 0, atmosphere: 0 });

  return (
    <div className="w-full">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-100 italic">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Service Type Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">{t('feedback_service_type')}</label>
          <div className="flex flex-wrap gap-2">
            {['dine_in', 'takeout', 'delivery'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setServiceType(type)}
                className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                  serviceType === type 
                    ? 'bg-blue-50 border-blue-200 text-blue-600' 
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {t(`feedback_${type}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Aspect Ratings */}
        <div className="space-y-4 pt-2">
          {['food', 'service', 'atmosphere'].map((aspect) => (
            <div key={aspect} className="flex items-center justify-between group">
              <span className="text-sm text-gray-600 font-medium">{t(`feedback_${aspect}`)}</span>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setAspects(prev => ({ ...prev, [aspect]: s }))}
                    className="focus:outline-none transition-transform active:scale-90"
                  >
                    <Star 
                      size={20} 
                      className={`${s <= (aspects as any)[aspect] ? 'fill-[#fbbc04] text-[#fbbc04]' : 'text-gray-200 fill-gray-100'} transition-colors`} 
                      strokeWidth={1.5}
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="relative pt-4">
          <textarea
            id="comment"
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('feedback_placeholder')}
            className="w-full px-0 py-2 border-b-2 border-gray-100 focus:border-[#1a73e8] outline-none text-[15px] text-gray-800 bg-transparent resize-none placeholder-gray-400 transition-all min-h-[100px]"
          />
        </div>

        {/* Photo Upload Placeholder */}
        <div className="pt-2">
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 hover:border-gray-300 transition-colors cursor-pointer bg-gray-50/30 group">
            <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400 group-hover:text-blue-500 transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </div>
            <span className="text-sm font-bold text-gray-700">{t('feedback_add_photo')}</span>
            <span className="text-[11px] text-gray-400">{t('feedback_photo_hint')}</span>
          </div>
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
