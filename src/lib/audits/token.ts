// CLAUDE.md §42 — Audit assignment token üretimi.
//
// AuditAssignment.token: public link akışı (`assigneeType in {candidate,link}`)
// için 32-byte hex token. team-invite paterniyle aynı (CLAUDE.md §40.4.F):
// UNIQUE çakışmasında 3 deneme; pratikte hiç çatışmaz, defansif loop.

import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';

export async function generateAuditAssignmentToken(): Promise<string> {
  for (let i = 0; i < 3; i += 1) {
    const token = randomBytes(32).toString('hex');
    const exists = await prisma.auditAssignment.findUnique({
      where: { token },
      select: { id: true },
    });
    if (!exists) return token;
  }
  return randomBytes(32).toString('hex');
}
