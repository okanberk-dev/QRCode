import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SURVEY_TEMPLATES,
  SURVEY_TEMPLATE_THANK_YOU,
  blankQuestionDraft,
  getSurveyTemplate,
  instantiateTemplate,
  newLocalId,
  otherTemplatesForSector,
  templatesForSector,
  type SurveyTemplate,
  type SurveyTemplateLocale,
} from '../src/lib/survey-templates';
import {
  MAX_QUESTIONS_PER_SURVEY,
  OPTIONS_MAX,
  OPTIONS_MIN,
  OPTION_TEXT_MAX,
  QUESTION_TEXT_MAX,
  SURVEY_QUESTION_TYPES,
  THANK_YOU_MAX,
  TITLE_MAX,
  deriveSurveyType,
  optionKey,
  validateOptionsForWrite,
} from '../src/lib/surveys';
import type { SectorKey } from '../src/lib/sector-platforms';

// Surveys Phase 1 — template content must always be a valid POST /api/surveys
// body and must follow the wording rules (no health data, no review-gating, no
// invented numbers, no yes/no phrasing for star questions).

const LOCALES: SurveyTemplateLocale[] = ['tr', 'en'];

const ALL_SECTORS: SectorKey[] = [
  'food',
  'delivery',
  'hospitality',
  'clinic',
  'legal',
  'spa',
  'retail',
  'fitness',
  'education',
  'other',
];

const FORBIDDEN = /filtre|filter|sızma|leak|garanti|guarantee|\d+\s*kat\b|teşhis|diagnos/i;
const YES_NO_FOR_SCALE = /memnun kaldınız mı\?|were you happy/i;

function questionTexts(t: SurveyTemplate) {
  return t.questions.flatMap((q) => LOCALES.map((l) => ({ q, locale: l, text: q.text[l] })));
}

test('catalog: eight templates, unique ids, all ids resolvable', () => {
  assert.equal(SURVEY_TEMPLATES.length, 8);
  const ids = SURVEY_TEMPLATES.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const t of SURVEY_TEMPLATES) assert.equal(getSurveyTemplate(t.id), t);
  assert.equal(getSurveyTemplate('does-not-exist'), undefined);
  assert.equal(getSurveyTemplate(null), undefined);
  assert.equal(getSurveyTemplate(undefined), undefined);
});

test('every template fits the create-survey body limits (both languages)', () => {
  for (const t of SURVEY_TEMPLATES) {
    assert.ok(
      t.questions.length >= 1 && t.questions.length <= MAX_QUESTIONS_PER_SURVEY,
      `${t.id}: question count`,
    );
    for (const locale of LOCALES) {
      assert.ok(t.title[locale].trim().length > 0, `${t.id}.${locale}: title`);
      assert.ok(t.description[locale].trim().length > 0, `${t.id}.${locale}: description`);
      const defaultTitle = t.defaultTitle[locale];
      assert.ok(
        defaultTitle.trim().length > 0 && defaultTitle.length <= TITLE_MAX,
        `${t.id}.${locale}: default title`,
      );
    }
    for (const q of t.questions) {
      assert.ok((SURVEY_QUESTION_TYPES as readonly string[]).includes(q.type), `${t.id}: type`);
      for (const locale of LOCALES) {
        const text = q.text[locale];
        assert.ok(text.trim().length > 0, `${t.id}.${locale}: empty question`);
        assert.ok(text.length <= QUESTION_TEXT_MAX, `${t.id}.${locale}: question too long`);
        assert.equal(text, text.trim(), `${t.id}.${locale}: untrimmed question`);
      }
      if (q.type === 'multiple_choice') {
        const optionsByLocale = q.options;
        assert.ok(optionsByLocale, `${t.id}: choice question without options`);
        for (const locale of LOCALES) {
          const options: string[] = optionsByLocale[locale];
          assert.ok(
            options.length >= OPTIONS_MIN && options.length <= OPTIONS_MAX,
            `${t.id}.${locale}: option count`,
          );
          for (const o of options) {
            assert.ok(o.trim().length > 0 && o.length <= OPTION_TEXT_MAX, `${t.id}: option "${o}"`);
          }
          // the exact check the API applies to a new question
          assert.deepEqual(validateOptionsForWrite(options), options, `${t.id}.${locale}: options`);
          assert.equal(new Set(options.map(optionKey)).size, options.length, `${t.id}: duplicate`);
        }
      } else {
        assert.equal(q.options, undefined, `${t.id}: options on a ${q.type} question`);
      }
    }
  }
});

