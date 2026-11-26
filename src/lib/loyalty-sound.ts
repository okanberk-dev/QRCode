/**
 * Sounds and haptics of the customer's loyalty pages (CLAUDE.md §61).
 *
 * Synthesised with the Web Audio API (no audio files, nothing to load or
 * license). Browsers only let a page make sound after the visitor touches
 * it, so `unlockAudio()` runs inside the first tap (the arrival screen's
 * "Dokunun", the join button, or any first tap on the page); every later
 * `playSound()` — e.g. the stamp the counter adds a minute later — then
 * plays. The visitor can switch sound off (stored on the device). Client
 * only.
 */

export type LoyaltySound = 'welcome' | 'card' | 'stamp' | 'reward' | 'tap';

const STORAGE_KEY = 'buaze:sound';

type AudioCtor = typeof AudioContext;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function audioCtor(): AudioCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export function soundSupported(): boolean {
  return audioCtor() !== null;
}

export function isSoundOn(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setSoundOn(on: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    /* storage blocked: the choice lasts for this page only */
  }
  if (!on && ctx && ctx.state === 'running') void ctx.suspend().catch(() => undefined);
  if (on && ctx && ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
}

/**
 * Call synchronously inside a tap / click handler. Creates or resumes the
 * audio context and plays one silent sample (needed by iOS Safari).
 */
export function unlockAudio(): void {
  const Ctor = audioCtor();
  if (!Ctor) return;
  try {
    if (!ctx) {
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended' && isSoundOn()) void ctx.resume().catch(() => undefined);
    const buffer = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start(0);
  } catch {
    /* no audio on this device */
  }
}

export function audioUnlocked(): boolean {
  return Boolean(ctx && ctx.state === 'running');
}

/** One bell-like partial: sine body + soft overtone, fast attack, long decay. */
function bell(at: number, freq: number, length: number, peak: number): void {
  if (!ctx || !master) return;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, at);
  out.gain.exponentialRampToValueAtTime(peak, at + 0.008);
  out.gain.exponentialRampToValueAtTime(0.0001, at + length);
  out.connect(master);
  const partials: Array<[number, OscillatorType, number]> = [
    [1, 'sine', 1],
    [2.01, 'sine', 0.28],
    [3.98, 'triangle', 0.06],
  ];
  for (const [ratio, type, level] of partials) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq * ratio, at);
    g.gain.value = level;
    osc.connect(g);
    g.connect(out);
    osc.start(at);
    osc.stop(at + length + 0.05);
  }
}

/** A short pitched "thock", like a rubber stamp landing. */
function thock(at: number, peak: number): void {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(240, at);
  osc.frequency.exponentialRampToValueAtTime(70, at + 0.12);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
  osc.connect(g);
  g.connect(master);
  osc.start(at);
  osc.stop(at + 0.2);
}

/** Note frequencies (Hz) of each sound, for the tests and the design notes. */
export const SOUND_NOTES: Record<LoyaltySound, number[]> = {
  // E5 · B5 · E6 — open, welcoming fifth + octave.
  welcome: [659.25, 987.77, 1318.51],
  // G5 · D6 — "your card is here".
  card: [783.99, 1174.66],
  // stamp: low thock + one bright sparkle (A6).
  stamp: [1760],
  // C6 · E6 · G6 · C7 — reward ready arpeggio.
  reward: [1046.5, 1318.51, 1567.98, 2093],
  tap: [1567.98],
};

export function playSound(name: LoyaltySound): void {
  if (!ctx || !master || ctx.state !== 'running' || !isSoundOn()) return;
  const now = ctx.currentTime + 0.01;
  const notes = SOUND_NOTES[name];
  try {
    switch (name) {
      case 'welcome':
        notes.forEach((f, i) => bell(now + i * 0.11, f, 1.4 - i * 0.2, 0.16 - i * 0.03));
        break;
      case 'card':
        notes.forEach((f, i) => bell(now + i * 0.09, f, 0.9, 0.14));
        break;
      case 'stamp':
        thock(now, 0.5);
        bell(now + 0.06, notes[0], 0.5, 0.08);
        break;
      case 'reward':
        notes.forEach((f, i) => bell(now + i * 0.075, f, 1.1, 0.12));
        break;
      case 'tap':
        bell(now, notes[0], 0.25, 0.05);
        break;
    }
  } catch {
    /* ignore audio errors */
  }
}

/** Short vibration on phones that support it (Android). */
export function haptic(pattern: number | number[] = 12): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
  } catch {
    /* not supported */
  }
}
