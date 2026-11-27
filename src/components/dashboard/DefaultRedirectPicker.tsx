'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { AlertTriangle, Check, Loader2, Sparkles } from 'lucide-react';
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
  /** Initial selection. NULL → "Otomatik" (resolver walks the sector chain). */
  initialValue: string | null;
  locale: 'tr' | 'en';
  /** Fires after a successful PUT so the parent can keep its row in sync. */
  onSaved?: (next: string | null) => void;
  /** Id of a visible label element — names the chip group for AT. */
  labelId?: string;
}

const AUTO_KEY = 'auto' as const;

// Fintora choice pills: borderless, grey when idle (white on the grey phone
// cards — the canvas token flips there), purple with white text when picked.
const CHIP_CLASS =
  'inline-flex min-h-[44px] items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-[14px] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2 aria-disabled:cursor-wait';
const CHIP_IDLE = 'bg-pn-canvas text-pn-ink hover:bg-[#EDEDED]';
const CHIP_ON = 'bg-pn-accent text-white';
// Round slot on the left of each pill (icon / logo).
const CHIP_ICON =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full';

export default function DefaultRedirectPicker({
  restaurantId,
  enabledPlatforms,
  initialValue,
  locale,
  onSaved,
  labelId,
}: DefaultRedirectPickerProps) {
  const isTr = locale === 'tr';
  const [selected, setSelected] = useState<string | null>(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<PlatformId | typeof AUTO_KEY | null>(null);
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

  const persistDefault = (next: string | null, uiKey: PlatformId | typeof AUTO_KEY | null) => {
    if (isPending) return;
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

  const isAutomatic = selected === null || selected === '';
  const handleAutomatic = () => {
    if (isAutomatic) return;
    persistDefault(null, AUTO_KEY);
  };

  // Detect orphan default: the stored value refers to a platform that is no
  // longer usable (URL cleared, toggle switched off, or entitlement locked)
  // so it isn't in `enabledPlatforms` anymore. In that case the public
  // resolver silently moves on to the next usable platform of the sector
  // chain — which the owner has no way to discover unless we surface it here.
  const enabledStorageValues = enabledPlatforms.map((id) => STORAGE_VALUE[id]);
  const isOrphan =
    selected !== null && selected !== '' && !enabledStorageValues.includes(selected);
  const orphanLabel = isOrphan ? STORAGE_LABEL[selected] || selected : null;

  return (
    <>
      <div
        role="group"
        aria-labelledby={labelId}
        aria-label={labelId ? undefined : isTr ? 'Varsayılan platform' : 'Default platform'}
        className="flex flex-wrap items-center gap-2"
      >
        <button
          type="button"
          onClick={handleAutomatic}
          aria-disabled={isPending || undefined}
          aria-pressed={isAutomatic}
          className={`${CHIP_CLASS} ${isAutomatic ? CHIP_ON : CHIP_IDLE}`}
        >
          <span
            aria-hidden="true"
            className={`${CHIP_ICON} ${isAutomatic ? 'bg-white/20 text-white' : 'bg-white text-pn-accent max-sm:bg-[#F6F6F6]'}`}
          >
            <Sparkles size={15} />
          </span>
          {isTr ? 'Otomatik' : 'Automatic'}
          {pendingId === AUTO_KEY && isPending ? (
            <Loader2 size={12} strokeWidth={2.5} color="#FFFFFF" className="animate-spin" aria-hidden="true" />
          ) : isAutomatic ? (
            <Check size={12} strokeWidth={2.5} color="#FFFFFF" aria-hidden="true" />
          ) : null}
        </button>
        {enabledPlatforms.map((uiKey) => {
          const storageValue = STORAGE_VALUE[uiKey];
          const isDefault = selected === storageValue;
          const loading = pendingId === uiKey && isPending;
          return (
            <button
              key={uiKey}
              type="button"
              onClick={() => handleSelect(uiKey)}
              aria-disabled={isPending || undefined}
              aria-pressed={isDefault}
              className={`${CHIP_CLASS} ${isDefault ? CHIP_ON : CHIP_IDLE}`}
            >
              <span aria-hidden="true" className={`${CHIP_ICON} bg-white`}>
                <PlatformChip id={uiKey} size={20} />
              </span>
              {PLATFORMS[uiKey].label}
              {loading ? (
                <Loader2 size={12} strokeWidth={2.5} color="#FFFFFF" className="animate-spin" aria-hidden="true" />
              ) : isDefault ? (
                <Check size={12} strokeWidth={2.5} color="#FFFFFF" aria-hidden="true" />
              ) : null}
            </button>
          );
        })}
        <span
          role="status"
          aria-live="polite"
          className={`inline-flex items-center gap-1 text-[13px] font-medium text-[#1F6B32] transition-opacity ${
            saved ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Check size={12} strokeWidth={2.5} aria-hidden="true" />
          {saved ? (isTr ? 'Kaydedildi' : 'Saved') : ''}
        </span>
      </div>
      <p className="mt-3 text-[13px] leading-[1.5] text-[#737373]">
        {isTr
          ? 'Otomatik: bağlı platformlar arasından sektörünüze en uygun olan seçilir.'
          : 'Automatic: picks the best-matching connected platform for your sector.'}
      </p>
      {enabledPlatforms.length === 0 && (
        <p className="mt-1.5 text-[13px] leading-[1.5] text-[#737373]">
          {isTr
            ? 'Henüz aktif bir yorum platformu linki yok. Önce yukarıdan bir platform linki ekleyin.'
            : 'No active review-platform link yet. Add a platform link above first.'}
        </p>
      )}
      {/* Orphan default warning — stored platform is no longer usable
          (URL removed / toggle off / locked). Surfaced as actionable amber
          notice so the owner can either re-enable it or pick a new default. */}
      {isOrphan && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-3 rounded-[18px] bg-[#FFF6DB] px-4 py-3 text-[#7A4F00]"
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <div className="text-[14px] font-medium leading-tight">
              {isTr
                ? `Varsayılan "${orphanLabel}" şu an kullanılamıyor`
                : `Default "${orphanLabel}" is currently unusable`}
            </div>
            <div className="mt-1 text-[13px] leading-snug text-[#6B4300]">
              {isTr
                ? 'Bu platformun linki kaldırılmış ya da kapalı. Yüksek puanlı müşteriler şu an otomatik olarak sıradaki bağlı platforma yönlendiriliyor. Linki yeniden ekleyin ya da başka bir varsayılan seçin.'
                : "This platform's link was removed or switched off. High-rated customers are currently routed automatically to the next connected platform. Re-add the link or pick another default."}
            </div>
            <button
              type="button"
              onClick={() => persistDefault(null, AUTO_KEY)}
              disabled={isPending}
              className="mt-2.5 inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-medium text-[#7A4F00] transition-colors hover:bg-[#FFFBEF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent disabled:opacity-50"
            >
              {isTr ? 'Otomatik seçime dön' : 'Switch to automatic'}
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-[13px] font-medium text-[#C4271B]">
          {error}
        </p>
      )}
    </>
  );
}
