import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Download, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui';

export function MenuQrModal({
  restaurantId, slug, copy, onClose,
}: {
  restaurantId: string;
  slug: string;
  copy: Record<string, string>;
  onClose: () => void;
}) {
  const [format, setFormat] = useState<'png' | 'svg'>('png');
  const [downloading, setDownloading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [previewSvg, setPreviewSvg] = useState<string | null>(null);
  const previewAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    previewAbort.current?.abort();
    const ctrl = new AbortController();
    previewAbort.current = ctrl;
    setErr(null);
    setPreviewSvg(null);
    fetch(`/api/restaurants/${restaurantId}/menu/qr?format=svg&width=400`, { signal: ctrl.signal })
      .then(async (res) => {
        if (!res.ok) {
          const e = await res.json().catch(() => null);
          throw new Error(e?.error ?? 'QR oluşturulamadı');
        }
        return res.text();
      })
      .then((svg) => setPreviewSvg(svg))
      .catch((e) => {
        if ((e as Error).name !== 'AbortError') setErr((e as Error).message);
      });
    return () => ctrl.abort();
  }, [restaurantId]);

  const download = async () => {
    setDownloading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/menu/qr?format=${format}`);
      if (!res.ok) {
        const e = await res.json().catch(() => null);
        throw new Error(e?.error ?? 'QR indirilemedi');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `menu-qr-${slug}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr((e as Error).message);
    }
    setDownloading(false);
  };

  return (
    <Modal size={520} title={copy.menuQr} onClose={onClose}>
      <div className="space-y-5">
        <div className="flex items-center justify-center rounded-3xl bg-gradient-to-br from-[#FAFAFA] to-[#F5F5F5] p-6 ring-1 ring-[#EDEDED] sm:p-8">
          {previewSvg ? (
            <div
              className="aspect-square w-full max-w-[240px] [&>svg]:h-full [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: previewSvg }}
            />
          ) : err ? (
            <div className="flex aspect-square w-full max-w-[240px] flex-col items-center justify-center gap-2 text-center">
              <AlertTriangle size={24} strokeWidth={2} className="text-[#DC2626]" />
              <p className="text-[13px] text-[#991B1B]">{err}</p>
            </div>
          ) : (
            <div className="flex aspect-square w-full max-w-[240px] items-center justify-center">
              <Loader2 size={28} className="animate-spin text-[#737373]" />
            </div>
          )}
        </div>

        <div>
          <p className="pulse-eyebrow mb-2 text-[#737373]">{copy.qrFormat}</p>
          <div className="flex gap-2">
            {(['png', 'svg'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`flex-1 rounded-full border px-4 py-2.5 text-[13px] font-medium transition-all ${
                  format === f
                    ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white shadow-sm'
                    : 'border-[#EDEDED] bg-white text-[#525252] hover:border-[#A3A3A3] hover:text-[#0A0A0A]'
                }`}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#EDEDED] pt-5">
          <button
            type="button"
            onClick={onClose}
            className="bz-btn"
          >
            {copy.cancel}
          </button>
          <button
            onClick={download}
            disabled={downloading || !previewSvg}
            className="bz-btn-lime disabled:opacity-50"
          >
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} strokeWidth={2} />}
            {copy.downloadQr}
          </button>
        </div>
      </div>
    </Modal>
  );
}
