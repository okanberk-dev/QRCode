'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Send, Loader2, Check } from 'lucide-react';
import { getRecaptchaToken } from '@/lib/recaptcha-client';
import RecaptchaNotice from '@/components/RecaptchaNotice';
import { AlertBanner } from '@/components/ui';

interface ContactFormProps {
  t: {
    contact_form_name: string;
    contact_form_email: string;
    contact_form_business: string;
    contact_form_message: string;
    contact_form_submit: string;
    contact_success_title: string;
    contact_success_desc: string;
    contact_success_again: string;
    contact_name_placeholder: string;
    contact_email_placeholder: string;
    contact_business_placeholder: string;
    contact_message_placeholder: string;
  };
  locale: string;
}

const MIN_FILL_MS = 2500;

export default function ContactForm({ t, locale }: ContactFormProps) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [kvkkChecked, setKvkkChecked] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const renderedAtRef = useRef<number>(Date.now());
  const isTr = locale !== 'en';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.target as HTMLFormElement);
    const honeypot = (formData.get('website') as string) || '';
    const elapsed = Date.now() - renderedAtRef.current;

    if (honeypot.trim() !== '' || elapsed < MIN_FILL_MS) {
      setSent(true);
      setLoading(false);
      if (formRef.current) formRef.current.reset();
      return;
    }

    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      business: formData.get('business'),
      message: formData.get('message'),
      kvkk: formData.get('kvkk') === 'on',
      marketing: formData.get('marketing') === 'on',
      website: honeypot,
      renderedAt: renderedAtRef.current,
      // Stage 31b §38.108 — locale geçirilir, server recordConsent log'unda
      // doğru locale-bound LegalDocument snapshot referansı tutulur.
      locale,
    };

    try {
      const recaptchaToken = await getRecaptchaToken('contact_submit');
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, recaptchaToken }),
      });
      const responseData = await res.json().catch(() => ({}));
      if (res.ok) {
        setSent(true);
        if (formRef.current) formRef.current.reset();
      } else {
        setError(responseData.error || (isTr ? 'Bir hata oluştu, lütfen tekrar deneyin.' : 'Something went wrong, please try again.'));
      }
    } catch {
      setError(isTr ? 'Bağlantı hatası. Lütfen tekrar deneyin.' : 'Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'min-h-[44px] w-full px-4 py-3.5 bg-white rounded-xl border border-[#EDEDED] focus:border-[#C6F24E] focus:shadow-[0_0_0_4px_rgba(198,242,78,0.18)] outline-none transition-all text-[16px] sm:text-[14px] text-[#0A0A0A] placeholder:text-[#A3A3A3]';
  const labelClass = 'pulse-eyebrow text-[#737373] ml-1 mb-2 block';

  return (
    <div className="bg-white rounded-3xl p-8 sm:p-10">
      {sent ? (
        <div className="py-14 text-center space-y-5">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-[#0A0A0A] text-[#C6F24E]">
            <Check size={26} strokeWidth={2.5} />
          </div>
          <div className="space-y-2">
            <h3 className="text-[22px] font-medium text-[#0A0A0A] tracking-[-0.02em]">
              {t.contact_success_title}
            </h3>
            <p className="text-[14px] text-[#525252] max-w-sm mx-auto leading-relaxed">
              {t.contact_success_desc}
            </p>
          </div>
          <button
            onClick={() => setSent(false)}
            className="pulse-eyebrow text-[#737373] hover:text-[#0A0A0A] transition-colors"
          >
            {t.contact_success_again}
          </button>
        </div>
      ) : (
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '-9999px',
              width: '1px',
              height: '1px',
              overflow: 'hidden',
              opacity: 0,
              pointerEvents: 'none',
            }}
          >
            <label htmlFor="contact-website">Website</label>
            <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
          </div>

          {error && <AlertBanner kind="danger">{error}</AlertBanner>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="contact-name" className={labelClass}>
                {t.contact_form_name}
              </label>
              <input
                required
                name="name"
                type="text"
                id="contact-name"
                className={inputClass}
                placeholder={t.contact_name_placeholder}
              />
            </div>
            <div>
              <label htmlFor="contact-email" className={labelClass}>
                {t.contact_form_email}
              </label>
              <input
                required
                name="email"
                type="email"
                id="contact-email"
                className={inputClass}
                placeholder={t.contact_email_placeholder}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="contact-business" className={labelClass}>
                {t.contact_form_business}
              </label>
              <input
                type="text"
                name="business"
                id="contact-business"
                className={inputClass}
                placeholder={t.contact_business_placeholder}
              />
            </div>
            <div>
              <label htmlFor="contact-phone" className={labelClass}>
                {isTr ? 'TELEFON' : 'PHONE'}
              </label>
              <input
                type="tel"
                name="phone"
                id="contact-phone"
                className={inputClass}
                placeholder="+90 (5XX) XXX XX XX"
              />
            </div>
          </div>

          <div>
            <label htmlFor="contact-message" className={labelClass}>
              {t.contact_form_message}
            </label>
            <textarea
              required
              name="message"
              rows={5}
              id="contact-message"
              className={`${inputClass} resize-none`}
              placeholder={t.contact_message_placeholder}
            />
          </div>

          <div className="space-y-3 pt-2">
            <div
              onClick={() => setKvkkChecked(!kvkkChecked)}
              className={`flex items-start gap-3 p-4 rounded-2xl border transition-colors cursor-pointer ${
                kvkkChecked ? 'bg-[#EAF9B8] border-[#C6F24E]' : 'bg-white border-[#EDEDED] hover:border-[#D4D4D4]'
              }`}
            >
              <div
                className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                  kvkkChecked ? 'bg-[#0A0A0A]' : 'bg-white border border-[#D4D4D4]'
                }`}
              >
                {kvkkChecked && <Check size={12} className="text-[#C6F24E]" strokeWidth={3.5} />}
              </div>
              <input type="checkbox" name="kvkk" checked={kvkkChecked} onChange={() => {}} className="sr-only" />
              <label htmlFor="contact-kvkk" className="text-[12px] font-medium text-[#0A0A0A] leading-relaxed cursor-pointer select-none flex-1">
                {isTr ? (
                  <>
                    <Link
                      href={`/${locale}/kvkk`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[#0A0A0A] underline decoration-[#0A0A0A]/30 decoration-1 underline-offset-4 hover:decoration-[#0A0A0A]"
                    >
                      KVKK Aydınlatma Metni
                    </Link>{' '}
                    {isTr ? 've ' : 'and '}
                    <Link
                      href={`/${locale}/gizlilik`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[#0A0A0A] underline decoration-[#0A0A0A]/30 decoration-1 underline-offset-4 hover:decoration-[#0A0A0A]"
                    >
                      Gizlilik Politikası
                    </Link>
                    {' '}kapsamında kişisel verilerimin işlenmesini okudum ve kabul ediyorum.
                  </>
                ) : (
                  <>
                    I have read and accept the processing of my personal data under our{' '}
                    <Link
                      href={`/${locale}/privacy`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[#0A0A0A] underline decoration-[#0A0A0A]/30 decoration-1 underline-offset-4 hover:decoration-[#0A0A0A]"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </>
                )}
              </label>
            </div>

            <div className="flex items-start gap-3 px-2">
              <input
                type="checkbox"
                name="marketing"
                id="contact-marketing"
                className="mt-1 w-4 h-4 rounded border border-[#D4D4D4] focus:ring-2 focus:ring-[#C6F24E] accent-[#0A0A0A] cursor-pointer"
              />
              <label htmlFor="contact-marketing" className="text-[12px] text-[#525252] leading-relaxed cursor-pointer">
                {isTr ? (
                  <>
                    Kampanya, duyuru ve yenilikler hakkında{' '}
                    <Link
                      href={`/${locale}/ticari-ileti`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0A0A0A] underline decoration-[#0A0A0A]/30 decoration-1 underline-offset-4 hover:decoration-[#0A0A0A]"
                    >
                      ticari elektronik ileti
                    </Link>{' '}
                    almayı kabul ediyorum.
                  </>
                ) : (
                  <>
                    I agree to receive{' '}
                    <Link
                      href={`/${locale}/ticari-ileti`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0A0A0A] underline decoration-[#0A0A0A]/30 decoration-1 underline-offset-4 hover:decoration-[#0A0A0A]"
                    >
                      commercial electronic messages
                    </Link>{' '}
                    regarding campaigns, announcements, and updates.
                  </>
                )}
              </label>
            </div>
          </div>

          <button
            type="submit"
            id="contact-submit-btn"
            disabled={loading || !kvkkChecked}
            className={`min-h-[48px] w-full flex items-center justify-center gap-2 bg-[#0A0A0A] text-white font-medium text-[14px] py-3.5 rounded-full transition-colors ${
              !kvkkChecked || loading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-[#1A1A1A]'
            }`}
          >
            {loading ? <Loader2 className="animate-spin" size={18} strokeWidth={2} /> : <Send size={16} strokeWidth={2} />}
            {t.contact_form_submit}
          </button>

          <RecaptchaNotice locale={locale} className="text-center px-1" />
        </form>
      )}

    </div>
  );
}
