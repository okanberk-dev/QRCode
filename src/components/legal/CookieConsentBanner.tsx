'use client';

/**
 * Cookie consent banner + settings dialog (KVKK Kurul kararı, GDPR Art. 7,
 * ePrivacy Directive).
 *
 * Four categories:
 *  - essential: always on (session, security, language)
 *  - analytics: Google Analytics + Yandex Metrica (ConditionalAnalytics reads it)
 *  - marketing: ad measurement (no consumer today)
 *  - personalization: panel preferences (no consumer today)
 *
 * Behaviour:
 *  - First visit (no `bz_cookie_consent` in localStorage): the card shows.
 *    "Tümünü kabul et" / "Yalnızca zorunlu" decide in one click; "Tercihleri
 *    yönet" opens the settings dialog with per-category switches. Everything
 *    except essential starts off.
 *  - Withdrawal / change at any time (GDPR Art. 7(3)): the footer's "Çerez
 *    tercihleri" button fires OPEN_COOKIE_PREFERENCES_EVENT and the settings
 *    dialog opens with the stored choices — without the card when a decision
 *    already exists. The cookie policy promises this link. Turning analytics
 *    off expires the GA / Yandex cookies and reloads the page, so tracking
 *    stops immediately.
 *  - The settings dialog moves focus inside, keeps Tab inside, closes on
 *    Escape or backdrop, and returns focus to the control that opened it.
 *
 * SSR-safe: nothing renders until mount (localStorage). Loaded client-only by
 * LazyCookieConsentBanner in the root layout.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { BarChart3, Cookie, Lock, Megaphone, SlidersHorizontal, X, type LucideIcon } from 'lucide-react';

import {
  readCookieConsent,
  writeCookieConsent,
  type CookieConsentState,
} from './cookie-consent-storage';
import {
  COOKIE_PREFERENCES_PENDING_FLAG,
  OPEN_COOKIE_PREFERENCES_EVENT,
} from '@/components/marketing/footer/events';

export { readCookieConsent, type CookieConsentState };

export interface CookieConsentBannerProps {
  /** Fallback before mount; the real locale is read from the URL. */
  locale?: 'tr' | 'en';
}

/**
 * The site's i18n lives in the path (`/en/...`); surfaces without a locale
 * segment use `?hl=`. Default Turkish.
 */