test('a one-question template is a single-screen survey, anything else is step by step', () => {
  for (const t of SURVEY_TEMPLATES) {
    assert.equal(
      deriveSurveyType(t.questions.length),
      t.questions.length === 1 ? 'single' : 'multi_step',
      t.id,
    );
  }
  assert.equal(deriveSurveyType(getSurveyTemplate('quick-stars')!.questions.length), 'single');
  assert.equal(deriveSurveyType(getSurveyTemplate('nps-one')!.questions.length), 'single');
});

test('Turkish and English are 1:1 (same questions, types, required flags, option counts)', () => {
  for (const t of SURVEY_TEMPLATES) {
    // Text and option arrays exist for both languages by construction; compare their shape.
    for (const q of t.questions) {
      assert.notEqual(q.text.tr, q.text.en, `${t.id}: identical text in both languages`);
      if (q.type === 'multiple_choice') {
        assert.equal(q.options!.tr.length, q.options!.en.length, `${t.id}: option counts differ`);
      }
    }
    assert.notEqual(t.title.tr, t.title.en);
    assert.notEqual(t.defaultTitle.tr, t.defaultTitle.en);
  }
  // instantiate in both languages: identical structure
  for (const t of SURVEY_TEMPLATES) {
    const tr = instantiateTemplate(t, 'tr');
    const en = instantiateTemplate(t, 'en');
    assert.equal(tr.questions.length, en.questions.length, t.id);
    tr.questions.forEach((q, i) => {
      assert.equal(q.type, en.questions[i].type, `${t.id}#${i}: type`);
      assert.equal(q.required, en.questions[i].required, `${t.id}#${i}: required`);
      assert.equal(q.options.length, en.questions[i].options.length, `${t.id}#${i}: options`);
      assert.ok(q.text.length > 0 && en.questions[i].text.length > 0);
    });
  }
});

test('thank-you message: present in both languages and within the limit', () => {
  for (const locale of LOCALES) {
    const text = SURVEY_TEMPLATE_THANK_YOU[locale];
    assert.ok(text.length > 0 && text.length <= THANK_YOU_MAX);
    assert.equal(instantiateTemplate(SURVEY_TEMPLATES[0], locale).thankYouMessage, text);
  }
  assert.equal(SURVEY_TEMPLATE_THANK_YOU.tr, 'Görüşlerin bizim için çok değerli, teşekkürler!');
  assert.equal(SURVEY_TEMPLATE_THANK_YOU.en, 'Your feedback means a lot to us — thank you!');
});

test('every sector gets at least three templates and its own template comes first', () => {
  const own: Partial<Record<SectorKey, string>> = {
    food: 'table-service',
    hospitality: 'post-stay',
    clinic: 'post-visit',
    spa: 'post-service',
    retail: 'in-store',
  };
  for (const sector of ALL_SECTORS) {
    const list = templatesForSector(sector);
    assert.ok(list.length >= 3, `${sector}: ${list.length} templates`);
    const ids = list.map((t) => t.id);
    assert.equal(new Set(ids).size, ids.length, `${sector}: duplicate template`);
    const sectorOwn = own[sector];
    if (sectorOwn) {
      assert.equal(list[0].id, sectorOwn, `${sector}: sector template not first`);
      assert.equal(list.length, 4, `${sector}: own + three universal`);
    } else {
      assert.equal(list.length, 3, `${sector}: universal only`);
    }
    // the universal ones are always offered, in a fixed order
    assert.deepEqual(
      list.filter((t) => t.sector === 'all').map((t) => t.id),
      ['satisfaction-plus', 'nps-one', 'quick-stars'],
      sector,
    );
    // nothing from another sector sneaks into the recommended list
    for (const t of list) assert.ok(t.sector === 'all' || t.sector === sector, `${sector}: ${t.id}`);
  }
});

