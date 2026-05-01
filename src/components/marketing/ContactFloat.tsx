// src/components/marketing/ContactFloat.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getRecaptchaToken } from '@/lib/recaptcha-client';

const MIN_FILL_MS = 2500;
const BUBBLE_TEASER_DELAY_MS = 6000;
const SESSION_DISMISS_KEY = 'buaze.contact-float.bubble.dismissed';

type WidgetState = 'fab' | 'open';

/**
 * ContactFloat — sticky lead-capture widget on the marketing site.
 *
 * Three render states:
 *  - **fab**           Lime FAB only (default). After ~6s the first time a
 *                      visitor lands, an optional bubble teaser slides in
 *                      ("Sorunuz mu var?"). Dismissal is per-session.
 *  - **bubble teaser** A small avatar + greeting card above the FAB. Click
 *                      anywhere on it to expand into the form; the X
 *                      dismisses for the rest of the session.
 *  - **open**          Full inline contact form (Name + Email + Message +
 *                      KVKK consent). Posts to `/api/contact` — same
 *                      endpoint, honeypot, and reCAPTCHA flow as the
 *                      `<ContactForm>` page component (CLAUDE.md §14.2).
 *
 * Pulse design (CLAUDE.md §11): graphite + lime + pure white. No new
 * dependencies — reCAPTCHA + honeypot + dwell-time bot guards reuse the
 * existing client helpers.
 *
 * Hidden on the homepage, auth, and onboarding routes — the widget exists
 * for marketing surfaces where a visitor may want to ask a quick question
 * without navigating to /contact.
 */
