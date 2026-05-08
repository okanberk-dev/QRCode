'use client';

// Workspace `/dashboard/platforms` filter island — Stage 56 §38.137
// + Stage 82a §38.162 (restoran odaklı default refactor).
//
// Sektör-bazlı platform filtresi + restoran selector. Tek-restoran owner
// otomatik o restorana bind; çoklu owner empty state + dropdown ile seçim
// yapar. Workspace summary ("Tüm işletmeler") + "Tüm platformları göster"
// override toggle KALDIRILDI — sektör filter her zaman zorunlu.
//
// Logo render: mevcut `/public/platforms/{id}.svg` envanteri reuse;
// dosya yoksa PlatformChip-style initials fallback (brand color + monogram).
//
// CLAUDE.md disipline:
// - §5.1 sector → platform whitelist (`SECTOR_PLATFORMS` reuse)
// - §38.45 + §38.52 + §38.117 mevcut PLATFORM_DEFS taksonomisi
// - §38.138 Stage 57 sektör filter mantığı (review category whitelist;
//   social/message/api evrensel)
// - §38.162 Stage 82a restoran odaklı default + workspace summary kaldırma
// - §11 + §23.3 Pulse design tokens (`bz-card`, `bz-btn-*`, `pulse-eyebrow`)

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Layers,
  Plug,
  Settings,
} from 'lucide-react';
import { Badge } from '@/components/ui';
import { detectSector, SECTOR_PLATFORMS } from '@/lib/sector-platforms';
import type { ManagedPlatformDef } from '@/lib/platform-management';

export interface RestaurantInfo {
  id: string;
  name: string;
  category: string;
}

export interface PlatformSummaryRow extends ManagedPlatformDef {
  connected: number;
  urlSet: number;
  total: number;
}

interface PlatformsClientProps {
  locale: 'tr' | 'en';
  restaurants: RestaurantInfo[];
  platformSummaries: PlatformSummaryRow[];
}

// Logo source resolver: mevcut /public/platforms/ envanterinden file path
// türetir. uiPlatformId enum varsa onu, yoksa logoFile (instagram/facebook/
// whatsapp social platforms için), hiçbiri yoksa null → initials fallback.
function getPlatformLogoSrc(platform: ManagedPlatformDef): string | null {
  if (platform.uiPlatformId) {
    // PlatformChip §38.117'de trendyol/trendyol_go ikisi de trendyol-go.svg
    // dosyasına map ediliyor — aynı paterni reuse et.
    const fileName =
      platform.uiPlatformId === 'trendyol' || platform.uiPlatformId === 'trendyol_go'
        ? 'trendyol-go'
        : platform.uiPlatformId;
    return `/platforms/${fileName}.svg`;
  }
  if (platform.logoFile) {
    return `/platforms/${platform.logoFile}.svg`;
  }
  return null;
}

const SECTOR_LABELS: Record<string, { tr: string; en: string }> = {
  food: { tr: 'Yemek & Restoran', en: 'Food & Restaurant' },
  delivery: { tr: 'Paket Servis', en: 'Delivery' },
  hospitality: { tr: 'Konaklama', en: 'Hospitality' },
  clinic: { tr: 'Sağlık & Klinik', en: 'Health & Clinic' },
  legal: { tr: 'Hukuk', en: 'Legal' },
  spa: { tr: 'Güzellik & Spa', en: 'Beauty & Spa' },
  retail: { tr: 'Perakende', en: 'Retail' },
  fitness: { tr: 'Fitness & Spor', en: 'Fitness & Sports' },
  education: { tr: 'Eğitim', en: 'Education' },
  other: { tr: 'Diğer', en: 'Other' },
};

