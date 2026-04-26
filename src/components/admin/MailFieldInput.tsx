'use client';

import { useRef } from 'react';
import { Lock } from 'lucide-react';
import { getFieldValidation } from '@/lib/email/field-validation';

/**
 * Single editable copy field for the mail template editor. Centralised so
 * the flat editor (`MailTemplateEditor`) and the variant editor
 * (`FormConfirmationEditor`) render inputs identically — including the
 * KVKK lock badge, multiline behaviour, and red focus ring.
 *
 * `locked` reflects KVKK / security flags from `locked-fields.ts`. Server
 * still strips the field even if the UI is bypassed; the disabled input is
 * just the user-facing "you can't edit this" affordance.
 *
 * `placeholders` lists `${tokenName}` placeholders that the template's
 * render fn will substitute at send time. Click a chip to insert at cursor.
 */
export interface MailFieldDef {
  key: string;
  label: string;
  multiline?: boolean;
  hint?: string;
  locked?: boolean;
  lockReason?: string;
  placeholders?: readonly string[];
}

interface Props {
  field: MailFieldDef;
  value: string;
  onChange: (next: string) => void;
}

export default function MailFieldInput({ field, value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const baseClass =
    'mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-[14px] text-[#0A0A0A] outline-none focus:ring-2 focus:ring-[#C6F24E]';
  const inputClass = field.locked
    ? `${baseClass} border-red-200 bg-red-50/40 cursor-not-allowed opacity-70`
    : `${baseClass} border-[#EDEDED]`;
  const placeholder = field.locked
    ? '(Bu alan KVKK / güvenlik kilitli — kod-içi varsayılan kullanılır)'
    : '(Boş bırakırsan kod-içi varsayılan)';

  const insertPlaceholder = (token: string) => {
    if (field.locked) return;
    const literal = `\${${token}}`;
    const el = inputRef.current;
    if (!el) {
      onChange(value + literal);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + literal + value.slice(end);
    onChange(next);
    // Restore caret right after the inserted token on next paint.
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + literal.length;
      el.setSelectionRange(caret, caret);
    });
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <label htmlFor={field.key} className="block text-[13px] font-semibold text-[#0A0A0A]">
          {field.label}
        </label>
        {field.locked && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700"
            title={field.lockReason ?? 'KVKK / güvenlik nedeniyle düzenlenemez'}
          >
            <Lock size={10} strokeWidth={2.5} />
            KVKK
          </span>
        )}
      </div>
      {field.hint && <p className="mt-0.5 text-[11px] text-[#9CA3AF]">{field.hint}</p>}
      {field.locked && field.lockReason && (
        <p className="mt-0.5 text-[11px] font-medium text-red-700">{field.lockReason}</p>
      )}
      {field.multiline ? (
        <textarea
          id={field.key}
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          disabled={field.locked}
          className={inputClass}
          placeholder={placeholder}
        />
      ) : (
        <input
          id={field.key}
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={field.locked}
          className={inputClass}
          placeholder={placeholder}
        />
      )}
      {!field.locked && (() => {
        // Live char counter — colour shifts amber at 80% and red at
        // 100% so admin sees the limit approach before save fails.
        const rules = getFieldValidation(field.key);
        const max = rules.maxLength;
        if (!max) return null;
        const len = value.length;
        const ratio = len / max;
        const tone =
          len > max ? 'text-red-600' :
          ratio >= 0.8 ? 'text-amber-600' :
          'text-[#9CA3AF]';
        return (
          <div className={`mt-1 text-right font-mono text-[10px] ${tone}`}>
            {len} / {max}
          </div>
        );
      })()}
      {!field.locked && field.placeholders && field.placeholders.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="pulse-eyebrow text-[10px] text-[#9CA3AF]">Yerleşik:</span>
          {field.placeholders.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => insertPlaceholder(p)}
              className="min-h-[32px] rounded-md border border-[#EDEDED] bg-[#FAFAFA] px-2.5 py-1 font-mono text-[11px] text-[#525252] hover:border-[#C6F24E] hover:bg-[#EAF9B8] active:scale-95"
              title={`Tıkla → imleç konumuna $\{${p}\} ekle`}
            >
              ${'{'}{p}{'}'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
