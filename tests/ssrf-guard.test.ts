/**
 * SSRF guard tests — IP literal ranges + hostname rules.
 *
 * Literal hosts never hit DNS (the guard short-circuits on `isIP`), so these
 * run offline. Hostname-based DNS resolution is not exercised here.
 *
 * Run: npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  assertPublicHttpUrl,
  isPrivateIPv4,
  isPrivateIPv6,
} from '../src/lib/ssrf-guard';

describe('isPrivateIPv4', () => {
  const blocked = [
    '0.0.0.0',
    '0.1.2.3',
    '10.0.0.1',
    '10.255.255.255',
    '100.64.0.1',
    '100.127.255.254',
    '127.0.0.1',
    '127.10.20.30',
    '169.254.169.254',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '198.18.0.1',
    '198.19.255.255',
    '224.0.0.1',
    '239.255.255.250',
    '240.0.0.1',
    '255.255.255.255',
  ];
  for (const ip of blocked) {
    it(`blocks ${ip}`, () => assert.equal(isPrivateIPv4(ip), true));
  }

  const allowed = ['8.8.8.8', '1.1.1.1', '100.63.255.255', '100.128.0.1', '172.15.255.255', '172.32.0.1', '198.20.0.1', '223.255.255.254'];
  for (const ip of allowed) {
    it(`allows ${ip}`, () => assert.equal(isPrivateIPv4(ip), false));
  }
});

describe('isPrivateIPv6', () => {
  const blocked = [
    '::',
    '::1',
    'fc00::1',
    'fd12:3456::1',
    'fe80::1',
    'febf::1',
    'ff02::1',
    '::ffff:127.0.0.1',
    '::ffff:7f00:1',
    '::ffff:10.0.0.1',
    '::ffff:169.254.169.254',
    '64:ff9b::a9fe:a9fe',
  ];
  for (const ip of blocked) {
    it(`blocks ${ip}`, () => assert.equal(isPrivateIPv6(ip), true));
  }

  const allowed = ['2001:4860:4860::8888', '2606:4700:4700::1111', '::ffff:8.8.8.8'];
  for (const ip of allowed) {
    it(`allows ${ip}`, () => assert.equal(isPrivateIPv6(ip), false));
  }
});

describe('assertPublicHttpUrl (no DNS for literals)', () => {
  it('blocks loopback literal', async () => {
    assert.deepEqual(await assertPublicHttpUrl('http://127.0.0.1:6379/'), {
      ok: false,
      reason: 'private_address',
    });
  });

  it('blocks cloud metadata literal', async () => {
    const r = await assertPublicHttpUrl('http://169.254.169.254/latest/meta-data/');
    assert.equal(r.ok, false);
  });

  it('blocks decimal / hex IPv4 shorthands (URL canonicalises them)', async () => {
    assert.equal((await assertPublicHttpUrl('http://2130706433/')).ok, false);
    assert.equal((await assertPublicHttpUrl('http://0x7f.0.0.1/')).ok, false);
  });

  it('blocks bracketed IPv6 loopback + mapped private v4', async () => {
    assert.equal((await assertPublicHttpUrl('http://[::1]:8080/')).ok, false);
    assert.equal((await assertPublicHttpUrl('http://[::ffff:192.168.0.1]/')).ok, false);
  });

  it('allows public IP literals', async () => {
    assert.deepEqual(await assertPublicHttpUrl('https://8.8.8.8/'), { ok: true });
    assert.deepEqual(await assertPublicHttpUrl('https://[2001:4860:4860::8888]/'), { ok: true });
  });

  it('rejects non-http protocols and junk', async () => {
    assert.deepEqual(await assertPublicHttpUrl('file:///etc/passwd'), {
      ok: false,
      reason: 'wrong_protocol',
    });
    assert.deepEqual(await assertPublicHttpUrl('not a url'), {
      ok: false,
      reason: 'invalid_url',
    });
  });

  it('rejects internal hostnames without resolving', async () => {
    for (const u of [
      'http://localhost/',
      'http://foo.localhost/',
      'http://printer.local/',
      'http://metadata.google.internal/',
      'http://metadata/',
    ]) {
      assert.deepEqual(await assertPublicHttpUrl(u), {
        ok: false,
        reason: 'blocked_hostname',
      }, u);
    }
  });
});
