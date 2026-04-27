'use client';

import { useState, useTransition } from 'react';
import { AlertTriangle, Check, Loader2 } from 'lucide-react';
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

// Reverse map: stored value → display label. Used for the orphan warning when
// a stored default refers to a platform whose URL has been cleared since.
const STORAGE_LABEL: Record<string, string> = {
  google: 'Google',
  yemeksepeti: 'Yemeksepeti',
  getir: 'Getir',
  trendyol_go: 'Trendyol GO',
  tripadvisor: 'Tripadvisor',
  foursquare: 'Foursquare',
  custom: 'Custom',
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

  const persistDefault = (next: string | null, uiKey: PlatformId | null) => {
    const previous = selected;
    setSelected(next); // optimistic
    setPendingId(uiKey);
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/restaurants/${restaurantId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ defaultRedirectPlatform: next }),
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

  const handleSelect = (uiKey: PlatformId) => {
    const storageValue = STORAGE_VALUE[uiKey];
    if (selected === storageValue) return; // no-op
    persistDefault(storageValue, uiKey);
  };

  // Detect orphan default: the stored value refers to a platform whose URL
  // has been cleared since (so it's not in `enabledPlatforms` anymore). In
  // that case, the public review surface silently falls back to Google —
  // which the owner has no way to discover unless we surface it here.
  const enabledStorageValues = enabledPlatforms.map((id) => STORAGE_VALUE[id]);
  const isOrphan =
    selected !== null && selected !== '' && !enabledStorageValues.includes(selected);
  const orphanLabel = isOrphan ? STORAGE_LABEL[selected] || selected : null;

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
      {/* Orphan default warning — stored platform's URL was cleared since the
          default was set. Surfaced as actionable amber notice so the owner
          can either re-add the URL or pick a new default. */}
      {isOrphan && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2.5 rounded-[12px] px-3 py-2.5"
          style={{
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            color: '#92400E',
          }}
        >
          <AlertTriangle size={14} strokeWidth={2.25} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="text-[12px] font-semibold leading-tight">
              {isTr
                ? `Varsayılan "${orphanLabel}" — URL'i boş`
                : `Default "${orphanLabel}" — URL is empty`}
            </div>
            <div className="text-[11px] leading-snug mt-0.5" style={{ color: '#78350F' }}>
              {isTr
                ? 'Bu platformun bağlantısı kaldırılmış. Yüksek puanlı yorumlar şu an Google\'a düşüyor. URL\'i geri ekleyin ya da varsayılanı temizleyin.'
                : "This platform's URL was removed. High-rated reviews now fall back to Google. Re-add the URL or clear the default."}
            </div>
            <button
              type="button"
              onClick={() => persistDefault(null, null)}
              disabled={isPending}
              className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold underline disabled:opacity-50"
              style={{ color: '#92400E' }}
            >
              {isTr ? 'Varsayılanı temizle' : 'Clear default'}
            </button>
          </div>
        </div>
      )}
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
