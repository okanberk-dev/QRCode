import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGoogleReviewInput } from '../src/lib/restaurant-google-input';

test('normalizeGoogleReviewInput wraps a raw Place ID in the Google write-review URL', () => {
  const result = normalizeGoogleReviewInput('ChIJN1t_tDeuEmsRUsoyG83frY4');
  assert.equal(result.googlePlaceId, 'ChIJN1t_tDeuEmsRUsoyG83frY4');
  assert.equal(
    result.googleReviewUrl,
    'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4',
  );
});

test('normalizeGoogleReviewInput keeps a canonical write-review URL', () => {
  const url = 'https://search.google.com/local/writereview?placeid=abc123';
  const result = normalizeGoogleReviewInput(url);
  assert.equal(result.googlePlaceId, url);
  assert.equal(result.googleReviewUrl, url);
});

test('normalizeGoogleReviewInput returns nulls for empty input', () => {
  assert.deepEqual(normalizeGoogleReviewInput('  '), {
    googlePlaceId: null,
    googleReviewUrl: null,
  });
});

