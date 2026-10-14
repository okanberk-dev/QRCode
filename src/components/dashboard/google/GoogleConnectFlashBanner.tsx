'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
 * The message is captured into state BEFORE the query parameter is stripped.
 * Reading it from the live URL on every render made the banner vanish the moment
 * `router.replace` finished (the parameter was gone, so the status resolved to
 * nothing), i.e. the owner saw it for a few frames at best.
 */

interface Flash {
  kind: OwnerGoogleTone;
  message: string;
}

interface GoogleConnectFlashBannerProps {
  locale: 'tr' | 'en';
}

export function GoogleConnectFlashBanner({ locale }: GoogleConnectFlashBannerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const raw = searchParams.get('google');
  const [flash, setFlash] = useState<Flash | null>(null);

  useEffect(() => {
    if (!raw) return;
    setFlash(ownerGoogleFlash(raw, locale));
    // Strip the parameter so a refresh does not flash again and the browser's
    // back button does not replay the message.
    const params = new URLSearchParams(searchParams.toString());
    params.delete('google');
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    // `searchParams` and `router` change identity on navigation; depending on
    // them would re-run this after our own replace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
