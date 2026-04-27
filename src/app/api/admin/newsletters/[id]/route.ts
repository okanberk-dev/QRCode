import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { ApiErrors } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

/**
 * Permanent delete a newsletter subscriber row. Used for KVKK / GDPR
 * "right-to-erasure" requests — soft-delete (unsubscribedAt) keeps the row
 * for re-subscribe and audit, but a real erasure request must wipe the row
 * entirely.
 *
 * Superadmin only. Idempotent (404 if already gone).
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return ApiErrors.unauthorized();
  if (admin.role !== 'superadmin') return ApiErrors.forbidden();

  const { id } = await params;
  if (!id) return ApiErrors.badRequest('id_required');

  try {
    await prisma.newsletterSubscriber.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = (err as { code?: string }).code === 'P2025'
      ? 'not_found'
      : 'delete_failed';
    const status = message === 'not_found' ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
