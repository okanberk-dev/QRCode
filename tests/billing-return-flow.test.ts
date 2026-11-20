import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  isOwnerLapsed,
  paymentResultPath,
  readReturnGet,
  readReturnPost,
  resultForDecision,
  resultForSettle,
} from '../src/lib/billing/return-flow';
import { paymentResultMessage } from '../src/lib/billing/payment-result-copy';

// Return route (billing spec §8.6, §14.5): reads only the payment id, the
// REFERENCE_CODE tie-breaker and the hash-check fields; lapsed owners keep
// their payment result.

const lookup = (obj: Record<string, string>) => (name: string) => (name in obj ? obj[name] : null);

test('GET reads only the payment id — no other query parameter is copied', () => {
  const input = readReturnGet(
    lookup({ clientRefCode: 'cpay123', TRAN_ID: '9999', REFERENCE_CODE: 'R1', cardNumber: '4111111111111111', customerKey: 'ABCDEFGHJK1' }),
  );
  assert.deepEqual(input, { paymentId: 'cpay123', hashFields: {} });
  assert.equal(readReturnGet(lookup({ CLIENT_REFERENCE_CODE: 'cpay9' })).paymentId, 'cpay9');
  assert.equal(readReturnGet(lookup({ clientRefCode: 'bad id; drop' })).paymentId, null);
});

test('POST keeps only the hash-check fields and the id', () => {
  const input = readReturnPost(
    lookup({
      CLIENT_REFERENCE_CODE: 'cpay123',
      REFERENCE_CODE: 'R1',
      RESPONSE_CODE: '2',
      hashDataV2: 'h',
      TRAN_ID: '9999',
      Token: 'secret-token',
      cardNumber: '4111111111111111',
      BANK_REQUEST_MESSAGE: 'x',
    }),
  );
  assert.equal(input.paymentId, 'cpay123');
  assert.deepEqual(Object.keys(input.hashFields).sort(), ['REFERENCE_CODE', 'RESPONSE_CODE', 'hashDataV2']);
  assert.equal(JSON.stringify(input).includes('4111'), false);
  assert.equal(JSON.stringify(input).includes('secret-token'), false);
});

test('lapsed owners land on /pricing with the result; others on the billing section', () => {
  assert.equal(paymentResultPath('tr', 'pending', true), '/tr/pricing?plan=expired&payment=pending');
  assert.equal(paymentResultPath('en', 'success', false), '/en/dashboard/account?section=billing&payment=success');
  assert.equal(paymentResultPath('tr', null, false), '/tr/dashboard/account?section=billing');
  const now = new Date('2026-12-01T00:00:00Z');
  assert.equal(isOwnerLapsed({ plan: 'expired', trialEndsAt: null }, now), true);
  assert.equal(isOwnerLapsed({ plan: 'trial', trialEndsAt: new Date('2026-11-30T00:00:00Z') }, now), true);
  assert.equal(isOwnerLapsed({ plan: 'trial', trialEndsAt: new Date('2026-12-02T00:00:00Z') }, now), false);
  assert.equal(isOwnerLapsed({ plan: 'monthly', trialEndsAt: null }, now), false);
  assert.equal(isOwnerLapsed(null, now), false);
});

test('status mapping: no confirmation is "pending", never "failed"', () => {
  assert.equal(resultForDecision({ kind: 'not_found' }), 'pending');
  assert.equal(resultForDecision({ kind: 'indeterminate', status: 'PENDING' }), 'pending');
  assert.equal(resultForDecision({ kind: 'failed', reason: 'provider:failed' }), 'failed');
  assert.equal(resultForDecision({ kind: 'charged_mismatch', reason: 'not_3d', referenceCode: null }), 'review');
  assert.equal(resultForSettle('succeeded'), 'success');
  assert.equal(resultForSettle('duplicate_period'), 'review');
  assert.equal(resultForSettle('review'), 'review');
  for (const status of ['success', 'failed', 'pending', 'review']) {
    assert.ok(paymentResultMessage(status, 'tr'));
    assert.ok(paymentResultMessage(status, 'en'));
  }
  assert.equal(paymentResultMessage('<script>', 'tr'), null);
  assert.equal(paymentResultMessage('constructor', 'tr'), null);
});

test('the return route never hands the provider body to Sentry or a log', () => {
  const src = readFileSync(join(__dirname, '..', 'src/app/api/billing/paynkolay/return/route.ts'), 'utf8');
  assert.equal(/captureException\(err\b/.test(src), false);
  assert.equal(/console\.(log|warn|error|info)/.test(src), false);
  assert.equal(/searchParams\.entries|formData\(\)\.entries|form\.entries/.test(src), false);
  assert.ok(src.includes("safeError(err, 'return')"));
});
