'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, X, Image as ImageIcon, Camera } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface FeedbackFormProps {
  rating: number;
  onSuccess: () => void;
}

export default function FeedbackForm({ rating, onSuccess }: FeedbackFormProps) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const source = searchParams.get('source') || 'qr';
  const branch = searchParams.get('branch') || 'Mahall Ankara';
  const tableNumber = searchParams.get('table') || '';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    comment: '',
    hasKvkkConsent: false,
    hasMarketingConsent: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.comment.trim()) {
      setError(t.error_comment_required);
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
        setError(result.error || t.error_generic);
        setIsSubmitting(false);
        return;
      }

      onSuccess();
    } catch (err) {
      setError(t.error_connection);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto animate-slide-up bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden mb-12">
      {/* Google Header Style */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-base font-medium text-[#202124]">Deneyiminizi Paylaşın</h3>
        <X size={20} className="text-[#70757a] opacity-60 cursor-pointer" />
      </div>

      <div className="p-5 sm:p-6">
        {/* Author Metadata */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-[#202124]">Misafir Kullanıcı</span>
            <span className="text-[11px] text-[#70757a]">Bu değerlendirme herkese açık olarak paylaşılacaktır</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-[#d93025] p-3 rounded-xl text-sm mb-6 border border-red-100 flex items-center gap-2">
            <span className="font-bold">!</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Main Comment Area */}
          <div className="space-y-2">
            <textarea
              id="comment"
              required
              rows={5}
              value={formData.comment}
              onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
              placeholder="Bu yerle ilgili kendi deneyiminizin ayrıntılarını paylaşın..."
              className="w-full px-0 py-2 border-none focus:ring-0 outline-none text-base text-[#202124] bg-transparent resize-none placeholder-[#70757a]"
            />
            <div className="h-px bg-[#dadce0] w-full" />
          </div>

          {/* Optional Info Section */}
          <div className="grid grid-cols-1 gap-5">
            <div className="relative border border-[#dadce0] rounded-lg px-3 py-2 focus-within:border-[#1a73e8] focus-within:ring-1 focus-within:ring-[#1a73e8] transition-all">
              <label htmlFor="name" className="block text-[11px] font-medium text-[#70757a] mb-0.5">Ad Soyad (Opsiyonel)</label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 outline-none text-[#202124]"
                placeholder="Örn: Ahmet Yılmaz"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1 relative border border-[#dadce0] rounded-lg px-3 py-2 focus-within:border-[#1a73e8] focus-within:ring-1 focus-within:ring-[#1a73e8] transition-all">
                <label htmlFor="phone" className="block text-[11px] font-medium text-[#70757a] mb-0.5">Telefon</label>
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 outline-none text-[#202124]"
                  placeholder="05xx..."
                />
              </div>
              <div className="flex-1 relative border border-[#dadce0] rounded-lg px-3 py-2 focus-within:border-[#1a73e8] focus-within:ring-1 focus-within:ring-[#1a73e8] transition-all">
                <label htmlFor="email" className="block text-[11px] font-medium text-[#70757a] mb-0.5">E-posta</label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 outline-none text-[#202124]"
                  placeholder="ornek@mail.com"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 py-2 opacity-60">
            <button type="button" className="flex items-center gap-2 text-sm font-medium text-[#70757a] hover:text-[#202124]">
              <ImageIcon size={20} />
              Fotoğraf ekle
            </button>
            <button type="button" className="flex items-center gap-2 text-sm font-medium text-[#70757a] hover:text-[#202124]">
              <Camera size={20} />
              Kamera
            </button>
          </div>
          
          {/* Consents Section */}
          <div className="space-y-4 border-t border-gray-100 pt-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                required
                className="mt-1 w-4 h-4 rounded border-[#dadce0] text-[#1a73e8] focus:ring-[#1a73e8]"
                checked={formData.hasKvkkConsent}
                onChange={(e) => setFormData(prev => ({ ...prev, hasKvkkConsent: e.target.checked }))}
              />
              <span className="text-[11px] text-[#70757a]">
                Aydınlatma Metni'ni okudum ve Kabul ediyorum <span className="text-[#d93025]">*</span>
              </span>
            </label>
          </div>
          
          <div className="flex justify-end pt-4 gap-4">
            <button type="button" className="px-5 py-2 text-sm font-medium text-[#1a73e8] hover:bg-blue-50 rounded-lg transition-colors">
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 bg-[#1a73e8] hover:bg-[#1967d2] text-white font-medium px-8 py-2 rounded-full shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Gönderiliyor...</span>
                </>
              ) : (
                <span>Yayınla</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
