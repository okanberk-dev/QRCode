'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useOptimistic, useState, useTransition } from 'react';
import { Modal, PLATFORMS, PulseSelect, type PlatformId } from '@/components/ui';
import { Calendar, Loader2, RotateCcw } from 'lucide-react';

/**
 * URL-synced filter toolbar for the owner analytics page.
 * State (range/platform/branch/custom) lives in the URL; the server page
 * parses it and runs the queries. This component only renders the controls
 * and writes the URL.
 *
 * §49 — one toolbar: period (7G/30G/90G/1Y + custom range as the last
 * segment), platform and branch as compact selects, reset at the end. The
 * business scope comes from the shell's business switcher (`?restaurantId`),
 * so there is no business picker here; the CSV export lives in the page
 * header.
 */

type RangeId = '7d' | '30d' | '90d' | '1y';

const RANGES: Array<{ id: RangeId; tr: string; en: string; trLong: string; enLong: string }> = [
  { id: '7d', tr: '7G', en: '7D', trLong: 'Son 7 gün', enLong: 'Last 7 days' },
  { id: '30d', tr: '30G', en: '30D', trLong: 'Son 30 gün', enLong: 'Last 30 days' },
  { id: '90d', tr: '90G', en: '90D', trLong: 'Son 90 gün', enLong: 'Last 90 days' },
  { id: '1y', tr: '1Y', en: '1Y', trLong: 'Son 12 ay', enLong: 'Last 12 months' },
];

const PLATFORM_OPTIONS: PlatformId[] = [
  'google',
  'yemeksepeti',
  'getir',
  'trendyol_go',
  'tripadvisor',
];

const MAX_CUSTOM_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

interface Props {
  isTr: boolean;
  branches?: string[];
}

/** "2026-10-12" → "12 Eki" / "Oct 12" (UTC — the value is a calendar date). */
function shortDate(iso: string, isTr: boolean): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  return new Intl.DateTimeFormat(isTr ? 'tr-TR' : 'en-US', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(ms));
}

function customRangeError(start: string, end: string, isTr: boolean): string | null {
  if (!start || !end) return null;
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return null;
  if (endMs <= startMs) {
    return isTr
      ? 'Bitiş tarihi başlangıçtan sonra olmalı.'
      : 'End date must be after the start date.';
  }
  if (Math.round((endMs - startMs) / DAY_MS) > MAX_CUSTOM_DAYS) {
    return isTr
      ? `En fazla ${MAX_CUSTOM_DAYS} günlük aralık seçebilirsin.`
      : `Pick a range of ${MAX_CUSTOM_DAYS} days or less.`;
  }
  return null;
}

