import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Check, Copy, Download, Loader2, RefreshCw } from 'lucide-react';
import { AlertBanner, Modal } from '@/components/ui';
import { mapMenuApiError } from '@/lib/menu-api-error';
import { SITE_URL } from '@/lib/site';
import type { MenuCopy } from './menu-copy';
import type { RestaurantShape } from './menu-types';
import { copyText } from './menu-ui';

type Preview =
  | { state: 'loading' }
  | { state: 'ready'; imageUrl: string; menuUrl: string | null; adjusted: boolean }
  | { state: 'error'; message: string };

/** Read the error body of a failed QR request into an owner-facing sentence. */
async function describeFailure(res: Response, isTr: boolean): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: unknown; code?: unknown } | null;
  return mapMenuApiError(
    {
      status: res.status,
      code: typeof body?.code === 'string' ? body.code : null,
      error: typeof body?.error === 'string' ? body.error : null,
    },
    isTr,
  );
}

/**
 * Share the menu: the link (the exact address the QR points at), the QR to
 * download — PNG for everyday use, SVG for print — and what to do with it.
 * Open to viewers too (they can read and download; only publishing is
 * limited to people who can edit).
 */
export function MenuShareModal({
  restaurantId, restaurant, isTr, copy, canPublish, hasPublishableItems, publishBusy, analyticsHref,
  onPublish, onClose,
}: {
  restaurantId: string;
  restaurant: RestaurantShape;
  isTr: boolean;
  copy: MenuCopy;
  /** The person may edit the menu (not a viewer, not locked, role loaded). */
  canPublish: boolean;
  /** At least one item would show up on the public menu. */
  hasPublishableItems: boolean;
  publishBusy: boolean;
  analyticsHref: string;
  onPublish: () => void;
  onClose: () => void;
}) {
  const [preview, setPreview] = useState<Preview>({ state: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState<'png' | 'svg' | null>(null);
  const [downloaded, setDownloaded] = useState<'png' | 'svg' | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const downloadedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      if (downloadedTimer.current) clearTimeout(downloadedTimer.current);
    },
    [],
  );

  // The preview request also tells us the address the QR encodes and whether
  // its colour had to be darkened — both come back as response headers.
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;
    setPreview({ state: 'loading' });
    (async () => {
      try {
        const res = await fetch(`/api/restaurants/${restaurantId}/menu/qr?format=svg&width=400`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          setPreview({ state: 'error', message: await describeFailure(res, isTr) });
          return;
        }
        const svg = await res.text();
        // Shown through an <img> (not injected as markup).
        objectUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
        setPreview({
          state: 'ready',
          imageUrl: objectUrl,
          menuUrl: res.headers.get('X-Menu-Url'),
          adjusted: res.headers.get('X-Qr-Color-Adjusted') === '1',
        });
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setPreview({ state: 'error', message: mapMenuApiError(e as Error, isTr) });
      }
    })();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [restaurantId, isTr, attempt]);

  // The QR's own address when we have it; the site address otherwise (never
  // `window.location.origin`: on a preview deployment that would differ from the code).
  const menuUrl = (preview.state === 'ready' && preview.menuUrl) || `${SITE_URL}/menu/${restaurant.slug}`;

  const doCopy = async () => {
    if (await copyText(menuUrl)) {
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 2000);
    }
  };

  const download = useCallback(
    async (format: 'png' | 'svg') => {
      setDownloading(format);
      setDownloadError(null);
      try {
        const query = format === 'png' ? 'format=png&width=1200' : 'format=svg&width=1200';
        const res = await fetch(`/api/restaurants/${restaurantId}/menu/qr?${query}`);
        if (!res.ok) {
          setDownloadError(await describeFailure(res, isTr));
          return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `menu-qr-${restaurant.slug}.${format}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        // Revoking at once can cancel the download in some browsers.
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        setDownloaded(format);
        if (downloadedTimer.current) clearTimeout(downloadedTimer.current);
        downloadedTimer.current = setTimeout(() => setDownloaded(null), 2500);
      } catch (e) {
        setDownloadError(mapMenuApiError(e as Error, isTr));
      } finally {
        setDownloading(null);
      }
    },
    [restaurantId, restaurant.slug, isTr],
  );

  const draft = !restaurant.menuPublished;

  return (
    <Modal
      size={520}
      title={copy.shareAndQr}
      onClose={onClose}
      footer={
        // In the footer so the main action is on screen on a short phone too.
        <div className="flex w-full flex-col-reverse items-stretch gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <button
            type="button"
            onClick={() => void download('svg')}
            disabled={downloading !== null || preview.state !== 'ready'}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-[#525252] underline-offset-2 hover:text-[#0A0A0A] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] disabled:opacity-50"
          >
            {downloading === 'svg' && <Loader2 size={13} className="animate-spin" />}
            {downloaded === 'svg' ? copy.downloaded : copy.downloadPrint}
          </button>
          <button
            type="button"
            onClick={() => void download('png')}
            disabled={downloading !== null || preview.state !== 'ready'}
            className="bz-btn-lime h-12 w-full text-[14px] sm:w-auto sm:px-6"
          >
            {downloading === 'png' ? (
              <Loader2 size={15} className="animate-spin" />
            ) : downloaded === 'png' ? (
              <Check size={15} strokeWidth={2.5} aria-hidden="true" />
            ) : (
              <Download size={15} strokeWidth={2} aria-hidden="true" />
            )}
            <span aria-live="polite">{downloaded === 'png' ? copy.downloaded : copy.downloadQr}</span>
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {draft && (
          <AlertBanner kind="warn" icon={<AlertTriangle size={14} strokeWidth={2} className="mt-0.5" />}>
            <span className="block">{copy.shareDraftWarning}</span>
            {canPublish && hasPublishableItems && (
              <button
                type="button"
                onClick={onPublish}
                disabled={publishBusy}
                className="bz-btn-primary mt-2.5"
              >
                {publishBusy && <Loader2 size={14} className="animate-spin" />}
                {copy.publish}
              </button>
            )}
            {canPublish && !hasPublishableItems && (
              <span className="mt-1.5 block font-semibold">{copy.publishNeedsItem}</span>
            )}
          </AlertBanner>
        )}

        {/* Link */}
        <div>
          <label htmlFor="menu-share-link" className="mb-1.5 block text-[12px] font-semibold text-[#0A0A0A]">
            {copy.menuLink}
          </label>
          <div className="flex items-stretch gap-2">
            {preview.state === 'loading' ? (
              <div className="bz-skeleton h-11 min-w-0 flex-1 rounded-2xl" aria-hidden="true" />
            ) : (
              <input
                id="menu-share-link"
                readOnly
                value={menuUrl}
                onFocus={(e) => e.currentTarget.select()}
                inputMode="url"
                autoCapitalize="off"
                spellCheck={false}
                className="bz-card h-11 min-w-0 flex-1 truncate px-4 text-[13px] text-[#0A0A0A] outline-none focus:border-[#0A0A0A] focus:ring-2 focus:ring-[#C6F24E]/40"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            )}
            <button
              type="button"
              onClick={() => void doCopy()}
              className="bz-btn-ghost h-11 shrink-0"
              aria-live="polite"
            >
              {copied ? <Check size={14} strokeWidth={2.25} aria-hidden="true" /> : <Copy size={14} strokeWidth={2} aria-hidden="true" />}
              {copied ? copy.copied : copy.copyShort}
            </button>
          </div>
        </div>

        {/* QR */}
        <div className="flex items-center justify-center rounded-3xl bg-gradient-to-br from-[#FAFAFA] to-[#F5F5F5] p-6 ring-1 ring-[#EDEDED]">
          {preview.state === 'ready' ? (
            <img src={preview.imageUrl} alt={copy.qrAlt} width={220} height={220} className="h-[220px] w-[220px]" />
          ) : preview.state === 'error' ? (
            <div className="flex h-[220px] w-full max-w-[260px] flex-col items-center justify-center gap-3 text-center">
              <AlertTriangle size={24} strokeWidth={2} className="text-[#DC2626]" aria-hidden="true" />
              <p role="alert" className="text-[13px] text-[#991B1B]">{preview.message}</p>
              <button type="button" onClick={() => setAttempt((n) => n + 1)} className="bz-btn-ghost">
                <RefreshCw size={13} strokeWidth={2} aria-hidden="true" />
                {copy.retry}
              </button>
            </div>
          ) : (
            <div className="flex h-[220px] w-[220px] items-center justify-center" aria-hidden="true">
              <Loader2 size={28} className="animate-spin text-[#737373]" />
            </div>
          )}
        </div>

        {preview.state === 'ready' && preview.adjusted && (
          <p className="text-[12.5px] leading-relaxed text-[#525252]">{copy.qrAdjusted}</p>
        )}

        {downloadError && (
          <AlertBanner kind="danger" icon={<AlertTriangle size={14} strokeWidth={2} className="mt-0.5" />} onDismiss={() => setDownloadError(null)}>
            {downloadError}
          </AlertBanner>
        )}

        <p className="text-[12.5px] leading-relaxed text-[#737373]">
          {copy.shareTip}{' '}
          <Link href={analyticsHref} className="font-semibold text-[#0A0A0A] underline underline-offset-2">
            {copy.openAnalytics}
          </Link>
        </p>
      </div>
    </Modal>
  );
}
