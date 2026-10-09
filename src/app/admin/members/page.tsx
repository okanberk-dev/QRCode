import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/rbac';
import { parseListMembersParams, buildMembersWhere } from '@/lib/admin-members';
import MembersClient from './MembersClient';

export const dynamic = 'force-dynamic';

function getStringClaim(payload: Awaited<ReturnType<typeof verifyJwt>>, key: string) {
  const value = payload?.[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

interface SearchParamsInput {
  search?: string;
  plan?: string;
  status?: string;
  attention?: string;
  page?: string;
  perPage?: string;
}

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput>;
}) {
  // Auth — server-side gate mirrors /api/admin/members GET.
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;
  if (!token) redirect('/admin');

  const payload = await verifyJwt(token);
  const role = getStringClaim(payload, 'role');
  if (!payload || !isAdminRole(role)) redirect('/admin');

  const adminId = getStringClaim(payload, 'id') || 'env-admin';
  const canRead = await hasPermission(adminId, 'members', 'read');
  if (!canRead) redirect('/admin');

  // §40.10 server hydration — initial query honors URL searchParams so
  // deeplinks (?status=passive&attention=stale) hydrate with the matching
  // dataset on first paint (no skeleton flash for filtered views).
  const sp = await searchParams;
  const urlParams = new URLSearchParams();
  if (sp.search) urlParams.set('search', sp.search);
  if (sp.plan) urlParams.set('plan', sp.plan);
  if (sp.status) urlParams.set('status', sp.status);
  if (sp.attention) urlParams.set('attention', sp.attention);
  if (sp.page) urlParams.set('page', sp.page);
  urlParams.set('perPage', sp.perPage || '25');

  const params = parseListMembersParams(urlParams);
  const where = buildMembersWhere(params);

  let initialMembers: Awaited<ReturnType<typeof loadMembers>>['data'] = [];
  let initialMeta: Awaited<ReturnType<typeof loadMembers>>['meta'] = {
    total: 0,
    page: params.page ?? 1,
    perPage: params.perPage ?? 25,
    totalPages: 1,
  };
  try {
    const result = await loadMembers(where, params);
    initialMembers = result.data;
    initialMeta = result.meta;
  } catch (error) {
    console.error('[AdminMembersPage] hydration failed', error);
    // Soft-fail: client will refetch when the page mounts.
  }

  // Serialize Date fields → ISO strings for client component.
  const serialized = initialMembers.map((m) => ({
    ...m,
    trialEndsAt: m.trialEndsAt ? m.trialEndsAt.toISOString() : null,
    deactivatedAt: m.deactivatedAt ? m.deactivatedAt.toISOString() : null,
    scheduledDeletionAt: m.scheduledDeletionAt ? m.scheduledDeletionAt.toISOString() : null,
    lastInvitedAt: m.lastInvitedAt ? m.lastInvitedAt.toISOString() : null,
    createdAt: m.createdAt.toISOString(),
  }));

  return <MembersClient initialMembers={serialized} initialMeta={initialMeta} />;
}

async function loadMembers(
  where: ReturnType<typeof buildMembersWhere>,
  params: ReturnType<typeof parseListMembersParams>,
) {
  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: ((params.page ?? 1) - 1) * (params.perPage ?? 25),
      take: params.perPage ?? 25,
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        trialEndsAt: true,
        isActive: true,
        deactivatedAt: true,
        scheduledDeletionAt: true,
        lastInvitedAt: true,
        createdAt: true,
        _count: { select: { restaurants: true } },
      },
    }),
  ]);
  return {
    data: users,
    meta: {
      total,
      page: params.page ?? 1,
      perPage: params.perPage ?? 25,
      totalPages: Math.max(1, Math.ceil(total / (params.perPage ?? 25))),
    },
  };
}
