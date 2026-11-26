// Web Push encryption + VAPID (CLAUDE.md §61): RFC 8291 §5 example, byte for byte.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createECDH, createPublicKey, verify } from 'node:crypto';
import {
  encryptPushPayload,
  isAllowedPushEndpoint,
  validPushKeys,
  vapidAuthorization,
  vapidKeysFrom,
} from '../src/lib/web-push';

const RFC = {
  plaintext: 'When I grow up, I want to be a watermelon',
  asPrivate: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
  uaPublic: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
  salt: 'DGv6ra1nlYgDCS1FRnbzlw',
  auth: 'BTBZMqHH6r4Tts7J_aSIgg',
  body: 'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
};

test('encryptPushPayload matches the RFC 8291 example', () => {
  const out = encryptPushPayload(Buffer.from(RFC.plaintext), RFC.uaPublic, RFC.auth, {
    salt: Buffer.from(RFC.salt, 'base64url'),
    serverPrivateKey: Buffer.from(RFC.asPrivate, 'base64url'),
  });
  assert.equal(out.toString('base64url'), RFC.body);
});

test('push endpoints: only the browser push services, https, no ports', () => {
  assert.equal(isAllowedPushEndpoint('https://fcm.googleapis.com/fcm/send/abc'), true);
  assert.equal(isAllowedPushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/abc'), true);
  assert.equal(isAllowedPushEndpoint('https://web.push.apple.com/QGx'), true);
  assert.equal(isAllowedPushEndpoint('https://wns2-par02p.notify.windows.com/w/?token=x'), true);
  assert.equal(isAllowedPushEndpoint('http://fcm.googleapis.com/fcm/send/abc'), false);
  assert.equal(isAllowedPushEndpoint('https://fcm.googleapis.com:8443/x'), false);
  assert.equal(isAllowedPushEndpoint('https://evil.com/fcm.googleapis.com'), false);
  assert.equal(isAllowedPushEndpoint('https://googleapis.com.evil.com/x'), false);
  assert.equal(isAllowedPushEndpoint('https://169.254.169.254/latest'), false);
  assert.equal(isAllowedPushEndpoint('https://user:pw@fcm.googleapis.com/x'), false);
  assert.equal(isAllowedPushEndpoint('not a url'), false);
});

test('validPushKeys checks point and secret sizes', () => {
  assert.equal(validPushKeys(RFC.uaPublic, RFC.auth), true);
  assert.equal(validPushKeys(RFC.uaPublic.slice(0, 40), RFC.auth), false);
  assert.equal(validPushKeys(RFC.uaPublic, 'short'), false);
  assert.equal(validPushKeys('<script>', RFC.auth), false);
});

test('VAPID keys: derived from JWT_SECRET deterministically, env pair wins', () => {
  const a = vapidKeysFrom({ JWT_SECRET: 'x'.repeat(40) });
  const b = vapidKeysFrom({ JWT_SECRET: 'x'.repeat(40) });
  const c = vapidKeysFrom({ JWT_SECRET: 'y'.repeat(40) });
  assert.ok(a && b && c);
  assert.equal(a.publicKey.toString('hex'), b.publicKey.toString('hex'));
  assert.notEqual(a.publicKey.toString('hex'), c.publicKey.toString('hex'));
  assert.equal(vapidKeysFrom({}), null);

  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  const env = { VAPID_PRIVATE_KEY: ecdh.getPrivateKey().toString('base64url'), VAPID_PUBLIC_KEY: ecdh.getPublicKey().toString('base64url'), JWT_SECRET: 'x'.repeat(40) };
  assert.equal(vapidKeysFrom(env)?.publicKey.toString('hex'), ecdh.getPublicKey().toString('hex'));
  assert.equal(vapidKeysFrom({ ...env, VAPID_PUBLIC_KEY: c.publicKey.toString('base64url') }), null);
});

test('vapidAuthorization: ES256 JWT for the push service origin, verifiable with k', () => {
  const keys = vapidKeysFrom({ JWT_SECRET: 'z'.repeat(40) })!;
  const header = vapidAuthorization('https://fcm.googleapis.com/fcm/send/abc', keys, 'mailto:support@buaze.com', 1_800_000_000_000);
  const m = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(header);
  assert.ok(m);
  const claims = JSON.parse(Buffer.from(m[2], 'base64url').toString());
  assert.equal(claims.aud, 'https://fcm.googleapis.com');
  assert.equal(claims.sub, 'mailto:support@buaze.com');
  assert.equal(claims.exp, 1_800_000_000 + 12 * 3600);
  const pub = Buffer.from(m[4], 'base64url');
  const key = createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: pub.subarray(1, 33).toString('base64url'), y: pub.subarray(33).toString('base64url') }, format: 'jwk' });
  assert.equal(verify('sha256', Buffer.from(`${m[1]}.${m[2]}`), { key, dsaEncoding: 'ieee-p1363' }, Buffer.from(m[3], 'base64url')), true);
});
