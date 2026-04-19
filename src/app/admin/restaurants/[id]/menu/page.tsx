'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Eye, EyeOff, Loader2, Power, PowerOff, ShieldAlert, UtensilsCrossed } from 'lucide-react';
import PublicMenuView, { type MenuCategoryView, type RestaurantView } from '@/components/menu/PublicMenuView';

interface MenuState {
  restaurant: RestaurantView & { menuEnabled: boolean; menuPublished: boolean; menuUpdatedAt: string | null };
  categories: MenuCategoryView[];
}

export default function AdminRestaurantMenuPage() {
  const params = useParams();
  const id = params?.id as string;
  const [state, setState] = useState<MenuState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<null | 'menuEnabled' | 'menuPublished'>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rRes, cRes] = await Promise.all([
        fetch(`/api/restaurants/${id}`),
        fetch(`/api/restaurants/${id}/menu/categories`),
      ]);
      if (!rRes.ok) throw new Error('Restoran yüklenemedi');
      if (!cRes.ok) throw new Error('Menü yüklenemedi');
      const r = await rRes.json();
      const c = await cRes.json();
      setState({
        restaurant: {
          id: r.id,
          slug: r.slug,
          name: r.name,
          category: r.category,
          address: r.address ?? null,
          phone: r.phone ?? null,
          workingHours: r.workingHours ?? null,
          primaryColor: r.primaryColor ?? '#1a73e8',
          menuEnabled: r.menuEnabled ?? true,
          menuPublished: r.menuPublished ?? false,
          menuUpdatedAt: r.menuUpdatedAt ?? null,
        },
        categories: c.categories ?? [],
      });
    } catch (e) {
      setError((e as Error).message);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (id) fetchAll();
  }, [id, fetchAll]);

  const toggle = async (field: 'menuEnabled' | 'menuPublished', value: boolean) => {
    if (!state) return;
    setSaving(field);
    setError(null);
    try {
      const res = await fetch(`/api/admin/restaurants/${id}/menu-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Güncelleme başarısız');
      setState((prev) =>
        prev
          ? {
              ...prev,
              restaurant: {
                ...prev.restaurant,
                menuEnabled: data.restaurant.menuEnabled,
                menuPublished: data.restaurant.menuPublished,
                menuUpdatedAt: data.restaurant.menuUpdatedAt,
              },
            }
          : prev,
      );
    } catch (e) {
      setError((e as Error).message);
    }
    setSaving(null);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-[#111827]" />
      </div>
    );
  }
  if (!state) {
    return (
      <div className="p-10 text-center text-sm font-bold text-red-600">{error ?? 'Menü yüklenemedi'}</div>
    );
  }

  const { restaurant, categories } = state;
  const status = !restaurant.menuEnabled
    ? { label: 'KAPALI', cls: 'bg-gray-100 text-gray-600 border-gray-200' }
    : restaurant.menuPublished
    ? { label: 'YAYINDA', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    : { label: 'TASLAK', cls: 'bg-amber-50 text-amber-700 border-amber-200' };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 md:p-10">
      <div className="flex flex-col gap-4 rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="min-w-0 space-y-1">
          <Link href="/admin/restaurants" className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#6b6760] hover:text-[#111827]">
            <ArrowLeft size={14} strokeWidth={3} />
            İşletmelere Dön
          </Link>
          <h1 className="flex items-center gap-3 text-2xl font-black tracking-tight text-[#111827] sm:text-3xl">
            <UtensilsCrossed size={22} strokeWidth={3} />
            {restaurant.name} · Menü
          </h1>
          <p className="text-[13px] font-bold text-[#6b6760]">Süperadmin moderasyon: menü özelliğini tamamen kapatın veya yayından kaldırın.</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-widest ${status.cls}`}>
            {status.label}
          </span>
          <Link
            href={`/menu/${restaurant.slug}`}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-widest text-[#111827] shadow-sm transition-all hover:bg-gray-50 active:scale-95"
          >
            <ExternalLink size={14} strokeWidth={3} />
            Genel Görünüm
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold uppercase tracking-widest text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <ShieldAlert size={18} strokeWidth={2.75} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-black uppercase tracking-widest text-[#111827]">Menü Özelliği</h3>
              <p className="mt-1 text-xs font-bold text-[#6b6760]">
                Kapatılırsa ne restoran sahibi düzenleyebilir ne de genel menü sayfası görünür (404).
              </p>
              <button
                disabled={saving !== null}
                onClick={() => toggle('menuEnabled', !restaurant.menuEnabled)}
                className={`mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest shadow-sm transition-all active:scale-95 disabled:opacity-50 ${
                  restaurant.menuEnabled
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {saving === 'menuEnabled' ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : restaurant.menuEnabled ? (
                  <PowerOff size={14} strokeWidth={3} />
                ) : (
                  <Power size={14} strokeWidth={3} />
                )}
                {restaurant.menuEnabled ? 'Menüyü Kapat' : 'Menüyü Aç'}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-[20px] border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Eye size={18} strokeWidth={2.75} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-black uppercase tracking-widest text-[#111827]">Yayın Durumu</h3>
              <p className="mt-1 text-xs font-bold text-[#6b6760]">
                Yayından kaldırırsanız genel sayfa 404 döner; işletme yeniden yayınlayabilir.
              </p>
              <button
                disabled={saving !== null || !restaurant.menuEnabled}
                onClick={() => toggle('menuPublished', !restaurant.menuPublished)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#111827] px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-sm transition-all hover:bg-gray-800 active:scale-95 disabled:opacity-50"
              >
                {saving === 'menuPublished' ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : restaurant.menuPublished ? (
                  <EyeOff size={14} strokeWidth={3} />
                ) : (
                  <Eye size={14} strokeWidth={3} />
                )}
                {restaurant.menuPublished ? 'Yayından Kaldır' : 'Yayına Al'}
              </button>
              {restaurant.menuUpdatedAt && (
                <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-[#ada89f]">
                  Son güncelleme: {new Date(restaurant.menuUpdatedAt).toLocaleString('tr-TR')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-[#FCFBF7] p-5">
          <h2 className="text-sm font-black uppercase tracking-widest text-[#111827]">Salt Okunur Önizleme</h2>
          <p className="mt-1 text-[11px] font-bold text-[#6b6760]">Genel menü sayfasının tam olarak nasıl göründüğünü gösterir.</p>
        </div>
        <PublicMenuView restaurant={restaurant} categories={categories} locale="tr" />
      </div>
    </div>
  );
}
