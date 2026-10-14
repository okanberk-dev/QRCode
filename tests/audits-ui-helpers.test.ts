/**
 * Denetim Merkezi — owner UI için saf yardımcılar (`audit-ui.ts`) birim testleri.
 * React yok, DB yok.
 *
 * Run: npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  activeShareLinks,
  applyDraftToQuestion,
  buildMailtoHref,
  buildShareUrl,
  buildWhatsAppHref,
  defaultQuickAddType,
  deleteConfirmCopy,
  expectedAnswerLabel,
  formatResponseStamp,
  groupCatalogBySector,
  itemsCount,
  itemsHeading,
  kindBadgeKind,
  lastResponseLine,
  localizeYesNoQuestions,
  matchesAuditQuery,
  metaLine,
  optionsPreview,
  parsePassingScoreInput,
  pickDefaultLink,
  questionToDraft,
  quickAddLabel,
  responsesCount,
  shareLinkLabel,
  sortCatalogRows,
  statusBadgeKind,
  summaryLine,
  yesNoCorrectIndex,
  QUICK_ADD_TYPES,
  SEARCH_MIN_AUDITS,
} from '../src/components/audits/audit-ui';
import { makeDefaultQuestion } from '../src/lib/audits/question-normalize';
import { AUDIT_SECTORS } from '../src/lib/audits/types';

describe('labels and counts', () => {
  it('Turkish counts stay singular after a number, English pluralises', () => {
    assert.equal(itemsCount(1, 'tr'), '1 madde');
    assert.equal(itemsCount(6, 'tr'), '6 madde');
    assert.equal(itemsCount(1, 'en'), '1 item');
    assert.equal(itemsCount(6, 'en'), '6 items');
    assert.equal(responsesCount(0, 'tr'), '0 yanıt');
    assert.equal(responsesCount(1, 'en'), '1 response');
    assert.equal(responsesCount(2, 'en'), '2 responses');
  });

  it('section heading follows the kind', () => {
    assert.equal(itemsHeading('checklist', 'tr'), 'Maddeler');
    assert.equal(itemsHeading('quiz', 'tr'), 'Sorular');
    assert.equal(itemsHeading('checklist', 'en'), 'Items');
    assert.equal(itemsHeading('quiz', 'en'), 'Questions');
  });

  it('meta line joins items and responses', () => {
    assert.equal(metaLine(6, 2, 'tr'), '6 madde · 2 yanıt');
    assert.equal(metaLine(1, 1, 'en'), '1 item · 1 response');
  });

  it('status chip kinds (spec §3.0): live ok, paused warn, rest ghost', () => {
    assert.equal(statusBadgeKind('live'), 'ok');
    assert.equal(statusBadgeKind('paused'), 'warn');
    assert.equal(statusBadgeKind('draft'), 'ghost');
    assert.equal(statusBadgeKind('archived'), 'ghost');
    assert.equal(kindBadgeKind('quiz'), 'info');
    assert.equal(kindBadgeKind('checklist'), 'ghost');
  });
});

describe('response timestamps (display timezone, §46)', () => {
  // 23:30 Istanbul on 11 Oct 2026 (UTC+3).
  const now = new Date('2026-10-11T20:30:00Z');

  it('same local day → "Bugün HH:mm" / "Today …"', () => {
    assert.equal(formatResponseStamp('2026-10-11T11:32:00Z', 'tr', now), 'Bugün 14:32');
    assert.match(formatResponseStamp('2026-10-11T11:32:00Z', 'en', now), /^Today /);
  });

  it('a UTC date that is already the next day in Istanbul still counts as today', () => {
    // 21:30Z on the 11th = 00:30 on the 12th in Istanbul → NOT the same local day as `now`.
    assert.doesNotMatch(formatResponseStamp('2026-10-11T21:30:00Z', 'tr', now), /^Bugün/);
    // 20:59Z on the 11th = 23:59 on the 11th in Istanbul → same day.
    assert.match(formatResponseStamp('2026-10-11T20:59:00Z', 'tr', now), /^Bugün 23:59$/);
  });

  it('other days keep the clock in the local zone', () => {
    // 20:18Z = 23:18 Istanbul.
    assert.match(formatResponseStamp('2026-10-10T20:18:00Z', 'tr', now), /23:18$/);
  });

  it('missing / invalid input → empty', () => {
    assert.equal(formatResponseStamp(null, 'tr', now), '');
    assert.equal(formatResponseStamp(undefined, 'tr', now), '');
    assert.equal(formatResponseStamp('not a date', 'tr', now), '');
  });

  it('last-response line is honest when there is none', () => {
    assert.equal(lastResponseLine(null, 'tr', now), 'Henüz yanıt yok');
    assert.equal(lastResponseLine(null, 'en', now), 'No responses yet');
    assert.equal(lastResponseLine('2026-10-11T11:32:00Z', 'tr', now), 'Son yanıt: Bugün 14:32');
    assert.equal(lastResponseLine('2026-10-11T11:32:00Z', 'en', now), 'Last response: Today 02:32 PM');
  });

  it('summary line lower-cases the stamp and drops the part when there is no response', () => {
    assert.equal(summaryLine(6, 0, null, 'tr', now), '6 madde · 0 yanıt');
    assert.equal(summaryLine(6, 2, '2026-10-11T11:32:00Z', 'tr', now), '6 madde · 2 yanıt · son yanıt bugün 14:32');
  });
});

describe('share link helpers', () => {
  it('builds the public URL without double slashes', () => {
    assert.equal(buildShareUrl('https://www.buaze.com', 'abc'), 'https://www.buaze.com/audits/abc');
    assert.equal(buildShareUrl('https://www.buaze.com/', 'abc'), 'https://www.buaze.com/audits/abc');
    assert.equal(buildShareUrl('http://localhost:3000///', 't'), 'http://localhost:3000/audits/t');
  });

  it('WhatsApp and mailto links carry the encoded title and URL', () => {
    const url = 'https://www.buaze.com/audits/abc';
    const wa = buildWhatsAppHref('Mutfak açılış kontrolü', url);
    assert.ok(wa.startsWith('https://wa.me/?text='));
    assert.equal(decodeURIComponent(wa.split('text=')[1]), `Mutfak açılış kontrolü: ${url}`);

    const mail = buildMailtoHref('Mutfak & hijyen', url, 'tr');
    assert.ok(mail.startsWith('mailto:?subject='));
    assert.ok(mail.includes(encodeURIComponent('Mutfak & hijyen')));
    assert.ok(mail.includes(encodeURIComponent(url)));
    assert.ok(buildMailtoHref('Kitchen', url, 'en').includes(encodeURIComponent('Open this link')));
  });

  interface TestLink {
    id: string;
    status: string;
    recurrence: string;
    tokenRevoked: boolean;
    token?: string | null;
    createdAt: string;
  }
  const link = (over: Partial<TestLink> & { id: string }): TestLink => ({
    status: 'pending',
    recurrence: 'daily',
    tokenRevoked: false,
    token: 'tok',
    createdAt: '2026-10-01T10:00:00.000Z',
    ...over,
  });

  it('active links drop revoked, cancelled and token-less rows, oldest first', () => {
    const rows = [
      link({ id: 'c', createdAt: '2026-10-03T00:00:00.000Z' }),
      link({ id: 'a', createdAt: '2026-10-01T00:00:00.000Z' }),
      link({ id: 'x', tokenRevoked: true }),
      link({ id: 'y', status: 'cancelled' }),
      link({ id: 'z', token: null }),
      link({ id: 'b', createdAt: '2026-10-02T00:00:00.000Z' }),
    ];
    assert.deepEqual(
      activeShareLinks(rows).map((r) => r.id),
      ['a', 'b', 'c'],
    );
    assert.deepEqual(activeShareLinks(null), []);
    assert.deepEqual(activeShareLinks(undefined), []);
  });

  it('default link = first reusable, not-used-up link', () => {
    const rows = [
      link({ id: 'once-used', recurrence: 'once', status: 'completed', createdAt: '2026-10-01T00:00:00.000Z' }),
      link({ id: 'once-open', recurrence: 'once', createdAt: '2026-10-02T00:00:00.000Z' }),
      link({ id: 'daily', recurrence: 'daily', createdAt: '2026-10-03T00:00:00.000Z' }),
    ];
    assert.equal(pickDefaultLink(rows)?.id, 'daily');
  });

  it('a single-use link never becomes the default; no reusable link → null', () => {
    assert.equal(pickDefaultLink([link({ id: 'o', recurrence: 'once' })]), null);
    assert.equal(pickDefaultLink([]), null);
    assert.equal(pickDefaultLink(null), null);
  });

  it('weekly / monthly legacy links count as reusable defaults', () => {
    assert.equal(pickDefaultLink([link({ id: 'w', recurrence: 'weekly' })])?.id, 'w');
  });

  it('link label prefers the owner-given name, then e-mail, then a legacy label', () => {
    assert.equal(
      shareLinkLabel({ assigneeType: 'link', assigneeName: ' Mutfak tableti ', assigneeEmail: null }, 'tr'),
      'Mutfak tableti',
    );
    assert.equal(
      shareLinkLabel({ assigneeType: 'candidate', assigneeName: null, assigneeEmail: 'a@b.co' }, 'tr'),
      'a@b.co',
    );
    assert.equal(
      shareLinkLabel({ assigneeType: 'team_member', assigneeName: null, assigneeEmail: null }, 'tr'),
      'Ekip üyesi (eski)',
    );
    assert.equal(
      shareLinkLabel({ assigneeType: 'link', assigneeName: '  ', assigneeEmail: null }, 'tr'),
      'Adsız link',
    );
    assert.equal(
      shareLinkLabel({ assigneeType: 'link', assigneeName: null, assigneeEmail: null }, 'en'),
      'Unnamed link',
    );
  });
});

describe('ready-made template ordering', () => {
  const rows = [
    { id: '1', title: 'Zeta test', kind: 'quiz' as const, sector: 'food' as const },
    { id: '2', title: 'Alfa kontrol', kind: 'checklist' as const, sector: 'food' as const },
    { id: '3', title: 'Çiçek kontrol', kind: 'checklist' as const, sector: 'retail' as const },
    { id: '4', title: 'Beta test', kind: 'quiz' as const, sector: 'retail' as const },
    { id: '5', title: 'Ay test', kind: 'quiz' as const, sector: 'hotel' as const },
  ];

  it('restaurants, hotels and clinics see checklists first, then Turkish alphabetical', () => {
    for (const sector of ['food', 'hotel', 'health'] as const) {
      const sorted = sortCatalogRows(rows, sector).map((r) => r.id);
      assert.deepEqual(sorted, ['2', '3', '5', '4', '1']);
    }
  });

  it('other sectors are purely alphabetical (Turkish collation: Ç after C, before D)', () => {
    const sorted = sortCatalogRows(rows, 'retail').map((r) => r.title);
    assert.deepEqual(sorted, ['Alfa kontrol', 'Ay test', 'Beta test', 'Çiçek kontrol', 'Zeta test']);
  });

  it('does not mutate the input', () => {
    const copy = rows.map((r) => r.id);
    sortCatalogRows(rows, 'food');
    assert.deepEqual(rows.map((r) => r.id), copy);
  });

  it('groups by sector with the business sector first, empty groups dropped', () => {
    const groups = groupCatalogBySector(rows, 'retail', AUDIT_SECTORS);
    assert.deepEqual(
      groups.map((g) => g.sector),
      ['retail', 'food', 'hotel'],
    );
    // retail business → plain Turkish alphabetical inside every group
    assert.deepEqual(groups[0].rows.map((r) => r.id), ['4', '3']);
    assert.deepEqual(groups[1].rows.map((r) => r.id), ['2', '1']);
    assert.deepEqual(groups[2].rows.map((r) => r.id), ['5']);
  });
});

describe('audit list search', () => {
  it('only shows from 8 audits up', () => {
    assert.equal(SEARCH_MIN_AUDITS, 8);
  });

  it('matches case-insensitively with Turkish dotted/dotless i', () => {
    assert.equal(matchesAuditQuery('Işık denetimi', 'ışık'), true);
    assert.equal(matchesAuditQuery('İş güvenliği', 'iş'), true);
    assert.equal(matchesAuditQuery('Mutfak', ''), true);
    assert.equal(matchesAuditQuery('Mutfak', 'bar'), false);
  });
});

describe('quick add', () => {
  it('default chip: Evet/Hayır for a checklist, Seçenekli for a test', () => {
    assert.equal(defaultQuickAddType('checklist'), 'yes_no');
    assert.equal(defaultQuickAddType('quiz'), 'single');
  });

  it('five chips in the specified order, with human labels', () => {
    assert.deepEqual([...QUICK_ADD_TYPES], ['yes_no', 'scale', 'single', 'text', 'file']);
    assert.deepEqual(
      QUICK_ADD_TYPES.map((t) => quickAddLabel(t, 'tr')),
      ['Evet/Hayır', '1-5 puan', 'Seçenekli', 'Not', 'Fotoğraf'],
    );
    assert.equal(quickAddLabel('yes_no', 'en'), 'Yes/No');
  });

  it('expected-answer label: "Uygun cevap" in a checklist, "Doğru cevap" in a test', () => {
    assert.equal(expectedAnswerLabel('checklist', 'tr'), 'Uygun cevap');
    assert.equal(expectedAnswerLabel('quiz', 'tr'), 'Doğru cevap');
    assert.equal(expectedAnswerLabel('checklist', 'en'), 'Expected answer');
    assert.equal(expectedAnswerLabel('quiz', 'en'), 'Correct answer');
  });

  it('options preview skips blanks', () => {
    assert.equal(optionsPreview(['A', ' ', 'B', '']), 'A · B');
    assert.equal(optionsPreview(null), '');
    assert.equal(optionsPreview(undefined), '');
  });
});

describe('honest confirmation copy', () => {
  it('delete with responses says "archived", never "deleted"', () => {
    const c = deleteConfirmCopy(true, 'tr');
    assert.match(c.body, /arşivlenir/);
    assert.match(c.body, /yanıtlar korunur/);
    assert.equal(c.confirm, 'Arşivle');
    assert.doesNotMatch(c.body, /kalıcı/);
  });

  it('delete without responses is permanent', () => {
    const c = deleteConfirmCopy(false, 'tr');
    assert.match(c.body, /kalıcı olarak silinir/);
    assert.equal(c.confirm, 'Sil');
    assert.equal(deleteConfirmCopy(true, 'en').confirm, 'Archive');
    assert.equal(deleteConfirmCopy(false, 'en').confirm, 'Delete');
  });
});

describe('pass mark input', () => {
  it('blank → null; numbers are floored and clamped to 0-100', () => {
    assert.equal(parsePassingScoreInput(''), null);
    assert.equal(parsePassingScoreInput('   '), null);
    assert.equal(parsePassingScoreInput('80'), 80);
    assert.equal(parsePassingScoreInput('79.9'), 79);
    assert.equal(parsePassingScoreInput('250'), 100);
    assert.equal(parsePassingScoreInput('-5'), 0);
    assert.equal(parsePassingScoreInput('abc'), null);
  });
});

describe('builder question ↔ editor draft mapping', () => {
  it('maps clientKey to the draft id and keeps the persisted id', () => {
    const q = makeDefaultQuestion('yes_no', 'tr', { prompt: 'Eller yıkandı mı?', persistedId: 'srv_1' });
    const d = questionToDraft(q);
    assert.equal(d.id, q.clientKey);
    assert.equal(d.persistedId, 'srv_1');
    assert.equal(d.type, 'yes_no');
    assert.deepEqual(d.options, ['Evet', 'Hayır']);
    assert.equal(d.correctAnswer, 'Evet');
  });

  it('applying a draft keeps identity and order, takes the edited fields', () => {
    const q = makeDefaultQuestion('single', 'tr', { prompt: 'x', persistedId: 'srv_2', sortOrder: 30 });
    const d = { ...questionToDraft(q), prompt: 'Soğuk zincir', options: ['A', 'B'], correctAnswer: 'A', weight: 3, isRequired: false };
    const next = applyDraftToQuestion(q, d);
    assert.equal(next.clientKey, q.clientKey);
    assert.equal(next.persistedId, 'srv_2');
    assert.equal(next.sortOrder, 30);
    assert.equal(next.prompt, 'Soğuk zincir');
    assert.deepEqual(next.options, ['A', 'B']);
    assert.equal(next.correctAnswer, 'A');
    assert.equal(next.weight, 3);
    assert.equal(next.isRequired, false);
  });

  it('language switch moves yes/no wording and expected answer, leaves other types alone', () => {
    const yn = makeDefaultQuestion('yes_no', 'tr', { prompt: 'a' });
    const yn2 = { ...yn, correctAnswer: 'Hayır' as const };
    const single = makeDefaultQuestion('single', 'tr', { prompt: 'b', options: ['Evet', 'Hayır'] });
    const [a, b, c] = localizeYesNoQuestions([yn, yn2, single], 'en');
    assert.deepEqual(a.options, ['Yes', 'No']);
    assert.equal(a.correctAnswer, 'Yes');
    assert.equal(b.correctAnswer, 'No');
    assert.equal(c, single, 'non yes/no questions are returned untouched');
    const [back] = localizeYesNoQuestions([a], 'tr');
    assert.deepEqual(back.options, ['Evet', 'Hayır']);
    assert.equal(back.correctAnswer, 'Evet');
  });

  it('expected-answer index reads both languages and tolerates anything else', () => {
    assert.equal(yesNoCorrectIndex('Evet'), 0);
    assert.equal(yesNoCorrectIndex('yes'), 0);
    assert.equal(yesNoCorrectIndex('Hayır'), 1);
    assert.equal(yesNoCorrectIndex('hayir'), 1);
    assert.equal(yesNoCorrectIndex('No'), 1);
    assert.equal(yesNoCorrectIndex(null), -1);
    assert.equal(yesNoCorrectIndex(3), -1);
    assert.equal(yesNoCorrectIndex('belki'), -1);
  });
});
