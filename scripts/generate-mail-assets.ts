// Mail icon assets — PNG renders of the Buaze mark / ECG divider / Instagram glyph.
//
// Why PNG: Gmail and Outlook strip inline <svg>, so the logo mark in every
// mail header rendered as an empty gap. Mails reference these files as
// <img src="${APP_URL}/mail/<name>.png"> instead (see src/lib/email/tokens.ts
// `mailAsset`). Re-run after changing the mark:
//
//   npx tsx scripts/generate-mail-assets.ts
//
// Output is committed under public/mail/ (static files, no runtime cost).

import path from 'node:path';
import sharp from 'sharp';

const OUT_DIR = path.join(process.cwd(), 'public', 'mail');
const GRAPHITE = '#0A0A0A';
const WHITE = '#FFFFFF';
const LIME = '#C6F24E';

function markSvg(stroke: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="192" height="192">
  <path d="M10 14 Q10 8 16 8 L48 8 Q54 8 54 14 L54 36 Q54 42 48 42 L30 42 L22 52 L22 42 L16 42 Q10 42 10 36 Z" fill="none" stroke="${stroke}" stroke-width="3.2" stroke-linejoin="round"/>
  <path d="M15 26 L22 26 L25 18 L30 34 L34 22 L38 28 L49 28" fill="none" stroke="${stroke}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="54" cy="10" r="5" fill="${LIME}"/>
</svg>`;
}

function ecgSvg(stroke: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 28" width="1200" height="56">
  <path d="M0 14 L120 14 L140 14 L155 4 L172 24 L188 8 L205 18 L220 14 L340 14 L360 14 L375 6 L392 22 L408 10 L425 16 L440 14 L600 14" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

const IG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96" fill="none">
  <rect x="2.5" y="2.5" width="19" height="19" rx="5" stroke="${GRAPHITE}" stroke-width="1.6"/>
  <circle cx="12" cy="12" r="4.2" stroke="${GRAPHITE}" stroke-width="1.6"/>
  <circle cx="17.4" cy="6.6" r="1.1" fill="${GRAPHITE}"/>
</svg>`;

async function render(name: string, svg: string): Promise<void> {
  const file = path.join(OUT_DIR, name);
  await sharp(Buffer.from(svg), { density: 72 }).png({ compressionLevel: 9 }).toFile(file);
  console.log('wrote', path.relative(process.cwd(), file));
}

async function main(): Promise<void> {
  await render('buaze-mark-dark.png', markSvg(GRAPHITE));
  await render('buaze-mark-light.png', markSvg(WHITE));
  await render('buaze-ecg-lime.png', ecgSvg(LIME));
  await render('buaze-ecg-graphite.png', ecgSvg(GRAPHITE));
  await render('buaze-instagram.png', IG_SVG);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
