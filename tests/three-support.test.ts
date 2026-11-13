import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  capPixelRatio,
  decideThreeMode,
  ecgPath,
  ecgPulse,
  isSoftwareRenderer,
  shouldDrawFrame,
} from '../src/components/marketing/three/three-support';

const capable = {
  webgl2: true,
  reducedMotion: false,
  saveData: false,
  effectiveType: '4g',
  deviceMemory: 8,
  hardwareConcurrency: 8,
};

test('decideThreeMode: capable device animates', () => {
  assert.equal(decideThreeMode(capable), 'animate');
});

test('decideThreeMode: no WebGL2, data saver, 2G and very low memory never load three', () => {
  assert.equal(decideThreeMode({ ...capable, webgl2: false }), 'off');
  assert.equal(decideThreeMode({ ...capable, saveData: true }), 'off');
  assert.equal(decideThreeMode({ ...capable, effectiveType: '2g' }), 'off');
  assert.equal(decideThreeMode({ ...capable, effectiveType: 'slow-2g' }), 'off');
  assert.equal(decideThreeMode({ ...capable, deviceMemory: 1 }), 'off');
  // Data saver wins over reduced motion: nothing is downloaded at all.
  assert.equal(decideThreeMode({ ...capable, saveData: true, reducedMotion: true }), 'off');
});

test('decideThreeMode: a non-matching media query keeps the fallback', () => {
  assert.equal(decideThreeMode({ ...capable, mediaMatches: false }), 'off');
  assert.equal(decideThreeMode({ ...capable, mediaMatches: true }), 'animate');
});

test('decideThreeMode: reduced motion and weak CPUs get one static frame', () => {
  assert.equal(decideThreeMode({ ...capable, reducedMotion: true }), 'static');
  assert.equal(decideThreeMode({ ...capable, hardwareConcurrency: 2 }), 'static');
});

test('decideThreeMode: unknown hints (non-Chromium) do not block animation', () => {
  assert.equal(
    decideThreeMode({
      webgl2: true,
      reducedMotion: false,
      saveData: false,
      effectiveType: null,
      deviceMemory: null,
      hardwareConcurrency: null,
    }),
    'animate',
  );
  assert.equal(decideThreeMode({ ...capable, deviceMemory: 0, hardwareConcurrency: 0 }), 'animate');
  assert.equal(decideThreeMode({ ...capable, effectiveType: '3g' }), 'animate');
});

test('isSoftwareRenderer: catches CPU rasterisers, keeps real GPUs', () => {
  assert.equal(isSoftwareRenderer('Google SwiftShader'), true);
  assert.equal(
    isSoftwareRenderer('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)'),
    true,
  );
  assert.equal(isSoftwareRenderer('llvmpipe (LLVM 15.0.7, 256 bits)'), true);
  assert.equal(isSoftwareRenderer('Microsoft Basic Render Driver'), true);
  assert.equal(isSoftwareRenderer('ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)'), false);
  assert.equal(isSoftwareRenderer('Apple GPU'), false);
  assert.equal(isSoftwareRenderer('Adreno (TM) 740'), false);
  assert.equal(isSoftwareRenderer(''), false);
  assert.equal(isSoftwareRenderer(null), false);
});

test('shouldDrawFrame: caps the loop at maxFps with a little jitter slack', () => {
  assert.equal(shouldDrawFrame(1000, 0, 30), true, 'first frame always draws');
  assert.equal(shouldDrawFrame(1016.7, 1000, 30), false, 'next 60 Hz tick is skipped');
  assert.equal(shouldDrawFrame(1032.4, 1000, 30), true, 'second 60 Hz tick draws (2 ms slack)');
  assert.equal(shouldDrawFrame(1008, 1000, 0), true, 'no cap');
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

test('ecgPath: compact valid SVG path inside the box, peaks drawn', () => {
  const d = ecgPath(1200, 320, { beats: 3, amplitude: 0.3 });
  assert.match(d, /^M0\.0 [\d.]+( L[\d.]+ -?[\d.]+)+$/);
  assert.ok(d.length < 2500, `path stays small (${d.length} chars)`);
  const ys = [...d.matchAll(/[ML][\d.]+ (-?[\d.]+)/g)].map((m) => Number(m[1]));
  assert.ok(ys.every((y) => y >= 0 && y <= 320), 'y within height');
  const xs = [...d.matchAll(/[ML]([\d.]+) /g)].map((m) => Number(m[1]));
  assert.equal(xs[xs.length - 1], 1200, 'ends at the right edge');
  // The R peak (ecgPulse ≈ 1) must appear: y ≈ mid − amp.
  const mid = 320 * 0.62;
  const amp = 320 * 0.3;
  assert.ok(Math.min(...ys) < mid - amp * 0.95, 'R peak is sampled');
});
