/**
 * Help center content invariants (src/lib/help-articles.ts).
 *
 * - every TR article has an EN twin with the same slug, category and order,
 *   and the same body shape (sections, FAQ, checklist);
 * - internal help links point to an article or category that exists, in the
 *   article's own language;
 * - no raw markup markers leak into the rendered text;
 * - articles removed in 2026-11 (features Buaze does not have) stay removed:
 *   their URLs redirect in next.config.ts.
 *
 * Run: npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { STATIC_HELP_ARTICLES, inlineToPlain, parseInline } from '../src/lib/help-articles';
import { HELP_CATEGORIES } from '../src/lib/help-categories';

const REMOVED_SLUGS = [
  'api-key-basics',
  'webhook-events',
  'webhook-payload-anatomy',
  'rate-limit-strategy',
  'sandbox-and-staging',
  'integration-resilience-runbook',
  'campaign-qr-utm',
  'tags-and-assignment',
  'slack-discord-webhook-routing',
  'usage-thresholds-alerts',
  'invoice-vat-and-titles',
  'multi-account-and-franchise-billing',
  'two-factor-and-session-management',
];

type Article = (typeof STATIC_HELP_ARTICLES)[number];

function texts(a: Article): string[] {
  const b = a.bodyStruct;
  if (!b) return [];
  return [
    b.lead,
    b.keyInsight ?? '',
    ...b.sections.flatMap((s) => [...(s.paragraphs ?? []), ...(s.items ?? [])]),
    ...b.checklist,
    ...b.faq.map((f) => f.a),
    b.policyNote ?? '',
  ].filter(Boolean);
}

describe('help articles', () => {
  const slugs = new Set(STATIC_HELP_ARTICLES.map((a) => a.slug));
  const categories = new Set(HELP_CATEGORIES.map((c) => c.slug));

  it('has TR and EN twins with the same shape', () => {
    const tr = STATIC_HELP_ARTICLES.filter((a) => a.locale === 'tr');
    const en = STATIC_HELP_ARTICLES.filter((a) => a.locale === 'en');
    assert.equal(tr.length, en.length);
    for (const t of tr) {
      const e = en.find((x) => x.slug === t.slug);
      assert.ok(e, `missing EN twin for ${t.slug}`);
      assert.equal(e.category, t.category, `${t.slug} category`);
      assert.equal(e.order, t.order, `${t.slug} order`);
      const tb = t.bodyStruct!;
      const eb = e.bodyStruct!;
      assert.equal(eb.sections.length, tb.sections.length, `${t.slug} sections`);
      assert.equal(eb.faq.length, tb.faq.length, `${t.slug} faq`);
      assert.equal(eb.checklist.length, tb.checklist.length, `${t.slug} checklist`);
    }
  });

  it('only uses existing categories', () => {
    for (const a of STATIC_HELP_ARTICLES) {
      assert.ok(categories.has(a.category), `${a.locale}/${a.slug}: unknown category ${a.category}`);
    }
  });

  it('links to existing help pages in the same language', () => {
    for (const a of STATIC_HELP_ARTICLES) {
      for (const text of texts(a)) {
        for (const tok of parseInline(text)) {
          if (tok.type !== 'link') continue;
          const m = tok.href.match(/^\/(tr|en)\/help\/(category\/)?([a-z0-9-]+)$/);
          if (!m) continue;
          assert.equal(m[1], a.locale, `${a.locale}/${a.slug}: link ${tok.href} is in the other language`);
          const exists = m[2] ? categories.has(m[3]) : slugs.has(m[3]);
          assert.ok(exists, `${a.locale}/${a.slug}: broken link ${tok.href}`);
        }
      }
    }
  });

  it('leaves no raw markup in the text', () => {
    for (const a of STATIC_HELP_ARTICLES) {
      for (const text of texts(a)) {
        const plain = inlineToPlain(text);
        assert.ok(!/\*\*|\]\(/.test(plain), `${a.locale}/${a.slug}: unparsed marker in "${plain.slice(0, 60)}"`);
      }
    }
  });

  it('asks FAQ questions as questions', () => {
    for (const a of STATIC_HELP_ARTICLES) {
      for (const f of a.bodyStruct?.faq ?? []) {
        assert.match(f.q, /\?$/, `${a.locale}/${a.slug}: "${f.q}"`);
      }
    }
  });

  it('keeps the removed articles removed', () => {
    for (const slug of REMOVED_SLUGS) {
      assert.ok(!slugs.has(slug), `${slug} was removed (it redirects in next.config.ts)`);
    }
    assert.ok(!categories.has('api-webhook'), 'api-webhook category was removed');
  });
});