test('recommended and "more templates" split the catalog without overlap or gaps', () => {
  for (const sector of ALL_SECTORS) {
    const recommended = templatesForSector(sector).map((t) => t.id);
    const others = otherTemplatesForSector(sector).map((t) => t.id);
    assert.equal(recommended.length + others.length, SURVEY_TEMPLATES.length, sector);
    assert.equal(new Set([...recommended, ...others]).size, SURVEY_TEMPLATES.length, sector);
    for (const id of others) {
      assert.notEqual(getSurveyTemplate(id)!.sector, 'all', `${sector}: universal in "more"`);
    }
  }
  assert.deepEqual(
    otherTemplatesForSector('food').map((t) => t.id).sort(),
    ['in-store', 'post-service', 'post-stay', 'post-visit'],
  );
  assert.equal(otherTemplatesForSector('other').length, 5);
});

test('no review-routing, guarantee, invented-number or health-diagnosis wording in any question', () => {
  for (const t of SURVEY_TEMPLATES) {
    for (const { q, locale, text } of questionTexts(t)) {
      assert.doesNotMatch(text, FORBIDDEN, `${t.id}.${locale}: ${text}`);
      if (q.type === 'multiple_choice') {
        for (const o of q.options![locale]) {
          assert.doesNotMatch(o, FORBIDDEN, `${t.id}.${locale}: option ${o}`);
        }
      }
    }
    for (const locale of LOCALES) {
      assert.doesNotMatch(t.title[locale], FORBIDDEN, `${t.id}.${locale}: title`);
      assert.doesNotMatch(t.description[locale], FORBIDDEN, `${t.id}.${locale}: description`);
      assert.doesNotMatch(t.defaultTitle[locale], FORBIDDEN, `${t.id}.${locale}: defaultTitle`);
    }
  }
});

test('star and recommend questions are never phrased as yes/no questions', () => {
  for (const t of SURVEY_TEMPLATES) {
    for (const { q, locale, text } of questionTexts(t)) {
      if (q.type === 'rating' || q.type === 'nps') {
        assert.doesNotMatch(text, YES_NO_FOR_SCALE, `${t.id}.${locale}: ${text}`);
        assert.match(
          text,
          locale === 'tr'
            ? /(değerlendirirsiniz|ihtimaliniz nedir)\?$/
            : /^(How would you rate|How likely are you)/,
          `${t.id}.${locale}: ${text}`,
        );
      }
    }
  }
});

test('the clinic template carries the health-data warning INSIDE its open text question', () => {
  const clinic = getSurveyTemplate('post-visit')!;
  assert.equal(clinic.sector, 'clinic');
  const open = clinic.questions.filter((q) => q.type === 'long_text');
  assert.equal(open.length, 1);
  assert.match(open[0].text.tr, /sağlık bilgilerinizi yazmayın/);
  assert.match(open[0].text.en, /health details/);
  assert.equal(open[0].required, false);
  // the card says so, too
  assert.match(clinic.description.tr, /Sağlık bilgisi sormaz/);
  assert.match(clinic.description.en, /No health data|no health data/i);
  // and no other template asks for health data
  for (const t of SURVEY_TEMPLATES) {
    if (t.id === 'post-visit') continue;
    for (const { text } of questionTexts(t)) assert.doesNotMatch(text, /sağlık|health/i, t.id);
  }
});

test('open-text questions are optional, scale and choice questions required', () => {
  for (const t of SURVEY_TEMPLATES) {
    for (const q of t.questions) {
      if (q.type === 'long_text' || q.type === 'short_text') {
        assert.equal(q.required, false, `${t.id}: open text must be optional`);
      } else {
        assert.equal(q.required, true, `${t.id}: ${q.type} must be required`);
      }
    }
  }
});

