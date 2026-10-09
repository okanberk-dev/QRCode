import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { getScopedRestaurantIds, getTeamMemberRole } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';
import { validateBody } from '@/lib/api/validate';
import { normalizeRestaurantParam } from '@/lib/active-business';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ReadAllBody = z
  .object({
    rating: z.enum(['low', 'all']).default('low'),
    restaurantId: z.string().trim().min(1).optional(),
  })
  .strict();

export async function POST(req: NextRequest) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) {
    return ApiErrors.unauthorized();
  }

  // Marking the whole inbox read is a WRITE — same viewer gate as the
  // single-item PATCH (`canWriteFeedback`): a team_member with the
  // 'viewer' role (or no active membership) is read-only. Role is
  // workspace-wide, so one lookup covers every scoped restaurant.
  if (actor.role === 'team_member') {
    const memberRole = await getTeamMemberRole(actor);
    if (!memberRole || memberRole === 'viewer') {
      return NextResponse.json({ error: 'forbidden_role' }, { status: 403 });
    }
  }

  const body = await req.json().catch(() => ({}));
  const parsed = validateBody<z.infer<typeof ReadAllBody>>(ReadAllBody, body);
  if (!parsed.ok) return parsed.response;

  const requestedRestaurantId = normalizeRestaurantParam(parsed.data.restaurantId);
  const scopedIds = await getScopedRestaurantIds(actor);
  const where: Prisma.FeedbackWhereInput = { isRead: false };

  if (parsed.data.rating === 'low') {
    where.rating = { lte: 3 };
  }

  if (scopedIds === null) {
    if (requestedRestaurantId) {
      where.restaurantId = requestedRestaurantId;
    }
  } else {
    if (scopedIds.length === 0) {
      return NextResponse.json({ ok: true, updated: 0 });
    }
    if (requestedRestaurantId) {
      if (!scopedIds.includes(requestedRestaurantId)) {
        return ApiErrors.forbidden();
      }
      where.restaurantId = requestedRestaurantId;
    } else {
      where.restaurantId = { in: scopedIds };
    }
  }

  const result = await prisma.feedback.updateMany({
    where,
    data: { isRead: true },
  });

  return NextResponse.json({ ok: true, updated: result.count });
}
