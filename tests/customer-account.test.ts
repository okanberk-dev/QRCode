import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as auth from '../src/lib/customer-auth';
import * as account from '../src/lib/customer-account';
import { verifyJwt } from '../src/lib/auth';

test('password rule: 8+ chars with a letter and a digit', () => {
  assert.equal(auth.isAcceptablePassword('kisa1'), false);
  assert.equal(auth.isAcceptablePassword('sadeceharf'), false);
  assert.equal(auth.isAcceptablePassword('12345678'), false);
  assert.equal(auth.isAcceptablePassword('şifre2026'), true);
  assert.equal(auth.isAcceptablePassword('x'.repeat(199) + '1'), true);
  assert.equal(auth.isAcceptablePassword('x'.repeat(200) + '1'), false);
});

test('verify and reset tokens cannot stand in for each other or for a session', async () => {
  const verify = await auth.signVerifyToken({ id: 'acc1', email: 'a@b.co' });
  const reset = await auth.signResetToken({ id: 'acc1', tokenVersion: 3 });
  assert.deepEqual(await auth.readVerifyToken(verify), { id: 'acc1', email: 'a@b.co' });
  assert.deepEqual(await auth.readResetToken(reset), { id: 'acc1', v: 3 });
  assert.equal(await auth.readVerifyToken(reset), null);
  assert.equal(await auth.readResetToken(verify), null);
  assert.equal(await auth.readResetToken('garbage'), null);
});

test('customer tokens are not owner tokens', async () => {
  const session = await auth.signCustomerSession({ id: 'acc1', tokenVersion: 0 });
  assert.equal(await verifyJwt(session), null);
});

test('safeNextPath only allows our own customer pages', () => {
  assert.equal(account.safeNextPath('/l/kafe-lale'), '/l/kafe-lale');
  assert.equal(account.safeNextPath('/l/kafe-lale?source=nfc'), '/l/kafe-lale?source=nfc');
  assert.equal(account.safeNextPath('/l/kafe/k/AbCdEfGhIjKlMnOpQrStUvWx12'), '/l/kafe/k/AbCdEfGhIjKlMnOpQrStUvWx12');
  assert.equal(account.safeNextPath('/hesap'), '/hesap');
  assert.equal(account.safeNextPath('https://evil.com'), '/hesap');
  assert.equal(account.safeNextPath('//evil.com'), '/hesap');
  assert.equal(account.safeNextPath('/tr/dashboard'), '/hesap');
  assert.equal(account.safeNextPath(undefined), '/hesap');
});

test('cleanName collapses spaces and caps length', () => {
  assert.equal(account.cleanName('  Ayşe   Nur '), 'Ayşe Nur');
  assert.equal(account.cleanName(''), null);
  assert.equal(account.cleanName(5), null);
  assert.equal(account.cleanName('a'.repeat(60))?.length, 40);
});
