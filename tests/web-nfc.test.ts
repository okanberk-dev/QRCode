import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nfcErrorMessage, webNfcSupported, writeUrlToTag, NfcError } from '../src/lib/web-nfc';

test('Web NFC is reported unsupported outside a browser', async () => {
  assert.equal(webNfcSupported(), false);
  await assert.rejects(writeUrlToTag('https://www.buaze.com/l/x?source=nfc'), (e: unknown) => e instanceof NfcError && e.code === 'unsupported');
});

test('every NFC error has TR and EN text', () => {
  for (const code of ['unsupported', 'denied', 'aborted', 'write_failed', 'read_failed', 'no_url'] as const) {
    assert.ok(nfcErrorMessage(code, 'tr').length > 5);
    assert.ok(nfcErrorMessage(code, 'en').length > 5);
  }
});
