/**
 * Billing redaction and the Sentry scrubber (src/lib/billing/redact.ts,
 * src/lib/billing/sensitive.ts — billing spec §14, §15.2).
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- Sentry event fixtures are untyped JSON */
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { inspect } from 'node:util';

import { Sensitive, sensitive } from '../src/lib/billing/sensitive';
import {
  billingLog,
  isBillingEvent,
  normalizeKey,
  redactDeep,
  redactPaynkolayParams,
  redactString,
  safeError,
  scrubSentryEvent,
  scrubSentryLog,
  SENSITIVE_KEYS,
} from '../src/lib/billing/redact';

const SECRET_VALUES = ['TOKEN-abc123', 'TRAN-998877', 'ABCDEFGHJK1', '4111111111111111', 'HASH-zzz', 'SX-xyz'];

describe('Sensitive', () => {
  it('1. JSON, String(), template literals and util.inspect never show the value; reveal() does', () => {
    const s = sensitive('ABCDEFGHJK1');
    assert.equal(JSON.stringify({ s }), '{"s":"[redacted]"}');
    assert.equal(String(s), '[redacted]');
    assert.equal(`${s}`, '[redacted]');
    assert.equal(s + '', '[redacted]');
    assert.ok(!inspect(s).includes('ABCDEFGHJK1'));
    assert.ok(!inspect({ nested: { s } }, { depth: 5 }).includes('ABCDEFGHJK1'));
    assert.equal(s.reveal(), 'ABCDEFGHJK1');
    assert.ok(s instanceof Sensitive);
    assert.throws(() => new Sensitive(42 as unknown as string));
  });
});

describe('redactString', () => {
  it('masks PAN-like runs, long base64 runs and (billing) customer-key shapes', () => {
    assert.equal(redactString('card 4111111111111111 failed'), 'card [pan] failed');
    assert.equal(redactString('card 4111 1111 1111 1111 failed'), 'card [pan] failed');
    const b64 = 'A'.repeat(30) + 'b+/9'.repeat(5) + '==';
    assert.equal(redactString(`hash=${b64}`), 'hash=[b64]');
    assert.equal(redactString('key ABCDEFGHJK1 x'), 'key ABCDEFGHJK1 x');
    assert.equal(redactString('key ABCDEFGHJK1 x', { billing: true }), 'key [ck] x');
    assert.equal(redactString('order 12345 ok', { billing: true }), 'order 12345 ok');
  });
});

describe('redactPaynkolayParams', () => {
  it('2. keeps only the allow-listed keys and reports the dropped count', () => {
    const out = redactPaynkolayParams({
      csToken: 'TOKEN-abc123',
      Token: 'TOKEN-abc123',
      TranId: 'TRAN-998877',
      TRAN_ID: 'TRAN-998877',
      customerKey: 'ABCDEFGHJK1',
      cardNumber: '4111111111111111',
      cvv: '123',
      hashDataV2: 'HASH-zzz',
      sx: 'SX-xyz',
      CLIENT_REFERENCE_CODE: 'p1',
      RESPONSE_CODE: '2',
    });
    assert.deepEqual(out, { CLIENT_REFERENCE_CODE: 'p1', RESPONSE_CODE: '2', droppedKeys: 9 });
    const json = JSON.stringify(out);
    for (const secret of SECRET_VALUES) assert.ok(!json.includes(secret), secret);
  });

  it('caps values at 64 characters and masks PAN shapes inside kept values', () => {
    const out = redactPaynkolayParams({ STATUS: 'ab cd '.repeat(30), ERROR_CODE: '4111111111111111' });
    assert.equal(String(out.STATUS).length, 64);
    assert.equal(out.ERROR_CODE, '[pan]');
  });
});

