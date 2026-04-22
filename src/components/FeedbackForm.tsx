'use client';

import { useState, useImperativeHandle, forwardRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Camera } from 'lucide-react';

interface FeedbackFormProps {
  rating: number;
  onSuccess: () => void;
  restaurantSlug?: string;
  restaurantName?: string;
  platform?: string;
  t: (key: any) => string;
}

export interface FeedbackFormHandle {
  submit: () => void;
  isSubmitting: boolean;
  canSubmit: boolean;
}

const FeedbackForm = forwardRef<FeedbackFormHandle, FeedbackFormProps>(
  ({ rating, onSuccess, restaurantSlug, restaurantName, platform, t }, ref) => {
    const searchParams = useSearchParams();
    const source = searchParams.get('source') || 'qr';
    const branch = restaurantName || searchParams.get('branch') || '';
    const tableNumber = searchParams.get('table') || '';

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [comment, setComment] = useState('');
    const [website, setWebsite] = useState('');

    // Lead generation fields
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [hasKvkkConsent, setHasKvkkConsent] = useState(false);
    const [hasMarketingConsent, setHasMarketingConsent] = useState(false);

    const isLowRating = rating > 0 && rating <= 3;

    const handleSubmit = async () => {
      if (!comment.trim()) {
        setError(t('feedback_error_comment') || 'Lütfen deneyiminizi paylaşın.');
        return;
      }

      if (isLowRating) {
        if (!name.trim()) {
          setError(t('feedback_error_name') || 'Lütfen isminizi belirtin.');
          return;
        }
        if (!phone.trim() && !email.trim()) {
          setError(t('feedback_error_contact') || 'Lütfen size ulaşabilmemiz için telefon veya e-posta belirtin.');
          return;
        }
        if (!hasKvkkConsent) {
          setError(t('feedback_error_kvkk') || 'Devam etmek için KVKK metnini onaylamanız gerekmektedir.');
          return;
        }
      }
      
      setError('');
      setIsSubmitting(true);

      try {
        const response = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim() || null,
            email: email.trim() || null,
            phone: phone.trim() || null,
            comment: comment.trim(),
            hasKvkkConsent: isLowRating ? hasKvkkConsent : true,
            hasMarketingConsent,
            rating,
            source,
            branch,
            tableNumber,
            restaurantSlug,
            platform: platform || null,
            aspects: null,
            website: website, // Honeypot
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
      canSubmit: comment.trim().length > 0 && (!isLowRating || (name.trim().length > 0 && (phone.trim().length > 0 || email.trim().length > 0) && hasKvkkConsent)),
    }));

    return (
      <div className="w-full mt-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
        <div className="space-y-6">
          {/* Experience Input Section */}
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

          {/* Lead Generation Section (Conditional) */}
          {isLowRating && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
              <div className="p-1">
                <p className="text-[13px] font-black text-gray-900 uppercase tracking-tighter mb-1">
                  {t('feedback_contact_title') || 'Size ulaşmamızı ister misiniz?'}
                </p>
                <p className="text-[11px] text-gray-500 font-medium">
                  {t('feedback_contact_sub') || 'Deneyiminizi telafi edebilmemiz için lütfen bilgilerinizi bırakın.'}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('feedback_name_placeholder') || 'Adınız Soyadınız'}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-all"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t('feedback_phone_placeholder') || 'Telefon Numaranız'}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-all"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('feedback_email_placeholder') || 'E-posta Adresiniz'}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Consents */}
              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input
                      type="checkbox"
                      checked={hasKvkkConsent}
                      onChange={(e) => setHasKvkkConsent(e.target.checked)}
                      className="peer appearance-none w-5 h-5 border-2 border-gray-200 rounded-md checked:bg-blue-600 checked:border-blue-600 transition-all"
                    />
                    <svg className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-[11px] text-gray-500 font-bold leading-tight group-hover:text-gray-700 transition-colors">
                    {t('feedback_kvkk_label') || 'Kişisel verilerimin işlenmesine ilişkin KVKK metnini okudum ve onaylıyorum.'}
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input
                      type="checkbox"
                      checked={hasMarketingConsent}
                      onChange={(e) => setHasMarketingConsent(e.target.checked)}
                      className="peer appearance-none w-5 h-5 border-2 border-gray-200 rounded-md checked:bg-blue-600 checked:border-blue-600 transition-all"
                    />
                    <svg className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-[11px] text-gray-500 font-bold leading-tight group-hover:text-gray-700 transition-colors">
                    {t('feedback_marketing_label') || 'Kampanya ve duyurulardan haberdar olmak için iletişim izni veriyorum.'}
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Honeypot field - Invisible to humans */}
          <div className="opacity-0 absolute -z-10 pointer-events-none" aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input
              id="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

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
              {!isLowRating && (t('feedback_disclaimer') + ' ' + t('feedback_private_note'))}
              {isLowRating && (t('feedback_low_disclaimer') || 'Bilgileriniz sadece restoran yetkilisi ile paylaşılacaktır.')}
            </p>
          </div>

          {/* Submit Button */}
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting || !comment.trim()}
            className={`w-full py-4 mt-2 rounded-2xl text-[16px] font-extrabold transition-all flex items-center justify-center gap-2 ${
              isSubmitting || !comment.trim()
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
