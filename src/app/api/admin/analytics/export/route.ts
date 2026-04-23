// SCAFFOLDED: workspace-wide analytics export for admin/superadmin.
// Owner-scope export lives at `/api/analytics/export`; this endpoint returns
// the same CSV/PDF shape but aggregated across every restaurant the actor
// can access. Wire up when the AnalyticsExport model (see scaffolding.ts)
// is ready.
import { NextRequest } from 'next/server';
import { scaffoldedResponse } from '@/lib/scaffolding';
import { getPanelActorFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return new Response('Unauthorized', { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format') || 'csv';
  const range = searchParams.get('range') || '90d';
  return scaffoldedResponse('src/app/api/admin/analytics/export/route.ts', {
    requested: { format, range, actorRole: actor.role },
  });
}
