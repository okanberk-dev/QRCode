import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Megaphone } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import type { Locale } from '@/lib/translations';
import { Badge, EmptyState, PageHeader } from '@/components/ui';
import { formatFullDateTimeInTimeZone } from '@/lib/timezone';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'tr' ? 'Duyurular — Buaze' : 'Announcements — Buaze',
    robots: { index: false, follow: false },
  };
}

export const dynamic = 'force-dynamic';

export default async function OwnerAnnouncementsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const isTr = locale === 'tr';

  // The dashboard layout already gates this segment (owner session, or an
  // admin viewing owner pages with admin_token only). Announcements are not
  // user-specific, so this defensive check only bounces visitors without
  // any panel cookie — it used to send admin-only sessions to the owner
  // login page.
  const cookieStore = await cookies();
  const userToken = cookieStore.get('user_token')?.value;
  const adminToken = cookieStore.get('admin_token')?.value;
  if (!userToken && !adminToken) redirect(`/${locale}/auth/login`);

  // Tenant-scope: show platform announcements targeting this user's locale
  // or "all". Read-only — owners can't author. Author UI lives in /admin.
  let announcements: Array<{
    id: string;
    title: string;
    message: string;
    severity: string;
    locale: string;
    startDate: Date | null;
    endDate: Date | null;
    createdAt: Date;
    status: string;
  }> = [];
  try {
    const now = new Date();
    announcements = await prisma.announcement.findMany({
      where: {
        status: 'published',
        OR: [{ locale }, { locale: 'all' }],
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: now } }] },
          { OR: [{ endDate: null }, { endDate: { gte: now } }] },
        ],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 30,
    });
  } catch {
    // Table not yet pushed in preview deploys (CLAUDE.md §19 resilience pattern).
  }

  const severityKind = (s: string) => {
    if (s === 'critical' || s === 'danger') return 'danger' as const;
    if (s === 'warning' || s === 'warn') return 'warn' as const;
    if (s === 'success') return 'ok' as const;
    return 'info' as const;
  };
  const severityLabel = (s: string) => {
    if (isTr) {
      if (s === 'critical' || s === 'danger') return 'Kritik';
      if (s === 'warning' || s === 'warn') return 'Önemli';
      if (s === 'success') return 'Güncelleme';
      return 'Bilgi';
    }
    if (s === 'critical' || s === 'danger') return 'Critical';
    if (s === 'warning' || s === 'warn') return 'Important';
    if (s === 'success') return 'Update';
    return 'Info';
  };

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow={isTr ? 'SİSTEM DUYURULARI' : 'SYSTEM ANNOUNCEMENTS'}
        title={isTr ? 'Buaze\'den haberler' : 'News from Buaze'}
        description={
          isTr
            ? 'Yeni özellikler, planlanmış bakım ve hesabınla ilgili önemli güncellemeler burada listelenir.'
            : 'New features, scheduled maintenance, and important updates about your account are listed here.'
        }
      />

      {announcements.length === 0 ? (
        <EmptyState
          icon={<Megaphone size={22} />}
          title={isTr ? 'Şu an yayında bir duyuru yok' : 'No announcements right now'}
          body={
            isTr
              ? 'Yeni özellik veya önemli güncellemelerden haberdar olmak için bu sayfayı zaman zaman ziyaret edebilirsin.'
              : 'Check back occasionally for product updates and important news.'
          }
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {announcements.map((a) => (
            <article key={a.id} className="bz-card p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex gap-2 mb-1.5 flex-wrap">
                    <Badge kind={severityKind(a.severity)}>{severityLabel(a.severity)}</Badge>
                    <Badge kind="ghost">
                      {a.locale === 'all' ? (isTr ? 'Tüm kullanıcılar' : 'All users') : a.locale.toUpperCase()}
                    </Badge>
                  </div>
                  <h2 className="bz-h-tight" style={{ fontSize: 16, marginBottom: 6 }}>
                    {a.title}
                  </h2>
                  <p style={{ fontSize: 13, color: '#525252', lineHeight: 1.55 }}>{a.message}</p>
                  <div className="mt-2" style={{ fontSize: 11, color: '#A3A3A3' }}>
                    {/* §46 — sunucu UTC'de render ediyor; işletme saat dilimine sabitle. */}
                    {formatFullDateTimeInTimeZone(a.createdAt, isTr ? 'tr' : 'en')}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
