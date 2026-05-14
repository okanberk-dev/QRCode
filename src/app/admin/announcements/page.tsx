import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AnnouncementsClient from './AnnouncementsClient';

export const dynamic = 'force-dynamic';

function getStringClaim(payload: Awaited<ReturnType<typeof verifyJwt>>, key: string) {
  const value = payload?.[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

export default async function AdminAnnouncementsPage() {
  // Auth — superadmin only (matches /api/admin/announcements GET).
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) redirect('/admin');

  const payload = await verifyJwt(token);
  const role = getStringClaim(payload, 'role');
  if (!payload || !isAdminRole(role) || role !== 'superadmin') redirect('/admin');

  let initialAnnouncements: Awaited<ReturnType<typeof loadAnnouncements>> = [];
  try {
    initialAnnouncements = await loadAnnouncements();
  } catch (error) {
    console.error('[AdminAnnouncementsPage] hydration failed', error);
  }

  // Serialize Date fields for client component.
  const serialized = initialAnnouncements.map((a) => ({
    ...a,
    startDate: a.startDate ? a.startDate.toISOString() : null,
    endDate: a.endDate ? a.endDate.toISOString() : null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));

  return <AnnouncementsClient initialAnnouncements={serialized} />;
}

async function loadAnnouncements() {
  return prisma.announcement.findMany({
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    take: 20,
  });
}