describe('redactDeep', () => {
  it('3. matches normalised sensitive keys at any depth', () => {
    const input = {
      REFERENCE_CODE: 'R1',
      referenceCode: 'R2',
      CUSTOMER_KEY: 'ABCDEFGHJK1',
      customer_key: 'ABCDEFGHJK1',
      card_number: '4111111111111111',
      cardHolderName: 'Ayşe Yılmaz',
      AUTH_CODE: '123456',
      sx_list: 'SXL',
      cvv2: '123',
      nested: { deeper: { Authorization: 'Bearer x', 'set-cookie': 'a=b', ok: 'visible' } },
      list: [{ token: 't' }],
    };
    const out = redactDeep(input) as Record<string, unknown>;
    for (const key of ['REFERENCE_CODE', 'referenceCode', 'CUSTOMER_KEY', 'customer_key', 'card_number', 'cardHolderName', 'AUTH_CODE', 'sx_list', 'cvv2']) {
      assert.equal(out[key], '[redacted]', key);
    }
    assert.deepEqual(out.nested, { deeper: { Authorization: '[redacted]', 'set-cookie': '[redacted]', ok: 'visible' } });
    assert.deepEqual(out.list, [{ token: '[redacted]' }]);
    assert.equal(input.REFERENCE_CODE, 'R1', 'input is not mutated');
    assert.ok(SENSITIVE_KEYS.has(normalizeKey('sx-list')));
  });

  it('reduces errors, hides Sensitive, survives cycles and stops at depth 6', () => {
    const cyclic: Record<string, unknown> = { a: 1 };
    cyclic.self = cyclic;
    const deep = { l1: { l2: { l3: { l4: { l5: { l6: { l7: 'x' } } } } } } };
    const err = Object.assign(new Error('provider said 4111111111111111'), { code: 'E_X' });
    const out = redactDeep({ err, s: sensitive('ABCDEFGHJK1'), cyclic, deep }) as Record<string, unknown>;
    assert.deepEqual(out.err, { name: 'Error', code: 'E_X' });
    assert.equal(out.s, '[redacted]');
    assert.equal((out.cyclic as Record<string, unknown>).self, '[circular]');
    assert.ok(JSON.stringify(out.deep).includes('[depth]'));
  });
});

