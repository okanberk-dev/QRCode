import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminMobileNav from '@/components/admin/AdminMobileNav';
import { verifyJwt } from '@/lib/auth';
import { AdminTranslationProvider } from '@/components/admin/AdminTranslationProvider';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const token = cookieStore.get('admin_token')?.value;
  const adminLocale = cookieStore.get('ADMIN_LOCALE')?.value || 'tr';

  const adminPath = (headerStore.get('x-admin-path') || headerStore.get('next-url') || '/admin').split('?')[0];
  const isAdminLoginRoute = adminPath === '/admin';
  const isProtectedAdminRoute = adminPath.startsWith('/admin/') && !isAdminLoginRoute;

  let isAuthenticated = false;
  let payload: any = null;

  try {
    if (token) {
      payload = await verifyJwt(token);
      isAuthenticated = !!payload;
    }
  } catch (e) {
    isAuthenticated = false;
  }

  // Unauthenticated users can only access /admin (login page)
  if (!isAuthenticated && isProtectedAdminRoute) {
    redirect('/admin');
  }

  // If authenticated as restaurant_owner with trial expired, redirect to trial-expired page
  if (isAuthenticated && payload?.role === 'restaurant_owner' && payload?.plan === 'trial') {
    // Logic for trial expiration check could go here if needed.
  }

  // Determine if we should show the sidebar.
  // We hide it if not authenticated.
  const showSidebar = isAuthenticated;

  return (
    <AdminTranslationProvider initialLocale={adminLocale as any}>
      <div className="flex flex-col lg:flex-row h-screen bg-[#FCFBF7] overflow-hidden font-sans selection:bg-[#FDBF1D]/30">
        {showSidebar && <AdminSidebar />}
        <div className={`flex-1 overflow-auto flex flex-col ${!showSidebar ? 'items-center justify-center' : 'p-3 sm:p-10 mb-14 lg:mb-0 pb-10 lg:pb-0'}`}>
          <div className={showSidebar ? 'max-w-7xl mx-auto w-full' : 'w-full max-w-full'}>
            {children}
          </div>
        </div>
        {showSidebar && <AdminMobileNav />}
      </div>
    </AdminTranslationProvider>
  );
}
