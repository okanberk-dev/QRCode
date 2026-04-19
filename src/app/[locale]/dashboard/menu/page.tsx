import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { UtensilsCrossed, ChevronRight, Store } from 'lucide-react';
import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Locale } from '@/lib/translations';

export const dynamic = 'force-dynamic';

export default async function DashboardMenuPickerPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;
  if (!token) redirect(`/${locale}/auth/login`);

  const payload = await verifyJwt(token);
  if (!payload || typeof payload.userId !== 'string') redirect(`/${locale}/auth/login`);

  const restaurants = await prisma.restaurant.findMany({
    where: { userId: payload.userId as string },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      slug: true,
      name: true,
      category: true,
      primaryColor: true,
      menuEnabled: true,
      menuPublished: true,
      _count: { select: { menuItems: { where: { deletedAt: null } } } },
    },
  });

  if (restaurants.length === 1) {
    redirect(`/${locale}/dashboard/restaurants/${restaurants[0].id}/menu`);
  }

  const isTr = locale === 'tr';
  const copy = {
    title: isTr ? 'Menü Yönetimi' : 'Menu Management',
    subtitle: isTr ? 'Düzenlemek istediğiniz işletmeyi seçin.' : 'Pick a location to edit its menu.',
    empty: isTr ? 'Henüz bir restoran eklemediniz.' : "You haven't added a restaurant yet.",
    addRestaurant: isTr ? 'Restoran Ekle' : 'Add Restaurant',
    statusDisabled: isTr ? 'Kapalı' : 'Disabled',
    statusDraft: isTr ? 'Taslak' : 'Draft',
    statusPublished: isTr ? 'Yayında' : 'Published',
    items: isTr ? 'ürün' : 'items',
    manage: isTr ? 'Yönet' : 'Manage',
  };

  if (restaurants.length === 0) {
    return (
      <div className="mx-auto max-w-xl p-6 sm:p-10">
        <div className="rounded-[24px] border border-gray-100 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50">
            <Store size={28} className="text-gray-400" strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-black tracking-tight text-[#111827]">{copy.title}</h1>
          <p className="mt-2 text-sm font-bold text-[#6b6760]">{copy.empty}</p>
          <Link
            href={`/${locale}/dashboard/restaurants`}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#FDBF1D] px-6 py-3 text-xs font-black uppercase tracking-widest text-[#111827] shadow-sm hover:bg-[#EAB308] active:scale-95"
          >
            {copy.addRestaurant}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 md:p-10">
      <div className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FDBF1D] text-[#111827]">
            <UtensilsCrossed size={20} strokeWidth={2.75} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#111827] sm:text-3xl">{copy.title}</h1>
            <p className="text-[13px] font-bold text-[#6b6760]">{copy.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {restaurants.map((r) => {
          const status = !r.menuEnabled
            ? { label: copy.statusDisabled, cls: 'bg-gray-100 text-gray-500 border-gray-200' }
            : r.menuPublished
            ? { label: copy.statusPublished, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
            : { label: copy.statusDraft, cls: 'bg-amber-50 text-amber-700 border-amber-200' };
          return (
            <Link
              key={r.id}
              href={`/${locale}/dashboard/restaurants/${r.id}/menu`}
              className="group rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl font-black text-white shadow-sm"
                  style={{ backgroundColor: r.primaryColor }}
                >
                  {r.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-base font-black text-[#111827]">{r.name}</h3>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${status.cls}`}>
                      {status.label}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] font-bold uppercase tracking-widest text-[#ada89f]">
                    {r.category} · {r._count.menuItems} {copy.items}
                  </p>
                </div>
                <ChevronRight size={18} className="shrink-0 text-[#ada89f] transition-transform group-hover:translate-x-0.5" strokeWidth={2.75} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
