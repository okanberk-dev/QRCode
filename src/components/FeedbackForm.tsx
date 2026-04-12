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
    <div className="w-full max-w-md mx-auto animate-slide-up bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <h3 className="text-xl font-semibold mb-2 text-[var(--color-text-main)]">{t.share_experience}</h3>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">
        {t.feedback_reason}
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
            {t.comment_label} <span className="text-[var(--color-primary-500)]">*</span>
          </label>
          <textarea
            id="comment"
            required
            rows={4}
            value={formData.comment}
            onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
            placeholder={t.comment_placeholder}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--color-primary-500)] focus:ring-2 focus:ring-red-100 outline-none transition-all resize-none text-[var(--color-text-main)]"
          />
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            {t.name_label} <span className="text-gray-400 font-normal">{t.optional}</span>
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder={t.name_placeholder}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--color-primary-500)] focus:ring-2 focus:ring-red-100 outline-none transition-all text-[var(--color-text-main)]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              {t.phone_label} <span className="text-gray-400 font-normal">{t.optional}</span>
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder={t.phone_placeholder}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--color-primary-500)] focus:ring-2 focus:ring-red-100 outline-none transition-all text-[var(--color-text-main)]"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              {t.email_label} <span className="text-gray-400 font-normal">{t.optional}</span>
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder={t.email_placeholder}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--color-primary-500)] focus:ring-2 focus:ring-red-100 outline-none transition-all text-[var(--color-text-main)]"
            />
          </div>
        </div>
        
        <div className="space-y-3 mt-4">
          <label className="flex items-start gap-2 cursor-pointer group">
            <div className="flex-shrink-0 mt-0.5">
              <input
                type="checkbox"
                required
                className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 transition-colors cursor-pointer"
                checked={formData.hasKvkkConsent}
                onChange={(e) => setFormData(prev => ({ ...prev, hasKvkkConsent: e.target.checked }))}
              />
            </div>
            <span className="text-xs text-gray-500 leading-tight">
              {t.kvkk_consent_pt1} <a href="/kvkk" target="_blank" className="text-red-500 hover:underline">{t.kvkk_link}</a>{t.kvkk_consent_pt2}<a href="/acik-riza" target="_blank" className="text-red-500 hover:underline">{t.acik_riza_link}</a>{t.kvkk_consent_pt3} <span className="text-red-500">*</span>
            </span>
          </label>

          <label className="flex items-start gap-2 cursor-pointer group">
            <div className="flex-shrink-0 mt-0.5">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 transition-colors cursor-pointer"
                checked={formData.hasMarketingConsent}
                onChange={(e) => setFormData(prev => ({ ...prev, hasMarketingConsent: e.target.checked }))}
              />
            </div>
            <span className="text-xs text-gray-500 leading-tight">
              {t.marketing_consent_pt1}<a href="/ticari-ileti" target="_blank" className="text-red-500 hover:underline">{t.marketing_link}</a>{t.marketing_consent_pt2}
            </span>
          </label>
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
                <span>{t.sending}</span>
              </>
            ) : (
              <>
                <Send size={20} />
                <span>{t.send}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
