/**
 * Feedback & review mails — HTML-injection and escaping regressions.
 *
 * pulseLayout interpolates subject / preheader into <title> and the hidden
 * preheader div, and several fields end up in href attributes. The g2 templates
 * (low-rating-alert, new-review, customer-reply, rating-drop-alert) take free
 * text from the public feedback form, so every `:inject` fixture must render fully escaped,
 * exactly once (no double-escaping), while the plain Subject header and the
 * plain-text part stay free of HTML entities.
 *
 * Run: npm test
 */

import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { prepareMailRender } from './fixtures/mail/_env';
import { FIXTURES_G2, INJECT_ATTR, INJECT_LINK, INJECT_TAG } from './fixtures/mail/g2-feedback';
import { renderCustomerReply } from '../src/lib/email/templates/customer-reply';
import { renderLowRatingAlert } from '../src/lib/email/templates/low-rating-alert';
import { renderNewReview } from '../src/lib/email/templates/new-review';

const REVIEW_URL = 'https://www.buaze.com/tr/dashboard/feedbacks';

describe('g2 mails escape hostile input', () => {
  before(() => prepareMailRender());

  const injectFixtures = FIXTURES_G2.filter((f) => f.id.endsWith(':inject'));
  it('has an :inject fixture for each of the four templates', () => {
    assert.equal(new Set(injectFixtures.map((f) => f.template)).size, 4);
  });

  for (const fixture of injectFixtures) {
    for (const locale of ['tr', 'en'] as const) {
      it(`${fixture.id} [${locale}]`, async () => {
        const { html } = await fixture.render(locale);

        // Nothing the attacker typed may survive as live markup.
        assert.ok(!html.includes(INJECT_TAG), 'raw <img> tag');
        assert.ok(!html.includes(INJECT_LINK), 'raw </div><a href=…> payload');
        assert.ok(!html.includes(INJECT_ATTR), 'raw attribute-breaking payload');
        assert.ok(!/<img\b[^>]*\bonerror\b/i.test(html), 'live onerror handler');
        assert.ok(!/<a\b[^>]*evil\.example/i.test(html), 'live link to evil.example');
        assert.ok(!/<script\b/i.test(html), 'live <script>');
        assert.ok(!/href="[^"]*"[^>]*><script/i.test(html), 'href broken out of its attribute');

        // Escaped exactly once.
        assert.ok(!/&amp;(?:lt|gt|quot|amp|#39);/.test(html), 'double-escaped entity');
        assert.ok(html.includes('&lt;img src=x onerror=1&gt;'), 'payload present as escaped text');

        // <title> and the hidden preheader (the layout injection sinks).
        const title = html.match(/<title>([\s\S]*?)<\/title>/)![1];
        assert.ok(!/[<>]/.test(title), '<title> carries raw angle brackets');
        const preheader = html.match(/<div style="display:none[^>]*>([\s\S]*?)<\/div>/)![1];
        assert.ok(!/[<>]/.test(preheader.replace(/&#8204;&nbsp;/g, '')), 'preheader carries raw angle brackets');
      });
    }
  }
});

describe('g2 mails keep subject and text part free of HTML entities', () => {
  before(() => prepareMailRender());

  it('customer-reply: apostrophe and ampersand stay literal outside the HTML', async () => {
    const r = await renderCustomerReply(
      { customerName: "D'Arcy Yılmaz", restaurantName: 'Ali & Veli Lokantası', ownerName: "Mert D'Arcy", message: 'Merhaba' },
      'tr',
    );
    assert.equal(r.subject, "D'Arcy, geri bildirimin için teşekkürler");
    assert.ok(r.text.includes("D'Arcy,") && r.text.includes("— Mert D'Arcy, Ali & Veli Lokantası"), r.text);
    assert.ok(!/&(?:amp|#39|quot|lt|gt);/.test(r.subject + r.text), 'entity leaked into subject/text');
    // …and single-escaped inside the HTML.
    assert.ok(r.html.includes('Ali &amp; Veli Lokantası') && !r.html.includes('&amp;amp;') && !r.html.includes('&amp;#39;'));
  });

  it('low-rating-alert / new-review: subject is the raw string', async () => {
    const low = await renderLowRatingAlert({ rating: 2, restaurantName: 'Ali & Veli', reviewUrl: REVIEW_URL }, 'tr');
    assert.ok(low.subject.includes('Ali & Veli'));
    assert.ok(low.html.includes('<title>Düşük puan · Ali &amp; Veli · 2★</title>'));
    const rev = await renderNewReview({ rating: 5, restaurantName: 'X', customerName: "Ayşe O'Neil", reviewUrl: REVIEW_URL }, 'en');
    assert.ok(rev.subject.includes("Ayşe O'Neil"));
  });
});

describe('customer-reply without an owner name (the production shape)', () => {
  before(() => prepareMailRender());

  for (const locale of ['tr', 'en'] as const) {
    it(`never prints the role word as a name [${locale}]`, async () => {
      const r = await renderCustomerReply(
        { customerName: null, restaurantName: 'Moda Kahve Evi', message: 'Yaşadığın aksaklık için özür dileriz.', couponCode: 'MODA10' },
        locale,
      );
      const role = locale === 'tr' ? 'İşletmeci' : 'Owner';
      assert.ok(!new RegExp(role, 'i').test(r.html), `"${role}" leaked into the HTML`);
      assert.ok(!new RegExp(role, 'i').test(r.text), `"${role}" leaked into the text part`);
      const signoff = locale === 'tr' ? 'Moda Kahve Evi ekibi' : 'The Moda Kahve Evi team';
      assert.ok(r.html.includes(signoff) && r.text.includes(signoff), 'team sign-off');

      // The greeting is not reused as a name: no lowercase "merhaba"/"hi" opener.
      assert.ok(!/merhaba,|\bhi,/.test(r.subject + r.text.split('\n')[0]), r.subject);
      const h1 = r.html.match(/<h1[\s\S]*?<\/h1>/)![0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      assert.equal(h1, locale === 'tr' ? 'Bizi duyduğun için teşekkürler .' : 'Thank you for hearing us .');
      assert.equal(r.subject, locale === 'tr' ? 'Geri bildirimin için teşekkürler' : 'Thank you for your feedback');
      assert.equal(r.text.split('\n')[0], locale === 'tr' ? 'Merhaba,' : 'Hi,');
    });
  }
});

describe('g2 copy carries no unsourced numbers or review-gating nudges', () => {
  before(() => prepareMailRender());

  const BANNED = [
    /%33 daha|33% better/,
    /Google internal data/i,
    /iki katına|doubles/i,
    /rebalance|toparlar/i,
    /itibarı katlar|multiplies reputation/i,
  ];
  for (const fixture of FIXTURES_G2.filter((f) => !f.id.includes(':inject'))) {
    for (const locale of ['tr', 'en'] as const) {
      it(`${fixture.id} [${locale}]`, async () => {
        const { subject, html, text } = await fixture.render(locale);
        for (const re of BANNED) assert.ok(!re.test(subject + html + text), `matches ${re}`);
      });
    }
  }
});
