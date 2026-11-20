/**
 * PayNKolay card storage wire layer (src/lib/payment/paynkolay-cards.ts,
 * src/lib/payment/paynkolay-transport.ts — billing spec §7, §15.2).
 *
 * Hashes are checked against hand-computed SHA-512 values; list/delete run
 * end to end over real HTTP against the local fake server on 127.0.0.1,
 * which verifies every hash. Nothing here reaches PayNKolay.
 */

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import { sensitive } from '../src/lib/billing/sensitive';
import { formatPaynkolayRnd } from '../src/lib/payment/paynkolay';
import {
  cardDeleteRequest,
  cardIdentity,
  cardListRequest,
  CUSTOMER_KEY_RE,
  deleteSavedCard,
  generateCustomerKey,
  HTML_200_MEANS_3D,
  last4FromMasked,
  listSavedCards,
  parseCardDelete,
  parseCardList,
  parseDirectCharge,
  parseExpDate,
  savedCardChargeRequest,
  type ProviderCard,
} from '../src/lib/payment/paynkolay-cards';
import {
  createFetchTransport,
  fetchTransport,
  PaynkolayHttpError,
  PaynkolayTransportError,
} from '../src/lib/payment/paynkolay-transport';
import { cardListBody, fakeTransport, htmlReply, jsonReply, testConfig } from './fixtures/paynkolay-fakes';
import { startFakePaynkolayServer, type FakePaynkolayServer } from './fixtures/fake-paynkolay-server';

const sha512 = (s: string) => createHash('sha512').update(s, 'utf8').digest('base64');
const CK = sensitive('ABCDEFGHJK1');
const cfg = testConfig();

describe('request builders and hashes', () => {
  it('2. card list hash = sha512("SX|ABCDEFGHJK1|SECRET")', () => {
    const req = cardListRequest(cfg, CK);
    assert.equal(req.url, 'https://pos.test/Vpos/Payment/CardStorageCardList');
    assert.deepEqual(Object.keys(req.form).sort(), ['customerKey', 'hashDatav2', 'sx']);
    assert.equal(req.form.hashDatav2, sha512('SX|ABCDEFGHJK1|SECRET'));
  });

  it('3. card delete hash keeps the empty tranId slot: sha512("SX|ABCDEFGHJK1||TOKEN|SECRET")', () => {
    const req = cardDeleteRequest(cfg, CK, sensitive('TOKEN'));
    assert.equal(req.url, 'https://pos.test/Vpos/Payment/CardStorageCardDelete');
    assert.equal(req.form.tranId, '');
    assert.equal(req.form.token, 'TOKEN');
    assert.equal(req.form.hashDatav2, sha512('SX|ABCDEFGHJK1||TOKEN|SECRET'));
    const withTran = cardDeleteRequest(cfg, CK, sensitive('TOKEN'), sensitive('T9'));
    assert.equal(withTran.form.hashDatav2, sha512('SX|ABCDEFGHJK1|T9|TOKEN|SECRET'));
  });

  it('rejects a malformed customer key (12 characters or lower case)', () => {
    assert.throws(() => cardListRequest(cfg, sensitive('ABCDEFGHJK12')));
    assert.throws(() => cardListRequest(cfg, sensitive('abcdefghjk1')));
    assert.throws(() => cardDeleteRequest(cfg, CK, sensitive('')));
  });

  it('4. saved-card charge via the MIT terminal: MIT sx + MIT secret, non-3D API form, no card data', () => {
    const now = new Date(Date.UTC(2026, 0, 1, 9, 0, 0));
    const mitCfg = testConfig({ mit: { sx: 'MITSX', secret: 'MITSECRET' } });
    const req = savedCardChargeRequest(
      mitCfg,
      {
        clientRefCode: 'ref',
        amountMinor: 99_900,
        successUrl: 's',
        failUrl: 'f',
        customerKey: CK,
        token: sensitive('TOKEN'),
        cardHolderIp: '203.0.113.10',
        use3D: false,
      },
      now,
    );
    const rnd = formatPaynkolayRnd(now);
    assert.equal(req.url, 'https://pos.test/Vpos/v1/Payment');
    assert.equal(req.form.sx, 'MITSX');
    assert.equal(req.form.hashDatav2, sha512(`MITSX|ref|999.00|s|f|${rnd}|ABCDEFGHJK1|MITSECRET`));
    assert.equal(req.form.use3D, 'false');
    assert.equal(req.form.environment, 'API');
    assert.equal(req.form.currencyNumber, '949');
    assert.equal(req.form.transactionType, 'SALES');
    assert.equal(req.form.csToken, 'TOKEN');
    assert.equal(req.form.csCustomerKey, 'ABCDEFGHJK1');
    assert.equal(req.form.cardHolderIP, '203.0.113.10');
    for (const forbidden of ['cardNumber', 'cvv', 'month', 'year', 'cardHolderName']) {
      assert.ok(!(forbidden in req.form), forbidden);
    }
  });

  it('saved-card charge refuses the hosted sx unless 3D enforcement is confirmed, and bad inputs', () => {
    const input = {
      clientRefCode: 'ref',
      amountMinor: 100,
      successUrl: 's',
      failUrl: 'f',
      customerKey: CK,
      token: sensitive('TOKEN'),
      cardHolderIp: '203.0.113.10',
      use3D: false as const,
    };
    const now = new Date();
    assert.throws(() => savedCardChargeRequest(cfg, input, now), /no merchant-initiated terminal/);
    const hosted = savedCardChargeRequest(testConfig({ hosted3dEnforced: true }), input, now);
    assert.equal(hosted.form.sx, 'SX');
    const mitCfg = testConfig({ mit: { sx: 'MITSX', secret: 'MITSECRET' } });
    assert.throws(() => savedCardChargeRequest(mitCfg, { ...input, cardHolderIp: '2001:db8::1' }, now));
    assert.throws(() => savedCardChargeRequest(mitCfg, { ...input, clientRefCode: 'şık' }, now));
  });
});

