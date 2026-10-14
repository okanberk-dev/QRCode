'use client';

// Denetim Merkezi — herkese açık doldurma sayfasının cevap girişleri (spec §3.8).
//
// `PublicAuditView`'ten ayrıldı. İki görünüm:
//   • inline: kontrol listesi — tüm maddeler tek sayfada, her maddenin kendi
//     cevap kontrolü var (Evet/Hayır iki büyük düğme, 1-5 beş düğme, not, fotoğraf)
//   • step  : adım adım (test / uzun form) — bir soru bir ekran
//
// Seçimler yerel `<input type="radio|checkbox">` + görsel etiket: ok tuşları,
// grup semantiği ve ekran okuyucu desteği ücretsiz; dokunma hedefi ≥ 48 px.
// Seçili durumun vurgu rengi restoranın rengidir; üstündeki yazı rengi
// `readableOn` ile kontrastlı seçilir (koyu marka renginde beyaz).

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Camera, Check, Loader2, X } from 'lucide-react';
import { compressImage } from '@/lib/client-image';
import { normalizeQuestionOptions } from '@/lib/audits/options';
import { readableOn } from '@/lib/audits/kind';
import { PHOTO_MAX_BYTES, PHOTOS_TOTAL_MAX_BYTES } from '@/lib/audits/submit-guards';
import type { AuditQuestionType } from '@/lib/audits/types';

export type PublicAnswerValue = string | string[] | number | null;

export interface PublicQuestion {
  id: string;
  type: AuditQuestionType;
  prompt: string;
  helpText: string | null;
  options: unknown;
  isRequired: boolean;
  sortOrder?: number;
  weight?: number;
}

export interface PublicQuestionInputProps {
  question: PublicQuestion;
  value: PublicAnswerValue;
  onChange: (value: PublicAnswerValue) => void;
  /** Geçerli hex (çağıran `safeAccent` ile temizler). */
  accent: string;
  isTr: boolean;
  variant: 'inline' | 'step';
  /** Görünür başlığın id'si (radyo grubunun erişilebilir adı). */
  labelledBy?: string;
  /** Yardım metni / hata metninin id'leri (`aria-describedby`). */
  describedBy?: string;
  /** Bu sorunun DIŞINDAKİ fotoğraf cevaplarının toplam uzunluğu (toplam sınır için). */
  photoBytesElsewhere?: number;
}

const TEXT_MAX_CHARS = 2000;
/** Tek fotoğraf için istemci hedefi: sunucu sınırının (800 KB) altında, 4 fotoğraf toplam sınıra sığar. */
const PHOTO_TARGET_BYTES = Math.min(PHOTO_MAX_BYTES, 600 * 1024);
/** Küçük + düşük kalite (ürün kararı: boyut önemli, kalite değil). Sığmazsa bir kademe küçültülür. */
const PHOTO_LADDER: ReadonlyArray<{ maxDim: number; quality: number }> = [
  { maxDim: 1024, quality: 0.5 },
  { maxDim: 800, quality: 0.4 },
  { maxDim: 640, quality: 0.32 },
];

const FOCUS_RING =
  'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#0A0A0A]';

function selectedStyle(accent: string) {
  return { background: accent, color: readableOn(accent), borderColor: '#0A0A0A' } as const;
}

// ─── Seçim kontrolleri ──────────────────────────────────────────────────

function Tile({
  kind,
  name,
  label,
  ariaLabel,
  checked,
  onChange,
  accent,
  grow = false,
  big = false,
}: {
  kind: 'radio' | 'checkbox';
  name: string;
  label: string;
  ariaLabel?: string;
  checked: boolean;
  onChange: () => void;
  accent: string;
  grow?: boolean;
  big?: boolean;
}) {
  return (
    <label className={`relative ${grow ? 'min-w-0 flex-1' : ''}`}>
      <input
        type={kind}
        name={name}
        checked={checked}
        onChange={onChange}
        aria-label={ariaLabel}
        className="peer sr-only"
      />
      <span
        className={[
          'flex min-h-12 w-full cursor-pointer select-none items-center justify-center rounded-xl border-2 px-3 text-center',
          big ? 'text-[16px] font-semibold' : 'text-[15px] font-semibold',
          checked ? '' : 'border-[#E5E5E5] bg-white text-[#0A0A0A] hover:border-[#A3A3A3] hover:bg-[#FAFAFA]',
          'transition-colors',
          FOCUS_RING,
        ].join(' ')}
        style={checked ? selectedStyle(accent) : undefined}
      >
        {label}
      </span>
    </label>
  );
}

