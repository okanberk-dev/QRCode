import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth';
import SuperadminBlock from '@/components/admin/SuperadminBlock';
import SettingsClient from './SettingsClient';

export const dynamic = 'force-dynamic';

/**
 * Workspace settings are a workspace feature (restaurant_owner admins).
 * Resolve the role on the server from the admin cookie so a superadmin gets
 * the "not for admin" card immediately — the client-side gate used to show a
 * second, differently shaped skeleton after loading.tsx while /api/admin/me
 * answered (CLAUDE.md §40.10; same pattern as /admin/team).
 */
export default async function AdminSettingsPage() {
  const token = (await cookies()).get('admin_token')?.value;
  const payload = token ? await verifyJwt(token) : null;
  const role = typeof payload?.role === 'string' ? payload.role : null;

  return (
    <SuperadminBlock initialRole={role}>
      <SettingsClient />
    </SuperadminBlock>
  );
}
