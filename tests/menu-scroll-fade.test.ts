import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  scrollFadeClass,
  scrollFadeEdges,
} from '../src/app/[locale]/dashboard/restaurants/[id]/menu/_components/outline/scroll-fade';

test('scrollFadeEdges: a strip that fits never fades (1 px zoom slack)', () => {
  assert.deepEqual(scrollFadeEdges(0, 400, 400), { start: false, end: false });
  assert.deepEqual(scrollFadeEdges(0, 400, 400.6), { start: false, end: false });
});

test('scrollFadeEdges: fades the side that has more chips behind it', () => {
  assert.deepEqual(scrollFadeEdges(0, 400, 600), { start: false, end: true });
  assert.deepEqual(scrollFadeEdges(100, 400, 600), { start: true, end: true });
  assert.deepEqual(scrollFadeEdges(200, 400, 600), { start: true, end: false });
  assert.deepEqual(scrollFadeEdges(199.5, 400, 600), { start: true, end: false });
});

test('scrollFadeClass: literal mask classes per edge set', () => {
  assert.equal(scrollFadeClass({ start: false, end: false }), '');
  assert.match(scrollFadeClass({ start: false, end: true }), /^\[mask-image:linear-gradient\(to_right,#000_calc\(100%-24px\),transparent\)\]$/);
  assert.match(scrollFadeClass({ start: true, end: false }), /transparent,#000_24px\)\]$/);
  assert.match(scrollFadeClass({ start: true, end: true }), /transparent,#000_24px,#000_calc/);
});
