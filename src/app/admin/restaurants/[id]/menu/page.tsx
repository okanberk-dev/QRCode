import { redirect } from 'next/navigation';

export default async function AdminRestaurantMenuRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/tr/dashboard/restaurants/${id}/menu`);
}
