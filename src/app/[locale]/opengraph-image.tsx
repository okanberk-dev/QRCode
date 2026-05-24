import { readFile } from 'node:fs/promises';
import type { Locale } from '@/lib/translations';

export const revalidate = 3600;
export const alt = 'Buaze - Her yorum bir nabız';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

// See `src/app/opengraph-image.tsx` for rationale: `process.cwd()` does
// not resolve `public/` on Vercel — use `new URL(..., import.meta.url)`
// so the nft tracer ships the PNGs inside the serverless bundle.
const OG_TR_URL = new URL('../../og-assets/open-graph-tr.png', import.meta.url);
const OG_EN_URL = new URL('../../og-assets/open-graph-en.png', import.meta.url);

export default async function Image({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const imageUrl = locale === 'tr' ? OG_TR_URL : OG_EN_URL;
  const image = await readFile(imageUrl);

  return new Response(new Uint8Array(image), {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
