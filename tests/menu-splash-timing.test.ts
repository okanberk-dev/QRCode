// QR splash end time (review F1): the menu canvas is inert until the splash
// ends, so the end must follow the CSS fade that started at first paint, not
// the (later) hydration.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splashRemainingMs } from '../src/components/menu/splash-timing';

const TOTAL = 3280;

test('a fade that already ran out before hydration ends the splash at once', () => {
  assert.equal(splashRemainingMs({ totalMs: TOTAL, playState: 'finished', currentTime: 3280, hidden: true }), 0);
  assert.equal(splashRemainingMs({ totalMs: TOTAL, playState: null, currentTime: null, hidden: true }), 0);
  assert.equal(splashRemainingMs({ totalMs: TOTAL, playState: 'finished', currentTime: null, hidden: false }), 0);
});

test('slow hydration waits only for the rest of the fade', () => {
  assert.equal(splashRemainingMs({ totalMs: TOTAL, playState: 'running', currentTime: 2000, hidden: false }), 1280);
  assert.equal(splashRemainingMs({ totalMs: TOTAL, playState: 'running', currentTime: 3279.4, hidden: false }), 1);
  assert.equal(splashRemainingMs({ totalMs: TOTAL, playState: 'running', currentTime: 5000, hidden: false }), 0);
});

test('the client-only fallback (fresh animation) waits the full time', () => {
  assert.equal(splashRemainingMs({ totalMs: TOTAL, playState: 'running', currentTime: 0, hidden: false }), TOTAL);
  assert.equal(splashRemainingMs({ totalMs: TOTAL, playState: 'running', currentTime: -10, hidden: false }), TOTAL);
});

test('an unreadable animation falls back to the full time', () => {
  assert.equal(splashRemainingMs({ totalMs: TOTAL, playState: null, currentTime: null, hidden: false }), TOTAL);
  assert.equal(splashRemainingMs({ totalMs: TOTAL, playState: 'running', currentTime: { value: 10 }, hidden: false }), TOTAL);
  assert.equal(splashRemainingMs({ totalMs: TOTAL, playState: 'running', currentTime: Number.NaN, hidden: false }), TOTAL);
});
