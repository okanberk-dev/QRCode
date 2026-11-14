'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Send, Loader2, Check } from 'lucide-react';
import { getRecaptchaToken } from '@/lib/recaptcha-client';
import RecaptchaNotice from '@/components/RecaptchaNotice';
import { AlertBanner } from '@/components/ui';
import { SUPPORT_EMAIL, SUPPORT_HOURS } from '@/lib/company-constants';

/**
 * Only the strings the form needs — the page passes these instead of the
 * whole translations object, which would otherwise be serialized into the
 * page payload.
 */
export interface ContactFormCopy {
  name: string;
  email: string;
  business: string;
  phone: string;
  message: string;
  submit: string;
  successTitle: string;
  successDesc: string;
  successAgain: string;
  emailPlaceholder: string;
  messagePlaceholder: string;
}

interface ContactFormProps {
  copy: ContactFormCopy;
  locale: 'tr' | 'en';
}

// Must stay in sync with /api/contact — a submit under this dwell time is bot-like.
const MIN_FILL_MS = 2500;

const linkClass =
  'font-medium text-[#0A0A0A] underline decoration-[#0A0A0A]/30 decoration-1 underline-offset-4 hover:decoration-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] rounded-sm';

export default function ContactForm({ copy, locale }: ContactFormProps) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);
  const renderedAtRef = useRef<number>(Date.now());
  const isTr = locale !== 'en';

  // Move focus to the confirmation so keyboard and screen-reader users hear it.
  useEffect(() => {
    if (!sent || !successRef.current) return;
    successRef.current.focus({ preventScroll: true });
    successRef.current.scrollIntoView({ block: 'center' });
  }, [sent]);

  const messageForStatus = (status: number) => {
    if (status === 429) {
      return isTr
        ? 'Kısa sürede çok fazla mesaj gönderildi. Lütfen birkaç dakika sonra tekrar deneyin.'
        : 'Too many messages in a short time. Please try again in a few minutes.';
    }
    if (status === 400) {
      return isTr
        ? 'Lütfen adınızı, geçerli bir e-posta adresini ve mesajınızı yazın; onay kutusunu işaretleyin.'
        : 'Please enter your name, a valid e-mail address and your message, and tick the consent box.';
    }
    return isTr
      ? `Mesajınız gönderilemedi. Lütfen tekrar deneyin ya da ${SUPPORT_EMAIL} adresine yazın.`
      : `Your message could not be sent. Please try again or write to ${SUPPORT_EMAIL}.`;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const honeypot = (formData.get('website') as string) || '';
    const elapsed = Date.now() - renderedAtRef.current;

    if (honeypot.trim() !== '' || elapsed < MIN_FILL_MS) {
      setSent(true);
      setLoading(false);
      formRef.current?.reset();
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
      // Stage 31b §38.108 — the server logs the consent against the
      // locale-bound legal document snapshot.
      locale,
    };

    try {
      const recaptchaToken = await getRecaptchaToken('contact_submit');
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, recaptchaToken }),
      });
      if (res.ok) {
        setSent(true);
        formRef.current?.reset();
      } else {
        setError(messageForStatus(res.status));
      }
    } catch {
      setError(
        isTr
          ? `Bağlantı kurulamadı. Lütfen tekrar deneyin ya da ${SUPPORT_EMAIL} adresine yazın.`
          : `We couldn't connect. Please try again or write to ${SUPPORT_EMAIL}.`,
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'min-h-[48px] w-full rounded-xl border border-[#D4D4D4] bg-white px-4 py-3 text-[16px] text-[#0A0A0A] outline-none transition-[border-color,box-shadow] placeholder:text-[#A3A3A3] focus:border-[#0A0A0A] focus:shadow-[0_0_0_4px_rgba(198,242,78,0.45)] sm:text-[15px]';
  const labelClass = 'mb-2 block text-[14px] font-medium text-[#0A0A0A]';
  const optional = (
    <span className="font-normal text-[#737373]">{isTr ? ' (isteğe bağlı)' : ' (optional)'}</span>
  );

  if (sent) {
    return (
      <div role="status" className="px-1 py-12 text-center sm:py-16">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#0A0A0A] text-[#C6F24E]">
          <Check size={26} strokeWidth={2.5} aria-hidden="true" />
        </div>
        <h3
          ref={successRef}
          tabIndex={-1}
          className="text-[24px] leading-[1.2] text-[#0A0A0A] outline-none"
        >
          {copy.successTitle}
        </h3>
        <p className="mx-auto mt-3 max-w-[420px] text-[15px] leading-[1.6] text-[#525252]">{copy.successDesc}</p>
        <p className="mx-auto mt-2 max-w-[420px] text-[14px] leading-[1.6] text-[#737373]">
          {isTr ? SUPPORT_HOURS.tr : SUPPORT_HOURS.en}
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-6 inline-flex min-h-[44px] items-center rounded-full border border-[#D4D4D4] px-5 text-[14px] font-semibold text-[#0A0A0A] transition-colors hover:border-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
        >
          {copy.successAgain}
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      {/* Honeypot — invisible to people, filled in by naive bots. */}
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

      {error ? <AlertBanner kind="danger">{error}</AlertBanner> : null}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-4">
        <div>
          <label htmlFor="contact-name" className={labelClass}>
            {copy.name}
          </label>
          <input
            required
            name="name"
            type="text"
            id="contact-name"
            autoComplete="name"
            autoCapitalize="words"
            enterKeyHint="next"
            maxLength={200}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="contact-email" className={labelClass}>
            {copy.email}
          </label>
          <input
            required
            name="email"
            type="email"
            id="contact-email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            maxLength={200}
            className={inputClass}
            placeholder={copy.emailPlaceholder}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-4">
        <div>
          <label htmlFor="contact-business" className={labelClass}>
            {copy.business}
            {optional}
          </label>
          <input
            type="text"
            name="business"
            id="contact-business"
            autoComplete="organization"
            enterKeyHint="next"
            maxLength={200}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="contact-phone" className={labelClass}>
            {copy.phone}
            {optional}
          </label>
          <input
            type="tel"
            name="phone"
            id="contact-phone"
            autoComplete="tel"
            inputMode="tel"
            enterKeyHint="next"
            maxLength={60}
            className={inputClass}
            placeholder="+90 5XX XXX XX XX"
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact-message" className={labelClass}>
          {copy.message}
        </label>
        <textarea
          required
          name="message"
          rows={5}
          id="contact-message"
          maxLength={4000}
          className={`${inputClass} resize-y`}
          placeholder={copy.messagePlaceholder}
        />
      </div>

      <div className="space-y-3 pt-1">
        {/* Required KVKK acknowledgement — a real, focusable checkbox (Tab +
            Space), unchecked by default; the label is clickable and the
            links inside it open the documents without toggling the box. */}
        <div className="flex items-start gap-3 rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-4 transition-colors has-[:checked]:border-[#C6F24E] has-[:checked]:bg-[#EAF9B8]/50">
          <input
            id="contact-kvkk"
            type="checkbox"
            name="kvkk"
            required
            className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded accent-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
          />
          <label htmlFor="contact-kvkk" className="flex-1 cursor-pointer text-[14px] leading-[1.55] text-[#333333]">
            {isTr ? (
              <>
                <Link href="/tr/kvkk" target="_blank" rel="noopener noreferrer" className={linkClass}>
                  KVKK Aydınlatma Metni
                </Link>
                &apos;ni ve{' '}
                <Link href="/tr/gizlilik" target="_blank" rel="noopener noreferrer" className={linkClass}>
                  Gizlilik Politikası
                </Link>
                &apos;nı okudum; kişisel verilerimin bu metinlerde açıklandığı şekilde işlenmesini kabul ediyorum.
              </>
            ) : (
              <>
                I have read the{' '}
                <Link href="/en/privacy" target="_blank" rel="noopener noreferrer" className={linkClass}>
                  Privacy Policy
                </Link>{' '}
                and agree to my personal data being processed as described there.
              </>
            )}
          </label>
        </div>

        <div className="flex items-start gap-3 px-4">
          <input
            type="checkbox"
            name="marketing"
            id="contact-marketing"
            className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded accent-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
          />
          <label htmlFor="contact-marketing" className="flex-1 cursor-pointer text-[13px] leading-[1.55] text-[#525252]">
            {isTr ? (
              <>
                Kampanya, duyuru ve yenilikler hakkında{' '}
                <Link href="/tr/ticari-ileti" target="_blank" rel="noopener noreferrer" className={linkClass}>
                  ticari elektronik ileti
                </Link>{' '}
                almayı kabul ediyorum (isteğe bağlı).
              </>
            ) : (
              <>
                I agree to receive{' '}
                <Link href="/en/ticari-ileti" target="_blank" rel="noopener noreferrer" className={linkClass}>
                  commercial electronic messages
                </Link>{' '}
                about offers, announcements and product updates (optional).
              </>
            )}
          </label>
        </div>
      </div>

      <button
        type="submit"
        id="contact-submit-btn"
        disabled={loading}
        aria-busy={loading}
        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#1A1A1A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
      >
        {loading ? (
          <Loader2 className="animate-spin" size={18} strokeWidth={2} aria-hidden="true" />
        ) : (
          <Send size={16} strokeWidth={2} aria-hidden="true" />
        )}
        {copy.submit}
      </button>

      <RecaptchaNotice locale={locale} className="px-1 text-center" />
    </form>
  );
}
