'use client';

// Write a link to an NFC tag, or read one, from the panel (CLAUDE.md §61).
// Web NFC: Chrome on Android. The dialog starts listening right away; the
// staff holds the phone's back to the tag. Writing can end with locking
// the tag (read-only for good), so nobody can rewrite a table sticker to
// another address; the choice can be made while waiting or right after.
import { useEffect, useRef, useState } from 'react';
import { Check, Lock, Nfc } from 'lucide-react';
import { Modal } from '@/components/ui';
import { NfcError, lockTag, nfcErrorMessage, nfcLockSupported, readUrlFromTag, writeUrlToTag } from '@/lib/web-nfc';

type Phase = 'waiting' | 'locking' | 'done' | 'error';

export default function NfcDialog({
  locale,
  mode,
  url,
  title,
  target = 'tag',
  onRead,
  onClose,
}: {
  locale: 'tr' | 'en';
  mode: 'write' | 'read';
  /** Link to write (write mode). Null while it is being fetched. */
  url?: string | null;
  title: string;
  /** What is written: a table / counter sticker or a customer's key fob. */
  target?: 'tag' | 'fob';
  onRead?: (url: string) => void;
  onClose: () => void;
}) {
  const tr = locale === 'tr';
  const [phase, setPhase] = useState<Phase>('waiting');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [canLock, setCanLock] = useState(false);
  const [lock, setLock] = useState(false);
  const [locked, setLocked] = useState(false);
  const lockRef = useRef(false);
  lockRef.current = lock;
  const writtenRef = useRef(false);

  useEffect(() => setCanLock(mode === 'write' && nfcLockSupported()), [mode]);

  useEffect(() => {
    if (mode === 'write' && !url) return;
    const ctrl = new AbortController();
    setError(null);
    const job = async () => {
      if (mode === 'read') {
        setPhase('waiting');
        const value = await readUrlFromTag(ctrl.signal);
        if (ctrl.signal.aborted) return;
        setPhase('done');
        onRead?.(value);
        return;
      }
      // A retry after a failed lock does not write again.
      if (!writtenRef.current) {
        setPhase('waiting');
        await writeUrlToTag(url!, ctrl.signal);
        writtenRef.current = true;
      }
      if (lockRef.current) {
        if (ctrl.signal.aborted) return;
        setPhase('locking');
        await lockTag(ctrl.signal);
        setLocked(true);
      }
      if (!ctrl.signal.aborted) setPhase('done');
    };
    job().catch((err: unknown) => {
      if (ctrl.signal.aborted) return;
      setPhase('error');
      setError(nfcErrorMessage(err instanceof NfcError ? err.code : mode === 'read' ? 'read_failed' : 'write_failed', locale));
    });
    return () => ctrl.abort();
  }, [mode, url, locale, onRead, attempt]);

  const retry = () => setAttempt((n) => n + 1);
  const lockNow = () => {
    setLock(true);
    lockRef.current = true;
    setAttempt((n) => n + 1);
  };
  const written = writtenRef.current;

  const message =
    phase === 'done'
      ? mode === 'write'
        ? locked
          ? tr
            ? 'Yazıldı ve kilitlendi. Bir telefonla dokunarak deneyin.'
            : 'Written and locked. Test it by tapping with a phone.'
          : tr
            ? 'Etikete yazıldı. Bir telefonla dokunarak deneyin.'
            : 'Written. Test it by tapping with a phone.'
        : tr
          ? 'Etiket okundu.'
          : 'Tag read.'
      : phase === 'locking'
        ? tr
          ? 'Kilitleniyor: etiketi telefonda tutmaya devam edin.'
          : 'Locking: keep the tag on the phone.'
        : phase === 'error'
          ? error
          : mode === 'write' && !url
            ? tr
              ? 'Bağlantı hazırlanıyor…'
              : 'Preparing the link…'
            : tr
              ? 'Telefonunuzun arkasını etikete yaklaştırın.'
              : 'Hold the back of your phone to the tag.';

  // One line under the status: what the tap does and what to do next.
  const help =
    phase === 'waiting' && !(mode === 'write' && !url)
      ? mode === 'read'
        ? tr
          ? 'Müşterinin NFC anahtarlığı ya da kartı okununca üye kasada açılır.'
          : 'When the customer’s NFC fob or card is read, the member opens at the counter.'
        : target === 'tag'
          ? tr
            ? 'Etikete katılım bağlantısı yazılır; müşteri telefonunu dokundurunca katılım sayfası açılır. Etiketteki eski bağlantı silinir.'
            : 'The join link is written to the tag; a customer taps their phone to open the join page. Any link already on the tag is replaced.'
          : tr
            ? 'Anahtarlığa bu müşterinin kart bağlantısı yazılır. Anahtarlıktaki eski bağlantı silinir.'
            : 'This customer’s card link is written to the fob. Any link already on the fob is replaced.'
      : phase === 'done' && mode === 'write' && canLock && !locked
        ? tr
          ? 'İsterseniz şimdi kilitleyin: bağlantı bir daha değiştirilemez. Kilit geri alınamaz.'
          : 'You can lock it now: the link can never be changed again. Locking cannot be undone.'
        : null;

  return (
    <Modal
      onClose={onClose}
      title={title}
      size={420}
      footer={
        <>
          {phase === 'done' && mode === 'write' && canLock && !locked && (
            <button type="button" className="bz-btn-ghost inline-flex items-center justify-center gap-1.5" onClick={lockNow}>
              <Lock size={14} aria-hidden="true" />{' '}
              {target === 'fob' ? (tr ? 'Anahtarlığı kilitle' : 'Lock the fob') : tr ? 'Etiketi kilitle' : 'Lock the tag'}
            </button>
          )}
          <button type="button" className={phase === 'done' ? 'bz-btn-primary' : 'bz-btn-ghost'} onClick={onClose}>
            {phase === 'waiting' || phase === 'locking' ? (tr ? 'Vazgeç' : 'Cancel') : tr ? 'Kapat' : 'Close'}
          </button>
          {phase === 'error' && (
            <button type="button" className="bz-btn-primary" onClick={retry}>
              {written && lock
                ? tr
                  ? 'Kilitlemeyi tekrar dene'
                  : 'Retry locking'
                : mode === 'read'
                  ? tr
                    ? 'Yeniden okut'
                    : 'Read again'
                  : tr
                    ? 'Yeniden yaz'
                    : 'Write again'}
            </button>
          )}
        </>
      }
    >
      <div className="flex flex-col items-center py-4 text-center">
        <span
          className={`flex h-20 w-20 items-center justify-center rounded-full ${phase === 'done' ? 'bg-[#E7F6EA] text-[#23863A]' : 'bg-pn-accent text-white'} ${phase === 'waiting' || phase === 'locking' ? 'pulse-heartbeat' : ''}`}
        >
          {phase === 'done' ? locked ? <Lock size={32} /> : <Check size={34} /> : phase === 'locking' ? <Lock size={32} /> : <Nfc size={34} />}
        </span>
        <p className="mt-4 text-[15px] font-medium text-pn-ink" role="status" aria-live="polite">
          {message}
        </p>
        {help && <p className="mt-1.5 max-w-[320px] text-[13px] leading-relaxed text-[#525252]">{help}</p>}
        {mode === 'write' && url && phase === 'waiting' && (
          <p className="mt-2 max-w-full break-all text-[12px] text-[#737373]">{url}</p>
        )}
        {canLock && phase === 'waiting' && (
          <label className="mt-4 flex min-h-11 w-full cursor-pointer items-start gap-2.5 rounded-[18px] bg-pn-canvas p-3 text-left">
            <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-pn-ink" checked={lock} onChange={(e) => setLock(e.target.checked)} />
            <span className="text-[13px] leading-relaxed text-[#404040]">
              <strong className="text-pn-ink">{tr ? 'Yazdıktan sonra kilitle' : 'Lock after writing'}</strong>{' '}
              {target === 'tag'
                ? tr
                  ? '(önerilir): masadaki etiketi kimse başka bir adrese yönlendiremez. Geri alınamaz.'
                  : '(recommended): nobody can point the table sticker to another address. Cannot be undone.'
                : tr
                  ? ': anahtarlıktaki kart bağlantısı değiştirilemez. Geri alınamaz.'
                  : ': the card link on the fob cannot be changed. Cannot be undone.'}
            </span>
          </label>
        )}
      </div>
    </Modal>
  );
}
