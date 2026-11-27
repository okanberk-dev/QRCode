import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { NextRequest } from 'next/server';
import {
  ArrowLeft,
  ExternalLink,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Pencil,
  UtensilsCrossed,
} from 'lucide-react';
import { Badge, EmptyState, PageHeader } from '@/components/ui';
import { prisma } from '@/lib/prisma';
import { getPanelActorFromRequest } from '@/lib/auth';
import { getScopedRestaurantIds } from '@/lib/panel-access';
import { MENU_PRESET_LABELS, effectivePresetId, readMenuDesign } from '@/lib/menu-design';

/**
 * Admin read-only menu viewer.
 *
 * Owner builder (`/[locale]/dashboard/restaurants/[id]/menu`) ile **aynı
 * veriyi** gösterir, ama edit / delete / DnD / save buton YOK. Admin'in
 * "müşteriye nasıl görünüyor + içerik doğru mu?" sorularını yanıtlar.
 *
 * - IDOR: superadmin global, manager sadece kendi `restaurantId` scope'u
 *   (CLAUDE.md §4 panel-access).
 * - Sade görünüm: PageHeader + tema/accent göstergesi + kategori liste +
 *   ürünler kart grid (görsel + isim + fiyat + status badge'leri).
 * - Soft-delete filter: kategoriler + ürünler `deletedAt: null` (CLAUDE.md
 *   §12.4 — public/admin lists must filter).
 *
 * Eskiden bu sayfa owner builder'a 302 redirect yapıyordu; admin bağımsız
 * read-only view kullanıcı talebiyle eklendi (admin işletme menülerini
 * görebilsin, edit yapamayan superadmin/manager için ayrı sayfa).
 */

interface AdminMenuPageProps {
  params: Promise<{ id: string }>;
}

const THEME_LABEL: Record<string, string> = {
  classic: 'Klasik',
  modern: 'Modern',
  elegant: 'Şık',
  gastronomy: 'Gastronomi',
  minimal: 'Minimal',
  bistro: 'Bistro',
  pulse: 'Pulse',
};

