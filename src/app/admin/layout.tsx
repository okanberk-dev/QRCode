import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;

  // Simple auth check. Real app should verify signature here.
  const isAuthenticated = !!token;

  return (
    <div className="flex h-screen bg-gray-50 flex-col md:flex-row">
      {isAuthenticated && <AdminSidebar />}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
