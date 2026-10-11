import { BlogEditorSkeleton } from '@/components/admin/BlogPostEditor';

/**
 * Admin blog editor — same header bar + 2-column (content / 360px settings
 * rail) grid as BlogPostEditor, which also renders this skeleton while an
 * existing post loads (CLAUDE.md §40.10).
 */
export default function Loading() {
  return <BlogEditorSkeleton />;
}
