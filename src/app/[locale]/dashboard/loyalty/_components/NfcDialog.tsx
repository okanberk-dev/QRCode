'use client';

// Write a link to an NFC tag, or read one, from the panel (CLAUDE.md §61).
// Web NFC: Chrome on Android. The dialog starts listening right away; the
// staff holds the phone's back to the tag.
import { useEffect, useState } from 'react';
import { Check, Nfc } from 'lucide-react';
import { Modal } from '@/components/ui';
import { NfcError, nfcErrorMessage, readUrlFromTag, writeUrlToTag } from '@/lib/web-nfc';

export default function NfcDialog({
  locale,
  mode,
  url,
  title,
  onRead,
  onClose,
}: {
  locale: 'tr' | 'en';
  mode: 'write' | 'read';
  /** Link to write (write mode). Null while it is being fetched. */
  url?: string | null;
  title: string;
  onRead?: (url: string) => void;
  onClose: () => void;
}) {
  const tr = locale === 'tr';
  const [state, setState] = useState<'waiting' | 'done' | 'error'>('waiting');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (mode === 'write' && !url) return;
    const ctrl = new AbortController();
    setState('waiting');
    setError(null);
    const run = mode === 'write' ? writeUrlToTag(url!, ctrl.signal).then(() => null) : readUrlFromTag(ctrl.signal);
    run
      .then((value) => {
        if (ctrl.signal.aborted) return;
        setState('done');
        if (mode === 'read' && value) onRead?.(value);
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        setState('error');
        setError(nfcErrorMessage(err instanceof NfcError ? err.code : 'read_failed', locale));
      });
    return () => ctrl.abort();
  }, [mode, url, locale, onRead, attempt]);

  const retry = () => setAttempt((n) => n + 1);

  return (
    <Modal
      onClose={onClose}
      title={title}
      size={420}
      footer={
        <div className="flex justify-end gap-2">
          {state === 'error' && (
            <button type="button" className="bz-btn-ghost" onClick={retry}>
              {tr ? 'Tekrar dene' : 'Try again'}
            </button>
          )}
          <button type="button" className="bz-btn-primary" onClick={onClose}>
            {state === 'done' ? (tr ? 'Tamam' : 'Done') : tr ? 'Kapat' : 'Close'}
          </button>
        </div>
      }
    >
      <div className="flex flex-col items-center py-4 text-center">
        <span
          className={`flex h-20 w-20 items-center justify-center rounded-full ${state === 'done' ? 'bg-[#EAF9B8] text-[#3F6212]' : 'bg-[#0A0A0A] text-[#C6F24E]'} ${state === 'waiting' ? 'pulse-heartbeat' : ''}`}
        >
          {state === 'done' ? <Check size={34} /> : <Nfc size={34} />}
        </span>
        <p className="mt-4 text-[15px] font-medium text-[#0A0A0A]">
          {state === 'done'
            ? mode === 'write'
              ? tr
                ? 'Etikete yazıldı. Bir telefonla dokunarak deneyin.'
                : 'Written. Test it by tapping with a phone.'
              : tr
                ? 'Etiket okundu.'
                : 'Tag read.'
            : state === 'error'
              ? error
              : mode === 'write' && !url
                ? tr
                  ? 'Bağlantı hazırlanıyor…'
                  : 'Preparing the link…'
                : tr
                  ? 'Telefonunuzun arkasını etikete yaklaştırın.'
                  : 'Hold the back of your phone to the tag.'}
        </p>
        {mode === 'write' && url && state !== 'done' && (
          <p className="mt-2 max-w-full break-all font-mono text-[11.5px] text-[#737373]">{url}</p>
        )}
      </div>
    </Modal>
  );
}
