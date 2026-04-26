import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Locale } from '@/lib/translations';

export const revalidate = 3600;
export const alt = 'Buaze - Her yorum bir nabız';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const fileName = locale === 'tr' ? 'open-graph-tr.png' : 'open-graph-en.png';
  const image = await readFile(join(process.cwd(), 'public/images', fileName));

  return new Response(new Uint8Array(image), {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
