import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_REDIRECT_MIN_RATING,
  REDIRECT_MIN_RATING_OPTIONS,
  normalizeRedirectMinRating,
} from '../src/lib/constants';

// The public review flow decides "public platform link" vs "internal feedback
// form" purely from `rating >= threshold`. These tests pin the threshold
// helper so a drifted DB row, a hand-crafted PUT body, or a future refactor
// can never silently widen the public-platform funnel.

test('default threshold is 5 — only 5-star customers get the platform link', () => {
  assert.equal(DEFAULT_REDIRECT_MIN_RATING, 5);
});

test('only 4 and 5 are offered as thresholds', () => {
  assert.deepEqual([...REDIRECT_MIN_RATING_OPTIONS], [4, 5]);
});

test('normalizeRedirectMinRating keeps an explicit 4', () => {
  assert.equal(normalizeRedirectMinRating(4), 4);
});

test('normalizeRedirectMinRating keeps an explicit 5', () => {
  assert.equal(normalizeRedirectMinRating(5), 5);
});

test('normalizeRedirectMinRating falls back to the default for unset values', () => {
  assert.equal(normalizeRedirectMinRating(null), 5);
  assert.equal(normalizeRedirectMinRating(undefined), 5);
});

test('normalizeRedirectMinRating rejects out-of-range and wrong-typed values', () => {
  // Anything that is not exactly the number 4 must fall back to 5 — never to a
  // lower (more permissive) threshold.
  for (const bogus of [0, 1, 2, 3, 6, 99, -4, '4', '5', 4.5, NaN, {}, [], true]) {
    assert.equal(
      normalizeRedirectMinRating(bogus),
      5,
      `expected fallback to 5 for ${JSON.stringify(bogus)}`,
    );
  }
});

// Mirrors the branch in src/app/r/[slug]/page.tsx:handleStarClick — kept here
// as a plain predicate so the routing rule itself is covered.
function goesToPublicPlatform(star: number, storedThreshold: unknown): boolean {
  return star >= normalizeRedirectMinRating(storedThreshold);
}

test('default (5): 1-4 stars stay in the internal form, 5 stars get the platform', () => {
  assert.equal(goesToPublicPlatform(1, null), false);
  assert.equal(goesToPublicPlatform(2, null), false);
  assert.equal(goesToPublicPlatform(3, null), false);
  assert.equal(goesToPublicPlatform(4, null), false);
  assert.equal(goesToPublicPlatform(5, null), true);
});

test('opt-in (4): 1-3 stars stay internal, 4-5 stars get the platform', () => {
  assert.equal(goesToPublicPlatform(3, 4), false);
  assert.equal(goesToPublicPlatform(4, 4), true);
  assert.equal(goesToPublicPlatform(5, 4), true);
});

test('a corrupted threshold never routes a 4-star customer to the platform', () => {
  // Regression guard: a bogus stored value must not accidentally behave like 4.
  assert.equal(goesToPublicPlatform(4, '4'), false);
  assert.equal(goesToPublicPlatform(4, 0), false);
  assert.equal(goesToPublicPlatform(4, NaN), false);
});
