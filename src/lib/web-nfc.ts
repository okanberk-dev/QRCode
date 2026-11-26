/**
 * Web NFC helpers (CLAUDE.md §61). Chrome on Android only (no iPhone, no
 * desktop): the panel shows the buttons only where `NDEFReader` exists.
 * A tag holds one URL record — the loyalty join link (`?source=nfc`) for a
 * table / counter sticker, or a customer's card link for a key fob.
 * Client-only; nothing here runs on the server.
 */
interface NdefRecordInit {
  recordType: string;
  data?: string;
}
interface NdefReadingEvent extends Event {
  serialNumber?: string;
  message: { records: Array<{ recordType: string; data?: DataView; encoding?: string }> };
}
interface NdefReaderLike extends EventTarget {
  write(message: { records: NdefRecordInit[] } | string, options?: { overwrite?: boolean; signal?: AbortSignal }): Promise<void>;
  scan(options?: { signal?: AbortSignal }): Promise<void>;
  makeReadOnly?(options?: { signal?: AbortSignal }): Promise<void>;
}
type NdefReaderCtor = new () => NdefReaderLike;

export function webNfcSupported(): boolean {
  return typeof window !== 'undefined' && 'NDEFReader' in window && window.isSecureContext;
}

/** `makeReadOnly` arrived in Chrome 100; older Android Chrome writes but cannot lock. */
export function nfcLockSupported(): boolean {
  if (!webNfcSupported()) return false;
  const Ctor = (window as unknown as { NDEFReader: NdefReaderCtor }).NDEFReader;
  return typeof (Ctor.prototype as NdefReaderLike).makeReadOnly === 'function';
}

function reader(): NdefReaderLike {
  const Ctor = (window as unknown as { NDEFReader: NdefReaderCtor }).NDEFReader;
  return new Ctor();
}

export type NfcErrorCode = 'unsupported' | 'denied' | 'aborted' | 'write_failed' | 'read_failed' | 'no_url' | 'lock_failed';

export class NfcError extends Error {
  code: NfcErrorCode;
  constructor(code: NfcErrorCode) {
    super(code);
    this.code = code;
  }
}

function mapError(err: unknown, fallback: NfcErrorCode): NfcError {
  const name = (err as { name?: string })?.name;
  if (name === 'NotAllowedError') return new NfcError('denied');
  if (name === 'AbortError') return new NfcError('aborted');
  if (name === 'NotSupportedError') return new NfcError('unsupported');
  return new NfcError(fallback);
}

/** Writes one URL record. Resolves once the tag is written (the user holds the phone to it). */
export async function writeUrlToTag(url: string, signal?: AbortSignal): Promise<void> {
  if (!webNfcSupported()) throw new NfcError('unsupported');
  try {
    await reader().write({ records: [{ recordType: 'url', data: url }] }, { overwrite: true, signal });
  } catch (err) {
    throw mapError(err, 'write_failed');
  }
}

/**
 * Makes the tag permanently read-only (cannot be undone). The tag usually
 * still sits on the phone right after writing; otherwise this waits for
 * the next tap. Stops anyone from rewriting a table sticker to another
 * address.
 */
export async function lockTag(signal?: AbortSignal): Promise<void> {
  if (!nfcLockSupported()) throw new NfcError('unsupported');
  try {
    await reader().makeReadOnly!({ signal });
  } catch (err) {
    throw mapError(err, 'lock_failed');
  }
}

/** Waits for a tag and returns the first URL (or text that is a URL) on it. */
export function readUrlFromTag(signal: AbortSignal): Promise<string> {
  if (!webNfcSupported()) return Promise.reject(new NfcError('unsupported'));
  return new Promise((resolve, reject) => {
    const r = reader();
    const onAbort = () => reject(new NfcError('aborted'));
    signal.addEventListener('abort', onAbort, { once: true });
    r.addEventListener('reading', (event) => {
      const e = event as NdefReadingEvent;
      for (const rec of e.message.records) {
        if (!rec.data) continue;
        const text = new TextDecoder(rec.encoding || 'utf-8').decode(rec.data);
        if (rec.recordType === 'url' || rec.recordType === 'absolute-url' || /^https?:\/\//.test(text)) {
          signal.removeEventListener('abort', onAbort);
          resolve(text);
          return;
        }
      }
      reject(new NfcError('no_url'));
    });
    r.addEventListener('readingerror', () => reject(new NfcError('read_failed')));
    r.scan({ signal }).catch((err) => reject(mapError(err, 'read_failed')));
  });
}

export function nfcErrorMessage(code: NfcErrorCode, locale: 'tr' | 'en'): string {
  const tr = locale === 'tr';
  switch (code) {
    case 'unsupported':
      return tr ? 'Bu cihaz NFC yazma/okumayı desteklemiyor. Android’de Chrome kullanın.' : 'This device cannot use NFC here. Use Chrome on Android.';
    case 'denied':
      return tr ? 'NFC izni verilmedi. Telefonun NFC’sini açıp izin verin.' : 'NFC permission was denied. Turn NFC on and allow it.';
    case 'aborted':
      return tr ? 'İptal edildi.' : 'Cancelled.';
    case 'no_url':
      return tr ? 'Etikette bağlantı bulunamadı.' : 'No link found on the tag.';
    case 'lock_failed':
      return tr
        ? 'Bağlantı yazıldı ama etiket kilitlenemedi (bazı etiketler kilitlenmez). Etiketi telefonda tutup tekrar deneyin ya da NFC Tools ile kilitleyin.'
        : 'The link was written but the tag could not be locked (some tags cannot). Hold it to the phone and retry, or lock it with NFC Tools.';
    case 'write_failed':
      return tr ? 'Etikete yazılamadı. Etiket kilitli ya da dolu olabilir; başka etiket deneyin.' : 'Could not write the tag. It may be locked or full; try another tag.';
    default:
      return tr ? 'Etiket okunamadı. Telefonu etikete biraz daha yaklaştırın.' : 'Could not read the tag. Hold the phone closer.';
  }
}