export function ContactFloat({ locale }: { locale: string }) {
  const pathname = usePathname();
  const base = `/${locale}`;
  const current = pathname.replace(/\/+$/, '') || '/';
  const isTr = locale === 'tr';

  const [state, setState] = useState<WidgetState>('fab');
  const [showBubble, setShowBubble] = useState(false);

  // Form state
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [kvkk, setKvkk] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const renderedAtRef = useRef<number>(Date.now());
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  // Auto-show bubble teaser ~6s after page load (once per session).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(SESSION_DISMISS_KEY) === '1';
    } catch {
      /* sessionStorage may be denied in private mode — fall back to ephemeral */
    }
    if (dismissed) return;
    const timer = window.setTimeout(() => setShowBubble(true), BUBBLE_TEASER_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  // When the form opens, focus the first field for keyboard users.
  useEffect(() => {
    if (state === 'open') {
      const t = window.setTimeout(() => firstFieldRef.current?.focus(), 30);
      return () => window.clearTimeout(t);
    }
  }, [state]);

  // ESC closes the open form.
  useEffect(() => {
    if (state !== 'open') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setState('fab');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state]);

  // Hide on homepage, auth, and onboarding (same gate as before).
  if (current === base || current.startsWith(`${base}/auth`) || current === `${base}/onboarding`) {
    return null;
  }

  const dismissBubble = () => {
    setShowBubble(false);
    try {
      sessionStorage.setItem(SESSION_DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const openForm = () => {
    setShowBubble(false);
    setState('open');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');

    const dwell = Date.now() - renderedAtRef.current;

    // Bot guard parity with /contact: honeypot or sub-MIN_FILL_MS dwell →
    // pretend success without spending a Resend credit.
    if (honeypot.trim() !== '' || dwell < MIN_FILL_MS) {
      setSent(true);
      setLoading(false);
      return;
    }

    if (!name.trim() || !email.trim() || !message.trim() || !kvkk) {
      setError(isTr ? 'Lütfen zorunlu alanları doldurun ve KVKK onayını verin.' : 'Please fill required fields and accept the privacy notice.');
      setLoading(false);
      return;
    }

    try {
      const recaptchaToken = await getRecaptchaToken('contact_submit');
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
          kvkk: true,
          marketing: false,
          website: honeypot,
          renderedAt: renderedAtRef.current,
          recaptchaToken,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSent(true);
      } else {
        setError(
          data.error ||
            (isTr ? 'Bir hata oluştu, lütfen tekrar deneyin.' : 'Something went wrong, please try again.'),
        );
      }
    } catch {
      setError(isTr ? 'Bağlantı hatası. Lütfen tekrar deneyin.' : 'Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ───────────────────────────────────────── FAB + bubble teaser
  if (state === 'fab') {
    return (
      <div
        aria-live="polite"
        className="fixed right-4 bottom-[88px] md:right-6 md:bottom-6 z-50 flex flex-col items-end gap-3"
      >
        {showBubble && (
          <div
            role="dialog"
            aria-label={isTr ? 'Sorunuz mu var?' : 'Have a question?'}
            className="bz-fade-in relative max-w-[280px] rounded-2xl border border-[#EDEDED] bg-white p-3.5 pr-9 shadow-[0_12px_32px_-10px_rgba(10,10,10,0.16)]"
          >
            <button
              type="button"
              onClick={dismissBubble}
              aria-label={isTr ? 'Kapat' : 'Dismiss'}
              className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-md text-[#737373] transition-colors hover:bg-[#F5F5F5] hover:text-[#0A0A0A]"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={openForm}
              className="flex items-start gap-2.5 text-left"
            >
              <span
                aria-hidden
                className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0A0A0A] text-[#C6F24E]"
              >
                {/* Speech-bubble icon — minimal Pulse mark */}
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                  <path
                    d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="block">
                <span className="block text-[13px] font-semibold text-[#0A0A0A]">
                  {isTr ? 'Merhaba! 👋' : 'Hi there! 👋'}
                </span>
                <span className="mt-0.5 block text-[12.5px] leading-[1.45] text-[#525252]">
                  {isTr ? 'Sorunuz mu var? Buradan yazabilirsiniz.' : 'Have a question? Drop us a line.'}
                </span>
              </span>
            </button>
            {/* Speech-bubble tail pointing to the FAB */}
            <span
              aria-hidden
              className="absolute -bottom-1.5 right-6 h-3 w-3 rotate-45 border-b border-r border-[#EDEDED] bg-white"
            />
          </div>
        )}
        <button
          type="button"
          onClick={openForm}
          aria-label={isTr ? 'Bizimle iletişime geçin' : 'Contact us'}
          className="flex h-14 w-14 items-center justify-center rounded-full border-3 border-[#0A0A0A] bg-[#C6F24E] shadow-md transition-all hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-[#C6F24E]/50 active:translate-y-0.5 active:shadow-none"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
            <path
              d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.87 9.87 0 01-4-.83L3 21l1.9-5.1C3.7 14.73 3 13.43 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              stroke="#0A0A0A"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    );
  }

  // ───────────────────────────────────────── Open form (state === 'open')
  const inputClass =
    'min-h-[44px] w-full rounded-lg border border-[#EDEDED] bg-white px-3 py-2.5 text-[16px] sm:text-[14px] text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#C6F24E] focus:shadow-[0_0_0_3px_rgba(198,242,78,0.25)]';

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={isTr ? 'İletişim formu' : 'Contact form'}
      className="bz-fade-in fixed right-4 bottom-[88px] left-4 z-50 max-h-[calc(100vh-110px)] overflow-hidden rounded-2xl border border-[#EDEDED] bg-white shadow-[0_24px_48px_-12px_rgba(10,10,10,0.24)] sm:left-auto sm:bottom-6 sm:right-6 sm:w-[360px] md:bottom-6"
    >
      {/* Header — graphite bar with greeting + close */}
      <div className="flex items-center gap-2.5 bg-[#0A0A0A] px-4 py-3 text-white">
        <span
          aria-hidden
          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#C6F24E] text-[#0A0A0A]"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
            <path
              d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div className="flex-1 leading-tight">
          <div className="text-[13px] font-semibold">
            {isTr ? 'Bize yazın' : 'Send us a note'}
          </div>
          <div className="text-[11px] text-white/70">
            {isTr ? 'Genelde 1 iş günü içinde dönüyoruz' : 'We usually reply within one business day'}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setState('fab')}
          aria-label={isTr ? 'Küçült' : 'Minimize'}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="max-h-[calc(100vh-200px)] overflow-y-auto px-4 py-4 sm:max-h-[60vh]">
        {sent ? (
          <div className="py-4 text-center">
            <div
              aria-hidden
              className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#EAF9B8] text-[#0A0A0A]"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path
                  d="M5 12l5 5L20 7"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="bz-h-tight text-[16px] text-[#0A0A0A]">
              {isTr ? 'Teşekkürler!' : 'Thank you!'}
            </p>
            <p className="mt-1 text-[12.5px] leading-[1.5] text-[#525252]">
              {isTr
                ? 'Mesajınız bize ulaştı. Ekip üyemiz en kısa sürede sizinle iletişime geçecek.'
                : 'Your message has reached us. Our team will get back to you shortly.'}
            </p>
            <button
              type="button"
              onClick={() => setState('fab')}
              className="mt-4 inline-flex items-center justify-center rounded-full bg-[#0A0A0A] px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#1A1A1A]"
            >
              {isTr ? 'Kapat' : 'Close'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3" noValidate>
            {/* Honeypot — visually hidden, bots fill, humans don't. */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              aria-hidden="true"
              className="hidden"
            />

            <div>
              <label htmlFor="cf-name" className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#525252]">
                {isTr ? 'İsim' : 'Name'} <span className="text-[#A8D62E]">*</span>
              </label>
              <input
                ref={firstFieldRef}
                id="cf-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={120}
                autoComplete="name"
                placeholder={isTr ? 'Adınız' : 'Your name'}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="cf-email" className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#525252]">
                {isTr ? 'E-posta' : 'Email'} <span className="text-[#A8D62E]">*</span>
              </label>
              <input
                id="cf-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={200}
                autoComplete="email"
                inputMode="email"
                placeholder="ornek@isletme.com"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="cf-message" className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#525252]">
                {isTr ? 'Mesaj' : 'Message'} <span className="text-[#A8D62E]">*</span>
              </label>
              <textarea
                id="cf-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                maxLength={1500}
                rows={3}
                placeholder={isTr ? 'Nasıl yardımcı olabiliriz?' : 'How can we help?'}
                className={`${inputClass} min-h-[80px] resize-none py-2.5`}
              />
            </div>

            <label className="flex items-start gap-2 text-[11.5px] leading-[1.5] text-[#525252]">
              <input
                type="checkbox"
                checked={kvkk}
                onChange={(e) => setKvkk(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#C6F24E]"
                required
              />
              <span>
                {isTr ? (
                  <>
                    <Link href={`/${locale}/kvkk`} className="text-[#0A0A0A] underline underline-offset-2 hover:text-[#A8D62E]" target="_blank">
                      KVKK Aydınlatma Metni
                    </Link>
                    {`'ni okudum, kişisel verilerimin işlenmesine onay veriyorum.`}
                  </>
                ) : (
                  <>
                    I have read the{' '}
                    <Link href={`/${locale}/privacy`} className="text-[#0A0A0A] underline underline-offset-2 hover:text-[#A8D62E]" target="_blank">
                      privacy notice
                    </Link>{' '}
                    and consent to processing of my personal data.
                  </>
                )}
              </span>
            </label>

            {error && (
              <div role="alert" className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[12px] text-[#991B1B]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-4 text-[13px] font-semibold text-white transition-all hover:bg-[#1A1A1A] focus:outline-none focus:ring-3 focus:ring-[#C6F24E]/50 disabled:cursor-not-allowed disabled:bg-[#525252]"
            >
              {loading ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 animate-spin" aria-hidden>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  {isTr ? 'Gönderiliyor…' : 'Sending…'}
                </>
              ) : (
                <>
                  {isTr ? 'Gönder' : 'Send'}
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden>
                    <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </button>

            <div className="text-center">
              <Link
                href={`/${locale}/contact`}
                className="text-[11px] text-[#737373] underline underline-offset-2 transition-colors hover:text-[#0A0A0A]"
              >
                {isTr ? 'Detaylı iletişim sayfasına git' : 'Open the full contact page'}
              </Link>
            </div>
          </form>
        )}
      </div>

      {/* Powered by — Pulse muted, not Podium orange */}
      <div className="border-t border-[#EDEDED] bg-[#FAFAFA] px-4 py-2 text-center text-[10px] uppercase tracking-[0.08em] text-[#737373]">
        Powered by{' '}
        <span className="font-semibold text-[#0A0A0A]">
          buaze<span className="text-[#A8D62E]">.</span>
        </span>
      </div>
    </div>
  );
}
