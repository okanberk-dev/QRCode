/**
 * Trusted client IP (src/lib/client-ip.ts, billing spec §5.4) and the
 * constant-time cron auth helper (src/lib/cron-auth.ts).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_TRUSTED_PROXIES, getTrustedClientIp, parseCidrs } from '../src/lib/client-ip';
import { isCronAuthorized } from '../src/lib/cron-auth';

const trusted = parseCidrs(DEFAULT_TRUSTED_PROXIES);

function h(values: Record<string, string>): Headers {
  return new Headers(values);
}

describe('getTrustedClientIp', () => {
  it('1. takes the rightmost non-trusted X-Forwarded-For entry', () => {
    assert.equal(getTrustedClientIp(h({ 'x-forwarded-for': '1.2.3.4, 10.0.0.5' }), trusted), '1.2.3.4');
    // A client-supplied left entry is ignored when Traefik appended the real peer.
    assert.equal(getTrustedClientIp(h({ 'x-forwarded-for': '9.9.9.9, 1.2.3.4' }), trusted), '1.2.3.4');
    assert.equal(getTrustedClientIp(h({ 'x-forwarded-for': '9.9.9.9, 1.2.3.4, 172.18.0.2, 127.0.0.1' }), trusted), '1.2.3.4');
    assert.equal(getTrustedClientIp(h({ 'x-forwarded-for': '2001:db8::1, ::1' }), trusted), '2001:db8::1');
  });

  it('2. only trusted addresses → x-real-ip when valid and not trusted, else null; garbage is skipped', () => {
    assert.equal(getTrustedClientIp(h({ 'x-forwarded-for': '10.0.0.5, 192.168.1.1', 'x-real-ip': '5.6.7.8' }), trusted), '5.6.7.8');
    assert.equal(getTrustedClientIp(h({ 'x-forwarded-for': '10.0.0.5', 'x-real-ip': '10.0.0.9' }), trusted), null);
    assert.equal(getTrustedClientIp(h({ 'x-forwarded-for': '10.0.0.5', 'x-real-ip': 'not-an-ip' }), trusted), null);
    assert.equal(getTrustedClientIp(h({ 'x-forwarded-for': '1.2.3.4, garbage, <script>' }), trusted), '1.2.3.4');
    assert.equal(getTrustedClientIp(h({ 'x-forwarded-for': '999.1.1.1' }), trusted), null);
    assert.equal(getTrustedClientIp(h({}), trusted), null);
  });

  it('treats IPv4-mapped IPv6, ports and brackets correctly', () => {
    assert.equal(getTrustedClientIp(h({ 'x-forwarded-for': '1.2.3.4, ::ffff:10.0.0.1' }), trusted), '1.2.3.4');
    assert.equal(getTrustedClientIp(h({ 'x-forwarded-for': '1.2.3.4:5678' }), trusted), '1.2.3.4');
    assert.equal(getTrustedClientIp(h({ 'x-forwarded-for': '[2001:db8::2]:443' }), trusted), '2001:db8::2');
    assert.equal(getTrustedClientIp(h({ 'x-forwarded-for': 'fd00::1' }), trusted), null, 'fc00::/7 is trusted');
  });

  it('parseCidrs honours prefixes and ignores invalid entries', () => {
    const list = parseCidrs('203.0.113.0/24, bogus, 2001:db8::/32, 1.2.3.4/40');
    assert.equal(list.length, 2);
    assert.equal(getTrustedClientIp(h({ 'x-forwarded-for': '8.8.8.8, 203.0.113.77' }), list), '8.8.8.8');
    assert.equal(getTrustedClientIp(h({ 'x-forwarded-for': '8.8.8.8, 2001:db8:ffff::1' }), list), '8.8.8.8');
    assert.equal(getTrustedClientIp(h({ 'x-forwarded-for': '8.8.8.8, 203.0.114.1' }), list), '203.0.114.1');
  });
});

describe('isCronAuthorized', () => {
  it('accepts exactly "Bearer <secret>" and fails closed without a secret', () => {
    const secret = `s-${Math.random().toString(36).slice(2)}`;
    assert.equal(isCronAuthorized(`Bearer ${secret}`, secret), true);
    assert.equal(isCronAuthorized(`Bearer ${secret}x`, secret), false);
    assert.equal(isCronAuthorized(secret, secret), false);
    assert.equal(isCronAuthorized(null, secret), false);
    assert.equal(isCronAuthorized('Bearer ', ''), false);
    assert.equal(isCronAuthorized('Bearer undefined', undefined), false);
  });
});
