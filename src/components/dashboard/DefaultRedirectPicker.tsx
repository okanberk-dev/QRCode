'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
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
  airbnb: 'airbnb',
  booking: 'booking',
  yandex: 'yandex',
  foursquare: 'foursquare',
  yelp: 'yelp',
  trustpilot: 'trustpilot',
  zomato: 'zomato',
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
  airbnb: 'Airbnb',
  booking: 'Booking',
  yandex: 'Yandex',
  foursquare: 'Foursquare',
  yelp: 'Yelp',
  trustpilot: 'Trustpilot',
  zomato: 'Zomato',
  custom: 'Custom',
};

const SAVED_NOTICE_MS = 2500;

interface DefaultRedirectPickerProps {
  restaurantId: string;
  enabledPlatforms: PlatformId[];
  /** Initial selection. NULL → no default chosen yet (Google fallback). */
  initialValue: string | null;
  locale: 'tr' | 'en';
  /** Fires after a successful PUT so the parent can keep its row in sync. */
  onSaved?: (next: string | null) => void;
}

export default function DefaultRedirectPicker({
  restaurantId,
  enabledPlatforms,
  initialValue,
  locale,
  onSaved,
}: DefaultRedirectPickerProps) {
  const isTr = locale === 'tr';
  const [selected, setSelected] = useState<string | null>(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<PlatformId | null>(null);
  const savedTimer = useRef<number | null>(null);

  // Controlled resync — parent rows change after a save elsewhere on the page
  // (e.g. the URL of the default platform was just cleared). The previous
  // version only read `initialValue` once and relied on a composite `key`
  // remount from the caller.
  useEffect(() => {
    setSelected(initialValue);
  }, [initialValue]);

  useEffect(
    () => () => {
      if (savedTimer.current) window.clearTimeout(savedTimer.current);
    },
    [],
  );

  const flashSaved = () => {
    setSaved(true);
    if (savedTimer.current) window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setSaved(false), SAVED_NOTICE_MS);
  };

  const persistDefault = (next: string | null, uiKey: PlatformId | null) => {
    const previous = selected;
    setSelected(next); // optimistic
    setPendingId(uiKey);
    setError(null);
    setSaved(false);

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
          return;
        }
        onSaved?.(next);
        flashSaved();
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

  // Detect orphan default: the stored value refers to a platform that is no
  // longer usable (URL cleared, toggle switched off, or entitlement locked)
  // so it isn't in `enabledPlatforms` anymore. In that case the public
  // review surface silently falls back to Google — which the owner has no
  // way to discover unless we surface it here.
  const enabledStorageValues = enabledPlatforms.map((id) => STORAGE_VALUE[id]);
  const isOrphan =
    selected !== null && selected !== '' && !enabledStorageValues.includes(selected);
  const orphanLabel = isOrphan ? STORAGE_LABEL[selected] || selected : null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {enabledPlatforms.length === 0 ? (
          <span className="text-[12px] text-[#737373]">
            {isTr
              ? 'Henüz aktif platform bağlantısı yok. Önce bir yorum platformunun URL\'ini kaydedip etkinleştir.'
              : 'No active platform links yet. Save and enable a review platform URL first.'}
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
                className="inline-flex min-h-[40px] items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 disabled:cursor-wait"
                style={{
                  border: `1px solid ${isDefault ? '#0A0A0A' : '#EDEDED'}`,
                  background: isDefault ? '#0A0A0A' : '#fff',
                  color: isDefault ? '#fff' : '#0A0A0A',
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
        <span
          role="status"
          aria-live="polite"
          className={`inline-flex items-center gap-1 text-[12px] font-medium text-[#166534] transition-opacity ${
            saved ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Check size={12} strokeWidth={2.5} />
          {isTr ? 'Kaydedildi' : 'Saved'}
        </span>
      </div>
      {/* Orphan default warning — stored platform is no longer usable
          (URL removed / toggle off / locked). Surfaced as actionable amber
          notice so the owner can either re-enable it or pick a new default. */}
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
                ? `Varsayılan "${orphanLabel}" şu an kullanılamıyor`
                : `Default "${orphanLabel}" is currently unusable`}
            </div>
            <div className="mt-0.5 text-[11px] leading-snug" style={{ color: '#78350F' }}>
              {isTr
                ? 'Bu platformun bağlantısı kaldırılmış ya da pasif. Yüksek puanlı yorumlar şu an Google\'a düşüyor. URL\'i geri ekleyip etkinleştir ya da başka bir varsayılan seç.'
                : "This platform's link was removed or switched off. High-rated reviews now fall back to Google. Re-add and enable the URL, or pick another default."}
            </div>
            <button
              type="button"
              onClick={() => persistDefault(null, null)}
              disabled={isPending}
              className="mt-1.5 inline-flex min-h-[32px] items-center gap-1.5 text-[11px] font-semibold underline disabled:opacity-50"
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
