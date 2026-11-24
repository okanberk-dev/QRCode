// Short-lived owner + superadmin cookies for the checks (CLAUDE.md §55).
// Signed with JWT_SECRET like src/lib/auth.ts; the owner token gets the
// UserSession row the auth check needs. Tokens never leave this process;
// call cleanup() to delete the session row.
import * as jose from 'jose';
import { sha256 } from './common.mjs';

export async function openSessions(prisma) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET missing');
  const key = new TextEncoder().encode(secret);
  const [owner] = await prisma.$queryRawUnsafe(
    `select u.id, u.email, u.role, u.plan
       from users u join restaurants r on r.user_id = u.id
       left join feedback f on f.restaurant_id = r.id
      where u.role = 'restaurant_owner' and u.is_active
      group by u.id order by count(f.id) desc, u.created_at limit 1`);
  if (!owner) throw new Error('no owner found');
  const [restaurant] = await prisma.$queryRawUnsafe(
    `select r.id, r.slug from restaurants r left join google_reviews g on g.restaurant_id = r.id
      where r.user_id = $1 group by r.id order by count(g.id) desc, r.created_at limit 1`, owner.id);
  const [admin] = await prisma.$queryRawUnsafe(
    `select id, username from admin_users where role = 'superadmin' order by id limit 1`);
  const sign = (payload) => new jose.SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('20m').sign(key);
  const userToken = await sign({ userId: owner.id, email: owner.email, role: owner.role, plan: owner.plan });
  const session = await prisma.userSession.create({
    data: { userId: owner.id, tokenHash: sha256(userToken), userAgent: 'buaze-db-migration-check' },
  });
  const adminToken = admin ? await sign({ id: admin.id, username: admin.username, role: 'superadmin', restaurantId: null }) : null;
  return {
    restaurant,
    ownerCookie: `user_token=${userToken}`,
    adminCookie: adminToken ? `admin_token=${adminToken}` : null,
    cleanup: () => prisma.userSession.delete({ where: { id: session.id } }).catch(() => undefined),
  };
}
