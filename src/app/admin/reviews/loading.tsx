'use client';

import { useAdminTranslation } from '@/components/admin/AdminTranslationProvider';
import { AdminReviewsSkeleton } from './_components/AdminReviewsChrome';

/**
 * Admin reviews inbox skeleton — §40.10: a structural clone of page.tsx
 * (full-bleed header + toolbar + list/detail split), not the old KPI + table
 * skeleton, so nothing jumps on hydration. Client component only to read the
 * admin locale for the static header copy.
 */
export default function Loading() {
  const { locale } = useAdminTranslation();
  return <AdminReviewsSkeleton isTr={locale === 'tr'} />;
}
