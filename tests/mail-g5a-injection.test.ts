/**
 * Team + newsletter mails — HTML-injection, escaping and copy regressions.
 *
 * pulseLayout interpolates subject / preheader raw into <title> and the hidden
 * preheader div. The g5a templates take free text (the invitee picks their own
 * display name, admins author newsletter/segment subjects), so each `:inject`
 * fixture must render fully escaped, exactly once, while the plain Subject
 * header stays raw.
 *
 * Run: npm test
 */

import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { prepareMailRender } from './fixtures/mail/_env';
import { FIXTURES_G5A, INJECT_TAG, INJECT_TITLE } from './fixtures/mail/g5a-team-newsletter';

const byId = (id: string) => {
  const f = FIXTURES_G5A.find((x) => x.id === id);
  assert.ok(f, `fixture ${id} exists`);
  return f;
};

describe('g5a mails escape hostile input', () => {
  before(() => prepareMailRender());

  const injectFixtures = FIXTURES_G5A.filter((f) => f.id.endsWith(':inject'));
  it('has an :inject fixture for each of the five templates', () => {
    assert.equal(new Set(injectFixtures.map((f) => f.template)).size, 5);
  });

  for (const fixture of injectFixtures) {
    for (const locale of ['tr', 'en'] as const) {
      it(`${fixture.id} [${locale}]`, async () => {
        const { html } = await fixture.render(locale);

        // Nothing the attacker typed may survive as live markup.
        assert.ok(!html.includes(INJECT_TITLE), 'raw </title><b id="INJ"> payload');
        assert.ok(!html.includes('<b id="INJ">'), 'live <b id="INJ">');
        assert.ok(!html.includes(INJECT_TAG), 'raw <img> tag');
        assert.ok(!/<img\b[^>]*\bonerror\b/i.test(html), 'live onerror handler');
        assert.ok(!/<script\b/i.test(html), 'live <script>');
        assert.ok(!/href="[^"]*"[^>]*><script/i.test(html), 'href broken out of its attribute');
        assert.equal((html.match(/<\/title>/g) ?? []).length, 1, 'exactly one closing </title>');

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

  it('keeps the Subject header raw (only <title> is escaped)', async () => {
    for (const id of ['team-member-joined:inject', 'team-member-removed:inject', 'newsletter:inject', 'owner-segment-mail:inject']) {
      const { subject } = await byId(id).render('tr');
      assert.ok(subject.includes('</title>'), `${id}: subject header should stay plain text`);
    }
  });
});

describe('team-invite copy', () => {
  before(() => prepareMailRender());

  it('uses the singular "day" for a one-day invite in EN (preheader, note, text)', async () => {
    const { html, text } = await byId('team-invite:one-day').render('en');
    assert.ok(html.includes('Accept the invite within 1 day —'), 'preheader');
    assert.ok(html.includes('expires in 1 day.'), 'expiry note');
    assert.ok(text.includes('expires in 1 day.'), 'text part');
    assert.ok(!/\b1 days\b/.test(html + text), 'no "1 days" anywhere');
  });

  it('keeps the plural for other counts in EN', async () => {
    const { html, text } = await byId('team-invite:two-days').render('en');
    assert.ok(html.includes('within 2 days —') && html.includes('expires in 2 days.'));
    assert.ok(text.includes('expires in 2 days.'));
  });

  it('TR is unchanged ("gün")', async () => {
    const { html } = await byId('team-invite:one-day').render('tr');
    assert.ok(html.includes('1 gün'));
  });
});

describe('team mails wrap names at spaces, not mid-word', () => {
  before(() => prepareMailRender());

  it('restaurant, person and sub-line cells never carry bz-break (break-all)', async () => {
    for (const id of ['team-invite:stress', 'team-member-joined:stress', 'team-member-joined:long-names']) {
      for (const locale of ['tr', 'en'] as const) {
        const { html } = await byId(id).render(locale);
        assert.ok(!/class="[^"]*\bbz-break\b/.test(html), `${id} [${locale}] carries bz-break`);
      }
    }
  });

  it('the removed mail keeps bz-break only on the email row', async () => {
    const { html } = await byId('team-member-removed:stress').render('tr');
    assert.equal((html.match(/class="bz-break"/g) ?? []).length, 1);
  });
});
