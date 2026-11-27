'use client';

import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent, type Ref } from 'react';
import { ImageIcon, ImagePlus, Loader2, PanelTop, X } from 'lucide-react';
import { isImageFile } from '../data/usePhotoUpload';
import { useMenuCopy } from '../kit/useMenuCopy';

/**
 * "Kapak fotoğrafı" (menu-design-final §11.1): LogoField at 16:9 — pick, drop
 * or paste; the phone's own file shows at once while the compressed copy
 * uploads (the latest pick wins, Kaldır cancels an upload in flight, both in
 * `useThemeDraft`). The stored image goes into the draft and is saved only
 * with "Uygula". When the header does not show the cover yet, one button
 * switches it to "Kapak".
 */
export function CoverField({
  value, uploading, disabled, onFile, onRemove, onShowInHeader, buttonRef,
}: {
  /** Draft cover (data URL), `null` = none. */
  value: string | null;
  uploading: boolean;
  disabled?: boolean;
  onFile: (file: File) => void;
  onRemove: () => void;
  /** Set when the header is not "cover" yet. */
  onShowInHeader?: () => void;
  buttonRef?: Ref<HTMLButtonElement>;
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
  // The upload settled (or was cancelled): show the draft value again.
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
      className={`flex flex-col gap-3.5 rounded-[20px] border border-dashed bg-pn-canvas p-3.5 transition-colors @min-[440px]:flex-row @min-[440px]:items-start ${
        over ? 'border-pn-accent ring-2 ring-pn-accent' : 'border-pn-line-strong'
      }`}
    >
      <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-[20px] bg-white ring-1 ring-pn-line @min-[440px]:w-[176px]">
        {shown ? (
          <img src={shown} alt="" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-[linear-gradient(160deg,#F7F6F3,#EDEBE6)] text-[#A3A3A3]" aria-hidden="true">
            <ImageIcon size={26} strokeWidth={1.5} />
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
            ref={buttonRef}
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={disabled || uploading}
            aria-busy={uploading || undefined}
            className="bz-btn min-h-11 pointer-fine:min-h-9"
          >
            <ImagePlus size={14} strokeWidth={2} aria-hidden="true" />
            {value ? copy.design.changeCover : copy.design.uploadCover}
          </button>
          {(value || uploading) && (
            <button type="button" onClick={onRemove} disabled={disabled} className="bz-btn-ghost min-h-11 pointer-fine:min-h-9">
              <X size={13} strokeWidth={2} aria-hidden="true" />
              {copy.design.removeCover}
            </button>
          )}
        </div>
        <p className="text-[13px] leading-relaxed text-[#737373]">{copy.design.coverHint}</p>
        {value && !uploading && onShowInHeader && (
          <button
            type="button"
            onClick={onShowInHeader}
            disabled={disabled}
            className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-full bg-pn-accent px-3.5 text-[13px] font-medium text-white transition-colors hover:bg-pn-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent disabled:opacity-60 pointer-fine:min-h-9"
          >
            <PanelTop size={14} strokeWidth={2} aria-hidden="true" />
            {copy.design.showCoverInHeader}
          </button>
        )}
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
