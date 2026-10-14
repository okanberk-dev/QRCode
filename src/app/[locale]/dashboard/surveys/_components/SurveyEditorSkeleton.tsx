// Surveys editor skeleton — shared by `new/loading.tsx` and `[id]/edit/loading.tsx`.
//
// The wrapper matches SurveyEditorClient exactly (`mx-auto max-w-[1280px]
// space-y-5 px-4 py-6 sm:px-7 lg:py-8`), so the swap has no layout shift
// (CLAUDE.md §40.10): back link row, header, then the form column and — from
// `lg` — the phone preview column.

import { SkBox, SkPageHeader, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';

export default function SurveyEditorSkeleton() {
  return (
    <SkPageShell max={1280} space={5}>
      <div className="flex min-h-11 items-center">
        <SkBox className="h-3 w-24" />
      </div>

      <SkPageHeader titleWidth="w-56" />

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-6">
        <div className="min-w-0 space-y-5">
          {/* Title card */}
          <div className="bz-card space-y-4 p-4 sm:p-5">
            <div className="space-y-2">
              <SkBox className="h-3 w-24" />
              <SkBox className="h-3 w-64 max-w-full" />
              <SkBox className="h-11 w-full" />
            </div>
            <SkBox className="h-5 w-36" />
            <div className="border-t border-[#EDEDED] pt-3">
              <SkBox className="h-4 w-48" />
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <SkBox className="h-5 w-20" />
              <SkBox className="h-4 w-40" />
            </div>
            {[0, 1, 2].map((i) => (
              <div key={i} className="bz-card space-y-3 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <SkBox className="h-7 w-7 rounded-full" />
                    <SkBox className="h-11 w-36 rounded-full" />
                  </div>
                  <SkBox className="h-11 w-11 rounded-full" />
                </div>
                <SkBox className="h-[68px] w-full" />
                <div className="border-t border-[#EDEDED] pt-1">
                  <SkBox className="my-2 h-7 w-56" />
                </div>
              </div>
            ))}
            <SkBox className="h-[92px] w-full rounded-xl" />
          </div>

          {/* Settings card */}
          <div className="bz-card flex min-h-[64px] items-center justify-between gap-3 px-4 py-3 sm:px-5">
            <div className="space-y-2">
              <SkBox className="h-4 w-40" />
              <SkBox className="h-3 w-64 max-w-full" />
            </div>
            <SkBox className="h-4 w-4" />
          </div>
        </div>

        {/* Phone preview column (desktop only) */}
        <div className="hidden self-start lg:sticky lg:top-[88px] lg:block">
          <div className="mb-2 flex justify-center">
            <SkBox className="h-3 w-44" />
          </div>
          <div className="mx-auto aspect-[9/16] w-full max-w-[360px] rounded-[32px] bg-[#EDEDED]" aria-hidden="true" />
        </div>
      </div>
    </SkPageShell>
  );
}
