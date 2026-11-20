import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decidePayment, paymentDecisionToCheck } from '../src/lib/payment/paynkolay';

// billing spec §15.2 `paynkolay-decide-payment.test.ts` (§7.3).

const expected = { clientRefCode: 'pay_A', amountMinor: 49900, hosted: true };
const sale = (over: Record<string, unknown> = {}) => ({
  CLIENT_REFERENCE_CODE: 'pay_A',
  REFERENCE_CODE: 'R1',
  STATUS: 'SUCCESS',
  TRANSACTION_TYPE: 'SALES',
  AUTHORIZATION_AMOUNT: '499.00',
  CURRENCY_CODE: '949',
  USE_3D: 'true',
  INSTALLMENT: '1',
  ...over,
});

test('rows of other clientRefCodes never count, even a SUCCESS with the returned reference', () => {
  const foreign = sale({ CLIENT_REFERENCE_CODE: 'pay_B' });
  assert.deepEqual(decidePayment([foreign], expected, 'R1'), { kind: 'not_found' });
});

test('a row without a CLIENT_REFERENCE_CODE never counts', () => {
  const { CLIENT_REFERENCE_CODE: _drop, ...noRef } = sale();
  void _drop;
  assert.deepEqual(decidePayment([noRef], expected), { kind: 'not_found' });
  assert.deepEqual(decidePayment([], expected), { kind: 'not_found' });
});

test('one matching SUCCESS sale → succeeded; two → duplicate', () => {
  assert.deepEqual(decidePayment([sale()], expected, 'R1'), { kind: 'succeeded', referenceCode: 'R1', amountMinor: 49900 });
  const two = decidePayment([sale(), sale({ REFERENCE_CODE: 'R2' })], expected, 'R2');
  assert.equal(two.kind, 'duplicate');
  assert.equal(two.kind === 'duplicate' && two.successCount, 2);
  assert.equal(two.kind === 'duplicate' && two.referenceCode, 'R2');
  // lower-case field variant
  assert.equal(decidePayment([{ clientRefCode: 'pay_A', STATUS: 'SUCCESS', AUTHORIZATION_AMOUNT: '499.00' }], expected).kind, 'succeeded');
});

test('mismatches: amount, currency, not 3D, instalments, other type', () => {
  const kind = (row: Record<string, unknown>, hosted = true) => {
    const d = decidePayment([row], { ...expected, hosted });
    return d.kind === 'charged_mismatch' ? d.reason : d.kind;
  };
  assert.equal(kind(sale({ AUTHORIZATION_AMOUNT: '500.00' })), 'amount');
  assert.equal(kind(sale({ AUTHORIZATION_AMOUNT: 'n/a' })), 'amount');
  assert.equal(kind(sale({ CURRENCY_CODE: '840' })), 'currency');
  assert.equal(kind(sale({ USE_3D: 'false' })), 'not_3d');
  assert.equal(kind(sale({ INSTALLMENT: '3' })), 'installment');
  assert.equal(kind(sale({ TRANSACTION_TYPE: 'REFUND' })), 'type');
  assert.equal(kind(sale({ TRANSACTION_TYPE: 'CANCEL' })), 'type');
  // a merchant-initiated charge is non-3D by design
  assert.equal(kind(sale({ USE_3D: 'false' }), false), 'succeeded');
  // TRY spelled out is fine; a missing currency field is skipped until Q-20
  assert.equal(kind(sale({ CURRENCY_CODE: 'TRY' })), 'succeeded');
  const { CURRENCY_CODE: _c, ...noCurrency } = sale();
  void _c;
  assert.equal(kind(noCurrency), 'succeeded');
});

test('no SUCCESS: only terminal failure rows → failed; pending or unknown → indeterminate', () => {
  assert.deepEqual(decidePayment([sale({ STATUS: 'FAILED' }), sale({ STATUS: 'DECLINED' })], expected), {
    kind: 'failed',
    reason: 'provider:failed',
  });
  assert.deepEqual(decidePayment([sale({ STATUS: 'PENDING' })], expected), { kind: 'indeterminate', status: 'PENDING' });
  assert.equal(decidePayment([sale({ STATUS: 'FAILED' }), sale({ STATUS: 'NEW' })], expected).kind, 'indeterminate');
  assert.equal(decidePayment([sale({ STATUS: '' })], expected).kind, 'indeterminate');
});

test('returnedReference only breaks ties; it cannot select another clientRefCode', () => {
  const foreign = sale({ CLIENT_REFERENCE_CODE: 'pay_B', REFERENCE_CODE: 'RX' });
  const own = sale({ REFERENCE_CODE: 'R9' });
  const d = decidePayment([foreign, own], expected, 'RX');
  assert.deepEqual(d, { kind: 'succeeded', referenceCode: 'R9', amountMinor: 49900 });
});

test('legacy adapter: only succeeded/duplicate map to a success', () => {
  assert.equal(paymentDecisionToCheck({ kind: 'succeeded', referenceCode: 'R', amountMinor: 1 }).status, 'succeeded');
  assert.equal(paymentDecisionToCheck({ kind: 'not_found' }).status, 'failed');
  assert.equal(paymentDecisionToCheck({ kind: 'indeterminate', status: 'PENDING' }).status, 'failed');
});