test('instantiateTemplate: fresh localIds on every call, structure copied, nothing shared', () => {
  const t = getSurveyTemplate('satisfaction-plus')!;
  const first = instantiateTemplate(t, 'tr');
  const second = instantiateTemplate(t, 'tr');

  const ids = [...first.questions, ...second.questions].map((q) => q.localId);
  assert.equal(new Set(ids).size, ids.length, 'localIds must be unique across calls');
  for (const id of ids) assert.ok(id.length > 0);

  assert.equal(first.templateId, 'satisfaction-plus');
  assert.equal(first.title, 'Müşteri memnuniyet anketi');
  assert.equal(first.description, '');
  assert.equal(first.questions.length, 3);
  assert.deepEqual(
    first.questions.map((q) => [q.type, q.required]),
    [
      ['rating', true],
      ['multiple_choice', true],
      ['long_text', false],
    ],
  );
  assert.deepEqual(first.questions[1].options, ['Kalite', 'Hizmet', 'Hız', 'Fiyat', 'Ortam']);
  assert.deepEqual(first.questions[0].options, []);

  // editing the draft must not touch the catalog
  first.questions[1].options.push('Başka');
  first.questions[0].text = 'değişti';
  const again = instantiateTemplate(t, 'tr');
  assert.deepEqual(again.questions[1].options, ['Kalite', 'Hizmet', 'Hız', 'Fiyat', 'Ortam']);
  assert.equal(again.questions[0].text, 'Genel memnuniyetinizi nasıl değerlendirirsiniz?');
  assert.deepEqual(t.questions[1].options!.tr, ['Kalite', 'Hizmet', 'Hız', 'Fiyat', 'Ortam']);
});

test('instantiateTemplate: English output and a caller-supplied id factory', () => {
  const t = getSurveyTemplate('table-service')!;
  let n = 0;
  const out = instantiateTemplate(t, 'en', () => `seed-${(n += 1)}`);
  assert.equal(out.title, 'How was your visit today?');
  assert.deepEqual(
    out.questions.map((q) => q.localId),
    ['seed-1', 'seed-2', 'seed-3', 'seed-4'],
  );
  assert.deepEqual(out.questions[2].options, ['Very fast', 'Reasonable', 'A bit long', 'Too long']);
  assert.equal(out.thankYouMessage, 'Your feedback means a lot to us — thank you!');
});

test('a template becomes a valid create body once instantiated', () => {
  for (const t of SURVEY_TEMPLATES) {
    for (const locale of LOCALES) {
      const draft = instantiateTemplate(t, locale);
      const body = {
        title: draft.title,
        thankYouMessage: draft.thankYouMessage,
        questions: draft.questions.map((q) => ({
          text: q.text,
          type: q.type,
          options: q.type === 'multiple_choice' ? q.options : undefined,
          required: q.required,
        })),
      };
      assert.ok(body.questions.length >= 1 && body.questions.length <= MAX_QUESTIONS_PER_SURVEY);
      for (const q of body.questions) {
        assert.ok(q.text.length >= 1 && q.text.length <= QUESTION_TEXT_MAX);
        if (q.type === 'multiple_choice') {
          assert.ok(validateOptionsForWrite(q.options), `${t.id}.${locale}`);
        }
      }
    }
  }
});

test('blankQuestionDraft: one empty star question; choice drafts start with two empty rows', () => {
  const blank = blankQuestionDraft();
  assert.equal(blank.type, 'rating');
  assert.equal(blank.text, '');
  assert.deepEqual(blank.options, []);
  assert.equal(blank.required, true);
  assert.notEqual(blank.localId, blankQuestionDraft().localId);
  assert.deepEqual(blankQuestionDraft('multiple_choice').options, ['', '']);
  assert.deepEqual(blankQuestionDraft('nps').options, []);
  assert.equal(blankQuestionDraft('long_text', () => 'fixed').localId, 'fixed');
});

test('newLocalId: unique, non-empty, works without crypto.randomUUID', () => {
  const ids = new Set(Array.from({ length: 500 }, () => newLocalId()));
  assert.equal(ids.size, 500);

  const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  try {
    Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
    const fallback = new Set(Array.from({ length: 200 }, () => newLocalId()));
    assert.equal(fallback.size, 200);
    for (const id of fallback) assert.match(id, /^q_/);
  } finally {
    if (original) Object.defineProperty(globalThis, 'crypto', original);
    else delete (globalThis as { crypto?: unknown }).crypto;
  }
});
