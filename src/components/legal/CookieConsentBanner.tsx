'use client';

/**
 * Stage 31b §38.108 — KVKK Çerez Kurulu kararı + GDPR Art.7 + ePrivacy
 * Direktifi uyumlu çerez onay banner'ı.
 *
 * 3 kategori: essential (always-on, opt-out yok) / analytics / marketing.
 * UX (CLAUDE.md §19.1 paterni — "default opt-out + bilinçli onay"):
 *  - İlk ziyarette banner görünür (localStorage `bz_cookie_consent` boş)
 *  - "Tümünü kabul et" → analytics + marketing true
 *  - "Sadece zorunlu" → ikisi de false
 *  - "Kişiselleştir" → modal'da kategori-bazlı toggle
 *  - Default: essential always-on, analytics + marketing opt-out
 *  - Karar verildikten sonra banner gizli, layout'taki conditional Script'ler
 *    state'i okuyup GA / Yandex render eder veya etmez
 *
 * SSR-safe: useState mount sonrası localStorage check (CLAUDE.md §11.11
 * TrialBanner paterni reuse).
 *
 * Pulse design: graphite + lime accent (CLAUDE.md §11). Bottom-sheet
 * pattern (sticky, mobile-first, safe-area aware).
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cookie, X, Check } from 'lucide-react';

const STORAGE_KEY = 'bz_cookie_consent';
const STORAGE_VERSION = 1;

export interface CookieConsentState {
  version: number;
  essential: true;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string;
}

export function readCookieConsent(): CookieConsentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== STORAGE_VERSION) return null;
    return {
      version: STORAGE_VERSION,
      essential: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
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
  locale: 'tr' | 'en';
}

export default function CookieConsentBanner({ locale }: CookieConsentBannerProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
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
    const existing = readCookieConsent();
    if (!existing) {
      setVisible(true);
    } else {
      setAnalytics(existing.analytics);
      setMarketing(existing.marketing);
    }
  }, []);

  if (!mounted || !visible) return null;

  const acceptAll = () => {
    writeCookieConsent({ analytics: true, marketing: true });
    setVisible(false);
  };
  const onlyEssential = () => {
    writeCookieConsent({ analytics: false, marketing: false });
    setVisible(false);
  };
  const saveCustom = () => {
    writeCookieConsent({ analytics, marketing });
    setShowCustomize(false);
    setVisible(false);
  };

  return (
    <>
      {/* Bottom-sheet banner */}
      <div
        role="region"
        aria-label={isTr ? 'Çerez tercih bannerı' : 'Cookie preference banner'}
        className="fixed bottom-0 left-0 right-0 z-[100] border-t border-[#EDEDED] bg-white shadow-[0_-8px_32px_rgba(10,10,10,0.08)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto max-w-[1100px] px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex flex-col gap-3.5 sm:flex-row sm:items-start sm:gap-5">
            <div className="flex shrink-0 items-start gap-2.5 sm:items-center">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF9B8] text-[#0A0A0A]">
                <Cookie size={18} strokeWidth={2} />
              </span>
              <div className="sm:hidden">
                <p className="text-[14px] font-semibold text-[#0A0A0A]">
                  {isTr ? 'Çerez tercihleri' : 'Cookie preferences'}
                </p>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="hidden sm:block text-[14px] font-semibold text-[#0A0A0A] mb-1">
                {isTr ? 'Çerez tercihleri' : 'Cookie preferences'}
              </p>
              <p className="text-[12.5px] leading-[1.55] text-[#525252]">
                {isTr ? (
                  <>
                    Sitemizin çalışması için zorunlu çerezleri kullanırız. Analitik
                    ve pazarlama çerezleri yalnızca senin onayınla aktif olur.
                    Detaylar için{' '}
                    <Link href={`/${locale}/legal/cerez-politikasi`} className="font-semibold text-[#0A0A0A] underline-offset-2 hover:underline">
                      Çerez Politikası
                    </Link>
                    &apos;na bakabilirsin.
                  </>
                ) : (
                  <>
                    We use essential cookies to make our site work. Analytics and
                    marketing cookies are only active with your consent. See our{' '}
                    <Link href={`/${locale}/legal/cerez-politikasi`} className="font-semibold text-[#0A0A0A] underline-offset-2 hover:underline">
                      Cookie Policy
                    </Link>{' '}
                    for details.
                  </>
                )}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-nowrap">
              <button
                type="button"
                onClick={() => setShowCustomize(true)}
                className="rounded-full border border-[#EDEDED] bg-white px-3.5 py-2 text-[12px] font-medium text-[#0A0A0A] hover:bg-[#FAFAFA]"
              >
                {isTr ? 'Kişiselleştir' : 'Customize'}
              </button>
              <button
                type="button"
                onClick={onlyEssential}
                className="rounded-full border border-[#EDEDED] bg-white px-3.5 py-2 text-[12px] font-medium text-[#0A0A0A] hover:bg-[#FAFAFA]"
              >
                {isTr ? 'Sadece zorunlu' : 'Only essential'}
              </button>
              <button
                type="button"
                onClick={acceptAll}
                className="rounded-full bg-[#0A0A0A] px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-[#1A1A1A]"
              >
                {isTr ? 'Tümünü kabul et' : 'Accept all'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Customize modal */}
      {showCustomize ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-customize-title"
          className="fixed inset-0 z-[101] flex items-end justify-center bg-black/50 sm:items-center"
          onClick={() => setShowCustomize(false)}
        >
          <div
            className="w-full max-w-[480px] rounded-t-2xl bg-white p-5 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 id="cookie-customize-title" className="text-[16px] font-semibold text-[#0A0A0A]">
                {isTr ? 'Çerez tercihlerini kişiselleştir' : 'Customize cookie preferences'}
              </h2>
              <button
                type="button"
                onClick={() => setShowCustomize(false)}
                aria-label={isTr ? 'Kapat' : 'Close'}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#737373] hover:bg-[#FAFAFA]"
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            <div className="space-y-3">
              <CategoryRow
                label={isTr ? 'Zorunlu' : 'Essential'}
                description={
                  isTr
                    ? 'Oturum açma, güvenlik ve form gönderimi için gerekli. Devre dışı bırakılamaz.'
                    : 'Required for login, security and form submission. Cannot be disabled.'
                }
                checked={true}
                disabled
                onChange={() => {}}
              />
              <CategoryRow
                label={isTr ? 'Analitik' : 'Analytics'}
                description={
                  isTr
                    ? 'Anonim ziyaret istatistikleri (Google Analytics, Yandex Metrica). Hangi sayfaların kullanıldığını anlamamızı sağlar.'
                    : 'Anonymous visit statistics (Google Analytics, Yandex Metrica). Helps us understand which pages are used.'
                }
                checked={analytics}
                onChange={(v) => setAnalytics(v)}
              />
              <CategoryRow
                label={isTr ? 'Pazarlama' : 'Marketing'}
                description={
                  isTr
                    ? 'Reklam ölçümü ve kişiselleştirme (şu anda kullanılmıyor; ileride aktive edilebilir).'
                    : 'Advertising measurement and personalization (not currently used; may be enabled later).'
                }
                checked={marketing}
                onChange={(v) => setMarketing(v)}
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCustomize(false)}
                className="rounded-full border border-[#EDEDED] bg-white px-3.5 py-2 text-[12px] font-medium text-[#0A0A0A] hover:bg-[#FAFAFA]"
              >
                {isTr ? 'Vazgeç' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={saveCustom}
                className="rounded-full bg-[#0A0A0A] px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-[#1A1A1A]"
              >
                {isTr ? 'Tercihlerimi kaydet' : 'Save preferences'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function CategoryRow({
  label,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className={`flex items-start gap-3 rounded-xl border border-[#EDEDED] p-3 ${disabled ? 'opacity-80' : 'cursor-pointer hover:bg-[#FAFAFA]'}`}>
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
          checked ? 'border-[#0A0A0A] bg-[#0A0A0A]' : 'border-[#A3A3A3] bg-white'
        }`}
      >
        {checked ? <Check size={12} strokeWidth={3} className="text-[#C6F24E]" /> : null}
      </span>
      <span className="flex-1">
        <span className="block text-[13px] font-semibold text-[#0A0A0A]">{label}</span>
        <span className="mt-0.5 block text-[11.5px] leading-[1.5] text-[#525252]">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
        aria-label={label}
      />
    </label>
  );
}
