/**
 * Operating company facts (src/lib/legal/company-entity.ts) must be the same
 * everywhere they are published: legal-text variable defaults, the data
 * migration that sets the live values, and the e-mail footer.
 * Run: npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { COMPANY_ENTITY, COMPANY_TAX_LINE } from '../src/lib/legal/company-entity';
import { getDefaultLegalVariableMap } from '../src/lib/legal/variables';
import { renderFooter } from '../src/lib/email/components';

const migration = readFileSync(
  join(process.cwd(), 'prisma/migrations/20261120090000_company_entity_nextgen/migration.sql'),
  'utf8',
);

test('legal-text variable defaults are the operating company', () => {
  const d = getDefaultLegalVariableMap();
  assert.equal(d.COMPANY_NAME, COMPANY_ENTITY.legalName);
  assert.equal(d.COMPANY_ADDRESS, COMPANY_ENTITY.addressLine);
  assert.equal(d.COMPANY_TAX_ID, COMPANY_TAX_LINE);
  assert.equal(d.COMPANY_PHONE, COMPANY_ENTITY.phone);
  for (const key of ['COMPANY_NAME', 'COMPANY_ADDRESS', 'COMPANY_TAX_ID', 'COMPANY_PHONE']) {
    assert.ok(!d[key].startsWith('['), `${key} must not be a placeholder`);
  }
});

test('the data migration writes exactly the code defaults', () => {
  const d = getDefaultLegalVariableMap();
  for (const key of ['COMPANY_NAME', 'COMPANY_ADDRESS', 'COMPANY_TAX_ID', 'COMPANY_PHONE']) {
    const row = `('${key}', '${d[key].replace(/'/g, "''")}', CURRENT_TIMESTAMP)`;
    assert.ok(migration.includes(row), `migration row for ${key} drifted from the code default`);
  }
});

test('registry numbers have the official lengths', () => {
  assert.match(COMPANY_ENTITY.mersisNo, /^\d{16}$/);
  assert.match(COMPANY_ENTITY.taxNo, /^\d{10}$/);
  assert.match(COMPANY_ENTITY.phoneE164, /^\+90\d{10}$/);
});

test('every e-mail footer identifies the sender (TR and EN)', () => {
  for (const locale of ['tr', 'en'] as const) {
    const html = renderFooter({ locale });
    assert.ok(html.includes(COMPANY_ENTITY.legalName), `${locale}: legal name`);
    assert.ok(html.includes(COMPANY_ENTITY.mersisNo), `${locale}: MERSİS`);
    assert.ok(html.includes('Tuzla'), `${locale}: address`);
  }
  assert.ok(renderFooter({ locale: 'tr' }).includes('markasıdır'));
  assert.ok(renderFooter({ locale: 'en' }).includes('is a brand of'));
});
