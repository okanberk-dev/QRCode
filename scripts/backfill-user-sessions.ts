// One-shot data hygiene: backfill placeholder UserSession rows for users that
// don't have any active session record yet (CLAUDE.md §38.79 / §38.2 #3).
//
// Why: `isUserSessionRevoked` is being flipped from "no row → fail-open" to
// "no row → fail-closed". Users whose tokens pre-date the UserSession feature
// will get rejected on next request and need to re-login (intended). This
// script does NOT preserve those legacy cookies — we cannot reproduce their
// tokenHash from User records.
//
// What this script does: for every active user without ANY non-revoked
// UserSession row, insert one placeholder row marked `userAgent='backfill',
// ipAddress='backfill'` with a synthetic tokenHash that cannot collide with
// any real cookie's SHA-256. The placeholder doesn't authenticate any live
// session — it just guarantees the table has at least one row per user, so
// downstream audit queries ("does user X have any session at all?") get
// meaningful results without dealing with an empty-list edge case.
//
// Usage (local or one-off prod shell):
//   DATABASE_URL=... npx tsx scripts/backfill-user-sessions.ts
//
// Idempotent — re-runs are no-ops (skip users that already have any session).

import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';

function syntheticTokenHash(userId: string): string {
  // Synthetic hash: prefixed with 'legacy:' so it can't collide with a real
  // SHA-256 of any JWT (jose tokens are base64url-encoded JWS strings; their
  // hash space is the full 64-hex range, never starts with the literal
  // 'legacy:' prefix). The userId + timestamp + random suffix guarantees
  // uniqueness across multiple backfill runs for different users.
  const seed = `legacy:${userId}:${Date.now()}:${randomBytes(8).toString('hex')}`;
  return createHash('sha256').update(seed).digest('hex');
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    console.log(`[backfill] Found ${users.length} active users`);

    let alreadyHaveSession = 0;
    let created = 0;

    for (const user of users) {
      const existing = await prisma.userSession.findFirst({
        where: { userId: user.id, revokedAt: null },
        select: { id: true },
      });

      if (existing) {
        alreadyHaveSession++;
        continue;
      }

      await prisma.userSession.create({
        data: {
          userId: user.id,
          tokenHash: syntheticTokenHash(user.id),
          userAgent: 'backfill',
          ipAddress: 'backfill',
          // lastSeenAt + createdAt + revokedAt have schema defaults
        },
      });
      created++;
    }

    console.log(
      `[backfill] Done. ${alreadyHaveSession} users already had an active session; ${created} placeholder rows created.`
    );

    if (created > 0) {
      console.log(
        '[backfill] NOTE: placeholder rows do NOT preserve any live cookies. ' +
          'After the auth.ts flip is deployed, every existing user must log in again. ' +
          'Operator should deploy during a low-traffic window.'
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[backfill] Failed:', err);
  process.exit(1);
});
