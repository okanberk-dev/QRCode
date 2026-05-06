import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth';
import { hasPermissions, RESOURCES, ACTIONS, type AdminAction, type AdminResource } from '@/lib/rbac';

// Stage A2 §38.94 — current actor's permission map. Used by AdminSidebar
// (and possibly other client surfaces) to gate UI items at render time.
//
// Returns full matrix as `{ "resource:action": boolean }` so client can do
// O(1) lookup. Superadmin gets all true automatically (helper bypass).
//
// Cache: short window (15s). Permission changes propagate within a minute
// (rbac helper has 60s TTL); UI optionally re-fetches on focus.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const checks: Array<{ resource: AdminResource; action: AdminAction }> = [];
  for (const r of RESOURCES) {
    for (const a of ACTIONS) {
      checks.push({ resource: r, action: a });
    }
  }

  const result = await hasPermissions(admin.id, checks);

  return NextResponse.json(
    {
      role: admin.role,
      permissions: result,
    },
    {
      headers: {
        'Cache-Control': 'private, s-maxage=15, stale-while-revalidate=60',
      },
    },
  );
}
