import test from 'node:test';
import assert from 'node:assert/strict';
import { GOOGLE_REVIEW_NAME_RE } from '../src/lib/google-business';

// `reviewName` arrives from the client and is concatenated into the Google
// Business Profile URL. `fetch()` resolves `..` dot-segments per the WHATWG URL
// spec, so a name that merely *starts with* the caller's own location prefix
// could still target a different account — the ownership check passed while the
// reply was published on a stranger's listing. These tests pin the allow-list
// that closes it.

const PREFIX = 'accounts/111/locations/222/reviews/';

test('accepts a canonical Google review resource name', () => {
  assert.ok(GOOGLE_REVIEW_NAME_RE.test(`${PREFIX}AbFvOqNhK_9-xZ`));
});

test('accepts the URL-safe base64 charset Google emits', () => {
  assert.ok(GOOGLE_REVIEW_NAME_RE.test('accounts/1-a_B/locations/2-c_D/reviews/A-b_C0'));
});

test('rejects dot-segment traversal in the review id', () => {
  const evil = `${PREFIX}../../../../../accounts/999/locations/888/reviews/ABC`;
  assert.equal(GOOGLE_REVIEW_NAME_RE.test(evil), false);
  // …and this is exactly why: the prefix check alone would have passed.
  assert.ok(evil.startsWith(PREFIX));
});

test('the rejected payload really did retarget the request URL', () => {
  // Documents the mechanism so nobody "simplifies" the allow-list away later.
  const evil = `${PREFIX}../../../../../accounts/999/locations/888/reviews/ABC`;
  const resolved = new URL(`https://mybusiness.googleapis.com/v4/${evil}/reply`).href;
  assert.equal(
    resolved,
    'https://mybusiness.googleapis.com/v4/accounts/999/locations/888/reviews/ABC/reply',
  );
});

test('rejects structural characters that could alter the URL', () => {
  for (const id of [
    '..',
    '.',
    'a/b',
    'a?x=1',
    'a#frag',
    'a%2F..',
    'a\\b',
    'a b',
    '',
  ]) {
    assert.equal(
      GOOGLE_REVIEW_NAME_RE.test(`${PREFIX}${id}`),
      false,
      `expected rejection for review id ${JSON.stringify(id)}`,
    );
  }
});

test('rejects names that are not review resources at all', () => {
  for (const name of [
    'accounts/111/locations/222',
    'accounts/111/locations/222/reviews',
    'locations/222/reviews/ABC',
    'https://mybusiness.googleapis.com/v4/accounts/111/locations/222/reviews/ABC',
    '/accounts/111/locations/222/reviews/ABC',
    'accounts/111/locations/222/reviews/ABC/reply',
  ]) {
    assert.equal(GOOGLE_REVIEW_NAME_RE.test(name), false, `expected rejection for ${name}`);
  }
});

test('encodeURIComponent is not a substitute for the allow-list', () => {
  // Regression guard against a "just encode it" refactor.
  assert.equal(encodeURIComponent('..'), '..');
});
