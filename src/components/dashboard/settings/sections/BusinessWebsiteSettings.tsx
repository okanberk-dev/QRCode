'use client';

import { useEffect, useMemo, useState } from 'react';
import { Code, Copy, Check, Globe, Info, Loader2, Sparkles } from 'lucide-react';
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

interface DomainStat {
  domain: string;
  count: number;
  firstSeen: string | null;
  lastSeen: string | null;
}

interface StatsResponse {
  totalViews: number;
  byDomain: DomainStat[];
  days: number;
}

const APP_URL =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL
    : 'https://buaze.com';

function relativeTime(iso: string | null, isTr: boolean): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return '—';
  const m = Math.floor(diff / 60_000);
  if (m < 60) return isTr ? `${m} dk önce` : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return isTr ? `${h} sa önce` : `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return isTr ? `${d} gün önce` : `${d}d ago`;
  const mo = Math.floor(d / 30);
  return isTr ? `${mo} ay önce` : `${mo}mo ago`;
}

/**
 * Web sitesi widget — embed kod kopyala + tema/boyut + browser-frame
 * önizleme + kullanan siteler. Settings tab içinde gömülü ("keşif"
 * pattern, ana navigasyonda flag yok).
 */
export function BusinessWebsiteSettings({
  restaurantId,
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

  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatsLoading(true);
    setStatsError(null);
    (async () => {
      try {
        const res = await fetch(
          `/api/restaurants/${restaurantId}/embed-stats?days=30&limit=10`,
        );
        if (!cancelled && res.ok) {
          setStats((await res.json()) as StatsResponse);
        } else if (!cancelled) {
          setStatsError(isTr ? 'Veriler alınamadı.' : 'Stats failed to load.');
        }
      } catch {
        if (!cancelled) setStatsError(isTr ? 'Ağ hatası.' : 'Network error.');
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [restaurantId, isTr]);

  const embedSnippet = useMemo(() => {
    // Variant → iframe height map. Each layout reserves vertical space for
    // its content; numbers tuned against the actual server-rendered heights.
    // Inlined inside useMemo so the constant doesn't drift into the deps
    // array of an outer Memo.
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
              ? 'İşletmenizin web sitesine Buaze yorum widget’ı'
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
              className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-md border border-[#EDEDED] bg-white px-2.5 py-1 text-[11px] font-medium text-[#0A0A0A] hover:bg-[#FAFAFA]"
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
            ? 'Widget kullanımında anonim trafik verisi (IP, referans alan adı) toplanır. Sitenizin Gizlilik Politikası’nda belirtmenizi öneririz.'
            : 'Widget collects anonymous traffic data (IP, referrer hostname). Mention this in your site’s Privacy Policy.'}
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

      {/* Kullanan siteler */}
      <section className="bz-card p-4 sm:p-5">
        <header className="mb-3 flex items-center gap-2">
          <Globe size={14} className="text-[#0A0A0A]" />
          <Eyebrow>{isTr ? 'KULLANAN SİTELER' : 'SITES USING WIDGET'}</Eyebrow>
        </header>
        <p className="text-[12px] text-[#737373] mb-3">
          {isTr
            ? 'Son 30 günde widget’ınızın yüklendiği siteler.'
            : 'Sites that loaded your widget in the last 30 days.'}
        </p>

        {statsLoading ? (
          <div className="flex items-center gap-2 text-[12px] text-[#737373]">
            <Loader2 className="animate-spin" size={14} />
            {isTr ? 'Yükleniyor…' : 'Loading…'}
          </div>
        ) : statsError ? (
          <AlertBanner kind="danger">{statsError}</AlertBanner>
        ) : !stats || stats.byDomain.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#EDEDED] bg-[#FAFAFA] p-4 text-center text-[12px] text-[#737373]">
            <Code size={20} className="mx-auto mb-2 text-[#A3A3A3]" />
            {isTr
              ? 'Widget henüz hiçbir siteden yüklenmedi. Yukarıdaki kodu sitenize yapıştırın.'
              : 'Widget hasn’t been loaded from any site yet. Paste the code above into your site.'}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[#EDEDED]">
            <table className="w-full text-[12px]">
              <thead className="bg-[#FAFAFA]">
                <tr className="text-left">
                  <th className="px-3 py-2 pulse-eyebrow text-[#737373]">
                    {isTr ? 'ALAN ADI' : 'DOMAIN'}
                  </th>
                  <th className="px-3 py-2 pulse-eyebrow text-[#737373] text-right">
                    {isTr ? 'GÖRÜNTÜ' : 'VIEWS'}
                  </th>
                  <th className="px-3 py-2 pulse-eyebrow text-[#737373] text-right">
                    {isTr ? 'SON' : 'LAST'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.byDomain.map((d) => (
                  <tr key={d.domain} className="border-t border-[#EDEDED]">
                    <td className="px-3 py-2 font-medium truncate max-w-[260px]">{d.domain}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {d.count.toLocaleString(isTr ? 'tr-TR' : 'en-US')}
                    </td>
                    <td className="px-3 py-2 text-right text-[#737373]">
                      {relativeTime(d.lastSeen, isTr)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-[#EDEDED] bg-[#FAFAFA] px-3 py-2 text-[11px] text-[#737373]">
              {isTr
                ? `Toplam ${stats.totalViews.toLocaleString('tr-TR')} görüntü · son 30 gün`
                : `${stats.totalViews.toLocaleString('en-US')} total views · last 30 days`}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default BusinessWebsiteSettings;
