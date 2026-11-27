'use client';

import { useState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';

interface Props {
  /** İşletme slug — `/embed/<slug>` URL'si oluşturmak için. */
  slug: string;
  /** Mock parent domain — restaurant.website veya placeholder. */
  websiteDomain: string;
  /** İşletme adı — mock parent header. */
  businessName: string;
  /** Theme variant — embed iframe URL'sine paslanır. */
  theme: 'light' | 'dark';
  /** Layout variant: wall (full review list), spotlight (one featured quote),
   *  badge (single-line trust pill). */
  variant: 'wall' | 'badge' | 'spotlight';
  isTr: boolean;
}

/**
 * Browser-frame mockup — embed widget'ın gerçek bir web sitesinde nasıl
 * görüneceğini simüle eder. Chrome-like address bar + mock parent content
 * + gerçek `<iframe>` içeride (canlı veri). Theme/size değişimi anlık
 * yansır. Mobile/desktop toggle (375px / 800px container).
 *
 * **Önizleme kapsamı**: gerçek iframe, gerçek API response. Mock parent
 * content sadece placeholder (logo + nav + 1 paragraf hero + iframe + 1
 * paragraf devam) — owner görsel context kazanır, soyut kod kopyalama
 * yerine "böyle görünür" hissi.
 */
export default function EmbedBrowserPreview({
  slug,
  websiteDomain,
  businessName,
  theme,
  variant,
  isTr,
}: Props) {
  const [device, setDevice] = useState<'mobile' | 'desktop'>('desktop');

  const embedSrc = `/embed/${encodeURIComponent(slug)}?theme=${theme}&variant=${variant}`;
  const containerMaxWidth = device === 'mobile' ? 380 : 720;
  // Match the iframe height to the rendered variant height; same map as the
  // owner copy snippet so preview height = production height.
  const iframeHeight =
    variant === 'badge' ? 110 : variant === 'spotlight' ? 320 : 420;

  return (
    <div>
      {/* Device toggle */}
      <div
        className="mb-3 inline-flex items-center gap-1 rounded-full border border-pn-line p-1"
        role="group"
        aria-label={isTr ? 'Cihaz önizlemesi' : 'Device preview'}
      >
        <button
          type="button"
          onClick={() => setDevice('mobile')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium rounded-full transition-colors ${
            device === 'mobile'
              ? 'bg-pn-accent text-white'
              : 'text-[#525252] hover:bg-pn-canvas'
          }`}
          aria-pressed={device === 'mobile'}
        >
          <Smartphone size={13} strokeWidth={2} />
          {isTr ? 'Mobil' : 'Mobile'}
        </button>
        <button
          type="button"
          onClick={() => setDevice('desktop')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium rounded-full transition-colors ${
            device === 'desktop'
              ? 'bg-pn-accent text-white'
              : 'text-[#525252] hover:bg-pn-canvas'
          }`}
          aria-pressed={device === 'desktop'}
        >
          <Monitor size={13} strokeWidth={2} />
          {isTr ? 'Masaüstü' : 'Desktop'}
        </button>
      </div>

      {/* Browser frame */}
      <div className="bz-card-soft overflow-hidden rounded-[24px]">
        <div
          className="mx-auto transition-all duration-300"
          style={{ maxWidth: containerMaxWidth }}
        >
          {/* Chrome-like address bar */}
          <div className="flex items-center gap-2 border-b border-pn-line bg-pn-canvas px-3 py-2">
            <span className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" aria-hidden />
              <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" aria-hidden />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" aria-hidden />
            </span>
            <div
              className="ml-2 flex-1 truncate rounded-[10px] bg-white px-2.5 py-1 text-[12px] text-[#525252]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              🔒 {websiteDomain}
            </div>
          </div>

          {/* Mock parent site content */}
          <div className="bg-white p-5">
            {/* Mock nav */}
            <div className="mb-4 flex items-center justify-between border-b border-pn-line pb-3">
              <div className="bz-h-tight text-[14px]">{businessName}</div>
              <div className="flex gap-3 text-[12px] text-[#737373]">
                <span>{isTr ? 'Anasayfa' : 'Home'}</span>
                <span>{isTr ? 'Menü' : 'Menu'}</span>
                <span>{isTr ? 'Hakkımızda' : 'About'}</span>
              </div>
            </div>

            {/* Mock hero */}
            <p className="mb-4 text-[12px] leading-[1.55] text-[#525252]">
              {isTr
                ? 'Hoş geldiniz. En taze ürünler, samimi atmosfer ve hızlı servisle sizi bekliyoruz.'
                : 'Welcome. Fresh ingredients, friendly atmosphere, fast service.'}
            </p>

            {/* The actual embed iframe — live preview */}
            <iframe
              key={`${theme}-${variant}-${device}`}
              src={embedSrc}
              title="Buaze widget preview"
              width="100%"
              height={iframeHeight}
              frameBorder="0"
              style={{ border: 'none', display: 'block', maxWidth: '100%' }}
            />

            {/* Mock content devam */}
            <p className="mt-4 text-[12px] leading-[1.55] text-[#525252]">
              {isTr
                ? 'İletişim · Çalışma saatleri · Konum · Sosyal medya bağlantılarımız'
                : 'Contact · Hours · Location · Social media links'}
            </p>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="mt-2 text-[12px] text-[#737373]">
        {isTr
          ? 'Bu örnek bir sayfa içinde önizlemedir; gerçek görünüm sitenizin tasarımına göre değişebilir.'
          : 'This is a sample-page preview; actual look depends on your site design.'}
      </p>
    </div>
  );
}
