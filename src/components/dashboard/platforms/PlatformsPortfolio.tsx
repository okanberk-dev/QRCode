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
import { ArrowUpRight, Loader2, RefreshCw } from 'lucide-react';
import { APSwitch } from '@/components/ui';
import { buildPlatformPortfolio } from '@/lib/platform-portfolio';
import type { LatestCheckLite, PlatformLinkRow } from '@/lib/platform-link-status';
import { PlatformLogo } from './PlatformLogo';
import { PlatformStateIcon, platformStateLabel } from './PlatformStatusPill';
import { platformWizardHref } from './PlatformLinkRow';
import { PlatformCard } from './PlatformCard';

// Soft status circles (Fintora): tinted fill, state icon in the state colour
// — never colour alone (WCAG 1.4.1), the icon and the label carry it too.
const CELL_TONE: Record<string, string> = {
  connected: 'text-[#1F7A35] bg-[#E6F7EA] hover:bg-[#D3F0DA]',
  issue: 'text-[#C4271B] bg-[#FDECEC] hover:bg-[#FAD9D7]',
  missing: 'text-[#666666] bg-pn-canvas hover:bg-pn-line',
  off: 'text-[#9A9A9A] bg-pn-canvas',
  locked: 'text-[#9A9A9A] bg-pn-canvas',
};

// Phone cell chips sit on a white business tile (pano.css <640 turns the
// canvas white) and on a grey one between 640 and 768: neutral chips flip.
const CHIP_TONE: Record<string, string> = {
  connected: 'text-[#1F7A35] bg-[#E6F7EA]',
  issue: 'text-[#C4271B] bg-[#FDECEC]',
  missing: 'text-[#525252] bg-white max-sm:bg-[#F6F6F6]',
  off: 'text-[#666666] bg-white max-sm:bg-[#F6F6F6]',
  locked: 'text-[#666666] bg-white max-sm:bg-[#F6F6F6]',
};

// Small status badge on the chip's logo corner (the icon is the non-colour cue).
const BADGE_TONE: Record<string, string> = {
  connected: 'bg-[#23863A] text-white',
  issue: 'bg-[#D92D20] text-white',
  missing: 'bg-[#8A8A8A] text-white',
  off: 'bg-[#B5B5B5] text-white',
  locked: 'bg-[#B5B5B5] text-white',
};

