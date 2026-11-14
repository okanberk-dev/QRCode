'use client';

import { useId, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, Loader2 } from 'lucide-react';
import { getRecaptchaToken } from '@/lib/recaptcha-client';
import RecaptchaNotice from '@/components/RecaptchaNotice';

interface Props {
  locale: 'tr' | 'en';
  /**
   * Where the signup form lives. Stored on NewsletterSubscriber.source so the
   * admin "Newsletter" filter can break down sign-ups by placement
   * ("footer", "blog_inline", …).
   */
  source?: string;
  /**
   * Keep the e-mail field and the button stacked at every width — for narrow
   * containers such as the 260px blog sidebar.
   */
  stacked?: boolean;
}

type Status = 'idle' | 'loading' | 'done' | 'error';
type ErrorKind = 'email' | 'consent' | 'rate' | 'captcha' | 'generic';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const COPY = {
  tr: {
    label: 'E-posta adresiniz',
    placeholder: 'ornek@isletmeniz.com',
    submit: 'Abone olun',
    consentBefore: 'Pulse bülteninin e-postayla gönderilmesi için ',
    consentLink: 'ticari elektronik ileti onayı',
    consentMiddle: ' veriyorum. Kişisel verilerim ',
    kvkkLink: 'KVKK aydınlatma metni',
    consentAfter: ' kapsamında işlenir.',
    newTab: '(yeni sekmede açılır)',
    errors: {
      email: 'Geçerli bir e-posta adresi girin.',
      consent: 'Bülteni alabilmek için onay kutusunu işaretleyin.',
      rate: 'Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin.',
      captcha: 'Güvenlik doğrulaması tamamlanamadı. Sayfayı yenileyip tekrar deneyin.',
      generic: 'Kaydınızı şu anda alamadık. Lütfen biraz sonra tekrar deneyin.',
    },
    doneTitle: 'Aboneliğiniz alındı',
    doneBody: 'Onay e-postası gönderiliyor. Gelen kutunuzda görmezseniz istenmeyen e-posta klasörünüze bakın.',
  },
  en: {
    label: 'Your e-mail address',
    placeholder: 'you@yourbusiness.com',
    submit: 'Subscribe',
    consentBefore: 'I give my ',
    consentLink: 'consent to commercial electronic messages',
    consentMiddle: ' to receive the Pulse newsletter by e-mail. My personal data is processed as set out in the ',
    kvkkLink: 'KVKK privacy notice',
    consentAfter: '.',
    newTab: '(opens in a new tab)',
    errors: {
      email: 'Enter a valid e-mail address.',
      consent: 'Tick the consent box to receive the newsletter.',
      rate: 'Too many attempts. Please try again in a few minutes.',
      captcha: 'The security check could not be completed. Reload the page and try again.',
      generic: 'We could not save your sign-up right now. Please try again shortly.',
    },
    doneTitle: "You're subscribed",
    doneBody: "We're sending a confirmation e-mail. If it isn't in your inbox, check your spam folder.",
  },
} as const;

/**
 * Newsletter sign-up for dark surfaces (footer card, blog sidebar).
 *
 * Commercial e-mail needs opt-in consent (6563 sayılı Kanun / İYS), so the
 * consent box starts unticked and is required on the client and on the
 * server (/api/newsletter records it). Errors are shown at every width in a
 * role="alert" message tied to the field; success is announced through a
 * persistent live region and focus moves to the confirmation.
 */
