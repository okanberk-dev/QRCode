'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ChevronRight, UtensilsCrossed } from 'lucide-react';
import { PageHeader } from '@/components/ui';

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
        <Loader2 className="h-8 w-8 animate-spin text-[#0A0A0A]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-5 px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow={locale === 'tr' ? 'MENÜ' : 'MENU'}
        title={copy.title}
        description={copy.subtitle}
      />

      {restaurants.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#EDEDED] bg-[#FAFAFA] p-10 text-center">
          <p className="text-[14px] text-[#525252]">{copy.noRest}</p>
          <Link
            href={`/${locale}/dashboard/restaurants`}
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#C6F24E] px-5 py-2.5 text-[13px] font-medium text-[#0A0A0A] hover:bg-[#A8D62E] transition-colors"
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
              className="flex items-center gap-4 bz-card p-4 transition-colors hover:border-[#C6F24E]"
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[15px] font-semibold text-white"
                style={{ backgroundColor: r.primaryColor || '#0A0A0A', fontFamily: 'var(--font-heading)' }}
              >
                {r.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-[15px] font-semibold text-[#0A0A0A] tracking-[-0.015em]"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {r.name}
                </p>
                <p className="pulse-eyebrow text-[#737373] truncate mt-0.5">{r.category}</p>
              </div>
              <span className="inline-flex items-center gap-1 pulse-eyebrow text-[#525252]">
                {copy.manage.toUpperCase()}
                <ChevronRight size={12} strokeWidth={2} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
