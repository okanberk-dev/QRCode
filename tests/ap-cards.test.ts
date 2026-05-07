/**
 * Stage 38 §38.118 — APAIDraftCard + APBillingCard saf helper testleri.
 *
 * Pulse §32 paterni: Node `--test` runner, saf fonksiyon coverage.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderStars } from '../src/components/ui/APAIDraftCard';
import { computeQuotaPct } from '../src/components/ui/APBillingCard';

describe('APAIDraftCard — renderStars', () => {
  it('renders 5 filled for n=5', () => {
    assert.equal(renderStars(5), '★★★★★');
  });
  it('renders 0 filled for n=0', () => {
    assert.equal(renderStars(0), '☆☆☆☆☆');
  });
  it('renders 3 filled + 2 empty for n=3', () => {
    assert.equal(renderStars(3), '★★★☆☆');
  });
  it('rounds half-star up: n=2.6 → 3 filled', () => {
    assert.equal(renderStars(2.6), '★★★☆☆');
  });
  it('rounds half-star down: n=2.4 → 2 filled', () => {
    assert.equal(renderStars(2.4), '★★☆☆☆');
  });
  it('clamps n above 5 to 5', () => {
    assert.equal(renderStars(8), '★★★★★');
  });
  it('clamps negative n to 0', () => {
    assert.equal(renderStars(-2), '☆☆☆☆☆');
  });
});

describe('APBillingCard — computeQuotaPct', () => {
  it('returns 0 when total is 0', () => {
    assert.equal(computeQuotaPct(100, 0), 0);
  });
  it('returns 0 when total is negative', () => {
    assert.equal(computeQuotaPct(50, -10), 0);
  });
  it('returns correct percentage', () => {
    assert.equal(computeQuotaPct(248, 500), 49.6);
  });
  it('clamps to 100 when used > total', () => {
    assert.equal(computeQuotaPct(800, 500), 100);
  });
  it('clamps to 0 when used is negative', () => {
    assert.equal(computeQuotaPct(-10, 500), 0);
  });
  it('returns 50 for half quota', () => {
    assert.equal(computeQuotaPct(50, 100), 50);
  });
  it('returns 100 when used equals total', () => {
    assert.equal(computeQuotaPct(500, 500), 100);
  });
});