export default function NewsletterSignup({ locale, source = 'footer', stacked = false }: Props) {
  const copy = COPY[locale === 'en' ? 'en' : 'tr'];
  const uid = useId();
  const emailId = `${uid}-email`;
  const consentId = `${uid}-consent`;
  const errorId = `${uid}-error`;

  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<ErrorKind | null>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);

  const fail = (kind: ErrorKind) => {
    setError(kind);
    setStatus('error');
    if (kind === 'email') emailRef.current?.focus();
    if (kind === 'consent') consentRef.current?.focus();
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_PATTERN.test(value)) return fail('email');
    if (!consent) return fail('consent');

    setError(null);
    setStatus('loading');
    try {
      const recaptchaToken = await getRecaptchaToken('newsletter_signup');
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: value, locale, recaptchaToken, source, consent: true }),
      });
      if (res.ok) {
        setStatus('done');
        // The form is replaced by the confirmation; keep keyboard focus on it.
        window.setTimeout(() => doneRef.current?.focus(), 0);
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 429) return fail('rate');
      if (data.error === 'invalid_email') return fail('email');
      if (data.error === 'consent_required') return fail('consent');
      if (data.error === 'recaptcha_failed') return fail('captcha');
      fail('generic');
    } catch {
      fail('generic');
    }
  };

  const liveMessage = status === 'done' ? `${copy.doneTitle}. ${copy.doneBody}` : '';
  const emailInvalid = error === 'email';
  const consentInvalid = error === 'consent';

  return (
    <div>
      {status === 'done' ? (
        <div
          ref={doneRef}
          tabIndex={-1}
          className="flex items-start gap-3 rounded-2xl border border-[#C6F24E]/30 bg-[#C6F24E]/10 p-4 outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#C6F24E] text-[#0A0A0A]">
            <Check size={16} strokeWidth={2.5} aria-hidden />
          </span>
          <div>
            <p className="text-[15px] font-semibold text-white">{copy.doneTitle}</p>
            <p className="mt-1 text-[13px] leading-[1.55] text-white/75">{copy.doneBody}</p>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-3">
          <div>
            <label htmlFor={emailId} className="mb-1.5 block text-[13px] font-medium text-white/80">
              {copy.label}
            </label>
            <div className={`flex flex-col gap-2 ${stacked ? '' : 'sm:flex-row'}`}>
              <input
                ref={emailRef}
                id={emailId}
                type="email"
                name="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailInvalid) setError(null);
                }}
                placeholder={copy.placeholder}
                autoComplete="email"
                inputMode="email"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="send"
                maxLength={200}
                aria-invalid={emailInvalid || undefined}
                aria-describedby={emailInvalid ? errorId : undefined}
                className={`min-h-[48px] w-full min-w-0 flex-1 rounded-full border bg-[#141414] px-4 text-[16px] text-white outline-none transition-colors placeholder:text-white/40 focus:border-[#C6F24E] focus-visible:ring-2 focus-visible:ring-[#C6F24E]/40 ${
                  stacked ? '' : 'sm:px-5 sm:text-[15px]'
                } ${emailInvalid ? 'border-[#FCA5A5]' : 'border-white/15'}`}
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className={`inline-flex min-h-[48px] w-full shrink-0 items-center justify-center gap-2 rounded-full bg-[#C6F24E] px-6 text-[15px] font-semibold text-[#0A0A0A] transition-colors hover:bg-[#A8D62E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A] disabled:cursor-wait disabled:opacity-70 ${
                  stacked ? '' : 'sm:w-auto'
                }`}
              >
                {status === 'loading' ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null}
                {copy.submit}
              </button>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <input
              ref={consentRef}
              id={consentId}
              type="checkbox"
              checked={consent}
              onChange={(e) => {
                setConsent(e.target.checked);
                if (consentInvalid) setError(null);
              }}
              aria-invalid={consentInvalid || undefined}
              aria-describedby={consentInvalid ? errorId : undefined}
              className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded accent-[#C6F24E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
            />
            <label htmlFor={consentId} className="cursor-pointer text-[13px] leading-[1.55] text-white/75">
              {copy.consentBefore}
              <Link
                href={`/${locale}/ticari-ileti`}
                target="_blank"
                rel="noopener"
                className="font-medium text-white underline decoration-white/40 underline-offset-2 hover:decoration-[#C6F24E] focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]"
              >
                {copy.consentLink}
                <span className="sr-only"> {copy.newTab}</span>
              </Link>
              {copy.consentMiddle}
              <Link
                href={`/${locale}/kvkk`}
                target="_blank"
                rel="noopener"
                className="font-medium text-white underline decoration-white/40 underline-offset-2 hover:decoration-[#C6F24E] focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]"
              >
                {copy.kvkkLink}
                <span className="sr-only"> {copy.newTab}</span>
              </Link>
              {copy.consentAfter}
            </label>
          </div>

          {error ? (
            <p id={errorId} role="alert" className="text-[13px] font-medium leading-[1.5] text-[#FCA5A5]">
              {copy.errors[error]}
            </p>
          ) : null}

          {/* Required because the floating reCAPTCHA badge is hidden site-wide.
              The wrapper lifts the notice to readable size and contrast on dark. */}
          <div className="[&_p]:text-[11px] [&_p]:leading-[1.5] [&_p]:text-white/70">
            <RecaptchaNotice locale={locale} dark />
          </div>
        </form>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {liveMessage}
      </p>
    </div>
  );
}
