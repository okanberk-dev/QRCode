import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { detectLocaleFromAcceptLanguage } from '@/lib/translations';

export default async function AdminRestaurantMenuRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const h = await headers();
  const locale = detectLocaleFromAcceptLanguage(h.get('accept-language'));
  redirect(`/${locale}/dashboard/restaurants/${id}/menu`);
}
