'use client';

import { useMemo, useState } from 'react';
import { Copy, Check, Info, Sparkles } from 'lucide-react';
import { AlertBanner, Eyebrow } from '@/components/ui';
import EmbedBrowserPreview from './EmbedBrowserPreview';
import type { Locale } from '@/lib/translations';

interface BusinessWebsiteSettingsProps {
  restaurantId: string;
  slug: string;
  businessName: string;
  /** Owner-tanımladığı web site URL — mock parent address bar'da kullanılır. */
  website: string | null;
  locale?: Locale;
}

const APP_URL =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL
    : 'https://www.buaze.com';

/**
 * Web sitesi widget — embed kod kopyala + tema/boyut + browser-frame önizleme.
 * Settings tab içinde gömülü ("keşif" pattern, ana navigasyonda flag yok).
 *
 * Not: Widget kullanan siteler (embed analytics) owner panelinden kaldırıldı.
 * Sadece admin paneli /admin/restaurants/[id] üzerinden görülebilir.
 */
export function BusinessWebsiteSettings({
  restaurantId: _restaurantId,
  slug,
  businessName,
  website,
  locale = 'tr',
}: BusinessWebsiteSettingsProps) {
  const isTr = locale === 'tr';

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [variant, setVariant] = useState<'wall' | 'badge' | 'spotlight'>('wall');
  const [scriptMode, setScriptMode] = useState<'iframe' | 'script'>('iframe');
  const [copied, setCopied] = useState(false);

  const embedSnippet = useMemo(() => {
    const heights: Record<typeof variant, number> = {
      badge: 110,
      spotlight: 320,
      wall: 440,
    };
    const url = `${APP_URL}/embed/${slug}?theme=${theme}&variant=${variant}`;
    if (scriptMode === 'script') {
      return `<script src="${APP_URL}/buaze-embed.js" data-buaze="${slug}" data-theme="${theme}" data-variant="${variant}" defer></script>`;
    }
    const height = heights[variant];
    return `<iframe src="${url}" width="100%" height="${height}" frameborder="0" style="border:none;max-width:600px"></iframe>`;
  }, [slug, theme, variant, scriptMode]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard denied — kullanıcı manuel select+copy yapar */
    }
  };

  const websiteDomain = useMemo(() => {
    if (website) {
      try {
        return new URL(website).hostname;
      } catch {
        // ignore — fall through
      }
    }
    return isTr ? 'isletme-adi.com' : 'business-name.com';
  }, [website, isTr]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <Eyebrow>{isTr ? 'WEB SİTESİ ENTEGRASYONU' : 'WEBSITE INTEGRATION'}</Eyebrow>
          <div className="bz-h-tight mt-1 text-[18px]">
            {isTr
              ? 'İşletmenizin web sitesine Buaze yorum widget\u2019ı'
              : 'Buaze review widget for your business website'}
          </div>
          <p className="mt-1 text-[12.5px] text-[#525252]">
            {isTr
              ? 'Sitenize aşağıdaki kodu yapıştırın — ziyaretçileriniz son yorumları, ortalama puanınızı görür ve yorum bırakabilir.'
              : 'Paste this code into your site — visitors see recent reviews, average rating, and can leave a review.'}
          </p>
        </div>
        <span className="pulse-eyebrow shrink-0 rounded-full bg-[#EAF9B8] px-2 py-1 text-[#0A0A0A]">
          BETA
        </span>
      </div>

      {/* Theme + Size + Script-mode toggles */}
      <div className="bz-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="flex items-center gap-2">
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'TEMA' : 'THEME'}
            </span>
            <div
              className="inline-flex items-center gap-1 rounded-lg border border-[#EDEDED] p-1"
              role="group"
              aria-label={isTr ? 'Tema seçimi' : 'Theme'}
            >
              {(['light', 'dark'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={`px-2.5 py-1 text-[12px] font-medium rounded-md transition-colors ${
                    theme === t
                      ? 'bg-[#0A0A0A] text-white'
                      : 'text-[#525252] hover:bg-[#F5F5F5]'
                  }`}
                  aria-pressed={theme === t}
                >
                  {t === 'light' ? (isTr ? 'Açık' : 'Light') : isTr ? 'Koyu' : 'Dark'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'STİL' : 'STYLE'}
            </span>
            <div
              className="inline-flex items-center gap-1 rounded-lg border border-[#EDEDED] p-1"
              role="group"
              aria-label={isTr ? 'Stil seçimi' : 'Style'}
            >
              {(
                [
                  { id: 'wall', tr: 'Duvar', en: 'Wall' },
                  { id: 'spotlight', tr: 'Vitrin', en: 'Spotlight' },
                  { id: 'badge', tr: 'Rozet', en: 'Badge' },
                ] as const
              ).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVariant(v.id)}
                  className={`px-2.5 py-1 text-[12px] font-medium rounded-md transition-colors ${
                    variant === v.id
                      ? 'bg-[#0A0A0A] text-white'
                      : 'text-[#525252] hover:bg-[#F5F5F5]'
                  }`}
                  aria-pressed={variant === v.id}
                >
                  {isTr ? v.tr : v.en}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className="pulse-eyebrow text-[#737373]">
              {isTr ? 'KOD TÜRÜ' : 'CODE TYPE'}
            </span>
            <div
              className="inline-flex items-center gap-1 rounded-lg border border-[#EDEDED] p-1"
              role="group"
            >
              {(['iframe', 'script'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setScriptMode(m)}
                  className={`px-2.5 py-1 text-[12px] font-medium rounded-md transition-colors ${
                    scriptMode === m
                      ? 'bg-[#0A0A0A] text-white'
                      : 'text-[#525252] hover:bg-[#F5F5F5]'
                  }`}
                  aria-pressed={scriptMode === m}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Code block */}
        <div className="mt-4">
          <div className="relative rounded-lg border border-[#EDEDED] bg-[#FAFAFA] p-3">
            <pre
              className="overflow-x-auto whitespace-pre-wrap break-all text-[12px] leading-[1.55] text-[#0A0A0A]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {embedSnippet}
            </pre>
            <button
              type="button"
              onClick={handleCopy}
              className="bz-btn bz-btn-sm absolute right-2 top-2"
              aria-label={isTr ? 'Kodu kopyala' : 'Copy code'}
            >
              {copied ? (
                <>
                  <Check size={12} className="text-[#16A34A]" />
                  {isTr ? 'Kopyalandı' : 'Copied'}
                </>
              ) : (
                <>
                  <Copy size={12} />
                  {isTr ? 'Kopyala' : 'Copy'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Privacy disclosure */}
        <AlertBanner kind="info" icon={<Info size={14} />}>
          {isTr
            ? 'Widget kullan\u0131m\u0131nda anonim trafik verisi (IP, referans alan ad\u0131) toplan\u0131r. Sitenizin Gizlilik Politikas\u0131\u2019nda belirtmenizi \u00f6neririz.'
            : "Widget collects anonymous traffic data (IP, referrer hostname). Mention this in your site\u2019s Privacy Policy."}
        </AlertBanner>
      </div>

      {/* Browser-frame önizleme */}
      <section className="bz-card p-4 sm:p-5">
        <header className="mb-3 flex items-center gap-2">
          <Sparkles size={14} className="text-[#0A0A0A]" />
          <Eyebrow>{isTr ? 'SİTENİZDE NASIL GÖRÜNECEK' : 'HOW IT LOOKS ON YOUR SITE'}</Eyebrow>
        </header>
        <EmbedBrowserPreview
          slug={slug}
          websiteDomain={websiteDomain}
          businessName={businessName}
          theme={theme}
          variant={variant}
          isTr={isTr}
        />
      </section>
    </div>
  );
}

export default BusinessWebsiteSettings;
