/**
 * moderateReplyContent — keyword-fallback path tests.
 *
 * Only the `OPENAI_API_KEY`-absent branch is exercised here: it's fully
 * deterministic and network-free (the moderation API call is skipped
 * entirely when there is no key), so it's safe to run in CI without
 * mocking `fetch`. The AI-moderation branch is integration-tested
 * manually (real OpenAI call) — CLAUDE.md §32 keeps unit tests to pure,
 * DB/network-independent helpers.
 *
 * Run: npm test
 */

import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { moderateReplyContent } from '../src/lib/content-safety';

describe('moderateReplyContent (keyword fallback, no OPENAI_API_KEY)', () => {
  let originalKey: string | undefined;

  beforeEach(() => {
    originalKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it('allows an ordinary, non-threatening reply', async () => {
    const result = await moderateReplyContent(
      'Geri bildiriminiz için teşekkür ederiz, deneyiminizi iyileştirmek için elimizden geleni yapacağız.',
    );
    assert.equal(result.blocked, false);
    assert.equal(result.reason, null);
  });

  it('allows empty/whitespace-only input', async () => {
    const result = await moderateReplyContent('   ');
    assert.equal(result.blocked, false);
  });

  it('blocks an explicit Turkish death threat', async () => {
    const result = await moderateReplyContent('Seni öldürürüm bir daha buraya gelirsen.');
    assert.equal(result.blocked, true);
    assert.equal(result.reason, 'keyword_filter');
  });

  it('blocks an explicit English death threat', async () => {
    const result = await moderateReplyContent('I will kill you if you post another review.');
    assert.equal(result.blocked, true);
    assert.equal(result.reason, 'keyword_filter');
  });

  it('blocks a Turkish "I will find you" style threat', async () => {
    const result = await moderateReplyContent('Merak etme seni buluruz.');
    assert.equal(result.blocked, true);
    assert.equal(result.reason, 'keyword_filter');
  });

  it('does not false-positive on unrelated words containing threat substrings', async () => {
    // "bulur" appears in many benign sentences ("nerede bulurum" etc.) —
    // the pattern requires "seni bulur(um|uz)" specifically.
    const result = await moderateReplyContent('Bu ürünü nereden bulurum diye sorduğunuz için teşekkürler.');
    assert.equal(result.blocked, false);
  });
});
