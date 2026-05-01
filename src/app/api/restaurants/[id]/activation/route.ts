import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantAccess } from '@/lib/menu-access';
import { ApiErrors } from '@/lib/api-errors';
import { computeActivation } from '@/lib/activation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Owner activation checklist endpoint (CLAUDE.md §19.5 + §23.7 Phase 11.29).
//
// GET — checklist state + 5-step status + percentage.
// PATCH — manuel step mark (qr printed/shared, qr downloaded) + dismiss/undismiss.
//
// IDOR: requireRestaurantAccess. No public cache (owner-scoped, KVKK).

const VALID_ACTIONS = new Set([
  'mark_qr_printed',
  'unmark_qr_printed',
  'dismiss',
  'undismiss',
]);

async function loadActivationData(restaurantId: string) {
  return Promise.all([
    prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        name: true,
        category: true,
        googleReviewUrl: true,
        googleEnabled: true,
      },
    }),
    prisma.restaurantActivationState.findUnique({
      where: { restaurantId },
      select: {
        qrPrintedSharedAt: true,
        dismissedAt: true,
      },
    }),
    prisma.qrGeneration.count({ where: { restaurantId } }),
    prisma.feedback.count({ where: { restaurantId } }),
  ]);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const gate = await requireRestaurantAccess(req, id);
  if (!gate.ok) return gate.res;

  const [restaurant, state, qrGenerationCount, feedbackCount] = await loadActivationData(id);
  if (!restaurant) return ApiErrors.notFound('İşletme bulunamadı');

  return NextResponse.json(
    computeActivation({ restaurant, state, qrGenerationCount, feedbackCount }),
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const gate = await requireRestaurantAccess(req, id);
  if (!gate.ok) return gate.res;

  let body: { action?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return ApiErrors.badRequest('Geçersiz JSON', 'INVALID_JSON');
  }

  const action = typeof body.action === 'string' ? body.action : '';
  if (!VALID_ACTIONS.has(action)) {
    return ApiErrors.badRequest('Geçersiz işlem', 'INVALID_ACTION');
  }

  const now = new Date();
  let updateData: {
    qrPrintedSharedAt?: Date | null;
    dismissedAt?: Date | null;
  } = {};
  switch (action) {
    case 'mark_qr_printed':
      updateData = { qrPrintedSharedAt: now };
      break;
    case 'unmark_qr_printed':
      updateData = { qrPrintedSharedAt: null };
      break;
    case 'dismiss':
      updateData = { dismissedAt: now };
      break;
    case 'undismiss':
      updateData = { dismissedAt: null };
      break;
  }

  await prisma.restaurantActivationState.upsert({
    where: { restaurantId: id },
    create: { restaurantId: id, ...updateData },
    update: updateData,
  });

  const [restaurant, state, qrGenerationCount, feedbackCount] = await loadActivationData(id);
  if (!restaurant) return ApiErrors.notFound('İşletme bulunamadı');

  return NextResponse.json(
    computeActivation({ restaurant, state, qrGenerationCount, feedbackCount }),
  );
}
