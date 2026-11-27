import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJwt, isAdminRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Locale } from '@/lib/translations';
import {
  businessLimitMessage,
  getOwnerBusinessLimit,
  isBusinessLimitReached,
  ownerBusinessCount,
} from '@/lib/plan-limits';
import CreateBusinessClient from './_components/CreateBusinessClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewRestaurantPage({ params }: PageProps) {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === 'en' ? 'en' : 'tr';
  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  if (!token) redirect(`/${locale}/auth/login?next=/${locale}/dashboard/restaurants/new`);

  const payload = await verifyJwt(token);
  if (!payload || typeof payload.userId !== 'string') {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/restaurants/new`);
  }
  const tokenRole = typeof payload.role === 'string' ? payload.role : 'restaurant_owner';
  if (isAdminRole(tokenRole)) {
    redirect(`/${locale}/auth/login?next=/${locale}/dashboard/restaurants/new`);
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, role: true },
  });
  if (!user) redirect(`/${locale}/auth/login?next=/${locale}/dashboard/restaurants/new`);

  // §22 — team_member / area manager cannot create businesses (backend
  // `canWriteRestaurant` + create POST gate). Bounce them to the list instead
  // of rendering a form they cannot submit.
  if ((user.role || 'restaurant_owner') === 'team_member') {
    redirect(`/${locale}/dashboard/restaurants`);
  }

  // Plan business limit (CLAUDE.md §15.2): show the upgrade path instead of a
  // form the API would reject after the owner filled it in.
  const limit = await getOwnerBusinessLimit(user.id);
  if (limit && isBusinessLimitReached(await ownerBusinessCount(user.id), limit.maxBusinesses)) {
    const isTr = locale === 'tr';
    return (
      <div className="mx-auto max-w-[920px] px-4 sm:px-7 py-6 lg:py-8">
        <div className="bz-card p-6 sm:p-8">
          <h1 className="text-[20px] font-medium text-pn-ink">
            {isTr ? 'İşletme sınırına ulaştınız' : 'You have reached your business limit'}
          </h1>
          <p className="mt-2 max-w-[60ch] text-[14px] leading-[1.6] text-[#525252]">
            {businessLimitMessage(limit, locale)}
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link
              href={`/${locale}/dashboard/account?section=billing`}
              className="bz-btn-primary inline-flex min-h-[44px] items-center justify-center px-5 text-[14px]"
            >
              {isTr ? 'Planı yükselt' : 'Upgrade plan'}
            </Link>
            <Link
              href={`/${locale}/dashboard/restaurants`}
              className="bz-btn-ghost inline-flex min-h-[44px] items-center justify-center px-5 text-[14px]"
            >
              {isTr ? 'İşletmelere dön' : 'Back to businesses'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CreateBusinessClient locale={locale} initialNotificationEmail={user.email} />
  );
}
