'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useTransition, useEffect } from 'react';
import { Eyebrow, Modal, PlatformChip, PLATFORMS, PulseSelect, type PlatformId } from '@/components/ui';
import { RotateCcw, Calendar, Download } from 'lucide-react';

/**
 * URL-synced filter bar for analytics surfaces.
 * State (range/platform/branch/custom) tek-source: URL searchParams. Server
 * component parse eder, Prisma query'lerine pasla. Bu component sadece UI ve
 * URL update'i.
 *
 * §38.50 — 4 tab (7G/30G/90G/1Y) + "Özel aralık" modal + "Rapor al" CSV export.
 */

const RANGES: Array<{ id: '7d' | '30d' | '90d' | '1y'; tr: string; en: string }> = [
  { id: '7d', tr: '7G', en: '7D' },
  { id: '30d', tr: '30G', en: '30D' },
  { id: '90d', tr: '90G', en: '90D' },
  { id: '1y', tr: '1Y', en: '1Y' },
];

const PLATFORM_OPTIONS: PlatformId[] = [
  'google',
  'yemeksepeti',
  'getir',
  'trendyol_go',
  'tripadvisor',
];

interface Props {
  isTr: boolean;
  branches?: string[];
  /** Multi-restaurant owner için opsiyonel restoran picker. */
  restaurants?: Array<{ id: string; name: string }>;
}

