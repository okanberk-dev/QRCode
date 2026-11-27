'use client';

// "Tüm işletmeler" view of /dashboard/platforms (§49) — one row per
// business, one column per review platform. Each cell is a link to that
// business's platform page, so a franchise owner can find and fix every
// broken or missing link without switching businesses one by one.
//
// "Tümünü kontrol et" checks the links of every business, one business after
// the other (the per-business retest endpoint is rate limited per business).

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Loader2, RefreshCw } from 'lucide-react';
import { APSwitch } from '@/components/ui';
import { buildPlatformPortfolio } from '@/lib/platform-portfolio';
import type { LatestCheckLite, PlatformLinkRow } from '@/lib/platform-link-status';
import { PlatformLogo } from './PlatformLogo';
import { PlatformStateIcon, platformStateLabel } from './PlatformStatusPill';
import { platformWizardHref } from './PlatformLinkRow';

const CELL_TONE: Record<string, string> = {
  connected: 'text-[#16A34A] bg-[#F0FDF4] hover:bg-[#DCFCE7]',
  issue: 'text-[#B91C1C] bg-[#FEF2F2] hover:bg-[#FEE2E2]',
  missing: 'text-[#737373] bg-pn-canvas hover:bg-pn-line',
  off: 'text-[#A3A3A3] bg-pn-canvas hover:bg-pn-canvas',
  locked: 'text-[#A3A3A3] bg-pn-canvas',
};

interface RetestResult {
  provider: string;
  ok: boolean;
  statusCode?: number | null;
  error?: string | null;
  checkedAt?: string;
}

interface PlatformsPortfolioProps<T extends PlatformLinkRow & { id: string; name: string }> {
  locale: 'tr' | 'en';
  businesses: readonly T[];
  checksById: Record<string, Record<string, LatestCheckLite>>;
  onOpenBusiness: (id: string) => void;
  onChecks: (restaurantId: string, checks: Record<string, LatestCheckLite>) => void;
  /** Rendered at the start of the toolbar row (the page's view tabs), so the
   *  tabs, the "only to fix" filter and the check-all action share one row. */
  toolbarStart?: ReactNode;
  /** Paused businesses left out of the matrix (the business switcher cannot
   *  open them). Shown as one line so the count matches İşletmeler. */
  hiddenPausedCount?: number;
}

