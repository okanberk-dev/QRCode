// Stage 119 §38.199 — Admin trigger to seed/refresh the global campaign template
// catalog. Reuses scripts/seed-customer-campaign-templates.ts logic via shared
// helper (CLAUDE.md §21.13 — no self-fetch antipattern).

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';
import { rateLimit } from '@/lib/rate-limit';
import { writeAdminAuditLog } from '@/lib/audit-log';
import { runCampaignTemplateSeed } from '@/lib/customer-campaign-templates/seed-runner';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();
  const adminId = String(admin.id);

  const rl = await rateLimit(`admin:campaign-template-seed:${adminId}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const t0 = Date.now();
  let result;
  try {
    result = await runCampaignTemplateSeed({ actorId: adminId });
  } catch (err) {
    console.error('[admin:campaign-template-seed] failed', {
      adminId,
      errorName: err instanceof Error ? err.name : 'Unknown',
      errorMessage: err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200),
    });
    return NextResponse.json({ error: 'seed_failed' }, { status: 500 });
  }
  const durationMs = Date.now() - t0;

  await writeAdminAuditLog({
    actorId: adminId,
    actorSource: 'admin',
    action: 'admin.campaign_templates.seed',
    payload: { ...result, durationMs },
  }).catch(() => undefined);

  return NextResponse.json({ ...result, durationMs });
}
