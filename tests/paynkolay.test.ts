import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildHostedCheckout,
  confirmPayment,
  decidePayment,
  formatPaynkolayDay,
  formatPaynkolayRnd,
  minorToPaynkolayAmount,
  paymentListRows,
  paynkolayAmountToMinor,
  paynkolayHash,
  verifyPaynkolayReturnHash,
} from '../src/lib/payment/paynkolay';
import { nextPeriodEnd } from '../src/lib/billing/paynkolay-billing';
import { moduleSwitches, normalizeModuleKeys } from '../src/lib/plan-modules-catalog';

const cfg = {
  sx: 'SX',
  sxList: 'SXL',
  merchantSecretKey: 'SECRET',
  merchantNo: '400',
  baseUrl: 'https://pos.test',
  env: 'test' as const,
  mit: null,
  hosted3dEnforced: false,
};

test('amounts: kuruş ↔ PayNKolay string without floats', () => {
  assert.equal(minorToPaynkolayAmount(128010), '1280.10');
  assert.equal(minorToPaynkolayAmount(5), '0.05');
  assert.equal(paynkolayAmountToMinor('1280.10'), 128010);
  assert.equal(paynkolayAmountToMinor('1280,1'), 128010);
  assert.equal(paynkolayAmountToMinor('abc'), null);
  assert.throws(() => minorToPaynkolayAmount(1.5));
});

test('dates are Europe/Istanbul', () => {
  const at = new Date(Date.UTC(2026, 10, 19, 21, 30, 5)); // 00:30:05 next day in Istanbul
  assert.equal(formatPaynkolayRnd(at), '20.11.2026 00:30:05');
  assert.equal(formatPaynkolayDay(at), '20.11.2026');
});

test('hosted checkout: hash covers the exact form strings', () => {
  const { action, fields } = buildHostedCheckout(
    cfg,
    { clientRefCode: 'pay123', amountMinor: 49900, successUrl: 'https://x/r', failUrl: 'https://x/r' },
    new Date(Date.UTC(2026, 0, 1, 9, 0, 0)),
  );
  assert.equal(action, 'https://pos.test/Vpos');
  assert.equal(fields.amount, '499.00');
  assert.equal(fields.use3D, 'true');
  assert.equal(
    fields.hashDataV2,
    paynkolayHash(['SX', 'pay123', '499.00', 'https://x/r', 'https://x/r', '01.01.2026 12:00:00', ''], 'SECRET'),
  );
  assert.throws(() => buildHostedCheckout(cfg, { clientRefCode: 'şık', amountMinor: 1, successUrl: 'a', failUrl: 'a' }));
});

test('return hash verifies and rejects tampering', () => {
  const params: Record<string, string> = {
    MERCHANT_NO: '400', REFERENCE_CODE: 'R1', AUTH_CODE: 'A', RESPONSE_CODE: '2', USE_3D: 'true',
    RND: 'x', INSTALLMENT: '1', AUTHORIZATION_AMOUNT: '499.00', CURRENCY_CODE: '949',
  };
  params.hashDataV2 = paynkolayHash(
    ['400', 'R1', 'A', '2', 'true', 'x', '1', '499.00', '949'],
    'SECRET',
  );
  assert.equal(verifyPaynkolayReturnHash(params, 'SECRET'), true);
  assert.equal(verifyPaynkolayReturnHash({ ...params, AUTHORIZATION_AMOUNT: '1.00' }, 'SECRET'), false);
});

test('PaymentList: "no record" is empty, refusals throw', () => {
  assert.deepEqual(paymentListRows({ result: { LIST: null, ERROR_CODE: 'CORE0305' } }), []);
  assert.equal(paymentListRows({ result: { LIST: [{ REFERENCE_CODE: 'R1' }] } }).length, 1);
  assert.throws(() => paymentListRows({ result: '{"RESPONSE_DATA":"API : hashData error"}' }));
});

