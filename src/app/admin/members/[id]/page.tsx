import { cookies } from 'next/headers';
import { verifyAdminTokenForLayout } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { loadAdminMemberDetail } from '@/lib/admin-member-detail';
import MemberDetailClient, { type MemberDetail } from './MemberDetailClient';

export const dynamic = 'force-dynamic';

/**
 * Owner detail. §40.10 server hydration: the member payload is rendered with
 * the page, so the overview panels (support, activation, recent feedback,
 * audit) mount on first paint and their requests no longer wait for a
 * client round-trip. Same gate as GET /api/admin/members/[id] (admin token
 * incl. password-rotation staleness + `members:read`); any other case keeps
 * the client fetch, which renders the same error states as before.
 */
export default async function AdminMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const adminToken = cookieStore.get('admin_token')?.value;

  let initialData: MemberDetail | undefined;
  if (adminToken) {
    try {
      const payload = await verifyAdminTokenForLayout(adminToken);
      if (payload && (await hasPermission(payload.id, 'members', 'read'))) {
        const detail = await loadAdminMemberDetail(id);
        if (detail) {
          // JSON round-trip: the client receives exactly what the API sends
          // (ISO date strings), never Date instances.
          initialData = JSON.parse(JSON.stringify(detail)) as MemberDetail;
        }
      }
    } catch (error) {
      console.error('[AdminMemberDetailPage] hydration failed', {
        errorName: error instanceof Error ? error.name : 'unknown',
      });
      initialData = undefined;
    }
  }

  return <MemberDetailClient id={id} initialData={initialData} />;
}
