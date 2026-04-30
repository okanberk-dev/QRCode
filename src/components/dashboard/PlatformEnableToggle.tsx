'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Toggle } from '@/components/ui';

type PlatformKey =
  | 'google'
  | 'yemekSepeti'
  | 'getir'
  | 'trendyol'
  | 'tripAdvisor'
  | 'airbnb'
  | 'booking'
  | 'yandex';

const FIELD_NAME: Record<PlatformKey, string> = {
  google: 'googleEnabled',
  yemekSepeti: 'yemekSepetiEnabled',
  getir: 'getirEnabled',
  trendyol: 'trendyolEnabled',
  tripAdvisor: 'tripAdvisorEnabled',
  airbnb: 'airbnbEnabled',
  booking: 'bookingEnabled',
  yandex: 'yandexEnabled',
};

interface Props {
  restaurantId: string;
  platformKey: PlatformKey;
  initialEnabled: boolean;
  hasUrl: boolean;
  ariaLabel?: string;
}

/**
 * Per-platform enable toggle for owner panel `/[locale]/dashboard/platforms`.
 *
 * Backend contract: PUT /api/restaurants/[id] accepts { googleEnabled |
 * yemekSepetiEnabled | getirEnabled | trendyolEnabled } booleans (Step 6).
 *
 * UX: optimistic state flip on click; on failure, reverts. When the platform
 * has no URL configured, the toggle is disabled (URL is the gating factor —
 * toggle off without URL is meaningless).
 */
export default function PlatformEnableToggle({
  restaurantId,
  platformKey,
  initialEnabled,
  hasUrl,
  ariaLabel,
}: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();

  const handleChange = async (next: boolean) => {
    if (!hasUrl) return;
    const prev = enabled;
    setEnabled(next); // optimistic
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [FIELD_NAME[platformKey]]: next }),
      });
      if (!res.ok) {
        setEnabled(prev);
        return;
      }
      // Revalidate server data (default redirect picker depends on enabled
      // platforms, monthly clicks, etc.).
      startTransition(() => router.refresh());
    } catch {
      setEnabled(prev);
    }
  };

  return (
    <Toggle
      checked={enabled && hasUrl}
      onChange={handleChange}
      disabled={!hasUrl || pending}
      ariaLabel={ariaLabel}
    />
  );
}
