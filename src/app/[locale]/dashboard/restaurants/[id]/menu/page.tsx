'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { CustomerPreviewScreen } from './_components/preview/CustomerPreviewScreen';
import { MenuStudio } from './_components/studio/MenuStudio';

/**
 * Owner Menu Studio (CLAUDE.md §12.1). `?preview=1` shows the draft menu full
 * screen as a customer would see it; everything else is the studio.
 */
export default function RestaurantMenuPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const locale: 'tr' | 'en' = params?.locale === 'en' ? 'en' : 'tr';
  return searchParams?.get('preview') === '1' ? (
    <CustomerPreviewScreen restaurantId={id} locale={locale} />
  ) : (
    <MenuStudio restaurantId={id} locale={locale} />
  );
}
