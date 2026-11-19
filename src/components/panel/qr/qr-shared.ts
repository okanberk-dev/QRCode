import type { PlatformId } from '@/components/ui';

/**
 * QR helpers shared by the QR card and the owner + admin QR list views.
 * They used to be copied into each of the three files and had drifted
 * (8 of the 10 review platforms, the admin list still downloading the old
 * framed PNG).
 */

/** Review platform → brand chip. All 10 platforms (CLAUDE.md §5). */
export const QR_PLATFORM_TO_CHIP: Record<string, PlatformId> = {
  google: 'google',
  yemeksepeti: 'yemeksepeti',
  getir: 'getir',
  trendyol_go: 'trendyol_go',
  tripadvisor: 'tripadvisor',
  airbnb: 'airbnb',
  booking: 'booking',
  yandex: 'yandex',
  yelp: 'yelp',
  foursquare: 'foursquare',
};

export const QR_PLATFORM_LABELS: Record<string, string> = {
  google: 'Google Maps',
  yemeksepeti: 'Yemeksepeti',
  getir: 'Getir Yemek',
  trendyol_go: 'Trendyol GO',
  tripadvisor: 'Tripadvisor',
  airbnb: 'Airbnb',
  booking: 'Booking',
  yandex: 'Yandex',
  yelp: 'Yelp',
  foursquare: 'Foursquare',
};

/**
 * Platform filter options built from the QR codes that exist, in the order
 * above (unknown values last), instead of a fixed short list.
 */
export function qrPlatformFilterOptions(
  platforms: Iterable<string | null | undefined>,
  labels: { all: string; general: string },
): Array<{ value: string; label: string }> {
  const present = new Set<string>();
  let hasGeneral = false;
  for (const p of platforms) {
    if (p) present.add(p);
    else hasGeneral = true;
  }
  const known = Object.keys(QR_PLATFORM_LABELS).filter((key) => present.has(key));
  const unknown = [...present].filter((key) => !(key in QR_PLATFORM_LABELS)).sort();
  return [
    { value: 'all', label: labels.all },
    ...(hasGeneral ? [{ value: 'general', label: labels.general }] : []),
    ...[...known, ...unknown].map((key) => ({ value: key, label: QR_PLATFORM_LABELS[key] ?? key })),
  ];
}

/** ASCII file name ("Kadıköy · Masa 4" → "Kadikoy-Masa-4"); "ı" kept as "i". */
export function safeQrFileName(name: string): string {
  return (
    name
      .replace(/ı/g, 'i')
      .replace(/İ/g, 'I')
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'qr'
  );
}

export interface QrDownloadTarget {
  restaurantId: string;
  tableNumber?: string | null;
  platform?: string | null;
  darkColor?: string | null;
  lightColor?: string | null;
}

/**
 * Server URL for a QR image. `style=plain` is the bare QR in the saved
 * colours — the framed "premium" composer drew text that Vercel could not
 * render (tofu boxes), so every download and preview uses plain.
 */
export function buildQrImageUrl(
  item: QrDownloadTarget,
  options: { format: 'png' | 'svg'; width?: number; style?: 'premium' | 'plain' },
): string {
  const params = new URLSearchParams({ format: options.format });
  if (item.tableNumber) params.set('table', item.tableNumber);
  if (item.platform) params.set('platform', item.platform);
  if (item.darkColor && item.lightColor) {
    params.set('dark', item.darkColor);
    params.set('light', item.lightColor);
  }
  if (options.width) params.set('width', String(options.width));
  if (options.style === 'plain') params.set('style', 'plain');
  return `/api/restaurants/${item.restaurantId}/qr?${params.toString()}`;
}

export type QrDownloadErrorKind = 'http' | 'content' | 'empty' | 'network';

export class QrDownloadError extends Error {
  constructor(
    readonly kind: QrDownloadErrorKind,
    readonly detail: string | number | null = null,
  ) {
    super(`qr-download:${kind}`);
  }
}

/**
 * Downloads the print-size (1080 px) plain PNG under `qr-<name>.png`.
 * Throws {@link QrDownloadError}; the caller words the message.
 *
 * Cleanup is deferred: revoking the object URL right after `click()`
 * cancels the transfer on iOS Safari and some Chrome versions.
 */
export async function downloadQrPng(item: QrDownloadTarget, name: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(buildQrImageUrl(item, { format: 'png', width: 1080, style: 'plain' }));
  } catch {
    throw new QrDownloadError('network');
  }
  if (!res.ok) throw new QrDownloadError('http', res.status);
  if (!(res.headers.get('content-type') || '').includes('image/png')) {
    throw new QrDownloadError('content');
  }
  const blob = await res.blob();
  // A PNG header alone is ~70 bytes; anything below 100 is a broken render.
  if (blob.size < 100) throw new QrDownloadError('empty', blob.size);
  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objUrl;
  a.download = `qr-${safeQrFileName(name)}.png`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  window.setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(objUrl);
  }, 1000);
}

export function qrDownloadErrorMessage(err: unknown, isTr: boolean): string {
  const e = err instanceof QrDownloadError ? err : new QrDownloadError('network');
  switch (e.kind) {
    case 'http':
      return isTr
        ? `İndirilemedi (HTTP ${e.detail}). Lütfen tekrar deneyin.`
        : `Download failed (HTTP ${e.detail}). Please retry.`;
    case 'content':
      return isTr
        ? 'Sunucu beklenmedik içerik döndürdü. Sayfayı yenileyip tekrar deneyin.'
        : 'Server returned unexpected content. Refresh and retry.';
    case 'empty':
      return isTr
        ? `Boş dosya alındı (${e.detail} B). Tekrar deneyin; sorun sürerse destek ile iletişime geçin.`
        : `Empty file (${e.detail} B). Please retry; contact support if the issue persists.`;
    default:
      return isTr ? 'Bağlantı hatası. İnternet bağlantınızı kontrol edin.' : 'Network error.';
  }
}
