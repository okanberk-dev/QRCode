'use client';

/**
 * Stage 31b §38.108 — KVKK Çerez Kurulu kararı + GDPR Art.7 + ePrivacy
 * Direktifi uyumlu çerez onay banner'ı.
 *
 * Stage 32 §38.112 — Premium editorial redesign (Claude Design JSX prototip
 * paterni). Bottom-right floating graphite card + lime corner glow + italic
 * Space Grotesk hero + JetBrains Mono uppercase action labels. Modal
 * preferences view ivory paper + 4 kategori toggle row (essential always-on,
 * analytics + marketing + personalization opt-out).
 *
 * 4 kategori (Stage 32):
 *  - essential: always-on, opt-out yok (oturum, güvenlik, dil)
 *  - analytics: GA + Yandex Metrica (ConditionalAnalytics consume eder)
 *  - marketing: reklam ölçümü (şu an consumer yok, gelecek scope)
 *  - personalization: panel preference store (şu an consumer yok, forward-looking)
 *
 * UX (CLAUDE.md §19.1 paterni — "default opt-out + bilinçli onay"):
 *  - İlk ziyarette banner görünür (localStorage `bz_cookie_consent` boş)
 *  - "Tümünü kabul" → analytics + marketing + personalization true
 *  - "Sadece zorunlu" → 3'ü de false
 *  - "Kişiselleştir" → modal'da kategori-bazlı toggle
 *  - Default: essential always-on, kalan 3 opt-out
 *  - Karar verildikten sonra banner gizli (direct close — §38.112 §38.79
 *    paterni intact, success view yok)
 *
 * SSR-safe: useState mount sonrası localStorage check (CLAUDE.md §11.11
 * TrialBanner paterni reuse).
 *
 * Pulse design: graphite (#0A0A0A) + lime (#C6F24E) accent (CLAUDE.md §11).
 * Bottom-right floating card pattern (mobile responsive: full-width
 * bottom-sheet stack altında).
 *
 * v2 migration (Stage 32 §38.112): eski v1 row'lar (essential/analytics/
 * marketing) `personalization: false` default ile v2'ye upgrade edilir.
 * `readCookieConsent` migration logic backward compat.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cookie, X, Lock } from 'lucide-react';

const STORAGE_KEY = 'bz_cookie_consent';
const STORAGE_VERSION = 2;

export interface CookieConsentState {
  version: number;
  essential: true;
  analytics: boolean;
  marketing: boolean;
  /** Stage 32 §38.112 — panel preference personalization (forward-looking) */
  personalization: boolean;
  decidedAt: string;
}

/**
 * Stage 32 §38.112 — v1 → v2 migration helper.
 * Eski v1 row (`{ version: 1, essential: true, analytics, marketing,
 * decidedAt }`) `personalization: false` default ile v2 shape'e upgrade
 * edilir. v2+ row'lar olduğu gibi okunur. Geçersiz / corrupt JSON null
 * döner → banner görünür hale gelir.
 */
