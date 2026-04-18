'use client';

import { useState, useImperativeHandle, forwardRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { resolveFormConfig, type FormConfig } from '@/lib/form-config';

interface FeedbackFormProps {
  rating: number;
  onSuccess: () => void;
  restaurantSlug?: string;
  restaurantName?: string;
  formConfig?: string | FormConfig | null;
  t: (key: any) => string;
}

export interface FeedbackFormHandle {
  submit: () => void;
  isSubmitting: boolean;
  canSubmit: boolean;
}

const SERVICE_TYPES = ['dine_in', 'takeaway', 'delivery'] as const;

const FeedbackForm = forwardRef<FeedbackFormHandle, FeedbackFormProps>(
  ({ rating, onSuccess, restaurantSlug, restaurantName, formConfig, t }, ref) => {
    const searchParams = useSearchParams();
    const source = searchParams.get('source') || 'qr';
    const branch = restaurantName || searchParams.get('branch') || '';
    const tableNumber = searchParams.get('table') || '';

    // Accept either the raw stored string or an already-parsed object.
    const cfg = resolveFormConfig(
      typeof formConfig === 'string'
        ? formConfig
        : formConfig
          ? JSON.stringify(formConfig)
          : null
    );

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [comment, setComment] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [serviceType, setServiceType] = useState<string>('');
    const [foodRating, setFoodRating] = useState<number>(0);
    const [serviceRating, setServiceRating] = useState<number>(0);
    const [atmosphereRating, setAtmosphereRating] = useState<number>(0);
    const [marketingConsent, setMarketingConsent] = useState(false);

    const meetsRequired = (): boolean => {
      if (cfg.comment.required && !comment.trim()) return false;
      if (cfg.name.required && !name.trim()) return false;
      if (cfg.email.required && !email.trim()) return false;
      if (cfg.phone.required && !phone.trim()) return false;
      return true;
    };

    const handleSubmit = async () => {
      setError('');
      if (cfg.comment.required && !comment.trim()) {
        setError(t('feedback_comment_required') || 'Lütfen deneyiminizi paylaşın.');
        return;
      }
      if (cfg.name.required && !name.trim()) {
        setError(t('feedback_name_required') || 'Lütfen adınızı girin.');
        return;
      }
      if (cfg.email.required && !email.trim()) {
        setError(t('feedback_email_required') || 'Lütfen e-postanızı girin.');
        return;
      }
      if (cfg.phone.required && !phone.trim()) {
        setError(t('feedback_phone_required') || 'Lütfen telefon numaranızı girin.');
        return;
      }

      setIsSubmitting(true);

      const aspectsPayload = cfg.aspects.enabled
        ? {
            food: foodRating || null,
            service: serviceRating || null,
            atmosphere: atmosphereRating || null,
          }
        : null;

      try {
        const response = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: cfg.name.enabled ? name.trim() || null : null,
            email: cfg.email.enabled ? email.trim() || null : null,
            phone: cfg.phone.enabled ? phone.trim() || null : null,
            comment: comment.trim() || null,
            hasKvkkConsent: true,
            hasMarketingConsent: cfg.marketing.enabled ? marketingConsent : false,
            rating,
            source,
            branch,
            tableNumber,
            restaurantSlug,
            serviceType: cfg.serviceType.enabled ? serviceType || null : null,
            aspects: aspectsPayload,
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

    useImperativeHandle(ref, () => ({
      submit: handleSubmit,
      isSubmitting,
      canSubmit: meetsRequired(),
    }));

    const labelClass = 'ml-1 text-[11px] font-black uppercase tracking-[0.2em] text-gray-400';
    const inputClass = 'w-full rounded-2xl border-2 border-gray-100 bg-white px-5 py-3.5 text-sm font-medium text-gray-800 outline-none transition-all focus:border-blue-500';

    return (
      <div className="w-full mt-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
        <div className="space-y-5">
          {/* Comment */}
          <div className="bg-white rounded-2xl border-2 border-gray-100 p-6 focus-within:border-blue-500 transition-all duration-300 shadow-sm">
            <textarea
              id="comment"
              rows={5}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('feedback_placeholder') || 'Deneyiminizi paylaşın...'}
              className="w-full px-0 py-0 bg-transparent border-none focus:ring-0 text-[16px] text-gray-800 placeholder-gray-400 resize-none min-h-[140px] leading-relaxed"
            />
          </div>

          {/* Name */}
          {cfg.name.enabled && (
            <label className="block space-y-2">
              <span className={labelClass}>
                {t('feedback_field_name') || 'İsim'}
                {cfg.name.required && <span className="ml-1 text-red-500">*</span>}
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('feedback_field_name_ph') || 'Adınız'}
                className={inputClass}
              />
            </label>
          )}

          {/* Email */}
          {cfg.email.enabled && (
            <label className="block space-y-2">
              <span className={labelClass}>
                {t('feedback_field_email') || 'E-posta'}
                {cfg.email.required && <span className="ml-1 text-red-500">*</span>}
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
            </label>
          )}

          {/* Phone */}
          {cfg.phone.enabled && (
            <label className="block space-y-2">
              <span className={labelClass}>
                {t('feedback_field_phone') || 'Telefon'}
                {cfg.phone.required && <span className="ml-1 text-red-500">*</span>}
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+90 5XX XXX XX XX"
                className={inputClass}
              />
            </label>
          )}

          {/* Service Type */}
          {cfg.serviceType.enabled && (
            <div className="space-y-2">
              <span className={labelClass}>{t('feedback_field_service') || 'Servis Tipi'}</span>
              <div className="grid grid-cols-3 gap-2">
                {SERVICE_TYPES.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setServiceType(serviceType === st ? '' : st)}
                    className={`rounded-2xl border-2 px-3 py-3 text-xs font-black uppercase tracking-wide transition-all ${
                      serviceType === st
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-100 bg-white text-gray-500'
                    }`}
                  >
                    {t(`feedback_service_${st}`) || st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Aspect ratings */}
          {cfg.aspects.enabled && (
            <div className="space-y-3 rounded-2xl border-2 border-gray-100 bg-white p-5">
              <span className={labelClass}>{t('feedback_field_aspects') || 'Detaylı Puanlar'}</span>
              {[
                { key: 'food', label: t('feedback_aspect_food') || 'Yemek', value: foodRating, set: setFoodRating },
                { key: 'service', label: t('feedback_aspect_service') || 'Servis', value: serviceRating, set: setServiceRating },
                { key: 'atmosphere', label: t('feedback_aspect_atmosphere') || 'Atmosfer', value: atmosphereRating, set: setAtmosphereRating },
              ].map((aspect) => (
                <div key={aspect.key} className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-700">{aspect.label}</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => aspect.set(aspect.value === n ? 0 : n)}
                        className={`h-7 w-7 rounded-full text-sm font-black transition-all ${
                          aspect.value >= n
                            ? 'bg-yellow-400 text-gray-900'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Marketing consent */}
          {cfg.marketing.enabled && (
            <label className="flex items-start gap-3 rounded-2xl border-2 border-gray-100 bg-white p-4 cursor-pointer">
              <input
                type="checkbox"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded"
              />
              <span className="text-xs font-medium text-gray-600 leading-relaxed">
                {t('feedback_marketing_consent') || 'Kampanya ve duyurular için e-posta almak istiyorum.'}
              </span>
            </label>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 animate-in fade-in slide-in-from-top-1">
              {error}
            </div>
          )}

          {/* Guidelines/Privacy Text */}
          <div className="flex items-start gap-3 px-2 mt-2">
            <div className="p-1 px-1.5 rounded-md bg-blue-50 text-blue-500">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <p className="text-[11px] text-gray-400 leading-tight font-medium">
              {t('feedback_disclaimer')} {t('feedback_private_note')}
            </p>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !meetsRequired()}
            className={`w-full py-4 mt-2 rounded-2xl text-[16px] font-extrabold transition-all flex items-center justify-center gap-2 ${
              isSubmitting || !meetsRequired()
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                : 'bg-blue-600 text-white shadow-[0_4px_0_0_#1e3a8a] border-2 border-blue-700 hover:bg-blue-500 hover:-translate-y-1 hover:shadow-[0_6px_0_0_#1e3a8a] active:translate-y-2 active:shadow-none'
            }`}
          >
            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : t('feedback_post')}
          </button>
        </div>
      </div>
    );
  }
);

FeedbackForm.displayName = 'FeedbackForm';

export default FeedbackForm;
