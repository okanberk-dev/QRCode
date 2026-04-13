import { cookies } from 'next/headers';
import AdminMobileNav from '@/components/admin/AdminMobileNav';
import { AdminTranslationProvider } from '@/components/admin/AdminTranslationProvider';
import type { Locale } from '@/lib/translations';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const adminLocale = cookieStore.get('ADMIN_LOCALE')?.value || locale;

  return (
    <AdminTranslationProvider initialLocale={adminLocale as any}>
      <div className="min-h-screen bg-[#FCFBF7] flex flex-col pb-20 sm:pb-0">
        <div className="flex-1">
          {children}
        </div>
        <AdminMobileNav />
      </div>
    </AdminTranslationProvider>
  );
}