function summaryText(summary: { connected: number; issue: number; missing: number }, isTr: boolean): string {
  return isTr
    ? `${summary.connected} bağlı${summary.issue ? ` · ${summary.issue} sorunlu` : ''}${summary.missing ? ` · ${summary.missing} eksik` : ''}`
    : `${summary.connected} connected${summary.issue ? ` · ${summary.issue} issue` : ''}${summary.missing ? ` · ${summary.missing} missing` : ''}`;
}

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

  const intro = (
    <>
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
    </>
  );

  const emptyText = isTr ? 'Düzeltilecek link yok.' : 'Nothing to fix.';

  return (
    <section aria-label={isTr ? 'Tüm işletmeler' : 'All businesses'} className="space-y-3">
      {/* One toolbar: view tabs (from the page) · filter · check-all. */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {toolbarStart ? <div className="min-w-0">{toolbarStart}</div> : null}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 md:ml-auto">
          <div className="flex min-h-[44px] items-center rounded-full bg-white px-4">
            <APSwitch
              size="sm"
              checked={onlyWork}
              onChange={setOnlyWork}
              label={isTr ? 'Yalnız düzeltilecekler' : 'Only to fix'}
            />
          </div>
          <button
            type="button"
            onClick={checkAll}
            aria-busy={running || undefined}
            className="bz-btn-ghost inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 text-[14px] focus-visible:outline-none focus-visible:ring-2! focus-visible:ring-pn-accent focus-visible:ring-offset-2 sm:w-auto"
          >
            {running ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={15} aria-hidden="true" />}
            {running ? (isTr ? 'Kontrol ediliyor…' : 'Checking…') : isTr ? 'Tüm işletmeleri kontrol et' : 'Check all businesses'}
          </button>
        </div>
      </div>

      <PlatformCard
        as="div"
        title={isTr ? 'İşletmelere göre linkler' : 'Links by business'}
        description={intro}
      >
        <p role="status" aria-live="polite" className="-mt-1 mb-3 text-[13px] text-[#525252] [&:empty]:hidden">
          {progress}
        </p>

        {/* Tablet and up: matrix. `relative`: the sr-only header label is
            absolutely positioned; without a positioned wrapper it escaped the
            scroll box and widened the page. */}
        <div className="relative -mx-5 hidden overflow-x-auto sm:-mx-6 md:block">
          <table className="bz-table min-w-[560px]">
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 z-[1] bg-white !pl-5 sm:!pl-6">
                  {isTr ? 'İşletme' : 'Business'}
                </th>
                {matrix.columns.map((platform) => (
                  <th key={platform.slug} scope="col" className="!px-1.5 text-center align-bottom">
                    <span className="mx-auto flex w-[68px] flex-col items-center gap-1.5 text-[12px] font-medium leading-tight [overflow-wrap:anywhere]">
                      <PlatformLogo platform={platform} size={28} shape="circle" className="ring-1 ring-pn-line" />
                      {platform.name}
                    </span>
                  </th>
                ))}
                <th scope="col" className="text-right !pr-5 sm:!pr-6">
                  <span className="sr-only">{isTr ? 'İşlem' : 'Action'}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={matrix.columns.length + 2} className="py-10 text-center text-[14px] text-[#737373]">
                    {emptyText}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="group">
                    <th
                      scope="row"
                      className="sticky left-0 z-[1] max-w-[240px] bg-white !py-3 !pl-5 text-left font-normal transition-colors group-last:border-b-0 group-hover:bg-pn-canvas sm:!pl-6"
                    >
                      <span className="block truncate text-[14px] font-medium text-pn-ink">{row.name}</span>
                      <span className="mt-0.5 block text-[12px] text-[#737373]">{summaryText(row.summary, isTr)}</span>
                    </th>
                    {matrix.columns.map((platform) => {
                      const cell = row.cells[platform.slug];
                      if (!cell) {
                        return (
                          <td
                            key={platform.slug}
                            className="!px-1.5 text-center text-[#D4D4D4]"
                            aria-label={isTr ? 'Önerilmiyor' : 'Not suggested'}
                          >
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
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2 ${CELL_TONE[cell.state]}`}
                            >
                              <PlatformStateIcon state={cell.state} size={14} />
                            </Link>
                          )}
                        </td>
                      );
                    })}
                    <td className="text-right !pr-5 sm:!pr-6">
                      <button
                        type="button"
                        onClick={() => onOpenBusiness(row.id)}
                        aria-label={isTr ? `Ayrıntı: ${row.name}` : `Details: ${row.name}`}
                        title={isTr ? 'Ayrıntı' : 'Details'}
                        className="pn-arrow-btn ml-auto h-10 w-10"
                      >
                        <ArrowUpRight size={17} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Phones: one tile per business, its platforms as status chips. */}
        <ul role="list" className="space-y-2 md:hidden">
          {rows.length === 0 ? (
            <li className="rounded-[18px] bg-pn-canvas px-4 py-8 text-center text-[14px] text-[#737373]">{emptyText}</li>
          ) : (
            rows.map((row) => {
              const cells = matrix.columns
                .map((platform) => ({ platform, cell: row.cells[platform.slug] }))
                .filter((entry): entry is { platform: typeof entry.platform; cell: NonNullable<typeof entry.cell> } =>
                  Boolean(entry.cell),
                );
              return (
                <li key={row.id} className="rounded-[18px] bg-pn-canvas p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-[15px] font-medium leading-5 text-pn-ink">{row.name}</h3>
                      <p className="mt-0.5 text-[12px] text-[#666666]">{summaryText(row.summary, isTr)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenBusiness(row.id)}
                      aria-label={isTr ? `Ayrıntı: ${row.name}` : `Details: ${row.name}`}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-pn-ink transition-colors duration-200 hover:bg-pn-accent hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2 max-sm:bg-[#F6F6F6] max-sm:hover:bg-pn-accent"
                    >
                      <ArrowUpRight size={17} aria-hidden="true" />
                    </button>
                  </div>
                  {cells.length > 0 && (
                    <ul role="list" className="mt-3 grid grid-cols-2 gap-1.5">
                      {cells.map(({ platform, cell }) => {
                        const label = `${row.name} · ${platform.name}: ${platformStateLabel(cell.state, locale)}`;
                        const chipBody = (
                          <>
                            <span className="relative shrink-0">
                              <PlatformLogo platform={platform} size={26} shape="circle" className="ring-1 ring-pn-line" />
                              <span
                                aria-hidden="true"
                                className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-white ${BADGE_TONE[cell.state]}`}
                              >
                                <PlatformStateIcon state={cell.state} size={10} />
                              </span>
                            </span>
                            <span className="min-w-0 flex-1 truncate text-left">{platform.name}</span>
                          </>
                        );
                        const chipClass = `flex min-h-[44px] w-full items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-[13px] font-medium ${CHIP_TONE[cell.state]}`;
                        return (
                          <li key={platform.slug} className="min-w-0">
                            {cell.state === 'locked' ? (
                              <span title={label} aria-label={label} className={chipClass}>
                                {chipBody}
                              </span>
                            ) : (
                              <Link
                                href={platformWizardHref(locale, platform.slug, row.id)}
                                aria-label={label}
                                title={label}
                                className={`${chipClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2`}
                              >
                                {chipBody}
                              </Link>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })
          )}
        </ul>

        <ul
          className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-pn-line pt-4 text-[13px] text-[#525252]"
          aria-label={isTr ? 'Simgeler' : 'Legend'}
        >
          {(['connected', 'issue', 'missing', 'off'] as const).map((state) => (
            <li key={state} className="inline-flex items-center gap-1.5">
              <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${CELL_TONE[state]}`}>
                <PlatformStateIcon state={state} size={12} />
              </span>
              {platformStateLabel(state, locale)}
            </li>
          ))}
          <li className="inline-flex items-center gap-1.5">
            <span className="inline-flex h-6 w-6 items-center justify-center text-[#C4C4C4]">—</span>
            {isTr ? 'Sektör için önerilmiyor' : 'Not typical for the sector'}
          </li>
        </ul>
      </PlatformCard>
    </section>
  );
}

export default PlatformsPortfolio;