describe('parseCardList', () => {
  const row = {
    Token: 'TOK-1',
    TranId: 'TR-1',
    Maskedpan: '545616******5454',
    CARDISSUER: 'Test Bank',
    CARDBRAND: 'mastercard',
    CARD_ALIACE: 'Buaze-7K2Q9X',
    CARDTYPE: 'CREDIT',
    EXP_DATE: '0828',
  };

  it('5. accepts Detail array, Detail object, Card array and a result string wrapper', () => {
    for (const shape of ['detail-array', 'detail-object', 'card-array', 'string-wrapper'] as const) {
      const list = parseCardList(cardListBody([row], shape));
      assert.equal(list.kind, 'cards', shape);
      if (list.kind !== 'cards') continue;
      assert.equal(list.cards.length, 1, shape);
      const card = list.cards[0];
      assert.equal(card.token.reveal(), 'TOK-1');
      assert.equal(card.tranId?.reveal(), 'TR-1');
      assert.equal(card.last4, '5454');
      assert.equal(card.brand, 'MASTERCARD');
      assert.equal(card.cardType, 'credit');
      assert.equal(card.alias, 'Buaze-7K2Q9X');
      assert.deepEqual([card.expMonth, card.expYear], [8, 2028]);
    }
    const two = parseCardList(cardListBody([row, { ...row, Token: 'TOK-2' }], 'card-array'));
    assert.equal(two.kind === 'cards' ? two.cards.length : 0, 2);
  });

  it('5. "02 Gecerli Kart Yok" → empty', () => {
    assert.deepEqual(parseCardList({ ProcReturnCode: '02', ErrMsg: 'Gecerli Kart Yok' }), { kind: 'empty' });
    assert.deepEqual(parseCardList({ ProcReturnCode: '05', ErrMsg: 'Geçerli kart yok' }), { kind: 'empty' });
  });

  it('5. any other code throws card_list_failed:<code> without body text', () => {
    try {
      parseCardList({ ProcReturnCode: '99', ErrMsg: 'hata', Token: 'SECRET-TOKEN-1', Data: { cards: { Card: { CardFileds: { Detail: row } } } } });
      assert.fail('should throw');
    } catch (err) {
      const message = (err as Error).message;
      assert.equal(message, 'card_list_failed:99');
      assert.ok(!message.includes('SECRET-TOKEN-1'));
    }
    assert.throws(() => parseCardList('<html>'), /card_list_failed:unparsable/);
    assert.throws(() => parseCardList({ ProcReturnCode: 'X'.repeat(40) }), /card_list_failed:unknown/);
  });

  it('5. rows without Token are skipped; only last4 survives the masked PAN; 12+ digit issuer dropped', () => {
    const list = parseCardList(
      cardListBody([{ ...row, Token: '' }, { ...row, Token: 'TOK-3', CARDISSUER: 'Bank 4111111111111111', Maskedpan: '4111111111111111' }]),
    );
    assert.equal(list.kind, 'cards');
    if (list.kind !== 'cards') return;
    assert.equal(list.cards.length, 1);
    assert.equal(list.cards[0].issuer, null);
    assert.equal(list.cards[0].last4, '1111');
    assert.ok(!JSON.stringify(list).includes('4111111111111111'));
    assert.ok(!JSON.stringify(list).includes('TOK-3'));
    assert.equal(last4FromMasked('545616******5454'), '5454');
    assert.equal(last4FromMasked('****'), null);
    assert.equal(last4FromMasked(null), null);
  });

  it('parseCardDelete is advisory', () => {
    assert.deepEqual(parseCardDelete({ ProcReturnCode: '00' }), { providerAccepted: true, code: '00' });
    assert.deepEqual(parseCardDelete({ ProcReturnCode: '99', ErrMsg: 'x' }), { providerAccepted: false, code: '99' });
    assert.deepEqual(parseCardDelete('garbage'), { providerAccepted: false, code: 'unparsable' });
  });
});

