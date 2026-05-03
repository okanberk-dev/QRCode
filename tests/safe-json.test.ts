/**
 * safeParseJson helper tests — Görev G.
 *
 * Covers the pure success / failure paths of the helper. Sentry's
 * `captureException` and `console.error` side effects are intentionally
 * not asserted here because Sentry init is no-op without a DSN in the
 * test environment and console.error spying complicates the suite — the
 * production behaviour is exercised by the dashboard once the
 * server-side flush kör nokta in CLAUDE.md §38.8 is resolved.
 *
 * Run: npm test
 */

import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { safeParseJson } from '../src/lib/safe-json';

describe('safeParseJson', () => {
  let originalConsoleError: typeof console.error;

  beforeEach(() => {
    // Suppress the helper's local breadcrumb so the test output stays
    // focused on assertions instead of stderr noise.
    originalConsoleError = console.error;
    console.error = () => {};
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('parses a valid JSON object', () => {
    const result = safeParseJson<{ hello: string }>('{"hello":"world"}');
    assert.deepEqual(result, { hello: 'world' });
  });

  it('parses a valid JSON array', () => {
    const result = safeParseJson<number[]>('[1,2,3]');
    assert.deepEqual(result, [1, 2, 3]);
  });

  it('returns null for an empty string', () => {
    const result = safeParseJson('');
    assert.equal(result, null);
  });

  it('returns null for malformed JSON instead of throwing', () => {
    const result = safeParseJson('{not: valid json');
    assert.equal(result, null);
  });

  it('returns null when the payload contains an unmappable replacement character', () => {
    // Reproduces the production `SyntaxError: Invalid character '�'`
    // shape — the helper must not propagate the throw.
    const result = safeParseJson('{"name": "Caf�"');
    assert.equal(result, null);
  });

  it('still returns null when raw is not a string-shaped value', () => {
    // Defensive: callers that route untyped payloads through the helper
    // shouldn't crash on `null`/`undefined` either.
    const result = safeParseJson((undefined as unknown) as string);
    assert.equal(result, null);
  });

  it('preserves the parsed value type via the generic parameter', () => {
    interface Reply {
      summary: string;
      score: number;
    }
    const result = safeParseJson<Reply>('{"summary":"ok","score":42}');
    assert.ok(result, 'expected a parsed result');
    if (!result) return;
    assert.equal(result.summary, 'ok');
    assert.equal(result.score, 42);
  });
});
