'use client';

// Reads the QR on a customer's loyalty card with the device camera (§60).
// Uses the browser's BarcodeDetector (Chrome / Edge / Android); where it is
// missing (iOS Safari, Firefox) the dialog says so and the staff types the
// card code instead. No extra library.
import { useEffect, useRef, useState } from 'react';
import { Modal } from '@/components/ui';

interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
}
type BarcodeDetectorCtor = new (opts: { formats: string[] }) => BarcodeDetectorLike;

export function cameraScanSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'BarcodeDetector' in window &&
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

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
  const [error, setError] = useState<string | null>(
    cameraScanSupported()
      ? null
      : tr
        ? 'Bu tarayıcı kamerayla okutmayı desteklemiyor. Kartın altındaki 6 haneli kodu yazın.'
        : 'This browser cannot scan with the camera. Type the 6-character code under the card.',
  );

  useEffect(() => {
    if (!cameraScanSupported()) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    const Detector = (window as unknown as { BarcodeDetector: BarcodeDetectorCtor }).BarcodeDetector;
    const detector = new Detector({ formats: ['qr_code'] });

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        const video = videoRef.current;
        if (!video || stopped) return;
        video.srcObject = stream;
        await video.play();
        const tick = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const value = codes[0]?.rawValue;
            if (value) {
              stopped = true;
              onResult(value);
              return;
            }
          } catch {
            /* frame not ready */
          }
          raf = window.requestAnimationFrame(() => void tick());
        };
        void tick();
      } catch {
        setError(
          tr
            ? 'Kameraya izin verilmedi. Tarayıcı ayarlarından kamera iznini açın ya da kodu yazın.'
            : 'Camera access was denied. Allow it in the browser settings or type the code.',
        );
      }
    })();

    return () => {
      stopped = true;
      window.cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onResult, tr]);

  return (
    <Modal title={tr ? 'Kartı okut' : 'Scan the card'} onClose={onClose} size={420}>
      {error ? (
        <p className="text-[14px] text-[#525252]">{error}</p>
      ) : (
        <div>
          <video ref={videoRef} className="aspect-square w-full rounded-xl bg-black object-cover" muted playsInline />
          <p className="mt-3 text-[13px] text-[#525252]">
            {tr ? 'Müşterinin telefonundaki kart QR’ını çerçeveye getirin.' : 'Hold the QR on the customer’s phone inside the frame.'}
          </p>
        </div>
      )}
    </Modal>
  );
}
