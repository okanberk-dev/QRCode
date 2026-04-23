'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ChevronRight, UtensilsCrossed } from 'lucide-react';

interface Restaurant {
  id: string;
  name: string;
  category: string;
  primaryColor: string;
  slug: string;
}

export default function DashboardMenuSelectPage() {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale === 'en' ? 'en' : 'tr';

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  const copy = {
    tr: {
      title: 'Menü Yönetimi',
      subtitle: 'Hangi işletmenin menüsünü düzenlemek istiyorsunuz?',
      noRest: 'Henüz bir işletmeniz bulunmuyor.',
      addRest: 'İşletme Ekle',
      manage: 'Menüyü Düzenle',
    },
    en: {
      title: 'Menu Management',
      subtitle: 'Which restaurant’s menu would you like to edit?',
      noRest: 'You don’t have any restaurants yet.',
      addRest: 'Add Restaurant',
      manage: 'Edit Menu',
    },
  }[locale];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/restaurants');
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const data = await res.json();
        // Never trust a non-array shape — later .map/.filter would crash.
        const list: Restaurant[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
          ? data.data
          : [];
        if (cancelled) return;
        setRestaurants(list);
        if (list.length === 1) {
          router.replace(`/${locale}/dashboard/restaurants/${list[0].id}/menu`);
          return;
        }
        setLoading(false);
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [locale, router]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#0A0A0A]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 md:p-10">
      <div className="rounded-[24px] border border-[#EDEDED] bg-white p-6 shadow-sm sm:p-8">
        <h1 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-[#0A0A0A] sm:text-3xl">
          <UtensilsCrossed size={22} strokeWidth={2} />
          {copy.title}
        </h1>
        <p className="mt-1 text-sm font-medium text-[#6B7280]">{copy.subtitle}</p>
      </div>

      {restaurants.length === 0 ? (
        <div className="rounded-[24px] border border-[#EDEDED] bg-white p-10 text-center shadow-sm">
          <p className="text-sm font-bold text-[#1A1A1A]">{copy.noRest}</p>
          <Link
            href={`/${locale}/dashboard/restaurants/new`}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#C6F24E] px-5 py-2.5 text-xs font-black uppercase tracking-widest text-[#0A0A0A] shadow-sm hover:bg-[#D7F98E] active:scale-95"
          >
            {copy.addRest}
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {restaurants.map((r) => (
            <Link
              key={r.id}
              href={`/${locale}/dashboard/restaurants/${r.id}/menu`}
              className="flex items-center gap-4 rounded-[20px] border border-[#EDEDED] bg-white p-4 shadow-sm transition-all hover:border-[#0A0A0A] hover:shadow-md active:scale-[0.99]"
            >
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-black text-white"
                style={{ backgroundColor: r.primaryColor || '#0A0A0A' }}
              >
                {r.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-[#0A0A0A]">{r.name}</p>
                <p className="truncate text-[11px] font-bold uppercase tracking-widest text-[#6B7280]">{r.category}</p>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-[#1A1A1A]">
                {copy.manage}
                <ChevronRight size={14} strokeWidth={2} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