function Row({
  kind,
  name,
  label,
  checked,
  onChange,
  accent,
}: {
  kind: 'radio' | 'checkbox';
  name: string;
  label: string;
  checked: boolean;
  onChange: () => void;
  accent: string;
}) {
  return (
    <label className="relative block">
      <input type={kind} name={name} checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        className={[
          'flex min-h-12 w-full cursor-pointer select-none items-center gap-3 rounded-xl border-2 px-4 py-2.5 text-left text-[15px] transition-colors',
          checked
            ? 'border-[#0A0A0A] bg-[#FAFAFA] shadow-[inset_4px_0_0_0_var(--row-accent)]'
            : 'border-[#E5E5E5] bg-white hover:border-[#A3A3A3] hover:bg-[#FAFAFA]',
          FOCUS_RING,
        ].join(' ')}
        style={{ ['--row-accent' as string]: accent }}
      >
        <span
          aria-hidden="true"
          className={`inline-flex h-5 w-5 shrink-0 items-center justify-center border-2 ${
            kind === 'radio' ? 'rounded-full' : 'rounded-md'
          } ${checked ? 'border-[#0A0A0A]' : 'border-[#D4D4D4]'}`}
          style={checked && kind === 'checkbox' ? { background: accent } : undefined}
        >
          {checked && kind === 'radio' && (
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
          )}
          {checked && kind === 'checkbox' && (
            <Check size={12} strokeWidth={3} style={{ color: readableOn(accent) }} />
          )}
        </span>
        <span className="min-w-0 flex-1 break-words">{label}</span>
      </span>
    </label>
  );
}

// ─── Ana bileşen ────────────────────────────────────────────────────────

