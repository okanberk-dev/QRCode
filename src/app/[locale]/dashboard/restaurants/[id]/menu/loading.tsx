import { SkBox, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';
import {
  CELL_LINE2, CELL_MENU, CELL_NAME, CELL_PHOTO, CELL_PRICE, CELL_STATUS, FROM_MEDIUM, ROW_BASE, ROW_FULL, ROW_MEDIUM,
  ROW_NARROW,
} from './_components/outline/row-layout';

/**
 * Menu Studio skeleton (spec §11, CLAUDE.md §40.10). Default export imported
 * by this segment, by `MenuStudio` (menu or role still loading), by the
 * `?preview=1` screen and by `dashboard/menu/loading.tsx` + `MenuHubRedirect`.
 * Clones the studio DOM with the same classes — header → status card →
 * (<1024) view switch, search, filters, sticky chip bar / (≥1024) sticky
 * toolbar, two rows below 1400 and one row from 1400 → [category rail (≥1400) |
 * outline | right column]. Rows use `row-layout.ts`, so a row has the same
 * tier geometry here as in the studio. The grid classes are the studio's
 * (`min-[87.5rem]` / `min-[100rem]` = 1400 / 1600 px written in rem so they
 * sort after `xl:`).
 */
export default function MenuBuilderSkeleton() {
  return (
    <SkPageShell max={1600} space={5}>
      {/* Header (PageHeader compact + three actions) */}
      <div>
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end md:gap-4">
          <div className="min-w-0 flex-1">
            <div className="mt-1" style={{ height: 'calc(clamp(20px, 2.6vw, 24px) * 1.15)' }}>
              <SkBox className="h-full w-24" />
            </div>
            <div className="mt-2 flex h-5 items-center">
              <SkBox className="h-4 w-36 max-w-full" />
            </div>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <SkBox className="h-11 flex-1 rounded-lg sm:h-9 sm:w-[112px] sm:flex-none" />
            <SkBox className="h-11 flex-1 rounded-lg sm:h-9 sm:w-[128px] sm:flex-none" />
            <SkBox className="h-11 w-11 shrink-0 rounded-lg sm:h-9 sm:w-[76px]" />
          </div>
        </div>
      </div>

      {/* Status card */}
      <div className="bz-card min-h-[164px] p-4 sm:min-h-[128px] sm:p-5 lg:min-h-[112px]">
        <SkBox className="mb-2 h-5 w-16" />
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <SkBox className="h-5 w-48" />
            <SkBox className="h-3.5 w-72 max-w-full" />
          </div>
          <SkBox className="h-11 w-full rounded-lg lg:h-9 lg:w-28" />
        </div>
      </div>

      {/* ≥1024: sticky two-row toolbar */}
      <div className="hidden h-px lg:block" aria-hidden="true" />
      <div className="-mx-4 hidden px-4 sm:-mx-7 sm:px-7 lg:block">
        <div className="flex h-14 items-center gap-2">
          <SkBox className="h-9 w-[240px] shrink-0 xl:w-[300px]" />
          {Array.from({ length: 4 }).map((_, i) => (
            <SkBox key={i} className="h-9 w-20 rounded-full" />
          ))}
          <SkBox className="ml-auto h-4 w-28" />
          <SkBox className="h-9 w-9" />
          <div className="hidden shrink-0 items-center gap-2 min-[1400px]:flex">
            <SkBox className="h-9 w-[150px] rounded-[10px]" />
            <SkBox className="h-9 w-16 rounded-lg" />
            <SkBox className="h-[34px] w-20 rounded-lg" />
          </div>
        </div>
        <div className="flex h-14 items-center gap-2 min-[1400px]:hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkBox key={i} className="h-9 w-24 rounded-full" />
          ))}
          <SkBox className="ml-auto h-9 w-[150px] rounded-[10px]" />
          <SkBox className="h-[34px] w-20 rounded-lg" />
        </div>
      </div>

      {/* <1024: view switch, search, filters */}
      <div className="space-y-3 lg:hidden">
        <SkBox className="h-11 w-full rounded-[10px] sm:w-[300px]" />
        <SkBox className="h-11 w-full rounded-lg sm:w-[280px]" />
        <div className="flex gap-1.5 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkBox key={i} className="h-9 w-24 shrink-0 rounded-full" />
          ))}
        </div>
      </div>

      {/* <1024: sticky category chip bar */}
      <div className="-mx-4 border-b border-[#EDEDED] px-4 sm:-mx-7 sm:px-7 lg:hidden">
        <div className="flex h-[52px] items-center gap-2 overflow-hidden">
          <SkBox className="h-4 w-14 shrink-0" />
          {Array.from({ length: 4 }).map((_, i) => (
            <SkBox key={i} className="h-9 w-24 shrink-0 rounded-full" />
          ))}
          <SkBox className="ml-auto h-11 w-11 shrink-0 rounded-lg" />
        </div>
      </div>

      {/* Category rail (≥1400) | outline | right column */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-5 xl:grid-cols-[minmax(0,1fr)_360px] min-[87.5rem]:grid-cols-[184px_minmax(0,1fr)_360px] min-[100rem]:grid-cols-[184px_minmax(0,1fr)_380px]">
        <div className="bz-card sticky top-[128px] hidden self-start p-2 min-[1400px]:block" aria-hidden="true">
          <SkBox className="mx-2 mb-1.5 mt-1 h-3 w-20" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex h-10 items-center gap-2 px-2">
              <SkBox className="h-3.5 flex-1" />
              <SkBox className="h-3 w-4" />
            </div>
          ))}
        </div>
        <div className="@container/outline min-w-0 space-y-3">
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, s) => (
              <div key={s} className="bz-card overflow-hidden p-0">
                <div className="flex min-h-[52px] items-center gap-2 border-b border-[#EDEDED] px-3 py-2.5 sm:px-4">
                  <SkBox className="h-11 w-11 shrink-0 pointer-fine:h-8 pointer-fine:w-8" />
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <SkBox className="h-4 w-40" />
                    <SkBox className="h-3 w-14" />
                  </div>
                  <SkBox className="h-[22px] w-9 rounded-full" />
                  <SkBox className="h-11 w-11 shrink-0 pointer-fine:h-8 pointer-fine:w-8" />
                </div>
                <ul className="divide-y divide-[#EDEDED]">
                  {Array.from({ length: 4 }).map((__, r) => (
                    <li key={r} className={`${ROW_BASE} ${ROW_NARROW} ${ROW_MEDIUM} ${ROW_FULL}`}>
                      <div className={CELL_PHOTO}>
                        <SkBox className="h-12 w-12 rounded-[10px] pointer-fine:@min-[480px]/outline:h-10 pointer-fine:@min-[480px]/outline:w-10" />
                      </div>
                      <div className={CELL_NAME}>
                        <SkBox className="h-4 w-40 max-w-full" />
                        <div className={`mt-1.5 ${FROM_MEDIUM}`}>
                          <SkBox className="h-3 w-56 max-w-full" />
                        </div>
                      </div>
                      <div className={CELL_LINE2}>
                        <div className={CELL_PRICE}>
                          <SkBox className="h-4 w-12" />
                        </div>
                        <div className={CELL_STATUS}>
                          <SkBox className="h-8 w-14 rounded-full pointer-fine:h-[28px] pointer-fine:w-[46px]" />
                        </div>
                      </div>
                      <div className={CELL_MENU}>
                        <SkBox className="h-11 w-11 pointer-fine:h-8 pointer-fine:w-8" />
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="flex h-12 items-center border-t border-[#EDEDED] px-4">
                  <SkBox className="h-3.5 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bz-card sticky top-[184px] hidden max-h-[calc(100dvh-200px)] flex-col self-start overflow-hidden p-0 lg:flex min-[1400px]:top-[128px] min-[1400px]:max-h-[calc(100dvh-144px)]">
          <div className="flex h-11 items-center gap-2 border-b border-[#EDEDED] px-3">
            <SkBox className="h-3.5 w-36" />
            <SkBox className="ml-auto h-7 w-24 rounded-lg" />
          </div>
          <div className="px-4 py-4">
            <div
              className="mx-auto w-[288px] max-w-full rounded-[40px] bg-[#EDEDED] xl:w-[308px]"
              style={{ height: 'min(640px, calc(100dvh - 312px))' }}
              aria-hidden="true"
            />
          </div>
          <div className="flex h-[60px] items-center border-t border-[#EDEDED] px-4">
            <SkBox className="h-3 w-full" />
          </div>
        </div>
      </div>
    </SkPageShell>
  );
}
