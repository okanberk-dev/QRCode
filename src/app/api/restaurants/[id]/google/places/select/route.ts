import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPanelActorFromRequest } from '@/lib/auth';
import { canWriteRestaurant } from '@/lib/panel-access';
import { ApiErrors } from '@/lib/api-errors';
import { validateBody } from '@/lib/api/validate';
import { googleReviewUrlFromPlaceId } from '@/lib/google-business';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const Body = z.object({
  placeId: z.string().trim().min(4).max(256),
}).strict();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getPanelActorFromRequest(req);
  if (!actor) return ApiErrors.unauthorized();

  const { id } = await params;
  if (!(await canWriteRestaurant(actor, id))) return ApiErrors.forbidden();

  const body = await req.json().catch(() => null);
  const parsed = validateBody(Body, body);
  if (!parsed.ok) return parsed.response;

  const googleReviewUrl = googleReviewUrlFromPlaceId(parsed.data.placeId);
  try {
    const restaurant = await prisma.restaurant.update({
      where: { id },
      data: {
        googlePlaceId: parsed.data.placeId,
        googleReviewUrl,
        googleEnabled: true,
      },
      select: {
        id: true,
        googlePlaceId: true,
        googleReviewUrl: true,
        googleEnabled: true,
      },
    });
    return NextResponse.json({ restaurant });
  } catch (error) {
    console.error('[google places select] failed', error);
    return ApiErrors.internalError('Google işletmesi kaydedilemedi.');
  }
}
