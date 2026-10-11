import {
  SkBox,
  SkPageHeader,
  SkPageShell,
} from '@/components/ui/skeletons/PageSkeleton';
import { VariableGroupsSkeleton } from './VariableGroupsSkeleton';

/**
 * Legal document variables — back link + PageHeader + info notice +
 * variable group cards. Same 1440 width as page.tsx (CLAUDE.md §40.10).
 */
export default function Loading() {
  return (
    <SkPageShell max={1440} space={5}>
      <SkBox className="h-3 w-32" />
      <SkPageHeader withActions titleWidth="w-56" />
      <SkBox className="h-16 w-full rounded-xl" />
      <VariableGroupsSkeleton />
    </SkPageShell>
  );
}
