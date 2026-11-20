/**
 * A local fake of the PayNKolay server-to-server endpoints (billing spec
 * §15.1), bound to 127.0.0.1 on a random port. No dependency, no network
 * beyond loopback. It verifies EVERY hash with the fake secret(s) it was
 * started with, so a request builder with a wrong formula or the wrong
 * secret is rejected exactly like the real service ("hashData error").
 *
 * Endpoints: /Vpos/Payment/CardStorageCardList, /Vpos/Payment/CardStorageCardDelete,
 * /Vpos/v1/Payment, /Vpos/Payment/PaymentList.
 */

import { createHash, randomBytes } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface FakeTerminal {
  sx: string;
  secret: string;
}

export interface FakeServerOptions {
  hosted: FakeTerminal;
  sxList: string;
  mit?: FakeTerminal | null;
  /** How long the 'timeout' mode holds a charge before answering. */
  timeoutHoldMs?: number;
}

export interface FakeCard {
  token: string;
  tranId: string;
  maskedPan: string;
  brand: string;
  issuer: string;
  alias: string;
  cardType: string;
  expDate: string;
}

export type FakeMode =
  | 'approve'
  | 'decline:51'
  | 'decline:54'
  | 'three_d'
  | 'timeout'
  | 'html_500'
  | 'html_200'
  | 'pending_status';

export interface FakeTransaction {
  clientRefCode: string;
  referenceCode: string;
  amount: string;
  status: string;
}

export interface FakePaynkolayServer {
  url: string;
  requests: { path: string; form: Record<string, string> }[];
  transactions: FakeTransaction[];
  seedCard(customerKey: string, card?: Partial<FakeCard>): FakeCard;
  cards(customerKey: string): FakeCard[];
  setMode(mode: FakeMode): void;
  setTokenStable(stable: boolean): void;
  duplicateSuccess(clientRefCode: string): void;
  close(): Promise<void>;
}

function hash(parts: string[], secret: string): string {
  return createHash('sha512').update([...parts, secret].join('|'), 'utf8').digest('base64');
}

function rand(n: number): string {
  return randomBytes(n).toString('hex').toUpperCase();
}

async function readForm(req: IncomingMessage): Promise<Record<string, string>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const contentType = req.headers['content-type'] ?? '';
  const data = await new Response(Buffer.concat(chunks), { headers: { 'content-type': contentType } }).formData();
  const out: Record<string, string> = {};
  data.forEach((value, key) => {
    out[key] = typeof value === 'string' ? value : '';
  });
  return out;
}

function sendJson(res: ServerResponse, body: unknown, status = 200): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function sendHtml(res: ServerResponse, status: number): void {
  res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' });
  res.end('<!doctype html><html><body>Sunucu hatası</body></html>');
}

const HASH_ERROR = { ProcReturnCode: '99', ErrMsg: 'API : hashData error', RESPONSE_DATA: 'API : hashData error' };

