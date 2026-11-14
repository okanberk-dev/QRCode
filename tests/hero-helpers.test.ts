/**
 * Homepage hero stage timing (src/components/marketing/heroes/hero-helpers.ts).
 *
 * Pure constants and one helper, no DOM: scene order, the 0.2 s cross-fade
 * overlap, the loop boundary and the step indicator index. Reduced-motion and
 * tab-pause behaviour live in the Stage primitive (tests/anim-*).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CINEMATIC_DURATION,
  CINEMATIC_OVERLAP,
  CINEMATIC_SCENES,
  CINEMATIC_SCENE_ORDER,
  activeSceneIndex,
} from '../src/components/marketing/heroes/hero-helpers';

const ordered = CINEMATIC_SCENE_ORDER.map((key) => CINEMATIC_SCENES[key]);

test('CINEMATIC_SCENE_ORDER lists every scene exactly once', () => {
  assert.equal(CINEMATIC_SCENE_ORDER.length, Object.keys(CINEMATIC_SCENES).length);
  assert.equal(new Set(CINEMATIC_SCENE_ORDER).size, CINEMATIC_SCENE_ORDER.length);
  assert.deepEqual(CINEMATIC_SCENE_ORDER, ['qr', 'scan', 'rate', 'privateFeedback', 'draft']);
});

test('scenes start at 0, advance in order and overlap the previous one by CINEMATIC_OVERLAP', () => {
  assert.equal(ordered[0].start, 0);
  for (let i = 1; i < ordered.length; i++) {
    assert.ok(ordered[i].start > ordered[i - 1].start, `scene ${i} should start later`);
    // Float-safe: 3.8 - 3.6 is not exactly 0.2 in IEEE 754.
    assert.ok(
      Math.abs(ordered[i - 1].end - ordered[i].start - CINEMATIC_OVERLAP) < 1e-9,
      `scene ${i} should overlap the previous scene by ${CINEMATIC_OVERLAP}s`,
    );
  }
});

test('every scene is visible for at least 1.8 s and the last one ends at the loop duration', () => {
  for (const scene of ordered) {
    assert.ok(scene.end - scene.start >= 1.8 - 1e-9, `window too short: ${scene.start}–${scene.end}`);
  }
  assert.equal(ordered[ordered.length - 1].end, CINEMATIC_DURATION);
});

test('activeSceneIndex: follows the most recently started scene', () => {
  assert.equal(activeSceneIndex(0), 0);
  assert.equal(activeSceneIndex(1.79), 0);
  assert.equal(activeSceneIndex(CINEMATIC_SCENES.scan.start), 1);
  assert.equal(activeSceneIndex(CINEMATIC_SCENES.rate.start + 0.5), 2);
  assert.equal(activeSceneIndex(CINEMATIC_SCENES.privateFeedback.start), 3);
});

test('activeSceneIndex: the frozen reduced-motion frame (time = duration) shows the last step', () => {
  assert.equal(activeSceneIndex(CINEMATIC_DURATION), CINEMATIC_SCENE_ORDER.length - 1);
});