describe('parseExpDate', () => {
  it('6. MMYY, MM/YY, MM/YYYY, YYYYMM, YYMM; invalid → null', () => {
    assert.deepEqual(parseExpDate('0828'), { month: 8, year: 2028 });
    assert.deepEqual(parseExpDate('08/28'), { month: 8, year: 2028 });
    assert.deepEqual(parseExpDate('8/2028'), { month: 8, year: 2028 });
    assert.deepEqual(parseExpDate('202808'), { month: 8, year: 2028 });
    assert.deepEqual(parseExpDate('2808'), { month: 8, year: 2028 });
    for (const bad of ['', '13/28', '0028', 'abcd', '12345', '00/2030', null, undefined]) {
      assert.equal(parseExpDate(bad as string | null | undefined), null, String(bad));
    }
  });
});

describe('parseDirectCharge', () => {
  const json = (body: unknown, status = 200) => ({ status, contentType: 'application/json', text: JSON.stringify(body) });

  it('7. JSON outcomes', () => {
    assert.deepEqual(parseDirectCharge(json({ RESPONSE_CODE: 2, REFERENCE_CODE: 'R1' })), {
      kind: 'approved_claimed',
      referenceCode: 'R1',
    });
    const declined = parseDirectCharge(json({ RESPONSE_CODE: 0, ERROR_CODE: '51', ERROR_MESSAGE: 'Yetersiz bakiye 4111111111111111 ref 123456789' }));
    assert.equal(declined.kind, 'declined');
    if (declined.kind === 'declined') {
      assert.equal(declined.errorCode, '51');
      assert.ok(declined.safeMessage && declined.safeMessage.length <= 80);
      assert.ok(!/[0-9]{6,}/.test(declined.safeMessage ?? ''));
    }
    assert.deepEqual(parseDirectCharge(json({ BANK_REQUEST_MESSAGE: '<form></form>' })), { kind: 'three_d_required' });
    assert.deepEqual(parseDirectCharge(json({ USE_3D: 'true' })), { kind: 'three_d_required' });
    assert.deepEqual(parseDirectCharge(json({ result: JSON.stringify({ RESPONSE_CODE: '2' }) })), {
      kind: 'approved_claimed',
      referenceCode: null,
    });
  });

  it('7. nothing non-JSON is ever a decline', () => {
    assert.equal(HTML_200_MEANS_3D, false);
    assert.deepEqual(parseDirectCharge({ status: 200, contentType: 'text/html', text: '<html>3D</html>' }), { kind: 'unknown', why: 'html' });
    assert.deepEqual(parseDirectCharge({ status: 200, contentType: '', text: '  <!doctype html>' }), { kind: 'unknown', why: 'html' });
    assert.deepEqual(parseDirectCharge({ status: 502, contentType: 'text/html', text: '<html>Bad gateway</html>' }), {
      kind: 'unknown',
      why: 'http_status',
    });
    assert.deepEqual(parseDirectCharge(json({ ERROR_CODE: '51' }, 500)), { kind: 'unknown', why: 'http_status' });
    assert.deepEqual(parseDirectCharge({ status: 200, contentType: 'application/json', text: '' }), { kind: 'unknown', why: 'empty' });
    assert.deepEqual(parseDirectCharge(null), { kind: 'unknown', why: 'empty' });
    assert.deepEqual(parseDirectCharge({ status: 200, contentType: 'application/json', text: '{not json' }), {
      kind: 'unknown',
      why: 'unparsable',
    });
    assert.deepEqual(parseDirectCharge(json({ RESPONSE_CODE: 0 })), { kind: 'unknown', why: 'unparsable' });
  });
});