function billingReturnEvent(): Record<string, unknown> {
  return {
    transaction: 'GET /api/billing/paynkolay/return?TRAN_ID=1&REFERENCE_CODE=2',
    request: {
      url: 'https://www.buaze.com/api/billing/paynkolay/return?TRAN_ID=1&REFERENCE_CODE=2',
      query_string: 'TRAN_ID=1&REFERENCE_CODE=2',
      cookies: { bz_session: 'secret-cookie' },
      headers: { authorization: 'Bearer abc', cookie: 'bz_session=secret-cookie', 'user-agent': 'UA/1', 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
      data: { csToken: 'TOKEN-abc123', amount: '499.00' },
    },
    breadcrumbs: [
      { category: 'fetch', data: { url: 'https://paynkolay.nkolayislem.com.tr/Vpos?x=1', method: 'POST' }, message: 'GET https://x.test/p?token=abc' },
    ],
    exception: {
      values: [
        {
          type: 'Error',
          value: `failed for 4111111111111111 with ${'Qk'.repeat(30)} key ABCDEFGHJK1`,
          stacktrace: {
            frames: [
              { filename: 'app:///src/lib/payment/paynkolay-cards.ts', vars: { token: 'TOKEN-abc123', form: { csToken: 'TOKEN-abc123' } } },
              { filename: 'app:///src/lib/other.ts', vars: { local: 'ABCDEFGHJK1' } },
            ],
          },
        },
      ],
    },
    extra: { customerKey: 'ABCDEFGHJK1', note: 'ok' },
    tags: { integration: 'paynkolay' },
  };
}

describe('scrubSentryEvent', () => {
  it('4a. strips query strings from request.url, transaction and breadcrumbs; drops query_string', () => {
    const ev = scrubSentryEvent(billingReturnEvent()) as Record<string, any>;
    assert.equal(ev.request.url, 'https://www.buaze.com/api/billing/paynkolay/return');
    assert.equal(ev.request.query_string, undefined);
    assert.equal(ev.transaction, 'GET /api/billing/paynkolay/return');
    assert.equal(ev.breadcrumbs[0].data.url, 'https://paynkolay.nkolayislem.com.tr/Vpos');
    assert.ok(!ev.breadcrumbs[0].message.includes('token=abc'));
  });

  it('4b. keeps only user-agent and content-type headers; cookies gone', () => {
    const ev = scrubSentryEvent(billingReturnEvent()) as Record<string, any>;
    assert.deepEqual(ev.request.headers, { 'user-agent': 'UA/1', 'content-type': 'application/json' });
    assert.equal(ev.request.cookies, undefined);
  });

  it('4c. redacts PAN, long base64 and (billing) customer-key shapes in exception values', () => {
    const ev = scrubSentryEvent(billingReturnEvent()) as Record<string, any>;
    const value: string = ev.exception.values[0].value;
    assert.ok(!value.includes('4111111111111111'));
    assert.ok(!value.includes('Qk'.repeat(30)));
    assert.ok(!value.includes('ABCDEFGHJK1'));
    assert.match(value, /\[pan\].*\[b64\].*\[ck\]/);
  });

  it('4d. billing event: every frame loses vars, extra.customerKey redacted, request.data dropped', () => {
    const ev = scrubSentryEvent(billingReturnEvent()) as Record<string, any>;
    for (const frame of ev.exception.values[0].stacktrace.frames) assert.equal(frame.vars, undefined);
    assert.equal(ev.extra.customerKey, '[redacted]');
    assert.equal(ev.extra.note, 'ok');
    assert.equal(ev.request.data, undefined);
    const json = JSON.stringify(ev);
    for (const secret of ['TOKEN-abc123', 'ABCDEFGHJK1', '4111111111111111', 'secret-cookie', 'Bearer abc']) {
      assert.ok(!json.includes(secret), secret);
    }
  });

  it('4d. request.data is dropped for any /api/billing URL even without tags', () => {
    const ev = scrubSentryEvent({ request: { url: 'https://www.buaze.com/api/billing/x', data: { a: 1 } } }) as Record<string, any>;
    assert.equal(ev.request.data, undefined);
  });

  it('4e. non-billing event keeps frame vars, with sensitive keys redacted', () => {
    const ev = scrubSentryEvent({
      request: { url: 'https://www.buaze.com/api/feedback?x=1', data: { password: 'p', text: 'hello' } },
      exception: {
        values: [
          {
            value: 'boom ABCDEFGHJK1',
            stacktrace: { frames: [{ filename: 'app:///src/lib/feedback.ts', vars: { password: 'p', count: 3 } }] },
          },
        ],
      },
    }) as Record<string, any>;
    assert.equal(isBillingEvent(ev), false);
    assert.deepEqual(ev.exception.values[0].stacktrace.frames[0].vars, { password: '[redacted]', count: 3 });
    assert.deepEqual(ev.request.data, { password: '[redacted]', text: 'hello' });
    assert.equal(ev.exception.values[0].value, 'boom ABCDEFGHJK1', 'customer-key pattern only on billing events');
  });

  it('isBillingEvent: tags, URLs, transactions and frames', () => {
    assert.equal(isBillingEvent({ tags: { billing: 'engine' } }), true);
    assert.equal(isBillingEvent({ tags: { integration: 'paynkolay' } }), true);
    assert.equal(isBillingEvent({ request: { url: 'https://x/api/cron/billing-renewals' } }), true);
    assert.equal(isBillingEvent({ transaction: 'GET /billing/tr/checkout' }), true);
    assert.equal(
      isBillingEvent({ exception: { values: [{ stacktrace: { frames: [{ filename: '/app/src/lib/billing/x.ts' }] } }] } }),
      true,
    );
    assert.equal(isBillingEvent({ request: { url: 'https://x/api/feedback' } }), false);
  });

  it('scrubs transaction spans (URLs in span data and descriptions)', () => {
    const ev = scrubSentryEvent({
      type: 'transaction',
      spans: [{ description: 'GET https://x.test/api/billing/paynkolay/return?REFERENCE_CODE=9', data: { 'http.query': '?REFERENCE_CODE=9', url: 'https://x.test/a?b=c' } }],
    }) as Record<string, any>;
    assert.equal(ev.spans[0].description, 'GET https://x.test/api/billing/paynkolay/return');
    assert.equal(ev.spans[0].data['http.query'], '');
    assert.equal(ev.spans[0].data.url, 'https://x.test/a');
  });
});

describe('scrubSentryLog', () => {
  it('5. redacts the message and attributes', () => {
    const log = scrubSentryLog({
      level: 'info',
      message: '[billing] list failed for ABCDEFGHJK1 card 4111111111111111',
      attributes: { customerKey: 'ABCDEFGHJK1', 'sentry.message.parameter.0': { csToken: 'TOKEN-abc123' }, phase: 'list' },
    }) as Record<string, any>;
    assert.ok(!String(log.message).includes('ABCDEFGHJK1'));
    assert.ok(!String(log.message).includes('4111111111111111'));
    assert.equal(log.attributes.customerKey, '[redacted]');
    assert.deepEqual(log.attributes['sentry.message.parameter.0'], { csToken: '[redacted]' });
    assert.equal(log.attributes.phase, 'list');
  });
});

describe('billingLog', () => {
  let errorMock: ReturnType<typeof mock.method>;
  let infoMock: ReturnType<typeof mock.method>;

  beforeEach(() => {
    errorMock = mock.method(console, 'error', () => {});
    infoMock = mock.method(console, 'info', () => {});
  });
  afterEach(() => {
    errorMock.mock.restore();
    infoMock.mock.restore();
  });

  it('6. emitted args contain no token, key, error message text or URL query', () => {
    const err = Object.assign(new Error('PayNKolay said: token TOKEN-abc123 invalid for ABCDEFGHJK1'), { code: 'card_list_failed' });
    billingLog('error', 'cards.list_failed', {
      userId: 'cluser1',
      phase: 'list',
      err,
      token: 'TOKEN-abc123',
      customerKey: sensitive('ABCDEFGHJK1'),
      returnUrl: 'https://www.buaze.com/api/billing/paynkolay/return?REFERENCE_CODE=R9&TRAN_ID=7',
      email: 'owner@example.com',
      note: 'charged ABCDEFGHJK1',
    });
    assert.equal(errorMock.mock.callCount(), 1);
    const args = errorMock.mock.calls[0].arguments;
    assert.equal(args[0], '[billing] cards.list_failed');
    const json = JSON.stringify(args);
    for (const leaked of ['TOKEN-abc123', 'ABCDEFGHJK1', 'PayNKolay said', 'REFERENCE_CODE=R9', 'TRAN_ID', 'owner@example.com']) {
      assert.ok(!json.includes(leaked), leaked);
    }
    const fields = args[1] as Record<string, unknown>;
    assert.deepEqual(fields.err, { name: 'Error', code: 'card_list_failed' });
    assert.equal(fields.userId, 'cluser1');
    assert.equal(fields.returnUrl, 'https://www.buaze.com/api/billing/paynkolay/return');
  });

  it('info level goes to console.info', () => {
    billingLog('info', 'renewal.tick', { runId: 'r1' });
    assert.equal(infoMock.mock.callCount(), 1);
  });
});

describe('safeError', () => {
  it('keeps name and stack frames, never the original message', () => {
    const original = new TypeError('provider body: {"Token":"TOKEN-abc123"}');
    const wrapped = safeError(original, 'phase_4');
    assert.equal(wrapped.message, 'TypeError:phase_4');
    assert.ok(!String(wrapped.stack).includes('TOKEN-abc123'));
    assert.ok(String(wrapped.stack).includes('    at '));
    assert.equal(safeError('weird', 'bad code with spaces').message, 'Error:unknown');
  });
});
