// Surveys editor skeleton — shared by `new/loading.tsx` and `[id]/edit/loading.tsx`.
//
// The wrapper matches SurveyEditorClient exactly (`mx-auto max-w-[1280px]
// space-y-5 px-4 py-6 sm:px-7 lg:py-8`), so the swap has no layout shift
// (CLAUDE.md §40.10): back link row, header (eyebrow · title · description ·
// read-only business line), then the form column and — from `lg` — the phone
// preview column.

import { SkBox, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';

export default function SurveyEditorSkeleton() {
  return (
    <SkPageShell max={1280} space={5}>
      <div className="flex min-h-11 items-center">
        <SkBox className="h-3 w-24" />
      </div>

      <div className="mb-5 space-y-3">
        <SkBox className="h-3 w-24" />
        <SkBox className="h-8 w-56 max-w-full" />
        <div className="space-y-2">
          <SkBox className="h-4 w-80 max-w-full" />
          <SkBox className="h-4 w-48 max-w-full" />
        </div>
      </div>

      {/* Same breakpoint as the editor: two columns only on a wide AND tall screen. */}
      <div className="[@media(min-width:1024px)_and_(min-height:740px)]:grid [@media(min-width:1024px)_and_(min-height:740px)]:grid-cols-[minmax(0,1fr)_380px] [@media(min-width:1024px)_and_(min-height:740px)]:items-start [@media(min-width:1024px)_and_(min-height:740px)]:gap-6">
        <div className="min-w-0 space-y-5">
          {/* Title card */}
          <div className="bz-card space-y-5 p-5 sm:p-7">
            <div className="space-y-2">
              <SkBox className="h-3 w-24" />
              <SkBox className="h-3 w-64 max-w-full" />
              <SkBox className="h-[46px] w-full rounded-full" />
            </div>
            <SkBox className="h-11 w-40 rounded-full" />
          </div>

          {/* Questions */}
          <div className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <SkBox className="h-6 w-24" />
              <SkBox className="h-4 w-40" />
            </div>
            {[0, 1, 2].map((i) => (
              <div key={i} className="bz-card space-y-3 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <SkBox className="h-7 w-7 rounded-full" />
                    <SkBox className="h-11 w-36 rounded-full" />
                  </div>
                  <SkBox className="h-11 w-11 rounded-full" />
                </div>
                <SkBox className="h-[68px] w-full" />
                <div className="border-t border-pn-line pt-1">
                  <SkBox className="my-2 h-7 w-56" />
                </div>
              </div>
            ))}
            <div className="bz-card space-y-3 p-5 sm:p-6">
              <SkBox className="h-4 w-28" />
              <div className="flex flex-wrap gap-2">
                {['w-28', 'w-24', 'w-32', 'w-20', 'w-28'].map((w, i) => (
                  <SkBox key={i} className={`h-11 ${w} rounded-full`} />
                ))}
              </div>
            </div>
          </div>

          {/* Settings card */}
          <div className="bz-card flex min-h-[72px] items-center justify-between gap-3 px-5 py-4 sm:px-7">
            <div className="space-y-2">
              <SkBox className="h-5 w-48" />
              <SkBox className="h-3.5 w-64 max-w-full" />
            </div>
            <SkBox className="h-10 w-10 rounded-full" />
          </div>
        </div>

        {/* Phone preview column (desktop only) */}
        <div className="hidden self-start [@media(min-width:1024px)_and_(min-height:740px)]:sticky [@media(min-width:1024px)_and_(min-height:740px)]:top-[88px] [@media(min-width:1024px)_and_(min-height:740px)]:block">
          <div className="mb-2 flex justify-center">
            <SkBox className="h-3 w-44" />
          </div>
          <div className="mx-auto aspect-[9/16] w-full max-w-[360px] rounded-[32px] bg-pn-line" aria-hidden="true" />
        </div>
      </div>
    </SkPageShell>
  );
}
