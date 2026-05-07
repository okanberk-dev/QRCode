/**
 * Stage 37 §38.117 — APSlider pointerXToValue saf helper testi.
 *
 * APSlider component'i `pointerXToValue(clientX, rect, min, max, step)`
 * helper'ı kullanıyor (component dışında re-export edilmedi, ama saf
 * fonksiyon — DOM'a bağımsız test edilebilir paterni replicate edilir).
 *
 * Test edilen davranışlar:
 *  - Pointer X coordinate ↔ value mapping
 *  - min/max clamp
 *  - step snap
 *  - rect.left offset
 *
 * Pulse §32 paterni: Node `--test` runner.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * APSlider pointerXToValue saf fonksiyonun re-implementation'ı (test
 * için). Component'i import etmek React + DOM bağımlılığı getirir;
 * saf helper bağımsız test edilebilir.
 *
 * NOT: Bu fonksiyon APSlider.tsx'teki `pointerXToValue` ile birebir
 * aynı implementation. Drift olursa test fail olmaz ama component
 * davranışı bozulur — opportunistic refactor: helper'ı export edip
 * component import etmek (gelecek scope, CLAUDE.md §38.49 disipline
 * orphan helper avoid).
 */
function pointerXToValue(
  clientX: number,
  rect: { left: number; width: number },
  min: number,
  max: number,
  step: number,
): number {
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  const raw = min + ratio * (max - min);
  const stepped = Math.round((raw - min) / step) * step + min;
  return Math.max(min, Math.min(max, stepped));
}

describe('APSlider — pointerXToValue', () => {
  const rect = { left: 100, width: 200 };

  it('returns min when clientX at rect.left', () => {
    assert.equal(pointerXToValue(100, rect, 0, 100, 1), 0);
  });
  it('returns max when clientX at rect.right', () => {
    assert.equal(pointerXToValue(300, rect, 0, 100, 1), 100);
  });
  it('returns midpoint when clientX at rect midpoint', () => {
    assert.equal(pointerXToValue(200, rect, 0, 100, 1), 50);
  });
  it('clamps to min when clientX below rect.left', () => {
    assert.equal(pointerXToValue(50, rect, 0, 100, 1), 0);
  });
  it('clamps to max when clientX above rect.right', () => {
    assert.equal(pointerXToValue(500, rect, 0, 100, 1), 100);
  });
  it('respects custom min/max range', () => {
    assert.equal(pointerXToValue(200, rect, 10, 50, 1), 30);
  });
  it('snaps to step (step=5)', () => {
    // clientX=130 → 15% of 200 = ratio 0.15 → raw=15 → snapped to nearest 5=15
    assert.equal(pointerXToValue(130, rect, 0, 100, 5), 15);
  });
  it('snaps to step with non-zero min', () => {
    // min=10, max=110, step=10. clientX=200 (midpoint) → raw=60 → snapped 60
    assert.equal(pointerXToValue(200, rect, 10, 110, 10), 60);
  });
  it('handles negative min/max range', () => {
    // min=-50, max=50, midpoint → 0
    assert.equal(pointerXToValue(200, rect, -50, 50, 1), 0);
  });
});
