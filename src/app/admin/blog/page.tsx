import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AdminBlogClient from './AdminBlogClient';

export const dynamic = 'force-dynamic';

function getStringClaim(payload: Awaited<ReturnType<typeof verifyJwt>>, key: string) {
  const value = payload?.[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

export default async function AdminBlogPage() {
  // Auth — server-side gate matches /api/admin/blog GET (superadmin only).
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) redirect('/admin');

  const payload = await verifyJwt(token);
  const role = getStringClaim(payload, 'role');
  if (!payload || !isAdminRole(role) || role !== 'superadmin') redirect('/admin');

  // §40.10 server hydration — initialPosts passed to client avoids the
  // double-skeleton flash (loading.tsx → page mount → internal skeleton).
  // Defensive select per §14.1 (no Date drift, no oversize content blob).
  let initialPosts: Awaited<ReturnType<typeof loadInitialPosts>> = [];
  try {
    initialPosts = await loadInitialPosts();
  } catch (error) {
    console.error('[AdminBlogPage] initial posts hydration failed', error);
    // Soft-fail: client refetches via /api/admin/blog if list is empty.
  }

  return <AdminBlogClient initialPosts={initialPosts} />;
}

async function loadInitialPosts() {
  return prisma.blogPost.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      slug: true,
      locale: true,
      title: true,
      description: true,
      date: true,
      readTime: true,
      author: true,
      coverImage: true,
      isActive: true,
      viewCount: true,
    },
  });
}
