import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canAccessRestaurant, canWriteFeedback } from '@/lib/panel-access';
import { validateBody } from '@/lib/api/validate';

// §38.57 — /api/feedback/[id] PATCH endpoint: isRead + isPending toggle.
// Yorumlar Inbox 5-tab UI'sı (CLAUDE.md §38.56 Phase 2) için Okunmamış /
// Beklemede tab kategorilerini yönetir. Schema migration 20260505230000
// (Feedback.isRead + isPending) bu endpoint ile yazılır.
//
// Disiplin: §28.3.3 mix-mode (mevcut elle validation pattern, yeni
// Zod .strict() ile isRead/isPending). IDOR canWriteFeedback (CLAUDE.md
// §4 + §37.2 A-H). Audit log gerekli değil (kullanıcı tercihi state,
// destructive değil — admin destructive bulk için §28.4 paterni).

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PatchBody = z
  .object({
    isRead: z.boolean().optional(),
    isPending: z.boolean().optional(),
  })
  .strict();

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // IDOR — feedback fetch + access check (§37.2 A pattern)
  const feedback = await prisma.feedback.findUnique({
    where: { id },
    select: { id: true, restaurantId: true },
  });
  if (!feedback) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (actor.role !== 'superadmin') {
    if (!feedback.restaurantId) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    const ok = await canAccessRestaurant(actor, feedback.restaurantId);
    if (!ok) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  }

  // viewer rolü write yapamaz (canWriteFeedback)
  if (feedback.restaurantId) {
    const canWrite = await canWriteFeedback(actor, feedback.restaurantId);
    if (!canWrite) {
      return NextResponse.json({ error: 'forbidden_role' }, { status: 403 });
    }
  }

  const body = await req.json().catch(() => null);
  const parsed = validateBody<z.infer<typeof PatchBody>>(PatchBody, body);
  if (!parsed.ok) return parsed.response;

  const updates: { isRead?: boolean; isPending?: boolean } = {};
  if (parsed.data.isRead !== undefined) updates.isRead = parsed.data.isRead;
  if (parsed.data.isPending !== undefined) updates.isPending = parsed.data.isPending;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no_updates' }, { status: 400 });
  }

  const updated = await prisma.feedback.update({
    where: { id },
    data: updates,
    select: { id: true, isRead: true, isPending: true },
  });

  return NextResponse.json({ ok: true, feedback: updated });
}
