'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Send, Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface FeedbackFormProps {
  rating: number;
  onSuccess: () => void;
}

export default function FeedbackForm({ rating, onSuccess }: FeedbackFormProps) {
  const { t } = useTranslation();
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
    <div className="w-full max-w-md mx-auto animate-slide-up bg-white p-6 sm:p-8 rounded-2xl shadow-[0_1px_2px_0_rgba(60,64,67,.3),0_1px_3px_1px_rgba(60,64,67,.15)] border border-gray-100">
      <h3 className="text-xl font-medium mb-2 text-[#202124]">{t.share_experience}</h3>
      <p className="text-sm text-[#5f6368] mb-8">
        {t.feedback_reason}
      </p>

      {error && (
        <div className="bg-red-50 text-[#d93025] p-3 rounded-lg text-sm mb-6 border border-red-100">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 text-left">
        <div>
          <label htmlFor="comment" className="block text-xs font-medium text-[#70757a] uppercase tracking-wider mb-2">
            {t.comment_label} <span className="text-[#d93025]">*</span>
          </label>
          <textarea
            id="comment"
            required
            rows={4}
            value={formData.comment}
            onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
            placeholder={t.comment_placeholder}
            className="w-full px-4 py-3 rounded-xl border border-[#dadce0] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none transition-all resize-none text-[#202124] bg-white"
          />
        </div>

        <div className="space-y-6">
          <div className="relative group">
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={t.name_placeholder}
              className="w-full px-4 py-3 rounded-xl border border-[#dadce0] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none transition-all text-[#202124] bg-white placeholder-gray-400"
            />
            <label htmlFor="name" className="absolute -top-2.5 left-3 px-1 bg-white text-xs font-medium text-[#70757a]">
              {t.name_label} <span className="text-gray-400 font-normal">{t.optional}</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="relative group">
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder={t.phone_placeholder}
                className="w-full px-4 py-3 rounded-xl border border-[#dadce0] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none transition-all text-[#202124] bg-white placeholder-gray-400"
              />
              <label htmlFor="phone" className="absolute -top-2.5 left-3 px-1 bg-white text-xs font-medium text-[#70757a]">
                {t.phone_label}
              </label>
            </div>

            <div className="relative group">
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder={t.email_placeholder}
                className="w-full px-4 py-3 rounded-xl border border-[#dadce0] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] outline-none transition-all text-[#202124] bg-white placeholder-gray-400"
              />
              <label htmlFor="email" className="absolute -top-2.5 left-3 px-1 bg-white text-xs font-medium text-[#70757a]">
                {t.email_label}
              </label>
            </div>
          </div>
        </div>
        
        <div className="space-y-4 pt-2">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="flex-shrink-0 mt-0.5">
              <input
                type="checkbox"
                required
                className="w-4 h-4 rounded border-[#dadce0] text-[#1a73e8] focus:ring-[#1a73e8] transition-colors cursor-pointer"
                checked={formData.hasKvkkConsent}
                onChange={(e) => setFormData(prev => ({ ...prev, hasKvkkConsent: e.target.checked }))}
              />
            </div>
            <span className="text-[11px] text-[#70757a] leading-tight">
              {t.kvkk_consent_pt1} <a href="/kvkk" target="_blank" className="text-[#1a73e8] hover:underline">{t.kvkk_link}</a>{t.kvkk_consent_pt2}<a href="/acik-riza" target="_blank" className="text-[#1a73e8] hover:underline">{t.acik_riza_link}</a>{t.kvkk_consent_pt3} <span className="text-[#d93025] font-bold">*</span>
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="flex-shrink-0 mt-0.5">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-[#dadce0] text-[#1a73e8] focus:ring-[#1a73e8] transition-colors cursor-pointer"
                checked={formData.hasMarketingConsent}
                onChange={(e) => setFormData(prev => ({ ...prev, hasMarketingConsent: e.target.checked }))}
              />
            </div>
            <span className="text-[11px] text-[#70757a] leading-tight">
              {t.marketing_consent_pt1}<a href="/ticari-ileti" target="_blank" className="text-[#1a73e8] hover:underline">{t.marketing_link}</a>{t.marketing_consent_pt2}
            </span>
          </label>
        </div>
        
        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-[#1a73e8] hover:bg-[#1967d2] text-white font-medium px-6 py-3.5 rounded-full shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>{t.sending}</span>
              </>
            ) : (
              <>
                <Send size={18} />
                <span>{t.send}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
