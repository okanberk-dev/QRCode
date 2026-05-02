'use client';

import { Smartphone } from 'lucide-react';
import dynamic from 'next/dynamic';
import type {
  MenuCategoryView,
  RestaurantView,
} from '@/components/menu/PublicMenuView';

// PublicMenuView client-only ve büyük (1395 LOC). Ana builder bundle'a
// statik girmesin diye dynamic import.
const PublicMenuView = dynamic(
  () => import('@/components/menu/PublicMenuView').then((m) => m.default ?? m),
  { ssr: false, loading: () => <PreviewSkeleton /> },
);

// Owner builder'ın tema panelinin yanına yerleşen mini phone mockup.
// Tema/accent/logo değiştirildiğinde **anında** müşteri görünümünü
// gösterir — eskiden 7 tema × 9 renk = 63 kombinasyon save-and-see
// loop'unda gizli kalıyordu (CLAUDE.md §12 plan).
//
// Render maliyeti: PublicMenuView dynamic + ssr:false → ilk render ~30-40ms
// off-thread. Ana sayfaya bind degil; tema değişince re-render dar
// kapsamlı (sadece restaurant.menuTheme/menuAccentColor/menuLogoUrl).

interface MenuLivePreviewProps {
  // PublicMenuView ile aynı tipler — type safety için import.
  restaurant: RestaurantView;
  categories: MenuCategoryView[];
  locale: 'tr' | 'en';
}

function PreviewSkeleton() {
  return (
    <div className="flex h-[420px] items-center justify-center">
      <div className="text-[11px] text-[#A3A3A3]">Önizleme yükleniyor…</div>
    </div>
  );
}

export function MenuLivePreview({ restaurant, categories, locale }: MenuLivePreviewProps) {
  return (
    <aside
      className="sticky top-4 hidden lg:block"
      aria-label="Menü canlı önizlemesi"
    >
      <div className="overflow-hidden rounded-3xl border border-[#EDEDED] bg-white shadow-sm">
        <header className="flex items-center justify-between gap-2 border-b border-[#EDEDED] px-4 py-3">
          <div className="flex items-center gap-2">
            <Smartphone size={14} className="text-[#525252]" strokeWidth={2} />
            <p className="pulse-eyebrow text-[#525252]">CANLI ÖNİZLEME</p>
          </div>
          <span className="bz-mono text-[10px] text-[#A3A3A3]">375 × 667</span>
        </header>

        {/* Phone mockup — 375px logical width, 0.78 scale ile sığdır */}
        <div className="relative bg-[#FAFAFA] p-4">
          <div
            className="relative mx-auto overflow-hidden rounded-[28px] border border-[#0A0A0A] bg-white shadow-[0_18px_40px_-15px_rgba(10,10,10,0.35)]"
            style={{
              width: 280,
              height: 540,
            }}
          >
            <div
              className="origin-top-left"
              style={{
                width: 375,
                height: 692,
                transform: 'scale(0.747)',
                transformOrigin: 'top left',
              }}
            >
              <PublicMenuView
                restaurant={restaurant}
                categories={categories}
                locale={locale}
                disableAnalytics
              />
            </div>
          </div>
        </div>

        <footer className="border-t border-[#EDEDED] bg-[#FAFAFA] px-4 py-2.5">
          <p className="text-[10.5px] leading-[1.4] text-[#737373]">
            Tema, renk veya logo değiştirdiğinde önizleme anında güncellenir.
            Müşteri görünümü ile birebir.
          </p>
        </footer>
      </div>
    </aside>
  );
}

export default MenuLivePreview;
