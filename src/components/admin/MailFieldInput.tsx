'use client';

import { Lock } from 'lucide-react';

/**
 * Single editable copy field for the mail template editor. Centralised so
 * the flat editor (`MailTemplateEditor`) and the variant editor
 * (`FormConfirmationEditor`) render inputs identically — including the
 * KVKK lock badge, multiline behaviour, and red focus ring.
 *
 * `locked` reflects KVKK / security flags from `locked-fields.ts`. Server
 * still strips the field even if the UI is bypassed; the disabled input is
 * just the user-facing "you can't edit this" affordance.
 */
export interface MailFieldDef {
  key: string;
  label: string;
  multiline?: boolean;
  hint?: string;
  locked?: boolean;
  lockReason?: string;
}

interface Props {
  field: MailFieldDef;
  value: string;
  onChange: (next: string) => void;
}

export default function MailFieldInput({ field, value, onChange }: Props) {
  const baseClass =
    'mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-[14px] text-[#0A0A0A] outline-none focus:ring-2 focus:ring-[#C6F24E]';
  const inputClass = field.locked
    ? `${baseClass} border-red-200 bg-red-50/40 cursor-not-allowed opacity-70`
    : `${baseClass} border-[#EDEDED]`;
  const placeholder = field.locked
    ? '(Bu alan KVKK / güvenlik kilitli — kod-içi varsayılan kullanılır)'
    : '(Boş bırakırsan kod-içi varsayılan)';

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
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={field.locked}
          className={inputClass}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}
