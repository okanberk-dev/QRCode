'use client';

/**
 * Stage 31b §38.108 — Cookie consent-aware GA + Yandex Metrica loader.
 *
 * Eski state (`src/app/layout.tsx`): GA + Yandex `Script strategy="lazyOnload"`
 * koşulsuz mount edilirdi → çerez onayı verilmemiş kullanıcı için bile
 * tracking yüklendi. KVKK Çerez Kurulu kararı + ePrivacy Direktifi opt-in
 * model gerektirir.
 *
 * Yeni state: bu component `bz_cookie_consent` localStorage state'ini
 * okur (CookieConsentBanner tarafından yazılır). `analytics: true` ise
 * Script'leri inject eder; aksi halde no-op. `bz:cookie-consent-changed`
 * window event'i ile reactive — kullanıcı banner'da "Tümünü kabul"
 * tıkladığında script'ler aynı sayfa render'ında yüklenir.
 *
 * SSR-safe: useState mount sonrası check (hydration mismatch yok).
 */

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { readCookieConsent, type CookieConsentState } from './cookie-consent-storage';

const GA_MEASUREMENT_ID = 'G-Y1H5FLYZ9R';
const YM_ID = 108768887;

export default function ConditionalAnalytics() {
  const [consent, setConsent] = useState<CookieConsentState | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setConsent(readCookieConsent());
    function onConsentChanged(e: Event) {
      const detail = (e as CustomEvent<CookieConsentState>).detail;
      setConsent(detail ?? readCookieConsent());
    }
    window.addEventListener('bz:cookie-consent-changed', onConsentChanged);
    return () => window.removeEventListener('bz:cookie-consent-changed', onConsentChanged);
  }, []);

  if (!mounted || !consent?.analytics) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="lazyOnload"
      />
      <Script id="google-analytics" strategy="lazyOnload">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
      <Script id="yandex-metrica" strategy="lazyOnload">
        {`
          (function(m,e,t,r,i,k,a){
            m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
          })(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=${YM_ID}','ym');
          ym(${YM_ID},'init',{ssr:true,webvisor:false,clickmap:true,ecommerce:"dataLayer",accurateTrackBounce:true,trackLinks:true});
        `}
      </Script>
    </>
  );
}