export function PlatformsPortfolio<T extends PlatformLinkRow & { id: string; name: string }>({
  locale,
  businesses,
  checksById,
  onOpenBusiness,
  onChecks,
  toolbarStart,
  hiddenPausedCount = 0,
}: PlatformsPortfolioProps<T>) {
  const isTr = locale === 'tr';
  const [onlyWork, setOnlyWork] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const matrix = useMemo(() => buildPlatformPortfolio(businesses, checksById), [businesses, checksById]);
  const rows = onlyWork ? matrix.rows.filter((row) => row.needsWork) : matrix.rows;
  const needsWork = matrix.rows.filter((row) => row.needsWork).length;

  const checkAll = async () => {
    if (running) return;
    setRunning(true);
    let ok = 0;
    let failed = 0;
    let skipped = 0;
    for (let index = 0; index < matrix.rows.length; index += 1) {
      const row = matrix.rows[index];
      const testable = Object.values(row.cells).some((cell) => cell && (cell.state === 'connected' || cell.state === 'issue'));
      if (!testable) continue;
      setProgress(
        isTr
          ? `${row.name} kontrol ediliyor (${index + 1}/${matrix.rows.length})…`
          : `Checking ${row.name} (${index + 1}/${matrix.rows.length})…`,
      );
      try {
        const response = await fetch(`/api/restaurants/${row.id}/integrations/retest?locale=${locale}`, { method: 'POST' });
        if (!response.ok) {
          skipped += 1;
          continue;
        }
        const data = await response.json().catch(() => null);
        const results: RetestResult[] = Array.isArray(data?.results) ? data.results : [];
        const next: Record<string, LatestCheckLite> = { ...(checksById[row.id] ?? {}) };
        for (const result of results) {
          next[result.provider] = {
            ok: Boolean(result.ok),
            checkedAt: result.checkedAt ?? new Date().toISOString(),
            error: result.error ?? null,
            statusCode: typeof result.statusCode === 'number' ? result.statusCode : null,
          };
          if (result.ok) ok += 1;
          else failed += 1;
        }
        onChecks(row.id, next);
      } catch {
        skipped += 1;
      }
    }
    setProgress(
      isTr
        ? `${ok + failed} link kontrol edildi: ${ok} çalışıyor, ${failed} sorunlu${skipped ? ` · ${skipped} işletme atlandı (sonra tekrar deneyin)` : ''}.`
        : `${ok + failed} links checked: ${ok} working, ${failed} need attention${skipped ? ` · ${skipped} businesses skipped (try again later)` : ''}.`,
    );
    setRunning(false);
  };

  return (
    <section aria-label={isTr ? 'Tüm işletmeler' : 'All businesses'} className="space-y-3">
      {/* One toolbar: view tabs (from the page) · filter · check-all. */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {toolbarStart ? <div className="min-w-0">{toolbarStart}</div> : null}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 md:ml-auto">
          <APSwitch
            size="sm"
            checked={onlyWork}
            onChange={setOnlyWork}
            label={isTr ? 'Yalnız düzeltilecekler' : 'Only to fix'}
          />
          <button
            type="button"
            onClick={checkAll}
            aria-busy={running || undefined}
            className="bz-btn-ghost inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 text-[13px] sm:w-auto sm:min-h-[36px]"
          >
            {running ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={14} aria-hidden="true" />}
            {running ? (isTr ? 'Kontrol ediliyor…' : 'Checking…') : isTr ? 'Tüm işletmeleri kontrol et' : 'Check all businesses'}
          </button>
        </div>
      </div>
      <p className="text-[13px] leading-[1.55] text-[#525252]">
        {needsWork > 0
          ? isTr
            ? `${matrix.rows.length} işletmeden ${needsWork} tanesinde düzeltilecek link var. Bir hücreye basınca o işletmenin linki açılır.`
            : `${needsWork} of ${matrix.rows.length} businesses have links to fix. Press a cell to open that business's link.`
          : isTr
            ? 'Tüm işletmelerinizin yorum linkleri yerinde.'
            : 'Every business has its review links in place.'}
        {hiddenPausedCount > 0
          ? isTr
            ? ` ${hiddenPausedCount} devre dışı işletme burada gösterilmez.`
            : ` ${hiddenPausedCount} disabled ${hiddenPausedCount === 1 ? 'business is' : 'businesses are'} not shown here.`
          : null}
      </p>
      <p role="status" aria-live="polite" className="text-[12px] text-[#525252] [&:empty]:hidden">
        {progress}
      </p>

      {/* `relative`: the sr-only header label is absolutely positioned; without
          a positioned wrapper it escaped the scroll box and widened the page. */}
      <div className="bz-card relative overflow-x-auto p-0">
        <table className="bz-table min-w-[560px]">
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-[1] bg-white">
                {isTr ? 'İşletme' : 'Business'}
              </th>
              {matrix.columns.map((platform) => (
                <th key={platform.slug} scope="col" className="!px-1.5 text-center align-bottom">
                  <span className="mx-auto flex w-[64px] flex-col items-center gap-1 text-[12px] leading-tight [overflow-wrap:anywhere]">
                    <PlatformLogo platform={platform} size={18} />
                    {platform.name}
                  </span>
                </th>
              ))}
              <th scope="col" className="text-right">
                <span className="sr-only">{isTr ? 'İşlem' : 'Action'}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={matrix.columns.length + 2} className="py-8 text-center text-[13px] text-[#737373]">
                  {isTr ? 'Düzeltilecek link yok.' : 'Nothing to fix.'}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <th scope="row" className="sticky left-0 z-[1] max-w-[220px] bg-white text-left font-normal">
                    <span className="block truncate text-[13px] font-medium text-pn-ink">{row.name}</span>
                    <span className="text-[12px] text-[#737373]">
                      {isTr
                        ? `${row.summary.connected} bağlı${row.summary.issue ? ` · ${row.summary.issue} sorunlu` : ''}${row.summary.missing ? ` · ${row.summary.missing} eksik` : ''}`
                        : `${row.summary.connected} connected${row.summary.issue ? ` · ${row.summary.issue} issue` : ''}${row.summary.missing ? ` · ${row.summary.missing} missing` : ''}`}
                    </span>
                  </th>
                  {matrix.columns.map((platform) => {
                    const cell = row.cells[platform.slug];
                    if (!cell) {
                      return (
                        <td key={platform.slug} className="!px-1.5 text-center text-[#D4D4D4]" aria-label={isTr ? 'Önerilmiyor' : 'Not suggested'}>
                          —
                        </td>
                      );
                    }
                    const label = `${row.name} · ${platform.name}: ${platformStateLabel(cell.state, locale)}`;
                    return (
                      <td key={platform.slug} className="!px-1.5 text-center">
                        {cell.state === 'locked' ? (
                          <span
                            title={label}
                            aria-label={label}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${CELL_TONE.locked}`}
                          >
                            <PlatformStateIcon state={cell.state} size={14} />
                          </span>
                        ) : (
                          <Link
                            href={platformWizardHref(locale, platform.slug, row.id)}
                            title={label}
                            aria-label={label}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-ink ${CELL_TONE[cell.state]}`}
                          >
                            <PlatformStateIcon state={cell.state} size={14} />
                          </Link>
                        )}
                      </td>
                    );
                  })}
                  <td className="text-right">
                    <button
                      type="button"
                      onClick={() => onOpenBusiness(row.id)}
                      aria-label={isTr ? `Ayrıntı: ${row.name}` : `Details: ${row.name}`}
                      className="bz-btn-ghost bz-btn-sm min-h-[44px] whitespace-nowrap sm:min-h-[32px]"
                    >
                      {isTr ? 'Ayrıntı' : 'Details'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#525252]" aria-label={isTr ? 'Simgeler' : 'Legend'}>
        {(['connected', 'issue', 'missing', 'off'] as const).map((state) => (
          <li key={state} className="inline-flex items-center gap-1.5">
            <span className={`inline-flex h-5 w-5 items-center justify-center rounded ${CELL_TONE[state]}`}>
              <PlatformStateIcon state={state} size={11} />
            </span>
            {platformStateLabel(state, locale)}
          </li>
        ))}
        <li className="inline-flex items-center gap-1.5">
          <span className="text-[#D4D4D4]">—</span>
          {isTr ? 'Sektör için önerilmiyor' : 'Not typical for the sector'}
        </li>
      </ul>
    </section>
  );
}

export default PlatformsPortfolio;
