// Client-side image compression using native Canvas APIs. No external deps.
// Resizes to `maxDim` (longest side) and re-encodes as WebP. Returns the
// compressed File, or the original if the browser lacks the required APIs.
export async function compressImage(
  file: File,
  opts: { maxDim?: number; quality?: number } = {},
): Promise<File> {
  const { maxDim = 1600, quality = 0.85 } = opts;
  if (typeof window === 'undefined') return file;
  if (!file.type.startsWith('image/')) return file;
  // SVGs already tiny; no benefit to rasterizing them.
  if (file.type === 'image/svg+xml') return file;

  const hasBitmap = typeof (window as unknown as { createImageBitmap?: unknown }).createImageBitmap === 'function';
  const hasOffscreen = typeof (window as unknown as { OffscreenCanvas?: unknown }).OffscreenCanvas === 'function';

  try {
    let width: number;
    let height: number;
    let source: CanvasImageSource;

    if (hasBitmap) {
      const bitmap = await createImageBitmap(file);
      width = bitmap.width;
      height = bitmap.height;
      source = bitmap;
    } else {
      // Fallback: HTMLImageElement via object URL.
      const url = URL.createObjectURL(file);
      const img = await loadImage(url);
      URL.revokeObjectURL(url);
      width = img.naturalWidth;
      height = img.naturalHeight;
      source = img;
    }

    const scale = Math.min(1, maxDim / Math.max(width, height));
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);

    // Skip work if image is already smaller than target and already webp.
    if (scale === 1 && file.type === 'image/webp' && file.size < 500 * 1024) {
      return file;
    }

    const canvas: HTMLCanvasElement | OffscreenCanvas = hasOffscreen
      ? new OffscreenCanvas(w, h)
      : Object.assign(document.createElement('canvas'), { width: w, height: h });
    const ctx = (canvas as HTMLCanvasElement | OffscreenCanvas).getContext('2d') as CanvasRenderingContext2D | null;
    if (!ctx) return file;
    ctx.drawImage(source, 0, 0, w, h);

    let blob: Blob | null = null;
    if (canvas instanceof OffscreenCanvas) {
      blob = await canvas.convertToBlob({ type: 'image/webp', quality });
    } else {
      blob = await new Promise<Blob | null>((resolve) =>
        (canvas as HTMLCanvasElement).toBlob(resolve, 'image/webp', quality),
      );
    }
    if (!blob) return file;

    // If compression somehow made it bigger, keep the original.
    if (blob.size >= file.size && file.type === 'image/webp') return file;

    const name = file.name.replace(/\.[^.]+$/, '') + '.webp';
    return new File([blob], name, { type: 'image/webp' });
  } catch {
    return file;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = src;
  });
}
