import RestaurantMobileNav from '@/components/dashboard/RestaurantMobileNav';
import type { Locale } from '@/lib/translations';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;

  return (
    <div className="min-h-screen bg-[#FCFBF7] flex flex-col pb-20 sm:pb-0">
      <div className="flex-1">{children}</div>
      <RestaurantMobileNav locale={locale} />
    </div>
  );
}
