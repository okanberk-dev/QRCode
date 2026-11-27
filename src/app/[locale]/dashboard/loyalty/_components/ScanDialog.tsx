'use client';

// Reads the QR on a customer's loyalty card with the device camera (§60).
// Uses the browser's BarcodeDetector (Chrome / Edge / Android); where it is
// missing (iOS Safari, Firefox) the dialog explains the other two ways: the
// phone's own Camera app (opens the card in staff mode, §61) or the code
// under the card. No extra library.
//
// Motion (loyalty-motion.css): a viewfinder with breathing corners and a
// sweeping line; on a read the corners lock in, the view flashes, a check
// draws and the scan sound plays, then the dialog hands the value over.
import { useEffect, useRef, useState } from 'react';
import { Camera, Keyboard, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui';
import { haptic, playSound } from '@/lib/loyalty-sound';
import '@/components/loyalty/loyalty-motion.css';

interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
}
type BarcodeDetectorCtor = new (opts: { formats: string[] }) => BarcodeDetectorLike;

/** How long the "read" moment shows before the value is handed over. */
const SUCCESS_MS = 560;

export function cameraScanSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'BarcodeDetector' in window &&
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

// Lavender reads on the dimmed camera picture (purple on near-black does not).
const CORNER = 'absolute h-8 w-8 border-[#DCD3F6]';

export default function ScanDialog({
  locale,
  onResult,
  onClose,
}: {
  locale: 'tr' | 'en';
  onResult: (value: string) => void;
  onClose: () => void;
}) {
  const tr = locale === 'tr';
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const [supported] = useState(() => cameraScanSupported());
  const [denied, setDenied] = useState(false);
  const [ready, setReady] = useState(false);
  const [found, setFound] = useState(false);

  useEffect(() => {
    if (!supported) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    let handOver = 0;
    const Detector = (window as unknown as { BarcodeDetector: BarcodeDetectorCtor }).BarcodeDetector;
    const detector = new Detector({ formats: ['qr_code'] });

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        const video = videoRef.current;
        if (!video || stopped) return;
        video.srcObject = stream;
        await video.play();
        setReady(true);
        const tick = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const value = codes[0]?.rawValue;
            if (value) {
              stopped = true;
              videoRef.current?.pause();
              setFound(true);
              playSound('card');
              haptic([12, 40, 20]);
              handOver = window.setTimeout(() => onResultRef.current(value), SUCCESS_MS);
              return;
            }
          } catch {
            /* frame not ready */
          }
          raf = window.requestAnimationFrame(() => void tick());
        };
        void tick();
      } catch {
        setDenied(true);
      }
    })();

    return () => {
      stopped = true;
      window.cancelAnimationFrame(raf);
      window.clearTimeout(handOver);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [supported]);

  return (
    <Modal title={tr ? 'Kartı okut' : 'Scan the card'} onClose={onClose} size={420}>
      {!supported || denied ? (
        <ScanHelp locale={locale} denied={denied} />
      ) : (
        <div>
          <div className="relative aspect-square w-full overflow-hidden rounded-[24px] bg-pn-ink">
            <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" muted playsInline />

            {/* Viewfinder: the frame dims the rest of the picture. */}
            <div
              className={`pointer-events-none absolute inset-[15%] rounded-[22px] ${found ? 'bzl-lock' : 'bzl-corners'}`}
              style={{ boxShadow: '0 0 0 999px rgba(10,10,10,0.42)' }}
              aria-hidden="true"
            >
              <span className={`${CORNER} left-0 top-0 rounded-tl-[22px] border-l-4 border-t-4`} />
              <span className={`${CORNER} right-0 top-0 rounded-tr-[22px] border-r-4 border-t-4`} />
              <span className={`${CORNER} bottom-0 left-0 rounded-bl-[22px] border-b-4 border-l-4`} />
              <span className={`${CORNER} bottom-0 right-0 rounded-br-[22px] border-b-4 border-r-4`} />
              {ready && !found && (
                <span className="absolute inset-0 overflow-hidden rounded-[22px]">
                  <span
                    className="bzl-scan-sweep absolute inset-x-0 top-0 h-full"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(166, 143, 235, 0) 0%, rgba(166, 143, 235, 0) 62%, rgba(166, 143, 235, 0.3) 94%, #A68FEB 100%)',
                    }}
                  />
                </span>
              )}
            </div>

            {!ready && !found && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
                <Loader2 size={22} className="animate-spin" aria-hidden="true" />
                <p className="text-[13px] opacity-80">{tr ? 'Kamera açılıyor…' : 'Opening the camera…'}</p>
              </div>
            )}

            {found && (
              <>
                <div className="bzl-flash pointer-events-none absolute inset-0 bg-pn-accent" aria-hidden="true" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="bzl-pop flex h-20 w-20 items-center justify-center rounded-full bg-pn-accent shadow-[0_18px_40px_-12px_rgba(0,0,0,0.5)]">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path className="bzl-draw" d="M5 12.5l4.2 4.2L19 7" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              </>
            )}
          </div>
          <p className="mt-3 text-[13px] text-[#525252]" role="status" aria-live="polite">
            {found
              ? tr
                ? 'Kart okundu.'
                : 'Card read.'
              : tr
                ? 'Müşterinin telefonundaki kart QR’ını çerçeveye getirin.'
                : 'Hold the QR on the customer’s phone inside the frame.'}
          </p>
        </div>
      )}
    </Modal>
  );
}

/** No camera scan here: the phone's own camera (staff mode) or the code. */
function ScanHelp({ locale, denied }: { locale: 'tr' | 'en'; denied: boolean }) {
  const tr = locale === 'tr';
  return (
    <div className="space-y-3">
      <p className="text-[14px] text-[#262626]">
        {denied
          ? tr
            ? 'Kameraya izin verilmedi. Tarayıcı ayarlarından kamera iznini açabilir ya da aşağıdaki yollardan birini kullanabilirsiniz.'
            : 'Camera access was denied. Allow it in the browser settings, or use one of the ways below.'
          : tr
            ? 'Bu tarayıcı panel içinden kamerayla okutmayı desteklemiyor (iPhone Safari gibi).'
            : 'This browser cannot scan from inside the panel (iPhone Safari, for example).'}
      </p>
      <div className="flex gap-3 rounded-[20px] border border-pn-line bg-pn-canvas p-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-pn-accent text-white">
          <Camera size={17} aria-hidden="true" />
        </span>
        <p className="text-[13px] leading-relaxed text-[#404040]">
          <strong className="text-pn-ink">{tr ? 'Telefonun kamerasıyla okutun.' : 'Scan with the phone’s camera.'}</strong>{' '}
          {tr
            ? 'Bu telefonda panele giriş yaptıysanız müşterinin kartı doğrudan kasa modunda açılır: damga ve ödül oradan verilir.'
            : 'If you are signed in to the panel on this phone, the customer’s card opens straight in staff mode: add stamps and give rewards there.'}
        </p>
      </div>
      <div className="flex gap-3 rounded-[20px] border border-pn-line bg-pn-canvas p-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-white text-[#525252] ring-1 ring-pn-line">
          <Keyboard size={17} aria-hidden="true" />
        </span>
        <p className="text-[13px] leading-relaxed text-[#404040]">
          <strong className="text-pn-ink">{tr ? 'Ya da kodu yazın.' : 'Or type the code.'}</strong>{' '}
          {tr ? 'Kartın altındaki 6 haneli kodu arama kutusuna yazın.' : 'Type the 6-character code under the card into the search box.'}
        </p>
      </div>
    </div>
  );
}
