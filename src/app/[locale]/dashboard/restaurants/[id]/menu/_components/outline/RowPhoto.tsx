'use client';

import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { AlertTriangle, ImagePlus, Loader2, Plus } from 'lucide-react';
import { isImageFile } from '../data/usePhotoUpload';
import { useStudio } from '../studio/studio-context';

/**
 * The row thumbnail (48 px narrow / 40 px medium+): empty → pick a file,
 * with a photo → open the item at its photo. Drop a file on it (or anywhere
 * on the row, or paste one while the row has focus — `pickRef`). The phone's
 * own file shows at once (object URL) while the compressed copy uploads; only
 * the latest upload writes (sequence guard). Saved silently: the row flashes,
 * the SaveIndicator offers "Geri al".
 *
 * Completion workflow (Fotoğrafsız filter): a dashed "+" tile; after a
 * successful upload the row lingers 1.2 s, then leaves the filtered list.
 */
export function RowPhoto({
  itemId, name, imageUrl, editable, completion, onOpenAtPhoto, pickRef,
}: {
  itemId: string;
  name: string;
  imageUrl: string | null;
  editable: boolean;
  completion: boolean;
  onOpenAtPhoto: () => void;
  pickRef: MutableRefObject<((file: File) => void) | null>;
}) {
  const { copy, actions, linger } = useStudio();
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const seq = useRef(0);
  const objectUrl = useRef<string | null>(null);
  const mounted = useRef(true);

  const setObjectUrl = (url: string | null) => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = url;
    setPreview(url);
  };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    };
  }, []);

  const handle = async (file: File) => {
    if (!editable) return;
    const mine = ++seq.current;
    setError(null);
    setObjectUrl(isImageFile(file) ? URL.createObjectURL(file) : null);
    setUploading(true);
    const result = await actions.setItemPhoto(itemId, file);
    if (!mounted.current || mine !== seq.current) return;
    setUploading(false);
    setObjectUrl(null);
    if (!result.ok) setError(result.message);
    else if (completion) linger(itemId);
  };
  const handleRef = useRef(handle);
  handleRef.current = handle;
  useEffect(() => {
    pickRef.current = (file: File) => void handleRef.current(file);
    return () => {
      pickRef.current = null;
    };
  }, [pickRef]);

  const shown = preview ?? imageUrl;
  const size =
    'h-12 w-12 rounded-[10px] pointer-fine:@min-[480px]/outline:h-10 pointer-fine:@min-[480px]/outline:w-10 pointer-fine:@min-[480px]/outline:rounded-lg';
  const dashed = completion && !shown;

  return (
    <div className="relative">
      <button
        type="button"
        data-dropzone=""
        disabled={!editable && !shown}
        onClick={() => (shown && !error ? onOpenAtPhoto() : editable ? fileRef.current?.click() : undefined)}
        onDragOver={(e) => {
          if (!editable || !e.dataTransfer.types.includes('Files')) return;
          e.preventDefault();
          e.stopPropagation();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          if (!editable) return;
          e.preventDefault();
          e.stopPropagation();
          setOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void handle(file);
        }}
        aria-label={shown ? copy.item.photoAria(name) : copy.item.addPhotoAria(name)}
        className={`relative flex shrink-0 items-center justify-center overflow-hidden ${size} ${
          dashed
            ? 'border-2 border-dashed border-[#D4D4D4] bg-white text-[#525252] hover:border-[#0A0A0A]'
            : shown
              ? 'border border-[#EDEDED] bg-[#F5F5F5]'
              : error
                ? 'border border-dashed border-[#FECACA] bg-[#FEF2F2] text-[#991B1B]'
                : 'border border-[#EDEDED] bg-[#FAFAFA] text-[#A3A3A3] hover:text-[#0A0A0A]'
        } ${over ? 'ring-2 ring-[#C6F24E]' : ''} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]`}
      >
        {shown ? (
          <img src={shown} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : error ? (
          <AlertTriangle size={16} strokeWidth={2} aria-hidden="true" />
        ) : dashed ? (
          <>
            <Plus size={14} strokeWidth={2.25} aria-hidden="true" />
            <span className="sr-only">{copy.item.completionPhoto}</span>
          </>
        ) : (
          <ImagePlus size={16} strokeWidth={1.75} aria-hidden="true" />
        )}
        {uploading && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/70" aria-hidden="true">
            <Loader2 size={16} className="animate-spin text-[#0A0A0A]" />
          </span>
        )}
        {over && (
          <span className="absolute inset-0 flex items-center justify-center bg-[#EAF9B8]/90 text-[12px] font-semibold text-[#0A0A0A]">
            {copy.photo.dropHere}
          </span>
        )}
      </button>
      {uploading && <span className="sr-only" role="status">{copy.photo.uploading}</span>}
      {error && (
        <p role="alert" className="absolute left-0 top-full z-10 mt-1 w-[180px] rounded-md bg-white px-2 py-1 text-[12px] leading-snug text-[#991B1B] shadow-sm ring-1 ring-[#FECACA]">
          {error}{' '}
          <button type="button" onClick={() => fileRef.current?.click()} className="font-semibold underline underline-offset-2">
            {copy.photo.retry}
          </button>
        </p>
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
          if (file) void handle(file);
        }}
      />
    </div>
  );
}

/** Open the hidden file picker of a row's photo (⋯ "Fotoğraf ekle"). */
export function openRowPhotoPicker(itemId: string): void {
  const input = document.querySelector<HTMLInputElement>(`#menu-row-li-${CSS.escape(itemId)} input[type="file"]`);
  input?.click();
}