describe('generateCustomerKey', () => {
  it('8. matches [A-Z0-9]{11}, 1000 samples are unique, an injected randomIndex is used', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const key = generateCustomerKey().reveal();
      assert.match(key, CUSTOMER_KEY_RE);
      seen.add(key);
    }
    assert.equal(seen.size, 1000);
    assert.equal(generateCustomerKey(() => 0).reveal(), 'AAAAAAAAAAA');
    assert.equal(generateCustomerKey(() => 35).reveal(), '99999999999');
    assert.throws(() => generateCustomerKey(() => 36));
    assert.equal(String(generateCustomerKey()), '[redacted]');
  });
});

describe('fake transport and thin calls', () => {
  it('listSavedCards / deleteSavedCard send the built forms; HTTP errors carry no body', async () => {
    const { transport, calls } = fakeTransport({
      CardStorageCardList: () => jsonReply(cardListBody([{ Token: 'TOK-1', Maskedpan: '545616******5454' }])),
      CardStorageCardDelete: () => jsonReply({ ProcReturnCode: '00' }),
    });
    const list = await listSavedCards(cfg, transport, CK);
    assert.equal(list.kind, 'cards');
    assert.deepEqual(calls[0].form, cardListRequest(cfg, CK).form);
    const del = await deleteSavedCard(cfg, transport, CK, sensitive('TOK-1'));
    assert.deepEqual(del, { providerAccepted: true, code: '00' });
    assert.equal(calls[1].form.hashDatav2, sha512('SX|ABCDEFGHJK1||TOK-1|SECRET'));

    const failing = fakeTransport({ CardStorageCardList: () => htmlReply(502) });
    await assert.rejects(listSavedCards(cfg, failing.transport, CK), (err: unknown) => {
      assert.ok(err instanceof PaynkolayHttpError);
      assert.equal((err as Error).message, 'paynkolay_http_502');
      return true;
    });
    const garbled = fakeTransport({ CardStorageCardList: () => ({ status: 200, text: 'Token=SECRET-TOK not json' }) });
    await assert.rejects(listSavedCards(cfg, garbled.transport, CK), (err: unknown) => {
      assert.equal((err as Error).message, 'card_list_failed:unparsable');
      return true;
    });
    const timeout = fakeTransport({ CardStorageCardList: () => ({ timeout: true }) });
    await assert.rejects(listSavedCards(cfg, timeout.transport, CK), PaynkolayTransportError);
  });

  it('the production transport refuses every origin but the allow-listed PayNKolay host', async () => {
    const original = { env: process.env.PAYNKOLAY_ENV, base: process.env.PAYNKOLAY_BASE_URL };
    delete process.env.PAYNKOLAY_ENV;
    delete process.env.PAYNKOLAY_BASE_URL;
    try {
      await assert.rejects(
        fetchTransport.postForm('https://paynkolay.nkolayislem.com.tr/Vpos/Payment/CardStorageCardList', {}),
        (err: unknown) => err instanceof PaynkolayTransportError && err.code === 'origin_not_allowed',
      );
      process.env.PAYNKOLAY_ENV = 'test';
      await assert.rejects(
        fetchTransport.postForm('https://paynkolay.nkolayislem.com.tr/Vpos/Payment/CardStorageCardList', {}),
        (err: unknown) => err instanceof PaynkolayTransportError && err.code === 'origin_not_allowed',
      );
      await assert.rejects(
        fetchTransport.postForm('https://evil.example/Vpos/Payment/CardStorageCardList', {}),
        (err: unknown) => err instanceof PaynkolayTransportError && err.code === 'origin_not_allowed',
      );
      await assert.rejects(
        fetchTransport.postForm('https://user:pw@paynkolaytest.nkolayislem.com.tr/x', {}),
        (err: unknown) => err instanceof PaynkolayTransportError && err.code === 'origin_not_allowed',
      );
    } finally {
      if (original.env === undefined) delete process.env.PAYNKOLAY_ENV;
      else process.env.PAYNKOLAY_ENV = original.env;
      if (original.base === undefined) delete process.env.PAYNKOLAY_BASE_URL;
      else process.env.PAYNKOLAY_BASE_URL = original.base;
    }
  });
});

