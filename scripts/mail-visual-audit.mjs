#!/usr/bin/env node
// Mail visual + overflow audit (dev tool, NOT run in CI — needs Playwright + Chromium).
//
//   node --import tsx scripts/mail-visual-audit.mjs [flags]
//
//   --only=a,b        fixture id prefixes (default: all). e.g. --only=welcome,form-confirmation
//   --widths=320,375  viewport widths to measure (default 320,375,414,640,900)
//   --shots=375,900   widths to also screenshot (default 375,900). tiles ≤1400px tall
//   --locales=tr,en   default both
//   --out=<dir>       output dir (default <repo>/.mail-audit, gitignored by convention)
//   --fonts=<dir>     dir with @fontsource/poppins woff2 files (env MAIL_AUDIT_FONT_DIR);
//                     without it Poppins is fetched from Google Fonts (needs network)
//
// What it checks per fixture × locale × width:
//   • docOverflow   — document scrollWidth > viewport (horizontal scrollbar on phones)
//   • shellGrew     — the 640px shell stretched past 640px / the viewport (table grew around an
//                     unbreakable token instead of clipping it)
//   • clipped       — any element poking outside the shell's left/right edge. The shell has
//                     overflow:hidden, so content past the edge is silently CUT OFF (the real
//                     "kayma" bug — it never shows up as a scrollbar)
//   • overlap       — text boxes of different elements intersecting (collapsed / stacked-on-top cells)
//   • textClip      — elements whose own scrollWidth > clientWidth with overflow hidden/auto
//   • smallText     — rendered font-size < 10px
//   • tapSmall      — links/buttons < 36px tall on ≤414px viewports
//   • poppins       — whether Poppins actually loaded (false → screenshots use fallback widths)
// Output: <out>/report.json, <out>/html/*.html, <out>/shots/*.png, console summary.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

// Playwright is not a project dependency (pre-installed globally in the dev
// container). ESM `import` ignores NODE_PATH, createRequire (CJS resolution) honours it.
const { chromium } = createRequire(import.meta.url)('playwright');

const ROOT = process.cwd();
const argv = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.slice(2).split('=');
    return [k, v.join('=') || 'true'];
  }),
);
const only = argv.only ? argv.only.split(',').filter(Boolean) : null;
const widths = (argv.widths || '320,375,414,640,900').split(',').map(Number);
const shotWidths = new Set((argv.shots ?? '375,900').split(',').filter(Boolean).map(Number));
const locales = (argv.locales || 'tr,en').split(',');
const OUT = path.resolve(argv.out || path.join(ROOT, '.mail-audit'));
const FONT_DIR = argv.fonts || process.env.MAIL_AUDIT_FONT_DIR || '';
const TILE = 1400;

const { MAIL_FIXTURES, prepareMailRender } = await import(
  pathToFileURL(path.join(ROOT, 'tests/fixtures/mail-fixtures.ts')).href
);
prepareMailRender();

const fixtures = MAIL_FIXTURES.filter((f) => !only || only.some((o) => f.id === o || f.id.startsWith(o)));
if (!fixtures.length) {
  console.error('No fixtures matched', only);
  process.exit(2);
}

fs.mkdirSync(path.join(OUT, 'html'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });

// 1) render
const jobs = [];
for (const f of fixtures) {
  for (const locale of locales) {
    let rendered;
    try {
      rendered = await f.render(locale);
    } catch (err) {
      console.error(`RENDER FAIL ${f.id} [${locale}]:`, err?.message || err);
      jobs.push({ id: f.id, locale, error: String(err?.message || err) });
      continue;
    }
    const safe = f.id.replace(/[^a-z0-9:_-]/gi, '_').replace(/:/g, '__');
    const file = path.join(OUT, 'html', `${safe}.${locale}.html`);
    fs.writeFileSync(file, rendered.html);
    jobs.push({ id: f.id, locale, safe, file, subject: rendered.subject, textLen: rendered.text?.length ?? 0, htmlBytes: Buffer.byteLength(rendered.html), stress: !!f.stress });
  }
}

