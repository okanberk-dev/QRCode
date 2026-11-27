'use client';

import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent } from 'react';
import { ImagePlus, Loader2, UtensilsCrossed, X } from 'lucide-react';
import { isImageFile } from '../data/usePhotoUpload';
import { useMenuCopy } from '../kit/useMenuCopy';

/**
 * "Menü logosu" (spec §7.11): a 72 px tile with Logo yükle / Logoyu değiştir /
 * Kaldır; pick, drop or paste an image. The phone's own file shows at once
 * while the compressed copy uploads; the stored image goes into the draft and
 * is saved only with "Uygula".
 */
export function LogoField({
  value, accent, uploading, disabled, onFile, onRemove,
}: {
  /** Draft logo (data URL or link), `null` = none. */
  value: string | null;
  accent: string;
  uploading: boolean;
  disabled?: boolean;
  onFile: (file: File) => void;
  onRemove: () => void;
}) {
  const copy = useMenuCopy();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const objectUrl = useRef<string | null>(null);
  const [local, setLocal] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  const setObjectUrl = (url: string | null) => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = url;
    setLocal(url);
  };
  useEffect(() => () => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
  }, []);
  // The upload settled (or was dropped): show the draft value again.
  useEffect(() => {
    if (!uploading) setObjectUrl(null);
  }, [uploading]);

  const take = (file: File | null | undefined) => {
    if (disabled || !file) return;
    setObjectUrl(isImageFile(file) ? URL.createObjectURL(file) : null);
    onFile(file);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOver(false);
    take(e.dataTransfer.files?.[0]);
  };
  const onPaste = (e: ClipboardEvent<HTMLDivElement>) => {
    const file = e.clipboardData.files?.[0];
    if (!isImageFile(file)) return;
    e.preventDefault();
    take(file);
  };

  const shown = local ?? value;

  return (
    <div
      data-dropzone
      onDragOver={(e) => {
        if (disabled || !e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      onPaste={onPaste}
      className={`flex items-start gap-4 rounded-[20px] border border-dashed bg-pn-canvas p-3.5 transition-colors ${
        over ? 'border-pn-accent ring-2 ring-pn-accent' : 'border-pn-line-strong'
      }`}
    >
      <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[20px] bg-white ring-1 ring-pn-line">
        {shown ? (
          <img src={shown} alt="" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center" style={{ color: accent }} aria-hidden="true">
            <UtensilsCrossed size={24} strokeWidth={1.75} />
          </span>
        )}
        {uploading && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/75" aria-hidden="true">
            <Loader2 size={18} className="animate-spin text-pn-ink" />
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={disabled || uploading}
            aria-busy={uploading || undefined}
            className="bz-btn min-h-11 pointer-fine:min-h-9"
          >
            <ImagePlus size={14} strokeWidth={2} aria-hidden="true" />
            {value ? copy.design.changeLogo : copy.design.uploadLogo}
          </button>
          {(value || uploading) && (
            <button type="button" onClick={onRemove} disabled={disabled} className="bz-btn-ghost min-h-11 pointer-fine:min-h-9">
              <X size={13} strokeWidth={2} aria-hidden="true" />
              {copy.design.removeLogo}
            </button>
          )}
        </div>
        <p className="text-[13px] leading-relaxed text-[#737373]">{copy.design.logoHint}</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            take(file);
          }}
        />
      </div>
    </div>
  );
}