export default function AnalyticsFilterBar({ isTr, branches }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  // The URL only changes once the server render finishes; reflect the click
  // immediately so the pressed segment / select value does not lag behind.
  const [query, setOptimisticQuery] = useOptimistic(params.toString());
  const current = new URLSearchParams(query);

  const range = (current.get('range') as RangeId | 'custom' | null) ?? '30d';
  const platform = current.get('platform') ?? 'all';
  const branch = current.get('branch') ?? 'all';
  const customStart = current.get('customStart') ?? '';
  const customEnd = current.get('customEnd') ?? '';

  // `restaurantId` is the shell's business scope (the business switcher
  // always writes it on this page), not a filter — it must not keep
  // "Temizle" visible, and resetting must not drop it.
  const hasActiveFilter = range !== '30d' || platform !== 'all' || branch !== 'all';

  const navigate = (next: URLSearchParams) => {
    const qs = next.toString();
    startTransition(() => {
      setOptimisticQuery(qs);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  const updateMany = (entries: Array<[string, string | null]>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of entries) {
      if (value && value !== 'all') next.set(key, value);
      else next.delete(key);
    }
    navigate(next);
  };

  const reset = () => {
    const next = new URLSearchParams();
    const scoped = params.get('restaurantId');
    if (scoped) next.set('restaurantId', scoped);
    navigate(next);
  };

  // Custom range dialog (Modal primitive: focus trap, ESC, scroll lock).
  const [customOpen, setCustomOpen] = useState(false);
  const [draftStart, setDraftStart] = useState(customStart);
  const [draftEnd, setDraftEnd] = useState(customEnd);

  useEffect(() => {
    setDraftStart(customStart);
    setDraftEnd(customEnd);
  }, [customStart, customEnd]);

  const draftError = customRangeError(draftStart, draftEnd, isTr);
  const canApply = !!draftStart && !!draftEnd && !draftError;

  const applyCustom = () => {
    if (!canApply) return;
    updateMany([
      ['range', 'custom'],
      ['customStart', draftStart],
      ['customEnd', draftEnd],
    ]);
    setCustomOpen(false);
  };

  const clearCustom = () => {
    updateMany([
      ['range', null],
      ['customStart', null],
      ['customEnd', null],
    ]);
    setCustomOpen(false);
  };

  const customActive = range === 'custom' && !!customStart && !!customEnd;
  const customLabel = customActive
    ? `${shortDate(customStart, isTr)} – ${shortDate(customEnd, isTr)}`
    : isTr
      ? 'Özel'
      : 'Custom';

  const segmentClass = (active: boolean) =>
    `inline-flex min-h-[44px] items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent sm:h-[28px] sm:min-h-0 sm:text-[12px] ${
      active ? 'bg-pn-accent text-white' : 'text-[#525252] hover:bg-pn-canvas hover:text-pn-ink'
    }`;

  const showBranches = !!branches && branches.length > 0;

  return (
    <div
      role="group"
      aria-label={isTr ? 'Analitik filtreleri' : 'Analytics filters'}
      aria-busy={pending}
      className="flex flex-wrap items-center gap-2"
    >
      {/* Period — presets + custom range in one segmented control. */}
      <div
        className="flex w-full flex-wrap items-center gap-0.5 rounded-full border border-pn-line bg-white p-0.5 sm:inline-flex sm:w-auto sm:flex-nowrap"
        role="group"
        aria-label={isTr ? 'Dönem' : 'Period'}
      >
        {RANGES.map((r) => {
          const active = range === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                updateMany([
                  ['range', r.id === '30d' ? null : r.id],
                  ['customStart', null],
                  ['customEnd', null],
                ]);
              }}
              className={`${segmentClass(active)} min-w-[44px] flex-1 sm:flex-none`}
              aria-pressed={active}
              title={isTr ? r.trLong : r.enLong}
            >
              {isTr ? r.tr : r.en}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setCustomOpen(true)}
          // With dates in it the custom segment gets its own row on mobile,
          // so it never squeezes the presets below 44px.
          className={`${segmentClass(customActive)} ${
            customActive ? 'basis-full' : 'flex-auto'
          } sm:flex-none sm:basis-auto`}
          aria-pressed={customActive}
          aria-haspopup="dialog"
          aria-label={
            customActive
              ? isTr
                ? `Özel tarih aralığı: ${customLabel}`
                : `Custom date range: ${customLabel}`
              : isTr
                ? 'Özel tarih aralığı'
                : 'Custom date range'
          }
        >
          <Calendar size={13} aria-hidden="true" />
          <span className="tabular-nums">{customLabel}</span>
        </button>
      </div>

      {/* Platform (+ branch) select and the reset / progress slot. On mobile
          the platform select gets its own row when a branch select is shown,
          so neither label is cut off. */}
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
        <PulseSelect
          value={platform}
          onChange={(v) => updateMany([['platform', v]])}
          options={[
            { value: 'all', label: isTr ? 'Tüm platformlar' : 'All platforms' },
            ...PLATFORM_OPTIONS.map((pid) => ({ value: pid, label: PLATFORMS[pid].label })),
          ]}
          ariaLabel={isTr ? 'Platform' : 'Platform'}
          className={`min-w-0 sm:w-[170px] sm:flex-none ${
            showBranches ? 'basis-full sm:basis-auto' : 'flex-1'
          }`}
        />
        {showBranches && (
          <PulseSelect
            value={branch}
            onChange={(v) => updateMany([['branch', v]])}
            options={[
              { value: 'all', label: isTr ? 'Tüm şubeler' : 'All branches' },
              // "Şube: Merkez" — a bare branch name in the closed select gave
              // no hint of what it filters.
              ...(branches ?? []).map((b) => ({
                value: b,
                label: `${isTr ? 'Şube' : 'Branch'}: ${b}`,
              })),
            ]}
            ariaLabel={isTr ? 'Şube' : 'Branch'}
            className="min-w-0 flex-1 sm:w-[190px] sm:flex-none"
          />
        )}
        {/* One slot for reset and progress: while the page reloads it shows a
            spinner in place of reset, so the toolbar never grows a line. */}
        {pending ? (
          <span
            aria-hidden="true"
            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-1.5 text-[12px] text-[#737373] sm:h-[34px] sm:min-h-0 sm:min-w-0 sm:px-2"
          >
            <Loader2 size={13} className="animate-spin" />
            <span className="hidden sm:inline">{isTr ? 'Güncelleniyor…' : 'Updating…'}</span>
          </span>
        ) : hasActiveFilter ? (
          <button
            type="button"
            onClick={reset}
            className="bz-btn-ghost inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-1.5 text-[12px] sm:h-[34px] sm:min-h-0 sm:min-w-0 sm:py-0"
            aria-label={isTr ? 'Filtreleri temizle' : 'Reset filters'}
          >
            <RotateCcw size={13} aria-hidden="true" />
            <span className="hidden sm:inline">{isTr ? 'Temizle' : 'Reset'}</span>
          </button>
        ) : null}
      </div>

      {/* Always mounted so screen readers hear the change; takes no space. */}
      <span role="status" aria-live="polite" className="sr-only">
        {pending ? (isTr ? 'Güncelleniyor…' : 'Updating…') : ''}
      </span>

      {customOpen && (
        <Modal
          title={isTr ? 'Özel tarih aralığı' : 'Custom date range'}
          ariaLabel={isTr ? 'Özel tarih aralığı' : 'Custom date range'}
          onClose={() => setCustomOpen(false)}
          size={420}
          footer={
            <div className="flex w-full items-center justify-between gap-3">
              {range === 'custom' ? (
                <button type="button" onClick={clearCustom} className="bz-btn-ghost text-[12px]">
                  {isTr ? 'Temizle' : 'Clear'}
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCustomOpen(false)}
                  className="bz-btn-ghost text-[12px]"
                >
                  {isTr ? 'Vazgeç' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={applyCustom}
                  disabled={!canApply}
                  className="bz-btn-primary text-[12px] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isTr ? 'Uygula' : 'Apply'}
                </button>
              </div>
            </div>
          }
        >
          <p className="mb-4 text-[13px] text-[#737373]">
            {isTr
              ? `Başlangıç ve bitiş tarihini seç (en fazla ${MAX_CUSTOM_DAYS} gün).`
              : `Pick a start and end date (up to ${MAX_CUSTOM_DAYS} days).`}
          </p>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-[#525252]">
                {isTr ? 'Başlangıç' : 'Start'}
              </span>
              <input
                type="date"
                value={draftStart}
                onChange={(e) => setDraftStart(e.target.value)}
                className="bz-input"
                max={draftEnd || undefined}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-[#525252]">
                {isTr ? 'Bitiş' : 'End'}
              </span>
              <input
                type="date"
                value={draftEnd}
                onChange={(e) => setDraftEnd(e.target.value)}
                className="bz-input"
                min={draftStart || undefined}
                aria-invalid={draftError ? true : undefined}
                aria-describedby={draftError ? 'analytics-custom-range-error' : undefined}
              />
              {draftError && (
                <span
                  id="analytics-custom-range-error"
                  role="alert"
                  className="text-[12px] text-[#DC2626]"
                >
                  {draftError}
                </span>
              )}
            </label>
          </div>
        </Modal>
      )}
    </div>
  );
}
