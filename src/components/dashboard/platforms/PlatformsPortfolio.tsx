'use client';

// "Tüm işletmeler" view of /dashboard/platforms (§49) — one row per
// business, one column per review platform. Each cell is a link to that
// business's platform page, so a franchise owner can find and fix every
// broken or missing link without switching businesses one by one.
//
// "Tümünü kontrol et" checks the links of every business, one business after
// the other (the per-business retest endpoint is rate limited per business).

import { useMemo, useState } from 'react';
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
  missing: 'text-[#737373] bg-[#F5F5F5] hover:bg-[#EDEDED]',
  off: 'text-[#A3A3A3] bg-[#FAFAFA] hover:bg-[#F2F2F2]',
  locked: 'text-[#A3A3A3] bg-[#FAFAFA]',
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
}

export function PlatformsPortfolio<T extends PlatformLinkRow & { id: string; name: string }>({
  locale,
  businesses,
  checksById,
  onOpenBusiness,
  onChecks,
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
    <section aria-labelledby="pl-portfolio-title" className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 id="pl-portfolio-title" className="bz-h-tight text-[18px] text-[#0A0A0A]">
            {isTr ? 'Tüm işletmeler' : 'All businesses'}
          </h2>
          <p className="mt-1 text-[12.5px] leading-[1.55] text-[#525252]">
            {needsWork > 0
              ? isTr
                ? `${matrix.rows.length} işletmeden ${needsWork} tanesinde düzeltilecek link var. Bir hücreye basınca o işletmenin linki açılır.`
                : `${needsWork} of ${matrix.rows.length} businesses have links to fix. Press a cell to open that business's link.`
              : isTr
                ? 'Tüm işletmelerinizin yorum linkleri yerinde.'
                : 'Every business has its review links in place.'}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
            className="bz-btn-ghost inline-flex min-h-[44px] items-center justify-center gap-1.5 text-[12.5px] sm:min-h-[36px]"
          >
            {running ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={14} aria-hidden="true" />}
            {running ? (isTr ? 'Kontrol ediliyor…' : 'Checking…') : isTr ? 'Tüm işletmeleri kontrol et' : 'Check all businesses'}
          </button>
        </div>
      </div>
      <p role="status" aria-live="polite" className="text-[12px] text-[#525252] [&:empty]:hidden">
        {progress}
      </p>

      <div className="bz-card overflow-x-auto p-0">
        <table className="bz-table min-w-[560px]">
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-[1] bg-white">
                {isTr ? 'İşletme' : 'Business'}
              </th>
              {matrix.columns.map((platform) => (
                <th key={platform.slug} scope="col" className="!px-1.5 text-center align-bottom">
                  <span className="mx-auto flex w-[64px] flex-col items-center gap-1 text-[11px] leading-tight [overflow-wrap:anywhere]">
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
                <td colSpan={matrix.columns.length + 2} className="py-8 text-center text-[12.5px] text-[#737373]">
                  {isTr ? 'Düzeltilecek link yok.' : 'Nothing to fix.'}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <th scope="row" className="sticky left-0 z-[1] max-w-[220px] bg-white text-left font-normal">
                    <span className="block truncate text-[13px] font-medium text-[#0A0A0A]">{row.name}</span>
                    <span className="text-[11.5px] text-[#737373]">
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
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-md ${CELL_TONE.locked}`}
                          >
                            <PlatformStateIcon state={cell.state} size={14} />
                          </span>
                        ) : (
                          <Link
                            href={platformWizardHref(locale, platform.slug, row.id)}
                            title={label}
                            aria-label={label}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] ${CELL_TONE[cell.state]}`}
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
                      className="bz-btn-ghost bz-btn-sm whitespace-nowrap"
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
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-[#525252]" aria-label={isTr ? 'Simgeler' : 'Legend'}>
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
