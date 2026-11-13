import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  capPixelRatio,
  decideThreeMode,
  ecgPath,
  ecgPulse,
} from '../src/components/marketing/three/three-support';

const capable = {
  webgl: true,
  reducedMotion: false,
  saveData: false,
  deviceMemory: 8,
  hardwareConcurrency: 8,
};

test('decideThreeMode: capable device animates', () => {
  assert.equal(decideThreeMode(capable), 'animate');
});

test('decideThreeMode: no WebGL, data saver and very low memory never load three', () => {
  assert.equal(decideThreeMode({ ...capable, webgl: false }), 'off');
  assert.equal(decideThreeMode({ ...capable, saveData: true }), 'off');
  assert.equal(decideThreeMode({ ...capable, deviceMemory: 1 }), 'off');
  // Data saver wins over reduced motion: nothing is downloaded at all.
  assert.equal(decideThreeMode({ ...capable, saveData: true, reducedMotion: true }), 'off');
});

test('decideThreeMode: reduced motion and weak CPUs get one static frame', () => {
  assert.equal(decideThreeMode({ ...capable, reducedMotion: true }), 'static');
  assert.equal(decideThreeMode({ ...capable, hardwareConcurrency: 2 }), 'static');
});

test('decideThreeMode: unknown hints (non-Chromium) do not block animation', () => {
  assert.equal(
    decideThreeMode({ webgl: true, reducedMotion: false, saveData: false, deviceMemory: null, hardwareConcurrency: null }),
    'animate',
  );
  assert.equal(decideThreeMode({ ...capable, deviceMemory: 0, hardwareConcurrency: 0 }), 'animate');
});

test('capPixelRatio: caps phones at 1.5 and desktops at 2', () => {
  assert.equal(capPixelRatio(3, 390), 1.5);
  assert.equal(capPixelRatio(3, 1440), 2);
  assert.equal(capPixelRatio(1, 1440), 1);
  assert.equal(capPixelRatio(Number.NaN, 1440), 1);
  assert.equal(capPixelRatio(0, 390), 1);
});

test('ecgPulse: one R peak near 1 per cycle, flat baseline, periodic', () => {
  assert.ok(ecgPulse(0.22) > 0.95, 'R peak');
  assert.ok(Math.abs(ecgPulse(0.7)) < 0.01, 'baseline');
  assert.ok(ecgPulse(0.245) < 0, 'S dip');
  assert.ok(Math.abs(ecgPulse(1.22) - ecgPulse(0.22)) < 1e-9, 'periodic');
  assert.ok(Math.abs(ecgPulse(-0.78) - ecgPulse(0.22)) < 1e-9, 'negative phase wraps');
});

test('ecgPath: valid SVG path inside the box', () => {
  const d = ecgPath(1200, 320, { beats: 3, samples: 120 });
  assert.match(d, /^M0\.0 [\d.]+( L[\d.]+ -?[\d.]+){120}$/);
  const ys = [...d.matchAll(/[ML][\d.]+ (-?[\d.]+)/g)].map((m) => Number(m[1]));
  assert.ok(ys.every((y) => y >= 0 && y <= 320), 'y within height');
});
