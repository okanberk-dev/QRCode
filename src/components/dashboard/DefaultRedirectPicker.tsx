'use client';

import { useState, useTransition } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { PlatformChip, PLATFORMS, type PlatformId } from '@/components/ui';

// Maps the UI platform key (used by `<PlatformChip>` and the Pulse design
// vocabulary) to the value stored in `Restaurant.defaultRedirectPlatform`
// — which mirrors `Feedback.platform` (CLAUDE.md §5).
const STORAGE_VALUE: Record<PlatformId, string> = {
  google: 'google',
  yemeksepeti: 'yemeksepeti',
  getir: 'getir',
  trendyol: 'trendyol_go',
  trendyol_go: 'trendyol_go',
  tripadvisor: 'tripadvisor',
  foursquare: 'foursquare',
  custom: 'custom',
};

interface DefaultRedirectPickerProps {
  restaurantId: string;
  enabledPlatforms: PlatformId[];
  /** Initial selection. NULL → no default chosen yet (Google fallback). */
  initialValue: string | null;
  locale: 'tr' | 'en';
}

export default function DefaultRedirectPicker({
  restaurantId,
  enabledPlatforms,
  initialValue,
  locale,
}: DefaultRedirectPickerProps) {
  const isTr = locale === 'tr';
  const [selected, setSelected] = useState<string | null>(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<PlatformId | null>(null);

  const handleSelect = (uiKey: PlatformId) => {
    const storageValue = STORAGE_VALUE[uiKey];
    if (selected === storageValue) return; // no-op
    const previous = selected;
    setSelected(storageValue); // optimistic
    setPendingId(uiKey);
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/restaurants/${restaurantId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ defaultRedirectPlatform: storageValue }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(
            data?.error ||
              (isTr ? 'Varsayılan kaydedilemedi.' : 'Could not save default.'),
          );
          setSelected(previous); // revert
        }
      } catch {
        setError(isTr ? 'Bağlantı hatası.' : 'Connection error.');
        setSelected(previous);
      } finally {
        setPendingId(null);
      }
    });
  };

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {enabledPlatforms.length === 0 ? (
          <span style={{ fontSize: 12, color: '#737373' }}>
            {isTr
              ? 'Henüz platform bağlantısı yok. Aşağıdan en az birini etkinleştir.'
              : 'No platforms connected yet. Enable at least one below.'}
          </span>
        ) : (
          enabledPlatforms.map((uiKey) => {
            const storageValue = STORAGE_VALUE[uiKey];
            const isDefault = selected === storageValue;
            const loading = pendingId === uiKey && isPending;
            return (
              <button
                key={uiKey}
                type="button"
                onClick={() => handleSelect(uiKey)}
                disabled={isPending}
                aria-pressed={isDefault}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full transition-colors text-[13px] font-medium disabled:cursor-not-allowed"
                style={{
                  border: `1px solid ${isDefault ? '#0A0A0A' : '#EDEDED'}`,
                  background: isDefault ? '#0A0A0A' : '#fff',
                  color: isDefault ? '#fff' : '#0A0A0A',
                  opacity: isPending && !loading ? 0.5 : 1,
                }}
              >
                <PlatformChip id={uiKey} size={18} />
                {PLATFORMS[uiKey].label}
                {loading ? (
                  <Loader2 size={12} strokeWidth={2.5} color="#C6F24E" className="animate-spin" />
                ) : isDefault ? (
                  <Check size={12} strokeWidth={2.5} color="#C6F24E" />
                ) : null}
              </button>
            );
          })
        )}
      </div>
      {error && (
        <p
          role="alert"
          className="mt-2 text-[12px] font-medium"
          style={{ color: '#991B1B' }}
        >
          {error}
        </p>
      )}
    </>
  );
}
