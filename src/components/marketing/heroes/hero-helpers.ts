/**
 * Stage 41 §38.122 — HANDOFF §8 step 8 (Heroes).
 *
 * Saf yardımcı fonksiyonlar — 3 hero variant arasında paylaşılır,
 * unit-test edilebilir (RAF/DOM bağımsız). HANDOFF §6.1 + Pulse §11
 * disipline.
 */

/**
 * Cursor offset clamp helper (HeroParallax mouse tracking).
 *
 * Cursor x/y koordinatlarını element bounding box'ı içinde 0..1
 * aralığına normalize eder. Element dışında bile clamp edilmiş değer
 * döner — `pointer-events: none` katmanlardaki cursor takibi için
 * stable.
 */
export function normalizeCursorOffset(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
): { x: number; y: number } {
  const rawX = rect.width === 0 ? 0.5 : (clientX - rect.left) / rect.width;
  const rawY = rect.height === 0 ? 0.5 : (clientY - rect.top) / rect.height;
  return {
    x: Math.max(0, Math.min(1, rawX)),
    y: Math.max(0, Math.min(1, rawY)),
  };
}

/**
 * Layer translate helper (HeroParallax 5-layer 3D effect).
 *
 * Cursor offset'i (0..1 aralığında) layer multiplier ile çarpıp
 * translate3d transform string'i üretir. Multiplier 0 → sabit,
 * 1 → tam paralaks; 5 katmanlı küme için 0.3-1.0 arası kademeli.
 */
export function layerTransform(
  cursor: { x: number; y: number },
  multiplier: number,
  rotateScale = 0.25,
): string {
  const tx = (cursor.x - 0.5) * 30 * multiplier;
  const ty = (cursor.y - 0.5) * 18 * multiplier;
  const rot = (cursor.x - 0.5) * 8 * multiplier * rotateScale;
  return `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) rotate(${rot.toFixed(2)}deg)`;
}

/**
 * StarClimb 12-point sample data generator.
 *
 * 90 günlük "rating climb" eğrisi için deterministik örnek puanlar
 * üretir. Gerçek prod data'sı yok — marketing hero görsel kanıtı.
 * Pulse §35.8 kohort disclosure: "Buaze kohortu, ilk 90 gün ortalama"
 * (kullanıcı agency dili).
 *
 * @param start Başlangıç puanı (default 3.6)
 * @param end Hedef puan (default 4.8)
 * @param points Veri noktası sayısı (default 12 — haftalık örneklem)
 * @returns Array of { week, value } where value monotonic increase + minor variance
 */
export function generateClimbCurve(
  start = 3.6,
  end = 4.8,
  points = 12,
): readonly { week: number; value: number }[] {
  if (points < 2) return [];
  const span = end - start;
  return Array.from({ length: points }, (_, i) => {
    const progress = i / (points - 1);
    // easeOutCubic for a "rapid early climb, gentle plateau" feel
    const eased = 1 - Math.pow(1 - progress, 3);
    // Deterministic micro-variance per index (no Math.random — SSR + test-friendly)
    const variance = Math.sin(i * 1.7) * 0.04;
    const value = start + span * eased + variance;
    return {
      week: i + 1,
      // Clamp to [1, 5] — safety; rating values cannot leave star scale
      value: Math.max(1, Math.min(5, Number(value.toFixed(2)))),
    };
  });
}

/**
 * Cinematic scene timing constants (9s loop, 5 sahne).
 *
 * HANDOFF §6.1 v1: QR pulse → tarama → form → AI yanıt → 4.8★ pop.
 * Her sahne 1.8s + 0.2s overlap (gerçek visible window 1.8s).
 */
export const CINEMATIC_SCENES = {
  qrPulse: { start: 0, end: 2 },
  scan: { start: 1.8, end: 3.8 },
  form: { start: 3.6, end: 5.6 },
  aiReply: { start: 5.4, end: 7.4 },
  starPop: { start: 7.2, end: 9 },
} as const;

/**
 * Cinematic loop duration (saniye).
 */
export const CINEMATIC_DURATION = 9;

/**
 * StarClimb loop duration (saniye).
 */
export const STAR_CLIMB_DURATION = 8;
