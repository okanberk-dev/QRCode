'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { AlertBanner } from '@/components/ui';
import { ownerGoogleFlash, type OwnerGoogleTone } from '@/lib/google-owner-copy';
import { BANNER_TOUCH_CLS } from './places-client';

/**
 * Flash banner for the `?google=<status>` query the Google sign-in callback
 * (`/api/integrations/google/callback`) appends to the page it returns to.
 *
 * Mounted on the pages that can be that return target: dashboard/account (the
 * default), dashboard/google-reviews and the platform settings panel.
 *
 * Copy is never typed here. `ownerGoogleFlash` maps the machine status to
 * owner-safe text (no developer vocabulary), and an unknown or `error:<reason>`
 * status becomes the generic message: the raw reason is never echoed into the
 * page.
 *
 * Two timing rules (both were real bugs):
 * - The message is captured into state, so it survives the parameter being
 *   stripped. Reading it from the live URL on every render made the banner
 *   vanish the moment the URL changed.
 * - The state starts from the FIRST render's status instead of being set in an
 *   effect. An update scheduled in the same effect as a `router.replace` was
 *   held back until that navigation finished (about 650 ms on a dev server,
 *   longer on a slow connection), so the owner saw the page first and the
 *   result of their sign-in much later. The parameter is stripped with
 *   `history.replaceState`, which Next.js syncs into `useSearchParams` without
 *   a server round trip.
 */

interface Flash {
  kind: OwnerGoogleTone;
  message: string;
}

interface GoogleConnectFlashBannerProps {
  locale: 'tr' | 'en';
}

export function GoogleConnectFlashBanner({ locale }: GoogleConnectFlashBannerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const raw = searchParams.get('google');
  const [flash, setFlash] = useState<Flash | null>(() => ownerGoogleFlash(raw, locale));
  // The status the banner already shows, so a re-run of the effect (React
  // StrictMode, a locale switch) does not set the same message twice.
  const shownRef = useRef<string | null>(raw);

  useEffect(() => {
    if (!raw) return;
    // A different status arriving while the page stays mounted.
    if (shownRef.current !== raw) {
      shownRef.current = raw;
      setFlash(ownerGoogleFlash(raw, locale));
    }
    // Strip the parameter so a refresh does not flash again and the browser's
    // back button does not replay the message. `null` state is the documented
    // form: Next.js copies its own history state into the entry.
    const params = new URLSearchParams(window.location.search);
    params.delete('google');
    const next = params.toString();
    window.history.replaceState(null, '', next ? `${pathname}?${next}` : pathname);
  }, [raw, locale, pathname]);

  if (!flash) return null;

  return (
    <div className="mb-4">
      <AlertBanner kind={flash.kind} onDismiss={() => setFlash(null)} className={BANNER_TOUCH_CLS}>
        {flash.message}
      </AlertBanner>
    </div>
  );
}

export default GoogleConnectFlashBanner;
