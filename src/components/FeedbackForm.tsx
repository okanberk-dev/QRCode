'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

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
    } catch (err) {
      setError('Bağlantı hatası. Lütfen internetinizi kontrol edin.');
      setIsSubmitting(false);
    }
  };

  const ratingLabels: Record<number, string> = {
    1: 'Çok kötü bir deneyim yaşadınız mı? Neler oldu?',
    2: 'Neler daha iyi olabilirdi?',
    3: 'Beklentilerinizi karşılamayan neler vardı?',
  };

  return (
    <div className="w-full animate-fade-in">
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm mb-5 border border-red-100 flex items-center gap-2">
          <span className="font-bold">!</span> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {ratingLabels[rating] || 'Deneyiminizi paylaşın'}
            <span className="font-normal text-gray-400 ml-1">(Opsiyonel)</span>
          </label>
          <textarea
            id="comment"
            rows={5}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Yorumunuzu buraya yazabilirsiniz..."
            className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 outline-none text-base text-gray-800 bg-white resize-none placeholder-gray-300 transition-all shadow-sm"
          />
        </div>

        {/* KVKK Bilgilendirme */}
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 leading-relaxed">
            <span className="font-semibold text-gray-600">🔒 Gizliliğiniz Korunuyor:</span> Bu değerlendirme formunda hiçbir kişisel bilginiz (ad, e-posta, telefon) toplanmamaktadır. 
            Gönderdiğiniz yorum anonim olarak işlenir. 6698 sayılı KVKK kapsamında verileriniz güvende.{' '}
            <a href="/gizlilik" target="_blank" className="underline text-gray-600 hover:text-gray-800">Gizlilik Politikası</a>
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 bg-[#111827] hover:bg-[#1f2937] text-white font-bold text-base px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          {isSubmitting ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <span>Gönder</span>
          )}
        </button>
      </form>
    </div>
  );
}
