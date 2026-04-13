import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
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
  const token = cookieStore.get('admin_token')?.value;
  const adminLocale = cookieStore.get('ADMIN_LOCALE')?.value || 'tr';

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

  // Not authenticated — send to login (but not if already on /admin login or trial page)
  // Layout wraps all /admin/* so we only redirect if needed
  if (!isAuthenticated) {
    // Children will be the login page; don't redirect to avoid loop
  }

  // If authenticated as restaurant_owner with trial expired, redirect to trial-expired page
  // (Only if not already on /trial-expired)
  if (isAuthenticated && payload?.role === 'restaurant_owner' && payload?.plan === 'trial') {
    // We can't easily check trialEndsAt here without another DB call on every request.
    // That check is done client-side in the sidebar and API. For server-side, we rely on
    // the login API to block expired trial logins (which it already does).
  }

  return (
    <AdminTranslationProvider initialLocale={adminLocale}>
      <div className="flex flex-col md:flex-row h-screen bg-[#FCFBF7] overflow-hidden font-sans selection:bg-[#FDBF1D]/30">
        {isAuthenticated && <AdminSidebar />}
        <div className={`flex-1 overflow-auto flex flex-col ${!isAuthenticated ? 'items-center justify-center p-4 sm:p-6' : 'p-4 sm:p-10 mb-20 md:mb-0'}`}>
          <div className={isAuthenticated ? "max-w-7xl mx-auto w-full" : "w-full"}>
            {children}
          </div>
        </div>
        {isAuthenticated && <AdminMobileNav />}
      </div>
    </AdminTranslationProvider>
  );
}
