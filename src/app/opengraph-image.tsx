import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const revalidate = 3600;
export const alt = 'Buaze - Every review is a pulse';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  const image = await readFile(join(process.cwd(), 'public/images/open-graph-en.png'));

  return new Response(new Uint8Array(image), {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
