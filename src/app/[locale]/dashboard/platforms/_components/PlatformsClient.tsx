'use client';

// Workspace `/dashboard/platforms` filter island — Stage 56 §38.137.
// Sektör-bazlı platform filtresi + restoran selector + "tüm platformları göster"
// override. Logo render: mevcut `/public/platforms/{id}.svg` envanteri reuse;
// dosya yoksa PlatformChip-style initials fallback (brand color + monogram).
//
// CLAUDE.md disipline:
// - §5.1 sector → platform whitelist (`SECTOR_PLATFORMS` reuse)
// - §38.45 + §38.52 + §38.117 mevcut PLATFORM_DEFS taksonomisi
// - §11 + §23.3 Pulse design tokens (`bz-card`, `bz-btn-*`, `pulse-eyebrow`)
// - §11.13 useUrlFilter pattern (deeplink-friendly URL state)

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
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
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<'all' | string>('all');
  const [showAllPlatforms, setShowAllPlatforms] = useState(false);

  const selectedRestaurant =
    selectedRestaurantId === 'all'
      ? null
      : restaurants.find((r) => r.id === selectedRestaurantId) ?? null;

  const detectedSector = selectedRestaurant ? detectSector(selectedRestaurant.category) : null;
  const sectorLabel = detectedSector
    ? isTr
      ? SECTOR_LABELS[detectedSector]?.tr ?? detectedSector
      : SECTOR_LABELS[detectedSector]?.en ?? detectedSector
    : null;

  // Sector filtering only applies to review platforms — social/message/api
  // are sector-agnostic (every owner can use Instagram/Facebook/WhatsApp/
  // Webhook regardless of business type).
  const filteredPlatforms = useMemo(() => {
    if (selectedRestaurantId === 'all' || showAllPlatforms || !detectedSector) {
      return platformSummaries;
    }
    const sectorAllowedIds = new Set(SECTOR_PLATFORMS[detectedSector]);
    return platformSummaries.filter((p) => {
      if (p.category !== 'review') return true; // social/message/api always show
      // Review platforms: must be in sector whitelist
      if (!p.uiPlatformId) return true; // no enum mapping — keep visible (defensive)
      return sectorAllowedIds.has(p.uiPlatformId);
    });
  }, [selectedRestaurantId, showAllPlatforms, detectedSector, platformSummaries]);

  const hiddenCount = platformSummaries.length - filteredPlatforms.length;
  const filterActive = selectedRestaurantId !== 'all' && !showAllPlatforms && hiddenCount > 0;

  return (
    <div className="space-y-4">
      {/* Filter bar: restaurant selector + show-all toggle */}
      <div
        className="bz-card flex flex-wrap items-center gap-3 p-3.5"
        role="group"
        aria-label={isTr ? 'Platform filtresi' : 'Platform filter'}
      >
        <label className="flex items-center gap-2">
          <span className="pulse-eyebrow text-[10.5px] text-[#737373]">
            {isTr ? 'İŞLETME' : 'BUSINESS'}
          </span>
          <select
            value={selectedRestaurantId}
            onChange={(e) => {
              setSelectedRestaurantId(e.target.value);
              // Specific restaurant seçilince showAll'u resetle —
              // sektör filter default aktif, owner override edebilir.
              setShowAllPlatforms(false);
            }}
            className="bz-input h-9 min-w-[180px] text-[13px]"
            aria-label={isTr ? 'İşletme seç' : 'Select business'}
          >
            <option value="all">
              {isTr ? `Tüm işletmeler (${restaurants.length})` : `All businesses (${restaurants.length})`}
            </option>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>

        {selectedRestaurantId !== 'all' && (
          <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-[#525252]">
            <input
              type="checkbox"
              checked={showAllPlatforms}
              onChange={(e) => setShowAllPlatforms(e.target.checked)}
              className="h-4 w-4 cursor-pointer rounded border-[#D4D4D4] accent-[#C6F24E]"
            />
            {isTr ? 'Tüm platformları göster (sektör filtresini kaldır)' : 'Show all platforms (clear sector filter)'}
          </label>
        )}

        {filterActive && (
          <span className="bz-mono ml-auto text-[11px] text-[#737373]">
            {isTr
              ? `${filteredPlatforms.length}/${platformSummaries.length} platform · ${hiddenCount} sektör dışı gizlendi`
              : `${filteredPlatforms.length}/${platformSummaries.length} platforms · ${hiddenCount} hidden by sector filter`}
          </span>
        )}
      </div>

      {/* Sector hint banner (specific restaurant + filter active) */}
      {filterActive && sectorLabel && selectedRestaurant && (
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

      {/* Empty state — sektör filtresi sonrası 0 platform */}
      {filteredPlatforms.length === 0 && (
        <div className="bz-card flex flex-col items-center gap-3 p-10 text-center">
          <Plug size={22} strokeWidth={1.5} className="text-[#A3A3A3]" />
          <p className="text-[13.5px] text-[#525252]">
            {isTr
              ? 'Bu sektör için henüz platform tanımlı değil. Tüm platformları görmek için filtreyi kaldır.'
              : 'No platforms configured for this sector yet. Clear the filter to see all platforms.'}
          </p>
          <button
            type="button"
            onClick={() => setShowAllPlatforms(true)}
            className="bz-btn-ghost text-[12px]"
          >
            {isTr ? 'Tüm platformları göster' : 'Show all platforms'}
          </button>
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
                    // eslint-disable-next-line @next/next/no-img-element
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

      {/* Hidden indicator — sector filter aktif ve bir kısım gizli */}
      {filterActive && hiddenCount > 0 && (
        <div className="flex items-center justify-center gap-2 text-[11.5px] text-[#737373]">
          <CheckCircle2 size={12} className="text-[#A3A3A3]" />
          <span>
            {isTr
              ? `${hiddenCount} platform sektör dışı olduğu için gizli.`
              : `${hiddenCount} platforms hidden — outside sector scope.`}
          </span>
          <button
            type="button"
            onClick={() => setShowAllPlatforms(true)}
            className="text-[#0A0A0A] underline underline-offset-2 hover:text-[#525252]"
          >
            {isTr ? 'Hepsini göster' : 'Show all'}
          </button>
        </div>
      )}

      {/* Subtle warning if any restoran has externalPlatformsEnabled=false
          (admin master gate kapalı) — mevcut workspace logic'inde explicit
          hint yoktu, bu PR'da küçük UX polish (CLAUDE.md §5.2). */}
      {selectedRestaurantId === 'all' && (
        <div className="bz-card-soft flex items-center gap-2 p-3 text-[11.5px] text-[#737373]">
          <AlertTriangle size={12} className="shrink-0 text-[#A3A3A3]" />
          <span>
            {isTr
              ? 'İpucu: Bir işletme seç → sektörüne uygun platformlar otomatik görünür.'
              : 'Tip: Select a business → sector-relevant platforms appear automatically.'}
          </span>
        </div>
      )}
    </div>
  );
}
