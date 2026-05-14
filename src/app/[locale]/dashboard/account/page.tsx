import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AccountSettingsClient from './AccountSettingsClient';

export const dynamic = 'force-dynamic';

interface RestaurantOption {
  id: string;
  name: string;
}

interface UserProfile {
  email: string;
  name: string | null;
}

export default async function AccountSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale === 'en' ? 'en' : 'tr';

  // Auth — owner panel allows user_token (workspace owner) or admin_token
  // (admin viewing owner UI per dashboard/layout.tsx admin bypass).
  const cookieStore = await cookies();
  const userToken = cookieStore.get('user_token')?.value;
  const adminToken = cookieStore.get('admin_token')?.value;

  let initialRestaurants: RestaurantOption[] | undefined;
  let initialProfile: UserProfile | null | undefined;
  let initialTeamCount: number | undefined;

  // Only hydrate from user_token — admin_token sessions hit the same client
  // shell but data should remain client-fetched (admin actor scope is
  // managed by the existing /api endpoints). This avoids leaking admin-side
  // restaurant lists when the admin is impersonating a different workspace.
  if (userToken && !adminToken) {
    try {
      const payload = await verifyJwt(userToken);
      const userId = typeof payload?.userId === 'string' ? payload.userId : null;
      if (userId) {
        const [restaurants, profile, teamCount] = await prisma.$transaction([
          prisma.restaurant.findMany({
            where: { userId },
            select: { id: true, name: true },
            orderBy: { createdAt: 'asc' },
            take: 100,
          }),
          prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, name: true },
          }),
          prisma.teamMember.count({ where: { ownerId: userId } }),
        ]);
        initialRestaurants = restaurants;
        initialProfile = profile ? { email: profile.email, name: profile.name } : null;
        initialTeamCount = teamCount;
      }
    } catch (error) {
      console.error('[AccountSettingsPage] hydration failed', error);
      // Soft-fail: client refetches on mount.
    }
  }

  // Redirect if no token at all (defensive — layout already gates).
  if (!userToken && !adminToken) {
    redirect(`/${locale}/auth/login`);
  }

  return (
    <AccountSettingsClient
      initialRestaurants={initialRestaurants}
      initialProfile={initialProfile}
      initialTeamCount={initialTeamCount}
    />
  );
}
