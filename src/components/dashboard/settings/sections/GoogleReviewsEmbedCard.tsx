'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Copy } from 'lucide-react';
import { AlertBanner, Badge, Eyebrow } from '@/components/ui';
import { ownerGoogleMessage } from '@/lib/google-owner-copy';

const APP_URL =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL
    : 'https://www.buaze.com';

interface StatusPayload {
  tenantAllowed?: boolean;
  connected?: boolean;
  connectionState?: 'not_connected' | 'connected' | 'reconnect_required' | 'broken';
  selectedLocation?: unknown;
  showcase?: { fetchedAt: string | null; totalReviewCount: number } | null;
}

/**
 * Google reviews widget code (CLAUDE.md §53). Shows "coming soon" for a
 * workspace outside GBP_ALLOWED_TENANTS; otherwise the iframe snippet for
 * `/embed/{slug}/google`, which reads the server cache only.
 */
export default function GoogleReviewsEmbedCard({
  restaurantId,
  slug,
  locale,
}: {
  restaurantId: string;
  slug: string;
  locale: 'tr' | 'en';
}) {
  const isTr = locale === 'tr';
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/restaurants/${restaurantId}/google/business/status`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: StatusPayload | null) => {
        if (!cancelled) setStatus(data ?? {});
      })
      .catch(() => {
        if (!cancelled) setStatus({});
      });
    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  const snippet = useMemo(() => {
    const lang = isTr ? '' : '&lang=en';
    return `<iframe src="${APP_URL}/embed/${slug}/google?theme=${theme}${lang}" width="100%" height="620" frameborder="0" loading="lazy" title="${isTr ? 'Google yorumları' : 'Google reviews'}" style="border:none;max-width:640px"></iframe>`;
  }, [slug, theme, isTr]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard denied — user can select the code */
    }
  };

  if (!status) return null;

  const ready = Boolean(status.connected && status.selectedLocation && status.showcase?.fetchedAt);

  return (
    <section className="bz-card p-4 sm:p-5 space-y-3" aria-labelledby="google-embed-title">
      <header className="flex flex-wrap items-center gap-2">
        <Eyebrow>{isTr ? 'GOOGLE YORUMLARI WIDGETI' : 'GOOGLE REVIEWS WIDGET'}</Eyebrow>
        {status.tenantAllowed === false && (
          <Badge kind="warn" dot={false}>{ownerGoogleMessage('reply_badge_coming_soon', locale)}</Badge>
        )}
      </header>
      <h3 id="google-embed-title" className="sr-only">
        {isTr ? 'Google yorumları widgetı' : 'Google reviews widget'}
      </h3>

      {status.tenantAllowed === false ? (
        <p className="text-[13px] leading-[1.6] text-[#525252]">
          {ownerGoogleMessage('reply_coming_soon', locale)}
        </p>
      ) : !ready ? (
        <p className="text-[13px] leading-[1.6] text-[#525252]">
          {isTr
            ? 'Google hesabını bağlayıp konumunu seçtiğinde yorumların birkaç saat içinde hazırlanır ve kod burada görünür.'
            : 'Once you connect your Google account and pick your location, your reviews are prepared within a few hours and the code appears here.'}{' '}
          <Link href={`/${locale}/dashboard/google-reviews?restaurantId=${restaurantId}`} className="font-medium text-[#0A0A0A] underline">
            {isTr ? 'Google Yorumları sayfası' : 'Google Reviews page'}
          </Link>
        </p>
      ) : (
        <>
          {(status.connectionState === 'reconnect_required' || status.connectionState === 'broken') && (
            <AlertBanner kind="warn">
              {ownerGoogleMessage(
                status.connectionState === 'reconnect_required'
                  ? 'reply_reconnect_client_changed'
                  : 'reply_connection_broken',
                locale,
              )}
            </AlertBanner>
          )}
          <p className="text-[12.5px] text-[#525252]">
            {isTr
              ? 'Google ortalaman, toplam yorum sayın ve son yorumların "Google yorumları" başlığıyla görünür. Yorumlar 6–12 saatte bir yenilenir.'
              : 'Your Google average, total review count and latest reviews appear under a "Google reviews" heading. Reviews refresh every 6–12 hours.'}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="inline-flex items-center gap-1 rounded-lg border border-[#EDEDED] p-1" role="group" aria-label={isTr ? 'Tema' : 'Theme'}>
              {(['light', 'dark'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  aria-pressed={theme === t}
                  className={`min-h-[44px] rounded-md px-2.5 py-1 text-[12px] font-medium sm:min-h-0 ${theme === t ? 'bg-[#0A0A0A] text-white' : 'text-[#525252] hover:bg-[#F5F5F5]'}`}
                >
                  {t === 'light' ? (isTr ? 'Açık' : 'Light') : isTr ? 'Koyu' : 'Dark'}
                </button>
              ))}
            </div>
            <a
              href={`/embed/${slug}/google?theme=${theme}${isTr ? '' : '&lang=en'}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bz-btn-ghost min-h-11 w-full sm:w-auto"
            >
              {isTr ? 'Önizle' : 'Preview'}
            </a>
          </div>
          <div className="relative">
            <pre className="overflow-x-auto rounded-lg bg-[#0A0A0A] p-3 pr-12 text-[11.5px] leading-[1.5] text-white">
              <code>{snippet}</code>
            </pre>
            <button
              type="button"
              onClick={copy}
              className="absolute right-2 top-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md bg-white/10 text-white hover:bg-white/20 sm:min-h-8 sm:min-w-8"
              aria-label={isTr ? 'Kodu kopyala' : 'Copy code'}
            >
              {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