export function readCookieConsent(): CookieConsentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const ver = typeof parsed?.version === 'number' ? parsed.version : 0;
    if (ver < 1 || ver > STORAGE_VERSION) return null;
    return {
      version: STORAGE_VERSION,
      essential: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      personalization: ver >= 2 ? Boolean(parsed.personalization) : false,
      decidedAt: typeof parsed.decidedAt === 'string' ? parsed.decidedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function writeCookieConsent(consent: Omit<CookieConsentState, 'version' | 'essential' | 'decidedAt'>) {
  if (typeof window === 'undefined') return;
  const payload: CookieConsentState = {
    version: STORAGE_VERSION,
    essential: true,
    analytics: consent.analytics,
    marketing: consent.marketing,
    personalization: consent.personalization,
    decidedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* swallow — quota / private mode */
  }
  // Yeni karar Script tag'lerin re-evaluate edilmesi için window event
  // emit eder. ConditionalAnalytics component bunu dinler.
  window.dispatchEvent(new CustomEvent('bz:cookie-consent-changed', { detail: payload }));
}

export interface CookieConsentBannerProps {
  /**
   * Server-side fallback locale (NEXT_LOCALE cookie). Çoğu zaman 'tr'
   * — Buaze cookie set etmiyor; gerçek locale Stage 31d §38.110 fix'inde
   * client-side `window.location` pathname'inden detect ediliyor (`/en/...`
   * veya `?hl=en` → 'en'; aksi 'tr'). Prop sadece pre-mount fallback.
   */
  locale?: 'tr' | 'en';
}

/**
 * Stage 31d §38.110 — client-side locale auto-detection.
 *
 * Buaze URL-segment based i18n (`/[locale]/...`); `NEXT_LOCALE` cookie
 * genelde set edilmiyor → server prop her zaman 'tr' fallback'e düşüyordu.
 * Banner her zaman TR görünüyordu (kullanıcı raporu).
 *
 * Fix: mount sonrası `window.location.pathname` parse + `?hl=en` query
 * fallback. Public surface'lerde (`/r/[slug]`, `/menu/[slug]`) locale
 * segment yok; query string `?hl=` kullanılır (CLAUDE.md public review
 * surface paterni). Default 'tr'.
 */
function detectLocaleFromBrowser(): 'tr' | 'en' {
  if (typeof window === 'undefined') return 'tr';
  try {
    // 1) Pathname check — `/en/...` veya `/en` exact
    const path = window.location.pathname;
    if (/^\/en(\/|$)/.test(path)) return 'en';
    if (/^\/tr(\/|$)/.test(path)) return 'tr';
    // 2) Query param fallback (public surface'ler için)
    const search = new URLSearchParams(window.location.search);
    const hl = (search.get('hl') || search.get('lang') || '').toLowerCase();
    if (hl === 'en') return 'en';
    if (hl === 'tr') return 'tr';
  } catch {
    /* swallow — exotic environment */
  }
  return 'tr';
}

export default function CookieConsentBanner({ locale: serverLocale = 'tr' }: CookieConsentBannerProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [personalization, setPersonalization] = useState(false);
  // Server-side prop ilk render'da fallback; client mount sonrası
  // `detectLocaleFromBrowser` ile pathname/query'den doğrulanır.
  const [locale, setLocale] = useState<'tr' | 'en'>(serverLocale);
  const isTr = locale === 'tr';

  useEffect(() => {
    setMounted(true);
    // Stage 31b §38.108 — iframe (embed) context'te banner gösterme.
    // Parent site'in kendi consent flow'u var; iframe içinde duplicate
    // banner UX kötü olur (`/embed/[slug]` widget her ziyarette banner
    // göstermek).
    try {
      if (window.self !== window.top) return;
    } catch {
      // Cross-origin iframe → window.top throws → kesinlikle iframe'iz, skip
      return;
    }
    // Stage XX — public QR review surface (`/r/[slug]`, `/r/[slug]/menu`)
    // skips the banner entirely. Scanning a table QR opens a 30-second,
    // no-account rating flow (CLAUDE.md §23.7 Phase 10.1); interrupting it
    // with a consent card is a bad first impression and the flow has no
    // locale segment to key off (bare `/r/<slug>`), unlike `/[locale]/...`.
    // Safe: `ConditionalAnalytics` already treats a missing consent record
    // as `analytics: false` (no GA/Yandex load) — skipping the banner here
    // does not grant or imply any consent, it stays at the same
    // essential-only default the page would have before a decision anyway.
    if (/^\/r\//.test(window.location.pathname)) return;
    // `/admin` (login + console) is an internal staff surface: on a phone the
    // consent card covered the entire login form. Same safety argument as
    // above — no consent record means `ConditionalAnalytics` stays off, so
    // skipping the card grants nothing.
    if (/^\/admin(\/|$)/.test(window.location.pathname)) return;

    // Stage 31d §38.110 — client-side locale detection.
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

  // ESC handler for "customize" modal (WCAG 2.1 dialog disipline). Banner
  // başlangıç card'ı tarayıcı görünümünden çıkamaz (consent zorunlu) ama
  // customize modal `role="dialog"` non-blocking secondary screen — ESC
  // ile kapatılabilmeli. Backdrop click out zaten var; bu klavye eşi.
  useEffect(() => {
    if (!showCustomize) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setShowCustomize(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showCustomize]);

  if (!mounted || !visible) return null;

  const acceptAll = () => {
    writeCookieConsent({ analytics: true, marketing: true, personalization: true });
    setVisible(false);
  };
  const onlyEssential = () => {
    writeCookieConsent({ analytics: false, marketing: false, personalization: false });
    setVisible(false);
  };
  const saveCustom = () => {
    writeCookieConsent({ analytics, marketing, personalization });
    setShowCustomize(false);
    setVisible(false);
  };
  const acceptAllFromModal = () => {
    setAnalytics(true);
    setMarketing(true);
    setPersonalization(true);
    writeCookieConsent({ analytics: true, marketing: true, personalization: true });
    setShowCustomize(false);
    setVisible(false);
  };

  // Public legal routes use short slugs — there is no `/[locale]/legal/`
  // segment (CLAUDE.md §38.131). This banner renders in the root layout,
  // so the old `/legal/...` href 404'd on every page of the site.
  const cookiePolicyHref = `/${locale}/cookie`;

  return (
    <>
      {/* Bottom-right floating card (mobile: full-width bottom-sheet) */}
      <div
        role="region"
        aria-label={isTr ? 'Çerez tercih bannerı' : 'Cookie preference banner'}
        className="fixed bottom-4 left-4 right-4 z-[100] sm:left-auto sm:bottom-6 sm:right-6 sm:max-w-[420px]"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          animation: 'bz-cookie-card-in 480ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-[#0A0A0A] p-[22px] text-[#F6F4EF] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.6),0_0_0_1px_rgba(198,242,78,0.06)]">
          {/* Lime corner glow — pointer-events: none, sadece görsel */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-[60px] -top-[60px] h-[180px] w-[180px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(198, 242, 78, 0.22), transparent 70%)',
            }}
          />

          {/* Eyebrow row: cookie icon chip + mono uppercase label */}
          <div className="mb-3.5 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#C6F24E]/25 bg-[#C6F24E]/10">
              <Cookie size={18} strokeWidth={2} className="text-[#C6F24E]" />
            </span>
            <span className="pulse-eyebrow text-[#C6F24E]">
              {isTr ? 'GİZLİLİK · ÇEREZLER' : 'PRIVACY · COOKIES'}
            </span>
          </div>

          {/* Italic editorial hero — pasif copy (legal accurate, "izlemiyoruz" claim'i yok) */}
          <h4
            className="mb-2 text-[24px] leading-[1.2] tracking-[-0.01em] text-[#F6F4EF]"
            style={{ fontFamily: 'var(--font-space-grotesk)', fontStyle: 'italic', fontWeight: 400 }}
          >
            {isTr ? 'Çerezleri siz yönetirsiniz.' : 'You’re in control of cookies.'}
          </h4>

          {/* Body — KVKK uyumlu, accurate (mevcut Buaze copy korunur, JSX'in
              "izlemiyoruz" claim'i kullanılmaz; analytics consent verilmişse
              GA/Yandex aktif olur) */}
          <p className="mb-[18px] text-[12.5px] leading-[1.55] text-[#F6F4EF]/60">
            {isTr ? (
              <>
                Sitenin çalışması için zorunlu çerezleri kullanırız. Analitik,
                pazarlama ve kişiselleştirme çerezleri yalnızca sizin onayınızla
                aktif olur. Detaylar için{' '}
                <Link
                  href={cookiePolicyHref}
                  className="font-semibold text-[#F6F4EF] underline-offset-2 hover:underline"
                >
                  Çerez Politikası
                </Link>
                &apos;na bakabilirsiniz.
              </>
            ) : (
              <>
                We use essential cookies to make our site work. Analytics,
                marketing and personalization cookies are only active with your
                consent. See our{' '}
                <Link
                  href={cookiePolicyHref}
                  className="font-semibold text-[#F6F4EF] underline-offset-2 hover:underline"
                >
                  Cookie Policy
                </Link>{' '}
                for details.
              </>
            )}
          </p>

          {/* Quick category chip strip — 4 kategori summary (essential on,
              analytics + marketing + personalization off-default) */}
          <div className="mb-[18px] flex flex-wrap gap-1.5">
            <CCChip on label={isTr ? 'Zorunlu' : 'Essential'} />
            <CCChip label="Analytics" />
            <CCChip label="Marketing" />
            <CCChip label={isTr ? 'Kişiselleştirme' : 'Personalize'} />
          </div>

          {/* Primary actions — accept all (lime CTA) + only essential (ghost) */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={acceptAll}
              className="pulse-eyebrow flex h-[42px] min-w-[140px] flex-[2] items-center justify-center rounded-xl border-none bg-[#C6F24E] text-[11px] font-bold uppercase tracking-[0.12em] text-[#0A0A0A] shadow-[0_8px_20px_-8px_rgba(198,242,78,0.6)] transition-colors hover:bg-[#A8D62E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
            >
              {isTr ? 'TÜMÜNÜ KABUL' : 'ACCEPT ALL'}
            </button>
            <button
              type="button"
              onClick={onlyEssential}
              className="pulse-eyebrow flex h-[42px] min-w-[100px] flex-1 items-center justify-center rounded-xl border border-white/[0.18] bg-transparent text-[11px] font-bold uppercase tracking-[0.12em] text-[#F6F4EF] transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
            >
              {isTr ? 'GEREKENLER' : 'ESSENTIAL ONLY'}
            </button>
          </div>

          {/* Secondary action — customize preferences */}
          <button
            type="button"
            onClick={() => setShowCustomize(true)}
            className="pulse-eyebrow mt-3 h-8 w-full bg-transparent text-[10px] font-bold uppercase tracking-[0.16em] text-[#F6F4EF]/55 underline decoration-[#F6F4EF]/20 underline-offset-4 transition-colors hover:text-[#F6F4EF]/80"
          >
            {isTr ? 'TERCİHLERİ ÖZELLEŞTİR →' : 'CUSTOMIZE PREFERENCES →'}
          </button>
        </div>
      </div>

      {/* Customize modal — 4 kategori toggle (essential locked + 3 opt-out) */}
      {showCustomize ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-customize-title"
          className="fixed inset-0 z-[101] flex items-end justify-center bg-black/45 backdrop-blur-[6px] sm:items-center"
          onClick={() => setShowCustomize(false)}
        >
          <div
            className="w-full max-w-[580px] overflow-hidden rounded-t-[22px] border border-[#0A0A0A]/[0.06] bg-white text-[#0A0A0A] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)] sm:rounded-[22px]"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'bz-cookie-card-in 420ms cubic-bezier(0.2, 0.8, 0.2, 1)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-[#0A0A0A]/[0.06] px-6 py-5">
              <div>
                <span className="pulse-eyebrow text-[#737373]">
                  {isTr ? 'GİZLİLİK MERKEZİ' : 'PRIVACY CENTER'}
                </span>
                <h3
                  id="cookie-customize-title"
                  className="mt-1 text-[26px] leading-[1.15] tracking-[-0.012em] text-[#0A0A0A]"
                  style={{ fontFamily: 'var(--font-space-grotesk)', fontStyle: 'italic', fontWeight: 400 }}
                >
                  {isTr ? 'Çerez tercihleriniz' : 'Your cookie preferences'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomize(false)}
                aria-label={isTr ? 'Kapat' : 'Close'}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0A0A0A]/[0.04] text-[#0A0A0A] transition-colors hover:bg-[#0A0A0A]/[0.08]"
              >
                <X size={14} strokeWidth={2} />
              </button>
            </div>

            {/* Categories */}
            <div className="max-h-[360px] overflow-y-auto px-3 py-2">
              <CategoryRow
                label={isTr ? 'Zorunlu' : 'Essential'}
                description={
                  isTr
                    ? 'Oturum, güvenlik, dil seçimi. Olmadan site çalışmaz.'
                    : 'Session, security, language. Required for the site to work.'
                }
                requiredLabel={isTr ? 'GEREKLİ' : 'REQUIRED'}
                checked={true}
                disabled
                onChange={() => {}}
              />
              <CategoryRow
                label={isTr ? 'Analitik' : 'Analytics'}
                description={
                  isTr
                    ? 'Anonim ziyaret istatistikleri (Google Analytics, Yandex Metrica). Hangi sayfaların kullanıldığını anlamamızı sağlar.'
                    : 'Anonymous visit statistics (Google Analytics, Yandex Metrica). Helps us understand which pages get used.'
                }
                checked={analytics}
                onChange={(v) => setAnalytics(v)}
              />
              <CategoryRow
                label={isTr ? 'Pazarlama' : 'Marketing'}
                description={
                  isTr
                    ? 'Reklam ölçümü ve kişiselleştirme. Şu anda kullanılmıyor; ileride aktive edilebilir.'
                    : 'Advertising measurement and personalization. Not currently used; may be enabled later.'
                }
                checked={marketing}
                onChange={(v) => setMarketing(v)}
              />
              <CategoryRow
                label={isTr ? 'Kişiselleştirme' : 'Personalization'}
                description={
                  isTr
                    ? 'Önceki tercihlerinize göre paneli özelleştirir. Şu anda kullanılmıyor; ileride aktive edilebilir.'
                    : 'Tailors the panel to your previous preferences. Not currently used; may be enabled later.'
                }
                checked={personalization}
                onChange={(v) => setPersonalization(v)}
              />
            </div>

            {/* Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#0A0A0A]/[0.06] px-5 py-4">
              <span className="pulse-eyebrow text-[#A3A3A3]">
                {isTr ? 'KVKK · GDPR UYUMLU · BUAZE BİLİŞİM A.Ş.' : 'GDPR COMPLIANT · BUAZE A.Ş.'}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveCustom}
                  className="pulse-eyebrow flex h-[38px] items-center justify-center rounded-[10px] border border-[#0A0A0A]/[0.18] bg-transparent px-4 text-[11px] font-bold uppercase tracking-[0.12em] text-[#0A0A0A] transition-colors hover:bg-[#FAFAFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
                >
                  {isTr ? 'SEÇİMİ KAYDET' : 'SAVE CHOICES'}
                </button>
                <button
                  type="button"
                  onClick={acceptAllFromModal}
                  className="pulse-eyebrow flex h-[38px] items-center justify-center rounded-[10px] border-none bg-[#C6F24E] px-4 text-[11px] font-bold uppercase tracking-[0.12em] text-[#0A0A0A] shadow-[0_8px_20px_-8px_rgba(198,242,78,0.6)] transition-colors hover:bg-[#A8D62E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2"
                >
                  {isTr ? 'TÜMÜNÜ KABUL' : 'ACCEPT ALL'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Compact card chip — 4-kategori mini summary (essential on lime, others off muted) */
function CCChip({ label, on = false }: { label: string; on?: boolean }) {
  return (
    <span
      className={`pulse-eyebrow inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${
        on
          ? 'border-[#C6F24E]/30 bg-[#C6F24E]/[0.14] text-[#C6F24E]'
          : 'border-white/[0.08] bg-white/[0.05] text-[#F6F4EF]/60'
      }`}
    >
      <span
        aria-hidden="true"
        className="h-[5px] w-[5px] rounded-full"
        style={{ background: on ? '#C6F24E' : 'rgba(246, 244, 239, 0.3)' }}
      />
      {label}
    </span>
  );
}

/** Modal toggle row — Pulse switch (lime on / muted off) + label + description */
function CategoryRow({
  label,
  description,
  requiredLabel,
  checked,
  disabled = false,
  onChange,
}: {
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
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF9B8]">
        <Lock size={16} strokeWidth={1.8} className={disabled ? 'text-[#0A0A0A]' : 'text-transparent'} />
      </div>
      <div>
        <div className="mb-1 flex items-center gap-2">
          <span className="text-[14px] font-semibold text-[#0A0A0A]">{label}</span>
          {disabled && requiredLabel ? (
            <span className="pulse-eyebrow rounded bg-[#0A0A0A]/[0.06] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[#737373]">
              {requiredLabel}
            </span>
          ) : null}
        </div>
        <p className="m-0 text-[12px] leading-[1.5] text-[#737373]">{description}</p>
      </div>
      <CCToggle on={checked} disabled={disabled} onChange={onChange} label={label} />
    </div>
  );
}

/** Pulse switch — 44×26 rounded pill, lime on / muted off, 220ms ease */
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
      className={`relative h-[26px] w-11 rounded-[13px] border-none p-0 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 ${
        on ? 'bg-[#C6F24E]' : 'bg-[#0A0A0A]/[0.12]'
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