function formatPrice(cents: number, currency: string) {
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: currency || 'TRY',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export default async function AdminRestaurantMenuPage({ params }: AdminMenuPageProps) {
  const { id } = await params;

  // IDOR — superadmin/manager guard. CLAUDE.md §4 panel-access.
  // Server component'te NextRequest yok; cookie'leri header'dan taşıyıp
  // helper'ın beklediği `req.cookies.get(...)` API'sini sağlamak için
  // NextRequest mock construct ediyoruz.
  const reqHeaders = await headers();
  const fakeReq = new NextRequest('http://localhost/admin/restaurants', {
    headers: { cookie: reqHeaders.get('cookie') ?? '' },
  });
  const actor = await getPanelActorFromRequest(fakeReq);
  if (!actor) {
    redirect('/admin');
  }
  const scopedIds = await getScopedRestaurantIds(actor);
  if (scopedIds !== null && !scopedIds.includes(id)) {
    notFound();
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      menuTheme: true,
      menuAccentColor: true,
      menuLogoUrl: true,
      menuDesign: true,
      menuEnabled: true,
      menuPublished: true,
      primaryColor: true,
    },
  });
  if (!restaurant) notFound();

  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId: id, deletedAt: null },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      description: true,
      isVisible: true,
      sortOrder: true,
      items: {
        where: { deletedAt: null },
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          priceCents: true,
          currency: true,
          imageUrl: true,
          badges: true,
          allergens: true,
          isAvailable: true,
          isOutOfStock: true,
        },
      },
    },
  });

  const totalItems = categories.reduce((acc, c) => acc + c.items.length, 0);
  const visibleCategories = categories.filter((c) => c.isVisible).length;
  // The preset that renders (menu-design-final §11.2); the family label is the fallback.
  const presetId = effectivePresetId(restaurant.menuTheme, readMenuDesign(restaurant.menuDesign));
  const themeLabel = MENU_PRESET_LABELS[presetId]?.tr ?? THEME_LABEL[restaurant.menuTheme] ?? restaurant.menuTheme;
  const accent = restaurant.menuAccentColor || restaurant.primaryColor || '#C6F24E';

  return (
    <div className="mx-auto max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8 space-y-5">
      <Link
        href={`/admin/restaurants/${restaurant.id}`}
        className="tabular-nums text-[12px] text-[#737373] hover:text-pn-ink inline-flex items-center gap-1"
      >
        <ArrowLeft size={12} />
        İşletme detayına dön
      </Link>

      <PageHeader
        eyebrow="MENÜ GÖRÜNTÜLEME"
        title={restaurant.name}
        description="Müşteriye gösterilen menünün salt-okunur görünümü. Düzenleme yapmak için 'Menüyü düzenle' butonunu kullanın."
        actions={
          <>
            <Link
              href={`/menu/${restaurant.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bz-btn-ghost inline-flex items-center gap-1.5"
            >
              <ExternalLink size={13} strokeWidth={2} />
              Public menüyü aç
            </Link>
            <Link
              href={`/tr/dashboard/restaurants/${restaurant.id}/menu`}
              className="bz-btn-primary inline-flex items-center gap-1.5"
            >
              <Pencil size={13} strokeWidth={2} />
              Menüyü düzenle
            </Link>
          </>
        }
      />

      {/* Top summary card — tema, accent, status, sayım */}
      <div className="bz-card p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[24px]"
            style={{ background: accent + '40', color: '#0A0A0A' }}
          >
            <UtensilsCrossed size={20} strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-[#737373]">TEMA & RENK</p>
            <p className="mt-0.5 text-[14px] font-medium text-pn-ink">
              {themeLabel}
              <span className="ml-2 inline-flex items-center gap-1.5 align-middle">
                <span
                  className="h-3 w-3 rounded-full ring-1 ring-pn-line"
                  style={{ background: accent }}
                  aria-hidden="true"
                />
                <span className="text-[12px] text-[#525252] tabular-nums">{accent}</span>
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge kind={restaurant.menuEnabled ? 'ok' : 'danger'}>
              {restaurant.menuEnabled ? 'Yetki açık' : 'Yetki kapalı'}
            </Badge>
            <Badge kind={restaurant.menuPublished ? 'lime' : 'ghost'}>
              {restaurant.menuPublished ? 'Yayında' : 'Taslak'}
            </Badge>
            <span className="tabular-nums text-[12px] text-[#737373]">
              {categories.length} kategori · {totalItems} ürün
            </span>
          </div>
        </div>
      </div>

      {/* Kategori liste */}
      {categories.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed size={22} strokeWidth={1.5} />}
          title="Henüz menü içeriği yok"
          body="Bu işletme henüz kategori veya ürün eklememiş. Owner builder'a giderek ilk kategoriyi oluşturabilirsiniz."
        />
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => (
            <section key={cat.id} className="bz-card overflow-hidden">
              <header className="flex items-start justify-between gap-3 border-b border-pn-line px-5 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="bz-h-tight text-[16px] text-pn-ink truncate">{cat.name}</h2>
                    {!cat.isVisible && (
                      <Badge kind="ghost">
                        <EyeOff size={10} strokeWidth={2.2} className="mr-1 inline" />
                        Gizli
                      </Badge>
                    )}
                  </div>
                  {cat.description && (
                    <p className="mt-1 text-[13px] leading-[1.55] text-[#525252]">
                      {cat.description}
                    </p>
                  )}
                </div>
                <span className="tabular-nums shrink-0 text-[12px] text-[#737373]">
                  {cat.items.length} ürün
                </span>
              </header>

              {cat.items.length === 0 ? (
                <div className="px-5 py-6 text-center text-[12px] text-[#A3A3A3]">
                  Bu kategoride henüz ürün yok.
                </div>
              ) : (
                <ul className="divide-y divide-pn-line">
                  {cat.items.map((item) => (
                    <li key={item.id} className="flex items-start gap-3 px-5 py-3.5">
                      {/* Görsel */}
                      <div className="shrink-0">
                        {item.imageUrl ? (
                           
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-14 w-14 rounded-[14px] object-cover ring-1 ring-pn-line"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-pn-canvas text-[#A3A3A3]">
                            <ImageIcon size={18} strokeWidth={1.5} />
                          </div>
                        )}
                      </div>

                      {/* İçerik */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-[14px] font-medium text-pn-ink truncate">
                                {item.name}
                              </p>
                              {item.isOutOfStock && <Badge kind="danger">Tükendi</Badge>}
                              {!item.isAvailable && !item.isOutOfStock && (
                                <Badge kind="ghost">
                                  <EyeOff
                                    size={10}
                                    strokeWidth={2.2}
                                    className="mr-1 inline"
                                  />
                                  Pasif
                                </Badge>
                              )}
                            </div>
                            {item.description && (
                              <p className="mt-0.5 line-clamp-2 text-[12px] leading-[1.45] text-[#525252]">
                                {item.description}
                              </p>
                            )}
                            {(item.badges.length > 0 || item.allergens.length > 0) && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {item.badges.map((b) => (
                                  <span
                                    key={`b-${b}`}
                                    className="rounded-full bg-pn-accent-soft px-2 py-0.5 text-[12px] font-medium text-pn-ink"
                                  >
                                    {b}
                                  </span>
                                ))}
                                {item.allergens.map((a) => (
                                  <span
                                    key={`a-${a}`}
                                    className="rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-2 py-0.5 text-[12px] font-medium text-[#92400E]"
                                  >
                                    {a}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="tabular-nums text-[13px] font-medium text-pn-ink">
                              {formatPrice(item.priceCents, item.currency)}
                            </p>
                            {item.isAvailable && !item.isOutOfStock && (
                              <span className="mt-0.5 inline-flex items-center gap-1 text-[12px] text-[#16A34A]">
                                <Eye size={10} strokeWidth={2.2} />
                                Aktif
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      {/* Footer summary */}
      {categories.length > 0 && (
        <div className="rounded-[20px] bg-pn-canvas p-4 text-center">
          <p className="text-[12px] text-[#525252]">
            {visibleCategories} / {categories.length} kategori müşteriye görünür · {totalItems} ürün
          </p>
          {!restaurant.menuPublished && (
            <p className="mt-1 text-[12px] text-[#737373]">
              Menü taslak modunda — müşteri görünümü için yayınlama yapılmalı.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
