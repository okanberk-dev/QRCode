'use client';

import { useState, useImperativeHandle, forwardRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Camera, X, ShieldCheck, Mail, Check } from 'lucide-react';
import { getRecaptchaToken } from '@/lib/recaptcha-client';
import RecaptchaNotice from '@/components/RecaptchaNotice';

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

    const isLowRating = rating <= 3;

    const [showLegalModal, setShowLegalModal] = useState<'kvkk' | 'marketing' | null>(null);

    const handleSubmit = async () => {
      if (!comment.trim()) {
        setError(t('feedback_error_comment') || 'Lütfen deneyiminizi paylaşın.');
        return;
      }

      if (rating > 0 && rating <= 3) {
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
        const recaptchaToken = await getRecaptchaToken('feedback_submit');
        const response = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim() || null,
            email: email.trim() || null,
            phone: phone.trim() || null,
            comment: comment.trim(),
            hasKvkkConsent: rating > 3 ? true : hasKvkkConsent,
            hasMarketingConsent,
            rating,
            source,
            branch,
            tableNumber,
            restaurantSlug,
            platform: platform || null,
            aspects: null,
            website: website, // Honeypot
            recaptchaToken,
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
      canSubmit: comment.trim().length > 0 && (rating > 3 || (name.trim().length > 0 && (phone.trim().length > 0 || email.trim().length > 0) && hasKvkkConsent)),
    }));

    const openLegal = (type: 'kvkk' | 'marketing', e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setShowLegalModal(type);
    };

    return (
      <div className="w-full mt-4">
        <div className="space-y-6">
          {/* Experience Input Section */}
          <div className="bg-white rounded-2xl border border-[#EDEDED] p-6 focus-within:border-[#0A0A0A] focus-within:ring-2 focus-within:ring-[#C6F24E] transition-all duration-300 shadow-sm">
            <textarea
              id="comment"
              rows={5}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('feedback_placeholder') || 'Deneyiminizi paylaşın...'}
              className="w-full px-0 py-0 bg-transparent border-none focus:ring-0 text-[16px] text-[#0A0A0A] placeholder-[#6B7280] resize-none min-h-[140px] leading-relaxed font-medium"
            />
          </div>

          {/* Lead Generation Section (Conditional) */}
          {(rating > 0 && rating <= 3) && (
            <div className="space-y-5 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="px-1">
                <h3 className="text-[14px] font-semibold text-[#0A0A0A] uppercase tracking-tight mb-1 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-[#0A0A0A] rounded-full" />
                  {t('feedback_contact_title') || 'Size ulaşmamızı ister misiniz?'}
                </h3>
                <p className="text-[11px] text-[#6B7280] font-bold tracking-tight">
                  {t('feedback_contact_sub') || 'Deneyiminizi telafi edebilmemiz için lütfen bilgilerinizi bırakın.'}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="relative group">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('feedback_name_placeholder') || 'Adınız Soyadınız'}
                    className="w-full bg-[#FFFFFF]/50 border border-[#EDEDED] rounded-2xl px-5 py-4 text-sm font-bold placeholder-[#6B7280] focus:outline-none focus:border-[#0A0A0A] focus:bg-white transition-all shadow-sm group-hover:border-[#EDEDED]"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t('feedback_phone_placeholder') || 'Telefon Numaranız'}
                    className="w-full bg-[#FFFFFF]/50 border border-[#EDEDED] rounded-2xl px-5 py-4 text-sm font-bold placeholder-[#6B7280] focus:outline-none focus:border-[#0A0A0A] focus:bg-white transition-all shadow-sm"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('feedback_email_placeholder') || 'E-posta Adresiniz'}
                    className="w-full bg-[#FFFFFF]/50 border border-[#EDEDED] rounded-2xl px-5 py-4 text-sm font-bold placeholder-[#6B7280] focus:outline-none focus:border-[#0A0A0A] focus:bg-white transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Enhanced Consents Section */}
              <div className="space-y-4 pt-2">
                <div 
                  onClick={() => setHasKvkkConsent(!hasKvkkConsent)}
                  className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    hasKvkkConsent 
                      ? 'bg-[#EAF9B8]/30 border-[#C6F24E]/40 shadow-sm' 
                      : 'bg-white border-[#FFFFFF] hover:border-[#EDEDED]'
                  }`}
                >
                  <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all border-2 ${
                    hasKvkkConsent ? 'bg-[#0A0A0A] border-[#0A0A0A]' : 'bg-white border-[#EDEDED]'
                  }`}>
                    {hasKvkkConsent && <Check size={14} className="text-white" strokeWidth={4} />}
                  </div>
                  <div className="flex-1">
                    <p className="text-[12px] font-bold text-[#1A1A1A] leading-snug">
                      <span className="inline-block bg-[#0A0A0A] text-white text-[9px] font-semibold tracking-widest uppercase px-1.5 py-0.5 rounded mr-1 align-middle">Zorunlu</span>
                      6698 sayılı KVKK kapsamında <button type="button" onClick={(e) => openLegal('kvkk', e)} className="text-[#0A0A0A] underline underline-offset-4 decoration-2 hover:text-[#525252] transition-colors">Aydınlatma Metni</button>'ni okudum; kişisel verilerimin geri bildirim sürecinin yürütülmesi amacıyla işlenmesine <strong className="font-semibold">açık rıza</strong> veriyorum.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setHasMarketingConsent(!hasMarketingConsent)}
                  className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    hasMarketingConsent
                      ? 'bg-emerald-50/30 border-emerald-100 shadow-sm'
                      : 'bg-white border-[#FFFFFF] hover:border-[#EDEDED]'
                  }`}
                >
                  <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all border-2 ${
                    hasMarketingConsent ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-[#EDEDED]'
                  }`}>
                    {hasMarketingConsent && <Check size={14} className="text-white" strokeWidth={4} />}
                  </div>
                  <div className="flex-1">
                    <p className="text-[12px] font-bold text-[#1A1A1A] leading-snug">
                      <span className="inline-block bg-emerald-600 text-white text-[9px] font-semibold tracking-widest uppercase px-1.5 py-0.5 rounded mr-1 align-middle">İsteğe bağlı</span>
                      6563 sayılı ETK kapsamında kampanya, indirim ve duyurulardan haberdar olmak için <button type="button" onClick={(e) => openLegal('marketing', e)} className="text-emerald-600 underline underline-offset-4 decoration-2 hover:text-emerald-800 transition-colors">ticari elektronik ileti iznini</button> veriyorum. Dilediğim zaman ücretsiz olarak iptal edebilirim.
                    </p>
                  </div>
                </div>
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
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 animate-in fade-in slide-in-from-top-1 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting || !comment.trim()}
              className={`w-full py-5 rounded-2xl text-[15px] font-semibold uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-3 ${
                isSubmitting || !comment.trim()
                  ? 'bg-[#EDEDED] text-[#6B7280] cursor-not-allowed' 
                  : 'bg-[#0A0A0A] text-white shadow-xl hover:bg-[#1A1A1A] hover:-translate-y-1 active:scale-95'
              }`}
            >
              {isSubmitting ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  {t('feedback_post') || 'GÖNDER'}
                  <ShieldCheck size={18} className="opacity-50" />
                </>
              )}
            </button>
            <div className="flex items-center justify-center gap-2 mt-4 px-2">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
               <p className="text-[10px] text-[#6B7280] font-bold uppercase tracking-widest">
                  {isLowRating ? 'ÖZEL VE GÜVENLİ GERİ BİLDİRİM' : 'GÜVENLİ GERİ BİLDİRİM'}
               </p>
            </div>
            <RecaptchaNotice locale="tr" className="mt-3 text-center px-2" />
          </div>
        </div>

        {/* Premium Legal Modal Overlay */}
        {showLegalModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-[#0A0A0A]/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
              <div className="p-7 border-b border-[#EDEDED] flex items-center justify-between bg-[#FFFFFF]/50">
                <div className="flex items-center gap-3">
                   <div className={`p-2 rounded-xl ${showLegalModal === 'kvkk' ? 'bg-[#EAF9B8] text-[#0A0A0A]' : 'bg-emerald-50 text-emerald-600'}`}>
                      {showLegalModal === 'kvkk' ? <ShieldCheck size={20} /> : <Mail size={20} />}
                   </div>
                   <div>
                      <h3 className="font-semibold text-[#0A0A0A] uppercase tracking-tighter text-sm">
                        {showLegalModal === 'kvkk' ? 'KVKK Aydınlatma Metni' : 'İletişim İzni'}
                      </h3>
                      <p className="text-[9px] font-bold text-[#6B7280] uppercase tracking-widest leading-none">Legal & Privacy</p>
                   </div>
                </div>
                <button 
                  onClick={() => setShowLegalModal(null)}
                  className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white hover:shadow-sm text-[#6B7280] transition-all border border-transparent hover:border-[#EDEDED]"
                >
                  <X size={20} strokeWidth={2} />
                </button>
              </div>
              <div className="p-7 sm:p-8 max-h-[65vh] overflow-y-auto scroll-smooth">
                <p className="text-[13.5px] text-[#1A1A1A] leading-[1.75] font-medium whitespace-pre-wrap">
                  {showLegalModal === 'kvkk'
                    ? t('feedback_kvkk_text')
                    : t('feedback_marketing_text')}
                </p>
                <p className="mt-6 pt-4 border-t border-[#EDEDED] text-[10px] text-[#6B7280] font-bold uppercase tracking-widest">
                  {showLegalModal === 'kvkk'
                    ? (t('feedback_kvkk_footer') || 'Son Güncelleme: Nisan 2026 · v2.0')
                    : (t('feedback_marketing_footer') || 'İYS Kayıt Zorunlu · ETK m. 6')}
                </p>
              </div>
              <div className="p-6 bg-[#FFFFFF]/80 border-t border-[#EDEDED] flex justify-end gap-3">
                <button 
                  onClick={() => setShowLegalModal(null)}
                  className="w-full py-4 bg-[#0A0A0A] text-white rounded-2xl font-semibold text-xs uppercase tracking-[0.2em] hover:bg-[#1A1A1A] transition-all shadow-lg shadow-[#EDEDED] active:scale-95"
                >
                  KAPAT
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

FeedbackForm.displayName = 'FeedbackForm';

export default FeedbackForm;
