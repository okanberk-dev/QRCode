import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { verifyJwt } from '@/lib/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;

  // Real auth verification: verify the JWT signature and contents
  let isAuthenticated = false;
  try {
    if (token) {
      const payload = await verifyJwt(token);
      isAuthenticated = !!payload;
    }
  } catch (e) {
    isAuthenticated = false;
  }

  return (
    <div className="flex h-screen bg-gray-50 flex-col md:flex-row">
      {isAuthenticated && <AdminSidebar />}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
