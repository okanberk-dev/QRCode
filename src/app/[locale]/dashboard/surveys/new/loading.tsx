import SurveyEditorSkeleton from '../_components/SurveyEditorSkeleton';

/**
 * New survey — same wrapper as the editor page (`max-w-[1280px]`, two columns
 * from `lg`), so loading → loaded has no layout shift (CLAUDE.md §40.10).
 */
export default function Loading() {
  return <SurveyEditorSkeleton />;
}
