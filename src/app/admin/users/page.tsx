import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import UsersClient from './UsersClient';

export const dynamic = 'force-dynamic';

function getStringClaim(payload: Awaited<ReturnType<typeof verifyJwt>>, key: string) {
  const value = payload?.[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

export default async function AdminUsersPage() {
  // Auth — superadmin only (matches /api/admin/users GET).
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) redirect('/admin');

  const payload = await verifyJwt(token);
  const role = getStringClaim(payload, 'role');
  if (!payload || !isAdminRole(role) || role !== 'superadmin') redirect('/admin');

  // §40.10 server hydration — both data shapes prefetched together so the
  // single loading.tsx skeleton resolves into populated lists, no flash.
  let initialUsers: Awaited<ReturnType<typeof loadUsers>> = [];
  let initialRestaurants: Awaited<ReturnType<typeof loadRestaurants>> = [];
  try {
    [initialUsers, initialRestaurants] = await Promise.all([
      loadUsers(),
      loadRestaurants(),
    ]);
  } catch (error) {
    console.error('[AdminUsersPage] hydration failed', error);
    // Soft-fail: client will refetch on mount when data is empty.
  }

  return (
    <UsersClient initialUsers={initialUsers} initialRestaurants={initialRestaurants} />
  );
}

async function loadUsers() {
  return prisma.adminUser.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      restaurantId: true,
      restaurant: { select: { name: true } },
    },
    orderBy: { username: 'asc' },
    take: 20,
  });
}

async function loadRestaurants() {
  return prisma.restaurant.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
    take: 200,
  });
}
