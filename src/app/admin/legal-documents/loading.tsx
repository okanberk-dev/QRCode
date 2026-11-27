import {
  SkBox,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';
import { LegalDocGroupsSkeleton } from './LegalDocGroupsSkeleton';

/**
 * Admin legal documents — PageHeader + search/status row + draft notice +
 * document-group cards. Mirrors page.tsx (CLAUDE.md §40.10).
 */
export default function Loading() {
  return (
    <SkPageShell max={1440} space={5}>
      <SkPageHeader withActions titleWidth="w-72" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SkBox className="h-10 w-full sm:max-w-[320px]" />
        <SkBox className="h-9 w-72 max-w-full" />
      </div>
      <SkBox className="h-20 w-full rounded-[20px]" />
      <LegalDocGroupsSkeleton />
    </SkPageShell>
  );
}
