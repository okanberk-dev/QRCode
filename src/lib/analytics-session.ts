// Anonymous, KVKK/GDPR-friendly session tracking.
// No PII. Stored client-side in localStorage; rotates after 30 min of inactivity.

const STORAGE_KEY = 'buaze.menu.sid';
const SESSION_IDLE_MS = 30 * 60 * 1000; // 30 min

interface StoredSession {
  sid: string;
  t: number; // last touched epoch ms
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback: RFC4122-ish random
  const rnd = (n: number) => Math.random().toString(16).slice(2, 2 + n);
  return `${rnd(8)}-${rnd(4)}-4${rnd(3)}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${rnd(3)}-${rnd(12)}`;
}

export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const now = Date.now();
    if (raw) {
      const parsed: StoredSession = JSON.parse(raw);
      if (parsed?.sid && typeof parsed.t === 'number' && now - parsed.t < SESSION_IDLE_MS) {
        parsed.t = now;
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        return parsed.sid;
      }
    }
    const sid = uuid();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ sid, t: now }));
    return sid;
  } catch {
    // localStorage unavailable — fall back to in-memory for this page load.
    return uuid();
  }
}

export function detectSourceType(searchParams: URLSearchParams | null): string {
  if (!searchParams) return 'direct';
  const src = searchParams.get('source');
  if (src === 'qr' || src === 'table' || src === 'link' || src === 'delivery') return src;
  if (searchParams.get('table')) return 'table';
  if (searchParams.get('source') === 'qr') return 'qr';
  if (typeof document !== 'undefined' && document.referrer && !document.referrer.includes(window.location.host)) {
    return 'link';
  }
  return 'direct';
}

// Validate a session ID on the server side — shape only, not existence.
export function isValidSessionId(v: unknown): v is string {
  return typeof v === 'string' && v.length >= 16 && v.length <= 64 && /^[a-z0-9-]+$/i.test(v);
}