test('decidePayment: only a SUCCESS sale of the exact amount for this clientRefCode counts', () => {
  const ok = { CLIENT_REFERENCE_CODE: 'pay123', REFERENCE_CODE: 'R1', STATUS: 'SUCCESS', TRANSACTION_TYPE: 'SALES', AUTHORIZATION_AMOUNT: '499.00' };
  const expected = { clientRefCode: 'pay123', amountMinor: 49900, hosted: true };
  assert.deepEqual(decidePayment([ok], expected, 'R1'), { kind: 'succeeded', referenceCode: 'R1', amountMinor: 49900 });
  assert.equal(decidePayment([ok], { ...expected, amountMinor: 50000 }, 'R1').kind, 'charged_mismatch');
  assert.equal(decidePayment([{ ...ok, STATUS: 'NEW' }], expected, 'R1').kind, 'indeterminate');
  assert.equal(decidePayment([{ ...ok, TRANSACTION_TYPE: 'CANCEL' }], expected, 'R1').kind, 'charged_mismatch');
  assert.equal(decidePayment([], expected, '').kind, 'not_found');
});

test('period: a payment extends an active period instead of overlapping (Istanbul calendar)', () => {
  const now = new Date(Date.UTC(2026, 0, 15));
  assert.equal(nextPeriodEnd('monthly', null, now).toISOString(), '2026-02-15T00:00:00.000Z');
  assert.equal(
    nextPeriodEnd('monthly', new Date(Date.UTC(2026, 0, 20)), now).toISOString(),
    '2026-02-20T00:00:00.000Z',
  );
  assert.equal(nextPeriodEnd('yearly', new Date(Date.UTC(2025, 0, 1)), now).toISOString(), '2027-01-15T00:00:00.000Z');
  // Month end: 31 Jan → 28 Feb (not 3 Mar), and with the anchor back to 31 Mar.
  const jan31 = new Date('2027-01-31T09:00:00Z');
  const feb = nextPeriodEnd('monthly', jan31, new Date('2027-01-20T00:00:00Z'));
  assert.equal(feb.toISOString(), '2027-02-28T09:00:00.000Z');
  assert.equal(nextPeriodEnd('monthly', feb, new Date('2027-02-20T00:00:00Z'), 31).toISOString(), '2027-03-31T09:00:00.000Z');
  // 01:30 Istanbul on 1 March anchors to the 1st, not to 28 February UTC.
  assert.equal(nextPeriodEnd('monthly', null, new Date('2027-02-28T22:30:00Z')).toISOString(), '2027-03-31T22:30:00.000Z');
});

test('confirmPayment: PaymentList through an injected transport, PaymentDecision result', async () => {
  const sent: Record<string, string>[] = [];
  const transport = {
    async postForm(url: string, form: Record<string, string>) {
      assert.equal(url, 'https://pos.test/Vpos/Payment/PaymentList');
      sent.push(form);
      const rows = [
        { CLIENT_REFERENCE_CODE: 'other', REFERENCE_CODE: 'R1', STATUS: 'SUCCESS', AUTHORIZATION_AMOUNT: '499.00' },
        { CLIENT_REFERENCE_CODE: 'pay123', REFERENCE_CODE: 'R2', STATUS: 'SUCCESS', TRANSACTION_TYPE: 'SALES', AUTHORIZATION_AMOUNT: '499.00' },
      ];
      return { status: 200, contentType: 'application/json', text: JSON.stringify({ result: { LIST: rows } }) };
    },
  };
  const now = new Date(Date.UTC(2026, 0, 2, 9));
  const decision = await confirmPayment(
    cfg,
    { REFERENCE_CODE: 'R1' },
    { clientRefCode: 'pay123', amountMinor: 49900, createdAt: new Date(Date.UTC(2026, 0, 2, 8)) },
    transport,
    now,
  );
  assert.deepEqual(decision, { kind: 'succeeded', referenceCode: 'R2', amountMinor: 49900 });
  assert.equal(sent[0].sx, 'SXL');
  assert.equal(sent[0].clientRefCode, 'pay123');
  assert.equal(sent[0].hashDatav2, paynkolayHash(['SXL', sent[0].startDate, sent[0].endDate, 'pay123'], 'SECRET'));

  const failing = { async postForm() { return { status: 502, contentType: 'text/html', text: '<html>x</html>' }; } };
  await assert.rejects(confirmPayment(cfg, {}, { clientRefCode: 'pay123', amountMinor: 1, createdAt: now }, failing, now));
});

test('plan modules: unknown keys dropped, switches derived', () => {
  assert.deepEqual(normalizeModuleKeys(['menu', 'x', 'pulseAi', 'menu']), ['pulseAi', 'menu']);
  const sw = moduleSwitches(['menu']);
  assert.equal(sw.menuEnabled, true);
  assert.equal(sw.pulseAiEnabled, false);
});
