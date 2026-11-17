/**
 * Mail render invariants — every fixture in tests/fixtures/mail-fixtures.ts is
 * rendered in TR + EN and checked against the rules that keep Buaze mail safe
 * across Gmail / Outlook / Apple Mail and phones:
 *
 *   - one font family (Poppins stack; monospace only for genuine code)
 *   - no constructs Gmail/Outlook strip or break (inline <svg>, flexbox/grid,
 *     scripts/forms/buttons, positioned layout, negative-margin bleed)
 *   - fluid widths (nothing declared wider than the 640px shell)
 *   - images carry alt + width, no leaked template placeholders, Gmail's
 *     102KB clipping limit respected
 *
 * Visual overflow / clipping is NOT covered here (needs a browser): run
 * `node --import tsx scripts/mail-visual-audit.mjs` for that.
 *
 * Run: npm test
 */

import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { MAIL_FIXTURES, prepareMailRender } from './fixtures/mail-fixtures';
import { FONTS } from '../src/lib/email/tokens';

const MSO_FONT = "'Segoe UI', Arial, sans-serif";
const ALLOWED_FONT_STACKS = new Set<string>([FONTS.heading, FONTS.body, FONTS.label, FONTS.code, MSO_FONT, 'inherit']);

const SHELL_MAX = 640;
const GMAIL_CLIP_BYTES = 100_000;

function fontFamilies(html: string): string[] {
  const out: string[] = [];
  // font-family:<value> up to ; " or } — stacks use single quotes only.
  const re = /font-family:\s*([^;"}]+?)\s*(?:!important)?\s*(?=[;"}])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out.push(m[1].trim());
  return out;
}

describe('mail render invariants', () => {
  before(() => prepareMailRender());

  it('has fixtures for every group', () => {
    assert.ok(MAIL_FIXTURES.length >= 60, `expected a full fixture set, got ${MAIL_FIXTURES.length}`);
    const ids = new Set(MAIL_FIXTURES.map((f) => f.id));
    assert.equal(ids.size, MAIL_FIXTURES.length, 'fixture ids must be unique');
  });

  for (const fixture of MAIL_FIXTURES) {
    for (const locale of ['tr', 'en'] as const) {
      it(`${fixture.id} [${locale}]`, async () => {
        const { subject, html, text } = await fixture.render(locale);
        const isMail = html.includes('bz-shell');

        assert.ok(subject.trim().length > 0, 'subject present');
        assert.ok(html.length > 500, 'html present');
        assert.ok(text.trim().length > 0, 'plain-text part present');
        assert.ok(Buffer.byteLength(html) < GMAIL_CLIP_BYTES, `html ${Buffer.byteLength(html)}B exceeds Gmail clip limit`);
        assert.match(html, /<meta name="viewport"/i, 'viewport meta');
        assert.match(html, /<html[^>]*\blang="(tr|en)"/i, 'html lang attribute');
        if (isMail) assert.match(html, /\bPoppins\b/, 'Poppins loaded in mail head');

        // Banned constructs (Gmail / Outlook strip or break them). Standalone
        // landing pages (unsubscribe etc.) are real web pages opened in a
        // browser, so only the mail documents are held to the mail-client rules.
        if (isMail) {
          assert.ok(!/<svg\b/i.test(html), 'inline <svg> is stripped by Gmail/Outlook');
          assert.ok(!/display:\s*(inline-)?flex\b/i.test(html), 'flexbox');
          assert.ok(!/display:\s*(inline-)?grid\b/i.test(html), 'css grid');
        }
        assert.ok(!/<script\b/i.test(html), '<script>');
        assert.ok(!/<form\b/i.test(html), '<form>');
        assert.ok(!/<button\b/i.test(html), '<button>');
        assert.ok(!/background-image\s*:/i.test(html), 'background-image');
        assert.ok(!/position:\s*fixed/i.test(html), 'position:fixed');
        assert.ok(!/(?:margin|margin-left|margin-right)\s*:[^;"]*-\d+px/i.test(html), 'negative margin bleed');
        if (isMail) {
          assert.ok(!/\b\d+(?:\.\d+)?(?:vw|vh|vmin|vmax)\b/i.test(html), 'viewport units');
          assert.ok(!/clamp\(/i.test(html), 'clamp()');
        }

        // position:absolute is allowed only inside the badge-absolute helper.
        for (const m of html.matchAll(/position:\s*absolute/gi)) {
          const before = html.slice(Math.max(0, m.index! - 120), m.index!);
          assert.ok(before.includes('badge-absolute'), 'position:absolute outside the badge-absolute helper');
        }

        // Gmail drops a whole <style> block on CSS it can't parse or past 8192
        // characters. The first (layout) block must stay inside the safe
        // subset; client fixes with attribute / id / child selectors live in
        // a second block so losing it never breaks the phone layout.
        if (isMail) {
          const blocks = [...html.replace(/<!--\[if mso\]>[\s\S]*?<!\[endif\]-->/gi, '').matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
          assert.ok(blocks.length >= 1, 'layout <style> block present');
          for (const css of blocks) {
            assert.ok(css.length < 8192, `<style> block ${css.length} chars ≥ Gmail's 8192 limit`);
            assert.ok(!/@import/i.test(css), '@import in a <style> block (Gmail strips it)');
            assert.ok(!/\/\*/.test(css), 'CSS comment in a <style> block');
          }
          const core = blocks[0];
          assert.match(core, /@media only screen and \(max-width:600px\)/, 'phone media query in the first block');
          // Selectors only: drop the declaration bodies and the @media prelude.
          const selectors = core.replace(/\{[^{}]*\}/g, ' ').replace(/@media[^{]*\{/g, ' ');
          assert.ok(!/[[#>~+:]/.test(selectors), `first <style> block uses only element/class/descendant selectors: ${selectors.match(/[^\s,]*[[#>~+:][^\s,]*/)?.[0]}`);
        }

        // Typography: only the Poppins stack (+ monospace for code).
        for (const stack of fontFamilies(html)) {
          assert.ok(ALLOWED_FONT_STACKS.has(stack), `unexpected font-family: ${stack}`);
        }
        assert.ok(!/Space Grotesk|\bInter\b/.test(html), 'legacy Space Grotesk / Inter reference');

        // Fluid widths: nothing wider than the 640px shell.
        for (const m of html.matchAll(/\bwidth="(\d+)"/gi)) {
          assert.ok(Number(m[1]) <= SHELL_MAX, `fixed width attr ${m[1]} > ${SHELL_MAX}`);
        }
        for (const m of html.matchAll(/(?:^|[;\s"'])(?:min-)?width:\s*(\d+)px/gi)) {
          assert.ok(Number(m[1]) <= SHELL_MAX, `fixed css width ${m[1]}px > ${SHELL_MAX}`);
        }

        // Images: alt + explicit width.
        for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
          assert.match(m[0], /\balt="/i, `<img> without alt: ${m[0].slice(0, 80)}`);
          assert.match(m[0], /\bwidth="/i, `<img> without width: ${m[0].slice(0, 80)}`);
        }

        // Leaked placeholders / stringified garbage.
        for (const [label, body] of [['html', html], ['text', text], ['subject', subject]] as const) {
          assert.ok(!/\bundefined\b|\bNaN\b|\[object Object\]|\$\{/.test(body), `${label} contains a leaked placeholder`);
        }
      });
    }
  }
});
