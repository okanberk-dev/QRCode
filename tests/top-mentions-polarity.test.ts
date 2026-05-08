import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { derivePolarity } from '../src/components/dashboard/analytics/TopMentionsPolarity';

// Stage 66 §38.147 — TopMentionsPolarity derivePolarity saf helper unit
// tests. Threshold heuristic: pos% ≥ 60 → positive, < 35 → negative,
// else → neutral. AI sentiment field yoksa neutral fallback.

describe('derivePolarity', () => {
  it('undefined → neutral', () => {
    assert.equal(derivePolarity(undefined), 'neutral');
  });

  it('60% → positive (boundary inclusive)', () => {
    assert.equal(derivePolarity(60), 'positive');
  });

  it('80% → positive', () => {
    assert.equal(derivePolarity(80), 'positive');
  });

  it('100% → positive', () => {
    assert.equal(derivePolarity(100), 'positive');
  });

  it('59.9% → neutral (just below boundary)', () => {
    assert.equal(derivePolarity(59.9), 'neutral');
  });

  it('50% → neutral', () => {
    assert.equal(derivePolarity(50), 'neutral');
  });

  it('35% → neutral (boundary inclusive)', () => {
    assert.equal(derivePolarity(35), 'neutral');
  });

  it('34.9% → negative (just below boundary)', () => {
    assert.equal(derivePolarity(34.9), 'negative');
  });

  it('20% → negative', () => {
    assert.equal(derivePolarity(20), 'negative');
  });

  it('0% → negative', () => {
    assert.equal(derivePolarity(0), 'negative');
  });
});
