'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Send, Lock } from 'lucide-react';

interface FeedbackFormProps {
  rating: number;
  onSuccess: () => void;
  restaurantSlug?: string;
  restaurantName?: string;
}

export default function FeedbackForm({ rating, onSuccess, restaurantSlug, restaurantName }: FeedbackFormProps) {
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
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm mb-5 border border-red-100 flex items-start gap-2.5">
          <span className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">!</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2.5">
            {label.title}
            <span className="font-normal text-gray-400 ml-1.5 text-xs">(Opsiyonel)</span>
          </label>
          <textarea
            id="comment"
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={label.placeholder}
            className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 focus:border-[#FDBF1D] focus:ring-2 focus:ring-[#FDBF1D]/10 outline-none text-[15px] text-gray-800 bg-gray-50/50 focus:bg-white resize-none placeholder-gray-300 transition-all"
          />
        </div>

        <div className="flex items-start gap-3 bg-gray-50 rounded-2xl p-4 border border-gray-100/80">
          <Lock size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] sm:text-xs text-gray-500 leading-relaxed">
            <span className="font-semibold text-gray-600">Gizliliğiniz korunuyor.</span>{' '}
            Kişisel bilgi toplanmaz, değerlendirmeniz anonim olarak işlenir.{' '}
            <a href="/tr/privacy" target="_blank" className="underline text-gray-500 hover:text-gray-700 transition-colors">Gizlilik Politikası</a>
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2.5 bg-[#111827] hover:bg-[#1f2937] text-white font-bold text-[15px] px-8 py-4 rounded-2xl shadow-lg shadow-gray-900/10 hover:shadow-xl hover:shadow-gray-900/15 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              <span>Gönderiliyor...</span>
            </>
          ) : (
            <>
              <Send size={16} />
              <span>Geri Bildirimi Gönder</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
