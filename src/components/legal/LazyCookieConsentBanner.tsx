'use client';

import dynamic from 'next/dynamic';

// The banner renders nothing on the server (it decides after reading
// localStorage on mount), so loading it client-only changes nothing visually
// while keeping its ~560 lines of UI out of every page's first bundle.
const CookieConsentBanner = dynamic(() => import('./CookieConsentBanner'), { ssr: false });

export default function LazyCookieConsentBanner() {
  return <CookieConsentBanner />;
}
