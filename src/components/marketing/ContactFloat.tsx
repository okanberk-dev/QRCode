// src/components/marketing/ContactFloat.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getRecaptchaToken } from '@/lib/recaptcha-client';
import BuazeLogo from '@/components/marketing/BuazeLogo';

const MIN_FILL_MS = 2500;
const BUBBLE_TEASER_DELAY_MS = 6000;
const SESSION_DISMISS_KEY = 'buaze.contact-float.bubble.dismissed';

type WidgetState = 'fab' | 'open';

/**
 * ContactFloat — sticky lead-capture widget on the marketing site.
 *
 * Stage 57 §38.138 — HANDOFF premium chat bubble redesign.
 * Visual yapı 1:1 (graphite header + lime halo + avatar + chat-style
 * message bubble + quick reply chips + KVKK footer + powered by buaze)
 * + Buaze backend async form-based — **live chat YOK**.
 *
 * Three render states intact:
 *  - **fab**           Lime FAB (HANDOFF ChatLauncher: lime halo pulse
 *                      + concentric ring + notification "?" badge).
 *                      After ~6s ilk ziyarette opsiyonel bubble teaser
 *                      slide-in; per-session dismiss.
 *  - **bubble teaser** Avatar + greeting card (mevcut Pulse §11 intact).
 *                      Tıklayınca form'a geçer.
 *  - **open**          HANDOFF ChatBubble visual (graphite header + lime
 *                      halo + Buaze avatar + initial message + 3 quick
 *                      reply chips + Name/Email/Message form + KVKK
 *                      consent + reCAPTCHA + honeypot + /api/contact
 *                      POST — backend kontrat intact).
 *
 * Compliance disipline (CLAUDE.md §35.8 + §35.10 + §19.1.1):
 * - Live chat illusion KALDIRILDI:
 *   - "Cem · Buaze ekibi" → "BUAZE EKİBİ" (jenerik operator)
 *   - "ŞU AN ÇEVRİMİÇİ" → SİLİNDİ (async semantik)
 *   - "14:32 · OKUNDU" timestamp + read status → SİLİNDİ
 *   - "Genelde 2 dakika içinde dönüyoruz" → "Genelde 1 iş günü içinde
 *     dönüş yapıyoruz" (mevcut Stage 51 §38.132 paterni reuse)
 *   - Notification badge "1" message count → "?" yardım icon
 * - Quick reply chips actionable: tıklayınca `setMessage()` ile message
 *   field'a auto-fill (form-based, send manuel — live chat değil).
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

  // Stage 61 §38.142 — StickyCtaBar visibility listener.
  // StickyCtaBar fires `buaze:sticky-cta-visibility` CustomEvent on
  // mount/scroll/dismiss. Burada tüketip ContactFloat'ı dynamic olarak
  // yukarı kaydırıyoruz; aksi halde md+ desktop'ta sticky CTA açıkken
  // FAB + open form sticky bandın arkasında kalıp X close button
  // gözükmüyordu (kullanıcı raporu). Mobile'da sticky CTA `hidden md:block`
  // — aşağıda md: prefix ile yalnız desktop offset uygulanır.
  const [stickyCtaVisible, setStickyCtaVisible] = useState(false);

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

  // Stage 61 §38.142 — StickyCtaBar visibility listener.
  // CustomEvent contract: `detail.visible: boolean`. Sticky CTA bandının
  // ContactFloat'ı kapatmasını önler (kullanıcı raporu: çarpı işareti
  // gözükmüyordu). md+ desktop'ta sticky CTA visible iken FAB/open form
  // ~140px yukarı kayar (sticky height ~120px + 20px breathing).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ visible: boolean }>).detail;
      if (typeof detail?.visible === 'boolean') {
        setStickyCtaVisible(detail.visible);
      }
    };
    window.addEventListener('buaze:sticky-cta-visibility', handler);
    return () => window.removeEventListener('buaze:sticky-cta-visibility', handler);
  }, []);

  // Hide on auth + onboarding only — bu sayfalarda form gürültü olur
  // (kullanıcı zaten bir akışı tamamlıyor). Homepage en kritik conversion
  // surface, baloncuk orada **görünmeli** (eski "homepage'de gizle" exclusion
  // kaldırıldı, kullanıcı raporu gereği — CLAUDE.md §15.3).
  if (current.startsWith(`${base}/auth`) || current === `${base}/onboarding`) {
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

  // Quick reply chip → message field auto-fill (form-based, send manuel)
  const applyQuickReply = (text: string) => {
    setMessage(text);
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
      setError(
        isTr
          ? 'Lütfen zorunlu alanları doldurun ve KVKK onayını verin.'
          : 'Please fill required fields and accept the privacy notice.',
      );
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
    }
    finally {
      setLoading(false);
    }
  };

  // ───────────────────────────────────────── FAB + bubble teaser
  if (state === 'fab') {
    return (
      <div
        aria-live="polite"
        className={`fixed right-4 bottom-[88px] md:right-6 z-50 flex flex-col items-end gap-3 transition-[bottom] duration-300 ease-out ${
          stickyCtaVisible ? 'md:bottom-[148px]' : 'md:bottom-6'
        }`}
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

        {/* Stage 57 §38.138 — HANDOFF ChatLauncher visual: lime halo
            pulse + concentric ring expansion + notification "?" badge.
            Mevcut openForm onClick intact. */}
        <div className="relative inline-block">
          {/* Lime halo blur — 8px inset, 14px blur, 2.6s pulse infinite */}
          <span
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              inset: -8,
              borderRadius: '50%',
              background: '#C6F24E',
              opacity: 0.18,
              filter: 'blur(14px)',
              animation: 'scbPulse 2.6s ease-in-out infinite',
            }}
          />
          {/* Concentric ring — 4px inset, 1.5px lime border, 2.6s expand */}
          <span
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              inset: -4,
              borderRadius: '50%',
              border: '1.5px solid #C6F24E',
              opacity: 0.4,
              animation: 'scbRing 2.6s ease-out infinite',
            }}
          />

          <button
            type="button"
            onClick={openForm}
            aria-label={isTr ? 'Bizimle iletişime geçin' : 'Contact us'}
            className="relative z-[1] flex h-16 w-16 items-center justify-center rounded-full transition-transform hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#C6F24E]/50"
            style={{
              background: '#C6F24E',
              border: '2px solid #0A0A0A',
              boxShadow:
                '0 18px 44px -12px rgba(198,242,78,0.6), 0 4px 12px rgba(10,10,10,0.18)',
            }}
          >
            {/* Stage 61 §38.142 — HANDOFF ChatLauncher BuazeMark icon
                paterni (kullanıcı talebi: "logonun ikonu olsun ve
                estetik şekildeydi"). Önceden speech-bubble svg vardı;
                BuazeLogo (`variant="on-lime"` graphite stroke + accent)
                lime FAB üstünde brand-aligned. CLAUDE.md §11 paterni. */}
            <BuazeLogo size={28} variant="on-lime" />
          </button>

          {/* Notification badge — HANDOFF "1" sayı yerine "?" yardım
              icon (compliance: live chat unread message implication YOK,
              async help-prompt semantik). */}
          <span
            aria-hidden
            className="pointer-events-none absolute -right-0.5 -top-0.5 z-[2] flex h-[18px] w-[18px] items-center justify-center rounded-full font-bold"
            style={{
              background: '#0A0A0A',
              color: '#C6F24E',
              border: '2px solid #C6F24E',
              fontFamily: 'var(--font-mono)',
              fontSize: 9.5,
              letterSpacing: 0,
            }}
          >
            ?
          </span>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────── Open form (state === 'open')
  // HANDOFF ChatBubble visual + Buaze form akışı (mevcut backend kontrat).

  const inputClass =
    'min-h-[44px] w-full rounded-xl border border-[#EDEDED] bg-white px-3.5 py-2.5 text-[16px] sm:text-[14px] text-[#0A0A0A] outline-none transition-all placeholder:text-[#A3A3A3] focus:border-[#C6F24E] focus:shadow-[0_0_0_3px_rgba(198,242,78,0.25)]';

  const quickReplies = isTr
    ? [
        { label: 'Demo nasıl alınır?', autofill: 'Demo almak istiyorum.' },
        { label: 'Fiyatlar?', autofill: 'Fiyatlar hakkında bilgi alabilir miyim?' },
        { label: 'Google entegrasyonu?', autofill: 'Google entegrasyonu nasıl çalışıyor?' },
      ]
    : [
        { label: 'How do I book a demo?', autofill: 'I would like to book a demo.' },
        { label: 'Pricing?', autofill: 'Could you share pricing info?' },
        { label: 'Google integration?', autofill: 'How does the Google integration work?' },
      ];

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={isTr ? 'İletişim formu' : 'Contact form'}
      className={`bz-fade-in fixed right-4 bottom-[88px] left-4 z-50 max-h-[calc(100vh-110px)] overflow-hidden rounded-3xl border border-[#EDEDED] bg-white transition-[bottom] duration-300 ease-out sm:left-auto sm:bottom-6 sm:right-6 sm:w-[360px] ${
        stickyCtaVisible ? 'md:bottom-[148px]' : 'md:bottom-6'
      }`}
      style={{
        boxShadow:
          '0 28px 64px -18px rgba(10,10,10,0.32), 0 4px 12px rgba(10,10,10,0.06)',
      }}
    >
      {/* HEADER — graphite + lime halo + Buaze avatar + status mono */}
      <div
        className="relative overflow-hidden bg-[#0A0A0A] px-5 pb-4 pt-5 text-white"
      >
        {/* Lime halo radial — top-right corner, 160×160, decorative */}
        <span
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            top: -50,
            right: -40,
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(198,242,78,0.32), transparent 65%)',
          }}
        />

        <div className="relative flex items-center gap-3">
          {/* Avatar — Buaze brand mark (jenerik, "Cem" hardcoded operator
              SİLİNDİ; live chat illusion YOK). Synthetic italic Space
              Grotesk + lime gradient + lime corner dot. */}
          <div className="relative shrink-0">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full"
              style={{
                background: 'linear-gradient(135deg, #C6F24E, #A8D62E)',
                fontFamily: 'var(--font-heading)',
                fontStyle: 'italic',
                fontWeight: 600,
                fontSize: 22,
                color: '#0A0A0A',
              }}
              aria-hidden
            >
              B
            </div>
            {/* Lime corner dot — Buaze brand accent, NOT live online dot */}
            <span
              aria-hidden
              className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full"
              style={{
                background: '#C6F24E',
                border: '2.5px solid #0A0A0A',
              }}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div
              className="leading-[1.1] text-white"
              style={{
                fontFamily: 'var(--font-heading)',
                fontStyle: 'italic',
                fontWeight: 400,
                fontSize: 22,
                letterSpacing: '-0.01em',
              }}
            >
              {isTr ? 'Merhaba' : 'Hello'}{' '}
              <span
                aria-hidden
                className="inline-block"
                style={{
                  animation: 'scbWave 2s ease-in-out infinite',
                  transformOrigin: '70% 80%',
                }}
              >
                ✦
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block h-[5px] w-[5px] rounded-full"
                style={{
                  background: '#C6F24E',
                  animation: 'scbDot 1.6s ease-in-out infinite',
                }}
              />
              {/* "ŞU AN ÇEVRİMİÇİ" SİLİNDİ → "BUAZE EKİBİ" jenerik
                  (live chat illusion YOK, async semantik). */}
              <span
                className="pulse-eyebrow"
                style={{ color: '#C6F24E', fontSize: 9.5, letterSpacing: '0.14em' }}
              >
                {isTr ? 'BUAZE EKİBİ' : 'BUAZE TEAM'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setState('fab')}
            aria-label={isTr ? 'Küçült' : 'Minimize'}
            className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full transition-colors hover:bg-white/10"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.65)',
            }}
          >
            <svg viewBox="0 0 9 9" fill="none" className="h-[9px] w-[9px]" aria-hidden>
              <path d="M1 1l7 7M8 1L1 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Async messaging hint — "Genelde 1 iş günü içinde dönüş"
            (Stage 51 §38.132 paterni reuse, Buaze patterned). */}
        <div
          className="relative mt-2 pulse-eyebrow"
          style={{
            color: 'rgba(255,255,255,0.45)',
            fontSize: 10,
            letterSpacing: '0.08em',
          }}
        >
          {isTr ? 'GENELDE 1 İŞ GÜNÜ İÇİNDE DÖNÜŞ' : 'TYPICALLY REPLIES IN 1 BUSINESS DAY'}
        </div>
      </div>

      {/* BODY — chat-style initial message + form */}
      <div className="max-h-[calc(100vh-260px)] overflow-y-auto sm:max-h-[60vh]">
        {sent ? (
          <div className="px-5 py-6 text-center">
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
                ? 'Mesajınız bize ulaştı. Ekibimiz en kısa sürede dönüş yapacak.'
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
          <>
            {/* Initial chat-style bubble — async semantik, "OKUNDU"
                timestamp ve live read-status YOK. Buaze brand voice. */}
            <div className="px-5 pb-1 pt-5">
              <div
                className="max-w-[92%] rounded-tr-3xl rounded-br-3xl rounded-bl-3xl border border-[#EDEDED] bg-[#FAFAFA] px-4 py-3.5 text-[14px] leading-[1.55] text-[#0A0A0A]"
                style={{ borderTopLeftRadius: 4 }}
              >
                {isTr
                  ? 'Sorunuz mu var? Mesajınızı yazın, ekibimiz en kısa sürede dönüş yapsın.'
                  : "Got a question? Drop us a note and we'll get back to you shortly."}
              </div>
            </div>

            {/* Quick reply chips — actionable, message field auto-fill
                (form-based, send manuel — live chat illusion YOK). */}
            <div className="px-5 py-3">
              <div
                className="pulse-eyebrow mb-2.5 text-[#A3A3A3]"
                style={{ fontSize: 9.5, letterSpacing: '0.1em' }}
              >
                {isTr ? 'HIZLI YANITLAR' : 'QUICK REPLIES'}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {quickReplies.map((q, i) => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => applyQuickReply(q.autofill)}
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[12px] font-medium text-[#0A0A0A] transition-colors hover:bg-[#EAF9B8]"
                    style={{
                      background: i === 0 ? '#F7FAEF' : '#FFFFFF',
                      borderColor: i === 0 ? '#C6F24E' : '#EDEDED',
                    }}
                  >
                    {i === 0 && (
                      <span style={{ color: '#A8D62E', fontWeight: 700 }} aria-hidden>
                        ↓
                      </span>
                    )}
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 px-5 pb-3" noValidate>
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
                <label
                  htmlFor="cf-name"
                  className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#525252]"
                >
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
                <label
                  htmlFor="cf-email"
                  className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#525252]"
                >
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
                <label
                  htmlFor="cf-message"
                  className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#525252]"
                >
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
                  className={`${inputClass} min-h-[88px] resize-none py-2.5`}
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
                      <Link
                        href={`/${locale}/kvkk`}
                        className="text-[#0A0A0A] underline underline-offset-2 hover:text-[#A8D62E]"
                        target="_blank"
                      >
                        KVKK Aydınlatma Metni
                      </Link>
                      {`'ni okudum, kişisel verilerimin işlenmesine onay veriyorum.`}
                    </>
                  ) : (
                    <>
                      I have read the{' '}
                      <Link
                        href={`/${locale}/privacy`}
                        className="text-[#0A0A0A] underline underline-offset-2 hover:text-[#A8D62E]"
                        target="_blank"
                      >
                        privacy notice
                      </Link>{' '}
                      and consent to processing of my personal data.
                    </>
                  )}
                </span>
              </label>

              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[12px] text-[#991B1B]"
                >
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
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-4 w-4 animate-spin"
                      aria-hidden
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeOpacity="0.3"
                      />
                      <path
                        d="M12 2a10 10 0 0 1 10 10"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                    {isTr ? 'Gönderiliyor…' : 'Sending…'}
                  </>
                ) : (
                  <>
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      className="h-4 w-4"
                      aria-hidden
                    >
                      <path d="M2 14l13-6L2 2v5l9 1-9 1z" fill="#C6F24E" />
                    </svg>
                    {isTr ? 'Gönder' : 'Send'}
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>

      {/* FOOTER — KVKK encrypted hint + Powered by buaze */}
      <div className="flex items-center justify-between border-t border-[#EDEDED] bg-[#FAFAFA] px-5 py-2.5">
        <div className="inline-flex items-center gap-1.5">
          <svg
            width="11"
            height="11"
            viewBox="0 0 14 14"
            aria-hidden
          >
            <rect
              x="3"
              y="6"
              width="8"
              height="6"
              rx="1"
              stroke="#A3A3A3"
              strokeWidth="1.2"
              fill="none"
            />
            <path
              d="M5 6V4a2 2 0 014 0v2"
              stroke="#A3A3A3"
              strokeWidth="1.2"
              fill="none"
            />
          </svg>
          <span
            className="pulse-eyebrow"
            style={{
              color: '#A3A3A3',
              fontSize: 9,
              letterSpacing: '0.04em',
            }}
          >
            {isTr ? 'KVKK uyumlu, şifreli kanal' : 'Encrypted, GDPR compliant'}
          </span>
        </div>
        <div className="inline-flex items-center gap-1">
          <span
            className="pulse-eyebrow"
            style={{
              color: '#A3A3A3',
              fontSize: 8.5,
              letterSpacing: '0.06em',
            }}
          >
            POWERED BY
          </span>
          <span
            className="text-[#0A0A0A]"
            style={{
              fontFamily: 'var(--font-heading)',
              fontStyle: 'italic',
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            buaze<span className="text-[#A8D62E]">.</span>
          </span>
        </div>
      </div>
    </div>
  );
}