export async function startFakePaynkolayServer(options: FakeServerOptions): Promise<FakePaynkolayServer> {
  const customers = new Map<string, FakeCard[]>();
  const issuedTokens = new Map<string, FakeCard>(); // every token ever listed → card
  const requests: { path: string; form: Record<string, string> }[] = [];
  const transactions: FakeTransaction[] = [];
  let mode: FakeMode = 'approve';
  let tokenStable = true;

  function terminalFor(sx: string): FakeTerminal | null {
    if (sx === options.hosted.sx) return options.hosted;
    if (options.mit && sx === options.mit.sx) return options.mit;
    return null;
  }

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const path = new URL(req.url ?? '/', 'http://127.0.0.1').pathname;
    if (req.method !== 'POST') return sendHtml(res, 405);
    const form = await readForm(req);
    requests.push({ path, form });

    if (path === '/Vpos/Payment/CardStorageCardList') {
      if (form.sx !== options.hosted.sx || form.hashDatav2 !== hash([form.sx, form.customerKey], options.hosted.secret)) {
        return sendJson(res, HASH_ERROR);
      }
      const cards = customers.get(form.customerKey) ?? [];
      if (cards.length === 0) return sendJson(res, { ProcReturnCode: '02', ErrMsg: 'Gecerli Kart Yok' });
      const detail = cards.map((card) => {
        const token = tokenStable ? card.token : rand(16);
        issuedTokens.set(token, card);
        return {
          Token: token,
          TranId: card.tranId,
          Maskedpan: card.maskedPan,
          CARDISSUER: card.issuer,
          CARDBRAND: card.brand,
          CARD_ALIACE: card.alias,
          CARDTYPE: card.cardType,
          EXP_DATE: card.expDate,
        };
      });
      return sendJson(res, { ProcReturnCode: '00', Data: { cards: { Card: { CardFileds: { Detail: detail } } } } });
    }

    if (path === '/Vpos/Payment/CardStorageCardDelete') {
      const expected = hash([form.sx, form.customerKey, form.tranId ?? '', form.token], options.hosted.secret);
      if (form.sx !== options.hosted.sx || form.hashDatav2 !== expected) return sendJson(res, HASH_ERROR);
      const cards = customers.get(form.customerKey) ?? [];
      const target = issuedTokens.get(form.token);
      const index = target ? cards.indexOf(target) : -1;
      if (index < 0) return sendJson(res, { ProcReturnCode: '99', ErrMsg: 'Kart bulunamadi' });
      cards.splice(index, 1);
      return sendJson(res, { ProcReturnCode: '00', ErrMsg: '' });
    }

    if (path === '/Vpos/v1/Payment') {
      const terminal = terminalFor(form.sx);
      const parts = [form.sx, form.clientRefCode, form.amount, form.successUrl, form.failUrl, form.rnd, form.csCustomerKey];
      if (!terminal || form.hashDatav2 !== hash(parts, terminal.secret)) return sendJson(res, HASH_ERROR);
      const owns = (customers.get(form.csCustomerKey) ?? []).includes(issuedTokens.get(form.csToken) as FakeCard);
      if (!owns) return sendJson(res, { RESPONSE_CODE: 0, ERROR_CODE: 'CS404', ERROR_MESSAGE: 'Kart bulunamadi' });
      const referenceCode = `R${rand(8)}`;
      const record = (status: string) =>
        transactions.push({ clientRefCode: form.clientRefCode, referenceCode, amount: form.amount, status });
      switch (mode) {
        case 'approve':
          record('SUCCESS');
          return sendJson(res, { RESPONSE_CODE: 2, RESPONSE_DATA: 'Islem basarili', REFERENCE_CODE: referenceCode });
        case 'decline:51':
        case 'decline:54': {
          record('FAILED');
          const code = mode.slice('decline:'.length);
          return sendJson(res, { RESPONSE_CODE: 0, ERROR_CODE: code, ERROR_MESSAGE: 'Islem reddedildi' });
        }
        case 'three_d':
          return sendJson(res, { USE_3D: 'true', BANK_REQUEST_MESSAGE: '<form action="https://acs.example"></form>' });
        case 'timeout':
          record('SUCCESS');
          await new Promise((r) => setTimeout(r, options.timeoutHoldMs ?? 1_500));
          return sendJson(res, { RESPONSE_CODE: 2, REFERENCE_CODE: referenceCode });
        case 'html_500':
          return sendHtml(res, 500);
        case 'html_200':
          return sendHtml(res, 200);
        case 'pending_status':
          record('PENDING');
          return sendJson(res, { RESPONSE_CODE: 2, REFERENCE_CODE: referenceCode });
      }
    }

    if (path === '/Vpos/Payment/PaymentList') {
      const parts = [form.sx, form.startDate, form.endDate, form.clientRefCode ?? ''];
      if (form.sx !== options.sxList || form.hashDatav2 !== hash(parts, options.hosted.secret)) {
        return sendJson(res, { result: JSON.stringify({ RESPONSE_DATA: 'API : hashData error' }) });
      }
      const rows = transactions
        .filter((t) => t.clientRefCode === form.clientRefCode)
        .map((t) => ({
          CLIENT_REFERENCE_CODE: t.clientRefCode,
          REFERENCE_CODE: t.referenceCode,
          STATUS: t.status,
          TRANSACTION_TYPE: 'SALES',
          AUTHORIZATION_AMOUNT: t.amount,
          CURRENCY_CODE: '949',
          INSTALLMENT: '1',
        }));
      return sendJson(res, rows.length ? { result: { LIST: rows } } : { result: { LIST: null, ERROR_CODE: 'CORE0305' } });
    }

    return sendHtml(res, 404);
  }

  const server = createServer((req, res) => {
    handle(req, res).catch(() => {
      if (!res.headersSent) sendHtml(res, 500);
      else res.end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    transactions,
    seedCard(customerKey, card = {}) {
      const full: FakeCard = {
        token: card.token ?? rand(16),
        tranId: card.tranId ?? rand(6),
        maskedPan: card.maskedPan ?? '545616******5454',
        brand: card.brand ?? 'MASTERCARD',
        issuer: card.issuer ?? 'Test Bank',
        alias: card.alias ?? `Buaze-${rand(3)}`,
        cardType: card.cardType ?? 'CREDIT',
        expDate: card.expDate ?? '0828',
      };
      const list = customers.get(customerKey) ?? [];
      list.push(full);
      customers.set(customerKey, list);
      issuedTokens.set(full.token, full);
      return full;
    },
    cards(customerKey) {
      return [...(customers.get(customerKey) ?? [])];
    },
    setMode(next) {
      mode = next;
    },
    setTokenStable(stable) {
      tokenStable = stable;
    },
    duplicateSuccess(clientRefCode) {
      const first = transactions.find((t) => t.clientRefCode === clientRefCode && t.status === 'SUCCESS');
      if (first) transactions.push({ ...first, referenceCode: `R${rand(8)}` });
    },
    close() {
      return new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      });
    },
  };
}
