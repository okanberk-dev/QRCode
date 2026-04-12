'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Send, Loader2 } from 'lucide-react';

interface FeedbackFormProps {
  rating: number;
  onSuccess: () => void;
}

export default function FeedbackForm({ rating, onSuccess }: FeedbackFormProps) {
  const searchParams = useSearchParams();
  const source = searchParams.get('source') || 'qr';
  const branch = searchParams.get('branch') || '';
  const tableNumber = searchParams.get('table') || '';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    comment: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.comment.trim()) {
      setError('Lütfen yorumunuzu belirtin.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          rating,
          source,
          branch,
          tableNumber
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

  return (
    <div className="w-full max-w-md mx-auto animate-slide-up bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <h3 className="text-xl font-semibold mb-2 text-[var(--color-text-main)]">Deneyiminizi paylaşın</h3>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">
        Size daha iyi hizmet verebilmemiz için görüşleriniz çok değerli.
      </p>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {/* Comment - Required for low ratings */}
        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
            Yorumunuz <span className="text-[var(--color-primary-500)]">*</span>
          </label>
          <textarea
            id="comment"
            required
            rows={4}
            value={formData.comment}
            onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
            placeholder="Neyi daha iyi yapabilirdik?"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--color-primary-500)] focus:ring-2 focus:ring-red-100 outline-none transition-all resize-none text-[var(--color-text-main)]"
          />
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Ad Soyad <span className="text-gray-400 font-normal">(İsteğe bağlı)</span>
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Adınız Soyadınız"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--color-primary-500)] focus:ring-2 focus:ring-red-100 outline-none transition-all text-[var(--color-text-main)]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Telefon <span className="text-gray-400 font-normal">(İsteğe bağlı)</span>
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="05XX XXX XX XX"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--color-primary-500)] focus:ring-2 focus:ring-red-100 outline-none transition-all text-[var(--color-text-main)]"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              E-posta <span className="text-gray-400 font-normal">(İsteğe bağlı)</span>
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="ornek@email.com"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--color-primary-500)] focus:ring-2 focus:ring-red-100 outline-none transition-all text-[var(--color-text-main)]"
            />
          </div>
        </div>
        
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-[var(--color-main)] bg-gradient-to-r from-[var(--color-primary-600)] to-[var(--color-primary-500)] text-white font-medium px-4 py-4 rounded-xl hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-red-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Gönderiliyor...</span>
              </>
            ) : (
              <>
                <Send size={20} />
                <span>Gönder</span>
              </>
            )}
          </button>
        </div>
        
        <p className="text-xs text-center text-gray-400 mt-4">
          Devam ederek <a href="/kvkk" className="underline hover:text-gray-600">KVKK Aydınlatma Metni</a>'ni okuduğunuzu ve kabul ettiğinizi onaylamış olursunuz.
        </p>
      </form>
    </div>
  );
}
