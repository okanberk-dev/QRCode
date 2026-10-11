import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth';
import SuperadminBlock from '@/components/admin/SuperadminBlock';
import TeamClient from './TeamClient';

export const dynamic = 'force-dynamic';

/**
 * Team & roles is a workspace feature. The role is resolved on the server
 * from the admin cookie so a superadmin gets the "not for admin" card
 * immediately instead of a blank page while /api/admin/me answers.
 */
export default async function AdminTeamPage() {
  const token = (await cookies()).get('admin_token')?.value;
  const payload = token ? await verifyJwt(token) : null;
  const role = typeof payload?.role === 'string' ? payload.role : null;

  return (
    <SuperadminBlock initialRole={role}>
      <TeamClient />
    </SuperadminBlock>
  );
}