export default function PlatformsClient({
  locale,
  restaurants,
  platformSummaries,
}: PlatformsClientProps) {
  const isTr = locale === 'tr';

  // Default state (CLAUDE.md §38.162 Stage 82a):
  // - Tek-restoran owner → otomatik o restorana bind (dropdown gizli)
  // - Çoklu owner → null → empty state ("Bir işletme seçin") +
  //   dropdown ile seçim
  // - "all" workspace summary KALDIRILDI (kullanıcı kararı, §38.162)
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(
    restaurants.length === 1 ? restaurants[0].id : null,
  );

  const isSingleRestaurant = restaurants.length === 1;
  const selectedRestaurant = selectedRestaurantId
    ? restaurants.find((r) => r.id === selectedRestaurantId) ?? null
    : null;

  const detectedSector = selectedRestaurant ? detectSector(selectedRestaurant.category) : null;
  const sectorLabel = detectedSector
    ? isTr
      ? SECTOR_LABELS[detectedSector]?.tr ?? detectedSector
      : SECTOR_LABELS[detectedSector]?.en ?? detectedSector
    : null;

  // Sector filtering only applies to review platforms — social/message/api
  // are sector-agnostic (every owner can use Instagram/Facebook/WhatsApp/
  // Webhook regardless of business type). Sektör filter zorunlu (Stage 82a
  // — `showAllPlatforms` override toggle silindi).
  const filteredPlatforms = useMemo(() => {
    if (!detectedSector) return platformSummaries;
    const sectorAllowedIds = new Set(SECTOR_PLATFORMS[detectedSector]);
    return platformSummaries.filter((p) => {
      if (p.category !== 'review') return true; // social/message/api always show
      if (!p.uiPlatformId) return true; // no enum mapping — keep visible (defensive)
      return sectorAllowedIds.has(p.uiPlatformId);
    });
  }, [detectedSector, platformSummaries]);

  // Empty state: çoklu owner + restoran seçilmemiş.
  // Pulse §11 layout — lime icon + h2 + p sub + büyük center dropdown.
  if (!selectedRestaurantId) {
    return (
      <div className="bz-card flex flex-col items-center gap-4 p-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF9B8] text-[#0A0A0A]">
          <Building2 size={20} strokeWidth={1.8} />
        </div>
        <div className="space-y-1.5">
          <h2 className="bz-h-tight text-[18px] font-semibold text-[#0A0A0A]">
            {isTr ? 'Bir işletme seçin' : 'Select a business'}
          </h2>
          <p className="max-w-[420px] text-[13px] leading-[1.6] text-[#525252]">
            {isTr
              ? 'Sektörünüze özgü platform bağlantılarını burada yönetin. İşletme seçtiğinizde sektörünüze uygun yorum kanalları + sosyal medya + mesajlaşma platformları otomatik filtrelenir.'
              : 'Manage sector-specific platform links from here. Once you pick a business, review channels matching your sector + social + messaging platforms appear automatically.'}
          </p>
        </div>
        <label className="flex w-full max-w-[360px] flex-col items-stretch gap-1.5">
          <span className="pulse-eyebrow text-[10.5px] text-[#737373]">
            {isTr ? 'İŞLETME' : 'BUSINESS'}
          </span>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) setSelectedRestaurantId(e.target.value);
            }}
            className="bz-input h-11 w-full text-[14px]"
            aria-label={isTr ? 'İşletme seç' : 'Select business'}
          >
            <option value="" disabled>
              {isTr ? 'İşletme seçin…' : 'Choose a business…'}
            </option>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar — restoran selector (çoklu owner) + sektör hint.
          Tek-restoran owner için dropdown gizli, sadece sektör hint
          görünür (kullanıcı zaten o restorana bind'lı). */}
      {!isSingleRestaurant && (
        <div
          className="bz-card flex flex-wrap items-center gap-3 p-3.5"
          role="group"
          aria-label={isTr ? 'İşletme seçici' : 'Business selector'}
        >
          <label className="flex items-center gap-2">
            <span className="pulse-eyebrow text-[10.5px] text-[#737373]">
              {isTr ? 'İŞLETME' : 'BUSINESS'}
            </span>
            <select
              value={selectedRestaurantId}
              onChange={(e) => setSelectedRestaurantId(e.target.value)}
              className="bz-input h-9 min-w-[180px] text-[13px]"
              aria-label={isTr ? 'İşletme seç' : 'Select business'}
            >
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>

          {sectorLabel && (
            <span className="bz-mono ml-auto text-[11px] text-[#737373]">
              {isTr
                ? `${filteredPlatforms.length}/${platformSummaries.length} platform · ${sectorLabel}`
                : `${filteredPlatforms.length}/${platformSummaries.length} platforms · ${sectorLabel}`}
            </span>
          )}
        </div>
      )}

      {/* Sector hint banner — selected restaurant + sektör match. */}
      {sectorLabel && selectedRestaurant && (
        <div className="flex items-start gap-3 rounded-[14px] border border-[#EAF9B8] bg-[#F7FAEF] p-3.5">
          <Layers size={14} strokeWidth={2} className="mt-0.5 shrink-0 text-[#525252]" />
          <p className="flex-1 text-[12.5px] leading-[1.55] text-[#525252]">
            {isTr ? (
              <>
                <strong className="text-[#0A0A0A]">{selectedRestaurant.name}</strong> için{' '}
                <strong className="text-[#0A0A0A]">{sectorLabel}</strong> sektörüne uygun platformlar
                gösteriliyor. Sosyal medya ve mesajlaşma platformları her sektör için aktiftir.
              </>
            ) : (
              <>
                Showing platforms for{' '}
                <strong className="text-[#0A0A0A]">{selectedRestaurant.name}</strong> in the{' '}
                <strong className="text-[#0A0A0A]">{sectorLabel}</strong> sector. Social and messaging
                platforms are active for every sector.
              </>
            )}
          </p>
        </div>
      )}

      {/* Empty state — sektör filter sonrası 0 platform (defansif edge case;
          mevcut SECTOR_PLATFORMS map her sektör için ≥1 platform tutuyor). */}
      {filteredPlatforms.length === 0 && (
        <div className="bz-card flex flex-col items-center gap-3 p-10 text-center">
          <Plug size={22} strokeWidth={1.5} className="text-[#A3A3A3]" />
          <p className="text-[13.5px] text-[#525252]">
            {isTr
              ? 'Bu sektör için henüz platform tanımlı değil.'
              : 'No platforms configured for this sector yet.'}
          </p>
        </div>
      )}

      {/* Platform card grid (filtered) */}
      {filteredPlatforms.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPlatforms.map((platform) => {
            const isConnected = platform.connected > 0;
            const isPartial = platform.urlSet > platform.connected;
            const status = platform.comingSoon
              ? 'coming_soon'
              : isConnected
                ? 'connected'
                : isPartial
                  ? 'inactive'
                  : 'available';
            const statusBadgeKind: 'ok' | 'warn' | 'ghost' | 'info' =
              status === 'connected'
                ? 'ok'
                : status === 'inactive'
                  ? 'warn'
                  : status === 'coming_soon'
                    ? 'info'
                    : 'ghost';
            const statusLabel = isTr
              ? status === 'connected'
                ? 'Bağlı'
                : status === 'inactive'
                  ? 'Pasif'
                  : status === 'coming_soon'
                    ? 'Yakında'
                    : 'Hazır'
              : status === 'connected'
                ? 'Connected'
                : status === 'inactive'
                  ? 'Inactive'
                  : status === 'coming_soon'
                    ? 'Coming soon'
                    : 'Available';

            const logoSrc = getPlatformLogoSrc(platform);

            return (
              <div key={platform.slug} className="bz-card flex flex-col gap-3.5 p-4">
                <div className="flex items-start gap-3">
                  {logoSrc ? (
                    // Mevcut /public/platforms/{id}.svg envanteri (CLAUDE.md
                    // §38.45 + §38.52). raw <img> base64 image disipline
                    // dışı (CLAUDE.md §3 menü ürün görselleri base64-in-DB);
                    // platform logoları static asset → next/image gerekmez.
                    <img
                      src={logoSrc}
                      alt={platform.name}
                      className="h-10 w-10 shrink-0 rounded-[10px] border object-cover"
                      style={{
                        backgroundColor: `${platform.accent}14`,
                        borderColor: `${platform.accent}30`,
                      }}
                    />
                  ) : (
                    <div
                      className="bz-h-tight flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border text-[13px] font-semibold"
                      style={{
                        backgroundColor: `${platform.accent}14`,
                        color: platform.accent,
                        borderColor: `${platform.accent}30`,
                      }}
                      aria-hidden
                    >
                      {platform.initials}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold tracking-[-0.01em] text-[#0A0A0A]">
                      {platform.name}
                    </div>
                    <div className="bz-mono mt-0.5 text-[10.5px] uppercase tracking-[0.08em] text-[#737373]">
                      {isTr ? platform.categoryLabel.tr : platform.categoryLabel.en}
                    </div>
                  </div>
                  <Badge kind={statusBadgeKind}>{statusLabel}</Badge>
                </div>

                {platform.comingSoon ? (
                  <div className="rounded-[10px] border border-dashed border-[#EDEDED] bg-[#FAFAFA] p-3">
                    <div className="pulse-eyebrow mb-1 text-[9.5px] text-[#737373]">
                      {isTr ? 'BACKEND HAZIR' : 'BACKEND READY'}
                    </div>
                    <p className="text-[11.5px] leading-[1.5] text-[#525252]">
                      {isTr
                        ? 'AutomationRule schema mevcut; arayüz bir sonraki fazda açılacak.'
                        : 'AutomationRule schema is in place; UI opens in the next phase.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-[#EDEDED]">
                    <div className="bg-white p-2.5">
                      <div className="pulse-eyebrow mb-0.5 text-[9.5px] text-[#737373]">
                        {isTr ? 'BAGLI' : 'CONNECTED'}
                      </div>
                      <div className="bz-mono text-[12px] font-semibold tabular-nums text-[#0A0A0A]">
                        {platform.connected}/{platform.total}
                      </div>
                    </div>
                    <div className="border-l border-[#EDEDED] bg-white p-2.5">
                      <div className="pulse-eyebrow mb-0.5 text-[9.5px] text-[#737373]">
                        {isTr ? 'URL VAR' : 'URL SET'}
                      </div>
                      <div className="bz-mono text-[12px] font-semibold tabular-nums text-[#0A0A0A]">
                        {platform.urlSet}/{platform.total}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {platform.comingSoon ? (
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      className="bz-btn flex-1 cursor-not-allowed opacity-50"
                      title={isTr ? 'Yakında bağlanacak' : 'Coming soon'}
                    >
                      {isTr ? 'Yakında' : 'Coming soon'}
                    </button>
                  ) : (
                    <Link
                      href={`/${locale}/dashboard/platforms/${platform.slug}`}
                      className="bz-btn-ghost inline-flex flex-1 items-center justify-center gap-1.5 text-[12px]"
                    >
                      <Settings size={11} strokeWidth={2} />
                      {isTr ? 'Yönet' : 'Manage'}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
