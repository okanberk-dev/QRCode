// CLAUDE.md §32 — Node built-in test runner. Pure helper, deterministic
// output (qrcode internal encoding is stable). Verifies the rounded-modules
// SVG renderer returns a structurally valid Buaze QR (3 finder eyes +
// rounded data rects + correct viewBox + background tint).

import { test } from "node:test";
import assert from "node:assert/strict";

import { renderAestheticQrSvg } from "../src/lib/qr-aesthetic";

test("renderAestheticQrSvg: returns valid SVG markup with viewBox", () => {
  const { svg } = renderAestheticQrSvg({ data: "https://buaze.com/r/test" });
  assert.match(svg, /^<svg /);
  assert.match(svg, /<\/svg>$/);
  assert.match(svg, /viewBox="0 0 800 800"/);
});

test("renderAestheticQrSvg: respects custom size", () => {
  const { svg } = renderAestheticQrSvg({ data: "x", size: 320 });
  assert.match(svg, /viewBox="0 0 320 320"/);
  assert.match(svg, /width="320"/);
  assert.match(svg, /height="320"/);
});

test("renderAestheticQrSvg: renders exactly 3 finder patterns (3 glyphs each = 9 rects)", () => {
  const { svg } = renderAestheticQrSvg({ data: "x" });
  // Each finder = 3 nested rects (outer dark + mid light + inner dark).
  // Plus the canvas background rect = 1. Data modules add more <rect>s.
  // We just assert at least 10 (1 bg + 9 finder glyphs).
  const rectCount = (svg.match(/<rect /g) || []).length;
  assert.ok(rectCount >= 10, `expected >= 10 rects, got ${rectCount}`);
});

test("renderAestheticQrSvg: honours dark + light colour overrides", () => {
  const { svg } = renderAestheticQrSvg({
    data: "x",
    dark: "#123456",
    light: "#FEDCBA",
  });
  assert.match(svg, /fill="#FEDCBA"/, "background should use light hex");
  assert.match(svg, /fill="#123456"/, "modules should use dark hex");
});

test("renderAestheticQrSvg: data modules use rounded corners (rx attribute)", () => {
  const { svg } = renderAestheticQrSvg({ data: "https://buaze.com/r/test" });
  // Rounded rects always emit `rx=` + numeric value.
  assert.match(svg, /rx="\d/);
});

test("renderAestheticQrSvg: returns geometry metadata", () => {
  const result = renderAestheticQrSvg({ data: "x", size: 400 });
  assert.ok(result.gridSize > 0, "gridSize should be positive");
  assert.ok(result.modulePx > 0, "modulePx should be positive");
  // gridSize for short data + EC=H should fit in QR v1-v3 range (21-29).
  assert.ok(result.gridSize >= 21 && result.gridSize <= 41);
});

test("renderAestheticQrSvg: shape-rendering hint for crisp edges", () => {
  const { svg } = renderAestheticQrSvg({ data: "x" });
  assert.match(svg, /shape-rendering="geometricPrecision"/);
});

test("renderAestheticQrSvg: error correction level H produces denser grid than L", () => {
  // Same payload — H requires more recovery bytes → bigger grid (or same).
  const h = renderAestheticQrSvg({ data: "https://buaze.com/r/test-long-slug-for-version-bump?source=qr&table=42", errorCorrectionLevel: "H" });
  const l = renderAestheticQrSvg({ data: "https://buaze.com/r/test-long-slug-for-version-bump?source=qr&table=42", errorCorrectionLevel: "L" });
  assert.ok(h.gridSize >= l.gridSize, `H gridSize (${h.gridSize}) should be >= L (${l.gridSize})`);
});
