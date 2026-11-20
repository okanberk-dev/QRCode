'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { AlertTriangle, ImagePlus, Link2, Loader2, X } from 'lucide-react';
import { isImageFile, usePhotoUpload } from '../data/usePhotoUpload';
import { useStudio } from '../studio/studio-context';

/**
 * Item photo in the panel: a 4:3 drop zone (≤240 px) — pick, drop or paste a
 * file, or add a link. The phone's own file shows at once while the
 * compressed copy uploads; only the latest upload counts. The result goes into
 * the form (saved with "Kaydet"); saving waits while an upload runs.
 */
export function PhotoField({
  value, onChange, readOnly, onUploadingChange, buttonRef,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  readOnly: boolean;
  onUploadingChange: (uploading: boolean) => void;
  buttonRef?: RefObject<HTMLButtonElement | null>;
}) {
  const { copy, restaurantId, isTr } = useStudio();
  const upload = usePhotoUpload(restaurantId, isTr);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [linkOpen, setLinkOpen] = useState(() => Boolean(value && !value.startsWith('data:')));
  const [link, setLink] = useState(() => (value && !value.startsWith('data:') ? value : ''));
  const [linkError, setLinkError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const seq = useRef(0);
  const objectUrl = useRef<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    };
  }, []);
  useEffect(() => onUploadingChange(uploading), [uploading, onUploadingChange]);

  const setObjectUrl = (url: string | null) => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = url;
    setPreview(url);
  };

  const pick = async (file: File) => {
    if (readOnly) return;
    const mine = ++seq.current;
    setError(null);
    setObjectUrl(isImageFile(file) ? URL.createObjectURL(file) : null);
    setUploading(true);
    const result = await upload(file, 'item');
    if (!mounted.current || mine !== seq.current) return;
    setUploading(false);
    setObjectUrl(null);
    if (result.ok) onChange(result.url);
    else setError(result.message);
  };

  const remove = () => {
    seq.current += 1;
    setUploading(false);
    setObjectUrl(null);
    setError(null);
    setLink('');
    onChange(null);
  };

  const shown = preview ?? (value?.trim() ? value : null);

  return (
    <div data-dropzone="">
      <p className="mb-1.5 text-[12px] font-semibold text-[#0A0A0A]">{copy.photo.label}</p>
      <div className="flex flex-wrap items-start gap-3">
        <button
          ref={buttonRef}
          type="button"
          disabled={readOnly}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            if (readOnly || !e.dataTransfer.types.includes('Files')) return;
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            if (readOnly) return;
            e.preventDefault();
            setOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void pick(file);
          }}
          onPaste={(e) => {
            const file = e.clipboardData.files?.[0];
            if (!isImageFile(file) || readOnly) return;
            e.preventDefault();
            void pick(file);
          }}
          aria-label={shown ? copy.photo.change : copy.photo.add}
          className={`relative aspect-[4/3] w-full max-w-[240px] overflow-hidden rounded-xl border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] ${
            shown ? 'border-transparent bg-[#F5F5F5]' : 'border-dashed border-[#D4D4D4] bg-[#FAFAFA] text-[#525252] hover:border-[#0A0A0A]'
          } ${over ? 'ring-2 ring-[#C6F24E]' : ''}`}
        >
          {shown ? (
            <img src={shown} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full flex-col items-center justify-center gap-1.5 px-3 text-center text-[12.5px] font-medium">
              <ImagePlus size={22} strokeWidth={1.75} aria-hidden="true" />
              {copy.photo.add}
            </span>
          )}
          {uploading && (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-white/75 text-[12.5px] font-medium text-[#0A0A0A]">
              <Loader2 size={20} className="animate-spin" aria-hidden="true" />
              {copy.photo.preparing}
            </span>
          )}
          {over && (
            <span className="absolute inset-0 flex items-center justify-center bg-[#EAF9B8]/90 text-[13px] font-semibold text-[#0A0A0A]">
              {copy.photo.dropHere}
            </span>
          )}
        </button>
        <div className="min-w-[160px] flex-1 space-y-2">
          {error ? (
            <p role="alert" className="flex items-start gap-1.5 text-[12.5px] font-medium text-[#991B1B]">
              <AlertTriangle size={13} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden="true" />
              {error}
            </p>
          ) : !shown ? (
            <p className="text-[12.5px] leading-snug text-[#737373]">{copy.photo.help}</p>
          ) : null}
          {!readOnly && (
            <div className="flex flex-wrap gap-2">
              {shown && !uploading && (
                <>
                  <button type="button" onClick={() => fileRef.current?.click()} className="bz-btn bz-btn-sm min-h-11 pointer-fine:min-h-8">
                    {copy.photo.change}
                  </button>
                  <button type="button" onClick={remove} className="bz-btn bz-btn-sm min-h-11 pointer-fine:min-h-8">
                    <X size={13} strokeWidth={2} aria-hidden="true" />
                    {copy.photo.remove}
                  </button>
                </>
              )}
              {!linkOpen && (
                <button type="button" onClick={() => setLinkOpen(true)} className="bz-btn bz-btn-sm min-h-11 pointer-fine:min-h-8">
                  <Link2 size={13} strokeWidth={2} aria-hidden="true" />
                  {copy.photo.addByLink}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {linkOpen && !readOnly && (
        <label className="mt-3 block">
          <span className="mb-1.5 block text-[12px] font-semibold text-[#0A0A0A]">{copy.photo.link}</span>
          <input
            type="url"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={1000}
            value={link}
            placeholder={copy.photo.linkPlaceholder}
            aria-invalid={linkError ? true : undefined}
            onChange={(e) => {
              const next = e.target.value;
              setLink(next);
              const trimmed = next.trim();
              if (!trimmed) {
                setLinkError(null);
                if (value && !value.startsWith('data:')) onChange(null);
                return;
              }
              if (!/^https?:\/\//i.test(trimmed)) {
                setLinkError(copy.photo.linkInvalid);
                return;
              }
              setLinkError(null);
              seq.current += 1;
              setUploading(false);
              setObjectUrl(null);
              onChange(trimmed);
            }}
            className="bz-input"
          />
          {linkError && <span role="alert" className="mt-1 block text-[12px] text-[#DC2626]">{linkError}</span>}
        </label>
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
          if (file) void pick(file);
        }}
      />
    </div>
  );
}
