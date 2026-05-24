import { readFile } from 'node:fs/promises';

export const revalidate = 3600;
export const alt = 'Buaze - Every review is a pulse';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

// Vercel serverless function root is NOT `repo/` — `process.cwd()` resolves
// to `.next/server/app/...` and `public/` is not bundled with the
// function. The previous `join(process.cwd(), 'public/images/...')` path
// produced ENOENT 500s on every bot crawl (§38.B Stage 122 Vercel logs).
//
// Vercel's nft (Node File Trace) tracer follows `new URL(..., import.meta.url)`
// references and ships the resolved asset inside the serverless bundle.
// Co-located under `src/og-assets/` so the trace is unambiguous.
const OG_IMAGE_URL = new URL('../og-assets/open-graph-en.png', import.meta.url);

export default async function Image() {
  const image = await readFile(OG_IMAGE_URL);

  return new Response(new Uint8Array(image), {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