export default function AnalyticsFilterBar({ isTr, branches, restaurants }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const range = (params.get('range') as '7d' | '30d' | '90d' | '1y' | 'custom' | null) ?? '30d';
  const platform = params.get('platform') ?? 'all';
  const branch = params.get('branch') ?? 'all';
  const restaurantId = params.get('restaurantId') ?? 'all';
  const customStart = params.get('customStart') ?? '';
  const customEnd = params.get('customEnd') ?? '';

  const hasActiveFilter =
    range !== '30d' ||
    platform !== 'all' ||
    branch !== 'all' ||
    restaurantId !== 'all';

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value && value !== 'all') {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    });
  };

  const updateMany = (entries: Array<[string, string | null]>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of entries) {
      if (value && value !== 'all') next.set(key, value);
      else next.delete(key);
    }
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    });
  };

  const reset = () => {
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  };

  // §38.50 — Custom range modal state. Audit Wave 1 (CLAUDE.md §40.3
  // hierarchy violation: eski `z-[80]` impersonation banner'ı (z-[60])
  // örtüyordu, manuel ESC + body-lock implementation focus trap'siz
  // ve outside-click incomplete) ile birlikte `<Modal>` primitive'e
  // migrate edildi. Modal primitive: z-50 canonical, focus trap,
  // FOCUSABLE_SELECTOR Tab cycle, ESC handler, body scroll lock,
  // backdrop click, focus restore — hepsi tek noktadan.
  const [customOpen, setCustomOpen] = useState(false);
  const [draftStart, setDraftStart] = useState(customStart);
  const [draftEnd, setDraftEnd] = useState(customEnd);

  useEffect(() => {
    setDraftStart(customStart);
    setDraftEnd(customEnd);
  }, [customStart, customEnd]);

  const applyCustom = () => {
    if (!draftStart || !draftEnd) return;
    if (draftEnd <= draftStart) return;
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

  // §38.50 — Export CSV. Mevcut URL params'ı kopyalar (range/platform/branch/restaurantId/custom).
  const exportHref = (() => {
    const qs = new URLSearchParams(params.toString());
    return `/api/dashboard/analytics/export?${qs.toString()}`;
  })();

  const customLabel =
    range === 'custom' && customStart && customEnd
      ? `${customStart} → ${customEnd}`
      : isTr
        ? 'Özel aralık'
        : 'Custom range';

  return (
    <section
      className="bz-card p-4 sm:p-5"
      aria-label={isTr ? 'Analitik filtreleri' : 'Analytics filters'}
      data-pending={pending ? '' : undefined}
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex items-center gap-2.5">
          <Eyebrow>{isTr ? 'FİLTRE' : 'FILTERS'}</Eyebrow>
        </div>

        {/* Range — segmented control (4 tab — §38.50: 1Y eklendi) */}
        <div
          className="inline-flex items-center gap-1 rounded-lg border border-[#EDEDED] p-1"
          role="group"
          aria-label={isTr ? 'Tarih aralığı' : 'Date range'}
        >
          {RANGES.map((r) => {
            const active = range === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  if (r.id === '30d') {
                    updateMany([['range', null], ['customStart', null], ['customEnd', null]]);
                  } else {
                    updateMany([['range', r.id], ['customStart', null], ['customEnd', null]]);
                  }
                }}
                className={`px-3 py-2 sm:py-1 text-[12px] font-medium rounded-md transition-colors min-h-[40px] sm:min-h-0 ${
                  active
                    ? 'bg-[#0A0A0A] text-white'
                    : 'text-[#525252] hover:bg-[#F5F5F5]'
                }`}
                aria-pressed={active}
              >
                {isTr ? r.tr : r.en}
              </button>
            );
          })}
        </div>

        {/* §38.50 — Özel aralık trigger.
            Stage 80 §38.160 — mobile 44px touch target (`min-h-[44px]`),
            desktop sm:+ kompakt kalır. */}
        <button
          type="button"
          onClick={() => setCustomOpen(true)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 sm:py-1.5 text-[12px] font-medium rounded-md border transition-colors min-h-[44px] sm:min-h-0 ${
            range === 'custom'
              ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
              : 'border-[#EDEDED] text-[#525252] hover:bg-[#FAFAFA]'
          }`}
          aria-pressed={range === 'custom'}
          aria-haspopup="dialog"
        >
          <Calendar size={13} />
          <span className="bz-mono tabular-nums max-w-[200px] truncate">{customLabel}</span>
        </button>

        {/* §38.50 — Rapor al (CSV export). Stage 80 §38.160 — mobile 44px. */}
        <a
          href={exportHref}
          download
          className="inline-flex items-center gap-1.5 px-3 py-2 sm:py-1.5 text-[12px] font-medium rounded-md border border-[#EDEDED] text-[#525252] hover:bg-[#FAFAFA] transition-colors min-h-[44px] sm:min-h-0"
          aria-label={isTr ? 'Rapor indir (CSV)' : 'Download report (CSV)'}
        >
          <Download size={13} />
          {isTr ? 'Rapor al' : 'Export'}
        </a>

        {/* Multi-restaurant owner case — Pulse-styled custom select */}
        {restaurants && restaurants.length > 1 && (
          <PulseSelect
            value={restaurantId}
            onChange={(v) => update('restaurantId', v)}
            options={[
              { value: 'all', label: isTr ? 'Tüm işletmeler' : 'All businesses' },
              ...restaurants.map((r) => ({ value: r.id, label: r.name })),
            ]}
            ariaLabel={isTr ? 'İşletme' : 'Business'}
            className="min-w-[180px] sm:min-w-[200px] sm:max-w-[260px]"
          />
        )}

        {/* Branch select */}
        {branches && branches.length > 0 && (
          <PulseSelect
            value={branch}
            onChange={(v) => update('branch', v)}
            options={[
              { value: 'all', label: isTr ? 'Tüm şubeler' : 'All branches' },
              ...branches.map((b) => ({ value: b, label: b })),
            ]}
            ariaLabel={isTr ? 'Şube' : 'Branch'}
            className="min-w-[170px] sm:min-w-[190px] sm:max-w-[240px]"
          />
        )}

        {/* Platform chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => update('platform', null)}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-full border transition-colors ${
              platform === 'all'
                ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                : 'border-[#EDEDED] text-[#525252] hover:bg-[#FAFAFA]'
            }`}
            aria-pressed={platform === 'all'}
          >
            {isTr ? 'Tümü' : 'All'}
          </button>
          {PLATFORM_OPTIONS.map((pid) => {
            const active = platform === pid;
            return (
              <button
                key={pid}
                type="button"
                onClick={() => update('platform', active ? null : pid)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-full border transition-colors ${
                  active
                    ? 'border-[#0A0A0A] bg-white text-[#0A0A0A]'
                    : 'border-[#EDEDED] text-[#525252] hover:bg-[#FAFAFA]'
                }`}
                aria-pressed={active}
                title={PLATFORMS[pid].label}
              >
                <PlatformChip id={pid} size={14} />
                <span className="hidden sm:inline">{PLATFORMS[pid].label}</span>
              </button>
            );
          })}
        </div>

        {hasActiveFilter && (
          <button
            type="button"
            onClick={reset}
            className="bz-btn-ghost inline-flex items-center gap-1.5 text-[12px] sm:ml-auto"
            aria-label={isTr ? 'Filtreleri temizle' : 'Reset filters'}
          >
            <RotateCcw size={13} />
            {isTr ? 'Temizle' : 'Reset'}
          </button>
        )}
      </div>

      {/* §38.50 — Özel aralık modal (basit date range picker).
          Wave 1 PR-1 audit fix: custom div+role="dialog" yerine Modal
          primitive (z-50 canonical hierarchy + focus trap + ESC + body
          scroll lock + backdrop click + focus restore tek paketten). */}
      {customOpen && (
        <Modal
          title={isTr ? 'Özel tarih aralığı' : 'Custom date range'}
          ariaLabel={isTr ? 'Özel tarih aralığı' : 'Custom date range'}
          onClose={() => setCustomOpen(false)}
          size={420}
          footer={
            <div className="flex w-full items-center justify-between gap-3">
              {range === 'custom' ? (
                <button
                  type="button"
                  onClick={clearCustom}
                  className="bz-btn-ghost text-[12px]"
                >
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
                  disabled={!draftStart || !draftEnd || draftEnd <= draftStart}
                  className="bz-btn-primary text-[12px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTr ? 'Uygula' : 'Apply'}
                </button>
              </div>
            </div>
          }
        >
          <p className="mb-4 text-[12px] text-[#737373]">
            {isTr
              ? 'Başlangıç ve bitiş tarihlerini seç (max 365 gün).'
              : 'Pick start and end dates (max 365 days).'}
          </p>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="pulse-eyebrow text-[10px] text-[#737373]">
                {isTr ? 'BAŞLANGIÇ' : 'START'}
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
              <span className="pulse-eyebrow text-[10px] text-[#737373]">
                {isTr ? 'BİTİŞ' : 'END'}
              </span>
              <input
                type="date"
                value={draftEnd}
                onChange={(e) => setDraftEnd(e.target.value)}
                className="bz-input"
                min={draftStart || undefined}
              />
            </label>
          </div>
        </Modal>
      )}
    </section>
  );
}
