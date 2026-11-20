'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Check, Copy, Download, Loader2, RefreshCw, Share2 } from 'lucide-react';
import { AlertBanner, Modal } from '@/components/ui';
import { copyToClipboard } from '@/lib/clipboard';
import { mapMenuApiError } from '@/lib/menu-api-error';
import { SITE_URL } from '@/lib/site';
import { menuApi } from '../data/menu-api';
import type { MenuCopy } from '../menu-i18n';
import type { RestaurantShape } from '../menu-types';

type Preview =
  | { state: 'loading' }
  | { state: 'ready'; imageUrl: string; menuUrl: string | null; adjusted: boolean }
  | { state: 'error'; message: string };

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
 * "Paylaş ve QR" (spec §7.12) — the old share dialog's logic 1:1: the link is
 * the exact address the QR encodes (`X-Menu-Url`, else `SITE_URL/menu/<slug>`,
 * never `window.location.origin`), QR preview as an SVG `<img>`, PNG 1200 /
 * SVG 1200 downloads named `menu-qr-<slug>.<ext>`, the colour-darkened note,
 * the draft warning with "Yayına al". Added: "Paylaş…" where the browser can
 * share (`navigator.share`). Viewers may open it and download.
 */
export function ShareDialog({
  restaurantId, restaurant, isTr, copy, canPublish, hasPublishableItems, publishBusy, analyticsHref, onPublish, onClose,
}: {
  restaurantId: string;
  restaurant: RestaurantShape;
  isTr: boolean;
  copy: MenuCopy;
  canPublish: boolean;
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
  const [canShare, setCanShare] = useState(false);
  const timers = useRef<number[]>([]);
  const api = menuApi(restaurantId, isTr);

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;
    setPreview({ state: 'loading' });
    (async () => {
      try {
        const res = await fetch(menuApi(restaurantId, isTr).qrUrl({ format: 'svg', width: 400 }), { signal: controller.signal });
        if (!res.ok) {
          setPreview({ state: 'error', message: await describeFailure(res, isTr) });
          return;
        }
        const svg = await res.text();
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

  const menuUrl = (preview.state === 'ready' && preview.menuUrl) || `${SITE_URL}/menu/${restaurant.slug}`;

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const doCopy = async () => {
    if (await copyToClipboard(menuUrl)) {
      setCopied(true);
      later(() => setCopied(false), 2000);
    }
  };

  const doShare = async () => {
    try {
      await navigator.share({ title: restaurant.name, url: menuUrl });
    } catch {
      /* cancelled (AbortError) or refused — nothing to say */
    }
  };

  const download = useCallback(
    async (format: 'png' | 'svg') => {
      setDownloading(format);
      setDownloadError(null);
      try {
        const res = await fetch(api.qrUrl({ format, width: 1200 }));
        if (!res.ok) {
          setDownloadError(await describeFailure(res, isTr));
          return;
        }
        const url = URL.createObjectURL(await res.blob());
        const link = document.createElement('a');
        link.href = url;
        link.download = `menu-qr-${restaurant.slug}.${format}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        // Revoking at once can cancel the download in some browsers.
        window.setTimeout(() => URL.revokeObjectURL(url), 2000);
        setDownloaded(format);
        later(() => setDownloaded(null), 2500);
      } catch (e) {
        setDownloadError(mapMenuApiError(e as Error, isTr));
      } finally {
        setDownloading(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `api` is rebuilt from these two values
    [restaurantId, restaurant.slug, isTr],
  );

  const draft = !restaurant.menuPublished;
  const notReady = downloading !== null || preview.state !== 'ready';

  return (
    <Modal
      size={640}
      title={copy.share.title}
      onClose={onClose}
      footer={
        <div className="flex w-full flex-col-reverse items-stretch gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <button
            type="button"
            onClick={() => void download('svg')}
            disabled={notReady}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-[#525252] underline-offset-2 hover:text-[#0A0A0A] hover:underline disabled:opacity-50"
          >
            {downloading === 'svg' && <Loader2 size={13} className="animate-spin" aria-hidden="true" />}
            {downloaded === 'svg' ? copy.share.downloaded : copy.share.downloadPrint}
          </button>
          <button type="button" onClick={() => void download('png')} disabled={notReady} className="bz-btn-lime h-12 w-full text-[14px] sm:w-auto sm:px-6">
            {downloading === 'png' ? (
              <Loader2 size={15} className="animate-spin" aria-hidden="true" />
            ) : downloaded === 'png' ? (
              <Check size={15} strokeWidth={2.5} aria-hidden="true" />
            ) : (
              <Download size={15} strokeWidth={2} aria-hidden="true" />
            )}
            {downloaded === 'png' ? copy.share.downloaded : copy.share.downloadQr}
          </button>
        </div>
      }
    >
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-w-0 space-y-5">
          {draft && (
            <AlertBanner kind="warn" icon={<AlertTriangle size={14} strokeWidth={2} className="mt-0.5" />}>
              <span className="block">{copy.share.draftWarning}</span>
              {canPublish && hasPublishableItems && (
                <button type="button" onClick={onPublish} disabled={publishBusy} className="bz-btn-primary mt-2.5">
                  {publishBusy && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                  {copy.share.publish}
                </button>
              )}
              {canPublish && !hasPublishableItems && <span className="mt-1.5 block font-semibold">{copy.status.publishNeedsItem}</span>}
            </AlertBanner>
          )}
          <div>
            <label htmlFor="menu-share-link" className="mb-1.5 block text-[12px] font-semibold text-[#0A0A0A]">
              {copy.share.menuLink}
            </label>
            {preview.state === 'loading' ? (
              <div className="h-11 rounded-lg bg-[#EDEDED]" aria-hidden="true" />
            ) : (
              <input
                id="menu-share-link"
                readOnly
                value={menuUrl}
                onFocus={(e) => e.currentTarget.select()}
                spellCheck={false}
                className="bz-input h-11 truncate font-mono text-[13px]"
              />
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => void doCopy()} className="bz-btn-ghost">
                {copied ? <Check size={14} strokeWidth={2.25} aria-hidden="true" /> : <Copy size={14} strokeWidth={2} aria-hidden="true" />}
                <span aria-live="off">{copied ? copy.share.copied : copy.share.copy}</span>
              </button>
              {canShare && (
                <button type="button" onClick={() => void doShare()} className="bz-btn-ghost">
                  <Share2 size={14} strokeWidth={2} aria-hidden="true" />
                  {copy.share.nativeShare}
                </button>
              )}
            </div>
            <p role="status" className="sr-only">
              {copied ? copy.share.copied : ''}
            </p>
          </div>
          {preview.state === 'ready' && preview.adjusted && (
            <p className="text-[12.5px] leading-relaxed text-[#525252]">{copy.share.qrAdjusted}</p>
          )}
          {downloadError && (
            <AlertBanner kind="danger" icon={<AlertTriangle size={14} strokeWidth={2} className="mt-0.5" />} onDismiss={() => setDownloadError(null)}>
              {downloadError}
            </AlertBanner>
          )}
          <p className="text-[12.5px] leading-relaxed text-[#737373]">
            {copy.share.shareTip}{' '}
            <Link href={analyticsHref} className="font-semibold text-[#0A0A0A] underline underline-offset-2">
              {copy.share.openAnalytics} →
            </Link>
          </p>
        </div>
        <div className="flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#FAFAFA] to-[#F5F5F5] p-5 ring-1 ring-[#EDEDED] sm:self-start">
          {preview.state === 'ready' ? (
            <img src={preview.imageUrl} alt={copy.share.qrAlt} width={200} height={200} className="h-[200px] w-[200px]" />
          ) : preview.state === 'error' ? (
            <div className="flex h-[200px] w-full flex-col items-center justify-center gap-3 text-center">
              <AlertTriangle size={22} strokeWidth={2} className="text-[#DC2626]" aria-hidden="true" />
              <p role="alert" className="text-[13px] text-[#991B1B]">
                {preview.message}
              </p>
              <button type="button" onClick={() => setAttempt((n) => n + 1)} className="bz-btn-ghost">
                <RefreshCw size={13} strokeWidth={2} aria-hidden="true" />
                {copy.share.retry}
              </button>
            </div>
          ) : (
            <div className="flex h-[200px] w-[200px] items-center justify-center" aria-hidden="true">
              <Loader2 size={26} className="animate-spin text-[#737373]" />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
