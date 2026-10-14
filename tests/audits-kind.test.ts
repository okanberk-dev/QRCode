/**
 * Denetim Merkezi — türetilmiş meta veri (spec §5.1) birim testleri.
 * Saf fonksiyonlar, DB'siz.
 *
 * Run: npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  auditSectorForBusiness,
  deriveAuditKind,
  deriveAuditStatus,
  humanQuestionType,
  readableOn,
  relativeLuminance,
} from '../src/lib/audits/kind';

describe('deriveAuditKind', () => {
  it('only yes_no / scale / text / file → checklist', () => {
    assert.equal(deriveAuditKind(['yes_no', 'yes_no', 'text']), 'checklist');
    assert.equal(deriveAuditKind(['scale', 'file']), 'checklist');
  });

  it('any single or multi → quiz (shown as "Test")', () => {
    assert.equal(deriveAuditKind(['yes_no', 'single']), 'quiz');
    assert.equal(deriveAuditKind(['multi']), 'quiz');
    assert.equal(deriveAuditKind(['yes_no', 'text', 'multi', 'scale']), 'quiz');
  });

  it('empty list and nullish entries → checklist', () => {
    assert.equal(deriveAuditKind([]), 'checklist');
    assert.equal(deriveAuditKind([null, undefined, 'yes_no']), 'checklist');
  });
});

describe('deriveAuditStatus — order matters (spec §3.0)', () => {
  const base = { isActive: true, isPublished: false, assignmentCount: 0, responseCount: 0 };

  it('!isActive wins over everything → archived (even if still flagged published)', () => {
    assert.equal(deriveAuditStatus({ ...base, isActive: false }), 'archived');
    assert.equal(
      deriveAuditStatus({ ...base, isActive: false, isPublished: true, assignmentCount: 3, responseCount: 9 }),
      'archived',
    );
  });

  it('isPublished → live', () => {
    assert.equal(deriveAuditStatus({ ...base, isPublished: true }), 'live');
    assert.equal(deriveAuditStatus({ ...base, isPublished: true, responseCount: 4 }), 'live');
  });

  it('unpublished but it was live once (links or responses exist) → paused', () => {
    assert.equal(deriveAuditStatus({ ...base, assignmentCount: 1 }), 'paused');
    assert.equal(deriveAuditStatus({ ...base, responseCount: 2 }), 'paused');
    assert.equal(deriveAuditStatus({ ...base, assignmentCount: 2, responseCount: 2 }), 'paused');
  });

  it('never published, no links, no responses → draft', () => {
    assert.equal(deriveAuditStatus(base), 'draft');
  });
});

describe('auditSectorForBusiness (detectSector → audit sector)', () => {
  it('empty / null / undefined and the schema default "Restoran" → food', () => {
    assert.equal(auditSectorForBusiness(''), 'food');
    assert.equal(auditSectorForBusiness(null), 'food');
    assert.equal(auditSectorForBusiness(undefined), 'food');
    assert.equal(auditSectorForBusiness('Restoran'), 'food');
  });

  it('food-adjacent and UNRECOGNISED free text fall to food (detectSector default branch)', () => {
    assert.equal(auditSectorForBusiness('Kafe'), 'food');
    assert.equal(auditSectorForBusiness('Pastane'), 'food');
    assert.equal(auditSectorForBusiness('zzz bilinmeyen kategori'), 'food');
  });

  it('delivery → food', () => {
    assert.equal(auditSectorForBusiness('Paket Servis'), 'food');
  });

  it('hospitality → hotel, clinic → health, spa → beauty, retail → retail', () => {
    assert.equal(auditSectorForBusiness('Otel'), 'hotel');
    assert.equal(auditSectorForBusiness('Hotel'), 'hotel');
    assert.equal(auditSectorForBusiness('Klinik'), 'health');
    assert.equal(auditSectorForBusiness('Güzellik'), 'beauty');
    assert.equal(auditSectorForBusiness('Kuaför'), 'beauty');
    assert.equal(auditSectorForBusiness('Perakende'), 'retail');
  });

  it('legal / fitness / education / other → other', () => {
    assert.equal(auditSectorForBusiness('Hukuk'), 'other');
    assert.equal(auditSectorForBusiness('Spor'), 'other');
    assert.equal(auditSectorForBusiness('Eğitim'), 'other');
    assert.equal(auditSectorForBusiness('Diğer'), 'other');
  });
});

describe('humanQuestionType', () => {
  it('maps every type to a human TR label (never the raw key)', () => {
    assert.equal(humanQuestionType('yes_no', 'tr'), 'Evet/Hayır');
    assert.equal(humanQuestionType('scale', 'tr'), '1-5 puan');
    assert.equal(humanQuestionType('single', 'tr'), 'Seçim');
    assert.equal(humanQuestionType('multi', 'tr'), 'Çoklu seçim');
    assert.equal(humanQuestionType('text', 'tr'), 'Not');
    assert.equal(humanQuestionType('file', 'tr'), 'Fotoğraf');
  });

  it('EN labels', () => {
    assert.equal(humanQuestionType('yes_no', 'en'), 'Yes/No');
    assert.equal(humanQuestionType('scale', 'en'), '1-5 rating');
    assert.equal(humanQuestionType('single', 'en'), 'Choice');
    assert.equal(humanQuestionType('multi', 'en'), 'Multiple choice');
    assert.equal(humanQuestionType('text', 'en'), 'Note');
    assert.equal(humanQuestionType('file', 'en'), 'Photo');
  });

  it('defaults to TR and echoes an unknown type instead of returning an empty label', () => {
    assert.equal(humanQuestionType('yes_no'), 'Evet/Hayır');
    assert.equal(humanQuestionType('mystery'), 'mystery');
  });
});

describe('readableOn (text colour on an accent background)', () => {
  it('light accents (Pulse lime, white, yellow) → dark text', () => {
    assert.equal(readableOn('#C6F24E'), '#0A0A0A');
    assert.equal(readableOn('#FFFFFF'), '#0A0A0A');
    assert.equal(readableOn('#fde047'), '#0A0A0A');
  });

  it('dark accents (the spec fixture #1E3A8A, black, graphite) → white text', () => {
    assert.equal(readableOn('#1E3A8A'), '#FFFFFF');
    assert.equal(readableOn('#000000'), '#FFFFFF');
    assert.equal(readableOn('#0A0A0A'), '#FFFFFF');
  });

  it('accepts 3-digit hex and a missing "#"', () => {
    assert.equal(readableOn('#fff'), '#0A0A0A');
    assert.equal(readableOn('000'), '#FFFFFF');
    assert.equal(readableOn('1E3A8A'), '#FFFFFF');
  });

  it('invalid / missing input falls back to dark text (Pulse default accent is light)', () => {
    assert.equal(readableOn(''), '#0A0A0A');
    assert.equal(readableOn(null), '#0A0A0A');
    assert.equal(readableOn(undefined), '#0A0A0A');
    assert.equal(readableOn('not-a-colour'), '#0A0A0A');
    assert.equal(readableOn('#12'), '#0A0A0A');
  });

  it('relativeLuminance is 0 for black, 1 for white and null for garbage', () => {
    assert.equal(relativeLuminance('#000'), 0);
    assert.ok(Math.abs((relativeLuminance('#fff') ?? 0) - 1) < 1e-9);
    assert.equal(relativeLuminance('nope'), null);
  });
});
