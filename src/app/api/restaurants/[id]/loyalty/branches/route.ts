// Branches of a chain loyalty card (CLAUDE.md §61): the same card is valid
// at the owner's other businesses. Managed at the home business. Linking
// needs manage access at the home business and at the branch.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateBody } from '@/lib/api/validate';
import { writePanelAuditLog } from '@/lib/audit-log';
import { withServerTiming } from '@/lib/server-timing';
import { branchEditRefused, gateLoyaltyRoute, loyaltyErrorResponse } from '@/lib/loyalty-route';
import {
  linkLoyaltyBranch,
  loadLoyaltyChain,
  loadLoyaltyProgram,
  loyaltyAccess,
  loyaltyBranchCandidates,
  unlinkLoyaltyBranch,
} from '@/lib/loyalty-server';

type Ctx = { params: Promise<{ id: string }> };

const Body = z.object({ restaurantId: z.string().min(1).max(40) }).strict();

type HomeProgram =
  | { ok: true; program: NonNullable<Awaited<ReturnType<typeof loadLoyaltyProgram>>> }
  | { ok: false; response: NextResponse };

async function homeProgram(id: string): Promise<HomeProgram> {
  const program = await loadLoyaltyProgram(id);
  if (!program) return { ok: false, response: NextResponse.json({ error: 'NO_PROGRAM', code: 'NO_PROGRAM' }, { status: 404 }) };
  const branch = branchEditRefused(program, id);
  if (branch) return { ok: false, response: branch };
  return { ok: true, program };
}

async function handleGET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const gate = await gateLoyaltyRoute(req, id, 'read');
  if (!gate.ok) return gate.response;
  const home = await homeProgram(id);
  if (!home.ok) return home.response;
  const [chain, candidates] = await Promise.all([
    loadLoyaltyChain(home.program, id),
    gate.access.manage ? loyaltyBranchCandidates(home.program) : [],
  ]);
  return NextResponse.json({ chain, candidates }, { headers: { 'Cache-Control': 'private, no-store' } });
}

async function handlePOST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const gate = await gateLoyaltyRoute(req, id, 'manage');
  if (!gate.ok) return gate.response;
  const parsed = validateBody<z.infer<typeof Body>>(Body, await req.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const branchId = parsed.data.restaurantId;
  const home = await homeProgram(id);
  if (!home.ok) return home.response;
  // The branch's own manager must be the one linking it (same owner is checked again below).
  const branchAccess = await loyaltyAccess(gate.actor, branchId);
  if (!branchAccess.manage) return NextResponse.json({ error: 'forbidden', code: 'MANAGER_ONLY' }, { status: 403 });
  try {
    await linkLoyaltyBranch(home.program, branchId);
    await writePanelAuditLog(gate.actor, 'owner.loyalty.branch.link', id, { restaurantId: id, branchRestaurantId: branchId });
    return NextResponse.json({ chain: await loadLoyaltyChain(home.program, id), candidates: await loyaltyBranchCandidates(home.program) });
  } catch (err) {
    return loyaltyErrorResponse(err);
  }
}

async function handleDELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const gate = await gateLoyaltyRoute(req, id, 'manage');
  if (!gate.ok) return gate.response;
  const branchId = req.nextUrl.searchParams.get('restaurantId') ?? '';
  if (!branchId || branchId.length > 40) return NextResponse.json({ error: 'validation_error' }, { status: 400 });
  const home = await homeProgram(id);
  if (!home.ok) return home.response;
  const removed = await unlinkLoyaltyBranch(home.program, branchId);
  if (removed) await writePanelAuditLog(gate.actor, 'owner.loyalty.branch.unlink', id, { restaurantId: id, branchRestaurantId: branchId });
  return NextResponse.json({ chain: await loadLoyaltyChain(home.program, id), candidates: await loyaltyBranchCandidates(home.program) });
}

export const GET = withServerTiming(handleGET);
export const POST = withServerTiming(handlePOST);
export const DELETE = withServerTiming(handleDELETE);