export default function PublicQuestionInput({
  question,
  value,
  onChange,
  accent,
  isTr,
  variant,
  labelledBy,
  describedBy,
  photoBytesElsewhere = 0,
}: PublicQuestionInputProps) {
  const locale = isTr ? 'tr' : 'en';
  const options = normalizeQuestionOptions(question.type, question.options, locale) ?? [];
  const groupName = `q-${question.id}`;
  const filled =
    value !== null &&
    value !== undefined &&
    !(typeof value === 'string' && value.trim() === '') &&
    !(Array.isArray(value) && value.length === 0);
  const canClear =
    !question.isRequired &&
    filled &&
    (question.type === 'yes_no' || question.type === 'scale' || question.type === 'single' || question.type === 'multi');

  const clearButton = canClear ? (
    <button
      type="button"
      className="mt-1.5 inline-flex min-h-9 items-center text-[12.5px] text-[#737373] underline underline-offset-2 hover:text-[#0A0A0A]"
      onClick={() => onChange(null)}
    >
      {isTr ? 'Seçimi temizle' : 'Clear selection'}
    </button>
  ) : null;

  // Seçeneği olmayan seçmeli soru (yanlış yapılandırma): sessiz kalma.
  if ((question.type === 'single' || question.type === 'multi' || question.type === 'yes_no') && options.length === 0) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3 text-[12px] text-[#92400E]">
        <AlertTriangle size={14} strokeWidth={2.2} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>
          {isTr
            ? 'Bu madde için seçenek tanımlanmamış. İşletmeyle iletişime geç.'
            : 'No options are set for this item. Contact the business.'}
        </span>
      </div>
    );
  }

  if (question.type === 'yes_no') {
    return (
      <div>
        <div
          role="radiogroup"
          aria-labelledby={labelledBy}
          aria-describedby={describedBy}
          className="grid grid-cols-2 gap-2"
        >
          {options.map((opt) => (
            <Tile
              key={opt}
              kind="radio"
              name={groupName}
              label={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
              accent={accent}
              big
            />
          ))}
        </div>
        {clearButton}
      </div>
    );
  }

  if (question.type === 'scale') {
    const numVal = typeof value === 'number' ? value : null;
    const labels = isTr
      ? ['Çok kötü', 'Kötü', 'Orta', 'İyi', 'Mükemmel']
      : ['Very poor', 'Poor', 'Average', 'Good', 'Excellent'];
    return (
      <div>
        <div
          role="radiogroup"
          aria-labelledby={labelledBy}
          aria-describedby={describedBy}
          className="flex gap-2"
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <Tile
              key={n}
              kind="radio"
              name={groupName}
              label={String(n)}
              ariaLabel={`${n} — ${labels[n - 1]}`}
              checked={numVal === n}
              onChange={() => onChange(n)}
              accent={accent}
              grow
              big
            />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-[#737373]" aria-hidden="true">
          <span>{labels[0]}</span>
          <span>{labels[4]}</span>
        </div>
        {clearButton}
      </div>
    );
  }

  if (question.type === 'single') {
    return (
      <div>
        <div
          role="radiogroup"
          aria-labelledby={labelledBy}
          aria-describedby={describedBy}
          className="space-y-2"
        >
          {options.map((opt) => (
            <Row
              key={opt}
              kind="radio"
              name={groupName}
              label={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
              accent={accent}
            />
          ))}
        </div>
        {clearButton}
      </div>
    );
  }

  if (question.type === 'multi') {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div>
        <p className="mb-2 text-[12px] text-[#737373]">
          {isTr ? 'Birden fazla seçebilirsin' : 'Select all that apply'}
        </p>
        <div role="group" aria-labelledby={labelledBy} aria-describedby={describedBy} className="space-y-2">
          {options.map((opt) => (
            <Row
              key={opt}
              kind="checkbox"
              name={groupName}
              label={opt}
              checked={selected.includes(opt)}
              onChange={() =>
                onChange(selected.includes(opt) ? selected.filter((x) => x !== opt) : [...selected, opt])
              }
              accent={accent}
            />
          ))}
        </div>
        {clearButton}
      </div>
    );
  }

  if (question.type === 'text') {
    return (
      <AutoGrowTextarea
        value={typeof value === 'string' ? value : ''}
        onChange={(v) => onChange(v)}
        isTr={isTr}
        rows={variant === 'inline' ? 2 : 4}
        labelledBy={labelledBy}
        describedBy={describedBy}
      />
    );
  }

  if (question.type === 'file') {
    return (
      <PhotoInput
        value={value}
        onChange={onChange}
        accent={accent}
        isTr={isTr}
        compact={variant === 'inline'}
        photoBytesElsewhere={photoBytesElsewhere}
        labelledBy={labelledBy}
      />
    );
  }

  return null;
}

// ─── Not (otomatik büyüyen alan) ────────────────────────────────────────

function AutoGrowTextarea({
  value,
  onChange,
  isTr,
  rows,
  labelledBy,
  describedBy,
}: {
  value: string;
  onChange: (v: string) => void;
  isTr: boolean;
  rows: number;
  labelledBy?: string;
  describedBy?: string;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const fit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight + 2, 240)}px`;
  }, []);
  useEffect(() => {
    fit();
  }, [value, fit]);

  return (
    <div>
      <textarea
        ref={ref}
        rows={rows}
        className="bz-input resize-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={TEXT_MAX_CHARS}
        placeholder={isTr ? 'Yazmak istersen…' : 'Write here if you like…'}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        spellCheck
      />
      {value.length > TEXT_MAX_CHARS * 0.8 && (
        <p className="bz-mono mt-1 text-right text-[11px] text-[#A3A3A3]">
          {value.length} / {TEXT_MAX_CHARS}
        </p>
      )}
    </div>
  );
}

// ─── Fotoğraf ───────────────────────────────────────────────────────────

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

/**
 * Fotoğrafı küçültür: önce 1024 px / %50; sığmazsa 800 / %40, sonra 640 / %32.
 * Hiçbiri tek fotoğraf hedefine sığmazsa `null` (kullanıcıya dürüst mesaj).
 */
async function shrinkToTarget(file: File): Promise<string | null> {
  for (const step of PHOTO_LADDER) {
    const compressed = await compressImage(file, step);
    const url = await fileToDataUrl(compressed);
    if (url && url.length <= PHOTO_TARGET_BYTES) return url;
  }
  return null;
}

function PhotoInput({
  value,
  onChange,
  accent,
  isTr,
  compact,
  photoBytesElsewhere,
  labelledBy,
}: {
  value: PublicAnswerValue;
  onChange: (v: PublicAnswerValue) => void;
  accent: string;
  isTr: boolean;
  compact: boolean;
  photoBytesElsewhere: number;
  labelledBy?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dataUrl = typeof value === 'string' && value.startsWith('data:image/') ? value : null;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError(isTr ? 'Lütfen bir fotoğraf seç.' : 'Please pick an image.');
      return;
    }
    setBusy(true);
    try {
      const url = await shrinkToTarget(file);
      if (!url) {
        setError(
          isTr
            ? 'Fotoğraf çok büyük. Daha küçük bir fotoğraf dene.'
            : 'The photo is too large. Try a smaller one.',
        );
        return;
      }
      // Toplam sınır: bir gönderimdeki tüm fotoğraflar birlikte sunucu sınırını aşamaz.
      const ownBefore = dataUrl ? dataUrl.length : 0;
      if (photoBytesElsewhere + url.length > PHOTOS_TOTAL_MAX_BYTES && url.length > ownBefore) {
        setError(
          isTr
            ? 'Fotoğraflar toplamda çok büyük. Başka bir fotoğrafı kaldırıp tekrar dene.'
            : 'The photos are too large together. Remove another photo and try again.',
        );
        return;
      }
      onChange(url);
    } catch {
      setError(isTr ? 'Fotoğraf işlenemedi. Tekrar dene.' : 'Could not process the photo. Try again.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      {dataUrl ? (
        <div className="flex flex-col gap-3">
          <img
            src={dataUrl}
            alt={isTr ? 'Eklenen fotoğraf' : 'Attached photo'}
            className="max-h-[220px] w-auto max-w-full rounded-xl border border-[#EDEDED] object-contain"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="bz-btn-ghost min-h-11 gap-1.5 text-[13px]"
            >
              {busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Camera size={14} aria-hidden="true" />}
              {isTr ? 'Değiştir' : 'Replace'}
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={busy}
              className="bz-btn-ghost min-h-11 gap-1.5 text-[13px]"
            >
              <X size={14} aria-hidden="true" />
              {isTr ? 'Kaldır' : 'Remove'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          aria-labelledby={labelledBy}
          className={`flex w-full min-h-12 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-[#D4D4D4] bg-[#FAFAFA] px-4 text-center transition-colors hover:border-[#A3A3A3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A0A0A] ${
            compact ? 'py-4' : 'py-8'
          }`}
          style={busy ? { borderColor: accent } : undefined}
        >
          {busy ? (
            <Loader2 size={20} strokeWidth={2} className="animate-spin text-[#737373]" aria-hidden="true" />
          ) : (
            <Camera size={20} strokeWidth={1.8} className="text-[#737373]" aria-hidden="true" />
          )}
          <span className="text-[14px] font-semibold text-[#0A0A0A]">
            {busy ? (isTr ? 'İşleniyor…' : 'Processing…') : isTr ? 'Fotoğraf ekle' : 'Add photo'}
          </span>
        </button>
      )}
      {error && (
        <p role="alert" className="mt-2 flex items-start gap-1.5 text-[12.5px] text-[#991B1B]">
          <AlertTriangle size={13} strokeWidth={2.2} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