function detectLocaleFromBrowser(): 'tr' | 'en' {
  if (typeof window === 'undefined') return 'tr';
  try {
    const path = window.location.pathname;
    if (/^\/en(\/|$)/.test(path)) return 'en';
    if (/^\/tr(\/|$)/.test(path)) return 'tr';
    const search = new URLSearchParams(window.location.search);
    const hl = (search.get('hl') || search.get('lang') || '').toLowerCase();
    if (hl === 'en') return 'en';
    if (hl === 'tr') return 'tr';
  } catch {
    /* exotic environment */
  }
  return 'tr';
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** First-party cookies set by Google Analytics (_ga*, _gid, _gat*) and Yandex Metrica (_ym*). */
const ANALYTICS_COOKIE = /^(_ga|_gid|_gat|_ym)/;

/**
 * After analytics consent is withdrawn: expire the analytics cookies (on the
 * host and on the parent domain, where both tools set them) and reload, so
 * the scripts already running on this page stop at once instead of on the
 * next full page load (GDPR Art. 7(3) — withdrawing must actually stop it).
 */
function stopAnalyticsNow() {
  try {
    const host = window.location.hostname;
    const parts = host.split('.');
    const domains = ['', host, `.${host}`];
    if (parts.length > 2) domains.push(`.${parts.slice(-2).join('.')}`);
    const names = document.cookie
      .split(';')
      .map((part) => part.split('=')[0]?.trim() ?? '')
      .filter((name) => ANALYTICS_COOKIE.test(name));
    for (const name of names) {
      for (const domain of domains) {
        document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ''}`;
      }
    }
  } catch {
    /* cookies blocked: nothing was stored either */
  }
  window.location.reload();
}

export default function CookieConsentBanner({ locale: serverLocale = 'tr' }: CookieConsentBannerProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [personalization, setPersonalization] = useState(false);
  const [locale, setLocale] = useState<'tr' | 'en'>(serverLocale);
  const isTr = locale === 'tr';

  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  // Inside the owner panel the card would sit on top of wizard footers and
  // save bars (it covered "İleri" on phones). No decision = analytics stay
  // off, so hiding it there grants nothing; it shows again on the site.
  const pathname = usePathname();
  const inPanel = /^\/(tr|en)\/dashboard(\/|$)/.test(pathname ?? '');

  useEffect(() => {
    setMounted(true);
    // Inside an iframe (embed widget) the parent site runs its own consent.
    try {
      if (window.self !== window.top) return;
    } catch {
      return; // cross-origin iframe
    }
    // Short customer flows (QR review `/r/...`, public survey `/s/...`) and
    // the staff console `/admin` skip the card: without a stored decision
    // ConditionalAnalytics keeps analytics off, so nothing is granted.
    const path = window.location.pathname;
    if (/^\/r\//.test(path) || /^\/s\//.test(path) || /^\/admin(\/|$)/.test(path)) return;
    // The owner panel hides the card too (see `inPanel` below); the stored
    // decision is still read here so the settings dialog opens with it.

    setLocale(detectLocaleFromBrowser());
    const existing = readCookieConsent();
    if (!existing) {
      setVisible(true);
    } else {
      setAnalytics(existing.analytics);
      setMarketing(existing.marketing);
      setPersonalization(existing.personalization);
    }
  }, []);

  const openSettings = useCallback(() => {
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setShowCustomize(true);
  }, []);

  // Footer "Çerez tercihleri" — reopen the settings with the stored choices.
  useEffect(() => {
    const flags = window as unknown as Record<string, unknown>;
    const onOpen = () => {
      flags[COOKIE_PREFERENCES_PENDING_FLAG] = false;
      setLocale(detectLocaleFromBrowser());
      const existing = readCookieConsent();
      setAnalytics(existing?.analytics ?? false);
      setMarketing(existing?.marketing ?? false);
      setPersonalization(existing?.personalization ?? false);
      openSettings();
    };
    window.addEventListener(OPEN_COOKIE_PREFERENCES_EVENT, onOpen);
    // Pressed before this lazy chunk mounted.
    if (flags[COOKIE_PREFERENCES_PENDING_FLAG]) onOpen();
    return () => window.removeEventListener(OPEN_COOKIE_PREFERENCES_EVENT, onOpen);
  }, [openSettings]);

  const closeSettings = useCallback(() => {
    setShowCustomize(false);
  }, []);

  // Dialog: initial focus, Escape, Tab kept inside, focus returned on close.
  useEffect(() => {
    if (!showCustomize) return;
    const dialog = dialogRef.current;
    const focusTimer = window.setTimeout(() => dialog?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeSettings();
        return;
      }
      if (e.key !== 'Tab' || !dialog) return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === dialog)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const returnTo = returnFocusRef.current;
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKey);
      if (returnTo && returnTo.isConnected) returnTo.focus();
    };
  }, [showCustomize, closeSettings]);

  const cardVisible = visible && !inPanel;
  if (!mounted || (!cardVisible && !showCustomize)) return null;

  const acceptAll = () => {
    writeCookieConsent({ analytics: true, marketing: true, personalization: true });
    setVisible(false);
  };
  const onlyEssential = () => {
    const hadAnalytics = readCookieConsent()?.analytics === true;
    writeCookieConsent({ analytics: false, marketing: false, personalization: false });
    setVisible(false);
    if (hadAnalytics) stopAnalyticsNow();
  };
  const saveCustom = () => {
    const hadAnalytics = readCookieConsent()?.analytics === true;
    writeCookieConsent({ analytics, marketing, personalization });
    setShowCustomize(false);
    setVisible(false);
    if (hadAnalytics && !analytics) stopAnalyticsNow();
  };
  const acceptAllFromModal = () => {
    setAnalytics(true);
    setMarketing(true);
    setPersonalization(true);
    writeCookieConsent({ analytics: true, marketing: true, personalization: true });
    setShowCustomize(false);
    setVisible(false);
  };

  // Short legal slugs — there is no `/[locale]/legal/` segment.
  const cookiePolicyHref = `/${locale}/cookie`;

  return (
    <>
      {cardVisible ? (
        <div
          role="region"
          aria-labelledby="cookie-banner-title"
          className="fixed bottom-4 left-4 right-4 z-[100] sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-[420px]"
          style={{
            paddingBottom: 'env(safe-area-inset-bottom)',
            animation: 'bz-cookie-card-in 480ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
        >
          <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-[#0A0A0A] p-[22px] text-[#F6F4EF] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.6)]">
            <div className="mb-3 flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#C6F24E]/25 bg-[#C6F24E]/10"
              >
                <Cookie size={18} strokeWidth={2} className="text-[#C6F24E]" />
              </span>
              <p
                id="cookie-banner-title"
                className="text-[18px] font-semibold leading-[1.25] tracking-[-0.01em] text-[#F6F4EF]"
              >
                {isTr ? 'Çerez tercihleriniz' : 'Your cookie choices'}
              </p>
            </div>

            <p className="mb-4 text-[13px] leading-[1.6] text-[#F6F4EF]/75">
              {isTr ? (
                <>
                  Sitenin çalışması için zorunlu çerezleri kullanırız. Analitik, pazarlama ve
                  kişiselleştirme çerezleri yalnızca onay verirseniz çalışır. Ayrıntılar{' '}
                  <Link
                    href={cookiePolicyHref}
                    className="font-semibold text-[#F6F4EF] underline underline-offset-2 hover:text-white"
                  >
                    Çerez Politikası
                  </Link>
                  &apos;nda.
                </>
              ) : (
                <>
                  We use essential cookies to run the site. Analytics, marketing and
                  personalization cookies only run if you allow them. Details are in our{' '}
                  <Link
                    href={cookiePolicyHref}
                    className="font-semibold text-[#F6F4EF] underline underline-offset-2 hover:text-white"
                  >
                    Cookie Policy
                  </Link>
                  .
                </>
              )}
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={acceptAll}
                className="flex min-h-[44px] flex-1 basis-[140px] items-center justify-center whitespace-nowrap rounded-xl bg-[#C6F24E] px-3 text-[14px] font-semibold text-[#0A0A0A] transition-colors hover:bg-[#A8D62E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
              >
                {isTr ? 'Tümünü kabul et' : 'Accept all'}
              </button>
              <button
                type="button"
                onClick={onlyEssential}
                className="flex min-h-[44px] flex-1 basis-[140px] items-center justify-center whitespace-nowrap rounded-xl border border-white/20 bg-transparent px-3 text-[14px] font-semibold text-[#F6F4EF] transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
              >
                {isTr ? 'Yalnızca zorunlu' : 'Essential only'}
              </button>
            </div>

            <button
              type="button"
              onClick={openSettings}
              aria-haspopup="dialog"
              className="mt-2 flex min-h-[40px] w-full items-center justify-center rounded-xl text-[13px] font-medium text-[#F6F4EF]/75 underline decoration-[#F6F4EF]/30 underline-offset-4 transition-colors hover:text-[#F6F4EF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]"
            >
              {isTr ? 'Tercihleri yönet' : 'Manage preferences'}
            </button>
          </div>
        </div>
      ) : null}

      {showCustomize ? (
        <div
          className="fixed inset-0 z-[101] flex items-end justify-center bg-black/45 backdrop-blur-[6px] sm:items-center"
          onClick={closeSettings}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-customize-title"
            tabIndex={-1}
            className="w-full max-w-[580px] overflow-hidden rounded-t-[22px] border border-[#0A0A0A]/[0.06] bg-white text-[#0A0A0A] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)] outline-none sm:rounded-[22px]"
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: 'bz-cookie-card-in 420ms cubic-bezier(0.2, 0.8, 0.2, 1)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#0A0A0A]/[0.06] px-6 py-5">
              <div>
                <h2
                  id="cookie-customize-title"
                  className="text-[22px] font-semibold leading-[1.2] tracking-[-0.015em] text-[#0A0A0A]"
                >
                  {isTr ? 'Çerez tercihleriniz' : 'Your cookie preferences'}
                </h2>
                <p className="mt-1 text-[13px] leading-[1.5] text-[#525252]">
                  {isTr
                    ? 'Kararınızı dilediğiniz zaman sitenin alt bilgisindeki “Çerez tercihleri” bağlantısından değiştirebilirsiniz.'
                    : 'You can change this at any time from the “Cookie preferences” link in the site footer.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeSettings}
                aria-label={isTr ? 'Kapat' : 'Close'}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0A0A0A]/[0.04] text-[#0A0A0A] transition-colors hover:bg-[#0A0A0A]/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]"
              >
                <X size={16} strokeWidth={2} aria-hidden />
              </button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto px-3 py-2 sm:max-h-[360px]">
              <CategoryRow
                icon={Lock}
                label={isTr ? 'Zorunlu' : 'Essential'}
                description={
                  isTr
                    ? 'Oturum, güvenlik ve dil seçimi. Bunlar olmadan site çalışmaz.'
                    : 'Session, security and language. The site cannot work without them.'
                }
                requiredLabel={isTr ? 'Her zaman açık' : 'Always on'}
                checked
                disabled
                onChange={() => {}}
              />
              <CategoryRow
                icon={BarChart3}
                label={isTr ? 'Analitik' : 'Analytics'}
                description={
                  isTr
                    ? 'Ziyaret istatistikleri (Google Analytics, Yandex Metrica). Hangi sayfaların kullanıldığını anlamamıza yardımcı olur.'
                    : 'Visit statistics (Google Analytics, Yandex Metrica). They help us see which pages are used.'
                }
                checked={analytics}
                onChange={setAnalytics}
              />
              <CategoryRow
                icon={Megaphone}
                label={isTr ? 'Pazarlama' : 'Marketing'}
                description={
                  isTr
                    ? 'Reklam ölçümü. Şu anda kullanılmıyor; kullanılmaya başlanırsa yalnızca onayınızla çalışır.'
                    : 'Advertising measurement. Not used today; if that changes, it will only run with your consent.'
                }
                checked={marketing}
                onChange={setMarketing}
              />
              <CategoryRow
                icon={SlidersHorizontal}
                label={isTr ? 'Kişiselleştirme' : 'Personalization'}
                description={
                  isTr
                    ? 'Paneli önceki tercihlerinize göre düzenler. Şu anda kullanılmıyor; kullanılmaya başlanırsa yalnızca onayınızla çalışır.'
                    : 'Adapts the panel to your earlier choices. Not used today; if that changes, it will only run with your consent.'
                }
                checked={personalization}
                onChange={setPersonalization}
              />
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[#0A0A0A]/[0.06] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href={cookiePolicyHref}
                className="text-center text-[13px] font-medium text-[#525252] underline decoration-[#D4D4D4] underline-offset-4 hover:text-[#0A0A0A] sm:text-left"
              >
                {isTr ? 'Çerez Politikası' : 'Cookie Policy'}
              </Link>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveCustom}
                  className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-[#0A0A0A]/[0.18] bg-transparent px-4 text-[14px] font-semibold text-[#0A0A0A] transition-colors hover:bg-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2 sm:flex-none"
                >
                  {isTr ? 'Seçimi kaydet' : 'Save choices'}
                </button>
                <button
                  type="button"
                  onClick={acceptAllFromModal}
                  className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-[#C6F24E] px-4 text-[14px] font-semibold text-[#0A0A0A] transition-colors hover:bg-[#A8D62E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2 sm:flex-none"
                >
                  {isTr ? 'Tümünü kabul et' : 'Accept all'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Settings row — label, description, switch. */
function CategoryRow({
  icon: Icon,
  label,
  description,
  requiredLabel,
  checked,
  disabled = false,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  requiredLabel?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className={`grid grid-cols-[40px_1fr_auto] items-start gap-3.5 rounded-2xl px-3.5 py-3.5 ${
        disabled ? '' : 'transition-colors hover:bg-[#FAFAFA]'
      }`}
    >
      <div
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF9B8]"
      >
        <Icon size={16} strokeWidth={1.8} className="text-[#0A0A0A]" />
      </div>
      <div>
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="text-[14px] font-semibold text-[#0A0A0A]">{label}</span>
          {disabled && requiredLabel ? (
            <span className="rounded bg-[#0A0A0A]/[0.06] px-1.5 py-0.5 text-[11px] font-medium text-[#525252]">
              {requiredLabel}
            </span>
          ) : null}
        </div>
        <p className="m-0 text-[13px] leading-[1.5] text-[#525252]">{description}</p>
      </div>
      <CCToggle on={checked} disabled={disabled} onChange={onChange} label={label} />
    </div>
  );
}

/** Switch — 44×26 pill, lime on / muted off. */
function CCToggle({
  on,
  disabled = false,
  onChange,
  label,
}: {
  on: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => !disabled && onChange(!on)}
      disabled={disabled}
      className={`relative mt-1 h-[26px] w-11 rounded-[13px] border-none p-0 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2 ${
        on ? 'bg-[#C6F24E]' : 'bg-[#0A0A0A]/[0.18]'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <span
        aria-hidden="true"
        className="absolute top-[3px] h-5 w-5 rounded-[10px] bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-[left] duration-[220ms]"
        style={{
          left: on ? '21px' : '3px',
          transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      />
    </button>
  );
}