// 2) local routing for fonts + brand PNGs (so audits are deterministic + offline-safe)
const fontFiles = {};
if (FONT_DIR) {
  for (const w of [400, 500, 600, 700]) {
    for (const sub of ['latin', 'latin-ext']) {
      const p = path.join(FONT_DIR, `poppins-${sub}-${w}-normal.woff2`);
      if (fs.existsSync(p)) fontFiles[`${sub}-${w}`] = p;
    }
  }
}
const fontCss = Object.keys(fontFiles).length
  ? Object.keys(fontFiles).map((k) => {
      const [sub, w] = k.split('-').reduce((acc, p) => (/^\d+$/.test(p) ? [acc[0], p] : [acc[0] ? acc[0] + '-' + p : p, acc[1]]), ['', '']);
      const range = sub === 'latin'
        ? 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'
        : 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';
      return `@font-face{font-family:'Poppins';font-style:normal;font-weight:${w};font-display:swap;src:url(https://fonts.gstatic.com/local/poppins-${k}.woff2) format('woff2');unicode-range:${range};}`;
    }).join('\n')
  : null;

const browser = await chromium.launch();
const results = [];
for (const width of widths) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: width <= 480 ? 2 : 1 });
  await ctx.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.startsWith('file://') || url.startsWith('data:')) return route.continue();
    if (fontCss && /fonts\.googleapis\.com/.test(url)) {
      return route.fulfill({ status: 200, contentType: 'text/css', body: fontCss });
    }
    const gs = url.match(/fonts\.gstatic\.com\/local\/poppins-(.+)\.woff2/);
    if (gs && fontFiles[gs[1]]) return route.fulfill({ status: 200, contentType: 'font/woff2', path: fontFiles[gs[1]] });
    const asset = url.match(/\/mail\/(buaze-[a-z-]+\.png)/);
    if (asset) {
      const p = path.join(ROOT, 'public', 'mail', asset[1]);
      if (fs.existsSync(p)) return route.fulfill({ status: 200, contentType: 'image/png', path: p });
    }
    if (/fonts\.(googleapis|gstatic)\.com/.test(url) && !fontCss) return route.continue();
    return route.abort(); // everything else (remote photos etc.) — keep audits offline & fast
  });

  for (const job of jobs) {
    if (job.error) continue;
    const page = await ctx.newPage();
    await page.goto(pathToFileURL(job.file).href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const m = await page.evaluate(() => {
      const vw = window.innerWidth;
      const doc = document.documentElement;
      // Mails use table.bz-shell; standalone landing pages mark their card with [data-audit-shell].
      const shell = document.querySelector('table.bz-shell') || document.querySelector('[data-audit-shell]');
      const sr = shell ? shell.getBoundingClientRect() : { left: 0, right: vw };
      const desc = (el) =>
        `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''}`;
      const snip = (el) => (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
      const clipped = [];
      const textClip = [];
      const small = new Map();
      const tapSmall = [];
      for (const el of shell ? shell.querySelectorAll('*') : []) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        if (r.right > sr.right + 1 || r.left < sr.left - 1) {
          clipped.push({ el: desc(el), text: snip(el), left: Math.round(r.left), right: Math.round(r.right), shellRight: Math.round(sr.right) });
        }
        if ((cs.overflowX === 'hidden' || cs.overflowX === 'auto') && el.scrollWidth > el.clientWidth + 1) {
          textClip.push({ el: desc(el), text: snip(el), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth });
        }
        const fs = parseFloat(cs.fontSize);
        const hasText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
        if (hasText && fs < 10) small.set(`${fs}px ${snip(el)}`, fs);
        if (vw <= 414 && el.tagName === 'A' && snip(el) && r.height < 36 && cs.display !== 'inline') {
          tapSmall.push({ text: snip(el), h: Math.round(r.height), w: Math.round(r.width) });
        }
      }
      // Overlapping text boxes: stacked cells collapsing onto each other (e.g. fixed td height +
      // height:100% tables) are invisible to the checks above. Compare text-node line boxes.
      const boxes = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let tn;
      while ((tn = walker.nextNode())) {
        if (!tn.textContent.trim()) continue;
        const pe = tn.parentElement;
        const pcs = getComputedStyle(pe);
        if (pcs.display === 'none' || pcs.visibility === 'hidden' || pe.closest('[style*="display:none"]')) continue;
        const range = document.createRange();
        range.selectNodeContents(tn);
        for (const rr of range.getClientRects()) {
          if (rr.width < 2 || rr.height < 2) continue;
          boxes.push({ t: tn.textContent.trim().slice(0, 30), l: rr.left, tp: rr.top, r: rr.right, b: rr.bottom, node: tn });
        }
      }
      const overlap = [];
      for (let i = 0; i < boxes.length && overlap.length < 6; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i], b = boxes[j];
          if (a.node === b.node) continue;
          const ix = Math.min(a.r, b.r) - Math.max(a.l, b.l);
          const iy = Math.min(a.b, b.b) - Math.max(a.tp, b.tp);
          // Range rects are font content boxes (~1.5em for Poppins), so consecutive lines of a tight
          // heading overlap ~25%. Only a MAJORITY overlap means cells really sit on top of each other.
          const minH = Math.min(a.b - a.tp, b.b - b.tp);
          if (ix > 3 && iy > 4 && iy > 0.55 * minH) { overlap.push(`${a.t} <> ${b.t} (${Math.round(ix)}x${Math.round(iy)})`); if (overlap.length >= 6) break; }
        }
      }
      return {
        vw,
        overlap,
        docOverflow: doc.scrollWidth - doc.clientWidth,
        shellWidth: Math.round(sr.right - sr.left),
        // The shell must never grow past 640px or past the viewport: a table grows to fit
        // an unbreakable token instead of clipping it, so child-vs-shell checks alone miss it.
        shellGrew: Math.round(sr.right - sr.left) > 641 || Math.round(sr.right) > vw + 1,
        height: Math.round(doc.scrollHeight),
        clipped: clipped.slice(0, 12),
        clippedCount: clipped.length,
        textClip: textClip.slice(0, 8),
        smallText: [...small.keys()].slice(0, 8),
        tapSmall: tapSmall.slice(0, 8),
        poppins: document.fonts.check('16px Poppins') && document.fonts.check('600 16px Poppins'),
      };
    });
    results.push({ id: job.id, locale: job.locale, width, stress: job.stress, subject: job.subject, htmlBytes: job.htmlBytes, textLen: job.textLen, ...m });
    if (shotWidths.has(width)) {
      const H = m.height;
      for (let y = 0, n = 1; y < H; y += TILE, n++) {
        await page.screenshot({
          path: path.join(OUT, 'shots', `${job.safe}.${job.locale}.${width}.${String(n).padStart(2, '0')}.png`),
          fullPage: true,
          clip: { x: 0, y, width, height: Math.min(TILE, H - y) },
        });
      }
    }
    await page.close();
  }
  await ctx.close();
}
await browser.close();

fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ widths, results, renderErrors: jobs.filter((j) => j.error) }, null, 2));

// 3) summary
let fail = 0;
for (const r of results) {
  const bad = r.docOverflow > 0 || r.clippedCount > 0 || r.textClip.length > 0 || r.shellGrew || r.overlap.length > 0;
  if (bad) fail++;
  const flags = [
    r.docOverflow > 0 && `docOverflow=${r.docOverflow}px`,
    r.shellGrew && `shellGrew=${r.shellWidth}px`,
    r.overlap.length > 0 && `overlap=${r.overlap.length} (${r.overlap.slice(0, 2).join(' | ')})`,
    r.clippedCount > 0 && `clipped=${r.clippedCount} (${r.clipped.slice(0, 2).map((c) => `${c.el}@${c.right}>${c.shellRight} "${c.text}"`).join(' | ')})`,
    r.textClip.length > 0 && `textClip=${r.textClip.length} (${r.textClip.slice(0, 2).map((c) => `${c.el} ${c.scrollWidth}>${c.clientWidth}`).join(' | ')})`,
    r.htmlBytes > 100000 && `htmlBytes=${r.htmlBytes} (Gmail clips >102KB)`,
    r.textLen === 0 && 'emptyTextPart',
    r.smallText.length > 0 && `smallText=${r.smallText.length}`,
    r.tapSmall.length > 0 && `tapSmall=${r.tapSmall.length}`,
  ].filter(Boolean);
  if (flags.length) console.log(`${bad ? 'FAIL' : 'warn'}  ${r.id} [${r.locale}] @${r.width}  ${flags.join('  ')}`);
}
const poppinsOk = results.every((r) => r.poppins);
console.log(`\n${results.length} renders · ${fail} with overflow/clipping · poppinsLoaded=${poppinsOk}${poppinsOk ? '' : ' (screenshots use FALLBACK font widths — pass --fonts)'}`);
console.log(`report: ${path.join(OUT, 'report.json')}  shots: ${path.join(OUT, 'shots')}`);
for (const j of jobs.filter((j) => j.error)) console.log(`RENDER ERROR ${j.id} [${j.locale}]: ${j.error}`);
process.exit(0);
