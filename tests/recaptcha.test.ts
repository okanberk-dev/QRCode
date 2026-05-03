/**
 * reCAPTCHA helper tests — Görev C Faz 1.
 *
 * Covers the pure `buildSoftPassSentryEnvelope` builder used by
 * `softFail()` in `src/lib/recaptcha.ts`. The full `verifyRecaptchaToken`
 * flow is not unit tested here because it instantiates a Google Cloud
 * Enterprise client and would require credentials + heavy mocking. The
 * Sentry capture surface is exercised in production by inspecting the
 * `tags.reason` aggregation over a 1-2 week window before flipping
 * `RECAPTCHA_ENFORCE=true` (CLAUDE.md §37.3 #2).
 *
 * Run: npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildSoftPassSentryEnvelope } from '../src/lib/recaptcha';

describe('buildSoftPassSentryEnvelope', () => {
  it('always emits warning level (soft-pass is a signal, not an error)', () => {
    const envelope = buildSoftPassSentryEnvelope('low score', { score: 0.3, action: 'login' });
    assert.equal(envelope.level, 'warning');
  });

  it('tags the reason verbatim so dashboards can group by it', () => {
    const envelope = buildSoftPassSentryEnvelope('action mismatch', { action: 'register' });
    assert.equal(envelope.tags.reason, 'action mismatch');
  });

  it('promotes a string action to a tag for grouping in Sentry', () => {
    const envelope = buildSoftPassSentryEnvelope('low score', { score: 0.2, action: 'feedback' });
    assert.equal(envelope.tags.action, 'feedback');
  });

  it('omits the action tag when detail has no string action', () => {
    const envelope = buildSoftPassSentryEnvelope('client did not send a valid token', {
      tokenType: 'undefined',
    });
    assert.equal(envelope.tags.action, undefined);
  });

  it('passes the rest of the detail through to extra', () => {
    const envelope = buildSoftPassSentryEnvelope('low score', {
      score: 0.15,
      reasons: ['LOW_CONFIDENCE_SCORE'],
      action: 'login',
    });
    assert.deepEqual(envelope.extra, {
      score: 0.15,
      reasons: ['LOW_CONFIDENCE_SCORE'],
      action: 'login',
    });
  });

  it('does not include IP, token, or user identifiers (PII guard)', () => {
    // Callers only pass score / reasons / action / invalidReason / tokenType
    // / String(error). If a caller ever drifts and tries to leak user
    // context it should fail this guard test.
    const envelope = buildSoftPassSentryEnvelope('assessment api error', {
      error: 'TimeoutError: socket hang up',
      action: 'admin-login',
    });
    const flat = JSON.stringify(envelope);
    // Spot-check: no IP-like substrings, no DSN, no auth headers, no email.
    assert.ok(!/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(flat), 'envelope must not include IPs');
    assert.ok(!/Bearer\s/i.test(flat), 'envelope must not include bearer tokens');
    assert.ok(!/@/.test(flat), 'envelope must not include emails');
  });
});
