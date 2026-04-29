import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';

// GET /api/admin/members/[id]/team — TeamMember rows belonging to this owner
// (CLAUDE.md §4.5 owner-side team). Surfaces email + role + status + lastSeen.
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminFromRequest(req);
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { id } = await params;

  const members = await prisma.teamMember.findMany({
    where: { ownerId: id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      locations: true,
      lastSeenAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    data: members.map((m) => ({
      id: m.id,
      email: m.email,
      name: m.name,
      role: m.role,
      status: m.status,
      locations: m.locations,
      lastSeenAt: m.lastSeenAt?.toISOString() ?? null,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}