describe('end to end against the local fake PayNKolay server (127.0.0.1)', () => {
  let server: FakePaynkolayServer;
  const hosted = { sx: `SX-${Math.random().toString(36).slice(2)}`, secret: `S-${Math.random().toString(36).slice(2)}` };
  const mit = { sx: `MSX-${Math.random().toString(36).slice(2)}`, secret: `MS-${Math.random().toString(36).slice(2)}` };
  let serverCfg: ReturnType<typeof testConfig>;
  let transport: ReturnType<typeof createFetchTransport>;

  before(async () => {
    server = await startFakePaynkolayServer({ hosted, mit, sxList: 'SXL-fake', timeoutHoldMs: 600 });
    serverCfg = testConfig({ baseUrl: server.url, sx: hosted.sx, merchantSecretKey: hosted.secret, sxList: 'SXL-fake', mit });
    transport = createFetchTransport({ allowedOrigins: () => [server.url] });
  });
  after(async () => {
    await server.close();
  });

  it('lists, deletes and re-lists with hashes verified by the server', async () => {
    const ck = generateCustomerKey();
    assert.deepEqual(await listSavedCards(serverCfg, transport, ck), { kind: 'empty' });
    server.seedCard(ck.reveal(), { alias: 'Buaze-AB12CD', maskedPan: '454360******1234', expDate: '1129' });
    const list = await listSavedCards(serverCfg, transport, ck);
    assert.equal(list.kind, 'cards');
    if (list.kind !== 'cards') return;
    assert.equal(list.cards[0].last4, '1234');
    assert.deepEqual([list.cards[0].expMonth, list.cards[0].expYear], [11, 2029]);
    const del = await deleteSavedCard(serverCfg, transport, ck, list.cards[0].token);
    assert.equal(del.providerAccepted, true);
    assert.deepEqual(await listSavedCards(serverCfg, transport, ck), { kind: 'empty' });
    assert.ok(server.requests.every((r) => r.form.sx === hosted.sx));
  });

  it('a wrong secret is rejected (hashData error) and the error carries no body text', async () => {
    const ck = generateCustomerKey();
    server.seedCard(ck.reveal());
    await assert.rejects(listSavedCards({ ...serverCfg, merchantSecretKey: 'WRONG' }, transport, ck), (err: unknown) => {
      const message = (err as Error).message;
      assert.equal(message, 'card_list_failed:99');
      assert.ok(!message.includes('hashData'));
      return true;
    });
  });

  it('9. card identity: deterministic for a stable fake; with unstable tokens only "token" changes', async () => {
    const ck = generateCustomerKey();
    server.seedCard(ck.reveal(), { alias: 'Buaze-QQ11ZZ' });
    const ids = async (stable: boolean) => {
      server.setTokenStable(stable);
      const list = await listSavedCards(serverCfg, transport, ck);
      assert.equal(list.kind, 'cards');
      const card = (list as { cards: ProviderCard[] }).cards[0];
      return {
        token: cardIdentity(card, 'token').reveal(),
        composite: cardIdentity(card, 'composite').reveal(),
        attributes: cardIdentity(card, 'attributes').reveal(),
        default: cardIdentity(card).reveal(),
      };
    };
    try {
      const a = await ids(true);
      const b = await ids(true);
      assert.deepEqual(a, b);
      assert.equal(a.default, a.composite, "default strategy is 'composite'");
      const c = await ids(false);
      const d = await ids(false);
      assert.notEqual(c.token, d.token);
      assert.equal(c.composite, d.composite);
      assert.equal(c.attributes, d.attributes);
      assert.equal(c.composite, a.composite);
    } finally {
      server.setTokenStable(true);
    }
  });

  it('the server accepts the MIT charge form built by savedCardChargeRequest (hash verified)', async () => {
    const ck = generateCustomerKey();
    server.seedCard(ck.reveal());
    const list = await listSavedCards(serverCfg, transport, ck);
    const card = (list as { cards: ProviderCard[] }).cards[0];
    const req = savedCardChargeRequest(
      serverCfg,
      {
        clientRefCode: 'clpaytest0000000000000001',
        amountMinor: 49_900,
        successUrl: 'https://www.buaze.com/api/billing/paynkolay/return',
        failUrl: 'https://www.buaze.com/api/billing/paynkolay/return',
        customerKey: ck,
        token: card.token,
        cardHolderIp: '203.0.113.10',
        use3D: false,
      },
      new Date(),
    );
    assert.deepEqual(parseDirectCharge(await transport.postForm(req.url, req.form)).kind, 'approved_claimed');
    server.setMode('html_500');
    assert.deepEqual(parseDirectCharge(await transport.postForm(req.url, req.form)), { kind: 'unknown', why: 'http_status' });
    server.setMode('decline:54');
    const declined = parseDirectCharge(await transport.postForm(req.url, req.form));
    assert.equal(declined.kind === 'declined' ? declined.errorCode : null, '54');
    server.setMode('timeout');
    await assert.rejects(
      transport.postForm(req.url, req.form, { timeoutMs: 100 }),
      (err: unknown) => err instanceof PaynkolayTransportError && err.code === 'timeout',
    );
    server.setMode('approve');
    const tampered = { ...req.form, amount: '1.00' };
    const res = await transport.postForm(req.url, tampered);
    assert.equal(parseDirectCharge(res).kind, 'unknown', 'a hash error is never read as a decline');
  });
});
